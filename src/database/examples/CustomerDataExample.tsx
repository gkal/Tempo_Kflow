import React, { useEffect, useState } from 'react';
import { db } from '@/database';
import type { Customer } from '@/services/api/types';

/**
 * Example component demonstrating how to use the centralized data service
 * for customer data management.
 * 
 * This shows how to:
 * - Fetch all customers
 * - Get a specific customer
 * - Create a new customer
 * - Update a customer
 * - Soft delete a customer
 * - Restore a deleted customer
 * - Search customers
 */
export const CustomerDataExample: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Example: Fetch all active customers
  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await db.customers.getAll({
        // Optional parameters for sorting, filtering, etc.
        order: { column: 'company_name', ascending: true },
        limit: 50
      });

      if (error) {
        setError(error.message);
        return;
      }

      setCustomers(data || []);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Example: Get a specific customer by ID
  const getCustomerById = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await db.customers.getById(id);

      if (error) {
        setError(error.message);
        return null;
      }

      return data;
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Example: Create a new customer
  const createCustomer = async (customerData: Partial<Customer>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await db.customers.create(customerData);

      if (error) {
        setError(error.message);
        return null;
      }

      // Refresh the customer list
      await fetchCustomers();
      return data;
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Example: Update an existing customer
  const updateCustomer = async (id: string, customerData: Partial<Customer>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await db.customers.update(id, customerData);

      if (error) {
        setError(error.message);
        return null;
      }

      // Refresh the customer list
      await fetchCustomers();
      return data;
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Example: Soft delete a customer
  const deleteCustomer = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await db.customers.softDelete(id);

      if (error) {
        setError(error.message);
        return false;
      }

      // Refresh the customer list
      await fetchCustomers();
      return true;
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Example: Restore a deleted customer
  const restoreCustomer = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await db.customers.restore(id);

      if (error) {
        setError(error.message);
        return false;
      }

      // Refresh the customer list
      await fetchCustomers();
      return true;
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Example: Search customers by name
  const searchCustomers = async (searchTerm: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await db.customers.search(
        searchTerm,
        ['company_name', 'contact_name', 'email'], // Fields to search in
        {
          order: { column: 'company_name', ascending: true }
        }
      );

      if (error) {
        setError(error.message);
        return;
      }

      setCustomers(data || []);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Example usage in a component
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Customer Management</h1>
      
      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      
      <div className="mb-6 flex gap-2">
        <input 
          type="text" 
          placeholder="Search customers..." 
          className="px-3 py-2 border rounded-md"
          onChange={(e) => searchCustomers(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-green-500 text-white rounded-md"
          onClick={() => createCustomer({ 
            company_name: 'New Company', 
            email: 'contact@newcompany.com' 
          })}
        >
          Add Customer
        </button>
      </div>
      
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Company</th>
            <th className="border p-2 text-left">Email</th>
            <th className="border p-2 text-left">Phone</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-b">
              <td className="p-2">{customer.company_name}</td>
              <td className="p-2">{customer.email || '-'}</td>
              <td className="p-2">{customer.phone || '-'}</td>
              <td className="p-2 flex gap-2">
                <button
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md"
                  onClick={() => updateCustomer(customer.id, { 
                    company_name: `${customer.company_name} (Updated)` 
                  })}
                >
                  Edit
                </button>
                <button
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded-md"
                  onClick={() => deleteCustomer(customer.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {customers.length === 0 && !loading && (
            <tr>
              <td colSpan={4} className="p-4 text-center text-gray-500">
                No customers found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}; 