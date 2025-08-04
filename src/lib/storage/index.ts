// Storage abstraction layer - main exports with Phase 4 performance optimizations
export { StorageManager } from './storageManager';
export { OfflineFirstStorageManager } from './offlineFirstStorageManager';
export { IndexedDBProvider } from './indexedDBProvider';
export { SyncManager } from './syncManager';
export { authAwareStorageManager, authAwareStorageManager as storageManager } from './createStorageManager';
export { LocalStorageProvider } from './localStorageProvider';
export { SupabaseProvider } from './supabaseProvider';

// Phase 4 Enhanced providers and utilities
export { EnhancedSupabaseProvider, enhancedSupabaseProvider } from './enhancedSupabaseProvider';
export { BatchOperationManager, batchOperationManager } from './batchOperations';
export { SmartSyncManager, smartSyncManager } from './smartSync';
export { RequestDebouncer, requestDebouncer } from './requestDebouncer';
export { CompressionManager, compressionManager, FIELD_SELECTIONS } from './compressionUtils';

// Base types
export type {
  IStorageProvider,
  StorageConfig,
  StorageError,
  NetworkError,
  AuthenticationError
} from './types';

// Phase 4 types
export type {
  BatchOperation,
  BatchGameSessionData,
} from './batchOperations';

export type {
  SyncChange,
  SyncPatch,
} from './smartSync';

export type {
  DebouncedRequest,
  BatchConfig,
} from './requestDebouncer';

export type {
  FieldSelection,
  CompressedPayload,
} from './compressionUtils';