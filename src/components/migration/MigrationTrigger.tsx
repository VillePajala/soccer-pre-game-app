'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMigrationStatus } from '../../lib/migration/migrationStatus';
import { MigrationModal } from './MigrationModal';

interface MigrationTriggerProps {
  children: React.ReactNode;
}

/**
 * Component that automatically triggers migration modal when needed
 * Wraps the app to detect migration requirements on auth state changes
 */
export function MigrationTrigger({ children }: MigrationTriggerProps) {
  const { user, loading: authLoading } = useAuth();
  const { loading: statusLoading, needsMigration } = useMigrationStatus();
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [hasCheckedMigration, setHasCheckedMigration] = useState(false);

  useEffect(() => {
    // Wait for auth and migration status to load
    if (authLoading || statusLoading || hasCheckedMigration) {
      return;
    }

    // If user is authenticated and needs migration, show modal
    if (user && needsMigration) {
      setShowMigrationModal(true);
      setHasCheckedMigration(true);
    } else if (user && !needsMigration) {
      // User doesn't need migration, mark as checked
      setHasCheckedMigration(true);
    }
  }, [user, needsMigration, authLoading, statusLoading, hasCheckedMigration]);

  const handleMigrationComplete = () => {
    setShowMigrationModal(false);
    setHasCheckedMigration(true);
  };

  const handleMigrationClose = () => {
    setShowMigrationModal(false);
    setHasCheckedMigration(true);
  };

  return (
    <>
      {children}
      
      <MigrationModal
        isOpen={showMigrationModal}
        onClose={handleMigrationClose}
        onComplete={handleMigrationComplete}
      />
    </>
  );
}