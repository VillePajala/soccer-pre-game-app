import React, { useState } from 'react';
import { Season, Tournament } from '@/types';
import { HiPlusCircle } from 'react-icons/hi';
import { UseMutationResult } from '@tanstack/react-query';

interface SeasonTournamentManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    seasons: Season[];
    tournaments: Tournament[];
    addSeasonMutation: UseMutationResult<Season | null, Error, { name: string }, unknown>;
    addTournamentMutation: UseMutationResult<Tournament | null, Error, { name: string }, unknown>;
}

const SeasonTournamentManagementModal: React.FC<SeasonTournamentManagementModalProps> = ({ isOpen, onClose, seasons, tournaments, addSeasonMutation, addTournamentMutation }) => {
    if (!isOpen) {
        return null;
    }

    const [newSeasonName, setNewSeasonName] = useState('');
    const [showNewSeasonInput, setShowNewSeasonInput] = useState(false);

    const [newTournamentName, setNewTournamentName] = useState('');
    const [showNewTournamentInput, setShowNewTournamentInput] = useState(false);

    const handleSaveSeason = () => {
        if (newSeasonName.trim()) {
            addSeasonMutation.mutate({ name: newSeasonName.trim() });
            setNewSeasonName('');
            setShowNewSeasonInput(false);
        }
    };

    const handleSaveTournament = () => {
        if (newTournamentName.trim()) {
            addTournamentMutation.mutate({ name: newTournamentName.trim() });
            setNewTournamentName('');
            setShowNewTournamentInput(false);
        }
    };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-start justify-center z-50 p-4 pt-8 sm:pt-12">
        <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl border border-slate-600 flex flex-col max-h-[calc(100vh-theme(space.16))] sm:max-h-[calc(100vh-theme(space.24))]">
            <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
                <h2 className="text-lg font-semibold text-yellow-400">
                    Manage Seasons & Tournaments
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Seasons Column */}
                <div>
                    <div className="flex justify-between items-center border-b border-slate-600 pb-2 mb-3">
                        <h3 className="text-md font-semibold text-slate-200">Seasons</h3>
                        <button onClick={() => setShowNewSeasonInput(true)} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center">
                            <HiPlusCircle className="w-4 h-4 mr-1" />
                            Create New
                        </button>
                    </div>
                    {showNewSeasonInput && (
                        <div className="p-2 bg-slate-700 rounded-md mb-2">
                            <input
                                type="text"
                                value={newSeasonName}
                                onChange={(e) => setNewSeasonName(e.target.value)}
                                placeholder="New season name..."
                                className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400"
                            />
                            <div className="flex justify-end space-x-2 mt-2">
                                <button onClick={() => setShowNewSeasonInput(false)} className="px-2 py-1 text-xs rounded bg-slate-500 hover:bg-slate-400">Cancel</button>
                                <button onClick={handleSaveSeason} className="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500">Save</button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        {seasons.map(season => (
                            <div key={season.id} className="bg-slate-700/50 p-2 rounded-md flex justify-between items-center">
                                <span className="text-sm">{season.name}</span>
                                <div className="flex space-x-2">
                                    <button className="text-blue-400 hover:text-blue-300">Edit</button>
                                    <button className="text-red-400 hover:text-red-300">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Tournaments Column */}
                <div>
                    <div className="flex justify-between items-center border-b border-slate-600 pb-2 mb-3">
                        <h3 className="text-md font-semibold text-slate-200">Tournaments</h3>
                        <button onClick={() => setShowNewTournamentInput(true)} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center">
                            <HiPlusCircle className="w-4 h-4 mr-1" />
                            Create New
                        </button>
                    </div>
                    {showNewTournamentInput && (
                        <div className="p-2 bg-slate-700 rounded-md mb-2">
                            <input
                                type="text"
                                value={newTournamentName}
                                onChange={(e) => setNewTournamentName(e.target.value)}
                                placeholder="New tournament name..."
                                className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400"
                            />
                            <div className="flex justify-end space-x-2 mt-2">
                                <button onClick={() => setShowNewTournamentInput(false)} className="px-2 py-1 text-xs rounded bg-slate-500 hover:bg-slate-400">Cancel</button>
                                <button onClick={handleSaveTournament} className="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500">Save</button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        {tournaments.map(tournament => (
                            <div key={tournament.id} className="bg-slate-700/50 p-2 rounded-md flex justify-between items-center">
                                <span className="text-sm">{tournament.name}</span>
                                <div className="flex space-x-2">
                                    <button className="text-blue-400 hover:text-blue-300">Edit</button>
                                    <button className="text-red-400 hover:text-red-300">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
             <div className="px-5 py-3 border-t border-slate-700 flex justify-end space-x-3 flex-shrink-0 bg-slate-800/80 backdrop-blur-sm">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded bg-slate-600 text-slate-200 hover:bg-slate-500 transition-colors text-sm font-medium"
                >
                    Close
                </button>
            </div>
        </div>
    </div>
  );
};

export default SeasonTournamentManagementModal; 