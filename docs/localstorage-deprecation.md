# localStorage Deprecation Plan

With Supabase support now available, the legacy localStorage storage layer will be removed in a future release.

## Deprecation Warning

The application now emits a console warning whenever the `LocalStorageProvider` is instantiated. This serves as a notice that localStorage support is going away.

## Removal Timeline

1. **v2.0 release** — localStorage remains available but deprecated. Users should migrate their data using the built-in migration script.
2. **v2.1 release** — the `LocalStorageProvider` will be removed from the code base and the fallback option will be disabled.

## Migration Completion Criteria

- All active users have successfully run the migration script.
- No code paths depend on localStorage being present.
- End-to-end testing passes with localStorage disabled.
