'use client';

import React, { useState } from 'react';
import { Season, Tournament, Player } from '@/types';
import { HiPlusCircle, HiOutlinePencil, HiOutlineTrash, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import { UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import RosterSelection from './RosterSelection';

interface SeasonTournamentManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    seasons: Season[];
    tournaments: Tournament[];
    availablePlayers: Player[];
    addSeasonMutation: UseMutationResult<Season | null, Error, Partial<Season> & { name: string }, unknown>;
    addTournamentMutation: UseMutationResult<Tournament | null, Error, Partial<Tournament> & { name: string }, unknown>;
    updateSeasonMutation: UseMutationResult<Season | null, Error, Season, unknown>;
    deleteSeasonMutation: UseMutationResult<boolean, Error, string, unknown>;
    updateTournamentMutation: UseMutationResult<Tournament | null, Error, Tournament, unknown>;
    deleteTournamentMutation: UseMutationResult<boolean, Error, string, unknown>;
}

const SeasonTournamentManagementModal: React.FC<SeasonTournamentManagementModalProps> = ({
    isOpen, onClose, seasons, tournaments, availablePlayers,
    addSeasonMutation, addTournamentMutation,
    updateSeasonMutation, deleteSeasonMutation,
    updateTournamentMutation, deleteTournamentMutation
}) => {
    const { t } = useTranslation();
    const parseIntOrUndefined = (value: string): number | undefined => {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? undefined : parsed;
    };

    const sanitizeFields = (fields: Partial<Season>): Partial<Season> => {
        const sanitized: Partial<Season> = { ...fields };
        if (sanitized.periodCount !== undefined) {
            sanitized.periodCount =
                sanitized.periodCount === 1 || sanitized.periodCount === 2
                    ? sanitized.periodCount
                    : undefined;
        }
        if (sanitized.periodDuration !== undefined) {
            sanitized.periodDuration = sanitized.periodDuration > 0 ? sanitized.periodDuration : undefined;
        }
        return sanitized;
    };
    const [newSeasonName, setNewSeasonName] = useState('');
    const [showNewSeasonInput, setShowNewSeasonInput] = useState(false);

    const [newTournamentName, setNewTournamentName] = useState('');
    const [showNewTournamentInput, setShowNewTournamentInput] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingFields, setEditingFields] = useState<Partial<Season>>({});

    const [newSeasonFields, setNewSeasonFields] = useState<Partial<Season>>({});
    const [newTournamentFields, setNewTournamentFields] = useState<Partial<Tournament>>({});
    const [newSeasonRoster, setNewSeasonRoster] = useState<string[]>(availablePlayers.map(p => p.id));
    const [newTournamentRoster, setNewTournamentRoster] = useState<string[]>(availablePlayers.map(p => p.id));
    const [editRoster, setEditRoster] = useState<string[]>(availablePlayers.map(p => p.id));

    const [stats, setStats] = useState<Record<string, { games: number; goals: number }>>({});

    React.useEffect(() => {
        const loadStats = async () => {
            const { getFilteredGames } = await import('@/utils/savedGames');
            const seasonStats: Record<string, { games: number; goals: number }> = {};
            for (const s of seasons) {
                const games = await getFilteredGames({ seasonId: s.id });
                const goals = games.reduce((sum, [, g]) => sum + (g.gameEvents?.filter(e => e.type === 'goal').length || 0), 0);
                seasonStats[s.id] = { games: games.length, goals };
            }
            for (const t of tournaments) {
                const games = await getFilteredGames({ tournamentId: t.id });
                const goals = games.reduce((sum, [, g]) => sum + (g.gameEvents?.filter(e => e.type === 'goal').length || 0), 0);
                seasonStats[t.id] = { games: games.length, goals };
            }
            setStats(seasonStats);
        };
        if (isOpen) {
            loadStats();
        }
    }, [isOpen, seasons, tournaments]);

    if (!isOpen) {
        return null;
    }

    const handleSave = (type: 'season' | 'tournament') => {
        if (type === 'season' && newSeasonName.trim()) {
            const sanitized = sanitizeFields(newSeasonFields);
            addSeasonMutation.mutate({ name: newSeasonName.trim(), ...sanitized, defaultRoster: newSeasonRoster });
            setNewSeasonName('');
            setNewSeasonFields({});
            setNewSeasonRoster(availablePlayers.map(p => p.id));
            setShowNewSeasonInput(false);
        } else if (type === 'tournament' && newTournamentName.trim()) {
            const sanitized = sanitizeFields(newTournamentFields);
            addTournamentMutation.mutate({ name: newTournamentName.trim(), ...sanitized, defaultRoster: newTournamentRoster });
            setNewTournamentName('');
            setNewTournamentFields({});
            setNewTournamentRoster(availablePlayers.map(p => p.id));
            setShowNewTournamentInput(false);
        }
    };

    const handleEditClick = (item: Season | Tournament) => {
        setEditingId(item.id);
        setEditingName(item.name);
        setEditingFields({
            location: item.location,
            periodCount: item.periodCount,
            periodDuration: item.periodDuration,
            startDate: item.startDate,
            endDate: item.endDate,
            gameDates: item.gameDates,
            archived: item.archived,
            notes: item.notes
        });
        setEditRoster(item.defaultRoster ?? availablePlayers.map(p => p.id));
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
        setEditingFields({});
    };

    const handleSaveEdit = (id: string, type: 'season' | 'tournament') => {
        if (editingName.trim()) {
            const sanitized = sanitizeFields(editingFields);
            const base = { id, name: editingName.trim(), ...sanitized, defaultRoster: editRoster } as Season;
            if (type === 'season') {
                updateSeasonMutation.mutate(base);
            } else {
                updateTournamentMutation.mutate(base as Tournament);
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
                        data-testid={`create-${type}-button`}
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
                        <input
                            type="text"
                            value={(type==='season'?newSeasonFields.location:newTournamentFields.location) || ''}
                            onChange={(e) => type==='season'?setNewSeasonFields(f=>({...f,location:e.target.value})):setNewTournamentFields(f=>({...f,location:e.target.value}))}
                            placeholder={t('seasonTournamentModal.locationLabel')}
                            className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" value={(type==='season'?newSeasonFields.periodCount:newTournamentFields.periodCount) || ''} onChange={(e)=>type==='season'?setNewSeasonFields(f=>({...f,periodCount:parseIntOrUndefined(e.target.value)})):setNewTournamentFields(f=>({...f,periodCount:parseIntOrUndefined(e.target.value)}))} placeholder={t('seasonTournamentModal.periodCountLabel')} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500" />
                            <input type="number" value={(type==='season'?newSeasonFields.periodDuration:newTournamentFields.periodDuration) || ''} onChange={(e)=>type==='season'?setNewSeasonFields(f=>({...f,periodDuration:parseIntOrUndefined(e.target.value)})):setNewTournamentFields(f=>({...f,periodDuration:parseIntOrUndefined(e.target.value)}))} placeholder={t('seasonTournamentModal.periodDurationLabel')} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        {type==='tournament' && (
                            <>
                                <input type="date" value={(newTournamentFields.startDate as string) || ''} onChange={e=>setNewTournamentFields(f=>({...f,startDate:e.target.value}))} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" placeholder={t('seasonTournamentModal.startDateLabel')} />
                                <input type="date" value={(newTournamentFields.endDate as string) || ''} onChange={e=>setNewTournamentFields(f=>({...f,endDate:e.target.value}))} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" placeholder={t('seasonTournamentModal.endDateLabel')} />
                                <input type="text" value={(newTournamentFields.gameDates as string[] | undefined)?.join(',') || ''} onChange={e=>setNewTournamentFields(f=>({...f,gameDates:e.target.value.split(',').map(d=>d.trim()).filter(Boolean)}))} placeholder={t('seasonTournamentModal.gameDatesLabel')} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500" />
                            </>
                        )}
                        <textarea value={(type==='season'?newSeasonFields.notes:newTournamentFields.notes) || ''} onChange={(e)=>type==='season'?setNewSeasonFields(f=>({...f,notes:e.target.value})):setNewTournamentFields(f=>({...f,notes:e.target.value}))} placeholder={t('seasonTournamentModal.notesLabel')} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500" />
                        <RosterSelection
                            players={availablePlayers}
                            selectedIds={type==='season'?newSeasonRoster:newTournamentRoster}
                            onChange={ids=> type==='season'?setNewSeasonRoster(ids):setNewTournamentRoster(ids)}
                        />
                        <div className="flex items-center gap-2">
                            <label className="text-slate-200 text-sm flex items-center gap-1"><input type="checkbox" checked={(type==='season'?newSeasonFields.archived:newTournamentFields.archived) || false} onChange={(e)=>type==='season'?setNewSeasonFields(f=>({...f,archived:e.target.checked})):setNewTournamentFields(f=>({...f,archived:e.target.checked}))} className="form-checkbox h-4 w-4" />{t('seasonTournamentModal.archiveLabel')}</label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => {setShowInput(false); if(type==='season'){setNewSeasonFields({});} else {setNewTournamentFields({});}}} className="px-3 py-1 text-xs rounded bg-slate-600 hover:bg-slate-500">{t('common.cancel')}</button>
                            <button onClick={() => handleSave(type)} className="px-3 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500" data-testid={`save-new-${type}-button`}>{t('common.save')}</button>
                        </div>
                    </div>
                )}
                <div className="space-y-2">
                    {data.map(item => (
                        <div key={item.id} className="bg-slate-800/60 p-2 rounded-md">
                            {editingId === item.id ? (
                                <div className="space-y-2">
                                    <input type="text" value={editingName} onChange={(e)=>setEditingName(e.target.value)} className="w-full px-2 py-1 bg-slate-700 border border-indigo-500 rounded-md text-white" />
                                    <input type="text" value={editingFields.location || ''} onChange={(e)=>setEditingFields(f=>({...f,location:e.target.value}))} placeholder={t('seasonTournamentModal.locationLabel')} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" value={editingFields.periodCount || ''} onChange={(e)=>setEditingFields(f=>({...f,periodCount:parseIntOrUndefined(e.target.value)}))} placeholder={t('seasonTournamentModal.periodCountLabel')} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                        <input type="number" value={editingFields.periodDuration || ''} onChange={(e)=>setEditingFields(f=>({...f,periodDuration:parseIntOrUndefined(e.target.value)}))} placeholder={t('seasonTournamentModal.periodDurationLabel')} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                    </div>
                                    {type==='tournament' && (
                                        <>
                                            <input type="date" value={editingFields.startDate as string || ''} onChange={e=>setEditingFields(f=>({...f,startDate:e.target.value}))} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                            <input type="date" value={editingFields.endDate as string || ''} onChange={e=>setEditingFields(f=>({...f,endDate:e.target.value}))} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                            <input type="text" value={(editingFields.gameDates as string[] | undefined)?.join(',') || ''} onChange={e=>setEditingFields(f=>({...f,gameDates:e.target.value.split(',').map(d=>d.trim()).filter(Boolean)}))} placeholder={t('seasonTournamentModal.gameDatesLabel')} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                        </>
                                    )}
                                    <textarea value={editingFields.notes || ''} onChange={e=>setEditingFields(f=>({...f,notes:e.target.value}))} placeholder={t('seasonTournamentModal.notesLabel')} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                    <RosterSelection players={availablePlayers} selectedIds={editRoster} onChange={setEditRoster} />
                                    <label className="text-slate-200 text-sm flex items-center gap-1"><input type="checkbox" checked={editingFields.archived || false} onChange={e=>setEditingFields(f=>({...f,archived:e.target.checked}))} className="form-checkbox h-4 w-4" />{t('seasonTournamentModal.archiveLabel')}</label>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleSaveEdit(item.id, type)} className="p-1 text-green-400 hover:text-green-300" aria-label={`Save ${item.name}`}><HiOutlineCheck className="w-5 h-5" /></button>
                                        <button onClick={handleCancelEdit} className="p-1 text-slate-400 hover:text-slate-200" aria-label="Cancel edit"><HiOutlineX className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-slate-200 font-semibold">{item.name}</p>
                                        <p className="text-xs text-slate-400">{t('seasonTournamentModal.statsGames')}: {stats[item.id]?.games || 0} | {t('seasonTournamentModal.statsGoals')}: {stats[item.id]?.goals || 0}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                        <button onClick={() => handleEditClick(item)} className="p-1 text-slate-400 hover:text-indigo-400" aria-label={`Edit ${item.name}`}><HiOutlinePencil className="w-5 h-5" /></button>
                                        <button onClick={() => handleDelete(item.id, type)} className="p-1 text-slate-400 hover:text-red-500" aria-label={`Delete ${item.name}`}><HiOutlineTrash className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            )}
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