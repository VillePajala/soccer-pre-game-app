// Storage abstraction layer - main exports
export { StorageManager } from './storageManager';
export { OfflineFirstStorageManager } from './offlineFirstStorageManager';
export { IndexedDBProvider } from './indexedDBProvider';
export { SyncManager } from './syncManager';
export { authAwareStorageManager, authAwareStorageManager as storageManager } from './createStorageManager';
export { LocalStorageProvider } from './localStorageProvider';
export { SupabaseProvider } from './supabaseProvider';
export type {
  IStorageProvider,
  StorageConfig,
  StorageError,
  NetworkError,
  AuthenticationError
} from './types';