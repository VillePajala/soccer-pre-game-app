'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaPause, FaUndo } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/utils/time';
import logger from '@/utils/logger';
import { 
  useGameStore, 
  useGameSession, 
  useGameTimer,
  useGameScore 
} from '@/stores/gameStore';
// import { useUIStore } from '@/stores/uiStore'; // TODO: Use when implementing UI state
import type { TimerOverlayProps } from './TimerOverlay.migration';

/**
 * Migrated TimerOverlay component that uses Zustand stores
 * Maintains same interface as legacy component but with centralized state
 */
export const MigratedTimerOverlay: React.FC<TimerOverlayProps> = ({
  // Props that will be overridden by store values
  timeElapsedInSeconds: _propTimeElapsed, // eslint-disable-line @typescript-eslint/no-unused-vars
  isTimerRunning: _propIsTimerRunning, // eslint-disable-line @typescript-eslint/no-unused-vars
  teamName: _propTeamName, // eslint-disable-line @typescript-eslint/no-unused-vars
  opponentName: _propOpponentName, // eslint-disable-line @typescript-eslint/no-unused-vars
  homeScore: _propHomeScore, // eslint-disable-line @typescript-eslint/no-unused-vars
  awayScore: _propAwayScore, // eslint-disable-line @typescript-eslint/no-unused-vars
  currentPeriod: _propCurrentPeriod, // eslint-disable-line @typescript-eslint/no-unused-vars
  gameStatus: _propGameStatus, // eslint-disable-line @typescript-eslint/no-unused-vars
  
  // Props that are still used from parent
  subAlertLevel,
  onSubstitutionMade,
  completedIntervalDurations: _completedIntervalDurations, // eslint-disable-line @typescript-eslint/no-unused-vars
  subIntervalMinutes: _subIntervalMinutes, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSetSubInterval: _onSetSubInterval, // eslint-disable-line @typescript-eslint/no-unused-vars
  onStartPauseTimer,
  onResetTimer,
  onToggleGoalLogModal = () => { logger.warn('onToggleGoalLogModal handler not provided'); },
  onRecordOpponentGoal = () => { logger.warn('onRecordOpponentGoal handler not provided'); },
  homeOrAway,
  numberOfPeriods = 2,
  periodDurationMinutes: _periodDurationMinutes = 10, // eslint-disable-line @typescript-eslint/no-unused-vars
  lastSubTime: _lastSubTime = null, // eslint-disable-line @typescript-eslint/no-unused-vars
  onOpponentNameChange = () => { logger.warn('onOpponentNameChange handler not provided'); },
  onClose,
  isLoaded,
}) => {
  const { t } = useTranslation();
  
  // Get values from Zustand stores
  const gameSession = useGameSession();
  const { timeElapsed, isRunning } = useGameTimer();
  const { incrementHomeScore, incrementAwayScore } = useGameScore();
  const gameStore = useGameStore();
  
  // Use store values instead of props where available
  const displayTimeElapsed = timeElapsed;
  const displayIsTimerRunning = isRunning;
  const displayTeamName = gameSession.teamName;
  const displayOpponentName = gameSession.opponentName;
  const displayHomeScore = gameSession.homeScore;
  const displayAwayScore = gameSession.awayScore;
  const displayCurrentPeriod = gameSession.currentPeriod;
  const displayGameStatus = gameSession.gameStatus as 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd';
  
  // State for opponent name editing
  const [isEditingOpponentName, setIsEditingOpponentName] = useState(false);
  const [editedOpponentName, setEditedOpponentName] = useState(displayOpponentName);
  const opponentInputRef = useRef<HTMLInputElement>(null);
  
  // Update edited name when opponent name changes
  useEffect(() => {
    setEditedOpponentName(displayOpponentName);
  }, [displayOpponentName]);
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditingOpponentName) {
      opponentInputRef.current?.focus();
      opponentInputRef.current?.select();
    }
  }, [isEditingOpponentName]);
  
  // Handle timer controls using store actions
  const handleStartPauseTimer = useCallback(() => {
    if (displayIsTimerRunning) {
      gameStore.setTimerRunning(false);
    } else {
      gameStore.setTimerRunning(true);
    }
    // Also call parent handler for compatibility
    onStartPauseTimer();
  }, [displayIsTimerRunning, gameStore, onStartPauseTimer]);
  
  const handleResetTimer = useCallback(() => {
    gameStore.resetTimer();
    // Also call parent handler for compatibility
    onResetTimer();
  }, [gameStore, onResetTimer]);
  
  // Handle goal recording using store actions
  const handleRecordGoal = useCallback(() => {
    if (homeOrAway === 'home') {
      incrementHomeScore();
    } else {
      incrementAwayScore();
    }
    onToggleGoalLogModal();
  }, [homeOrAway, incrementHomeScore, incrementAwayScore, onToggleGoalLogModal]);
  
  const handleRecordOpponentGoal = useCallback(() => {
    if (homeOrAway === 'home') {
      incrementAwayScore();
    } else {
      incrementHomeScore();
    }
    onRecordOpponentGoal();
  }, [homeOrAway, incrementHomeScore, incrementAwayScore, onRecordOpponentGoal]);
  
  // Handle opponent name change
  const handleSaveOpponentName = useCallback(() => {
    const trimmedName = editedOpponentName.trim();
    if (trimmedName && trimmedName !== displayOpponentName) {
      gameStore.setOpponentName(trimmedName);
      // Also call parent handler for compatibility
      onOpponentNameChange(trimmedName);
    }
    setIsEditingOpponentName(false);
  }, [editedOpponentName, displayOpponentName, gameStore, onOpponentNameChange]);
  
  const handleCancelEdit = useCallback(() => {
    setEditedOpponentName(displayOpponentName);
    setIsEditingOpponentName(false);
  }, [displayOpponentName]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveOpponentName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveOpponentName, handleCancelEdit]);
  
  // Determine text color based on alert status
  let textColor = 'text-slate-100';
  if (subAlertLevel === 'due') {
    textColor = 'text-red-400';
  } else if (subAlertLevel === 'warning') {
    textColor = 'text-orange-300';
  }
  
  // Determine background color
  const isEndOfGame = displayGameStatus === 'gameEnd';
  const bgColor = isEndOfGame ? 'bg-green-700/90' : 'bg-slate-800/90';
  
  // Calculate display values
  const displayHomeTeam = homeOrAway === 'home' ? displayTeamName : displayOpponentName;
  const displayAwayTeam = homeOrAway === 'home' ? displayOpponentName : displayTeamName;
  
  // Show loading state if not loaded
  if (!isLoaded) {
    return (
      <div className={`fixed top-0 left-0 right-0 ${bgColor} backdrop-blur-sm px-4 py-3 shadow-lg z-40`}>
        <div className="text-center text-slate-300">
          {t('loading', 'Loading...')}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`fixed top-0 left-0 right-0 ${bgColor} backdrop-blur-sm px-4 py-3 shadow-lg z-40`}>
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-200 p-1"
          aria-label={t('close', 'Close')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      {/* Main content */}
      <div className="max-w-6xl mx-auto">
        {/* Top row: Teams and Score */}
        <div className="flex items-center justify-between mb-3">
          {/* Teams and Score */}
          <div className="flex items-center space-x-4">
            <span className="text-slate-100 font-semibold text-lg">
              {displayHomeTeam}
            </span>
            <span className="bg-slate-700/80 px-3 py-1 rounded text-yellow-300 font-bold text-xl">
              {displayHomeScore} - {displayAwayScore}
            </span>
            {isEditingOpponentName ? (
              <input
                ref={opponentInputRef}
                type="text"
                value={editedOpponentName}
                onChange={(e) => setEditedOpponentName(e.target.value)}
                onBlur={handleSaveOpponentName}
                onKeyDown={handleKeyDown}
                className="bg-slate-700/80 text-slate-100 px-2 py-1 rounded border border-slate-600 focus:border-blue-400 focus:outline-none"
              />
            ) : (
              <span 
                className="text-slate-100 font-semibold text-lg cursor-pointer hover:text-slate-300"
                onClick={() => setIsEditingOpponentName(true)}
                title={t('clickToEdit', 'Click to edit')}
              >
                {displayAwayTeam}
              </span>
            )}
          </div>
          
          {/* Timer display */}
          <div className={`text-3xl font-bold ${textColor} font-mono`}>
            {formatTime(displayTimeElapsed)}
          </div>
        </div>
        
        {/* Bottom row: Controls */}
        <div className="flex items-center justify-between">
          {/* Period and status info */}
          <div className="text-slate-300 text-sm">
            {displayGameStatus !== 'gameEnd' && (
              <>
                {t('period', 'Period')} {displayCurrentPeriod}/{numberOfPeriods}
                {displayGameStatus === 'periodEnd' && (
                  <span className="ml-2 text-yellow-400">
                    ({t('periodEnd', 'Period End')})
                  </span>
                )}
              </>
            )}
            {displayGameStatus === 'gameEnd' && (
              <span className="text-green-300 font-semibold">
                {t('gameEnd', 'Game End')}
              </span>
            )}
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center space-x-3">
            {/* Goal buttons */}
            <button
              onClick={handleRecordGoal}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
              {t('ourGoal', 'Our Goal')}
            </button>
            <button
              onClick={handleRecordOpponentGoal}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
              {t('opponentGoal', 'Opponent Goal')}
            </button>
            
            {/* Timer controls */}
            <button
              onClick={handleStartPauseTimer}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md transition-colors"
              disabled={displayGameStatus === 'gameEnd'}
            >
              {displayIsTimerRunning ? <FaPause /> : <FaPlay />}
            </button>
            <button
              onClick={handleResetTimer}
              className="bg-slate-600 hover:bg-slate-700 text-white p-2 rounded-md transition-colors"
            >
              <FaUndo />
            </button>
            
            {/* Substitution button */}
            {subAlertLevel === 'due' && (
              <button
                onClick={onSubstitutionMade}
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors animate-pulse"
              >
                {t('subMade', 'Sub Made')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MigratedTimerOverlay);