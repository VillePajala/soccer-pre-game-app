'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '@/app/page'; // Import Player type
import {
    HiOutlineXMark,
    HiOutlineCheck,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineShieldCheck, // Goalie icon
    HiOutlineUserCircle // Default player icon (or choose another)
} from 'react-icons/hi2';
import { useTranslation } from 'react-i18next';

interface RosterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: Player[];
  onRenamePlayer: (playerId: string, newName: string) => void;
  onToggleGoalie: (playerId: string) => void;
  onSetJerseyNumber: (playerId: string, number: string) => void;
  onSetPlayerNotes: (playerId: string, notes: string) => void;
  onRemovePlayer: (playerId: string) => void;
  // We might need onAddPlayer later
}

const RosterSettingsModal: React.FC<RosterSettingsModalProps> = ({
  isOpen,
  onClose,
  availablePlayers,
  onRenamePlayer,
  onToggleGoalie,
  onSetJerseyNumber,
  onSetPlayerNotes,
  onRemovePlayer,
}) => {
  const { t } = useTranslation();
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{ name: string; jerseyNumber: string; notes: string }>({ name: '', jerseyNumber: '', notes: '' });

  // Close editing mode when modal closes or players change
  useEffect(() => {
    if (!isOpen) {
      setEditingPlayerId(null);
    }
  }, [isOpen]);

  // Load player data into form when editing starts
  const handleStartEdit = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditFormData({
      name: player.name,
      jerseyNumber: player.jerseyNumber || '',
      notes: player.notes || '',
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPlayerId(null);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  // Save changes
  const handleSaveEdit = (playerId: string) => {
    const originalPlayer = availablePlayers.find(p => p.id === playerId);
    if (!originalPlayer) return; // Should not happen

    // Validate inputs if needed (e.g., non-empty name)
    const trimmedName = editFormData.name.trim();
    if (!trimmedName) {
        alert("Player name cannot be empty."); // Basic validation
        return;
    }

    // Only call handlers if data actually changed
    if (trimmedName !== originalPlayer.name) {
        onRenamePlayer(playerId, trimmedName);
    }
    if (editFormData.jerseyNumber !== (originalPlayer.jerseyNumber || '')) {
        onSetJerseyNumber(playerId, editFormData.jerseyNumber);
    }
    if (editFormData.notes !== (originalPlayer.notes || '')) {
        onSetPlayerNotes(playerId, editFormData.notes);
    }
    setEditingPlayerId(null); // Exit editing mode
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-slate-100">{t('rosterSettingsModal.title', 'Manage Roster')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <HiOutlineXMark className="w-6 h-6" />
          </button>
        </div>

        {/* Player List / Content */}
        <div className="p-4 overflow-y-auto flex-grow">
          <table className="w-full text-left text-sm text-slate-300 table-fixed">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="border-b border-slate-600">
                <th className="py-2 px-2 w-12">{/* Icon/Goalie */}</th>
                <th className="py-2 px-2 w-[25%]">{t('rosterSettingsModal.name', 'Name')}</th>
                <th className="py-2 px-2 w-[10%] text-center">{t('rosterSettingsModal.jersey', '#')}</th>
                <th className="py-2 px-2 w-[40%]">{t('rosterSettingsModal.notes', 'Notes')}</th>
                <th className="py-2 px-2 w-[20%] text-right">{t('rosterSettingsModal.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {availablePlayers.map((player) => (
                <tr key={player.id} className={`border-b border-slate-700 last:border-b-0 ${editingPlayerId !== player.id ? 'hover:bg-slate-700/50' : ''}`}>
                  {editingPlayerId === player.id ? (
                    // Editing Row
                    <>
                      <td className="py-2 px-2 align-top">
                        <button
                            title={player.isGoalie ? t('rosterSettingsModal.unsetGoalie', 'Unset Goalie') : t('rosterSettingsModal.setGoalie', 'Set Goalie')}
                            onClick={() => onToggleGoalie(player.id)}
                            className={`p-1 rounded ${player.isGoalie ? 'text-emerald-400 bg-emerald-900/50' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          <HiOutlineShieldCheck className="w-5 h-5" />
                        </button>
                      </td>
                      <td className="py-2 px-2 align-top">
                        <input
                          type="text"
                          name="name"
                          value={editFormData.name}
                          onChange={handleInputChange}
                          className="bg-slate-600 text-slate-100 rounded p-1 w-full text-sm"
                          autoFocus // Focus name input on edit start
                        />
                      </td>
                      <td className="py-2 px-2 align-top">
                        <input
                          type="text" // Use text for flexibility (e.g., 00)
                          name="jerseyNumber"
                          value={editFormData.jerseyNumber}
                          onChange={handleInputChange}
                          className="bg-slate-600 text-slate-100 rounded p-1 w-full text-sm text-center"
                          maxLength={3}
                        />
                      </td>
                      <td className="py-2 px-2 align-top">
                         <textarea
                          name="notes"
                          value={editFormData.notes}
                          onChange={handleInputChange}
                          className="bg-slate-600 text-slate-100 rounded p-1 w-full text-sm h-10 resize-none scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700"
                          rows={1}
                        />
                      </td>
                      <td className="py-2 px-2 text-right align-top">
                        <button onClick={() => handleSaveEdit(player.id)} className="text-green-500 hover:text-green-400 p-1 mr-1" title={t('common.save', 'Save') || 'Save'}>
                          <HiOutlineCheck className="w-5 h-5" />
                        </button>
                        <button onClick={handleCancelEdit} className="text-red-500 hover:text-red-400 p-1" title={t('common.cancel', 'Cancel') || 'Cancel'}>
                          <HiOutlineXMark className="w-5 h-5" />
                        </button>
                      </td>
                    </>
                  ) : (
                    // Display Row
                    <>
                      <td className="py-2 px-2">
                         <button
                            title={player.isGoalie ? t('rosterSettingsModal.unsetGoalie', 'Unset Goalie') : t('rosterSettingsModal.setGoalie', 'Set Goalie')}
                            onClick={() => onToggleGoalie(player.id)}
                            className={`p-1 rounded ${player.isGoalie ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                         >
                           {player.isGoalie ? <HiOutlineShieldCheck className="w-5 h-5" /> : <HiOutlineUserCircle className="w-5 h-5" />}
                         </button>
                      </td>
                      <td className="py-2 px-2 truncate" title={player.name}>{player.name}</td>
                      <td className="py-2 px-2 text-center">{player.jerseyNumber}</td>
                       <td className="py-2 px-2 truncate" title={player.notes}>{player.notes}</td>
                      <td className="py-2 px-2 text-right">
                        <button onClick={() => handleStartEdit(player)} className="text-blue-400 hover:text-blue-300 p-1 mr-1" title={t('common.edit', 'Edit') || 'Edit'}>
                          <HiOutlinePencil className="w-5 h-5" />
                        </button>
                        <button onClick={() => onRemovePlayer(player.id)} className="text-red-500 hover:text-red-400 p-1" title={t('common.remove', 'Remove') || 'Remove'}>
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {/* TODO: Add \"Add Player\" button functionality */}
           <div className="mt-4 flex justify-start">
                <button 
                    // onClick={handleAddPlayer} // Handler needed in page.tsx
                    className="bg-green-600 hover:bg-green-500 text-white font-semibold py-1 px-3 rounded text-sm disabled:opacity-50"
                    disabled // Enable when handler is implemented
                    title={t('rosterSettingsModal.addPlayerTooltip', 'Add New Player (coming soon)')}
                >
                    {t('rosterSettingsModal.addPlayer', 'Add Player')}
                </button>
            </div>
        </div>

        {/* Footer (Optional - Close button in header is usually sufficient) */}
        {/* <div className=\"p-4 border-t border-slate-700 flex justify-end flex-shrink-0\">\n          <button onClick={onClose} className=\"bg-slate-600 hover:bg-slate-500 text-slate-100 font-semibold py-2 px-4 rounded\">\n            {t(\'common.close\', \'Close\')}\n          </button>\n        </div> */}
      </div>
    </div>
  );
};

export default RosterSettingsModal;