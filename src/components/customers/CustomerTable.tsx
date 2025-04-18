import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VirtualDataTable } from '@/components/ui/virtual-table/VirtualDataTable';
import { OffersList } from './OffersList';
import { CustomerTableProps, Customer } from '@/types/CustomerTypes';
import { formatDate } from '@/utils/formatUtils';

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  expandedCustomerIds,
  customerOffers,
  loadingOffers,
  isAdminOrSuperUser,
  onToggleExpand,
  onViewOffer,
  onDeleteOffer
}) => {
  const columns = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }: { row: { original: Customer } }) => {
        const customerId = row.original.id;
        const isExpanded = expandedCustomerIds.includes(customerId);
        const hasOffers = (customerOffers[customerId]?.length || 0) > 0;

        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleExpand(customerId)}
            disabled={!hasOffers}
            className={!hasOffers ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        );
      }
    },
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name'
    },
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email'
    },
    {
      id: 'phone',
      header: 'Phone',
      accessorKey: 'phone'
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type'
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status'
    },
    {
      id: 'created_at',
      header: 'Created At',
      cell: ({ row }: { row: { original: Customer } }) => formatDate(row.original.created_at)
    }
  ];

  const renderExpandedContent = (row: Customer) => {
    const offers = customerOffers[row.id] || [];
    const isLoading = loadingOffers[row.id] || false;

    return (
      <div className="px-4 py-2 bg-muted/50">
        <OffersList
          offers={offers}
          isLoading={isLoading}
          onViewOffer={onViewOffer}
          onDeleteOffer={onDeleteOffer}
          isAdminOrSuperUser={isAdminOrSuperUser}
        />
      </div>
    );
  };

  // Convert expandedCustomerIds array to Record<string, boolean>
  const expandedRowIds = expandedCustomerIds.reduce((acc, id) => {
    acc[id] = true;
    return acc;
  }, {} as Record<string, boolean>);

  return (
    <div className="border rounded-md">
      <VirtualDataTable
        data={customers}
        columns={columns}
        expandedRowIds={expandedRowIds}
        renderExpandedContent={renderExpandedContent}
        containerClassName="border rounded-md"
      />
    </div>
  );
}; 
