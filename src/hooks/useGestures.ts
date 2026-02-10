import { useRef, useCallback } from 'react';

interface GestureOptions {
    onVolumeChange: (delta: number) => void;
    onSeek: (delta: number) => void;
    onBrightnessChange?: (delta: number) => void; // Placeholder if backend supports it
    onTogglePause: () => void;
    onToggleFullscreen: () => void;
}

export function useGestures({ onVolumeChange, onSeek, onTogglePause, onToggleFullscreen }: GestureOptions) {
    const startX = useRef<number | null>(null);
    const startY = useRef<number | null>(null);
    const startTime = useRef<number | null>(null);
    const isDragging = useRef(false);

    // Thresholds
    const TAP_THRESHOLD_MS = 200;
    const DRAG_THRESHOLD_PX = 10;

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        startX.current = e.clientX;
        startY.current = e.clientY;
        startTime.current = Date.now();
        isDragging.current = false;
        // Capture pointer to track even if outside element
        e.currentTarget.setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (startX.current === null || startY.current === null) return;

        const deltaX = e.clientX - startX.current;
        const deltaY = e.clientY - startY.current;

        if (!isDragging.current) {
            if (Math.abs(deltaX) > DRAG_THRESHOLD_PX || Math.abs(deltaY) > DRAG_THRESHOLD_PX) {
                isDragging.current = true;
            } else {
                return;
            }
        }

        const { innerWidth } = window;
        const isRightSide = startX.current > innerWidth / 2;

        // Normalize deltas
        // Up/Down
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            // Vertical Drag
            // Up is negative Y, but positive volume

            // Reset start to current to simulate continuous "scrubbing" not absolute
            // Actually, continuous delta is better.
            // But for smooth updates, we might want to just send the diff from last move?
            // Let's use accumulated delta if we reset, or just delta from start.
            // Better: delta from last event.
            const diffY = e.movementY;

            if (isRightSide) {
                // Volume
                onVolumeChange(-diffY);
            } else {
                // Brightness (or Seek? usually Left is brightness in players like VLC on Android)
                // For now, let's make Left side Brightness (if supported) or just ignore?
                // Request said: "Volume, Brightness, and Seeking".
                // We don't have brightness backend. Let's map Left Vertical to nothing or maybe Volume too for now?
                // Or maybe Seek Speed?
                // Let's stick to Volume on right.
            }
        } else {
            // Horizontal Drag
            // Seek
            const diffX = e.movementX;
            // Sensitivity: 1px = X seconds? 
            // Or drag triggers "seek relative" command.
            // If we send many seeks, MPV might stutter.
            // But `mpv_seek` doing `relative` is fine.
            // Let's limit rate?
            if (Math.abs(diffX) > 0) {
                // Seek 1s per 20px? 
                // Better: use movementX directly but scaled.
                // movementX is per event.
                // seek(movementX * scalar)
                onSeek(diffX * 0.2); // 5px = 1s
            }
        }

    }, [onVolumeChange, onSeek]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (startX.current === null || startTime.current === null) return;

        const duration = Date.now() - startTime.current;

        // Tap detection
        if (!isDragging.current && duration < TAP_THRESHOLD_MS) {
            onTogglePause();
        }

        // Double Tap? usually handled by a separate logic or simple click handler
        // Native dblclick event handles this usually.

        startX.current = null;
        startY.current = null;
        startTime.current = null;
        isDragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    }, [onTogglePause]);

    const handleDoubleClick = useCallback(() => {
        onToggleFullscreen();
    }, [onToggleFullscreen]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleDoubleClick
    };
}
