import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  FileText,
  Phone,
  Clock,
  X,
  Search,
} from "lucide-react";
import { Button } from "../ui/button";
import { SearchBar } from "../ui/search-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { supabase } from "@/lib/supabase";
import { DataTableBase } from "@/components/ui/data-table-base";
import { formatDateTime } from "@/lib/utils";
import { CloseButton } from "@/components/ui/close-button";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  onClick?: () => void;
  isClickable?: boolean;
}

const MetricCard = ({
  title = "Metric",
  value = "0",
  change = 0,
  icon,
  onClick,
  isClickable = false,
}: MetricCardProps) => {
  const isPositive = change >= 0;

  return (
    <Card 
      className={`bg-[#354f52] border-[#52796f] ${isClickable ? 'cursor-pointer hover:bg-[#2f3e46] transition-colors' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-bold text-[#84a98c]">
          {title.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </CardTitle>
        <div className="h-5 w-5 text-[#84a98c]">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#cad2c5]">{value}</div>
        <div className="flex items-center text-sm">
          {isPositive ? (
            <span className="mr-1 text-emerald-400">▲</span>
          ) : (
            <span className="mr-1 text-red-500">▼</span>
          )}
          <span className={isPositive ? "text-emerald-400" : "text-red-500"}>
            {Math.abs(change)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

interface MetricCardsProps {
  metrics?: {
    title: string;
    value: string;
    change: number;
    icon: React.ReactNode;
  }[];
}

interface Customer {
  id: string;
  company_name: string;
  created_at: string;
  status: string;
  [key: string]: any;
}

const MetricCards = ({ metrics }: MetricCardsProps) => {
  const [showCustomerTable, setShowCustomerTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("company_name");
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerMetrics, setCustomerMetrics] = useState({
    count: 0,
    percentChange: 0,
    customers: [] as Customer[]
  });

  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        // First, fetch all customers
        const { data: customersData, error: customersError } = await supabase
          .from("customers")
          .select("*")
          .order('created_at', { ascending: false });

        if (customersError) throw customersError;

        // Get all unique primary_contact_ids that are not null
        const primaryContactIds = customersData
          ?.filter(c => c.primary_contact_id)
          .map(c => c.primary_contact_id);

        // If there are primary contacts, fetch them
        let contactsMap = {};
        if (primaryContactIds && primaryContactIds.length > 0) {
          // Batch the requests to avoid URL length limitations
          const batchSize = 10;
          const batches = [];
          
          for (let i = 0; i < primaryContactIds.length; i += batchSize) {
            batches.push(primaryContactIds.slice(i, i + batchSize));
          }
          
          // Process each batch
          for (const batch of batches) {
            const { data: contactsData, error: contactsError } = await supabase
              .from("contacts")
              .select("id, full_name, email, telephone")
              .in("id", batch);
              
            if (contactsError) throw contactsError;
            
            // Add to the contacts map
            (contactsData || []).forEach(contact => {
              contactsMap[contact.id] = contact;
            });
          }
        }

        // Combine the data
        const enrichedCustomers = customersData?.map(customer => ({
          ...customer,
          primary_contact: customer.primary_contact_id ? contactsMap[customer.primary_contact_id] : null
        }));

        setCustomers(enrichedCustomers || []);
        calculateCustomerMetrics(enrichedCustomers || []);
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Calculate customers for current and previous month
  const calculateCustomerMetrics = (customersData: Customer[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    console.log('Total customers:', customersData.length);
    console.log('Current month/year:', currentMonth, currentYear);
    
    // Check for customers that might be on the edge of the date range
    console.log('Checking for edge cases:');
    customersData.forEach(customer => {
      const customerDate = new Date(customer.created_at);
      // Check if the customer is created on the last day of February or first day of March
      const month = customerDate.getUTCMonth();
      const day = customerDate.getUTCDate();
      
      if ((month === 1 && day >= 28) || (month === 2 && day <= 1)) {
        console.log(`EDGE CASE: ${customer.company_name}, Date: ${customer.created_at}, Month: ${month}, Day: ${day}`);
      }
    });
    
    // Simple approach: just check if the year and month match
    const currentMonthCustomers = customersData.filter(customer => {
      const customerDate = new Date(customer.created_at);
      const customerMonth = customerDate.getUTCMonth();
      const customerYear = customerDate.getUTCFullYear();
      
      console.log(`Customer ${customer.company_name}: Month: ${customerMonth}, Year: ${customerYear}`);
      
      const isCurrentMonth = customerMonth === currentMonth && customerYear === currentYear;
      
      if (isCurrentMonth) {
        console.log(`✅ ${customer.company_name} is in current month (${currentMonth}/${currentYear})`);
      } else {
        console.log(`❌ ${customer.company_name} is NOT in current month (${customerMonth}/${customerYear} vs ${currentMonth}/${currentYear})`);
      }
      
      return isCurrentMonth;
    });
    
    // Simple approach for previous month
    const previousMonthCustomers = customersData.filter(customer => {
      const customerDate = new Date(customer.created_at);
      const customerMonth = customerDate.getUTCMonth();
      const customerYear = customerDate.getUTCFullYear();
      
      return customerMonth === previousMonth && customerYear === previousYear;
    });
    
    const currentMonthCount = currentMonthCustomers.length;
    const previousMonthCount = previousMonthCustomers.length;
    
    console.log('Current month customers:', currentMonthCount);
    console.log('Previous month customers:', previousMonthCount);
    
    // Calculate percentage change
    let percentChange = 0;
    if (previousMonthCount > 0) {
      percentChange = ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100;
    } else if (currentMonthCount > 0) {
      percentChange = 100; // If previous month was 0, and current month has customers, that's a 100% increase
    }
    
    // Format the percentage to 1 decimal place
    setCustomerMetrics({
      count: currentMonthCount,
      percentChange: parseFloat(percentChange.toFixed(1)),
      customers: currentMonthCustomers
    });
  };

  // Define columns for the DataTable
  const columns = [
    { 
      header: "Επωνυμία", 
      accessor: "company_name", 
      type: "name" as const 
    },
    { 
      header: "Τηλέφωνο", 
      accessor: "telephone", 
      type: "default" as const 
    },
    { 
      header: "Email", 
      accessor: "email", 
      type: "default" as const 
    },
    { 
      header: "Διεύθυνση", 
      accessor: "address", 
      type: "default" as const 
    },
    { 
      header: "ΤΚ", 
      accessor: "postal_code", 
      type: "default" as const 
    },
    { 
      header: "Κύρια Επαφή", 
      accessor: "primary_contact_id", 
      type: "name" as const,
      cell: (value, row) => row.primary_contact ? row.primary_contact.full_name : "-"
    },
    { 
      header: "Ημερομηνία Δημιουργίας", 
      accessor: "created_at", 
      type: "date" as const,
      cell: (value) => formatDateTime(value)
    }
  ];

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // Toggle customer table
  const toggleCustomerTable = () => {
    setShowCustomerTable(!showCustomerTable);
    if (!showCustomerTable) {
      // When opening the table, show all customers from the current month
      setFilteredCustomers(customerMetrics.customers);
      setSearchTerm("");
      setSearchColumn("company_name");
    }
  };

  // Filter customers based on search term and column
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customerMetrics.customers);
      return;
    }

    const filtered = customerMetrics.customers.filter(customer => {
      const searchLower = searchTerm.toLowerCase();
      
      // Special case for primary contact
      if (searchColumn === 'primary_contact_id' && customer.primary_contact) {
        return customer.primary_contact.full_name.toLowerCase().includes(searchLower);
      }
      
      // Handle regular properties
      return customer[searchColumn] && 
             String(customer[searchColumn]).toLowerCase().includes(searchLower);
    });
    
    setFilteredCustomers(filtered);
  }, [searchTerm, searchColumn, customerMetrics.customers]);

  const defaultMetrics = [
    {
      title: "Νέοι Πελάτες\n(Τρέχων Μήνας)",
      value: customerMetrics.count.toString(),
      change: customerMetrics.percentChange,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Ενεργές Προσφορές",
      value: "156",
      change: -3.2,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: "Σημερινές Κλήσεις",
      value: "45",
      change: 8.4,
      icon: <Phone className="h-4 w-4" />,
    },
    {
      title: "Εκκρεμείς Εργασίες",
      value: "12",
      change: -5.5,
      icon: <Clock className="h-4 w-4" />,
    },
  ];

  const displayMetrics = metrics || defaultMetrics;

  return (
    <div>
      <h2 className="text-3xl font-bold mb-4 text-[#cad2c5]">Στατιστικά</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          key={0}
          title={displayMetrics[0].title}
          value={displayMetrics[0].value}
          change={displayMetrics[0].change}
          icon={displayMetrics[0].icon}
          onClick={toggleCustomerTable}
          isClickable={true}
        />
        {displayMetrics.slice(1).map((metric, index) => (
          <MetricCard
            key={index + 1}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            icon={metric.icon}
          />
        ))}
      </div>

      {showCustomerTable && (
        <div className="mt-8 bg-[#2f3e46] p-4 rounded-lg border border-[#52796f]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#cad2c5]">
              Νέοι Πελάτες ({filteredCustomers.length})
            </h2>
            
            <div className="flex-1 flex justify-center mx-4">
              <SearchBar
                onChange={handleSearch}
                value={searchTerm}
                options={[
                  { value: 'company_name', label: 'Επωνυμία' },
                  { value: 'telephone', label: 'Τηλέφωνο' },
                  { value: 'email', label: 'Email' },
                  { value: 'address', label: 'Διεύθυνση' },
                  { value: 'postal_code', label: 'ΤΚ' },
                  { value: 'primary_contact_id', label: 'Κύρια Επαφή' }
                ]}
                selectedColumn={searchColumn}
                onColumnChange={(column) => setSearchColumn(column)}
              />
            </div>
            
            <CloseButton 
              size="md"
              onClick={toggleCustomerTable}
            />
          </div>
          
          <DataTableBase
            columns={columns}
            data={filteredCustomers}
            isLoading={loading}
            defaultSortColumn="created_at"
            defaultSortDirection="desc"
            searchTerm={searchTerm}
            searchColumn={searchColumn}
            containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
            rowClassName="hover:bg-[#354f52]/50 cursor-pointer group"
          />
        </div>
      )}
    </div>
  );
};

export default MetricCards;
