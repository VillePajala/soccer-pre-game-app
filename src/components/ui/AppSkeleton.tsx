import React from 'react';
import { Skeleton, SkeletonText } from './Skeleton';

export const AppLoadingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm p-4 border-b">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Skeleton width={150} height={32} />
          <div className="flex space-x-4">
            <Skeleton width={80} height={36} />
            <Skeleton width={80} height={36} />
            <Skeleton variant="circular" width={36} height={36} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main field area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <Skeleton width={120} height={24} className="mb-4" />
              <Skeleton height={400} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Game info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <Skeleton width={100} height={20} className="mb-3" />
              <div className="space-y-2">
                <SkeletonText lines={2} />
                <div className="flex justify-between">
                  <Skeleton width={60} height={32} />
                  <Skeleton width={60} height={32} />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <Skeleton width={80} height={20} className="mb-3" />
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} height={40} />
                ))}
              </div>
            </div>

            {/* Player bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <Skeleton width={60} height={20} className="mb-3" />
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center p-2">
                    <Skeleton variant="circular" width={40} height={40} className="mb-1" />
                    <Skeleton width={30} height={12} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PlayerBarSkeleton: React.FC<{ count?: number }> = ({ count = 11 }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <Skeleton width={80} height={20} className="mb-3" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3 gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col items-center p-2 border rounded">
            <Skeleton variant="circular" width={40} height={40} className="mb-2" />
            <Skeleton width={40} height={12} className="mb-1" />
            <Skeleton width={20} height={10} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SoccerFieldSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={100} height={24} />
        <div className="flex space-x-2">
          <Skeleton width={80} height={32} />
          <Skeleton width={80} height={32} />
        </div>
      </div>
      
      <div className="relative bg-green-500 rounded-lg" style={{ aspectRatio: '16/10' }}>
        {/* Field skeleton */}
        <div className="absolute inset-4 border-2 border-white rounded">
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton variant="circular" width={80} height={80} className="bg-white bg-opacity-30" />
          </div>
          
          {/* Goal areas */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-12 h-24 border-2 border-white border-l-0"></div>
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-12 h-24 border-2 border-white border-r-0"></div>
          
          {/* Player positions */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <Skeleton
              key={i}
              variant="circular"
              width={32}
              height={32}
              className={`absolute bg-blue-400 bg-opacity-50`}
              style={{
                left: `${10 + (i * 7)}%`,
                top: `${20 + (i % 3) * 20}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};