import React, { useMemo } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_RowData,
} from 'material-react-table';
import { Box, Typography } from '@mui/material';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { Loader } from "@/components/ui/Loader";

// Define props interface that matches your existing DataTable
export interface DataTableWrapperProps<T extends Record<string, any>> {
  columns: any[]; // Match your existing column format
  data: T[];
  isLoading?: boolean;
  defaultSortColumn?: string;
  searchTerm?: string;
  searchColumn?: string;
  onRowClick?: (row: T) => void;
  containerClassName?: string;
  rowClassName?: string;
  highlightedRowId?: string | number;
  renderRow?: (props: any) => React.ReactNode;
  showOfferMessage?: boolean;
  emptyStateMessage?: string;
  loadingStateMessage?: string;
}

export function DataTableWrapper<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  defaultSortColumn,
  searchTerm,
  searchColumn,
  onRowClick,
  containerClassName,
  rowClassName,
  highlightedRowId,
  renderRow,
  showOfferMessage = false,
  emptyStateMessage = 'No data found',
  loadingStateMessage = 'Loading data...',
}: DataTableWrapperProps<T>) {
  // Convert columns to Material React Table format
  const mrtColumns = useMemo<MRT_ColumnDef<T>[]>(() => {
    return columns.map((col) => ({
      accessorKey: col.accessor,
      header: col.header,
      Cell: col.cell 
        ? ({ row, cell }: { row: MRT_Row<T>; cell: any }) => col.cell(cell.getValue(), row.original) 
        : undefined,
      size: col.width,
    }));
  }, [columns]);

  // Configure the Material React Table
  const table = useMaterialReactTable({
    columns: mrtColumns,
    data,
    state: {
      isLoading,
      globalFilter: searchTerm,
      columnVisibility: {},
      showGlobalFilter: !!searchTerm,
    },
    initialState: {
      sorting: defaultSortColumn 
        ? [{ id: defaultSortColumn, desc: false }] 
        : [],
    },
    enableGlobalFilter: true,
    globalFilterFn: 'contains',
    getRowId: (row: T) => String(row.id || ''),
    muiTableContainerProps: {
      sx: {
        backgroundColor: '#354f52',
        border: '1px solid #52796f',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        ...containerClassName ? { className: containerClassName } : {},
      },
    },
    muiTableHeadProps: {
      sx: { 
        backgroundColor: '#2f3e46',
      },
    },
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => onRowClick?.(row.original),
      sx: {
        cursor: onRowClick ? 'pointer' : 'default',
        backgroundColor: row.id === highlightedRowId ? 'rgba(82, 121, 111, 0.4)' : 'inherit',
        '&:hover': {
          backgroundColor: 'rgba(53, 79, 82, 0.5)'
        },
        ...rowClassName ? { className: rowClassName } : {},
      },
    }),
    muiTableBodyCellProps: {
      sx: { 
        color: '#cad2c5',
        padding: '0.75rem'
      },
    },
    renderEmptyRowsFallback: () => (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          backgroundColor: '#2f3e46',
        }}
      >
        <Typography sx={{ color: '#cad2c5' }}>
          {emptyStateMessage}
        </Typography>
      </Box>
    ),
    renderRowActions: showOfferMessage 
      ? ({ row }) => {
          const offersCount = (row.original as any).offersCount;
          if (!offersCount) return null;
          
          return (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <span className="text-[#84a98c]">{offersCount}</span>
            </Box>
          );
        }
      : undefined,
    renderDetailPanel: renderRow 
      ? ({ row }) => renderRow({ 
          row: row.original, 
          index: row.index, 
          defaultRow: null 
        }) 
      : undefined,
    enableExpanding: !!renderRow,
  });

  // When loading, show a loading indicator
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          backgroundColor: '#2f3e46',
          border: '1px solid #52796f',
          borderRadius: '0.5rem',
        }}
      >
        <Loader size={24} />
        <Typography sx={{ color: '#cad2c5', ml: 2 }}>
          {loadingStateMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <MaterialReactTable table={table} />
  );
}

export default DataTableWrapper; 
