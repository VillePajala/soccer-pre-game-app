// Storage abstraction layer - main exports
export { storageManager, StorageManager } from './storageManager';
export { LocalStorageProvider } from './localStorageProvider';
export { SupabaseProvider } from './supabaseProvider';
export type {
  IStorageProvider,
  StorageConfig,
  StorageError,
  NetworkError,
  AuthenticationError
} from './types';