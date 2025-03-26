import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

// Interface for fetch function
export interface TableDataOptions<TData> {
  fetchFn: (options: FetchOptions) => Promise<{ data: TData[]; totalCount: number }>;
  initialPageSize?: number;
  initialFilters?: Record<string, any>;
  refreshInterval?: number;
  onError?: (error: unknown) => void;
  enableAutoRefresh?: boolean;
}

// Interface for fetch function parameters
export interface FetchOptions {
  pageIndex: number;
  pageSize: number;
  filters: Record<string, any>;
}

// Interface for the state
export interface TableDataState<TData> {
  data: TData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  error: Error | null;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  filters: Record<string, any>;
  hasNextPage: boolean;
  setPageIndex: (index: number) => void;
  setPageSize: (size: number) => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  resetData: () => void;
  applyFilters: (newFilters: Record<string, any>) => void;
}

/**
 * Custom hook to manage virtual table data with pagination and filtering
 */
export function useVirtualTableData<TData>({
  fetchFn,
  initialPageSize = 50,
  initialFilters = {},
  refreshInterval,
  onError,
  enableAutoRefresh = false,
}: TableDataOptions<TData>): TableDataState<TData> {
  // State
  const [data, setData] = useState<TData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState(initialFilters);

  // Debounce filter changes
  const debouncedFilters = useDebounce(filters, 300);

  // Refs for tracking state during async operations
  const mounted = useRef(true);
  const lastFetchId = useRef(0);
  const hasMoreDataRef = useRef(true);

  // Debug logging
  const logDebug = useCallback((message: string, data: any = {}) => {
    console.log(`[useVirtualTableData] ${message}`, data);
  }, []);

  // Function to fetch data
  const fetchData = useCallback(async (options: {
    reset?: boolean,
    loadMore?: boolean,
    newFilters?: Record<string, any>
  } = {}) => {
    const { reset = false, loadMore = false, newFilters } = options;
    
    // If loading more, and no more data, exit early
    if (loadMore && !hasMoreDataRef.current) {
      logDebug('No more data to load');
      return;
    }
    
    // Set the appropriate loading state
    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    
    // Clear error states
    setIsError(false);
    setError(null);
    
    // Generate an ID for this fetch request to handle race conditions
    const fetchId = ++lastFetchId.current;
    
    // Determine the filters to use
    const filtersToUse = newFilters || debouncedFilters;
    
    // If we're resetting, we want to start from the beginning
    const indexToUse = reset ? 0 : pageIndex;
    
    try {
      logDebug('Fetching data', { 
        pageIndex: indexToUse, 
        pageSize, 
        filters: filtersToUse,
        reset,
        loadMore
      });
      
      // Call the fetch function
      const result = await fetchFn({
        pageIndex: indexToUse,
        pageSize,
        filters: filtersToUse,
      });
      
      // Check if this fetch request is the most recent one
      if (fetchId !== lastFetchId.current || !mounted.current) {
        logDebug('Ignoring stale fetch result', { fetchId, lastFetchId: lastFetchId.current });
        return;
      }
      
      // Debug result
      logDebug('Fetch result', { 
        dataLength: result.data?.length || 0, 
        totalCount: result.totalCount 
      });
      
      // Update state with the results
      if (result.data && Array.isArray(result.data)) {
        if (reset || !loadMore) {
          setData(result.data);
          
          // If we reset, we should also reset the page index
          if (reset) {
            setPageIndex(0);
          }
        } else {
          setData(prevData => [...prevData, ...result.data]);
        }
        
        // Update total count
        setTotalCount(result.totalCount);
        
        // Check if there is more data to load
        const hasMoreData = (indexToUse + 1) * pageSize < result.totalCount;
        hasMoreDataRef.current = hasMoreData;
        
        logDebug('Data state updated', { 
          dataLength: loadMore ? [...data, ...result.data].length : result.data.length,
          hasMoreData,
          totalCount: result.totalCount
        });
      } else {
        console.error('Invalid data format returned from fetchFn. Expected an array.', result);
        logDebug('Invalid data returned', result);
        
        setIsError(true);
        setError(new Error('Invalid data format returned from the server'));
        
        if (onError) {
          onError(new Error('Invalid data format returned from the server'));
        }
      }
    } catch (err) {
      // Skip if not the most recent fetch
      if (fetchId !== lastFetchId.current || !mounted.current) return;
      
      console.error('Error fetching data:', err);
      logDebug('Error fetching data', err);
      
      setIsError(true);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // Empty data on error if not loading more
      if (!loadMore) {
        setData([]);
        setTotalCount(0);
      }
      
      // Notify parent of error
      if (onError) {
        onError(err);
      } else {
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      // Skip if not the most recent fetch
      if (fetchId !== lastFetchId.current || !mounted.current) return;
      
      if (loadMore) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [fetchFn, pageIndex, pageSize, debouncedFilters, data, onError, logDebug]);

  // Reset data and fetch again
  const resetData = useCallback(() => {
    logDebug('Resetting data');
    fetchData({ reset: true });
  }, [fetchData, logDebug]);

  // Apply new filters and fetch data
  const applyFilters = useCallback((newFilters: Record<string, any>) => {
    logDebug('Applying new filters', newFilters);
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
  }, [logDebug]);

  // Handle page index changes
  const handleSetPageIndex = useCallback((index: number) => {
    logDebug('Setting page index', { index });
    
    if (index < 0) {
      index = 0;
    }
    
    const maxPageIndex = Math.max(0, Math.ceil(totalCount / pageSize) - 1);
    if (index > maxPageIndex) {
      index = maxPageIndex;
    }
    
    setPageIndex(index);
  }, [totalCount, pageSize, logDebug]);

  // Handle page size changes
  const handleSetPageSize = useCallback((size: number) => {
    logDebug('Setting page size', { size });
    
    // When changing page size, keep current position in dataset
    const firstItemIndex = pageIndex * pageSize;
    const newPageIndex = Math.floor(firstItemIndex / size);
    
    setPageSize(size);
    setPageIndex(newPageIndex);
  }, [pageIndex, pageSize, logDebug]);

  // Load more data
  const loadMore = useCallback(async () => {
    // Don't load more if already loading or if no more data
    if (isLoadingMore || !hasMoreDataRef.current) {
      return;
    }
    
    logDebug('Loading more data', { current: data.length, total: totalCount });
    
    // Calculate next page index
    const nextPageIndex = pageIndex + 1;
    setPageIndex(nextPageIndex);
    
    // Fetch more data
    await fetchData({ loadMore: true });
  }, [isLoadingMore, data.length, totalCount, pageIndex, fetchData, logDebug]);

  // Refresh the data
  const refresh = useCallback(async () => {
    logDebug('Refreshing data');
    await fetchData();
  }, [fetchData, logDebug]);

  // Fetch data on initial mount and when dependencies change
  useEffect(() => {
    logDebug('Effect triggered, fetching data', { pageIndex, pageSize, filters: debouncedFilters });
    fetchData();
  }, [pageIndex, pageSize, debouncedFilters, fetchData, logDebug]);

  // Set up interval for auto-refresh
  useEffect(() => {
    if (!refreshInterval || !enableAutoRefresh) return;
    
    const intervalId = setInterval(() => {
      if (mounted.current && !isLoading && !isLoadingMore) {
        fetchData();
      }
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData, enableAutoRefresh, isLoading, isLoadingMore, logDebug]);

  // Clean up on unmount
  useEffect(() => {
    mounted.current = true;
    
    return () => {
      mounted.current = false;
    };
  }, []);

  // Check if there might be more data to load
  const hasNextPage = (pageIndex + 1) * pageSize < totalCount;

  return {
    data,
    isLoading,
    isLoadingMore,
    isError,
    error,
    pageIndex,
    pageSize,
    totalCount,
    filters,
    hasNextPage,
    setPageIndex: handleSetPageIndex,
    setPageSize: handleSetPageSize,
    refresh,
    loadMore,
    resetData,
    applyFilters,
  };
}

export default useVirtualTableData; 