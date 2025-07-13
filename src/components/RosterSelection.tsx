import React from 'react';
import type { Player } from '@/types';
import { useTranslation } from 'react-i18next';

interface RosterSelectionProps {
  players: Player[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const RosterSelection: React.FC<RosterSelectionProps> = ({ players, selectedIds, onChange }) => {
  const { t } = useTranslation();

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (selectedIds.length === players.length) {
      onChange([]);
    } else {
      onChange(players.map((p) => p.id));
    }
  };

  return (
    <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">
          {t('newGameSetupModal.selectPlayers')}
        </h3>
        <div className="text-sm text-slate-400">
          <span className="text-yellow-400 font-semibold">{selectedIds.length}</span>
          {' / '}
          <span className="text-yellow-400 font-semibold">{players.length}</span>
          {' '}{t('newGameSetupModal.playersSelected')}
        </div>
      </div>
      {players.length > 0 ? (
        <>
          <div className="flex items-center py-2 px-1 border-b border-slate-700/50">
            <label className="flex items-center text-sm text-slate-300 hover:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={players.length === selectedIds.length}
                onChange={toggleAll}
                className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
              />
              <span className="ml-2">{t('newGameSetupModal.selectAll')}</span>
            </label>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center py-1.5 px-1 rounded hover:bg-slate-800/40 transition-colors"
              >
                <label className="flex items-center flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(player.id)}
                    onChange={() => toggle(player.id)}
                    className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
                  />
                  <span className="ml-2 text-slate-200">
                    {player.name}
                    {player.nickname && (
                      <span className="text-slate-400 ml-1">({player.nickname})</span>
                    )}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-4 text-slate-400">
          {t('newGameSetupModal.noPlayersInRoster')}
        </div>
      )}
    </div>
  );
};

export default RosterSelection;

