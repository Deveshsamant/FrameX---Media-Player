-- FrameX Custom OSC v6 - Manual ASS & Virtual Res
local mp = require("mp")
print(">>> FRAMEX CONTROL SCRIPT STARTED <<<")

-- 1. Setup
mp.set_property("osc", "no")
mp.set_property("osd-bar", "no")
-- Ensure OSD system is on
mp.set_property("osd-level", "1")

-- 2. Create Overlay with FIXED virtual resolution
-- This ensures drawing commands always map to 1280x720 coordinate space
local overlay = mp.create_osd_overlay("ass-events")
overlay.res_x = 1280
overlay.res_y = 720

-- 3. State
local show_osc = false
local hide_timer = nil

-- 4. Drawing Logic
local function draw()
    if not show_osc then
        overlay.data = ""
        overlay:update()
        return
    end

    local pos = mp.get_property_number("time-pos", 0)
    local dur = mp.get_property_number("duration", 0)
    local paused = mp.get_property_bool("pause", false)
    local vol = mp.get_property_number("volume", 100)
    
    -- Calc progress width (map to 1240 width bar)
    local pct = 0
    if dur > 0 then pct = pos / dur end
    local fill_w = 1240 * pct
    
    local time_s = string.format("%d:%02d", math.floor(pos/60), math.floor(pos%60))
    local dur_s = string.format("%d:%02d", math.floor(dur/60), math.floor(dur%60))
    
    -- Build ASS String manually (No external module dependencies)
    local ass = ""
    
    -- A. Background Shade (Bottom 120px)
    -- Color: Dark Gray (Alpha 80)
    -- Path: Rect 0,600 to 1280,720
    ass = ass .. "{\\p1\\bord0\\shad0\\c&H101010&\\alpha&H40&\\pos(0,0)}m 0 600 l 1280 600 l 1280 720 l 0 720{\\p0}"
    
    -- B. Progress Track (Gray)
    -- Pos: 20, 620. Size: 1240 x 6
    ass = ass .. "{\\p1\\c&H555555&\\alpha&H00&\\pos(0,0)}m 20 620 l 1260 620 l 1260 626 l 20 626{\\p0}"
    
    -- C. Progress Fill (Purple/Blueish - FrameX Style)
    -- Color: &HFF9933& (BGR for Blue/Purple)
    if fill_w > 0 then
        ass = ass .. string.format("{\\p1\\c&HFF9933&\\pos(0,0)}m 20 620 l %d 620 l %d 626 l 20 626{\\p0}", 20+fill_w, 20+fill_w)
    end
    
    -- D. Knob (White Circle)
    ass = ass .. string.format("{\\p1\\c&HFFFFFF&\\pos(%d,623)}m 0 0 l 0 -6 l 6 0 l 0 6 l -6 0{\\p0}", 20+fill_w)
    (Note: Simple diamond shape for knob to save complexity)
    
    -- E. Play Button (Center)
    local cx, cy = 640, 670
    -- Circle BG
    ass = ass .. string.format("{\\p1\\c&HFFFFFF&\\pos(%d,%d)}m 0 -30 b 16 -30 30 -16 30 0 b 30 16 16 30 0 30 b -16 30 -30 16 -30 0 b -30 -16 -16 -30 0 -30{\\p0}", cx, cy)
    -- Icon (Black)
    ass = ass .. string.format("{\\an5\\fs30\\c&H000000&\\pos(%d,%d)}%s", cx, cy, paused and "▐▐" or "▶")
    
    -- F. Time Text (Left)
    ass = ass .. string.format("{\\an4\\fs24\\c&HFFFFFF&\\pos(20,670)}%s / %s", time_s, dur_s)
    
    -- G. Volume Text (Right)
    ass = ass .. string.format("{\\an6\\fs24\\c&HFFFFFF&\\pos(1260,670)}Vol: %d%%", vol)
    
    -- H. Skip Buttons hint
    ass = ass .. "{\\an5\\fs16\\c&HAAAAAA&\\pos(640,710)}PRESS TAB TO HIDE | 1-6 TO SEEK"

    overlay.data = ass
    overlay:update()
end

-- Logic
local function show()
    show_osc = true
    draw()
    if hide_timer then hide_timer:kill() end
    if not mp.get_property_bool("pause") then
        hide_timer = mp.add_timeout(3, function()
            show_osc = false
            draw()
        end)
    end
end

local function toggle()
    if show_osc then
        show_osc = false
        draw()
    else
        show()
    end
end

-- Bindings
mp.add_key_binding("TAB", "toggle", toggle)
mp.register_event("file-loaded", function()
    show_osc = true
    draw()
end)
mp.observe_property("time-pos", "number", function() if show_osc then draw() end end)
mp.observe_property("pause", "bool", function() show() end)

-- Seek/Vol handlers to trigger redraw
local function seek(v) mp.commandv("seek", v, "relative"); show() end
mp.add_key_binding("1", function() seek(-10) end)
mp.add_key_binding("2", function() seek(10) end)
mp.add_key_binding("3", function() seek(-30) end)
mp.add_key_binding("4", function() seek(30) end)
mp.add_key_binding("5", function() seek(-60) end)
mp.add_key_binding("6", function() seek(60) end)

local function vol(v) mp.set_property("volume", v); show() end
mp.add_key_binding("F1", function() vol(50) end)
mp.add_key_binding("F2", function() vol(100) end)
mp.add_key_binding("F3", function() vol(150) end)
mp.add_key_binding("F4", function() vol(200) end)
mp.add_key_binding("F5", function() vol(300) end)

mp.msg.info("FrameX v6 Loaded")
