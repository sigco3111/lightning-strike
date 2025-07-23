import React from 'react';
import { GameObject, GameObjectType, VortexEffect } from '../types';
import { VORTEX_PULL_DURATION } from '../constants';

interface GameObjectProps {
  object: GameObject;
  isHit: boolean;
  activeVortex: VortexEffect | null;
}

const getEmojiForType = (type: GameObjectType): string => {
    switch (type) {
      case GameObjectType.Stone: return '🪨';
      case GameObjectType.Metal: return '⚙️';
      case GameObjectType.Crystal: return '💎';
      case GameObjectType.Explosive: return '💣';
      case GameObjectType.Relic: return '⭐';
      case GameObjectType.Vortex: return '🌀';
      default: return '❔';
    }
};

const GameObjectComponent: React.FC<GameObjectProps> = ({ object, isHit, activeVortex }) => {
  const { id, x, y, width, height, hp, maxHp, type, rotation, hasShield } = object;

  const isAffectedByVortex = activeVortex && activeVortex.affectedObjectIds.has(id);
  const healthPercentage = (hp / maxHp) * 100;
  const emoji = getEmojiForType(type);

  const dynamicStyle: React.CSSProperties = {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: `rotate(${rotation}deg) scale(${isHit ? 1.25 : 1.0})`,
    opacity: 0.7 + (hp / maxHp) * 0.3,
    zIndex: 5,
    transition: 'transform 0.15s ease-out, opacity 0.2s',
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  
  if (type === GameObjectType.Relic) {
    dynamicStyle.animation = 'relic-glow 2.5s infinite ease-in-out';
  }
  if (type === GameObjectType.Vortex) {
    dynamicStyle.animation = 'vortex-pulse 3s infinite ease-in-out';
  }

  if (isAffectedByVortex) {
      const vortex = activeVortex!;
      const translateX = vortex.x - (x + width / 2);
      const translateY = vortex.y - (y + height / 2);
      
      dynamicStyle.transition = `transform ${VORTEX_PULL_DURATION}ms cubic-bezier(0.5, -0.5, 0.5, 1.5), opacity ${VORTEX_PULL_DURATION}ms ease-out`;
      dynamicStyle.transform = `translate(${translateX}px, ${translateY}px) rotate(720deg) scale(0.1)`;
      dynamicStyle.opacity = 0;
      dynamicStyle.zIndex = 4;
  }
  
  const emojiStyle: React.CSSProperties = {
    fontSize: `${width * 0.9}px`,
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    lineHeight: 1,
    display: 'inline-block',
  };

  return (
    <div style={dynamicStyle}>
        <span style={emojiStyle}>{emoji}</span>
        {hasShield && (
            <div 
                className="absolute -inset-1.5 rounded-full" 
                style={{ animation: 'shield-pulse 2s infinite' }}
            ></div>
        )}
        {/* Health Bar */}
        <div className="absolute -bottom-3 left-0 w-full h-1.5 bg-gray-600 rounded">
            <div
            className="h-1.5 rounded transition-all duration-300"
            style={{ 
                width: `${healthPercentage}%`,
                backgroundColor: healthPercentage > 50 ? '#4ade80' : healthPercentage > 20 ? '#facc15' : '#f87171'
            }}
            ></div>
        </div>
    </div>
  );
};

export default GameObjectComponent;