import React from 'react';
import { Column } from "@/components/ui/virtual-table/VirtualDataTable";
import { Customer } from '@/types/customer.types';
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import { CustomerContextMenu } from '../CustomerContextMenu';
import { formatDateTime } from '@/utils/customer.utils';

interface CustomerColumnsProps {
  expandedCustomerIds: Record<string, boolean>;
  handleExpandCustomer: (customerId: string) => void;
  handleCreateOffer: (customerId: string, source?: string) => void;
  handleDeleteCustomer: (customer: Customer) => void;
  isAdminOrSuperUser: boolean;
}

export const useCustomerColumns = ({
  expandedCustomerIds,
  handleExpandCustomer,
  handleCreateOffer,
  handleDeleteCustomer,
  isAdminOrSuperUser
}: CustomerColumnsProps): Column<Customer>[] => {
  return [
    {
      accessorKey: 'company_name',
      header: 'Επωνυμία',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => {
        const customer = row;
        const offersCount = customer.offers_count || 0;
        const isExpanded = expandedCustomerIds[customer.id] || false;
        
        return (
          <CustomerContextMenu customerId={customer.id} onCreateOffer={handleCreateOffer}>
            <div className="flex items-center gap-1 justify-start">
              <div className="flex items-center min-w-[40px] pl-2">
                {offersCount > 0 ? (
                  <div 
                    className={`flex items-center justify-center relative group cursor-pointer hover:bg-[#52796f]/60 rounded-full w-10 h-8 transition-colors duration-200 ${isExpanded ? 'bg-[#52796f]/30' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleExpandCustomer(customer.id);
                    }}
                  >
                    <span className="absolute inset-0 rounded-full bg-[#52796f]/0 group-hover:bg-[#52796f]/30 transition-colors duration-200"></span>
                    <div className="flex items-center justify-center">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-[#84a98c] relative z-10" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-[#84a98c] relative z-10" />
                      )}
                      <span className="ml-1 text-sm text-[#84a98c] group-hover:text-white relative z-10 font-medium">{offersCount}</span>
                    </div>
                  </div>
                ) : (
                  <span className="invisible">0</span>
                )}
              </div>
              <span className="text-[#cad2c5]">{customer.company_name}</span>
            </div>
          </CustomerContextMenu>
        );
      },
      meta: {
        className: 'text-left',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'customer_type',
      header: 'Τύπος',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => row.customer_type || "—",
      meta: {
        className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'telephone',
      header: 'Τηλέφωνο',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => row.telephone || "—",
      meta: {
        className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => row.email || "—",
      meta: {
        className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'address',
      header: 'Διεύθυνση',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => {
        return row.address || "—";
      },
      meta: {
        className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Ημερομηνία Δημιουργίας',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => formatDateTime(row.created_at),
      meta: {
        className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'status',
      header: 'Ενεργείες',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => {
        const status = row.status;
        return (
          <div className="flex justify-end items-center gap-2">
            {status === 'active' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-400">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-red-500">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            )}
            
            {isAdminOrSuperUser && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-[#354f52] text-red-500 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCustomer(row);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
      meta: {
        className: 'text-right',
        headerClassName: 'relative flex justify-center'
      },
    },
  ];
}; 