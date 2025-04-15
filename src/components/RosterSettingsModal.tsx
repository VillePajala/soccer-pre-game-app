'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '@/app/page'; // Import Player type
import {
    HiOutlineXMark,
    HiOutlineCheck,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineShieldCheck, // Goalie icon
    HiOutlineUserCircle, // Default player icon (or choose another)
    HiOutlinePencilSquare // Icon for notes indicator
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

        {/* Player List / Content - Changed to Div layout */}
        <div className="p-4 overflow-y-auto flex-grow space-y-3">
          {availablePlayers.map((player) => (
            <div 
              key={player.id}
              className={`p-3 rounded-md border ${editingPlayerId === player.id ? 'bg-slate-700 border-slate-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'}`}
            >
              {editingPlayerId === player.id ? (
                // --- Editing View --- 
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-3">
                    {/* Goalie Toggle */}
                    <button
                        title={player.isGoalie ? t('rosterSettingsModal.unsetGoalie', 'Unset Goalie') : t('rosterSettingsModal.setGoalie', 'Set Goalie')}
                        onClick={() => onToggleGoalie(player.id)}
                        className={`p-1.5 rounded ${player.isGoalie ? 'text-emerald-400 bg-emerald-900/50' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <HiOutlineShieldCheck className="w-5 h-5" />
                    </button>
                    {/* Name Input */}
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleInputChange}
                      className="flex-grow bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 text-sm"
                      autoFocus
                    />
                    {/* Jersey # Input */}
                    <input
                      type="text"
                      name="jerseyNumber"
                      placeholder="#"
                      value={editFormData.jerseyNumber}
                      onChange={handleInputChange}
                      className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 w-16 text-sm text-center"
                      maxLength={3}
                    />
                  </div>
                  {/* Notes Textarea (remains editable here for now) */}
                  <textarea
                      name="notes"
                      placeholder={t('rosterSettingsModal.notesPlaceholder', 'Player notes...') || 'Player notes...'}
                      value={editFormData.notes}
                      onChange={handleInputChange}
                      className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 w-full text-sm h-16 resize-none scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700"
                      rows={2}
                    />
                  {/* Action Buttons (Save/Cancel) */}
                  <div className="flex justify-end space-x-2 pt-1">
                    <button onClick={() => handleSaveEdit(player.id)} className="text-green-500 hover:text-green-400 p-1" title={t('common.save', 'Save') || 'Save'}>
                      <HiOutlineCheck className="w-5 h-5" />
                    </button>
                    <button onClick={handleCancelEdit} className="text-red-500 hover:text-red-400 p-1" title={t('common.cancel', 'Cancel') || 'Cancel'}>
                      <HiOutlineXMark className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                // --- Display View --- 
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-grow min-w-0">
                    {/* Goalie Status Icon */} 
                     <button 
                        title={player.isGoalie ? t('rosterSettingsModal.unsetGoalie', 'Unset Goalie') : t('rosterSettingsModal.setGoalie', 'Set Goalie')}
                        onClick={() => onToggleGoalie(player.id)} 
                        className={`p-1.5 rounded ${player.isGoalie ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       {player.isGoalie ? <HiOutlineShieldCheck className="w-5 h-5" /> : <HiOutlineUserCircle className="w-5 h-5" />}
                     </button>
                    {/* Name */}
                    <span className="font-medium text-slate-100 truncate flex-shrink min-w-0" title={player.name}>
                      {player.name}
                    </span>
                     {/* Jersey # */}
                     <span className="text-slate-400 text-sm ml-auto mr-3">{player.jerseyNumber ? `#${player.jerseyNumber}` : ''}</span>
                     {/* Notes Indicator */}
                     {player.notes && (
                         <HiOutlinePencilSquare 
                            className="w-4 h-4 text-slate-500 flex-shrink-0"
                            title={t('rosterSettingsModal.notesExist', 'Has notes') || 'Has notes'}
                        />
                     )}
                  </div>
                  {/* Action Buttons (Edit/Remove) */}
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                    <button onClick={() => handleStartEdit(player)} className="text-blue-400 hover:text-blue-300 p-1" title={t('common.edit', 'Edit') || 'Edit'}>
                      <HiOutlinePencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => onRemovePlayer(player.id)} className="text-red-500 hover:text-red-400 p-1" title={t('common.remove', 'Remove') || 'Remove'}>
                      <HiOutlineTrash className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Add Player Button */}
          <div className="mt-4 flex justify-start">
             {/* ... Add player button ... */}
          </div>
        </div>

        {/* Footer (Optional - Close button in header is usually sufficient) */}
        {/* <div className=\"p-4 border-t border-slate-700 flex justify-end flex-shrink-0\">\n          <button onClick={onClose} className=\"bg-slate-600 hover:bg-slate-500 text-slate-100 font-semibold py-2 px-4 rounded\">\n            {t(\'common.close\', \'Close\')}\n          </button>\n        </div> */}
      </div>
    </div>
  );
};

export default RosterSettingsModal;