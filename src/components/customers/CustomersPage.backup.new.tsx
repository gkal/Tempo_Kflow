import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { TruncateWithTooltip, TooltipProvider } from "@/components/ui/GlobalTooltip";
import { VirtualDataTable, Column } from "@/components/ui/virtual-table/VirtualDataTable";
import { Plus, Eye, EyeOff, Loader2, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { CustomerContextMenu } from "./CustomerContextMenu";
import { openNewOfferDialog, openEditOfferDialog } from '@/components/offers/main_offers_form/OfferDialogManager';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ModernDeleteConfirmation } from '@/components/ui/ModernDeleteConfirmation';
import { CustomerDialog } from '@/components/customers/CustomerDialog';

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

// Define Customer type
interface CustomerOffer {
  id: string;
  name: string;
  value: string;
  date: string;
  status: string;
  requirements?: string;
  result?: string;
}

interface Customer {
  id: string;
  company_name?: string;
  email?: string;
  telephone?: string;
  status: string;
  created_at?: string;
  customer_type?: string;
  offers_count?: number;
  offers?: CustomerOffer[];
  address?: string;
  afm?: string;
  // Any additional fields
  [key: string]: any;
}

// Helper function for formatting currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

// Helper function for formatting dates
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('el-GR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (error) {
    return '-';
  }
};

// Format date with time
const formatDateTime = (dateString?: string) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('el-GR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (error) {
    return dateString;
  }
};

// Format status for display
const formatStatus = (status: string) => {
  switch (status) {
    case "wait_for_our_answer":
      return "Αναμονή για απάντησή μας";
    case "wait_for_customer_answer":
      return "Αναμονή για απάντηση πελάτη";
    case "ready":
      return "Ολοκληρώθηκε";
    default:
      return status || "—";
  }
};

// Format result for display
const formatResult = (result: string) => {
  switch (result) {
    case "success":
      return "Επιτυχία";
    case "failed":
      return "Αποτυχία";
    case "cancel":
      return "Ακύρωση";
    case "waiting":
      return "Αναμονή";
    case "none":
      return "Κανένα";
    default:
      return result || "—";
  }
};

// Function to get status class
const getStatusClass = (status: string): string => {
  switch (status) {
    case "wait_for_our_answer":
      return "text-yellow-400";
    case "wait_for_customer_answer":
      return "text-blue-400";
    case "ready":
      return "text-green-400";
    case "completed":
      return "text-green-400";
    case "pending":
      return "text-yellow-400";
    default:
      return "text-gray-400";
  }
};

