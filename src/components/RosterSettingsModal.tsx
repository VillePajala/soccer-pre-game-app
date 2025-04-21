'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Player } from '@/app/page'; // Import Player type
import {
    HiOutlineXMark,
    HiOutlineCheck,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineUserCircle, // Default player icon (or choose another)
    HiOutlinePencilSquare, // Icon for notes indicator
    HiOutlineEllipsisVertical // Icon for actions menu
} from 'react-icons/hi2';
import { useTranslation } from 'react-i18next';

interface RosterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: Player[];
  onRenamePlayer: (playerId: string, playerData: { name: string; nickname: string }) => void;
  onToggleGoalie: (playerId: string) => void;
  onSetJerseyNumber: (playerId: string, number: string) => void;
  onSetPlayerNotes: (playerId: string, notes: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddPlayer: (playerData: { name: string; jerseyNumber: string; notes: string; nickname: string }) => void;
  onAwardFairPlayCard?: (playerId: string) => void;
  selectedPlayerIds: string[];
  onTogglePlayerSelection: (playerId: string) => void;
  teamName: string;
  onTeamNameChange: (newName: string) => void;
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
  onAwardFairPlayCard,
  selectedPlayerIds,
  onTogglePlayerSelection,
  teamName,
  onTeamNameChange
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col border border-slate-600 overflow-hidden max-h-[calc(100vh-theme(space.8))]" >
        {/* Header - Center title, remove X button */}
        <div className="flex justify-center items-center p-4 border-b border-slate-700 flex-shrink-0 relative"> {/* Use justify-center, add relative for potential absolute positioning if needed later */}
          <h2 className="text-xl font-semibold text-yellow-400 text-center">{t('rosterSettingsModal.title', 'Manage Roster')}</h2>
          {/* REMOVED X button */}
          {/* <button onClick={onClose} className="text-slate-400 hover:text-slate-100 absolute top-4 right-4">
            <HiOutlineXMark className="w-6 h-6" />
          </button> */}
        </div>

        {/* Team Name Section */}
        <section className="p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-300 text-sm">{t('rosterSettingsModal.teamNameLabel', 'Team Name')}:</div>
            {isEditingTeamName ? (
              <div className="flex items-center">
                <input
                  ref={teamNameInputRef}
                  type="text"
                  value={editedTeamName}
                  onChange={handleTeamNameInputChange}
                  className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <div className="flex ml-2">
                  <button 
                    onClick={handleSaveTeamName} 
                    className="text-green-500 hover:text-green-400 p-1 rounded hover:bg-slate-600" 
                    title={t('common.save', 'Save')}
                  >
                    <HiOutlineCheck className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleCancelTeamNameEdit} 
                    className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-slate-600" 
                    title={t('common.cancel', 'Cancel')}
                  >
                    <HiOutlineXMark className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-slate-100">{teamName}</span>
                <button 
                  onClick={() => setIsEditingTeamName(true)} 
                  className="text-blue-400 hover:text-blue-300 ml-2 p-1 rounded hover:bg-slate-700"
                  title={t('common.edit', 'Edit')}
                >
                  <HiOutlinePencil className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Add Player Section - Moved here, below header, outside scroll */}
        <section className="p-4 border-b border-slate-700 flex-shrink-0">
           {isAddingPlayer ? (
            // --- Add Player Form - Apply styles ---
            <div className="p-3 rounded-md bg-slate-700/50 border border-slate-600 space-y-2">
               {/* Row 1: Icon, Name/Nickname, Jersey */}
               <div className="flex items-start space-x-3">
                  {/* Placeholder Icon */}
                  <div className="p-1.5 rounded text-slate-500 mt-1">
                      <HiOutlineUserCircle className="w-5 h-5" />
                  </div>
                  {/* Name & Nickname Inputs */}
                  <div className="flex flex-col space-y-1 flex-grow">
                      <input
                        type="text"
                        name="name"
                        placeholder={t('rosterSettingsModal.playerNamePlaceholder', 'Player Name') || 'Player Name'}
                        value={newPlayerData.name}
                        onChange={handleNewPlayerInputChange}
                        className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 text-sm w-full focus:ring-indigo-500 focus:border-indigo-500 outline-none" // Style match
                        autoFocus
                      />
                      <input
                        type="text"
                        name="nickname"
                        placeholder={t('rosterSettingsModal.nicknamePlaceholder', 'Nickname (for disc)') || 'Nickname (for disc)'}
                        value={newPlayerData.nickname}
                        onChange={handleNewPlayerInputChange}
                        className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 text-sm w-full focus:ring-indigo-500 focus:border-indigo-500 outline-none" // Style match
                      />
                  </div>
                  {/* Jersey Input */}
                  <input
                    type="text"
                    name="jerseyNumber"
                    placeholder="#"
                    value={newPlayerData.jerseyNumber}
                    onChange={handleNewPlayerInputChange}
                    className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 w-16 text-sm text-center focus:ring-indigo-500 focus:border-indigo-500 outline-none" // Style match
                    maxLength={3}
                  />
                </div>
                {/* Notes Textarea */}
                <textarea
                    name="notes"
                    placeholder={t('rosterSettingsModal.notesPlaceholder', 'Player notes...') || 'Player notes...'}
                    value={newPlayerData.notes}
                    onChange={handleNewPlayerInputChange}
                    className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 w-full text-sm h-16 resize-none scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700 focus:ring-indigo-500 focus:border-indigo-500 outline-none" // Style match
                    rows={2}
                  />
                {/* Action Buttons (Save/Cancel) - Use Icons */}
                <div className="flex justify-end space-x-2 pt-1">
                  <button onClick={handleAddNewPlayer} className="text-green-500 hover:text-green-400 p-1.5 rounded hover:bg-slate-600" title={t('common.save', 'Save') || 'Save'}>
                    <HiOutlineCheck className="w-5 h-5" />
                  </button>
                  <button onClick={handleCancelAddPlayer} className="text-red-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-600" title={t('common.cancel', 'Cancel') || 'Cancel'}>
                    <HiOutlineXMark className="w-5 h-5" />
                  </button>
                </div>
            </div>
          ) : (
            // --- Add Player Button - Apply button styling ---
            <button
              onClick={() => { setIsAddingPlayer(true); setEditingPlayerId(null); }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded transition duration-150 ease-in-out disabled:opacity-50 text-sm" // Style like GameStatsModal buttons
              disabled={!!editingPlayerId}
            >
              {t('rosterSettingsModal.addPlayerButton', 'Add Player')}
            </button>
          )}
        </section>

        {/* Content Area (Scrollable Player List) - Starts below Add Player section */}
        <div className="p-4 overflow-y-auto flex-grow space-y-3 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700 pr-2">
          {/* Wrap Existing Player List in a section similar to GameStatsModal */}
          <section className="bg-slate-700/50 p-4 rounded-md">
             {/* Optional: Add a title for this section? */}
             {/* <h3 className="text-lg font-semibold mb-3 text-yellow-300">{t('rosterSettingsModal.playersListTitle', 'Players')}</h3> */}

             {/* Header Row - UPDATED LABELS & PADDING */}
             <div className="flex items-center justify-between pr-2 pb-2 border-b border-slate-600 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {/* Left side: VAL, MV, Nimi - Adjusted Margins */}
                <div className="flex items-center flex-grow min-w-0 pr-2">
                   {/* Use translation keys for headers */}
                   <span className="w-4 text-center mr-4" title={t('rosterSettingsModal.selectHeader', 'Valitse') || 'Valitse'}>{t('rosterSettingsModal.selectHeader', 'VAL')}</span> 
                   <span className="w-[20px] text-center mr-3" title={t('rosterSettingsModal.goalieHeader', 'Maalivahti') || 'Maalivahti'}>{t('rosterSettingsModal.goalieHeader', 'MV')}</span>
                   <span className="flex-grow min-w-0">{t('rosterSettingsModal.nameHeader', 'Nimi')}</span>
                </div>
                {/* Right side: #, Fair Play, Actions Spacer */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="w-6 text-center" title={t('rosterSettingsModal.jerseyHeader', 'Numero') || 'Numero'}>#</span> {/* Width w-6 */}
                    <span className="w-6 text-center" title={t('rosterSettingsModal.fairPlayHeader', 'Fair Play') || 'Fair Play'}>FP</span> {/* Width w-6, Changed text to FP */}
                    <span className="w-8"></span> {/* Invisible spacer w-8 for Actions button */}
                </div>
             </div>
             {/* --------------------- */}

             <div className="space-y-2"> {/* Add space between player rows */}
                {availablePlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`p-2 rounded-md border ${editingPlayerId === player.id ? 'bg-slate-700 border-indigo-500' : 'bg-slate-800/60 border-slate-600 hover:border-slate-500'}`}
                  >
                    {editingPlayerId === player.id ? (
                      // --- Editing View - Apply GameStatsModal input styles --- 
                      <div className="flex flex-col space-y-2">
                        {/* Row 1: Goalie, Name/Nickname, Jersey */} 
                        <div className="flex items-start space-x-3"> 
                          {/* Goalie Toggle Button */}
                          <button
                              title={player.isGoalie ? t('rosterSettingsModal.unsetGoalie', 'Unset Goalie') : t('rosterSettingsModal.setGoalie', 'Set Goalie')}
                              onClick={() => onToggleGoalie(player.id)}
                              className={`p-1 rounded text-xs transition-all duration-150 flex-shrink-0 flex items-center justify-center mt-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 ${ 
                                  player.isGoalie
                                      ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600 focus:ring-amber-400'
                                      : 'border border-slate-600 text-slate-400 hover:border-amber-500 hover:text-amber-500 focus:ring-amber-500' 
                              }`}
                              style={{ minWidth: '24px', height: '24px' }}
                          >
                            <span className={`font-bold text-[10px] leading-none ${player.isGoalie ? 'text-white' : 'text-amber-500 group-hover:text-amber-400'}`}>G</span>
                          </button>
                          {/* Name & Nickname Inputs */} 
                          <div className="flex flex-col space-y-1 flex-grow">
                              <input
                                type="text"
                                name="name"
                                placeholder={t('rosterSettingsModal.playerNamePlaceholder', 'Player Name') || 'Player Name'}
                                value={editPlayerData.name} // Use renamed state
                                onChange={handleEditInputChange} // Use renamed handler
                                className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 text-sm w-full focus:ring-indigo-500 focus:border-indigo-500 outline-none" // Style like GameStatsModal
                                autoFocus
                              />
                              <input
                                type="text"
                                name="nickname"
                                placeholder={t('rosterSettingsModal.nicknamePlaceholder', 'Nickname (for disc)') || 'Nickname (for disc)'}
                                value={editPlayerData.nickname} // Use renamed state
                                onChange={handleEditInputChange} // Use renamed handler
                                className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 text-sm w-full focus:ring-indigo-500 focus:border-indigo-500 outline-none" // Style like GameStatsModal
                              />
                          </div>
                          {/* Jersey Input */}
                          <input
                            type="text"
                            name="jerseyNumber"
                            placeholder="#"
                            value={editPlayerData.jerseyNumber} // Use renamed state
                            onChange={handleEditInputChange} // Use renamed handler
                            className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 w-16 text-sm text-center focus:ring-indigo-500 focus:border-indigo-500 outline-none" // Style like GameStatsModal
                            maxLength={3}
                          />
                        </div>
                        {/* Notes Textarea */}
                        <textarea
                            name="notes"
                            placeholder={t('rosterSettingsModal.notesPlaceholder', 'Player notes...') || 'Player notes...'}
                            value={editPlayerData.notes} // Use renamed state
                            onChange={handleEditInputChange} // Use renamed handler
                            className="bg-slate-600 border border-slate-500 text-slate-100 rounded px-2 py-1 w-full text-sm h-16 resize-none scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700 focus:ring-indigo-500 focus:border-indigo-500 outline-none" // Style like GameStatsModal
                            rows={2}
                          />
                        {/* Action Buttons (Save/Cancel) - Use Icons */}
                        <div className="flex justify-end space-x-2 pt-1">
                          <button onClick={() => handleSaveEdit(player.id)} className="text-green-500 hover:text-green-400 p-1.5 rounded hover:bg-slate-600" title={t('common.save', 'Save') || 'Save'}>
                            <HiOutlineCheck className="w-5 h-5" />
                          </button>
                          <button onClick={handleCancelEdit} className="text-red-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-600" title={t('common.cancel', 'Cancel') || 'Cancel'}>
                            <HiOutlineXMark className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // --- Display View - Adjust styling and indicator position --- 
                      <div className="flex items-center justify-between">
                        {/* Left side: Checkbox, Goalie, Name */}
                        <div className="flex items-center space-x-2 flex-grow min-w-0 pr-2">
                          {/* Selection Checkbox */}
                          <input 
                            type="checkbox"
                            checked={selectedPlayerIds.includes(player.id)}
                            onChange={() => onTogglePlayerSelection(player.id)}
                            className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-600 border-slate-500 rounded focus:ring-indigo-500 shrink-0" 
                            title={t('rosterSettingsModal.toggleSelection', 'Toggle player selection for match')}
                          />
                          {/* Goalie Toggle Button (Display) */}
                          <button
                            title={player.isGoalie ? t('rosterSettingsModal.unsetGoalie', 'Unset Goalie') : t('rosterSettingsModal.setGoalie', 'Set Goalie')}
                            onClick={() => onToggleGoalie(player.id)}
                            className={`p-1 rounded text-xs transition-all duration-150 flex-shrink-0 flex items-center justify-center focus:outline-none ${player.isGoalie ? 'bg-amber-500 text-white shadow-sm' : 'border border-slate-700 text-slate-500 opacity-60 hover:opacity-100 hover:border-amber-500 hover:text-amber-500'}`}
                            style={{ minWidth: '20px', height: '20px' }}
                          >
                            <span className={`font-bold text-[9px] leading-none ${player.isGoalie ? 'text-white' : 'text-amber-600'}`}>G</span>
                          </button>
                          {/* Name Display - Prioritize Nickname */}
                          <span className="text-sm text-slate-100 flex-shrink min-w-0 break-words truncate" title={player.name}> {/* Show full name on hover */} 
                            {player.nickname || player.name} {/* Display nickname if available, else full name */} 
                          </span>
                        </div>
                        {/* Right side: Indicators, Jersey, Actions */}
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {/* Notes Indicator */}
                          {player.notes && (
                            <HiOutlinePencilSquare title={t('rosterSettingsModal.hasNotes', 'Has Notes')} className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          )}
                          {/* Jersey # - Smaller */}
                          <span className="text-xs text-slate-400 flex-shrink-0">{player.jerseyNumber ? `#${player.jerseyNumber}` : ''}</span>
                          {/* Fair Play Badge */}
                          {onAwardFairPlayCard && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onAwardFairPlayCard(player.id); }}
                              className={`p-1 rounded text-xs transition-all duration-150 flex-shrink-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${player.receivedFairPlayCard ? 'bg-emerald-500 text-white shadow-md hover:bg-emerald-600 focus:ring-emerald-400' : 'border border-slate-600 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 focus:ring-emerald-500'}`}
                              style={{ minWidth: '24px', height: '24px' }}
                              title={player.receivedFairPlayCard ? t('rosterSettingsModal.removeFairPlay', 'Remove Fair Play') : t('rosterSettingsModal.awardFairPlay', 'Award Fair Play Card')}
                            >
                              <span className={`font-bold text-[10px] leading-none ${player.receivedFairPlayCard ? 'text-white' : 'text-emerald-500'}`}>FP</span>
                            </button>
                          )}
                          {/* Actions Menu Button */}
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActionsMenuPlayerId(actionsMenuPlayerId === player.id ? null : player.id); }}
                              className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-slate-700 flex-shrink-0"
                              title={t('rosterSettingsModal.actions', 'Actions')}
                              disabled={isAddingPlayer || !!editingPlayerId} // Keep disabled logic
                            >
                              <HiOutlineEllipsisVertical className="w-5 h-5" />
                            </button>
                            {/* Actions Menu Popover */}
                            {actionsMenuPlayerId === player.id && (
                              <div
                                ref={actionsMenuRef}
                                className="absolute right-0 top-full mt-1 w-32 bg-slate-700 border border-slate-600 rounded-md shadow-lg z-10 py-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button onClick={() => { handleStartEdit(player.id); setActionsMenuPlayerId(null); }} className="flex items-center w-full px-3 py-1.5 text-sm text-blue-300 hover:bg-slate-600 disabled:opacity-50" disabled={isAddingPlayer || !!editingPlayerId}>
                                 <HiOutlinePencil className="w-4 h-4 mr-2" /> {t('common.edit', 'Edit')}
                                </button>
                                <button onClick={() => { onRemovePlayer(player.id); setActionsMenuPlayerId(null); }} className="flex items-center w-full px-3 py-1.5 text-sm text-red-400 hover:bg-slate-600 disabled:opacity-50" disabled={isAddingPlayer || !!editingPlayerId}>
                                 <HiOutlineTrash className="w-4 h-4 mr-2" /> {t('common.remove', 'Remove')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
             </div>
          </section>
        </div>

        {/* Footer with Close Button */}
        <div className="flex justify-center mt-4 pt-4 border-t border-slate-700 flex-shrink-0 p-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition duration-150 text-sm"
          >
            {t('common.closeButton', 'Sulje')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default RosterSettingsModal;