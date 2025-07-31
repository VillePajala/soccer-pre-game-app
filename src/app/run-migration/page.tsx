'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RunMigrationPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string>('');

  const runMigration = async () => {
    setIsRunning(true);
    setResult('Checking current schema...\n');

    try {
      // First, check what columns exist
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .limit(1);

      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select('*')
        .limit(1);

      let results = 'Current schema check:\n\n';
      
      if (!tournamentsError && tournamentsData) {
        const tournamentColumns = Object.keys(tournamentsData[0] || {});
        results += `Tournaments table columns: ${tournamentColumns.join(', ')}\n\n`;
        
        const expectedColumns = ['location', 'period_count', 'period_duration', 'start_date', 'end_date', 'game_dates', 'archived', 'default_roster_ids', 'notes', 'color', 'badge', 'level', 'age_group'];
        const missingColumns = expectedColumns.filter(col => !tournamentColumns.includes(col));
        
        if (missingColumns.length === 0) {
          results += '✅ Tournaments table has all required columns!\n\n';
        } else {
          results += `❌ Tournaments table missing columns: ${missingColumns.join(', ')}\n\n`;
        }
      } else {
        results += `❌ Error checking tournaments: ${tournamentsError?.message || 'Unknown error'}\n\n`;
      }

      if (!seasonsError && seasonsData) {
        const seasonColumns = Object.keys(seasonsData[0] || {});
        results += `Seasons table columns: ${seasonColumns.join(', ')}\n\n`;
        
        const expectedColumns = ['location', 'period_count', 'period_duration', 'game_dates', 'archived', 'default_roster_ids', 'notes', 'color', 'badge', 'age_group'];
        const missingColumns = expectedColumns.filter(col => !seasonColumns.includes(col));
        
        if (missingColumns.length === 0) {
          results += '✅ Seasons table has all required columns!\n\n';
        } else {
          results += `❌ Seasons table missing columns: ${missingColumns.join(', ')}\n\n`;
        }
      } else {
        results += `❌ Error checking seasons: ${seasonsError?.message || 'Unknown error'}\n\n`;
      }

      results += `
MANUAL MIGRATION REQUIRED:

Since exec_sql function is not available, please run the following SQL commands 
manually in your Supabase SQL Editor (Dashboard > SQL Editor):

-- Add missing fields to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS period_count INTEGER;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS period_duration INTEGER;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS game_dates JSONB;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS default_roster_ids JSONB;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS age_group TEXT;

-- Add missing fields to seasons table
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS period_count INTEGER;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS period_duration INTEGER;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS game_dates JSONB;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS default_roster_ids JSONB;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS age_group TEXT;

After running these commands, tournament roster selections should persist correctly!
      `;

      setResult(results);
    } catch (error) {
      setResult(`❌ Schema check failed: ${error}`);
      console.error('Schema check error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Schema Check</h1>
      <p className="mb-4">
        This will check the current schema and provide migration SQL if needed.
      </p>
      
      <button
        onClick={runMigration}
        disabled={isRunning}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isRunning ? 'Checking Schema...' : 'Check Schema & Get Migration SQL'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Migration Result:</h2>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </div>
      )}
    </div>
  );
}