// Function to get result class
const getResultClass = (result: string): string => {
  switch (result) {
    case "success":
      return "text-green-400";
    case "failed":
      return "text-red-400";
    case "cancel":
      return "text-yellow-400";
    case "waiting":
      return "text-purple-400";
    case "pending":
      return "text-blue-400";
    case "none":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
};

// Main component
const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Record<string, boolean>>({});
  const [customerOffers, setCustomerOffers] = useState<Record<string, CustomerOffer[]>>({});
  const [loadingOffers, setLoadingOffers] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('company_name');
  const [customerTypes, setCustomerTypes] = useState<string[]>([
    "Εταιρεία", 
    "Ιδιώτης", 
    "Δημόσιο", 
    "Οικοδομές", 
    "Εκτακτος Πελάτης", 
    "Εκτακτη Εταιρία"
  ]);
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  
  // Delete offer dialog state
  const [showDeleteOfferDialog, setShowDeleteOfferDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [customerIdForDelete, setCustomerIdForDelete] = useState<string | null>(null);
  
  // Delete customer dialog state
  const [showDeleteCustomerDialog, setShowDeleteCustomerDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  
  // New customer dialog state
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  
  // Check user permissions
  const isAdminUser = user?.role?.toLowerCase() === 'admin';
  const isAdminOrSuperUser = isAdminUser || 
                           user?.role === 'Super User' ||
                           user?.role?.toLowerCase() === 'super user';
  
  // In the ReusableCustomersPage component, add a refresh trigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);
  
  // Add a RefreshController at the top of the component, after the state declarations
  const [refreshOffersTrigger, setRefreshOffersTrigger] = useState<{customerId: string, timestamp: number} | null>(null);
  
  // Add at the beginning of the component:
  const [customerIdBeingExpanded, setCustomerIdBeingExpanded] = useState<string | null>(null);
  
  // Add a ref to track recently deleted offers to prevent double-counting
  const recentlyDeletedOffersRef = useRef<Set<string>>(new Set());
  
  // Also, add a timestamp to force refresh when real-time updates occur:
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState(Date.now());

  // Modify the fetchCustomerOffers function to use dedicated logging for real-time architecture
  const fetchCustomerOffers = useCallback(async (customerId: string, forceRefresh = false) => {
    if (!customerId || (customerOffers[customerId] && !forceRefresh)) {
      return;
    }
    
    // Set loading state for this customer
    setLoadingOffers(prev => ({
      ...prev,
      [customerId]: true
    }));
    
    try {
      console.log(`🔍 [RT-FETCH] Fetching offers for customer ${customerId} with newest first`);
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      console.log(`📊 [RT-FETCH] Retrieved ${data?.length || 0} offers sorted by newest first for customer ${customerId}`);
      
      // Format the offers data
      const formattedOffers = (data || []).map(offer => ({
        id: offer.id,
        name: `Προσφορά ${typeof offer.id === 'string' ? offer.id.substring(0, 4) : ''}`,
        value: offer.amount ? String(offer.amount) : '',
        date: offer.created_at,
        status: offer.offer_result || 'pending',
        requirements: offer.requirements || offer.customer_comments || '',
        result: offer.result || ''
      }));
      
      // Update offers state
      setCustomerOffers(prev => ({
        ...prev,
        [customerId]: formattedOffers
      }));
    } catch (error) {
      console.error("[RT-ERROR] Error fetching offers:", error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η φόρτωση των προσφορών",
        variant: "destructive",
      });
    } finally {
      // Clear loading state
      setLoadingOffers(prev => ({
        ...prev,
        [customerId]: false
      }));
    }
  }, [customerOffers]);

  // Create a wrapper function for handleExpand to match the previous interface
  const handleExpandCustomer = useCallback(async (customerId: string) => {
    const isCurrentlyExpanded = !!expandedCustomerIds[customerId];
    
    if (isCurrentlyExpanded) {
      // Collapse
      setExpandedCustomerIds(prev => {
        const updated = { ...prev };
        delete updated[customerId];
        return updated;
      });
    } else {
      // Track that we're expanding this customer
      setCustomerIdBeingExpanded(customerId);
      
      // Expand and load offers
      setExpandedCustomerIds(prev => ({
        ...prev,
        [customerId]: true
      }));
      
      // Fetch offers if they don't exist or if we have a stale version
      if (!customerOffers[customerId] || customerOffers[customerId].length === 0) {
        await fetchCustomerOffers(customerId);
      }
      
      // Clear the tracking
      setTimeout(() => {
        setCustomerIdBeingExpanded(null);
      }, 500);
    }
  }, [expandedCustomerIds, customerOffers, fetchCustomerOffers]);

  // Then modify the handleExpand function:
  const handleExpand = async (customerId: string, isCurrentlyExpanded: boolean) => {
    if (isCurrentlyExpanded) {
      // Collapse
      setExpandedCustomerIds(prev => {
        const updated = { ...prev };
        delete updated[customerId];
        return updated;
      });
    } else {
      // Track that we're expanding this customer
      setCustomerIdBeingExpanded(customerId);
      
      // Expand and load offers
      setExpandedCustomerIds(prev => ({
        ...prev,
        [customerId]: true
      }));
      
      // Fetch offers if they don't exist or if we have a stale version
      if (!customerOffers[customerId] || customerOffers[customerId].length === 0) {
        await fetchCustomerOffers(customerId);
      }
      
      // Clear the tracking
      setTimeout(() => {
        setCustomerIdBeingExpanded(null);
      }, 500);
    }
  };

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
      
      // Set the expanded state to true for this customer to show the offers
      setExpandedCustomerIds(prev => ({
        ...prev,
        [customerId]: true
      }));
    });
  }, [expandedCustomerIds, setExpandedCustomerIds]);
  
  // Add debug effects to log state changes
  useEffect(() => {
    // console.log(`📊 Current customers state: ${customers.length} items`);
  }, [customers]);
  
  useEffect(() => {
    // console.log(`📊 Current customer offers state: ${Object.keys(customerOffers).length} customers with offers`);
    
    // Log expanded customers and their offer counts for debugging
    const expandedIds = Object.keys(expandedCustomerIds).filter(id => expandedCustomerIds[id]);
    if (expandedIds.length > 0) {
      // console.log(`📊 Currently expanded customers:`, expandedIds);
      expandedIds.forEach(id => {
        const offerCount = customerOffers[id]?.length || 0;
        // console.log(`📊 Customer ${id} has ${offerCount} offers in state`);
      });
    }
  }, [customerOffers, expandedCustomerIds]);
  
  // Add a cleanup effect for when the component unmounts
  useEffect(() => {
    return () => {
      // console.log('🧹 Cleaning up customers page and subscriptions');
    };
  }, []);

  // Add an effect to automatically refresh offers data when lastRealtimeUpdate changes
  useEffect(() => {
    if (lastRealtimeUpdate > 0) {
      // console.log(`🔄 Real-time update detected at ${new Date(lastRealtimeUpdate).toLocaleTimeString()}`);
      
      // Store the current timestamp to avoid loops
      const currentUpdateTime = lastRealtimeUpdate;
      
      // For each expanded customer, refresh their offers
      Object.keys(expandedCustomerIds).forEach(customerId => {
        if (expandedCustomerIds[customerId]) {
          // console.log(`🔄 Auto-refreshing offers for expanded customer ${customerId}`);
          // Use a ref to track the last refresh time for each customer to avoid loops
          fetchCustomerOffers(customerId, true);
        }
      });
      
      // Reset the timestamp after processing to avoid infinite loops
      // Only reset if it hasn't been changed by another event
      if (currentUpdateTime === lastRealtimeUpdate) {
        setTimeout(() => {
          // Only update if it's still the same value to avoid extra renders
          setLastRealtimeUpdate(0);
        }, 500);
      }
    }
  }, [lastRealtimeUpdate, expandedCustomerIds, fetchCustomerOffers]);

  // Replace the real-time event handlers with comprehensive versions that handle all UI updates
  
  // Setup real-time subscriptions for offers
  useRealtimeSubscription(
    { table: 'offers' },
    (payload) => {
      // console.log('🔴 [RT-EVENT] Realtime Offers Event:', payload);
      // if (payload.new) console.log('🔴 [RT-PAYLOAD] NEW:', JSON.stringify(payload.new));
      // if (payload.old) console.log('🔴 [RT-PAYLOAD] OLD:', JSON.stringify(payload.old));
      
      // Add back the realtime status update that we accidentally removed
      setRealtimeStatus(`Received ${payload.eventType} at ${new Date().toLocaleTimeString()}`);
      
      // Handle the real-time update based on event type
      if (payload.eventType === 'INSERT') {
        // A new offer was added
        if (payload.new && payload.new.customer_id) {
          const customerId = payload.new.customer_id;
          // console.log(`🔴 [RT-INSERT] New offer added for customer ${customerId}`);
          
          // Update the customers list with the new offer count - only through real-time events
          setCustomers(prevCustomers => {
            return prevCustomers.map(customer => {
              if (customer.id === customerId) {
                // Only increase the count if it's an active offer
                const isActive = !payload.new.result || 
                              payload.new.result === 'pending' || 
                              payload.new.result === 'none' || 
                              payload.new.result === '';
                              
                if (isActive) {
                  // console.log(`🔴 [RT-INSERT] Updating offer count for customer ${customerId} from ${customer.offers_count} to ${(customer.offers_count || 0) + 1}`);
                  return {
                    ...customer,
                    offers_count: (customer.offers_count || 0) + 1
                  };
                }
              }
              return customer;
            });
          });
          
          // Create a UI offer object from the payload for either case
          const newOffer: CustomerOffer = {
            id: payload.new.id,
            name: `Προσφορά ${typeof payload.new.id === 'string' ? payload.new.id.substring(0, 4) : ''}`,
            value: payload.new.amount ? String(payload.new.amount) : '',
            date: payload.new.created_at,
            status: payload.new.offer_result || 'pending',
            requirements: payload.new.requirements || payload.new.customer_comments || '',
            result: payload.new.result || ''
          };
          
          // Always update the customerOffers state regardless of expansion state
          // This ensures all browsers have the latest data
          // console.log(`🔴 [RT-INSERT] Updating offers state for customer ${customerId} with new offer ${payload.new.id}`);
          setCustomerOffers(prev => {
            const currentOffers = prev[customerId] || [];
            
            // Check if this offer already exists (preventing duplicates)
            const existingOfferIndex = currentOffers.findIndex(offer => offer.id === newOffer.id);
            if (existingOfferIndex >= 0) {
              // Replace the existing offer with the updated one
              // console.log(`🔴 [RT-INSERT] Offer ${newOffer.id} already exists, updating it`);
              const updatedOffers = [...currentOffers];
              updatedOffers[existingOfferIndex] = newOffer;
              return {
                ...prev,
                [customerId]: updatedOffers
              };
            }
            
            // Add as a new offer at the beginning (newest first)
            // console.log(`🔴 [RT-INSERT] Adding new offer ${newOffer.id} to customer ${customerId}`);
            return {
              ...prev,
              [customerId]: [newOffer, ...currentOffers]
            };
          });
          
          // Only trigger a refresh when we have an expanded customer with this ID
          if (expandedCustomerIds[customerId]) {
            // console.log(`🔴 [RT-INSERT] Customer ${customerId} is expanded, triggering refresh`);
            // Add a small delay to avoid updates colliding
            setTimeout(() => {
              setLastRealtimeUpdate(Date.now());
            }, 100);
          }
        }
      } else if (payload.eventType === 'UPDATE') {
        // An offer was updated
        if (payload.new && payload.new.customer_id) {
          const customerId = payload.new.customer_id;
          // console.log(`🔴 [RT-UPDATE] Offer updated for customer ${customerId}, offer ID: ${payload.new.id}`);
          
          // Check if this is a soft delete operation (deleted_at was set)
          const isSoftDelete = payload.old && !payload.old.deleted_at && payload.new.deleted_at;
          
          if (isSoftDelete) {
            // console.log(`🔴 [RT-UPDATE] Offer soft-deleted for customer ${customerId}`);
            
            // Always update the count immediately
            setCustomers(prevCustomers => 
              prevCustomers.map(customer => {
                if (customer.id === customerId) {
                  const newCount = Math.max(0, (customer.offers_count || 0) - 1);
                  // console.log(`🔴 [RT-UPDATE] Soft delete: Updating offer count for customer ${customerId} from ${customer.offers_count} to ${newCount}`);
                  
                  return {
                    ...customer,
                    offers_count: newCount
                  };
                }
                return customer;
              })
            );
            
            // Remove the deleted offer from the list - regardless of expansion state
            // This ensures all browsers have the latest data
            const offerId = payload.new.id;
            // console.log(`🔴 [RT-UPDATE] Soft delete: Removing offer ${offerId} from UI for customer ${customerId}`);
            
            setCustomerOffers(prev => {
              if (!prev[customerId]) return prev;
              
              return {
                ...prev,
                [customerId]: prev[customerId].filter(offer => offer.id !== offerId)
              };
            });
            
            // Only trigger a refresh when we have an expanded customer with this ID
            if (expandedCustomerIds[customerId]) {
              // console.log(`🔴 [RT-UPDATE] Customer ${customerId} is expanded, triggering refresh after soft delete`);
              // Add a small delay to avoid updates colliding
              setTimeout(() => {
                setLastRealtimeUpdate(Date.now());
              }, 100);
            }
            
            return; // Skip the regular update handling
          }
          
          // Regular update - Create a formatted offer object from the payload
          const updatedOffer: CustomerOffer = {
            id: payload.new.id,
            name: `Προσφορά ${typeof payload.new.id === 'string' ? payload.new.id.substring(0, 4) : ''}`,
            value: payload.new.amount ? String(payload.new.amount) : '',
            date: payload.new.created_at || payload.new.updated_at || new Date().toISOString(),
            status: payload.new.offer_result || 'pending',
            requirements: payload.new.requirements || payload.new.customer_comments || '',
            result: payload.new.result || ''
          };
          
          // Update the offer in local state regardless of expansion state
          // This ensures all browsers have the latest data
          // console.log(`🔴 [RT-UPDATE] Regular update: Updating offer ${payload.new.id} in UI for customer ${customerId}`);
          
          let stateWasUpdated = false;
          
          setCustomerOffers(prev => {
            // If we don't have offers for this customer yet, get them
            if (!prev[customerId]) {
              // console.log(`🔴 [RT-UPDATE] No offers found for ${customerId}, triggering fetch for this customer`);
              // Fetch offers for this customer in the background
              fetchCustomerOffers(customerId, true);
              return prev;
            }
            
            // Check if the offer exists and is different from the updated one
            const existingOffer = prev[customerId]?.find(offer => offer.id === updatedOffer.id);
            if (!existingOffer || 
                existingOffer.value !== updatedOffer.value || 
                existingOffer.status !== updatedOffer.status || 
                existingOffer.requirements !== updatedOffer.requirements || 
                existingOffer.result !== updatedOffer.result) {
              stateWasUpdated = true;
            }
            
            // Update the offer in the existing list
            return {
              ...prev,
              [customerId]: prev[customerId].map(offer => {
                if (offer.id === updatedOffer.id) {
                  // console.log(`🔴 [RT-UPDATE] Found offer to update: ${offer.id}`);
                  // console.log(`🔴 [RT-UPDATE] Updating from: ${JSON.stringify(offer)} to: ${JSON.stringify(updatedOffer)}`);
                  // Return the updated offer with all fields
                  return updatedOffer;
                }
                return offer;
              })
            };
          });
          
          // Only trigger a refresh when the state was updated and customer is expanded
          if (stateWasUpdated && expandedCustomerIds[customerId]) {
            // console.log(`🔴 [RT-UPDATE] Customer ${customerId} is expanded and offer was updated, triggering refresh`);
            // Add a small delay to avoid updates colliding
            setTimeout(() => {
              setLastRealtimeUpdate(Date.now());
            }, 100);
          }
        }
      } else if (payload.eventType === 'DELETE') {
        // A hard delete happened (directly in the database)
        if (payload.old && payload.old.customer_id) {
          const customerId = payload.old.customer_id;
          const offerId = payload.old.id;
          // console.log(`🔴 [RT-DELETE] Offer hard-deleted from database: ${offerId} for customer ${customerId}`);
          
          // Update customer offer count
          setCustomers(prevCustomers => 
            prevCustomers.map(customer => {
              if (customer.id === customerId) {
                // Only decrease if it's an active offer
                const isActive = !payload.old.result || 
                            payload.old.result === 'pending' || 
                            payload.old.result === 'none' || 
                            payload.old.result === '';
                            
                if (isActive) {
                  const newCount = Math.max(0, (customer.offers_count || 0) - 1);
                  // console.log(`🔴 [RT-DELETE] Hard delete: Updating offer count for customer ${customerId} from ${customer.offers_count} to ${newCount}`);
                  
                  return {
                    ...customer,
                    offers_count: newCount
                  };
                }
              }
              return customer;
            })
          );
          
          // Remove the deleted offer from the list regardless of expansion state
          console.log(`🔴 [RT-DELETE] Removing offer ${offerId} from UI for customer ${customerId}`);
          
          setCustomerOffers(prev => {
            if (!prev[customerId]) return prev;
            
            return {
              ...prev,
              [customerId]: prev[customerId].filter(offer => offer.id !== offerId)
            };
          });
        }
      }
    }
  );
  
  // Setup real-time subscriptions for customers
  useRealtimeSubscription(
    { table: 'customers' },
    (payload) => {
      console.log('🔵 Realtime Customers Event:', payload);
      if (payload.new) console.log('🔵 Payload NEW:', JSON.stringify(payload.new));
      if (payload.old) console.log('🔵 Payload OLD:', JSON.stringify(payload.old));
      
      setRealtimeStatus(`Received ${payload.eventType} at ${new Date().toLocaleTimeString()}`);
      
      // Handle the real-time update based on event type
      if (payload.eventType === 'INSERT') {
        // A new customer was added
        if (payload.new) {
          console.log('🔵 New customer added:', payload.new.company_name);
          
          // Map the new customer data to our Customer type
          const newCustomer: Customer = {
            id: payload.new.id,
            company_name: payload.new.company_name || '',
            email: payload.new.email || '',
            telephone: payload.new.telephone || '',
            status: payload.new.status || 'inactive',
            created_at: payload.new.created_at,
            customer_type: payload.new.customer_type || '',
            address: payload.new.address || '',
            afm: payload.new.afm || '',
            offers_count: 0 // New customer has no offers yet
          };
          
          // Add the new customer to state
          setCustomers(prevCustomers => {
            // Check if this customer already exists (unlikely but possible)
            const exists = prevCustomers.some(c => c.id === newCustomer.id);
            if (exists) return prevCustomers;
            
            // Add the new customer to the list and sort by company_name
            const newList = [...prevCustomers, newCustomer].sort((a, b) => 
              (a.company_name || '').localeCompare(b.company_name || '')
            );
            
            console.log('🔵 Added new customer to UI:', newCustomer.company_name);
            return newList;
          });
        }
      } else if (payload.eventType === 'UPDATE') {
        // A customer was updated
        if (payload.new && payload.old) {
          // Check if this is a soft delete operation (deleted_at was set)
          const isSoftDelete = !payload.old.deleted_at && payload.new.deleted_at;
          
          if (isSoftDelete) {
            console.log('🔵 Customer soft-deleted:', payload.new.company_name);
            
            // Remove the customer from state
            setCustomers(prevCustomers => 
              prevCustomers.filter(customer => customer.id !== payload.new.id)
            );
            
            // Also remove any offers data for this customer
            setCustomerOffers(prev => {
              const newOffers = { ...prev };
              delete newOffers[payload.new.id];
              return newOffers;
            });
            
            // And remove from expanded state if expanded
            if (expandedCustomerIds[payload.new.id]) {
              setExpandedCustomerIds(prev => {
                const newState = { ...prev };
                delete newState[payload.new.id];
                return newState;
              });
            }
          } else {
            console.log('🔵 Customer updated:', payload.new.company_name);
            
            // Update the customer in state
            setCustomers(prevCustomers => 
              prevCustomers.map(customer => {
                if (customer.id === payload.new.id) {
                  // Update relevant fields
                  return {
                    ...customer,
                    company_name: payload.new.company_name || customer.company_name,
                    email: payload.new.email || customer.email,
                    telephone: payload.new.telephone || customer.telephone,
                    status: payload.new.status || customer.status,
                    customer_type: payload.new.customer_type || customer.customer_type,
                    address: payload.new.address || customer.address,
                    afm: payload.new.afm || customer.afm
                  };
                }
                return customer;
              })
            );
          }
        }
      } else if (payload.eventType === 'DELETE') {
        // A customer was hard deleted (rare, as we usually use soft deletes)
        if (payload.old) {
          console.log('🔵 Customer deleted:', payload.old.company_name);
          
          // Remove the customer from state
          setCustomers(prevCustomers => 
            prevCustomers.filter(customer => customer.id !== payload.old.id)
          );
          
          // Also remove any offers data for this customer
          setCustomerOffers(prev => {
            const newOffers = { ...prev };
            delete newOffers[payload.old.id];
            return newOffers;
          });
          
          // And remove from expanded state if expanded
          if (expandedCustomerIds[payload.old.id]) {
            setExpandedCustomerIds(prev => {
              const newState = { ...prev };
              delete newState[payload.old.id];
              return newState;
            });
          }
        }
      }
    }
  );
  
  // Function to map database customers to our Customer type
  const mapDatabaseCustomers = (dbCustomers: any[]): Customer[] => {
    return dbCustomers.map(dbCustomer => {
      // Get all non-deleted offers
      const validOffers = dbCustomer.offers?.filter((offer: any) => !offer.deleted_at) || [];
      
      // Sort offers by created_at descending (newest first)
      validOffers.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Count active offers (those without a final result)
      const activeOffersCount = validOffers.filter((offer: any) => 
        !offer.result || 
        offer.result === 'pending' || 
        offer.result === 'none' || 
        offer.result === ''
      ).length;
      
      return {
        id: dbCustomer.id,
        company_name: dbCustomer.company_name || '',
        email: dbCustomer.email || '',
        telephone: dbCustomer.telephone || '',
        status: dbCustomer.status || 'inactive',
        created_at: dbCustomer.created_at,
        customer_type: dbCustomer.customer_type || '',
        address: dbCustomer.address || '',
        afm: dbCustomer.afm || '',
        offers_count: activeOffersCount,
        offers: validOffers.map((offer: any) => ({
          id: offer.id,
          name: `Προσφορά ${typeof offer.id === 'string' ? offer.id.substring(0, 4) : ''}`,
          value: offer.amount ? String(offer.amount) : '',
          date: offer.created_at,
          status: offer.offer_result || 'pending',
          requirements: offer.requirements || '',
          result: offer.result || ''
        }))
      };
    });
  };

  // Update the useEffect that fetches customers to depend on refreshTrigger
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        
        // console.log('🔍 Fetching all customers and their offers...');
        
        // Remove columns that don't exist in the database
        const { data, error } = await supabase
          .from('customers')
          .select(`
            id, 
            company_name, 
            email, 
            telephone, 
            status, 
            customer_type, 
            created_at,
            address,
            afm,
            offers(
              id, 
              customer_id, 
              created_at, 
              source, 
              amount, 
              offer_result, 
              result,
              requirements,
              customer_comments, 
              our_comments, 
              deleted_at
            )
          `)
          .filter('deleted_at', 'is', null)
          .order('company_name', { ascending: true });
        
        if (error) throw error;
        
        // console.log(`🔍 Fetched ${data?.length || 0} customers with their offers`);

        // Map the fetched data to our Customer type and ensure offers are sorted by newest first
        const mappedCustomers = mapDatabaseCustomers(data);
        
        // Update state
        setCustomers(mappedCustomers);
        setCustomerOffers(prev => {
          const newOffers = { ...prev };
          mappedCustomers.forEach(customer => {
            // Sort offers by created_at descending (newest first)
            const sortedOffers = [...(customer.offers || [])].sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            newOffers[customer.id] = sortedOffers;
          });
          return newOffers;
        });
        
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Modify the useEffect that fetches offers to include the lastRealtimeUpdate dependency:
  useEffect(() => {
    // If a customer is expanded, fetch their offers
    const fetchExpandedOffers = async () => {
      for (const customerId of Object.keys(expandedCustomerIds)) {
        await fetchCustomerOffers(customerId);
      }
    };
    
    fetchExpandedOffers();
  }, [expandedCustomerIds, lastRealtimeUpdate, fetchCustomerOffers]);

  // Handle customer click
  const handleCustomerClick = useCallback((customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  }, [navigate]);

  // Define search columns
  const searchColumns = [
    { accessor: 'company_name', header: 'Επωνυμία' },
    { accessor: 'customer_type', header: 'Τύπος' },
    { accessor: 'telephone', header: 'Τηλέφωνο' },
    { accessor: 'email', header: 'Email' },
    { accessor: 'afm', header: 'ΑΦΜ' },
    { accessor: 'address', header: 'Διεύθυνση' },
  ];

  // Filter buttons
  const filterButtons = [
    { label: 'Όλοι', value: 'all', onClick: () => setActiveFilter('all'), isActive: activeFilter === 'all' },
    { label: 'Ενεργοί', value: 'active', onClick: () => setActiveFilter('active'), isActive: activeFilter === 'active' },
    { label: 'Ανενεργοί', value: 'inactive', onClick: () => setActiveFilter('inactive'), isActive: activeFilter === 'inactive' },
  ];

  // Filter customers based on activeFilter and selectedCustomerTypes
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Filter by status
      if (activeFilter === 'active' && customer.status !== 'active') return false;
      if (activeFilter === 'inactive' && customer.status !== 'inactive') return false;
      
      // Filter by customer type if any types are selected
      if (selectedCustomerTypes.length > 0 && !selectedCustomerTypes.includes(customer.customer_type)) {
        return false;
      }
      
      return true;
    });
  }, [customers, activeFilter, selectedCustomerTypes]);

  // Add handleCustomerTypeChange function
  const handleCustomerTypeChange = useCallback((types: string[]) => {
    setSelectedCustomerTypes(types);
  }, []);

  // First, remove the useEffect from renderExpandedContent function
  const renderExpandedContent = useCallback((customer: Customer) => {
    const customerId = customer.id;
    const offers = customerOffers[customerId] || [];
    const isLoading = loadingOffers[customerId] || false;
    
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-4">
          <LoadingSpinner fullScreen={false} />
          <span className="ml-3 text-[#cad2c5]">Φόρτωση προσφορών...</span>
        </div>
      );
    }
    
    if (offers.length === 0) {
      return (
        <div className="py-4 text-[#84a98c] flex flex-col items-center justify-center gap-3">
          <div className="text-center">
            Δεν υπάρχουν προσφορές για αυτόν τον πελάτη
          </div>
        </div>
      );
    }

    // Handle offer deletion click
    const handleDeleteClick = (offerId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      setOfferToDelete(offerId);
      setCustomerIdForDelete(customerId);
      setShowDeleteOfferDialog(true);
    };
    
    // Render offers table
    return (
      <div className="overflow-visible pl-[70px] pr-4 py-4 relative">
        <div className="bg-[#2f3e46] rounded-md border border-[#52796f] shadow-sm w-[1000px]">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col className="w-[150px]" />
              <col className="w-[200px]" />
              <col className="w-[200px]" />
              <col className="w-[150px]" />
              <col className="w-[100px]" />
              {isAdminOrSuperUser && <col className="w-[80px]" />}
            </colgroup>
            <thead className="bg-[#2f3e46] relative z-10 after:absolute after:content-[''] after:left-0 after:right-0 after:bottom-0 after:h-[1px] after:bg-[#52796f]">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Ημερομηνία</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Ζήτηση Πελάτη</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Ποσό</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Κατάσταση</th>
                <th className={`px-2 py-2 text-left text-xs font-medium text-[#84a98c] ${isAdminOrSuperUser ? 'border-r border-[#52796f]' : ''}`}>Αποτέλεσμα</th>
                {isAdminOrSuperUser && (
                  <th className="px-2 py-2 text-center text-xs font-medium text-[#84a98c]">Ενέργειες</th>
                )}
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr 
                  key={offer.id} 
                  className="border-t border-[#52796f]/30 bg-[#2f3e46] hover:bg-[#354f52]/50 cursor-pointer transition-colors duration-150"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Open edit dialog instead of navigating
                    openEditOfferDialog(customerId, offer.id, () => {
                      // We don't need to do anything here as real-time updates will handle the UI
                    });
                  }}
                >
                  <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">{formatDate(offer.date)}</td>
                  <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">
                    {offer.requirements ? (
                      <TruncateWithTooltip 
                        text={offer.requirements} 
                        maxLength={30}
                        maxWidth={800}
                        multiLine={false}
                        maxLines={1}
                        position="top"
                        className="cursor-pointer"
                      />
                    ) : <span className="text-xs text-[#52796f]">-</span>}
                  </td>
                  <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">
                    {offer.value ? (
                      <TruncateWithTooltip 
                        text={offer.value} 
                        maxLength={30}
                        maxWidth={800}
                        multiLine={false}
                        maxLines={1}
                        position="top"
                        className="cursor-pointer"
                      />
                    ) : <span className="text-xs text-[#52796f]">-</span>}
                  </td>
                  <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">
                    <span className={getStatusClass(offer.status)}>
                      {formatStatus(offer.status) || <span className="text-xs text-[#52796f]">-</span>}
                    </span>
                  </td>
                  <td className={`px-2 py-2 text-xs text-[#cad2c5] ${isAdminOrSuperUser ? 'border-r border-[#52796f]' : ''}`}>
                    <span className={getResultClass(offer.result)}>
                      {formatResult(offer.result || '') || <span className="text-xs text-[#52796f]">-</span>}
                    </span>
                  </td>
                  {isAdminOrSuperUser && (
                    <td className="px-2 py-2 text-xs text-center">
                      <button
                        onClick={(e) => handleDeleteClick(offer.id, e)}
                        className="p-1 rounded-full hover:bg-[#354f52] text-red-500 hover:text-red-400 transition-colors"
                        aria-label="Διαγραφή προσφοράς"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [customerOffers, loadingOffers, navigate, isAdminOrSuperUser, setOfferToDelete, setCustomerIdForDelete, setShowDeleteOfferDialog]);

  // After the renderExpandedContent function, add the customerColumns definition

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
      enableResizing: true,
      size: 150,
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
      enableResizing: true,
      size: 150,
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
      enableResizing: true,
      size: 200,
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
      enableResizing: true,
      size: 250,
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
      enableResizing: true,
      size: 200,
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
  ], [expandedCustomerIds, handleExpandCustomer, handleCreateOffer, isAdminOrSuperUser]);

  // Add handleDeleteCustomer function
  const handleDeleteCustomer = useCallback((customer: Customer) => {
    setCustomerToDelete(customer);
    setShowDeleteCustomerDialog(true);
  }, []);

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
          />
        </CustomerContextMenu>
      </div>

      {/* Delete Offer Confirmation Dialog */}
      <ModernDeleteConfirmation
        open={showDeleteOfferDialog}
        onOpenChange={setShowDeleteOfferDialog}
        title="Διαγραφή Προσφοράς"
        description="Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτή την προσφορά και τις λεπτομέρειές της; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί."
        itemToDelete={offerToDelete || ""}
        successMessage="Η προσφορά διαγράφηκε επιτυχώς!"
        errorMessage="Δεν ήταν δυνατή η διαγραφή της προσφοράς"
        deleteButtonLabel="Διαγραφή"
        cancelButtonLabel="Ακύρωση"
        destructive={true}
        onDelete={async () => {
          if (!offerToDelete || !customerIdForDelete) return;
          
          try {
            console.log(`🔴 [ACTION] Deleting offer ${offerToDelete} for customer ${customerIdForDelete}`);
            
            // REAL-TIME APPROACH: Only send the delete request to the server,
            // let the real-time subscription handle the UI update
            const { error } = await supabase
              .from('offers')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', offerToDelete);
            
            if (error) throw error;
            
            // No direct UI updates - real-time events will handle it
            console.log(`🔴 [ACTION] Delete request sent, waiting for real-time update`);
            
          } catch (error) {
            console.error("[RT-ERROR] Error deleting offer:", error);
            throw error; // Rethrow to show error in dialog
          }
        }}
        onSuccess={() => {
          // Reset state after successful deletion
          setOfferToDelete(null);
          setCustomerIdForDelete(null);
        }}
      />

      {/* Delete Customer Confirmation Dialog */}
      <ModernDeleteConfirmation
        open={showDeleteCustomerDialog}
        onOpenChange={setShowDeleteCustomerDialog}
        title="Διαγραφή Πελάτη"
        description="Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτόν τον πελάτη και όλες τις προσφορές του; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί."
        itemToDelete={customerToDelete?.company_name || ""}
        successMessage="Ο πελάτης διαγράφηκε επιτυχώς!"
        errorMessage="Δεν ήταν δυνατή η διαγραφή του πελάτη"
        deleteButtonLabel="Διαγραφή"
        cancelButtonLabel="Ακύρωση"
        destructive={true}
        size="lg"
        onDelete={async () => {
          if (!customerToDelete) return;
          
          try {
            console.log(`🔵 Deleting customer ${customerToDelete.id}`);
            
            // Soft delete the customer by setting deleted_at
            const { error } = await supabase
              .from('customers')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', customerToDelete.id);
            
            if (error) throw error;
            
            // Update local state to remove the customer from the UI
            setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
            
            // Remove from expandedCustomerIds if expanded
            if (expandedCustomerIds[customerToDelete.id]) {
              setExpandedCustomerIds(prev => {
                const updated = { ...prev };
                delete updated[customerToDelete.id];
                return updated;
              });
            }
            
            // Remove from customerOffers
            setCustomerOffers(prev => {
              const updated = { ...prev };
              delete updated[customerToDelete.id];
              return updated;
            });
          } catch (error) {
            console.error("Error deleting customer:", error);
            throw error; // Rethrow to show error in dialog
          }
        }}
        onSuccess={() => {
          // Reset state after successful deletion
          setCustomerToDelete(null);
        }}
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
};

export default CustomersPage;