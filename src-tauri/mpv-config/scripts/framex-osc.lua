-- FrameX Custom OSC (On-Screen Controller)
-- Replaces default MPV OSC with custom controls
-- Features: Play/Pause, Progress Bar, Skip ±10/30/60s, Volume 0-300%

local assdraw = require("mp.assdraw")
local msg = require("mp.msg")
local opt = require("mp.options")
local utils = require("mp.utils")

-- Configuration
local osc_visible = false
local hide_timer = nil
local hide_delay = 2.5
local osc_height = 90
local button_size = 28
local font_size = 18

-- Colors (BBGGRR format for ASS)
local colors = {
    bg = "1E1E2E",           -- Dark background
    fg = "FFFFFF",           -- White text
    accent = "B06AFF",       -- Violet accent
    hover = "8B5CF6",        -- Lighter violet
    progress_bg = "333355",  -- Progress bar background
    progress = "B06AFF",     -- Progress bar fill
    volume_boost = "66AAFF", -- Orange for boost (>100%)
}

-- State
local state = {
    pause = true,
    duration = 0,
    position = 0,
    volume = 100,
    mute = false,
    fullscreen = false,
    mouse_x = 0,
    mouse_y = 0,
    osd_width = 1920,
    osd_height = 1080,
}

-- Helper: Draw rounded rectangle
local function ass_rect(ass, x, y, w, h, color, alpha)
    alpha = alpha or "00"
    ass:new_event()
    ass:pos(0, 0)
    ass:append(string.format("{\\bord0\\shad0\\1c&H%s&\\1a&H%s&}", color, alpha))
    ass:draw_start()
    ass:rect_cw(x, y, x + w, y + h)
    ass:draw_stop()
end

-- Helper: Draw text
local function ass_text(ass, x, y, text, size, color, align)
    align = align or 5
    ass:new_event()
    ass:pos(x, y)
    ass:an(align)
    ass:append(string.format("{\\fs%d\\bord0\\shad0\\1c&H%s&\\fn%s}", 
        size or font_size, color or colors.fg, "Segoe UI"))
    ass:append(text)
end

-- Helper: Format time
local function format_time(seconds)
    if not seconds or seconds < 0 then return "00:00" end
    local h = math.floor(seconds / 3600)
    local m = math.floor((seconds % 3600) / 60)
    local s = math.floor(seconds % 60)
    if h > 0 then
        return string.format("%d:%02d:%02d", h, m, s)
    else
        return string.format("%02d:%02d", m, s)
    end
end

