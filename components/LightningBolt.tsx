import React, { useMemo } from 'react';
import { Point } from '../types';

interface LightningBoltProps {
  path: Point[];
  glowColor: string;
}

const LightningBolt: React.FC<LightningBoltProps> = ({ path, glowColor }) => {

  const pathData = useMemo(() => {
    if (path.length === 0) return "";
    return path.map(p => `${p.x},${p.y}`).join(' ');
  }, [path]);

  if (!pathData) return null;

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 20 }}>
      <polyline
        points={pathData}
        className="fill-none"
        style={{ stroke: glowColor, filter: 'blur(5px)' }}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={pathData}
        className="fill-none stroke-white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
       <polyline
        points={pathData}
        className="fill-none"
        style={{ stroke: glowColor, opacity: 0.7 }}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default LightningBolt;
