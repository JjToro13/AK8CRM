import { Filter, Search } from "lucide-react";
import {
  CALL_STATUS_FILTER_OPTIONS,
  type StatusFilter,
} from "../types/call-history.types";
import Input from "../../../shared/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/Select";

type CallHistoryFiltersProps = {
  disabled?: boolean;
  loading: boolean;
  searchQuery: string;
  statusFilter: StatusFilter;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
};

export default function CallHistoryFilters({
  disabled = false,
  loading,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
}: CallHistoryFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
        <Input
          type="text"
          placeholder="Buscar por cliente, serie o agente..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12"
          disabled={loading || disabled}
        />
      </div>

      <div className="sm:w-[260px]">
        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}
          disabled={loading || disabled}
        >
          <SelectTrigger leftIcon={<Filter className="h-4 w-4" />}>
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>

          <SelectContent>
            {CALL_STATUS_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
