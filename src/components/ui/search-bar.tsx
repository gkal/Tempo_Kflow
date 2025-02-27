import { Search } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Column {
  header: string;
  accessor: string;
}

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onColumnChange?: (column: string) => void;
  className?: string;
  columns?: Column[];
  selectedColumn?: string;
}

export function SearchBar({
  placeholder = "Αναζήτηση....",
  value = "",
  onChange = () => {},
  onColumnChange = () => {},
  className = "",
  columns = [],
  selectedColumn = "name",
  ...props
}: SearchBarProps) {
  const selectedColumnText =
    columns.find((col) => col.accessor === selectedColumn)?.header ||
    "Όλα τα πεδία";

  return (
    <div className="w-96">
      <div
        className={cn(
          "flex items-center h-10 rounded-md border border-[#52796f] bg-[#354f52] overflow-hidden shadow-md shadow-green-500/20",
          className,
        )}
      >
        <div className="flex-none pl-4">
          <Search className="h-4 w-4 text-[#84a98c]" />
        </div>

        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border-0 bg-transparent h-full focus-visible:ring-0 focus-visible:ring-offset-0 text-[#cad2c5] placeholder:text-[#84a98c]"
          {...props}
        />

        {columns.length > 0 && (
          <div className="relative">
            <Select
              value={selectedColumn}
              onValueChange={onColumnChange}
              defaultValue={selectedColumn}
            >
              <SelectTrigger className="border-0 bg-transparent h-full focus:ring-0 focus:ring-offset-0 text-[#84a98c] p-0 min-w-[120px] text-right">
                <SelectValue className="text-right">
                  {selectedColumnText}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] z-50"
                align="end"
                sideOffset={10}
                avoidCollisions={true}
              >
                {columns.map((column) => (
                  <SelectItem
                    key={column.accessor}
                    value={column.accessor}
                    className="text-[#cad2c5] focus:bg-[#354f52] focus:text-[#cad2c5] text-right"
                  >
                    {column.header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
