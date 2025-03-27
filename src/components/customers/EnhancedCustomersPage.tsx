import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Customer } from '@/types';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/GlobalTooltip';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import VirtualCustomersTable from './VirtualCustomersTable';
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

// This matches the actual database schema from the existing app
interface DatabaseOffer {
  id: string;
  customer_id: string;
  created_at: string;
  source: string;
  amount: string;  // NOTE: amount is TEXT not number in the database
  customer_comments: string;
  our_comments: string;
  offer_result: string; // This is used for status (wait_for_our_answer, wait_for_customer_answer, ready)
  result: string;  // This is offer_result ENUM: success, failed, cancel, waiting
  assigned_to: string;
  created_by: string;
  updated_at: string;
  deleted_at: string;
  requirements: string;
}

// Helper function to format dates
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy', { locale: el });
  } catch (error) {
    return '-';
  }
};

// Format functions for display
const formatStatus = (status: string) => {
  switch (status) {
    case "wait_for_our_answer":
      return "Αναμονή για απάντησή μας";
    case "wait_for_customer_answer":
      return "Αναμονή για απάντηση πελάτη";
    case "ready":
      return "Ολοκληρώθηκε";
    default:
      return status;
  }
};

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

// Function to map database customers to the app Customer type
const mapDatabaseCustomers = (dbCustomers: any[]): Customer[] => {
  return dbCustomers.map(dbCustomer => ({
    id: dbCustomer.id,
    company_name: dbCustomer.company_name,
    first_name: dbCustomer.first_name,
    last_name: dbCustomer.last_name,
    email: dbCustomer.email || '',
    telephone: dbCustomer.telephone || '',
    status: dbCustomer.status || 'inactive',
    created_at: dbCustomer.created_at,
    offers_count: dbCustomer.offers?.length || 0,
    offers: dbCustomer.offers?.map(offer => ({
      id: offer.id,
      name: `Προσφορά ${offer.id.substring(0, 4)}`,
      value: parseFloat(offer.amount) || 0,
      date: offer.created_at,
      status: offer.offer_result || 'pending',
      requirements: offer.customer_comments,
      result: offer.result
    })) || []
  }));
};

const EnhancedCustomersPage: React.FC = () => {
  const navigate = useNavigate();
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch customers from Supabase
  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Query exactly matches what's in the original CustomerPage
      const { data: dbCustomers, error } = await supabase
        .from('customers')
        .select(`
          id,
          company_name,
          email,
          telephone,
          status,
          created_at,
          offers(
            id,
            customer_id,
            created_at,
            source,
            amount,
            offer_result,
            result,
            customer_comments,
            our_comments,
            deleted_at
          )
        `)
        .is('deleted_at', null)
        .order('company_name', { ascending: true });
        
      if (error) {
        console.error('Error fetching customers:', error);
        setError(`Σφάλμα φόρτωσης πελατών: ${error.message}`);
        return;
      }
      
      // Map the database customers to the application's Customer type
      const mappedCustomers = mapDatabaseCustomers(dbCustomers || []);
      setCustomers(mappedCustomers);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(`Απρόσμενο σφάλμα: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Handle customer click
  const handleCustomerClick = (customer: Customer) => {
    console.log('Customer clicked:', customer);
    // Add navigation or other handling here
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-[#2f3e46] rounded-lg p-6 shadow-md">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-[#cad2c5]">Πελάτες</h1>
              <Button
                onClick={() => navigate('/customers/new')}
                className="bg-[#84a98c] text-[#2f3e46] hover:bg-[#84a98c]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Νέος Πελάτης
              </Button>
            </div>
            
            {error && (
              <div className="text-red-500 mb-4">
                {error}
              </div>
            )}
          </div>

          <VirtualCustomersTable
            customers={customers}
            isLoading={isLoading}
            onCustomerClick={handleCustomerClick}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EnhancedCustomersPage; 