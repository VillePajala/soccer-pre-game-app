'use client';

import React, { useState } from 'react';
import { Season, Tournament } from '@/types';
import { HiPlusCircle, HiOutlinePencil, HiOutlineTrash, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import { UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface SeasonTournamentManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    seasons: Season[];
    tournaments: Tournament[];
    addSeasonMutation: UseMutationResult<Season | null, Error, { name: string }, unknown>;
    addTournamentMutation: UseMutationResult<Tournament | null, Error, { name: string }, unknown>;
    updateSeasonMutation: UseMutationResult<Season | null, Error, { id: string; name: string }, unknown>;
    deleteSeasonMutation: UseMutationResult<boolean, Error, string, unknown>;
    updateTournamentMutation: UseMutationResult<Tournament | null, Error, { id: string; name: string }, unknown>;
    deleteTournamentMutation: UseMutationResult<boolean, Error, string, unknown>;
}

const SeasonTournamentManagementModal: React.FC<SeasonTournamentManagementModalProps> = ({ 
    isOpen, onClose, seasons, tournaments, 
    addSeasonMutation, addTournamentMutation, 
    updateSeasonMutation, deleteSeasonMutation, 
    updateTournamentMutation, deleteTournamentMutation 
}) => {
    const { t } = useTranslation();
    const [newSeasonName, setNewSeasonName] = useState('');
    const [showNewSeasonInput, setShowNewSeasonInput] = useState(false);

    const [newTournamentName, setNewTournamentName] = useState('');
    const [showNewTournamentInput, setShowNewTournamentInput] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    if (!isOpen) {
        return null;
    }

    const handleSave = (type: 'season' | 'tournament') => {
        if (type === 'season' && newSeasonName.trim()) {
            addSeasonMutation.mutate({ name: newSeasonName.trim() });
            setNewSeasonName('');
            setShowNewSeasonInput(false);
        } else if (type === 'tournament' && newTournamentName.trim()) {
            addTournamentMutation.mutate({ name: newTournamentName.trim() });
            setNewTournamentName('');
            setShowNewTournamentInput(false);
        }
    };

    const handleEditClick = (item: Season | Tournament) => {
        setEditingId(item.id);
        setEditingName(item.name);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
    };

    const handleSaveEdit = (id: string, type: 'season' | 'tournament') => {
        if (editingName.trim()) {
            if (type === 'season') {
                updateSeasonMutation.mutate({ id, name: editingName.trim() });
            } else {
                updateTournamentMutation.mutate({ id, name: editingName.trim() });
            }
            handleCancelEdit();
        }
    };

    const handleDelete = (id: string, type: 'season' | 'tournament') => {
        const name = type === 'season' ? seasons.find(s => s.id === id)?.name : tournaments.find(t => t.id === id)?.name;
        if (window.confirm(t('seasonTournamentModal.confirmDelete', { name }))) {
            if (type === 'season') {
                deleteSeasonMutation.mutate(id);
            } else {
                deleteTournamentMutation.mutate(id);
            }
        }
    };

    const renderList = (type: 'season' | 'tournament') => {
        const data = type === 'season' ? seasons : tournaments;
        const showInput = type === 'season' ? showNewSeasonInput : showNewTournamentInput;
        const setShowInput = type === 'season' ? setShowNewSeasonInput : setShowNewTournamentInput;
        const name = type === 'season' ? newSeasonName : newTournamentName;
        const setName = type === 'season' ? setNewSeasonName : setNewTournamentName;
        const placeholder = type === 'season' ? t('seasonTournamentModal.newSeasonPlaceholder') : t('seasonTournamentModal.newTournamentPlaceholder');

        return (
            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                <div className="flex justify-between items-center pb-2 mb-3">
                    <h3 className="text-xl font-semibold text-slate-100">{t(`seasonTournamentModal.${type}s`)}</h3>
                    <button 
                        onClick={() => setShowInput(true)} 
                        className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                        <HiPlusCircle className="w-5 h-5" />
                        {t('seasonTournamentModal.createNew')}
                    </button>
                </div>
                {showInput && (
                    <div className="p-2 bg-slate-800 rounded-md mb-2 flex flex-col gap-2">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={placeholder}
                            className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowInput(false)} className="px-3 py-1 text-xs rounded bg-slate-600 hover:bg-slate-500">{t('common.cancel')}</button>
                            <button onClick={() => handleSave(type)} className="px-3 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500">{t('common.save')}</button>
                        </div>
                    </div>
                )}
                <div className="space-y-2">
                    {data.map(item => (
                        <div key={item.id} className="bg-slate-800/60 p-2 rounded-md flex justify-between items-center">
                            {editingId === item.id ? (
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-700 border border-indigo-500 rounded-md text-white"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(item.id, type)}
                                />
                            ) : (
                                <span className="text-sm text-slate-200">{item.name}</span>
                            )}
                            <div className="flex items-center gap-2 ml-2">
                                {editingId === item.id ? (
                                    <>
                                        <button onClick={() => handleSaveEdit(item.id, type)} className="p-1 text-green-400 hover:text-green-300" aria-label={`Save ${item.name}`}><HiOutlineCheck className="w-5 h-5" /></button>
                                        <button onClick={handleCancelEdit} className="p-1 text-slate-400 hover:text-slate-200" aria-label="Cancel edit"><HiOutlineX className="w-5 h-5" /></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleEditClick(item)} className="p-1 text-slate-400 hover:text-indigo-400" aria-label={`Edit ${item.name}`}><HiOutlinePencil className="w-5 h-5" /></button>
                                        <button onClick={() => handleDelete(item.id, type)} className="p-1 text-slate-400 hover:text-red-500" aria-label={`Delete ${item.name}`}><HiOutlineTrash className="w-5 h-5" /></button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className="bg-slate-800 flex flex-col h-full w-full bg-noise-texture relative overflow-hidden">
        {/* Header */}
        <div className="flex justify-center items-center pt-10 pb-4 px-6 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0">
          <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg text-center">
            {t('seasonTournamentModal.title')}
          </h2>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderList('season')}
            {renderList('tournament')}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-700/20 backdrop-blur-sm flex justify-end items-center gap-4 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors">
            {t('common.doneButton', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeasonTournamentManagementModal; 