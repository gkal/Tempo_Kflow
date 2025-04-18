import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { CustomerFiltersProps } from '@/types/CustomerTypes';

const searchColumns = [
  { value: 'all', label: 'All Fields' },
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' }
];

export const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  activeFilter,
  searchTerm,
  searchColumn,
  selectedCustomerTypes,
  customerTypes,
  onFilterChange,
  onSearchChange,
  onCustomerTypesChange
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value, searchColumn);
  };

  const handleSearchColumnChange = (value: string) => {
    onSearchChange(searchTerm, value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        {/* Status Filter */}
        <div className="flex-1 min-w-[200px]">
          <Select value={activeFilter} onValueChange={onFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="flex-[2] flex gap-2">
          <div className="w-[150px]">
            <Select value={searchColumn} onValueChange={handleSearchColumnChange}>
              <SelectTrigger>
                <SelectValue placeholder="Search in..." />
              </SelectTrigger>
              <SelectContent>
                {searchColumns.map(column => (
                  <SelectItem key={column.value} value={column.value}>
                    {column.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>
        </div>

        {/* Customer Types */}
        <div className="flex-1 min-w-[250px]">
          <MultiSelect
            value={selectedCustomerTypes}
            onChange={onCustomerTypesChange}
            options={customerTypes.map(type => ({
              label: type,
              value: type
            }))}
            placeholder="Select customer types"
          />
        </div>

        {/* Clear Filters */}
        <Button
          variant="outline"
          onClick={() => {
            onFilterChange('all');
            onSearchChange('', 'all');
            onCustomerTypesChange([]);
          }}
          className="whitespace-nowrap"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
}; 
