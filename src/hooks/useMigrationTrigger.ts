'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMigrationStatus } from '@/lib/migration/migrationStatus';
import { MigrationModal } from '@/components/migration/MigrationModal';

/**
 * Hook that monitors auth state and triggers migration modal when needed
 */
export function useMigrationTrigger() {
  const { user, loading: authLoading } = useAuth();
  const { loading: migrationLoading, needsMigration } = useMigrationStatus();
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [hasCheckedMigration, setHasCheckedMigration] = useState(false);

  useEffect(() => {
    // Wait for both auth and migration status to load
    if (authLoading || migrationLoading) return;

    // Only check once per session
    if (hasCheckedMigration) return;

    // If user is authenticated and needs migration, show modal
    if (user && needsMigration) {
      setShowMigrationModal(true);
      setHasCheckedMigration(true);
    }
  }, [user, authLoading, migrationLoading, needsMigration, hasCheckedMigration]);

  const handleMigrationComplete = () => {
    setShowMigrationModal(false);
    // Refresh the page to ensure clean state after migration
    window.location.reload();
  };

  const handleMigrationClose = () => {
    setShowMigrationModal(false);
  };

  const MigrationModalComponent = showMigrationModal ? React.createElement(MigrationModal, {
    isOpen: showMigrationModal,
    onClose: handleMigrationClose,
    onComplete: handleMigrationComplete
  }) : null;

  return {
    showMigrationModal,
    MigrationModalComponent
  };
}