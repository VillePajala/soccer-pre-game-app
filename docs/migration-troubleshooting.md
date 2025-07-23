# Supabase Migration Troubleshooting

If you run into problems when enabling Supabase or migrating existing data, try the following steps:

## 1. Environment Variables

Ensure your `.env.local` contains the correct values from your Supabase project:

```
NEXT_PUBLIC_ENABLE_SUPABASE=true
NEXT_PUBLIC_DISABLE_FALLBACK=false
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The application will fail to start if these variables are missing when the feature flag is enabled.

## 2. Migration Script Errors

If the migration script stops or reports errors:

- Check your network connection.
- Verify that the target tables exist in Supabase and the service key has the correct permissions.
- Look at the browser console or terminal output for detailed error messages.

## 3. Data Validation Issues

Should imported data appear incorrect:

- Confirm the export JSON contains all expected fields.
- Run the migration again with `NEXT_PUBLIC_DISABLE_FALLBACK=true` to surface any Supabase errors immediately.

For additional help consult the [migration guide](../.docs/supabase/migration-guide.md).
