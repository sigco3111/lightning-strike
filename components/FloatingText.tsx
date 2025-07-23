import React from 'react';
import { FloatingText } from '../types';

interface FloatingTextProps {
  text: FloatingText;
}

const FloatingTextComponent: React.FC<FloatingTextProps> = ({ text }) => {
  const style: React.CSSProperties = {
    left: `${text.x}px`,
    top: `${text.y}px`,
    color: text.color,
    animation: 'float-up-and-fade 1.5s ease-out forwards',
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="absolute font-bold text-2xl pointer-events-none z-30"
      style={{ ...style, textShadow: '1px 1px 3px black' }}
    >
      {text.text}
    </div>
  );
};

export default React.memo(FloatingTextComponent);
