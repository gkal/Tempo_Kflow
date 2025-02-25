import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  SearchSelect,
  SearchSelectContent,
  SearchSelectItem,
  SearchSelectTrigger,
  SearchSelectValue,
} from "@/components/ui/search-select";
import { getSearchBarStyle } from "@/lib/styles/search-bar";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  columns?: Array<{ header: string; accessor: string }>;
  selectedColumn?: string;
  onColumnChange?: (column: string) => void;
  defaultColumn?: string;
}

function SearchBar({
  placeholder = "Αναζήτηση",
  value = "",
  onChange = () => {},
  className = "",
  columns = [],
  selectedColumn,
  onColumnChange,
  defaultColumn,
}: SearchBarProps) {
  return (
    <div className={`flex justify-end ${className}`}>
      <div className={getSearchBarStyle("containerClasses")}>
        <Search className={getSearchBarStyle("iconClasses")} />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={getSearchBarStyle("inputClasses")}
        />
        {columns.length > 0 && (
          <div className="absolute right-0 top-0 h-full">
            <SearchSelect value={selectedColumn} onValueChange={onColumnChange}>
              <SearchSelectTrigger className="h-full border-0 bg-transparent text-[#84a98c] rounded-l-none w-[190px] focus:ring-0 hover:bg-transparent text-right">
                <SearchSelectValue
                  placeholder={
                    columns.find((c) => c.accessor === defaultColumn)?.header
                  }
                />
              </SearchSelectTrigger>
              <SearchSelectContent
                className="bg-[#2f3e46] border-[#52796f]"
                style={{
                  width: "max-content",
                  minWidth: `${Math.max(
                    ...columns.map((col) => col.header.length * 6 + 16),
                  )}px`,
                }}
                align="end"
                sideOffset={5}
              >
                {columns.map((column) => (
                  <SearchSelectItem
                    key={column.accessor}
                    value={column.accessor}
                    className="text-[#84a98c] focus:bg-[#354f52] focus:text-[#cad2c5] flex items-center justify-between [&>span:last-child]:hidden"
                  >
                    <span>{column.header}</span>
                  </SearchSelectItem>
                ))}
              </SearchSelectContent>
            </SearchSelect>
          </div>
        )}
      </div>
    </div>
  );
}

export { SearchBar };
