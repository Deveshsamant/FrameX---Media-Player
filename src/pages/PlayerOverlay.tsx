import React from 'react';
import PlayerControlBar from '../components/PlayerControlBar/PlayerControlBar';

const PlayerOverlay: React.FC = () => {
    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: 'transparent',
            position: 'fixed',
            top: 0,
            left: 0,
            pointerEvents: 'none',
        }}>
            <div style={{ pointerEvents: 'auto' }}>
                <PlayerControlBar />
            </div>
        </div>
    );
};

export default PlayerOverlay;