-- Render OSC
local function render_osc()
    if not osc_visible then 
        mp.set_osd_ass(0, 0, "")
        return 
    end
    
    local ass = assdraw.ass_new()
    local w = state.osd_width
    local h = state.osd_height
    local bar_y = h - osc_height
    
    -- Background bar
    ass_rect(ass, 0, bar_y, w, osc_height, colors.bg, "33")
    
    -- Layout dimensions
    local padding = 20
    local center_x = w / 2
    local top_row_y = bar_y + 15
    local bottom_row_y = bar_y + 55
    
    -- ============ TOP ROW: Skip Buttons + Play/Pause ============
    
    local skip_buttons = {
        {label = "-60s", seek = -60},
        {label = "-30s", seek = -30},
        {label = "-10s", seek = -10},
    }
    
    -- Left skip buttons
    local btn_x = padding
    for i, btn in ipairs(skip_buttons) do
        ass_rect(ass, btn_x, top_row_y, 45, 25, colors.progress_bg, "55")
        ass_text(ass, btn_x + 22, top_row_y + 12, btn.label, 14, colors.fg, 5)
        btn_x = btn_x + 50
    end
    
    -- Play/Pause button (center)
    local play_btn_x = center_x - 25
    ass_rect(ass, play_btn_x, top_row_y - 5, 50, 35, colors.accent, "33")
    local play_symbol = state.pause and "▶" or "⏸"
    ass_text(ass, center_x, top_row_y + 10, play_symbol, 22, colors.fg, 5)
    
    -- Right skip buttons
    local skip_buttons_right = {
        {label = "+10s", seek = 10},
        {label = "+30s", seek = 30},
        {label = "+60s", seek = 60},
    }
    
    btn_x = center_x + 40
    for i, btn in ipairs(skip_buttons_right) do
        ass_rect(ass, btn_x, top_row_y, 45, 25, colors.progress_bg, "55")
        ass_text(ass, btn_x + 22, top_row_y + 12, btn.label, 14, colors.fg, 5)
        btn_x = btn_x + 50
    end
    
    -- ============ BOTTOM ROW: Time + Progress Bar + Volume ============
    
    -- Current time (left)
    local time_current = format_time(state.position)
    ass_text(ass, padding, bottom_row_y + 10, time_current, 14, colors.fg, 4)
    
    -- Duration (right of progress bar)
    local time_duration = format_time(state.duration)
    local vol_section_width = 200
    local duration_x = w - padding - vol_section_width - 10
    ass_text(ass, duration_x, bottom_row_y + 10, time_duration, 14, colors.fg, 6)
    
    -- Progress bar
    local progress_x = padding + 60
    local progress_w = w - progress_x - vol_section_width - 80
    local progress_h = 8
    
    -- Progress background
    ass_rect(ass, progress_x, bottom_row_y + 6, progress_w, progress_h, colors.progress_bg, "00")
    
    -- Progress fill
    local progress_pct = 0
    if state.duration > 0 then
        progress_pct = math.min(1, state.position / state.duration)
    end
    if progress_pct > 0 then
        ass_rect(ass, progress_x, bottom_row_y + 6, progress_w * progress_pct, progress_h, colors.accent, "00")
    end
    
    -- Progress handle
    local handle_x = progress_x + (progress_w * progress_pct) - 5
    ass_rect(ass, handle_x, bottom_row_y + 3, 10, 14, colors.fg, "00")
    
    -- ============ VOLUME SECTION ============
    
    local vol_x = w - vol_section_width - padding
    
    -- Volume icon
    local vol_icon = state.mute and "🔇" or (state.volume > 100 and "🔊" or "🔈")
    ass_text(ass, vol_x, bottom_row_y + 10, vol_icon, 16, colors.fg, 4)
    
    -- Volume bar
    local vol_bar_x = vol_x + 30
    local vol_bar_w = 120
    local vol_bar_h = 8
    
    -- Volume background (full 300% range)
    ass_rect(ass, vol_bar_x, bottom_row_y + 6, vol_bar_w, vol_bar_h, colors.progress_bg, "00")
    
    -- 100% marker
    local marker_100 = vol_bar_x + (vol_bar_w / 3)
    ass_rect(ass, marker_100 - 1, bottom_row_y + 2, 2, 16, colors.fg, "88")
    
    -- Volume fill
    local vol_pct = math.min(1, state.volume / 300)
    local vol_color = state.volume > 100 and colors.volume_boost or colors.accent
    if vol_pct > 0 then
        ass_rect(ass, vol_bar_x, bottom_row_y + 6, vol_bar_w * vol_pct, vol_bar_h, vol_color, "00")
    end
    
    -- Volume percentage text
    local vol_text_color = state.volume > 100 and colors.volume_boost or colors.fg
    ass_text(ass, vol_bar_x + vol_bar_w + 10, bottom_row_y + 10, state.volume .. "%", 14, vol_text_color, 4)
    
    -- Render
    mp.set_osd_ass(w, h, ass.text)
end

-- Show OSC
local function show_osc()
    osc_visible = true
    if hide_timer then
        hide_timer:kill()
    end
    hide_timer = mp.add_timeout(hide_delay, function()
        osc_visible = false
        render_osc()
    end)
    render_osc()
end

-- Hide OSC
local function hide_osc()
    osc_visible = false
    if hide_timer then
        hide_timer:kill()
        hide_timer = nil
    end
    render_osc()
end

-- Toggle OSC
local function toggle_osc()
    if osc_visible then
        hide_osc()
    else
        show_osc()
    end
end

-- Update state from MPV properties
local function update_state()
    state.pause = mp.get_property_bool("pause", true)
    state.duration = mp.get_property_number("duration", 0)
    state.position = mp.get_property_number("time-pos", 0)
    state.volume = mp.get_property_number("volume", 100)
    state.mute = mp.get_property_bool("mute", false)
    state.fullscreen = mp.get_property_bool("fullscreen", false)
    
    local dim = mp.get_property_native("osd-dimensions")
    if dim then
        state.osd_width = dim.w or 1920
        state.osd_height = dim.h or 1080
    end
    
    if osc_visible then
        render_osc()
    end
end

