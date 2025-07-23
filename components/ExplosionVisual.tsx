import React from 'react';
import { VisualExplosion } from '../types';

interface ExplosionVisualProps {
  explosion: VisualExplosion;
}

const ExplosionVisualComponent: React.FC<ExplosionVisualProps> = ({ explosion }) => {
  const { x, y, radius } = explosion;

  const style: React.CSSProperties = {
    left: x,
    top: y,
    width: radius * 2,
    height: radius * 2,
    marginLeft: -radius,
    marginTop: -radius,
    borderColor: 'rgba(255, 193, 7, 0.8)',
    animation: 'explosion-ring 0.4s ease-out forwards',
  };

  return <div className="absolute rounded-full pointer-events-none z-10" style={style} />;
};

export default React.memo(ExplosionVisualComponent);