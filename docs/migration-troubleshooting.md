# Migration Troubleshooting Guide

This document lists common issues encountered when migrating existing data from `localStorage` to Supabase.

## Supabase credentials not set
- Ensure `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- If using server-side scripts, provide `SUPABASE_SERVICE_KEY`.

## Data import errors
- Verify that the exported JSON file is valid and complete.
- Remove duplicate IDs or invalid fields before import.

## Authentication problems
- Check that your Supabase project URL matches the one in `.env.local`.
- Review Row Level Security policies if data insertion fails.

Refer back to the migration guide for detailed steps.

