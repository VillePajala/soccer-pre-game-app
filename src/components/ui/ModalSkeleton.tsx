import React from 'react';
import { Skeleton, SkeletonText } from './Skeleton';

interface ModalSkeletonProps {
  title?: string;
  hasHeader?: boolean;
  hasFooter?: boolean;
  children?: React.ReactNode;
}

export const ModalSkeleton: React.FC<ModalSkeletonProps> = ({
  hasHeader = true,
  hasFooter = true,
  children,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        {hasHeader && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <Skeleton width={120} height={24} />
              <Skeleton variant="circular" width={24} height={24} />
            </div>
          </div>
        )}
        
        <div className="px-6 py-4 overflow-y-auto">
          {children || (
            <div className="space-y-4">
              <SkeletonText lines={3} />
              <Skeleton height={40} />
              <SkeletonText lines={2} />
            </div>
          )}
        </div>
        
        {hasFooter && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
            <Skeleton width={80} height={36} />
            <Skeleton width={80} height={36} />
          </div>
        )}
      </div>
    </div>
  );
};

export const GameStatsModalSkeleton: React.FC = () => {
  return (
    <ModalSkeleton title="Game Statistics">
      <div className="space-y-6">
        {/* Header stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <Skeleton width={60} height={32} className="mx-auto mb-2" />
            <Skeleton width={80} height={16} className="mx-auto" />
          </div>
          <div className="text-center">
            <Skeleton width={60} height={32} className="mx-auto mb-2" />
            <Skeleton width={80} height={16} className="mx-auto" />
          </div>
        </div>
        
        {/* Chart placeholder */}
        <div className="space-y-2">
          <Skeleton width={120} height={20} />
          <Skeleton height={200} />
        </div>
        
        {/* Player stats */}
        <div className="space-y-3">
          <Skeleton width={100} height={20} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3 p-2 border rounded">
              <Skeleton variant="circular" width={32} height={32} />
              <div className="flex-1">
                <Skeleton width={100} height={16} className="mb-1" />
                <Skeleton width={60} height={14} />
              </div>
              <Skeleton width={40} height={16} />
            </div>
          ))}
        </div>
      </div>
    </ModalSkeleton>
  );
};

export const LoadGameModalSkeleton: React.FC = () => {
  return (
    <ModalSkeleton title="Load Game">
      <div className="space-y-4">
        {/* Search bar */}
        <Skeleton height={40} />
        
        {/* Game list */}
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded">
              <div className="flex-1">
                <Skeleton width={150} height={18} className="mb-2" />
                <Skeleton width={100} height={14} />
              </div>
              <div className="flex space-x-2">
                <Skeleton width={60} height={32} />
                <Skeleton width={60} height={32} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModalSkeleton>
  );
};

export const RosterModalSkeleton: React.FC = () => {
  return (
    <ModalSkeleton title="Manage Roster">
      <div className="space-y-4">
        {/* Add player section */}
        <div className="border rounded p-3">
          <Skeleton width={80} height={16} className="mb-2" />
          <div className="flex space-x-2">
            <Skeleton height={36} className="flex-1" />
            <Skeleton width={80} height={36} />
          </div>
        </div>
        
        {/* Player list */}
        <div className="space-y-2">
          <Skeleton width={60} height={16} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-3">
                <Skeleton variant="circular" width={24} height={24} />
                <div>
                  <Skeleton width={120} height={16} className="mb-1" />
                  <Skeleton width={80} height={12} />
                </div>
              </div>
              <div className="flex space-x-1">
                <Skeleton width={24} height={24} />
                <Skeleton width={24} height={24} />
                <Skeleton width={24} height={24} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModalSkeleton>
  );
};