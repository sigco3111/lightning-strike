import React from 'react';
import { Particle } from '../types';

interface ParticleProps {
  particle: Particle;
}

const ParticleComponent: React.FC<ParticleProps> = ({ particle }) => {
  const { x, y, size, color, life, rotation, type } = particle;

  const style: React.CSSProperties = {
    left: `${x}px`,
    top: `${y}px`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: color,
    opacity: life,
    position: 'absolute',
    borderRadius: type === 'ember' || type === 'shield' ? '50%' : '0%',
    transform: `rotate(${rotation}deg) scale(${life})`,
    filter: type === 'sparkle' ? `blur(1px) brightness(1.5)` : 'none',
    pointerEvents: 'none',
    zIndex: 10,
  };

  return <div style={style} />;
};

export default React.memo(ParticleComponent);