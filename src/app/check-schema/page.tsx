'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CheckSchemaPage() {
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const checkSchema = async () => {
      try {
        // Check what columns exist in tournaments table
        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from('tournaments')
          .select('*')
          .limit(1);

        const { data: seasonsData, error: seasonsError } = await supabase
          .from('seasons')
          .select('*')
          .limit(1);

        if (tournamentsError && tournamentsError.code !== 'PGRST116') {
          setError(`Tournaments error: ${tournamentsError.message}`);
          return;
        }

        if (seasonsError && seasonsError.code !== 'PGRST116') {
          setError(`Seasons error: ${seasonsError.message}`);
          return;
        }

        // Also try to get table structure info
        const { data: tableInfo } = await supabase
          .rpc('get_table_columns', { table_name: 'tournaments' });

        setSchema({
          tournaments: {
            sample: tournamentsData?.[0] || 'No data',
            columns: Object.keys(tournamentsData?.[0] || {}),
            tableInfo
          },
          seasons: {
            sample: seasonsData?.[0] || 'No data', 
            columns: Object.keys(seasonsData?.[0] || {})
          }
        });
      } catch (err) {
        setError(`Error: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    checkSchema();
  }, []);

  if (loading) {
    return <div className="p-8">Loading schema info...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Schema Check</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">Tournaments Table</h2>
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold">Available Columns:</h3>
          <pre className="text-sm mt-2">
            {JSON.stringify(schema?.tournaments?.columns || [], null, 2)}
          </pre>
          
          <h3 className="font-bold mt-4">Sample Data:</h3>
          <pre className="text-sm mt-2">
            {JSON.stringify(schema?.tournaments?.sample || {}, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">Seasons Table</h2>
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold">Available Columns:</h3>
          <pre className="text-sm mt-2">
            {JSON.stringify(schema?.seasons?.columns || [], null, 2)}
          </pre>
          
          <h3 className="font-bold mt-4">Sample Data:</h3>
          <pre className="text-sm mt-2">
            {JSON.stringify(schema?.seasons?.sample || {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}