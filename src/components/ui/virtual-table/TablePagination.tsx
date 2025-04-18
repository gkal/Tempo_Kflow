import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TablePaginationProps {
  currentPage: number;
  pageCount: number;
  pageSize: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
}

export function TablePagination({
  currentPage,
  pageCount,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  isLoading = false
}: TablePaginationProps) {
  // Calculate the start and end items for display
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems || 0);
  const endItem = Math.min(startItem + pageSize - 1, totalItems || 0);
  
  // Handler for page size changes
  const handlePageSizeChange = (value: string) => {
    onPageSizeChange?.(Number(value));
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between px-2 py-4 gap-4">
      {/* Page size selector */}
      {onPageSizeChange && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-[#84a98c]">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={handlePageSizeChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[80px] bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
              <SelectValue placeholder={pageSize.toString()} />
            </SelectTrigger>
            <SelectContent className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Items information */}
      {totalItems !== undefined && (
        <div className="text-sm text-[#84a98c]">
          Showing {totalItems > 0 ? startItem : 0}-{endItem} of {totalItems} items
        </div>
      )}
      
      {/* Pagination controls */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1 || isLoading}
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-white"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-sm text-[#cad2c5] px-2">
          Page {currentPage} of {pageCount || 1}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= pageCount || isLoading}
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(pageCount)}
          disabled={currentPage >= pageCount || isLoading}
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-white"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default TablePagination; 
