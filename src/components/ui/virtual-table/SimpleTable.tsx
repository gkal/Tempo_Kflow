import React, { useState } from 'react';
import { flexRender, getCoreRowModel, getSortedRowModel, ColumnDef, useReactTable, SortingState } from '@tanstack/react-table';
import { TableHead, TableRow, TableHeader, TableBody, TableCell, Table } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';

interface SimpleTableProps<TData extends object, TValue = any> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  renderExpanded?: (row: TData) => React.ReactNode;
  isRowExpanded?: (id: string) => boolean;
  onToggleExpand?: (id: string) => void;
  keyExtractor?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  loadingMessage?: string;
}

export function SimpleTable<TData extends object, TValue = any>({
  data,
  columns,
  renderExpanded,
  isRowExpanded,
  onToggleExpand,
  keyExtractor,
  onRowClick,
  isLoading = false,
  loadingMessage = 'Loading data...',
}: SimpleTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  
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
  });

  // Check for empty data
  const isDataEmpty = !data || data.length === 0;
  const rows = table.getRowModel().rows;
  
  // Early return for empty state with loading
  if (isDataEmpty && isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#84a98c] mr-2" />
        <p className="text-[#cad2c5]">{loadingMessage}</p>
      </div>
    );
  }
  
  // Early return for empty state
  if (isDataEmpty && !isLoading) {
    return (
      <div className="text-center p-8 text-[#84a98c]">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="relative border border-[#52796f]/20 rounded-md">
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
        
        <TableBody className="relative text-[#cad2c5]">
          {rows.map((row, i) => {
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
          })}
          
          {/* Loading indicator at the bottom */}
          {isLoading && (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-3 text-center">
                <div className="py-2 flex items-center justify-center text-[#84a98c]">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>{loadingMessage}</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default SimpleTable; 
