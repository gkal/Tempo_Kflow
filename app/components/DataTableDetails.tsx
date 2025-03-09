import React from 'react';
import { Trash2 } from 'lucide-react';

// Simple utility function to replace cn
const cn = (...classes: (string | boolean | undefined | null)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Simple implementation of flexRender
const flexRender = (component: any, props: any) => {
  if (typeof component === 'function') {
    return component(props);
  }
  return component;
};

// Simple TableRow component
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

// Simple TableCell component
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

interface DataTableDetailsProps {
  rows: any[];
  onRowClick?: (row: any) => void;
  forcePointerCursor?: boolean;
  onDelete?: (row: any) => void;
}

const DataTableDetails: React.FC<DataTableDetailsProps> = ({ rows, onRowClick, forcePointerCursor, onDelete }) => {
  // Add error handling for empty or undefined rows
  if (!rows || rows.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">No data available</div>;
  }

  return (
    <div className="flex flex-col space-y-4">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between border-b hover:bg-muted/50 group">
          <div 
            className={cn(
              "flex-grow flex",
              (onRowClick || forcePointerCursor) && "cursor-pointer"
            )}
            onClick={() => onRowClick && onRowClick(row.original)}
          >
            {row.getVisibleCells && row.getVisibleCells().map((cell) => (
              <div 
                key={cell.id}
                className="p-4"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ))}
          </div>
          
          {/* Delete button - always visible */}
          <div className="p-4 flex-shrink-0">
            <button
              onClick={(e) => {
                if (onDelete) {
                  e.stopPropagation();
                  onDelete(row.original);
                }
              }}
              className="text-destructive hover:text-destructive/80"
              disabled={!onDelete}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DataTableDetails; 