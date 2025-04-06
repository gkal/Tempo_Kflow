// BACKUP OF CustomersPage.tsx - Created on: ${new Date().toISOString()}
// DO NOT MODIFY THIS FILE - FOR BACKUP PURPOSES ONLY

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
import { CustomerFilters } from './CustomerFilters';
import { CustomerActions } from './CustomerActions';
import { CustomerTable } from './CustomerTable';
import { useCustomerData } from '@/hooks/useCustomerData';
import { useCustomerOffers } from '@/hooks/useCustomerOffers';
import { CustomerFilter } from '@/types/CustomerTypes';

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
const CustomersPage = () => {
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

  // Rest of the component code...
  // (The rest of the file content would go here)
}

export default CustomersPage; 