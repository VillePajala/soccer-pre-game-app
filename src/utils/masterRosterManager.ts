import { Player } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createSupabasePlayer,
	updateSupabasePlayer,
	deleteSupabasePlayer,
	getSupabasePlayers
} from './supabase/players';

export const getMasterRoster = async (
	supabase: SupabaseClient
): Promise<Player[]> => {
	try {
		return getSupabasePlayers(supabase);
	} catch (error) {
		console.error('[masterRosterManager] Error in getMasterRoster:', error);
		return [];
	}
};

export const addPlayer = async (
	supabase: SupabaseClient,
	playerData: Omit<Player, 'id' | 'isGoalie' | 'receivedFairPlayCard'>
): Promise<Player | null> => {
	if (!supabase) {
		console.error('[masterRosterManager] Supabase client is required to add a player.');
		return null;
	}
	try {
		const newPlayer = await createSupabasePlayer(supabase, playerData);
		return newPlayer;
	} catch (error) {
		console.error('[masterRosterManager] Error in addPlayer:', error);
		return null;
	}
};

export const updatePlayer = async (
	supabase: SupabaseClient,
	playerId: string,
	updates: Partial<Omit<Player, 'id'>>
): Promise<Player | null> => {
	if (!supabase) {
		console.error('[masterRosterManager] Supabase client is required to update a player.');
		return null;
	}
	try {
		const updatedPlayer = await updateSupabasePlayer(
			supabase,
			playerId,
			updates
		);
		return updatedPlayer;
	} catch (error) {
		console.error(
			`[masterRosterManager] Error in updatePlayer for ID ${playerId}:`,
			error
		);
		return null;
	}
};

export const removePlayer = async (
	supabase: SupabaseClient,
	playerId: string
): Promise<boolean> => {
	if (!supabase) {
		console.error('[masterRosterManager] Supabase client is required to remove a player.');
		return false;
	}
	try {
		const success = await deleteSupabasePlayer(supabase, playerId);
		return success;
	} catch (error) {
		console.error(
			`[masterRosterManager] Error in removePlayer for ID ${playerId}:`,
			error
		);
		return false;
	}
};

export const setFairPlayCardStatus = async (
	supabase: SupabaseClient,
	playerId: string,
	receivedFairPlayCard: boolean
): Promise<Player | null> => {
	if (!supabase) {
		console.error(
			'[masterRosterManager] Supabase client is required to set fair play card status.'
		);
		return null;
	}
	try {
		const updatedPlayer = await updateSupabasePlayer(supabase, playerId, {
			receivedFairPlayCard,
		});
		return updatedPlayer;
	} catch (error) {
		console.error(
			`[masterRosterManager] Error in setFairPlayCardStatus for ID ${playerId}:`,
			error
		);
		return null;
	}
};

export const setGoalieStatus = async (
	supabase: SupabaseClient,
	playerId: string,
	isGoalie: boolean
): Promise<Player | null> => {
	if (!supabase) {
		console.error(
			'[masterRosterManager] Supabase client is required to set goalie status.'
		);
		return null;
	}
	try {
		const updatedPlayer = await updateSupabasePlayer(supabase, playerId, {
			isGoalie,
		});
		return updatedPlayer;
	} catch (error) {
		console.error(
			`[masterRosterManager] Error in setGoalieStatus for ID ${playerId}:`,
			error
		);
		return null;
	}
};