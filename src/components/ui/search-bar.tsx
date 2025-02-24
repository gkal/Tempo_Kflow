import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

function SearchBar({
  placeholder = "Search...",
  value = "",
  onChange = () => {},
  className = "",
}: SearchBarProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
    </div>
  );
}

export { SearchBar };
