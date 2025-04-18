import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Eye, EyeOff, ChevronRight, ChevronDown } from "lucide-react";
import { VirtualDataTable, Column } from "@/components/ui/virtual-table/VirtualDataTable";
import { TooltipProvider } from "@/components/ui/GlobalTooltip";
import { Customer } from './types/interfaces';
import { CustomerContextMenu } from "./CustomerContextMenu";
import { CustomerDialog } from './CustomerDialog';
import { CustomerDataProvider } from './CustomerDataProvider';
import { CustomerActionsHandler } from './CustomerActionsHandler';
import { CustomerExpandedContent } from './CustomerExpandedContent';
import { openNewOfferDialog } from '@/components/offers/main_offers_form/OfferDialogManager';
import { formatDateTime } from './utils/formatters';

/**************************************************************************
 * ⚠️ CRITICAL WARNING - REAL-TIME SUBSCRIPTION FUNCTIONALITY ⚠️
 * FINALIZED & VERIFIED - DO NOT MODIFY - TOOK 10+ HOURS TO IMPLEMENT
 * Last updated: March 29, 2025
 * 
 * This component implements a fully real-time driven architecture where:
 * 1. All UI state updates are triggered by Supabase real-time events
 * 2. Local operations (create/update/delete) only send requests to the server
 *    but do NOT directly update UI state
 * 3. UI updates happen ONLY when real-time events are received from the server
 *
 * This ensures perfect consistency across all connected clients and
 * eliminates race conditions and state management complexity.
 * 
 * ⚠️ WARNING: DO NOT MODIFY the real-time subscription handlers or event
 * processing logic without thorough testing across multiple browsers!
 * 
 * This feature ensures that changes (create/update/delete) automatically 
 * propagate to all connected users without requiring page refresh.
 * Only the affected rows are updated in the UI.
 **************************************************************************/

