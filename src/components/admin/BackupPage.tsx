import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { Database, Users, FileText, CheckSquare, Building, User, Briefcase, FileSpreadsheet, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the tables to backup
const TABLES_TO_BACKUP = [
  { id: "customers", name: "Πελάτες", icon: Building },
  { id: "contacts", name: "Επαφές", icon: User },
  { id: "contact_positions", name: "Θέσεις Επαφών", icon: Briefcase },
  { id: "departments", name: "Τμήματα", icon: Building },
  { id: "offers", name: "Προσφορές", icon: FileText },
  { id: "tasks", name: "Εργασίες", icon: CheckSquare },
];

// Define the export format options
const EXPORT_FORMATS = [
  { id: "json", name: "JSON" },
  { id: "csv", name: "Excel (CSV)" },
];

export default function BackupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");
  const [lastBackupDates, setLastBackupDates] = useState<Record<string, string>>({});
  const [exportFormat, setExportFormat] = useState<string>("json");
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [customerMap, setCustomerMap] = useState<Record<string, string>>({});
  const [contactMap, setContactMap] = useState<Record<string, string>>({});
  const [positionMap, setPositionMap] = useState<Record<string, string>>({});
  const [departmentMap, setDepartmentMap] = useState<Record<string, string>>({});

  // Check if user is admin
  useEffect(() => {
    if (user?.role?.toLowerCase() !== "admin") {
      navigate("/dashboard");
    } else {
      setIsAdmin(true);
      // Get record counts for each table
      fetchRecordCounts();
      // Skip reference data loading for now - we'll do it during export
    }
  }, [user, navigate]);

  // Fetch record counts for each table
  const fetchRecordCounts = async () => {
    const counts: Record<string, number> = {};
    
    for (const table of TABLES_TO_BACKUP) {
      try {
        const { count, error } = await supabase
          .from(table.id)
          .select("*", { count: "exact", head: true });
        
        if (error) {
          console.error(`Error fetching count for ${table.id}:`, error);
          counts[table.id] = 0;
        } else {
          counts[table.id] = count || 0;
        }
      } catch (error) {
        console.error(`Error fetching count for ${table.id}:`, error);
        counts[table.id] = 0;
      }
    }
    
    setRecordCounts(counts);
  };

  // Enrich data with readable values - simplified version that doesn't rely on reference data
  const enrichData = (tableId: string, data: any[]) => {
    if (!data || data.length === 0) return data;
    
    return data.map(record => {
      // Create a copy of the record with all fields preserved
      return { ...record };
    });
  };

  // Convert JSON to CSV
  const convertToCSV = (objArray: any[]) => {
    if (objArray.length === 0) return '';
    
    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    
    const fields = Object.keys(objArray[0]);
    
    // Create header row
    let csv = BOM + fields.join(';') + '\n';
    
    // Add data rows
    objArray.forEach(obj => {
      const row = fields.map(field => {
        const value = obj[field];
        
        // Handle different data types
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object') {
          // Convert objects to JSON strings and escape quotes
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        } else if (typeof value === 'string') {
          // Escape quotes in strings and handle special characters
          return `"${value.replace(/"/g, '""')}"`;
        } else {
          return value;
        }
      }).join(';');
      
      csv += row + '\n';
    });
    
    return csv;
  };

  // Export a single table
  const exportTable = async (tableId: string) => {
    setCurrentTable(tableId);
    const tableName = TABLES_TO_BACKUP.find(t => t.id === tableId)?.name || tableId;
    
    try {
      // For large tables, we need to paginate
      let allRecords: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error, count } = await supabase
          .from(tableId)
          .select("*")
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          allRecords = [...allRecords, ...data];
          page++;
          
          // Update progress
          const totalCount = recordCounts[tableId] || 0;
          const progressPercent = Math.min(100, Math.round((allRecords.length / totalCount) * 100));
          setProgress(progressPercent);
        } else {
          hasMore = false;
        }
      }
      
      // Enrich data with readable values
      const enrichedRecords = enrichData(tableId, allRecords);
      
      // Save the data to tableData state
      setTableData(prev => ({
        ...prev,
        [tableId]: enrichedRecords
      }));
      
      // Create a downloadable file based on selected format
      if (exportFormat === "json") {
        // Export as JSON
        const dataStr = JSON.stringify(enrichedRecords, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tableId}_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (exportFormat === "csv") {
        // Export as CSV
        const csvData = convertToCSV(enrichedRecords);
        const dataBlob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tableId}_backup_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      // Save the last backup date
      const now = new Date().toLocaleString();
      setLastBackupDates(prev => ({
        ...prev,
        [tableId]: now
      }));
      
      // Store the last backup date in localStorage
      const storedDates = JSON.parse(localStorage.getItem("lastBackupDates") || "{}");
      localStorage.setItem("lastBackupDates", JSON.stringify({
        ...storedDates,
        [tableId]: now
      }));
      
      return true;
    } catch (error) {
      console.error(`Error exporting ${tableName}:`, error);
      toast({
        title: "Σφάλμα",
        description: `Σφάλμα κατά την εξαγωγή του πίνακα ${tableName}`,
        variant: "destructive"
      });
      return false;
    }
  };

  // Export all tables
  const exportAllTables = async () => {
    setLoading(true);
    setProgress(0);
    
    for (let i = 0; i < TABLES_TO_BACKUP.length; i++) {
      const table = TABLES_TO_BACKUP[i];
      const success = await exportTable(table.id);
      
      // Update overall progress
      const overallProgress = Math.round(((i + 1) / TABLES_TO_BACKUP.length) * 100);
      setProgress(overallProgress);
      
      if (!success) {
        setLoading(false);
        return;
      }
    }
    
    setLoading(false);
    toast({
      title: "Επιτυχία",
      description: "Όλοι οι πίνακες εξήχθησαν επιτυχώς",
    });
  };

  // Load last backup dates from localStorage on component mount
  useEffect(() => {
    const storedDates = JSON.parse(localStorage.getItem("lastBackupDates") || "{}");
    setLastBackupDates(storedDates);
  }, []);

  if (!isAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-4">
          Δεν έχετε πρόσβαση σε αυτή τη σελίδα
        </h1>
        <p className="text-[#cad2c5]">
          Μόνο οι διαχειριστές έχουν πρόσβαση στη σελίδα αντιγράφων ασφαλείας.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center mb-6">
        <Database className="h-6 w-6 mr-2 text-[#cad2c5]" />
        <h1 className="text-2xl font-bold text-[#cad2c5]">
          Αντίγραφα Ασφαλείας Βάσης Δεδομένων
        </h1>
      </div>
      
      <Card className="mb-6 bg-[#354f52] text-[#cad2c5] border-[#52796f]">
        <CardHeader>
          <CardTitle>Εξαγωγή Δεδομένων</CardTitle>
          <CardDescription className="text-[#84a98c]">
            Δημιουργήστε αντίγραφα ασφαλείας των δεδομένων της εφαρμογής
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Αυτή η λειτουργία σας επιτρέπει να εξάγετε τα δεδομένα από όλους τους πίνακες της βάσης δεδομένων.
            Τα αρχεία θα αποθηκευτούν στον υπολογιστή σας και μπορείτε να τα χρησιμοποιήσετε για να επαναφέρετε τα δεδομένα αν χρειαστεί.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Μορφή Εξαγωγής</label>
            <Select
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value)}
            >
              <SelectTrigger className="w-full md:w-[200px] bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
                <SelectValue placeholder="Επιλέξτε μορφή" />
              </SelectTrigger>
              <SelectContent className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
                {EXPORT_FORMATS.map((format) => (
                  <SelectItem key={format.id} value={format.id}>
                    {format.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {loading && (
            <div className="mb-4">
              <p className="mb-2">Εξαγωγή πίνακα: {TABLES_TO_BACKUP.find(t => t.id === currentTable)?.name || currentTable}</p>
              <Progress value={progress} className="h-2 bg-[#2f3e46]" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            onClick={exportAllTables} 
            disabled={loading}
            className="bg-[#52796f] hover:bg-[#84a98c] text-[#cad2c5]"
          >
            <Download className="h-4 w-4 mr-2" />
            Εξαγωγή Όλων των Πινάκων
          </Button>
        </CardFooter>
      </Card>
      
      <h2 className="text-xl font-bold text-[#cad2c5] mb-4">Πίνακες Βάσης Δεδομένων</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TABLES_TO_BACKUP.map((table) => (
          <Card key={table.id} className="bg-[#354f52] text-[#cad2c5] border-[#52796f]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <table.icon className="h-5 w-5 mr-2 text-[#84a98c]" />
                  <CardTitle className="text-lg">{table.name}</CardTitle>
                </div>
                <span className="text-sm text-[#84a98c] font-mono">
                  {recordCounts[table.id] || 0} εγγραφές
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {lastBackupDates[table.id] && (
                <p className="text-xs text-[#84a98c]">
                  Τελευταίο αντίγραφο: {lastBackupDates[table.id]}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => exportTable(table.id)} 
                disabled={loading}
                variant="outline" 
                size="sm"
                className="w-full border-[#52796f] text-[#cad2c5] hover:bg-[#52796f] hover:text-[#cad2c5]"
              >
                {exportFormat === "csv" ? (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Εξαγωγή
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 