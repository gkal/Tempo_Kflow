import React, { useCallback, useEffect, useRef, useState } from 'react';
import { flexRender, getCoreRowModel, getSortedRowModel, ColumnDef, useReactTable, SortingState, Row } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TableHead, TableRow, TableHeader, TableBody, TableCell, Table } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';

interface VirtualTableProps<TData extends object, TValue = any> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  renderExpanded?: (row: TData) => React.ReactNode;
  isRowExpanded?: (id: string) => boolean;
  onToggleExpand?: (id: string) => void;
  keyExtractor?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  hasNextPage?: boolean;
  loadMore?: () => void;
  rowActions?: (row: TData) => React.ReactNode;
  loadingMessage?: string;
  enableVirtualization?: boolean;
}

export function VirtualTable<TData extends object, TValue = any>({
  data,
  columns,
  renderExpanded,
  isRowExpanded,
  onToggleExpand,
  keyExtractor,
  onRowClick,
  isLoading = false,
  hasNextPage = false,
  loadMore,
  rowActions,
  loadingMessage = 'Loading more data...',
  enableVirtualization = true,
}: VirtualTableProps<TData, TValue>) {
  // All state hooks must be defined at the top and in the same order every render
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Setup our table
  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  });

  // Check for empty data
  const isDataEmpty = !data || data.length === 0;
  const rows = table.getRowModel().rows;
  
  // Load more data when scrolling near the end
  const loadMoreRows = useCallback(() => {
    if (!isLoading && hasNextPage && loadMore) {
      console.log("[VirtualTable] Loading more rows");
      loadMore();
    }
  }, [isLoading, hasNextPage, loadMore]);

  // Calculate row heights to handle expanded rows
  const getRowHeight = useCallback((index: number): number => {
    // Skip for non-virtualized tables
    if (!rows || !rows[index]) return 60;
    
    // If using keyExtractor for expanded state management
    if (keyExtractor && isRowExpanded && renderExpanded) {
      const rowId = keyExtractor(rows[index].original);
      if (isRowExpanded(rowId)) {
        // Expanded rows get more height
        return 200;
      }
    }
    
    return 60; // Default row height
  }, [rows, keyExtractor, isRowExpanded, renderExpanded]);
  
  // Create the virtualizer
  const rowVirtualizer = enableVirtualization && tableContainerRef.current && rows && rows.length > 0
    ? useVirtualizer({
        count: hasNextPage ? rows.length + 1 : rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 60,
        overscan: 10,
        onChange: (instance) => {
          const lastVisibleRowIndex = instance.range.endIndex - 1;
          if (
            hasNextPage &&
            !isLoading &&
            lastVisibleRowIndex >= rows.length - 5
          ) {
            loadMoreRows();
          }
        }
      })
    : null;

  // Effect logging for debugging
  useEffect(() => {
    console.log(`[VirtualTable] Data updated: ${data?.length || 0} rows`, { 
      firstRow: data?.length > 0 ? keyExtractor ? keyExtractor(data[0]) : 'no keyExtractor' : 'empty',
      columns: columns.map(col => col.id || 'unnamed column')
    });
  }, [data, keyExtractor, columns]);

  // Debug output if data is available but rows are empty
  useEffect(() => {
    if (data?.length > 0 && (!rows || rows.length === 0)) {
      console.warn("[VirtualTable] Data is available but no rows are rendered", {
        dataLength: data.length,
        rowsLength: rows?.length || 0
      });
    }
  }, [data, rows]);

  // Debug output for empty data but having columns
  useEffect(() => {
    if (isDataEmpty && columns.length > 0) {
      console.warn('[VirtualTable] Data is empty but columns are defined', {
        columns: columns.map(col => col.id || 'unnamed column'),
        isLoading
      });
    }
  }, [isDataEmpty, columns, isLoading]);

  // For debugging purposes
  console.log("[VirtualTable] Rendering with", {
    dataLength: data?.length || 0,
    rowsLength: rows?.length || 0,
    isLoading,
    hasNextPage
  });

  // Early return for empty state
  if (isDataEmpty && !isLoading) {
    return (
      <div className="text-center p-8 text-[#84a98c]">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div
      ref={tableContainerRef}
      className="relative overflow-auto max-h-[80vh] border border-[#52796f]/20 rounded-md"
      style={{ contain: 'strict' }}
    >
      <Table className="w-full border-collapse">
        <TableHeader className="bg-[#354f52] sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow 
              key={headerGroup.id}
              className="border-b border-[#52796f]/30"
            >
              {headerGroup.headers.map((header) => {
                const isSortable = header.column.getCanSort();
                
                return (
                  <TableHead 
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ 
                      width: header.getSize() !== 150 ? header.getSize() : undefined, 
                      minWidth: header.getSize() !== 150 ? header.getSize() : undefined 
                    }}
                    className={cn(
                      "text-[#84a98c] text-xs font-medium p-3",
                      isSortable && "cursor-pointer select-none"
                    )}
                    onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div className="flex items-center justify-between">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {isSortable && (
                        <div className="ml-1 flex items-center">
                          {header.column.getIsSorted() === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-[#cad2c5]" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDown className="h-3 w-3 text-[#cad2c5]" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-[#84a98c]/50" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        
        {/* Debug information */}
        {isDataEmpty && (
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length} className="p-3 text-center bg-yellow-200 text-black">
                <div className="text-xs">Debug: No data available to render (length: {data?.length || 0})</div>
              </TableCell>
            </TableRow>
          </TableBody>
        )}
        
        <TableBody className="relative text-[#cad2c5]">
          {(!isDataEmpty && rows && rows.length > 0) ? (
            enableVirtualization && rowVirtualizer ? (
              // Virtualized rows
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <div
                    className="relative w-full"
                    style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                  >
                    {rowVirtualizer.getVirtualItems().map(virtualRow => {
                      // Check if we're rendering the loading row
                      if (virtualRow.index >= rows.length) {
                        return (
                          <div
                            key="loading-row"
                            className="absolute top-0 left-0 w-full flex items-center justify-center py-4"
                            style={{
                              height: virtualRow.size,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#84a98c]" />
                            <span className="text-[#84a98c]">{loadingMessage}</span>
                          </div>
                        );
                      }
                      
                      // Get the actual row
                      const row = rows[virtualRow.index] as Row<TData>;
                      if (!row) return null;
                      
                      const rowId = keyExtractor 
                        ? keyExtractor(row.original) 
                        : `row-${virtualRow.index}`;
                        
                      const isExpanded = isRowExpanded ? isRowExpanded(rowId) : false;
                      
                      return (
                        <div
                          key={row.id}
                          className="absolute top-0 left-0 w-full"
                          style={{
                            height: virtualRow.size,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          {/* Main Row */}
                          <div 
                            className={`flex w-full border-b border-[#52796f]/20 h-12 ${
                              onRowClick ? 'cursor-pointer hover:bg-[#354f52]' : ''
                            } ${isExpanded ? 'bg-[#354f52]/40' : ''}`}
                            onClick={() => onRowClick && onRowClick(row.original)}
                          >
                            {row.getVisibleCells().map(cell => (
                              <div
                                key={cell.id}
                                className="flex-1 p-3 flex items-center"
                                style={{ 
                                  flexBasis: cell.column.getSize(),
                                  maxWidth: cell.column.getSize() !== 0 ? cell.column.getSize() : undefined
                                }}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {/* Expanded Content */}
                          {isExpanded && renderExpanded && (
                            <div className="w-full bg-[#2f3e46] p-4 border-b border-[#52796f]/20">
                              {renderExpanded(row.original)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ) : (
              // Non-virtualized rows for better accessibility when virtualization is disabled
              rows.map((row, i) => {
                const rowId = keyExtractor 
                  ? keyExtractor(row.original) 
                  : `row-${i}`;
                  
                const isExpanded = isRowExpanded && isRowExpanded(rowId);
                
                return (
                  <React.Fragment key={row.id}>
                    <TableRow 
                      className={`border-b border-[#52796f]/20 h-12 ${
                        onRowClick ? 'cursor-pointer hover:bg-[#354f52]' : ''
                      } ${isExpanded ? 'bg-[#354f52]/40' : ''}`}
                      onClick={() => onRowClick && onRowClick(row.original)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          className="p-3"
                          style={{ 
                            width: cell.column.getSize() !== 0 ? cell.column.getSize() : 'auto'
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    {/* Expanded content row */}
                    {isExpanded && renderExpanded && (
                      <TableRow className="bg-[#2f3e46]">
                        <TableCell
                          colSpan={columns.length}
                          className="p-4 border-b border-[#52796f]/20"
                        >
                          {renderExpanded(row.original)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )
          ) : (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="text-center p-8 text-[#84a98c]"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>{loadingMessage}</span>
                  </div>
                ) : (
                  <p>No data available</p>
                )}
              </TableCell>
            </TableRow>
          )}
          
          {/* Loading more indicator */}
          {hasNextPage && !rowVirtualizer && (
            <TableRow id="load-more-trigger">
              <TableCell colSpan={columns.length} className="p-3 text-center">
                {isLoading && (
                  <div className="py-2 flex items-center justify-center text-[#84a98c]">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>{loadingMessage}</span>
                  </div>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {/* Set the proper height for the table to account for virtualization */}
      {rowVirtualizer && (
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        ></div>
      )}
    </div>
  );
}

export default VirtualTable; 