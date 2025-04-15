'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Player } from '@/app/page'; // Import Player type
import {
    HiOutlineXMark,
    HiOutlineCheck,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineShieldCheck, // Goalie icon
    HiOutlineUserCircle, // Default player icon (or choose another)
    HiOutlinePencilSquare, // Icon for notes indicator
    HiOutlineEllipsisVertical // Icon for actions menu
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
  onAddPlayer: (playerData: { name: string; jerseyNumber: string; notes: string; nickname: string }) => void;
  onSetPlayerNickname: (playerId: string, nickname: string) => void;
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
  onAddPlayer,
  onSetPlayerNickname,
}) => {
  const { t } = useTranslation();
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{ name: string; jerseyNumber: string; notes: string; nickname: string }>({ name: '', jerseyNumber: '', notes: '', nickname: '' });

  // State for adding a new player
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [newPlayerData, setNewPlayerData] = useState({ name: '', jerseyNumber: '', notes: '', nickname: '' });

  // State for the actions menu
  const [actionsMenuPlayerId, setActionsMenuPlayerId] = useState<string | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null); // Ref for click outside

  // Close editing mode when modal closes or players change
  useEffect(() => {
    if (!isOpen) {
      setEditingPlayerId(null);
      setIsAddingPlayer(false); // Also reset add mode
      setNewPlayerData({ name: '', jerseyNumber: '', notes: '', nickname: '' }); // Clear add form
    }
  }, [isOpen]);

  // Effect to close actions menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setActionsMenuPlayerId(null); // Close menu if click is outside
      }
    };

    if (actionsMenuPlayerId) { // Only add listener when a menu is open
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    // Cleanup listener on component unmount or when menu closes
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionsMenuPlayerId]); // Re-run when the open menu changes

  // Load player data into form when editing starts
  const handleStartEdit = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditFormData({
      name: player.name,
      jerseyNumber: player.jerseyNumber || '',
      notes: player.notes || '',
      nickname: player.nickname || '',
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
    const trimmedNickname = editFormData.nickname.trim();
    if (!trimmedName) {
        alert(t('rosterSettingsModal.nameRequired', 'Player name cannot be empty.') || 'Player name cannot be empty.');
        return;
    }

    // Only call handlers if data actually changed
    if (trimmedName !== originalPlayer.name) {
        onRenamePlayer(playerId, trimmedName);
    }
    if (trimmedNickname !== (originalPlayer.nickname || '')) {
        onSetPlayerNickname(playerId, trimmedNickname);
    }
    if (editFormData.jerseyNumber !== (originalPlayer.jerseyNumber || '')) {
        onSetJerseyNumber(playerId, editFormData.jerseyNumber);
    }
    if (editFormData.notes !== (originalPlayer.notes || '')) {
        onSetPlayerNotes(playerId, editFormData.notes);
    }
    setEditingPlayerId(null); // Exit editing mode
  };

  // --- New Player Handlers ---
  const handleNewPlayerInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewPlayerData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddNewPlayer = () => {
    const trimmedName = newPlayerData.name.trim();
    const trimmedNickname = newPlayerData.nickname.trim();
    if (!trimmedName) {
      alert(t('rosterSettingsModal.nameRequired', 'Player name cannot be empty.') || 'Player name cannot be empty.');
      return;
    }
    // Call the prop function passed from parent
    onAddPlayer({
      name: trimmedName,
      jerseyNumber: newPlayerData.jerseyNumber.trim(),
      notes: newPlayerData.notes.trim(),
      nickname: trimmedNickname,
    });
    // Reset form and hide it
    setNewPlayerData({ name: '', jerseyNumber: '', notes: '', nickname: '' });
    setIsAddingPlayer(false);
  };

  const handleCancelAddPlayer = () => {
    setNewPlayerData({ name: '', jerseyNumber: '', notes: '', nickname: '' });
    setIsAddingPlayer(false);
  };
  // --- End New Player Handlers ---

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

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-grow space-y-3">
          {/* Existing Player List */}
          {availablePlayers.map((player) => (
            <div
              key={player.id}
              className={`p-3 rounded-md border relative ${editingPlayerId === player.id ? 'bg-slate-700 border-slate-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'}`}
            >
              {editingPlayerId === player.id ? (
                // --- Editing View ---
                <div className="flex flex-col space-y-2">
                  {/* Updated Row: Goalie Button | Vertical Name/Nickname Stack | Jersey Input */}
                  <div className="flex items-start space-x-3"> {/* Changed to items-start for better alignment */} 
                    {/* Goalie Toggle */}
                    <button
                        title={player.isGoalie ? t('rosterSettingsModal.unsetGoalie', 'Unset Goalie') : t('rosterSettingsModal.setGoalie', 'Set Goalie')}
                        onClick={() => onToggleGoalie(player.id)}
                        className={`p-1.5 rounded mt-1 ${player.isGoalie ? 'text-emerald-400 bg-emerald-900/50' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <HiOutlineShieldCheck className="w-5 h-5" />
                    </button>
                    
                    {/* NEW: Name and Nickname Vertical Stack */}
                    <div className="flex flex-col space-y-1 flex-grow">
                        {/* Name Input */}
                        <input
                          type="text"
                          name="name"
                          placeholder={t('rosterSettingsModal.playerNamePlaceholder', 'Player Name') || 'Player Name'}
                          value={editFormData.name}
                          onChange={handleInputChange}
                          className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 text-sm w-full"
                          autoFocus
                        />
                        {/* Nickname Input (Below Name) */}
                        <input
                          type="text"
                          name="nickname"
                          placeholder={t('rosterSettingsModal.nicknamePlaceholder', 'Nickname (for disc)') || 'Nickname (for disc)'}
                          value={editFormData.nickname}
                          onChange={handleInputChange}
                          className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 text-sm w-full"
                        />
                    </div>

                    {/* Jersey # Input (Remains separate) */}
                    <input
                      type="text"
                      name="jerseyNumber"
                      placeholder="#"
                      value={editFormData.jerseyNumber}
                      onChange={handleInputChange}
                      className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 w-16 text-sm text-center mt-1" /* Added mt-1 */
                      maxLength={3}
                    />
                  </div>
                  {/* Notes Textarea */}
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
                   <div className="flex items-center space-x-3 flex-grow min-w-0 pr-4"> {/* Added pr-4 for spacing */} 
                     {/* Goalie Status Icon */}
                     <button 
                        title={player.isGoalie ? t('rosterSettingsModal.unsetGoalie', 'Unset Goalie') : t('rosterSettingsModal.setGoalie', 'Set Goalie')}
                        onClick={() => onToggleGoalie(player.id)} 
                        className={`p-1.5 rounded flex-shrink-0 ${player.isGoalie ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       {player.isGoalie ? <HiOutlineShieldCheck className="w-5 h-5" /> : <HiOutlineUserCircle className="w-5 h-5" />}
                     </button>
                     {/* Name Display (Full name, smaller font, no nickname) */}
                     <span className="text-sm font-medium text-slate-100 flex-shrink min-w-0 break-words" title={player.name}>
                       {player.name}
                       {/* Nickname removed from display here */} 
                     </span>
                     {/* Jersey # */}
                     <span className="text-slate-400 text-sm ml-auto mr-1 flex-shrink-0">{player.jerseyNumber ? `#${player.jerseyNumber}` : ''}</span>
                     {/* Notes Indicator */}
                     {player.notes && (
                         <HiOutlinePencilSquare 
                            className="w-4 h-4 text-slate-500 flex-shrink-0"
                            title={t('rosterSettingsModal.notesExist', 'Has notes') || 'Has notes'}
                        />
                     )}
                   </div>
                   {/* NEW: Action Buttons Menu */}
                   <div className="relative flex-shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click if needed
                          setActionsMenuPlayerId(actionsMenuPlayerId === player.id ? null : player.id);
                        }}
                        className="text-slate-400 hover:text-slate-100 p-1 rounded"
                        title={t('rosterSettingsModal.actionsMenuTitle', 'Actions') || 'Actions'}
                        disabled={isAddingPlayer || !!editingPlayerId}
                       >
                          <HiOutlineEllipsisVertical className="w-5 h-5" />
                      </button>

                      {/* Conditionally rendered Actions Menu Dropdown */} 
                      {actionsMenuPlayerId === player.id && (
                        <div 
                          ref={actionsMenuRef} // Add ref for click outside detection
                          className="absolute right-0 top-full mt-1 w-32 bg-slate-700 border border-slate-600 rounded-md shadow-lg z-10 py-1"
                          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside menu
                        >
                           <button 
                              onClick={() => { handleStartEdit(player); setActionsMenuPlayerId(null); }} 
                              className="flex items-center w-full px-3 py-1.5 text-sm text-blue-300 hover:bg-slate-600 disabled:opacity-50"
                              disabled={isAddingPlayer || !!editingPlayerId}
                            >
                             <HiOutlinePencil className="w-4 h-4 mr-2" /> 
                             {t('common.edit', 'Edit') || 'Edit'}
                           </button>
                           <button 
                              onClick={() => { onRemovePlayer(player.id); setActionsMenuPlayerId(null); }} 
                              className="flex items-center w-full px-3 py-1.5 text-sm text-red-400 hover:bg-slate-600 disabled:opacity-50"
                              disabled={isAddingPlayer || !!editingPlayerId}
                            >
                             <HiOutlineTrash className="w-4 h-4 mr-2" />
                             {t('common.remove', 'Remove') || 'Remove'}
                           </button>
                        </div>
                      )}
                   </div>
                 </div>
              )}
            </div>
          ))}

          {/* Add Player Section */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            {isAddingPlayer ? (
              // --- Add Player Form ---
              <div className="p-3 rounded-md bg-slate-700 border border-slate-500 space-y-2">
                 <h3 className="text-lg font-semibold text-slate-200 mb-2">{t('rosterSettingsModal.addNewPlayerTitle', 'Add New Player')}</h3>
                  {/* Updated Row: Icon | Vertical Name/Nickname Stack | Jersey Input */}
                 <div className="flex items-start space-x-3"> {/* Changed to items-start */} 
                    {/* Placeholder for icon if needed */}
                    <div className="p-1.5 rounded text-slate-500 mt-1">
                        <HiOutlineUserCircle className="w-5 h-5" />
                    </div>

                    {/* NEW: Name and Nickname Vertical Stack */}
                    <div className="flex flex-col space-y-1 flex-grow">
                        {/* Name Input */}
                        <input
                          type="text"
                          name="name"
                          placeholder={t('rosterSettingsModal.playerNamePlaceholder', 'Player Name') || 'Player Name'}
                          value={newPlayerData.name}
                          onChange={handleNewPlayerInputChange}
                          className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 text-sm w-full"
                          autoFocus
                        />
                        {/* Nickname Input (Below Name) */}
                        <input
                          type="text"
                          name="nickname"
                          placeholder={t('rosterSettingsModal.nicknamePlaceholder', 'Nickname (for disc)') || 'Nickname (for disc)'}
                          value={newPlayerData.nickname}
                          onChange={handleNewPlayerInputChange}
                          className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 text-sm w-full"
                        />
                    </div>

                    {/* Jersey # Input (Remains separate) */}
                    <input
                      type="text"
                      name="jerseyNumber"
                      placeholder="#"
                      value={newPlayerData.jerseyNumber}
                      onChange={handleNewPlayerInputChange}
                      className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 w-16 text-sm text-center mt-1" /* Added mt-1 */
                      maxLength={3}
                    />
                  </div>
                  {/* Notes Textarea */}
                  <textarea
                      name="notes"
                      placeholder={t('rosterSettingsModal.notesPlaceholder', 'Player notes...') || 'Player notes...'}
                      value={newPlayerData.notes}
                      onChange={handleNewPlayerInputChange}
                      className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 w-full text-sm h-16 resize-none scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700"
                      rows={2}
                    />
                  {/* Action Buttons (Save/Cancel) */}
                  <div className="flex justify-end space-x-2 pt-1">
                    <button onClick={handleAddNewPlayer} className="text-green-500 hover:text-green-400 p-1" title={t('common.save', 'Save') || 'Save'}>
                      <HiOutlineCheck className="w-5 h-5" />
                    </button>
                    <button onClick={handleCancelAddPlayer} className="text-red-500 hover:text-red-400 p-1" title={t('common.cancel', 'Cancel') || 'Cancel'}>
                      <HiOutlineXMark className="w-5 h-5" />
                    </button>
                  </div>
              </div>
            ) : (
              // --- Add Player Button ---
              <button
                onClick={() => {
                    setIsAddingPlayer(true);
                    setEditingPlayerId(null); // Ensure edit mode is off
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-150 ease-in-out disabled:opacity-50"
                disabled={!!editingPlayerId} // Disable if editing another player
              >
                {t('rosterSettingsModal.addPlayerButton', 'Add Player')}
              </button>
            )}
          </div>
        </div>
        {/* Footer (Optional) */}
      </div>
    </div>
  );
};

export default RosterSettingsModal;