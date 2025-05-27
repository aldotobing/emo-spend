import { Skeleton } from "./ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      
      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      
      {/* Chart Skeleton */}
      <div className="p-4 border rounded-lg">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="h-64 flex items-end space-x-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <Skeleton className="w-full" style={{ 
                height: `${Math.floor(Math.random() * 60) + 20}%` 
              }} />
              <Skeleton className="h-4 w-8 mt-2" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Recent Transactions Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48 mb-2" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Loading component for pages
export function PageLoading() {
  return (
    <div className="container mx-auto p-4">
      <LoadingSkeleton />
    </div>
  );
}
