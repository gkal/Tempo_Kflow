import React, { ReactNode, useState, useEffect } from "react";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVirtualTableData } from "@/hooks/useVirtualTableData";
import { VirtualTable } from "./VirtualTable";
import { DataFetchError } from "./DataFetchError";
import { TablePagination } from "./TablePagination";
import { NoDataDisplay } from "./NoDataDisplay";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";

// Add logging to debug data flow
function logDebug(message: string, data: any) {
  console.log(`[TableWrapper Debug] ${message}:`, data);
}

interface TableWrapperProps<TData extends object, TValue = any> {
  title?: string;
  description?: string;
  columns: ColumnDef<TData, TValue>[];
  fetchData: (options: any) => Promise<{ data: TData[], totalCount: number }>;
  initialPageSize?: number;
  className?: string;
  noDataMessage?: string;
  renderExpanded?: (row: TData) => ReactNode;
  extraControls?: ReactNode;
  loadingMessage?: string;
  errorMessage?: string;
  refreshInterval?: number;
  rowActions?: (row: TData) => ReactNode;
  showFooter?: boolean;
  footerContent?: ReactNode;
  enableVirtualization?: boolean;
  keyExtractor?: (row: TData) => string;
  initialFilters?: Record<string, any>;
  onRowClick?: (row: TData) => void;
}

export function TableWrapper<TData extends object, TValue = any>({
  title,
  description,
  columns,
  fetchData,
  initialPageSize = 50,
  className = "",
  noDataMessage = "No data available",
  renderExpanded,
  extraControls,
  loadingMessage = "Loading data...",
  errorMessage = "Failed to load data. Please try again.",
  refreshInterval,
  rowActions,
  showFooter = true,
  footerContent,
  enableVirtualization = true,
  keyExtractor,
  initialFilters = {},
  onRowClick
}: TableWrapperProps<TData, TValue>) {
  // Add state for expandedRows if needed
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [debugCounter, setDebugCounter] = useState(0);

  // Add state to track if the component is mounted (for debugging)
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    console.log("TableWrapper mounted:", { columns, initialFilters });
    return () => setIsMounted(false);
  }, [columns, initialFilters]);

  // Use the virtual table data hook to manage data and pagination
  const tableData = useVirtualTableData<TData>({
    fetchFn: fetchData,
    initialPageSize,
    refreshInterval,
    initialFilters,
  });

  const {
    data,
    isLoading,
    isError,
    error,
    totalCount,
    pageSize,
    pageIndex,
    setPageIndex,
    setPageSize,
    refresh,
    hasNextPage,
    loadMore,
    isLoadingMore,
    resetData,
    applyFilters,
    filters,
  } = tableData;

  // Force re-render periodically during loading for better debugging
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setInterval(() => {
        setDebugCounter(prev => prev + 1);
        console.log("Loading state tick:", { 
          data: data.length,
          isLoading,
          isError,
          totalCount
        });
      }, 500);
    }
    return () => clearInterval(timer);
  }, [isLoading, data.length, isError, totalCount]);

  // More detailed logging for data flow
  useEffect(() => {
    logDebug("Data state changed", {
      dataLength: data.length,
      isLoading,
      isError,
      totalCount,
      pageSize,
      pageIndex,
    });
    
    if (data.length > 0) {
      logDebug("First item", data[0]);
    }
  }, [data, isLoading, isError, totalCount, pageSize, pageIndex]);

  // Handle row expansion
  const handleToggleExpand = (id: string) => {
    setExpandedRows(prevExpandedRows => {
      const newExpandedRows = new Set(prevExpandedRows);
      if (newExpandedRows.has(id)) {
        newExpandedRows.delete(id);
      } else {
        newExpandedRows.add(id);
      }
      return newExpandedRows;
    });
  };

  // Check if a row is expanded
  const isRowExpanded = (id: string) => expandedRows.has(id);

  // Log the state for debugging
  useEffect(() => {
    console.log("TableWrapper state:", { 
      data: data.length, 
      isLoading, 
      isError, 
      totalCount,
      mounted: isMounted,
      debugCounter
    });
  }, [data, isLoading, isError, totalCount, isMounted, debugCounter]);

  // Temp debugging - just show raw data without UI wrapping
  if (process.env.NODE_ENV !== 'production' && data.length > 0 && isLoading === false) {
    console.log("Data is loaded and ready for display:", { 
      length: data.length, 
      sample: data[0] 
    });
  }

  return (
    <Card className={`border-[#52796f] bg-[#2f3e46] text-[#cad2c5] shadow-md ${className}`}>
      {(title || description || extraControls) && (
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              {title && <CardTitle className="text-[#cad2c5] text-xl">{title}</CardTitle>}
              {description && <CardDescription className="text-[#84a98c]">{description}</CardDescription>}
            </div>
            {extraControls && (
              <div className="flex space-x-2">
                {extraControls}
              </div>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className={`p-0 ${title || description ? 'pt-2' : ''}`}>
        {/* Debug info for dev mode */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="bg-yellow-300 text-black p-2 text-xs flex justify-between items-center">
            <div>
              Data: {data.length} rows | Loading: {isLoading ? 'Yes' : 'No'} | 
              Error: {isError ? 'Yes' : 'No'} | Total: {totalCount}
            </div>
            <button 
              onClick={refresh} 
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
            >
              Force Refresh
            </button>
          </div>
        )}

        {isLoading && data.length === 0 ? (
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#84a98c] mr-2" />
              <p className="text-[#cad2c5]">{loadingMessage}</p>
            </div>
            <Skeleton className="h-4 w-full bg-[#354f52]" />
            <Skeleton className="h-4 w-3/4 bg-[#354f52]" />
            <Skeleton className="h-4 w-5/6 bg-[#354f52]" />
            <Skeleton className="h-4 w-2/3 bg-[#354f52]" />
          </div>
        ) : isError ? (
          <DataFetchError 
            message={errorMessage}
            onRetry={refresh}
          />
        ) : data.length === 0 ? (
          <NoDataDisplay message={noDataMessage} />
        ) : (
          <div className="relative">
            {/* Debug information for development */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="absolute top-0 right-0 bg-yellow-400 text-black text-xs p-1 z-50">
                Rows: {data.length} | Total: {totalCount} | Page: {pageIndex+1}
              </div>
            )}
            
            <VirtualTable
              data={data}
              columns={columns}
              renderExpanded={renderExpanded}
              isRowExpanded={isRowExpanded}
              onToggleExpand={handleToggleExpand}
              onRowClick={onRowClick}
              isLoading={isLoading || isLoadingMore}
              hasNextPage={hasNextPage}
              loadMore={loadMore}
              enableVirtualization={enableVirtualization}
              keyExtractor={keyExtractor}
              rowActions={rowActions}
              loadingMessage={loadingMessage}
            />
          </div>
        )}
      </CardContent>
      
      {showFooter && (
        <CardFooter className="flex justify-between items-center p-4 border-t border-[#52796f]/30 bg-[#2f3e46]/90">
          {footerContent || (
            <>
              <div className="text-sm text-[#84a98c]">
                {totalCount > 0 ? `Showing ${data.length} of ${totalCount} results` : "No results found"}
              </div>
              <TablePagination
                currentPage={pageIndex + 1}
                pageCount={Math.ceil(totalCount / pageSize)}
                pageSize={pageSize}
                totalItems={totalCount}
                onPageChange={(page) => setPageIndex(page - 1)}
                onPageSizeChange={setPageSize}
                isLoading={isLoading}
              />
            </>
          )}
        </CardFooter>
      )}
    </Card>
  );
} 