'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Player } from '@/types'; // Import Player type from the central types file
import {
    HiOutlineXMark,
    HiOutlineCheck,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineChartBar
} from 'react-icons/hi2';
import { useTranslation } from 'react-i18next';

interface RosterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: Player[];
  onRenamePlayer: (playerId: string, playerData: { name: string; nickname: string }) => void;
  onSetJerseyNumber: (playerId: string, number: string) => void;
  onSetPlayerNotes: (playerId: string, notes: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddPlayer: (playerData: { name: string; jerseyNumber: string; notes: string; nickname: string }) => void;
  selectedPlayerIds: string[];
  onTogglePlayerSelection: (playerId: string) => void;
  teamName: string;
  onTeamNameChange: (newName: string) => void;
  isRosterUpdating?: boolean;
  rosterError?: string | null;
  onOpenPlayerStats: (playerId: string) => void;
  onToggleGoalie: (playerId: string) => void;
}

const RosterSettingsModal: React.FC<RosterSettingsModalProps> = ({
  isOpen,
  onClose,
  availablePlayers,
  onRenamePlayer,
  onSetJerseyNumber,
  onSetPlayerNotes,
  onRemovePlayer,
  onAddPlayer,
  selectedPlayerIds,
  onTogglePlayerSelection,
  teamName,
  onTeamNameChange,
  isRosterUpdating,
  rosterError,
  onOpenPlayerStats,
  onToggleGoalie,
}) => {
  const { t } = useTranslation();
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerData, setEditPlayerData] = useState<{ name: string; jerseyNumber: string; notes: string; nickname: string }>({ name: '', jerseyNumber: '', notes: '', nickname: '' });

  // State for team name editing
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState(teamName);
  const teamNameInputRef = useRef<HTMLInputElement>(null);

  // State for adding a new player
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [newPlayerData, setNewPlayerData] = useState({ name: '', jerseyNumber: '', notes: '', nickname: '' });

  // State for the actions menu
  const [actionsMenuPlayerId, setActionsMenuPlayerId] = useState<string | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null); // Ref for click outside
  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Load player data into form when editing starts - MODIFIED
  const handleStartEdit = (playerId: string) => { // Changed parameter to playerId
    // Find the player data directly from the current prop state INSIDE the handler
    const playerToEdit = availablePlayers.find(p => p.id === playerId);
    if (!playerToEdit) {
      console.error("Player not found in availablePlayers for editing:", playerId);
      return; // Player not found, shouldn't happen
    }

    setEditingPlayerId(playerId); // Set the ID
    setEditPlayerData({ // Set data based on the freshly found player
      name: playerToEdit.name,
      jerseyNumber: playerToEdit.jerseyNumber || '',
      notes: playerToEdit.notes || '',
      nickname: playerToEdit.nickname || '',
    });

    // Scroll the editing view into focus
    setTimeout(() => {
      const playerIndex = availablePlayers.findIndex(p => p.id === playerId);
      if (playerRefs.current[playerIndex]) {
        playerRefs.current[playerIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }, 50); // A small delay to allow the DOM to update
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPlayerId(null);
  };

  // Handle form input changes for editing
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditPlayerData(prev => ({ ...prev, [name]: value }));
  };

  // Save changes
  const handleSaveEdit = (playerId: string) => {
    const originalPlayer = availablePlayers.find(p => p.id === playerId);
    if (!originalPlayer) return; // Should not happen

    // Validate inputs if needed (e.g., non-empty name)
    const trimmedName = editPlayerData.name.trim();
    const trimmedNickname = editPlayerData.nickname.trim();
    if (!trimmedName) {
        alert(t('rosterSettingsModal.nameRequired', 'Player name cannot be empty.') || 'Player name cannot be empty.');
        return;
    }

    const nameChanged = trimmedName !== originalPlayer.name;
    const nicknameChanged = trimmedNickname !== (originalPlayer.nickname || '');
    const jerseyChanged = editPlayerData.jerseyNumber !== (originalPlayer.jerseyNumber || '');
    const notesChanged = editPlayerData.notes !== (originalPlayer.notes || '');

    // Call unified rename handler if name or nickname changed
    if (nameChanged || nicknameChanged) {
        onRenamePlayer(playerId, { name: trimmedName, nickname: trimmedNickname });
    }
    
    // Call other handlers if their data changed
    if (jerseyChanged) {
        onSetJerseyNumber(playerId, editPlayerData.jerseyNumber);
    }
    if (notesChanged) {
        onSetPlayerNotes(playerId, editPlayerData.notes);
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

  // Handle team name input change
  const handleTeamNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTeamName(e.target.value);
  };

  // Handle team name save
  const handleSaveTeamName = () => {
    if (editedTeamName.trim()) {
      onTeamNameChange(editedTeamName.trim());
    } else {
      setEditedTeamName(teamName); // Reset to original if empty
    }
    setIsEditingTeamName(false);
  };

  // Handle cancel team name edit
  const handleCancelTeamNameEdit = () => {
    setEditedTeamName(teamName);
    setIsEditingTeamName(false);
  };

  // Focus team name input when editing starts
  useEffect(() => {
    if (isEditingTeamName && teamNameInputRef.current) {
      teamNameInputRef.current.focus();
      teamNameInputRef.current.select();
    }
  }, [isEditingTeamName]);

  // Update team name state when prop changes
  useEffect(() => {
    setEditedTeamName(teamName);
  }, [teamName]);

  if (!isOpen) return null;

  // --- Style Guide Definitions ---
  const modalContainerStyle = "bg-slate-800 rounded-none shadow-xl flex flex-col border-0 overflow-hidden";
  const titleStyle = "text-3xl font-bold text-yellow-400 tracking-wide";
  const cardStyle = "bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner";
  const labelStyle = "text-sm font-medium text-slate-300 mb-1";
  const inputBaseStyle = "block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 sm:text-sm text-white";
  const buttonBaseStyle = "px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed";
  const primaryButtonStyle = `${buttonBaseStyle} bg-gradient-to-b from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-lg`;
  const secondaryButtonStyle = `${buttonBaseStyle} bg-gradient-to-b from-slate-600 to-slate-700 text-slate-200 hover:from-slate-700 hover:to-slate-600`;
  const iconButtonBaseStyle = "p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className={`${modalContainerStyle} bg-noise-texture relative overflow-hidden h-full w-full flex flex-col`}>
        {/* Background effects */}
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
        <div className="absolute -inset-[50px] bg-sky-400/5 blur-2xl top-0 opacity-50" />
        <div className="absolute -inset-[50px] bg-indigo-600/5 blur-2xl bottom-0 opacity-50" />

        {/* Content wrapper */}
        <div className="relative z-10 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex justify-center items-center py-8 backdrop-blur-sm bg-slate-900/20">
            <h2 className={`${titleStyle} drop-shadow-lg`}>{t('rosterSettingsModal.title', 'Manage Roster')}</h2>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-6 backdrop-blur-sm bg-slate-900/20">
            {/* Team Name Section */}
            <div className="px-4 pt-2">
              <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 rounded-lg shadow-inner">
                {isEditingTeamName ? (
                  <div className="p-3">
                    <input
                      ref={teamNameInputRef}
                      type="text"
                      value={editedTeamName}
                      onChange={handleTeamNameInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTeamName();
                        if (e.key === 'Escape') handleCancelTeamNameEdit();
                      }}
                      onBlur={handleSaveTeamName}
                      className={`${inputBaseStyle} text-lg`}
                    />
                  </div>
                ) : (
                  <div
                    className="group flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => setIsEditingTeamName(true)}
                  >
                    <p className="text-xl text-slate-100 font-semibold group-hover:text-yellow-400 transition-colors">
                      {teamName}
                    </p>
                    <HiOutlinePencil className="w-5 h-5 text-slate-500 group-hover:text-yellow-400 transition-colors" />
                  </div>
                )}
              </div>
            </div>

            {/* Add Player Section */}
            <div className="px-4">
              <button
                onClick={() => { setIsAddingPlayer(true); setEditingPlayerId(null); }}
                className={`${primaryButtonStyle} w-full`}
                disabled={!!editingPlayerId || isRosterUpdating || isAddingPlayer}
              >
                {t('rosterSettingsModal.addPlayerButton', 'Add Player')}
              </button>
            </div>
            
            {/* Form to Add New Player (appears here when isAddingPlayer is true) */}
            {isAddingPlayer && (
              <div className={`${cardStyle} mx-4 space-y-3`}>
                <h3 className="text-lg font-semibold text-slate-200">{t('rosterSettingsModal.addPlayerButton', 'Add Player')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" name="name" placeholder={t('rosterSettingsModal.playerNamePlaceholder', 'Player Name')} value={newPlayerData.name} onChange={handleNewPlayerInputChange} className={inputBaseStyle} autoFocus />
                  <input type="text" name="nickname" placeholder={t('rosterSettingsModal.nicknamePlaceholder', 'Nickname (Optional)')} value={newPlayerData.nickname} onChange={handleNewPlayerInputChange} className={inputBaseStyle} />
                </div>
                <input type="text" name="jerseyNumber" placeholder={t('rosterSettingsModal.jerseyHeader', '#')} value={newPlayerData.jerseyNumber} onChange={handleNewPlayerInputChange} className={`${inputBaseStyle} w-24 text-center`} maxLength={3} />
                <textarea name="notes" placeholder={t('rosterSettingsModal.notesPlaceholder', 'Player notes...')} value={newPlayerData.notes} onChange={handleNewPlayerInputChange} className={`${inputBaseStyle} h-20 resize-none`} rows={3} />
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={handleCancelAddPlayer} className={secondaryButtonStyle} disabled={isRosterUpdating}>{t('common.cancelButton', 'Cancel')}</button>
                  <button onClick={handleAddNewPlayer} className={primaryButtonStyle} disabled={isRosterUpdating}>{t('rosterSettingsModal.confirmAddPlayer', 'Add Player')}</button>
                </div>
                {rosterError && <div className="mt-2 text-sm text-red-400">{rosterError}</div>}
              </div>
            )}

            {/* Player List */}
            <div className={`${cardStyle} mx-4`}>
              {/* Player List Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-700 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span className="pl-10 flex-1">{t('common.player', 'Player')}</span>
                <span className="w-28 text-right">{t('common.actions', 'Actions')}</span>
              </div>
              <div className="space-y-1.5">
                {availablePlayers.map((player, index) => (
                  <div 
                    key={player.id}
                    ref={(el) => { playerRefs.current[index] = el; }}
                    className={`p-2 rounded-md border ${editingPlayerId === player.id ? 'bg-slate-700/75 border-indigo-500' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 transition-colors'}`}
                  >
                    {editingPlayerId === player.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label htmlFor={`name-${player.id}`} className={labelStyle}>{t('rosterSettingsModal.nameHeader', 'Name')}</label>
                            <input id={`name-${player.id}`} type="text" name="name" value={editPlayerData.name} onChange={handleEditInputChange} className={inputBaseStyle} />
                          </div>
                          <div>
                            <label htmlFor={`nickname-${player.id}`} className={labelStyle}>{t('rosterSettingsModal.nicknamePlaceholder', 'Nickname')}</label>
                            <input id={`nickname-${player.id}`} type="text" name="nickname" value={editPlayerData.nickname} onChange={handleEditInputChange} className={inputBaseStyle} placeholder={t('rosterSettingsModal.nicknamePlaceholder', 'Nickname (Optional)')} />
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`jersey-${player.id}`} className={labelStyle}>{t('rosterSettingsModal.jerseyHeader', 'Jersey #')}</label>
                          <input id={`jersey-${player.id}`} type="text" name="jerseyNumber" value={editPlayerData.jerseyNumber} onChange={handleEditInputChange} className={`${inputBaseStyle} w-24 text-center`} placeholder="#" maxLength={3} />
                        </div>
                        <div>
                          <label htmlFor={`notes-${player.id}`} className={labelStyle}>{t('rosterSettingsModal.notesPlaceholder', 'Notes')}</label>
                          <textarea id={`notes-${player.id}`} name="notes" value={editPlayerData.notes} onChange={handleEditInputChange} className={`${inputBaseStyle} h-20 resize-none`} placeholder={t('rosterSettingsModal.notesPlaceholder', 'Player notes...')} rows={3} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={handleCancelEdit} className={`${iconButtonBaseStyle} text-slate-400 hover:bg-slate-600`} title={t('common.cancel', 'Cancel')}><HiOutlineXMark className="w-5 h-5" /></button>
                          <button onClick={() => handleSaveEdit(player.id)} className={`${iconButtonBaseStyle} text-green-400 hover:bg-slate-600`} title={t('common.save', 'Save')}><HiOutlineCheck className="w-5 h-5" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={selectedPlayerIds.includes(player.id)} onChange={() => onTogglePlayerSelection(player.id)} className="form-checkbox h-5 w-5 text-indigo-600 bg-slate-600 border-slate-500 rounded focus:ring-indigo-500 shrink-0" disabled={isRosterUpdating} />
                        <div className="flex-grow flex items-center gap-2 truncate">
                          <span className="text-base text-slate-100 truncate" title={player.name}>{player.nickname || player.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handleStartEdit(player.id)} className={`${iconButtonBaseStyle} text-slate-400 hover:text-indigo-400`} title={t('common.edit', 'Edit')} disabled={isRosterUpdating || isAddingPlayer}><HiOutlinePencil className="w-5 h-5" /></button>
                          <button onClick={() => onOpenPlayerStats(player.id)} className={`${iconButtonBaseStyle} text-slate-400 hover:text-indigo-400`} title={t('common.stats', 'Stats')} disabled={isRosterUpdating || isAddingPlayer}><HiOutlineChartBar className="w-5 h-5" /></button>
                          <button onClick={() => onToggleGoalie(player.id)} className={`${iconButtonBaseStyle} text-slate-400 hover:text-indigo-400`} title={t('rosterSettingsModal.toggleGoalie', 'Toggle Goalie')} disabled={isRosterUpdating || isAddingPlayer}>G</button>
                          <button onClick={() => { if (window.confirm(t('rosterSettingsModal.confirmDeletePlayer', 'Are you sure you want to remove this player?'))) { onRemovePlayer(player.id); } }} className={`${iconButtonBaseStyle} text-slate-400 hover:text-red-500`} title={t('common.remove', 'Remove')} disabled={isRosterUpdating || isAddingPlayer}><HiOutlineTrash className="w-5 h-5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {rosterError && !isAddingPlayer && <div className="mt-3 text-sm text-red-400">{rosterError}</div>}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20">
            <div className="flex justify-end px-4">
              <button onClick={onClose} className={secondaryButtonStyle}>
                {t('common.doneButton', 'Done')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RosterSettingsModal;