-- Handle mouse click on OSC
local function handle_click(x, y)
    local w = state.osd_width
    local h = state.osd_height
    local bar_y = h - osc_height
    
    -- Check if click is in OSC area
    if y < bar_y then return false end
    
    local padding = 20
    local center_x = w / 2
    local top_row_y = bar_y + 15
    local bottom_row_y = bar_y + 55
    
    -- Skip buttons (top row)
    local skip_values = {-60, -30, -10, 10, 30, 60}
    local btn_x = padding
    
    -- Left skip buttons
    for i = 1, 3 do
        if x >= btn_x and x <= btn_x + 45 and y >= top_row_y and y <= top_row_y + 25 then
            mp.commandv("seek", skip_values[i], "relative")
            show_osc()
            return true
        end
        btn_x = btn_x + 50
    end
    
    -- Play/Pause
    if x >= center_x - 25 and x <= center_x + 25 and y >= top_row_y - 5 and y <= top_row_y + 30 then
        mp.commandv("cycle", "pause")
        show_osc()
        return true
    end
    
    -- Right skip buttons
    btn_x = center_x + 40
    for i = 4, 6 do
        if x >= btn_x and x <= btn_x + 45 and y >= top_row_y and y <= top_row_y + 25 then
            mp.commandv("seek", skip_values[i], "relative")
            show_osc()
            return true
        end
        btn_x = btn_x + 50
    end
    
    -- Progress bar (bottom row)
    local progress_x = padding + 60
    local vol_section_width = 200
    local progress_w = w - progress_x - vol_section_width - 80
    
    if x >= progress_x and x <= progress_x + progress_w and y >= bottom_row_y and y <= bottom_row_y + 20 then
        local click_pct = (x - progress_x) / progress_w
        local seek_time = click_pct * state.duration
        mp.commandv("seek", seek_time, "absolute")
        show_osc()
        return true
    end
    
    -- Volume bar
    local vol_x = w - vol_section_width - padding + 30
    local vol_bar_w = 120
    
    if x >= vol_x and x <= vol_x + vol_bar_w and y >= bottom_row_y and y <= bottom_row_y + 20 then
        local click_pct = (x - vol_x) / vol_bar_w
        local new_vol = math.floor(click_pct * 300)
        mp.set_property_number("volume", new_vol)
        show_osc()
        return true
    end
    
    return false
end

-- Disable default OSC
mp.commandv("set", "osc", "no")

-- Mouse bindings
mp.add_key_binding(nil, "custom-osc-click", function()
    local mx, my = mp.get_property_native("mouse-pos").x, mp.get_property_native("mouse-pos").y
    if not handle_click(mx, my) then
        -- If not clicking on OSC, toggle it
        show_osc()
    end
end)

-- Show on mouse move
mp.observe_property("mouse-pos", "native", function(_, pos)
    if pos then
        state.mouse_x = pos.x or 0
        state.mouse_y = pos.y or 0
        
        -- Show OSC when mouse is in bottom area
        if state.mouse_y > state.osd_height - osc_height - 50 then
            show_osc()
        end
    end
end)

-- Property observers
mp.observe_property("pause", "bool", update_state)
mp.observe_property("time-pos", "number", update_state)
mp.observe_property("duration", "number", update_state)
mp.observe_property("volume", "number", update_state)
mp.observe_property("mute", "bool", update_state)
mp.observe_property("fullscreen", "bool", update_state)
mp.observe_property("osd-dimensions", "native", update_state)

-- Bindings
mp.add_key_binding("MOUSE_BTN0", "osc-click", function()
    local pos = mp.get_property_native("mouse-pos")
    if pos then
        handle_click(pos.x, pos.y)
    end
end)

mp.add_key_binding("MOUSE_MOVE", "osc-mouse-move", function()
    local pos = mp.get_property_native("mouse-pos")
    if pos and pos.y > state.osd_height - osc_height - 50 then
        show_osc()
    end
end)

-- Keyboard shortcuts for skip
mp.add_key_binding("ctrl+left", "skip-10-back", function() mp.commandv("seek", -10, "relative") show_osc() end)
mp.add_key_binding("ctrl+right", "skip-10-fwd", function() mp.commandv("seek", 10, "relative") show_osc() end)
mp.add_key_binding("alt+left", "skip-30-back", function() mp.commandv("seek", -30, "relative") show_osc() end)
mp.add_key_binding("alt+right", "skip-30-fwd", function() mp.commandv("seek", 30, "relative") show_osc() end)
mp.add_key_binding("shift+left", "skip-60-back", function() mp.commandv("seek", -60, "relative") show_osc() end)
mp.add_key_binding("shift+right", "skip-60-fwd", function() mp.commandv("seek", 60, "relative") show_osc() end)

-- Volume shortcuts
mp.add_key_binding("ctrl+up", "vol-up", function() 
    local vol = math.min(300, state.volume + 10)
    mp.set_property_number("volume", vol)
    show_osc()
end)
mp.add_key_binding("ctrl+down", "vol-down", function() 
    local vol = math.max(0, state.volume - 10)
    mp.set_property_number("volume", vol)
    show_osc()
end)

-- F-keys for volume presets
mp.add_key_binding("F1", "vol-50", function() mp.set_property_number("volume", 50) show_osc() end)
mp.add_key_binding("F2", "vol-100", function() mp.set_property_number("volume", 100) show_osc() end)
mp.add_key_binding("F3", "vol-150", function() mp.set_property_number("volume", 150) show_osc() end)
mp.add_key_binding("F4", "vol-200", function() mp.set_property_number("volume", 200) show_osc() end)
mp.add_key_binding("F5", "vol-300", function() mp.set_property_number("volume", 300) show_osc() end)

-- Initial state
mp.register_event("file-loaded", function()
    update_state()
    show_osc()
    mp.add_timeout(3, hide_osc)
end)

msg.info("FrameX Custom OSC loaded")
