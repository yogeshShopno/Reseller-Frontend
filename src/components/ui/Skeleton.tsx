'use client';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export default function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animation = 'pulse',
}: SkeletonProps) {
    const baseClasses = 'bg-gray-200';

    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    const animationClasses = {
        pulse: 'animate-pulse',
        wave: 'animate-shimmer',
        none: '',
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
            }}
        />
    );
}

// Table skeleton for list views
export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-4 rounded-xl">
      
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-5 flex-1" />
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex gap-4">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className="h-8 flex-1"
              />
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4">
        
        {/* Left: Row selection info */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-35" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-5 w-56" />
        </div>

        {/* Right: Pagination */}
        <div className="flex items-center gap-2">
          {/* Prev button */}
          <Skeleton className="h-8 w-8 rounded-md" />

          {/* Page dots */}
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={`page-${i}`}
              className="h-8 w-8 rounded-md"
            />
          ))}

          {/* Next button */}
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Card skeleton for kanban views
export function CardSkeleton() {
    return (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
            </div>
        </div>
    );
}

// Kanban column skeleton
export function KanbanColumnSkeleton() {
    return (
        <div className="bg-gray-50 rounded-md p-4 min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-8 rounded-full" />
            </div>
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

// Full page skeleton for leads/tasks
export function PageSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div className="rounded-3xl bg-white">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-7 w-60" />
                    <div className="ml-auto flex gap-3">
                        <Skeleton className="h-10 w-84 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Content skeleton - will adapt based on view mode */}
            <div className="rounded-md bg-white">
                <TableSkeleton rows={8} cols={5} />
            </div>
        </div>
    );
}