// Main component
const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Dialog state
  const [showDeleteOfferDialog, setShowDeleteOfferDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [customerIdForDelete, setCustomerIdForDelete] = useState<string | null>(null);
  const [showDeleteCustomerDialog, setShowDeleteCustomerDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  
  // Handle customer click to navigate to detail page
  const handleCustomerClick = useCallback((customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  }, [navigate]);
  
  // Create new offer function
  const handleCreateOffer = useCallback((customerId: string, source: string = "Email") => {
    // Check for Greek words being passed as source that might be set as amount
    if (source === "Τηλέφωνο") {
      source = "Phone";
    } else if (source === "Ιστοσελίδα") {
      source = "Site";
    } else if (source === "Φυσική παρουσία") {
      source = "Physical";
    }
    
    // Open the dialog instead of navigating
    openNewOfferDialog(customerId, source, () => {
      // We don't need special handling here as real-time updates will handle the UI
    });
  }, []);

  // Add handleDeleteCustomer function
  const handleDeleteCustomer = useCallback((customer: Customer) => {
    setCustomerToDelete(customer);
    setShowDeleteCustomerDialog(true);
  }, []);
  
  // Add handleDeleteOffer function
  const handleDeleteOffer = useCallback((offerId: string, customerId: string) => {
    setOfferToDelete(offerId);
    setCustomerIdForDelete(customerId);
    setShowDeleteOfferDialog(true);
  }, []);

  return (
    <CustomerDataProvider>
      {({ 
        filteredCustomers,
        customerOffers,
        loadingOffers,
        expandedCustomerIds,
        activeFilter,
        searchColumn,
        customerTypes,
        selectedCustomerTypes,
        setCustomers,
        setCustomerOffers,
        setExpandedCustomerIds,
        setActiveFilter,
        isLoading,
        isAdminOrSuperUser,
        handleCustomerTypeChange,
        handleExpandCustomer
      }) => {
        // Define search columns
        const searchColumns = [
          { accessor: 'company_name', header: 'Επωνυμία' },
          { accessor: 'customer_type', header: 'Τύπος' },
          { accessor: 'telephone', header: 'Τηλέφωνο' },
          { accessor: 'email', header: 'Email' },
          { accessor: 'afm', header: 'ΑΦΜ' },
          { accessor: 'address', header: 'Διεύθυνση' },
          { accessor: 'town', header: 'Πόλη' },
        ];

        // Filter buttons
        const filterButtons = [
          { label: 'Όλοι', value: 'all', onClick: () => setActiveFilter('all'), isActive: activeFilter === 'all' },
          { label: 'Ενεργοί', value: 'active', onClick: () => setActiveFilter('active'), isActive: activeFilter === 'active' },
          { label: 'Ανενεργοί', value: 'inactive', onClick: () => setActiveFilter('inactive'), isActive: activeFilter === 'inactive' },
        ];

        // Create the expanded content renderer function
        const renderExpandedContent = useCallback((customer: Customer) => {
          return (
            <CustomerExpandedContent
              customer={customer}
              customerId={customer.id}
              customerOffers={customerOffers}
              loadingOffers={loadingOffers}
              isAdminOrSuperUser={isAdminOrSuperUser}
              onDeleteClick={handleDeleteOffer}
            />
          );
        }, [customerOffers, loadingOffers, isAdminOrSuperUser, handleDeleteOffer]);

        // Define columns for the table
        const customerColumns = useMemo<Column<Customer>[]>(() => [
          {
            accessorKey: 'company_name',
            header: 'Επωνυμία',
            enableSorting: true,
            sortDescFirst: false,
            enableResizing: true,
            size: 300,
            cell: ({ row }) => {
              const customer = row;
              const offersCount = customer.offers_count || 0;
              const isExpanded = expandedCustomerIds[customer.id] || false;
              
              return (
                <CustomerContextMenu customerId={customer.id} onCreateOffer={handleCreateOffer}>
                  <div className="flex items-center gap-1 justify-start w-full">
                    <div className="flex items-center min-w-[40px] pl-2 shrink-0">
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
                        <div className="flex items-center justify-center w-10 h-8">
                          <span className="invisible">0</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[#cad2c5] overflow-hidden text-ellipsis whitespace-nowrap min-w-0 flex-1">{customer.company_name}</span>
                  </div>
                </CustomerContextMenu>
              );
            },
            sortingFn: (rowA, rowB) => {
              const a = rowA.getValue('company_name') || '';
              const b = rowB.getValue('company_name') || '';
              return (a as string).localeCompare(b as string, 'el', { sensitivity: 'base' });
            },
            meta: {
              initialWidth: 300,
              className: 'text-left',
              headerClassName: 'relative flex justify-center'
            },
          },
          {
            accessorKey: 'customer_type',
            header: 'Τύπος',
            enableSorting: true,
            sortDescFirst: false,
            enableResizing: true,
            size: 150,
            cell: ({ row }) => row.customer_type || "—",
            meta: {
              initialWidth: 150,
              className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
              headerClassName: 'relative flex justify-center'
            },
          },
          {
            accessorKey: 'telephone',
            header: 'Τηλέφωνο',
            enableSorting: true,
            sortDescFirst: false,
            enableResizing: true,
            size: 150,
            cell: ({ row }) => row.telephone || "—",
            meta: {
              initialWidth: 150,
              className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
              headerClassName: 'relative flex justify-center'
            },
          },
          {
            accessorKey: 'email',
            header: 'Email',
            enableSorting: true,
            sortDescFirst: false,
            enableResizing: true,
            size: 200,
            cell: ({ row }) => row.email || "—",
            meta: {
              initialWidth: 200,
              className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
              headerClassName: 'relative flex justify-center'
            },
          },
          {
            id: 'afm',
            accessorKey: 'afm',
            header: 'ΑΦΜ',
            enableSorting: true,
            sortDescFirst: false,
            enableResizing: true,
            size: 150,
            meta: {
              initialWidth: 150,
              className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
              headerClassName: 'relative flex justify-center'
            },
            cell: ({ row }) => row.afm || "—",
          },
          {
            accessorKey: 'address',
            header: 'Διεύθυνση',
            enableSorting: true,
            sortDescFirst: false,
            enableResizing: true,
            size: 250,
            cell: ({ row }) => {
              return row.address || "—";
            },
            meta: {
              initialWidth: 250,
              className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
              headerClassName: 'relative flex justify-center'
            },
          },
          {
            accessorKey: 'town',
            header: 'Πόλη',
            enableSorting: true,
            sortDescFirst: false,
            enableResizing: true,
            size: 150,
            cell: ({ row }) => row.town || "—",
            meta: {
              initialWidth: 150,
              className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
              headerClassName: 'relative flex justify-center'
            },
          },
          {
            accessorKey: 'created_at',
            header: 'Ημερομηνία Δημιουργίας',
            enableSorting: true,
            sortDescFirst: false,
            enableResizing: true,
            size: 200,
            cell: ({ row }) => formatDateTime(row.created_at),
            meta: {
              initialWidth: 200,
              className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
              headerClassName: 'relative flex justify-center'
            },
          },
          {
            accessorKey: 'status',
            header: 'Ενεργείες',
            enableSorting: true,
            sortDescFirst: false,
            enableResizing: true,
            size: 150,
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </Button>
                  )}
                </div>
              );
            },
            meta: {
              initialWidth: 150,
              className: 'text-right',
              headerClassName: 'relative flex justify-center'
            },
          },
        ], [expandedCustomerIds, handleExpandCustomer, handleCreateOffer, isAdminOrSuperUser, handleDeleteCustomer]);

        return (
          <TooltipProvider delayDuration={0}>
            <div className="px-2 py-2">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#a8c5b5] mb-2">Διαχείριση Πελατών</h1>
                  <Button
                    onClick={() => setShowNewCustomerDialog(true)}
                    className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
                  >
                    <Plus className="h-5 w-5 text-white" /> Νέος Πελάτης
                  </Button>
                </div>
              </div>

              <CustomerContextMenu customerId="global" onCreateOffer={handleCreateOffer}>
                <VirtualDataTable
                  data={filteredCustomers}
                  columns={customerColumns}
                  isLoading={isLoading}
                  onRowClick={handleCustomerClick}
                  getRowId={(row) => row.id}
                  renderExpandedContent={renderExpandedContent}
                  expandedRowIds={expandedCustomerIds}
                  onExpandRow={handleExpandCustomer}
                  containerClassName="mt-2"
                  showSearchBar={true}
                  searchColumns={searchColumns}
                  initialSearchColumn="company_name"
                  filterButtons={filterButtons}
                  emptyStateMessage="Δεν βρέθηκαν πελάτες"
                  loadingStateMessage="Φόρτωση πελατών..."
                  customerTypes={customerTypes}
                  selectedCustomerTypes={selectedCustomerTypes}
                  onCustomerTypeChange={handleCustomerTypeChange}
                  stabilizeExpandedRows={true}
                  tableId="customers-table"
                />
              </CustomerContextMenu>
            </div>

            {/* Action handlers for delete dialogs */}
            <CustomerActionsHandler
              showDeleteOfferDialog={showDeleteOfferDialog}
              setShowDeleteOfferDialog={setShowDeleteOfferDialog}
              offerToDelete={offerToDelete}
              customerIdForDelete={customerIdForDelete}
              setOfferToDelete={setOfferToDelete}
              setCustomerIdForDelete={setCustomerIdForDelete}
              
              showDeleteCustomerDialog={showDeleteCustomerDialog}
              setShowDeleteCustomerDialog={setShowDeleteCustomerDialog}
              customerToDelete={customerToDelete}
              setCustomerToDelete={setCustomerToDelete}
              
              expandedCustomerIds={expandedCustomerIds}
              setExpandedCustomerIds={setExpandedCustomerIds}
              customers={filteredCustomers}
              setCustomers={setCustomers}
              customerOffers={customerOffers}
              setCustomerOffers={setCustomerOffers}
            />

            {/* New Customer Dialog */}
            <CustomerDialog 
              open={showNewCustomerDialog}
              onOpenChange={setShowNewCustomerDialog}
              onSave={async (newCustomerId, companyName) => {
                setShowNewCustomerDialog(false);
                // Real-time updates will handle the UI refresh
              }}
            />
          </TooltipProvider>
        );
      }}
    </CustomerDataProvider>
  );
};

export default CustomersPage;
