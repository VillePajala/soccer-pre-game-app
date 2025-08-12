/**
 * PHASE 2: Progressive Rendering with Skeleton States
 * Reusable skeleton loading components for better perceived performance
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width = 'w-full', 
  height = 'h-4',
  rounded = true 
}) => {
  const roundedClass = rounded ? 'rounded' : '';
  return (
    <div 
      className={`animate-pulse bg-slate-600/30 ${width} ${height} ${roundedClass} ${className}`}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className = '' 
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i}
        width={i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}
        height="h-3"
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 border border-slate-700 rounded-lg bg-slate-800/50 ${className}`}>
    <div className="flex items-center space-x-3 mb-3">
      <Skeleton width="w-10" height="h-10" rounded={true} />
      <div className="flex-1">
        <Skeleton width="w-1/2" height="h-4" className="mb-2" />
        <Skeleton width="w-1/3" height="h-3" />
      </div>
    </div>
    <SkeletonText lines={2} />
  </div>
);

export const GameLoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {/* Game info skeleton */}
    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
      <div className="flex justify-between items-center mb-3">
        <Skeleton width="w-32" height="h-5" />
        <Skeleton width="w-16" height="h-4" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Skeleton width="w-20" height="h-3" className="mb-2" />
          <Skeleton width="w-full" height="h-6" />
        </div>
        <div>
          <Skeleton width="w-20" height="h-3" className="mb-2" />
          <Skeleton width="w-full" height="h-6" />
        </div>
      </div>
    </div>
    
    {/* Field skeleton */}
    <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
      <Skeleton width="w-full" height="h-64" className="bg-green-800/20" />
      <div className="mt-3 flex justify-between">
        <Skeleton width="w-24" height="h-4" />
        <Skeleton width="w-24" height="h-4" />
      </div>
    </div>
    
    {/* Player bar skeleton */}
    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
      <Skeleton width="w-20" height="h-4" className="mb-3" />
      <div className="flex space-x-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="w-12" height="h-12" rounded={true} />
        ))}
        <Skeleton width="w-8" height="h-12" />
      </div>
    </div>
  </div>
);

export const ModalLoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {/* Header skeleton */}
    <div className="flex justify-between items-center pb-4 border-b border-slate-600">
      <Skeleton width="w-48" height="h-6" />
      <Skeleton width="w-6" height="h-6" rounded={true} />
    </div>
    
    {/* Content skeleton */}
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
    
    {/* Footer skeleton */}
    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-600">
      <Skeleton width="w-20" height="h-9" />
      <Skeleton width="w-24" height="h-9" />
    </div>
  </div>
);