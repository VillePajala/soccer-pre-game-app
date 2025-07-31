import { useState, useEffect, useCallback } from 'react';

export interface SyncOperation {
  id: string;
  type: 'upload' | 'download' | 'conflict_resolve';
  table: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  timestamp: number;
}

export interface SyncProgress {
  operations: SyncOperation[];
  isActive: boolean;
  overallProgress: number;
  lastSync: Date | null;
  pendingCount: number;
  failedCount: number;
}

export const useSyncProgress = () => {
  const [progress, setProgress] = useState<SyncProgress>({
    operations: [],
    isActive: false,
    overallProgress: 0,
    lastSync: null,
    pendingCount: 0,
    failedCount: 0,
  });

  const addOperation = useCallback((operation: Omit<SyncOperation, 'id' | 'timestamp'>) => {
    const newOperation: SyncOperation = {
      ...operation,
      id: `${operation.type}_${operation.table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setProgress(prev => {
      const operations = [...prev.operations, newOperation];
      const pendingCount = operations.filter(op => op.status === 'pending').length;
      const failedCount = operations.filter(op => op.status === 'failed').length;
      const isActive = operations.some(op => op.status === 'syncing' || op.status === 'pending');
      
      // Calculate overall progress
      const totalOps = operations.length;
      const progressSum = operations.reduce((sum, op) => sum + op.progress, 0);
      const overallProgress = totalOps > 0 ? progressSum / totalOps : 0;
      
      return {
        ...prev,
        operations,
        isActive,
        overallProgress,
        pendingCount,
        failedCount,
      };
    });

    return newOperation.id;
  }, []);

  const updateOperation = useCallback((id: string, updates: Partial<SyncOperation>) => {
    setProgress(prev => {
      const operations = prev.operations.map(op => 
        op.id === id ? { ...op, ...updates } : op
      );

      const pendingCount = operations.filter(op => op.status === 'pending').length;
      const failedCount = operations.filter(op => op.status === 'failed').length;
      const isActive = operations.some(op => op.status === 'syncing' || op.status === 'pending');
      
      // Calculate overall progress
      const totalOps = operations.length;
      const progressSum = operations.reduce((sum, op) => sum + op.progress, 0);
      const overallProgress = totalOps > 0 ? progressSum / totalOps : 0;

      // Update last sync time if an operation completed
      const lastSync = updates.status === 'completed' ? new Date() : prev.lastSync;

      return {
        ...prev,
        operations,
        isActive,
        overallProgress,
        lastSync,
        pendingCount,
        failedCount,
      };
    });
  }, []);

  const removeOperation = useCallback((id: string) => {
    setProgress(prev => {
      const operations = prev.operations.filter(op => op.id !== id);
      const pendingCount = operations.filter(op => op.status === 'pending').length;
      const failedCount = operations.filter(op => op.status === 'failed').length;
      const isActive = operations.some(op => op.status === 'syncing' || op.status === 'pending');
      
      // Calculate overall progress
      const totalOps = operations.length;
      const progressSum = operations.reduce((sum, op) => sum + op.progress, 0);
      const overallProgress = totalOps > 0 ? progressSum / totalOps : 0;
      
      return {
        ...prev,
        operations,
        isActive,
        overallProgress,
        pendingCount,
        failedCount,
      };
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setProgress(prev => {
      const operations = prev.operations.filter(op => op.status !== 'completed');
      const pendingCount = operations.filter(op => op.status === 'pending').length;
      const failedCount = operations.filter(op => op.status === 'failed').length;
      const isActive = operations.some(op => op.status === 'syncing' || op.status === 'pending');
      
      // Calculate overall progress
      const totalOps = operations.length;
      const progressSum = operations.reduce((sum, op) => sum + op.progress, 0);
      const overallProgress = totalOps > 0 ? progressSum / totalOps : 0;
      
      return {
        ...prev,
        operations,
        isActive,
        overallProgress,
        pendingCount,
        failedCount,
      };
    });
  }, []);

  const retryFailed = useCallback(() => {
    setProgress(prev => {
      const operations = prev.operations.map(op => 
        op.status === 'failed' 
          ? { ...op, status: 'pending' as const, progress: 0, error: undefined }
          : op
      );

      const pendingCount = operations.filter(op => op.status === 'pending').length;
      const failedCount = operations.filter(op => op.status === 'failed').length;
      const isActive = operations.some(op => op.status === 'syncing' || op.status === 'pending');
      
      // Calculate overall progress
      const totalOps = operations.length;
      const progressSum = operations.reduce((sum, op) => sum + op.progress, 0);
      const overallProgress = totalOps > 0 ? progressSum / totalOps : 0;
      
      return {
        ...prev,
        operations,
        isActive,
        overallProgress,
        pendingCount,
        failedCount,
      };
    });
  }, []);

  // Clean up old completed operations (keep last 50)
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const sortedOps = [...prev.operations].sort((a, b) => b.timestamp - a.timestamp);
        const activeOps = sortedOps.filter(op => op.status !== 'completed');
        const completedOps = sortedOps.filter(op => op.status === 'completed').slice(0, 50);
        
        return {
          ...prev,
          operations: [...activeOps, ...completedOps],
        };
      });
    }, 60000); // Clean up every minute

    return () => clearInterval(interval);
  }, []);

  return {
    ...progress,
    addOperation,
    updateOperation,
    removeOperation,
    clearCompleted,
    retryFailed,
  };
};