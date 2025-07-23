import React from 'react';
import { Upgrades, UpgradeType } from '../types';

interface UpgradePanelProps {
    upgrades: Upgrades;
    shards: number;
    onUpgrade: (upgradeType: UpgradeType) => void;
}

const UpgradePanel: React.FC<UpgradePanelProps> = ({ upgrades, shards, onUpgrade }) => {
    return (
        <div className="w-full">
            <div className="space-y-3">
                {(Object.keys(upgrades) as Array<keyof Upgrades>).map((key) => {
                    const upgrade = upgrades[key];
                    const canAfford = shards >= upgrade.cost;
                    return (
                        <div key={key} className="flex items-center justify-between gap-4 p-3 rounded-md hover:bg-slate-700/50 transition-colors">
                            <div className="flex-grow">
                                <p className="font-semibold">{upgrade.name} <span className="text-slate-300">(Lv. {upgrade.level})</span></p>
                                <p className="text-xs text-slate-400 mt-1">{upgrade.description}</p>
                            </div>
                            <button
                                onClick={() => onUpgrade(key)}
                                disabled={!canAfford}
                                className="flex-shrink-0 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-1.5 px-3 rounded-lg transition-all duration-200 text-sm"
                            >
                                💎 {upgrade.cost}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default UpgradePanel;