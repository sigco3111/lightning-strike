import React, { useMemo, useState, useEffect } from 'react';
import { GameEvent, GameEventType, GameObjectType } from '../types';

interface GameOverModalProps {
  score: number;
  history: GameEvent[];
  onReset: () => void;
}

const getEventIcon = (event: GameEvent, key: string | number) => {
    if (!('position' in event)) return null;
    const { position } = event;

    switch (event.type) {
        case GameEventType.LightningStrike:
            return <circle key={key} cx={position.x} cy={position.y} r="4" fill={event.isSupercharged ? '#FBBF24' : '#67E8F9'} className="opacity-80" />;
        case GameEventType.ObjectDestroyed:
            let color = '#E5E7EB';
            if (event.objectType === GameObjectType.Explosive) color = '#F87171';
            if (event.objectType === GameObjectType.Crystal) color = '#F0ABFC';
            if (event.objectType === GameObjectType.Relic) color = '#FDE047';
            if (event.objectType === GameObjectType.Vortex) color = '#C4B5FD';
            return <path key={key} d={`M ${position.x - 4} ${position.y - 4} L ${position.x + 4} ${position.y + 4} M ${position.x + 4} ${position.y - 4} L ${position.x - 4} ${position.y + 4}`} stroke={color} strokeWidth="2" />;
        case GameEventType.Explosion:
            return <circle key={key} cx={position.x} cy={position.y} r={event.radius} fill="none" stroke="#F97316" strokeWidth="1.5" className="opacity-50" />;
        case GameEventType.Vortex:
            return <circle key={key} cx={position.x} cy={position.y} r={event.radius} fill="none" stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="4 4" className="opacity-60" />;
        case GameEventType.Supercharge:
            return <path key={key} d={`M ${position.x} ${position.y-6} L ${position.x-5} ${position.y+5} L ${position.x+5} ${position.y+5} Z`} fill="#FACC15" />;
        default:
            return null;
    }
}

const GameOverModal: React.FC<GameOverModalProps> = ({ score, history, onReset }) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
    }, []);

    const stats = useMemo(() => {
        const initialStats = {
            [GameEventType.LightningStrike]: 0,
            [GameEventType.ObjectDestroyed]: 0,
            [GameEventType.Explosion]: 0,
            [GameEventType.Vortex]: 0,
            [GameEventType.Supercharge]: 0,
            upgrades: 0,
        };
        return history.reduce((acc, event) => {
            if (event.type === GameEventType.Upgrade) {
                acc.upgrades++;
            } else if ('position' in event) { // Ensure it's not a plain upgrade event
                acc[event.type] = (acc[event.type] || 0) + 1;
            }
            return acc;
        }, initialStats);
    }, [history]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-slate-900/95 border-2 border-purple-500 rounded-lg p-6 md:p-8 max-w-4xl w-[95%] text-white shadow-2xl backdrop-blur-sm">
                <h2 className="text-4xl md:text-5xl font-bold text-yellow-300 text-center animate-pulse">게임 종료</h2>
                <p className="text-xl md:text-2xl text-center text-white mt-4">최종 점수: {score}</p>

                <div className="my-6 border-t border-slate-700"></div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center text-lg mb-6">
                    <div><p className="text-slate-400">번개</p><p className="font-bold text-xl text-cyan-300">{stats.lightningStrike}</p></div>
                    <div><p className="text-slate-400">파괴된 오브젝트</p><p className="font-bold text-xl text-red-400">{stats.objectDestroyed}</p></div>
                    <div><p className="text-slate-400">폭발</p><p className="font-bold text-xl text-orange-400">{stats.explosion}</p></div>
                    <div><p className="text-slate-400">소용돌이</p><p className="font-bold text-xl text-violet-400">{stats.vortex}</p></div>
                    <div><p className="text-slate-400">슈퍼차지</p><p className="font-bold text-xl text-yellow-400">{stats.supercharge}</p></div>
                    <div><p className="text-slate-400">업그레이드</p><p className="font-bold text-xl text-green-400">{stats.upgrades}</p></div>
                </div>

                <div className="w-full aspect-video bg-black/30 rounded-lg overflow-hidden border border-slate-700 relative">
                    <h3 className="absolute top-2 left-3 text-slate-300 font-semibold z-10">전투 기록</h3>
                    {dimensions.width > 0 && (
                         <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
                            {history.map((event, index) => getEventIcon(event, `${event.type}-${index}`))}
                        </svg>
                    )}
                </div>

                <button onClick={onReset} className="mt-8 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-xl transition-colors">
                    다시하기
                </button>
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default GameOverModal;
