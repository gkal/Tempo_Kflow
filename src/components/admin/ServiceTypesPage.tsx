import { useState, useEffect } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTableBase } from "@/components/ui/data-table-base";
import { Plus, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/utils";
import ReactDOM from "react-dom";

// Extend Window interface to include our custom property
declare global {
  interface Window {
    dotsObserver?: MutationObserver;
  }
}

// Define the service category interface
interface ServiceCategory {
  id: string;
  category_name: string;
  date_created: string;
  date_updated: string | null;
  user_create: string;
  user_updated: string | null;
}

// Define the service subcategory interface
interface ServiceSubcategory {
  id: string;
  subcategory_name: string;
  category_id: string;
  date_created: string;
  date_updated: string | null;
  user_create: string;
  user_updated: string | null;
}

// Define the combined type for display in the table
interface CategoryWithSubcategories extends ServiceCategory {
  isSubcategory?: boolean;
  parentId?: string;
}

// Define the department interface
interface Department {
  id: string;
  name: string;
  created_at: string;
  column_id?: number; // Add this as it was shown in the SQL output
  text?: string;      // Add this as it was shown in the SQL output
}

// Category Context Menu Props
interface CategoryContextMenuProps {
  children: React.ReactNode;
  categoryId: string;
  onCreateSubcategory: (categoryId: string) => void;
}

// Category Context Menu Component
function CategoryContextMenu({
  children,
  categoryId,
  onCreateSubcategory,
}: CategoryContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = React.useRef<HTMLDivElement>(null);
  
  // Set up global context menu handler
  useEffect(() => {
    // Function to handle right-click on any element with data-category-id
    const handleGlobalContextMenu = (e: MouseEvent) => {
      // Find the closest element with data-category-id attribute
      const target = e.target as HTMLElement;
      const categoryElement = target.closest('[data-category-id]');
      
      // If we found an element with our attribute and it matches our categoryId
      if (categoryElement && categoryElement.getAttribute('data-category-id') === categoryId) {
        e.preventDefault();
        
        // Set the position of the menu
        setMenuPosition({
          top: e.clientY,
          left: e.clientX
        });
        
        // Open the menu
        setIsOpen(true);
        
        // Add the force-hover class to the row
        const row = target.closest('tr');
        if (row) {
          row.classList.add('force-hover');
        }
      }
    };
    
    // Add the event listener to the document
    document.addEventListener('contextmenu', handleGlobalContextMenu);
    
    // Clean up
    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
    };
  }, [categoryId]);
  
  // Handle click outside to close the menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        
        // Remove the force-hover class from all rows
        document.querySelectorAll('tr.force-hover').forEach(row => {
          row.classList.remove('force-hover');
        });
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Add data-category-id to children
  const childrenWithAttribute = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // Use a type assertion to avoid the linter error
      return React.cloneElement(child, {
        'data-category-id': categoryId
      } as React.HTMLAttributes<HTMLElement>);
    }
    return child;
  });

  // Render the context menu
  const renderContextMenu = () => {
    if (!isOpen) return null;
    
    return ReactDOM.createPortal(
      <div 
        ref={menuRef}
        className="dropdown-menu" 
        style={{
          position: 'fixed',
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
          minWidth: '220px',
          zIndex: 9999,
          backgroundColor: '#2f3e46',
          border: '1px solid #52796f',
          borderRadius: '4px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          padding: '0',
          overflow: 'hidden',
          fontSize: '0.8125rem'
        }}
      >
        {/* Menu items */}
        <div 
          className="dropdown-item py-2 px-3 hover:bg-[#354f52] cursor-pointer"
          onClick={() => {
            onCreateSubcategory(categoryId);
            setIsOpen(false);
            document.querySelectorAll('tr.force-hover').forEach(row => {
              row.classList.remove('force-hover');
            });
          }}
        >
          <div className="flex items-center">
            <Plus className="h-4 w-4 mr-2 text-[#84a98c]" />
            <span>Δημιουργία νέας περιγραφής</span>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      {childrenWithAttribute}
      {renderContextMenu()}
    </>
  );
}

export default function ServiceTypesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if user is admin or super user
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const isSuperUser = user?.role === "Super User" || user?.role?.toLowerCase() === "super user";
  const hasEditPermission = isAdmin || isSuperUser;

  // Add custom CSS for textareas
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .service-type-textarea {
        min-height: 100px !important;
        height: 100px !important;
        max-height: none !important;
      }
      
      .service-type-textarea:hover,
      .service-type-textarea:focus,
      .service-type-textarea:active {
        min-height: 100px !important;
        height: 100px !important;
        max-height: none !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Check permissions on component mount
  useEffect(() => {
    if (!hasEditPermission) {
      navigate("/dashboard");
    }
  }, [user, navigate, hasEditPermission]);

  // Add a script to the page that will run on every render
  useEffect(() => {
    const uniqueId = Math.random().toString(36).substring(2, 11);
    const script = document.createElement('script');
    script.textContent = `
      // Fix all dots in the application
      function fixAllDots() {
        document.querySelectorAll('span').forEach(span => {
          if (span.textContent && (span.textContent.includes('...') || span.textContent.includes('....'))) {
            span.style.color = '#60a5fa';
          }
        });
      }
      
      // Run immediately and on any DOM changes
      fixAllDots();
      
      // Set up a MutationObserver to watch for DOM changes
      // Use a unique variable name that won't conflict
      window.dotsObserver = window.dotsObserver || new MutationObserver(fixAllDots);
      
      // Disconnect any existing observer before creating a new one
      if (window.dotsObserver) {
        window.dotsObserver.disconnect();
      }
      
      // Start observing
      window.dotsObserver.observe(document.body, { 
        childList: true, 
        subtree: true,
        characterData: true,
        attributes: true
      });
    `;
    script.id = `dots-script-${uniqueId}`;
    document.head.appendChild(script);
    
    return () => {
      const scriptElement = document.getElementById(`dots-script-${uniqueId}`);
      if (scriptElement) {
        document.head.removeChild(scriptElement);
      }
      
      // Clean up the observer when component unmounts
      if (window.dotsObserver) {
        window.dotsObserver.disconnect();
      }
    };
  }, []);

  // Global fix for all truncation dots
  useEffect(() => {
    const fixAllTruncationDots = () => {
      // Target all potential dots in the entire component - using standard selectors
      const allDots = document.querySelectorAll('.text-green-400, .text-green-300, [class*="text-green"]');
      
      // Then manually check all spans for dots
      document.querySelectorAll('span').forEach(span => {
        const text = span.textContent || '';
        if (text.includes('...')) {
          // Force blue color on all dots
          (span as HTMLElement).style.color = '#60a5fa';
        }
      });
    };

    // Run on mount and periodically
    fixAllTruncationDots();
    const truncationInterval = setInterval(fixAllTruncationDots, 200);
    
    return () => clearInterval(truncationInterval);
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="flex w-full bg-[#2f3e46] p-0 h-auto justify-start border-0">
          <TabsTrigger 
            value="categories" 
            className="px-4 py-2 text-[#cad2c5] font-normal data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-b-[#84a98c] data-[state=active]:font-normal hover:bg-[#52796f] hover:text-[#cad2c5]"
          >
            Εργασίες σε προσφορές
          </TabsTrigger>
          <TabsTrigger 
            value="units" 
            className="px-4 py-2 text-[#cad2c5] font-normal data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-b-[#84a98c] data-[state=active]:font-normal hover:bg-[#52796f] hover:text-[#cad2c5]"
          >
            Μονάδες Μέτρησης
          </TabsTrigger>
          <TabsTrigger 
            value="departments" 
            className="px-4 py-2 text-[#cad2c5] font-normal data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-b-[#84a98c] data-[state=active]:font-normal hover:bg-[#52796f] hover:text-[#cad2c5]"
          >
            Τμήματα
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories" className="mt-0 border-t-0">
          <CategoriesTab />
        </TabsContent>
        
        <TabsContent value="units" className="mt-0 border-t-0">
          <UnitsTab />
        </TabsContent>
        
        <TabsContent value="departments" className="mt-0 border-t-0">
          <DepartmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoriesTab() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showSubcategoryDialog, setShowSubcategoryDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryWithSubcategories | null>(null);
  const [currentParentCategory, setCurrentParentCategory] = useState<ServiceCategory | null>(null);
  const [formData, setFormData] = useState({
    category_name: "",
    subcategory_name: "",
  });
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Function to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    
    return (
      <div className="flex items-center relative group">
        <span className="whitespace-nowrap">
          {text.substring(0, maxLength)}
        </span>
        <span className="text-blue-400 ml-1 flex-shrink-0 pointer-events-none">
          ....
        </span>
        <div className="tooltip-container">
          <div className="absolute transform -translate-x-1/4 bottom-0 translate-y-full bg-[#2f3e46] border border-[#52796f] p-1.5 rounded-md shadow-lg text-[#cad2c5] text-xs z-50 w-auto min-w-[500px] max-w-[800px] whitespace-normal opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            {text}
            <div className="absolute w-2 h-2 bg-[#2f3e46] border-r border-b border-[#52796f] -rotate-[135deg] -top-1 left-1/4 transform -translate-x-1/2"></div>
          </div>
        </div>
      </div>
    );
  };

  // Remove the effect for tooltip positioning since we're always showing it below
  useEffect(() => {
    // No need to check position since tooltip is always below
    const handleTooltipPosition = () => {
      // Keep this empty but available in case we need to add logic later
    };
    
    window.addEventListener('resize', handleTooltipPosition);
    
    return () => {
      window.removeEventListener('resize', handleTooltipPosition);
    };
  }, [categories]);

  // Fix for truncation dots
  useEffect(() => {
    // Fix any green dots by making them blue
    const fixTruncationDots = () => {
      const greenDots = document.querySelectorAll('.text-green-400, .text-green-300');
      greenDots.forEach(dot => {
        if (dot.textContent?.includes('....')) {
          (dot as HTMLElement).style.color = '#60a5fa';
        }
      });
    };

    // Run initially and after data loads
    fixTruncationDots();
    if (!loading) {
      setTimeout(fixTruncationDots, 100);
    }
  }, [loading, categories]);

  // Set up real-time subscription for service categories
  useRealtimeSubscription(
    {
      table: 'service_categories',
      event: '*',
    },
    (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        fetchCategories(); // Refresh the list
      }
    },
    []
  );

  // Set up real-time subscription for service subcategories
  useRealtimeSubscription(
    {
      table: 'service_subcategories',
      event: '*',
    },
    (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        fetchCategories(); // Refresh the list
      }
    },
    []
  );

  // Fetch service categories and subcategories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("service_categories")
        .select("*")
        .order("category_name", { ascending: true });

      if (categoriesError) throw categoriesError;
      
      // Fetch subcategories
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from("service_subcategories")
        .select("*")
        .order("subcategory_name", { ascending: true });

      if (subcategoriesError) throw subcategoriesError;
      
      setSubcategories(subcategoriesData || []);
      
      // Combine categories and subcategories for display
      const combinedData: CategoryWithSubcategories[] = [];
      
      // Process each category and its subcategories
      categoriesData?.forEach(category => {
        // Add the main category
        combinedData.push({
          ...category,
          isSubcategory: false
        });
        
        // Find and add subcategories under their parent
        const relatedSubcategories = subcategoriesData?.filter(
          sub => sub.category_id === category.id
        ) || [];
        
        relatedSubcategories.forEach(subcategory => {
          combinedData.push({
            id: subcategory.id,
            category_name: subcategory.subcategory_name,
            date_created: subcategory.date_created,
            date_updated: subcategory.date_updated,
            user_create: subcategory.user_create,
            user_updated: subcategory.user_updated,
            isSubcategory: true,
            parentId: subcategory.category_id
          });
        });
      });
      
      setCategories(combinedData || []);
    } catch (error) {
      console.error("Error fetching service categories:", error);
      setFormMessage({
        type: "error",
        text: "Υπήρξε πρόβλημα κατά την ανάκτηση των κατηγοριών εργασιών."
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission for category
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    
    if (!formData.category_name.trim()) {
      setFormMessage({
        type: "error",
        text: "Το όνομα κατηγορίας είναι υποχρεωτικό."
      });
      return;
    }
    
    try {
      if (currentCategory && !currentCategory.isSubcategory) {
        // Update existing category
        const { error } = await supabase
          .from("service_categories")
          .update({
            category_name: formData.category_name,
            date_updated: new Date().toISOString(),
            user_updated: user?.id,
          })
          .eq("id", currentCategory.id);

        if (error) throw error;
        
        setFormMessage({
          type: "success",
          text: "Η κατηγορία ενημερώθηκε με επιτυχία."
        });
      } else if (currentCategory && currentCategory.isSubcategory) {
        // Update existing subcategory
        const { error } = await supabase
          .from("service_subcategories")
          .update({
            subcategory_name: formData.category_name,
            date_updated: new Date().toISOString(),
            user_updated: user?.id,
          })
          .eq("id", currentCategory.id);

        if (error) throw error;
        
        setFormMessage({
          type: "success",
          text: "Η περιγραφή ενημερώθηκε με επιτυχία."
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from("service_categories")
          .insert({
            category_name: formData.category_name,
            date_created: new Date().toISOString(),
            user_create: user?.id,
          });

        if (error) throw error;
        
        setFormMessage({
          type: "success",
          text: "Η κατηγορία δημιουργήθηκε με επιτυχία."
        });
      }
      
      // Refresh the list
      fetchCategories();
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({ category_name: "", subcategory_name: "" });
        setCurrentCategory(null);
        setShowDialog(false);
        setFormMessage(null);
      }, 1000);
    } catch (error) {
      console.error("Error saving service category:", error);
      setFormMessage({
        type: "error",
        text: "Υπήρξε πρόβλημα κατά την αποθήκευση της κατηγορίας."
      });
    }
  };

  // Handle form submission for subcategory
  const handleSubmitSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    
    if (!formData.subcategory_name.trim()) {
      setFormMessage({
        type: "error",
        text: "Η περιγραφή κατηγορίας είναι υποχρεωτική."
      });
      return;
    }
    
    try {
      // Create new subcategory
      const { error } = await supabase
        .from("service_subcategories")
        .insert({
          subcategory_name: formData.subcategory_name,
          category_id: currentParentCategory?.id,
          date_created: new Date().toISOString(),
          user_create: user?.id,
        });

      if (error) throw error;
      
      // Show success message
      setFormMessage({
        type: "success",
        text: "Η περιγραφή δημιουργήθηκε με επιτυχία."
      });
      
      // Refresh the list
      fetchCategories();
      
      // Reset form after successful submission with a delay
      setTimeout(() => {
        setFormData({ category_name: "", subcategory_name: "" });
        setCurrentParentCategory(null);
        setShowSubcategoryDialog(false);
        setFormMessage(null);
      }, 1000);
    } catch (error) {
      console.error("Error saving service subcategory:", error);
      setFormMessage({
        type: "error",
        text: "Υπήρξε πρόβλημα κατά την αποθήκευση της περιγραφής."
      });
    }
  };

  // Handle edit button click
  const handleEdit = (category: CategoryWithSubcategories) => {
    setCurrentCategory(category);
    // Add a small delay before setting form data to prevent auto-selection
    setTimeout(() => {
      setFormData({
        category_name: category.category_name,
        subcategory_name: "",
      });
    }, 50);
    setShowDialog(true);
  };

  // Handle create subcategory
  const handleCreateSubcategory = (categoryId: string) => {
    const parentCategory = categories.find(cat => cat.id === categoryId && !cat.isSubcategory);
    if (parentCategory) {
      // Close any other open dialogs first
      setShowDialog(false);
      
      // Then open the subcategory dialog
      setCurrentParentCategory(parentCategory);
      setFormData({
        category_name: "",
        subcategory_name: "",
      });
      setFormMessage(null);
      setShowSubcategoryDialog(true);
    }
  };

  // Handle delete button click
  const handleDeleteClick = (category: CategoryWithSubcategories) => {
    setCurrentCategory(category);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!currentCategory) return;
    
    try {
      if (currentCategory.isSubcategory) {
        // Delete subcategory
        const { error } = await supabase
          .from("service_subcategories")
          .delete()
          .eq("id", currentCategory.id);

        if (error) throw error;
        
        setFormMessage({
          type: "success",
          text: "Η περιγραφή διαγράφηκε με επιτυχία."
        });
      } else {
        // Check if category has subcategories
        const relatedSubcategories = subcategories.filter(
          sub => sub.category_id === currentCategory.id
        );
        
        if (relatedSubcategories.length > 0) {
          setFormMessage({
            type: "error",
            text: "Δεν μπορείτε να διαγράψετε αυτή την κατηγορία γιατί έχει περιγραφές."
          });
          setShowDeleteDialog(false);
          return;
        }
        
        // Delete category
      const { error } = await supabase
        .from("service_categories")
        .delete()
        .eq("id", currentCategory.id);

      if (error) throw error;
      
      setFormMessage({
        type: "success",
        text: "Η κατηγορία διαγράφηκε με επιτυχία."
      });
      }
      
      // Refresh the list
      fetchCategories();
    } catch (error) {
      console.error("Error deleting:", error);
      setFormMessage({
        type: "error",
        text: "Υπήρξε πρόβλημα κατά τη διαγραφή."
      });
    } finally {
      setShowDeleteDialog(false);
      setCurrentCategory(null);
    }
  };

  // Define table columns
  const columns = [
    { 
      header: "Όνομα Κατηγορίας", 
      accessor: "category_name",
      width: "400px",
      cell: (value: string, row: CategoryWithSubcategories) => {
        if (!value) return "-";
        
        const content = (
          <div className="relative group">
            <div className={`${row.isSubcategory ? "pl-6 flex items-center text-[#84a98c] font-semibold" : "text-[#cad2c5] text-base"}`}>
              {row.isSubcategory && (
                <span className="mr-2 text-[#52796f] flex-shrink-0">└─</span>
              )}
              {truncateText(value, 40)}
            </div>
          </div>
        );
        
        // Only wrap main categories with context menu
        if (!row.isSubcategory) {
          return (
            <CategoryContextMenu 
              categoryId={row.id} 
              onCreateSubcategory={handleCreateSubcategory}
            >
              {content}
            </CategoryContextMenu>
          );
        }
        
        return content;
      }
    },
    {
      header: "Ημ/νία Δημιουργίας",
      accessor: "date_created",
      type: "date" as const,
      cell: (value: string | null) => value ? formatDateTime(value) : "-"
    },
    {
      header: "Ημ/νία Ενημέρωσης",
      accessor: "date_updated",
      type: "date" as const,
      cell: (value: string | null) => value ? formatDateTime(value) : "-"
    }
  ];

  return (
    <Card className="bg-[#2f3e46] text-[#cad2c5] shadow-none border-0">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <Button
            onClick={() => {
              setCurrentCategory(null);
              setFormData({ category_name: "", subcategory_name: "" });
              setFormMessage(null);
              setShowDialog(true);
            }}
            className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
          >
            <Plus className="h-5 w-5 text-white" /> Προσθήκη Κατηγορίας
          </Button>
        </div>
        
        <DataTableBase
          columns={columns.map(col => ({ ...col, sortable: false }))}
          data={categories}
          isLoading={loading}
          pageSize={categories.length}
          showSearch={false}
          onRowClick={handleEdit}
          rowClassName="cursor-pointer hover:bg-[#354f52] py-7"
          renderRow={(row, index, defaultRow) => {
            // This ensures that the rows are rendered in the order they appear in the data array
            // which preserves the parent-child relationship
            return defaultRow;
          }}
        />

        {/* Category Form Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-xl h-auto max-h-[90vh] overflow-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10">
            <DialogHeader>
              <DialogTitle className="text-[#84a98c] text-xl font-medium">
                {currentCategory 
                  ? currentCategory.isSubcategory 
                    ? "Επεξεργασία Περιγραφής" 
                    : "Επεξεργασία Κατηγορίας" 
                  : "Προσθήκη Κατηγορίας"}
              </DialogTitle>
              <DialogDescription className="text-[#a8c5b5]">
                {currentCategory
                  ? currentCategory.isSubcategory
                    ? "Ενημερώστε τα στοιχεία της περιγραφής."
                    : "Ενημερώστε τα στοιχεία της κατηγορίας."
                  : "Συμπληρώστε τα στοιχεία για τη νέα κατηγορία."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category_name" className="text-[#84a98c] font-medium text-sm">
                  {currentCategory && currentCategory.isSubcategory 
                    ? "Περιγραφή" 
                    : "Όνομα Κατηγορίας"}
                </Label>
                <Textarea
                  id="category_name"
                  name="category_name"
                  value={formData.category_name}
                  onChange={handleInputChange}
                  className="customer-notes-textarea service-type-textarea bg-[#354f52] text-[#cad2c5] placeholder:text-[#84a98c]/50 min-h-[100px] h-[100px] rounded-md focus:ring-2 focus:ring-[#84a98c] transition-all duration-200"
                  style={{
                    minHeight: '100px !important',
                    height: '100px !important',
                    maxHeight: 'none !important',
                    resize: 'none',
                    border: 'none',
                    padding: '10px',
                    boxShadow: '0 0 0 1px #52796f, 0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                  rows={5}
                  placeholder="Εισάγετε το κείμενο εδώ..."
                  autoFocus={false}
                />
              </div>

              {formMessage && (
                <div
                  className={`p-3 rounded-md ${
                    formMessage.type === "success"
                      ? "bg-green-900/30 text-green-300 border border-green-800"
                      : "bg-red-900/30 text-red-300 border border-red-800"
                  }`}
                >
                  {formMessage.text}
                </div>
              )}

              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  type="submit"
                  className="bg-[#52796f] text-[#cad2c5] hover:bg-[#84a98c] transition-colors duration-200 flex-1 shadow-md hover:shadow-lg"
                >
                  Αποθήκευση
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] transition-colors duration-200 flex-1"
                >
                  Ακύρωση
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Subcategory Form Dialog */}
        <Dialog 
          open={showSubcategoryDialog} 
          onOpenChange={(open) => {
            setShowSubcategoryDialog(open);
            // If dialog is closing, reset the current parent category
            if (!open) {
              setCurrentParentCategory(null);
            }
          }}
        >
          <DialogContent className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-xl h-auto max-h-[90vh] overflow-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10">
            <DialogHeader>
              <DialogTitle className="text-[#84a98c] text-xl font-medium">
                <div className="flex items-center">
                  {currentParentCategory?.category_name && 
                    (() => {
                      const text = currentParentCategory.category_name;
                      // Only show truncated text without tooltip
                      if (text.length > 40) {
                        return (
                          <div className="flex items-center whitespace-nowrap">
                            <span>{text.substring(0, 40)}</span>
                            <span className="text-blue-400 ml-1 flex-shrink-0 pointer-events-none">
                              ....
                            </span>
                          </div>
                        );
                      }
                      return <span>{text}</span>;
                    })()
                  }
                </div>
              </DialogTitle>
              <DialogDescription className="text-[#a8c5b5]">
                Συμπληρώστε την περιγραφή για την επιλεγμένη κατηγορία
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitSubcategory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subcategory_name" className="text-[#84a98c] font-medium text-sm">
                  Περιγραφή
                </Label>
                <Textarea
                  id="subcategory_name"
                  name="subcategory_name"
                  value={formData.subcategory_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcategory_name: e.target.value }))}
                  className="customer-notes-textarea service-type-textarea bg-[#354f52] text-[#cad2c5] placeholder:text-[#84a98c]/50 min-h-[100px] h-[100px] rounded-md focus:ring-2 focus:ring-[#84a98c] transition-all duration-200"
                  style={{
                    minHeight: '100px !important',
                    height: '100px !important',
                    maxHeight: 'none !important',
                    resize: 'none',
                    border: 'none',
                    padding: '10px',
                    boxShadow: '0 0 0 1px #52796f, 0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                  rows={5}
                  placeholder="Εισάγετε την περιγραφή εδώ..."
                  autoFocus={false}
                />
              </div>

              {formMessage && (
                <div
                  className={`p-3 rounded-md ${
                    formMessage.type === "success"
                      ? "bg-green-900/30 text-green-300 border border-green-800"
                      : "bg-red-900/30 text-red-300 border border-red-800"
                  }`}
                >
                  {formMessage.text}
                </div>
              )}

              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  type="submit"
                  className="bg-[#52796f] text-[#cad2c5] hover:bg-[#84a98c] transition-colors duration-200 flex-1 shadow-md hover:shadow-lg"
                >
                  Αποθήκευση
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSubcategoryDialog(false)}
                  className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] transition-colors duration-200 flex-1"
                >
                  Ακύρωση
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#84a98c] text-xl font-medium">
                {currentCategory && currentCategory.isSubcategory 
                  ? "Διαγραφή Περιγραφής" 
                  : "Διαγραφή Κατηγορίας"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#a8c5b5]">
                Είστε βέβαιοι ότι θέλετε να διαγράψετε 
                {currentCategory && currentCategory.isSubcategory 
                  ? " αυτή την περιγραφή;" 
                  : " αυτή την κατηγορία;"}
                <br />
                Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2">
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 flex-1 shadow-md hover:shadow-lg"
              >
                Διαγραφή
              </AlertDialogAction>
              <AlertDialogCancel className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] transition-colors duration-200 flex-1">
                Ακύρωση
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function UnitsTab() {
  const { user } = useAuth();
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentUnit, setCurrentUnit] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Set up real-time subscription for units
  useRealtimeSubscription(
    {
      table: 'units',
      event: '*',
    },
    (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        fetchUnits(); // Refresh the list
      }
    },
    []
  );

  // Fetch units
  const fetchUnits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      
      // Ensure data has the correct field names for consistency
      const formattedData = data?.map(unit => ({
        ...unit,
        date_created: unit.date_created || unit.created_at,
        date_updated: unit.date_updated || unit.updated_at
      })) || [];
      
      setUnits(formattedData);
    } catch (error) {
      console.error("Error fetching measurement units:", error);
      setFormMessage({
        type: "error",
        text: "Υπήρξε πρόβλημα κατά την ανάκτηση των μονάδων μέτρησης."
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchUnits();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    
    if (!formData.name.trim()) {
      setFormMessage({
        type: "error",
        text: "Το όνομα μονάδας μέτρησης είναι υποχρεωτικό."
      });
      return;
    }
    
    try {
      if (currentUnit) {
        // Update existing unit
        const { error } = await supabase
          .from("units")
          .update({ 
            name: formData.name,
            date_updated: new Date().toISOString()
          })
          .eq("id", currentUnit.id);
          
        if (error) throw error;
        
        setFormMessage({
          type: "success",
          text: "Η μονάδα μέτρησης ενημερώθηκε με επιτυχία."
        });
      } else {
        // Create new unit
        const { error } = await supabase
          .from("units")
          .insert({
            name: formData.name,
            date_created: new Date().toISOString()
          });

        if (error) throw error;
        
        setFormMessage({
          type: "success",
          text: "Η μονάδα μέτρησης δημιουργήθηκε με επιτυχία."
        });
      }
      
      // Refresh the list
      fetchUnits();
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({ name: "" });
        setCurrentUnit(null);
        setShowDialog(false);
        setFormMessage(null);
      }, 1000);
    } catch (error) {
      console.error("Error saving measurement unit:", error);
      setFormMessage({
        type: "error",
        text: "Υπήρξε πρόβλημα κατά την αποθήκευση της μονάδας μέτρησης."
      });
    }
  };

  // Handle edit button click
  const handleEdit = (unit: any) => {
    setCurrentUnit(unit);
    // Add a small delay before setting form data to prevent auto-selection
    setTimeout(() => {
      setFormData({
        name: unit.name,
      });
    }, 50);
    setShowDialog(true);
  };

  // Handle delete button click
  const handleDeleteClick = (unit: any) => {
    setCurrentUnit(unit);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!currentUnit) return;
    
    try {
      const { error } = await supabase
        .from("units")
        .delete()
        .eq("id", currentUnit.id);

      if (error) throw error;
      
      setFormMessage({
        type: "success",
        text: "Η μονάδα μέτρησης διαγράφηκε με επιτυχία."
      });
      
      // Refresh the list
      fetchUnits();
    } catch (error) {
      console.error("Error deleting measurement unit:", error);
      setFormMessage({
        type: "error",
        text: "Υπήρξε πρόβλημα κατά τη διαγραφή της μονάδας μέτρησης."
      });
    } finally {
      setShowDeleteDialog(false);
      setCurrentUnit(null);
    }
  };

  // Define table columns for Units
  const columns = [
    { header: "Όνομα", accessor: "name" },
    {
      header: "Ημ/νία Δημιουργίας",
      accessor: "date_created",
      type: "date" as const,
      cell: (value: string | null) => value ? formatDateTime(value) : "-"
    },
    {
      header: "Ημ/νία Ενημέρωσης",
      accessor: "date_updated",
      type: "date" as const,
      cell: (value: string | null) => value ? formatDateTime(value) : "-"
    }
  ];

  return (
    <Card className="bg-[#2f3e46] text-[#cad2c5] shadow-none border-0">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setCurrentUnit(null);
                setFormData({ name: "" });
                setFormMessage(null);
                setShowDialog(true);
              }}
              className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
            >
              <Plus className="h-5 w-5 text-white" /> Προσθήκη Μονάδας Μέτρησης
            </Button>
          </div>
        </div>
        
        <DataTableBase
          columns={columns}
          data={units}
          isLoading={loading}
          pageSize={units.length}
          showSearch={false}
          onRowClick={handleEdit}
          rowClassName="cursor-pointer hover:bg-[#354f52] py-7"
          defaultSortColumn="name"
          defaultSortDirection="asc"
        />

        {/* Unit Form Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-xl h-auto max-h-[90vh] overflow-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10">
            <DialogHeader>
              <DialogTitle className="text-[#84a98c] text-xl font-medium">
                {currentUnit ? "Επεξεργασία Μονάδας Μέτρησης" : "Προσθήκη Μονάδας Μέτρησης"}
              </DialogTitle>
              <DialogDescription className="text-[#a8c5b5]">
                {currentUnit
                  ? "Ενημερώστε τα στοιχεία της μονάδας μέτρησης."
                  : "Συμπληρώστε τα στοιχεία για τη νέα μονάδα μέτρησης."}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#84a98c] font-medium text-sm">Όνομα</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-10 text-base p-4 focus:ring-2 focus:ring-[#84a98c] transition-all duration-200"
                  style={{
                    boxShadow: '0 0 0 1px #52796f, 0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                  autoFocus={false}
                />
              </div>
              
              {formMessage && (
                <div
                  className={`p-3 rounded-md ${
                    formMessage.type === "success"
                      ? "bg-green-900/30 text-green-300 border border-green-800"
                      : "bg-red-900/30 text-red-300 border border-red-800"
                  }`}
                >
                  {formMessage.text}
              </div>
              )}
            
            <DialogFooter className="mt-6 flex gap-2">
              <Button
                type="submit"
                className="bg-[#52796f] text-[#cad2c5] hover:bg-[#84a98c] transition-colors duration-200 flex-1 shadow-md hover:shadow-lg"
              >
                Αποθήκευση
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] transition-colors duration-200 flex-1"
              >
                Ακύρωση
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#84a98c] text-xl font-medium">
                Διαγραφή Μονάδας Μέτρησης
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#a8c5b5]">
                Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτή τη μονάδα μέτρησης;
                <br />
                Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2">
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 flex-1 shadow-md hover:shadow-lg"
              >
                Διαγραφή
              </AlertDialogAction>
              <AlertDialogCancel className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] transition-colors duration-200 flex-1">
                Ακύρωση
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function DepartmentsTab() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Set up real-time subscription for departments
  useRealtimeSubscription(
    {
      table: 'departments',
      event: '*',
    },
    (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        fetchDepartments(); // Refresh the list
      }
    },
    []
  );

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      
      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      setFormMessage({
        type: "error",
        text: "Υπήρξε πρόβλημα κατά την ανάκτηση των τμημάτων."
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    
    if (!formData.name.trim()) {
      setFormMessage({
        type: "error",
        text: "Το όνομα τμήματος είναι υποχρεωτικό."
      });
      return;
    }
    
    try {
      if (currentDepartment) {
        // Update existing department
        const { error: updateError } = await supabase
          .from("departments")
          .update({ name: formData.name })
          .eq("id", currentDepartment.id);
          
        if (updateError) {
          console.error("Update failed:", updateError);
          throw updateError;
        }
        
        setFormMessage({
          type: "success",
          text: "Το τμήμα ενημερώθηκε με επιτυχία."
        });
      } else {
        // Create new department
        const { error } = await supabase
          .from("departments")
          .insert({
            name: formData.name,
          });

        if (error) throw error;
        
        setFormMessage({
          type: "success",
          text: "Το τμήμα δημιουργήθηκε με επιτυχία."
        });
      }
      
      // Refresh the list
      fetchDepartments();
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({ name: "" });
        setCurrentDepartment(null);
        setShowDialog(false);
        setFormMessage(null);
      }, 1000);
    } catch (error) {
      console.error("Error saving department:", error);
      setFormMessage({
        type: "error",
        text: "Υπήρξε πρόβλημα κατά την αποθήκευση του τμήματος."
      });
    }
  };

  // Handle edit button click
  const handleEdit = (department: Department) => {
    setCurrentDepartment(department);
    // Add a small delay before setting form data to prevent auto-selection
    setTimeout(() => {
      setFormData({
        name: department.name,
      });
    }, 50);
    setShowDialog(true);
  };

  // Handle delete button click
  const handleDeleteClick = (department: Department) => {
    setCurrentDepartment(department);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!currentDepartment) return;
    
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", currentDepartment.id);

      if (error) throw error;
      
      setFormMessage({
        type: "success",
        text: "Το τμήμα διαγράφηκε με επιτυχία."
      });
      
      // Refresh the list
      fetchDepartments();
    } catch (error) {
      console.error("Error deleting department:", error);
      setFormMessage({
        type: "error",
        text: "Υπήρξε πρόβλημα κατά τη διαγραφή του τμήματος."
      });
    } finally {
      setShowDeleteDialog(false);
      setCurrentDepartment(null);
    }
  };

  // Define table columns
  const columns = [
    { header: "Όνομα", accessor: "name" },
    {
      header: "Ημ/νία Δημιουργίας",
      accessor: "created_at",
      type: "date" as const,
      cell: (value: string | null) => value ? formatDateTime(value) : "-"
    }
  ];

  return (
    <Card className="bg-[#2f3e46] text-[#cad2c5] shadow-none border-0">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setCurrentDepartment(null);
                setFormData({ name: "" });
                setFormMessage(null);
                setShowDialog(true);
              }}
              className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
            >
              <Plus className="h-5 w-5 text-white" /> Προσθήκη Τμήματος
            </Button>
          </div>
        </div>
        
        <DataTableBase
          columns={columns}
          data={departments}
          isLoading={loading}
          pageSize={departments.length}
          showSearch={false}
          onRowClick={handleEdit}
          rowClassName="cursor-pointer hover:bg-[#354f52] py-7"
          defaultSortColumn="name"
          defaultSortDirection="asc"
        />

        {/* Department Form Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-xl h-auto max-h-[90vh] overflow-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10">
            <DialogHeader>
              <DialogTitle className="text-[#84a98c] text-xl font-medium">
                {currentDepartment ? "Επεξεργασία Τμήματος" : "Προσθήκη Τμήματος"}
              </DialogTitle>
              <DialogDescription className="text-[#a8c5b5]">
                {currentDepartment
                  ? "Ενημερώστε τα στοιχεία του τμήματος."
                  : "Συμπληρώστε τα στοιχεία για το νέο τμήμα."}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#84a98c] font-medium text-sm">Όνομα</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-10 text-base p-4 focus:ring-2 focus:ring-[#84a98c] transition-all duration-200"
                  style={{
                    boxShadow: '0 0 0 1px #52796f, 0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                  autoFocus={false}
                />
              </div>
              
              {formMessage && (
                <div
                  className={`p-3 rounded-md ${
                    formMessage.type === "success"
                      ? "bg-green-900/30 text-green-300 border border-green-800"
                      : "bg-red-900/30 text-red-300 border border-red-800"
                  }`}
                >
                  {formMessage.text}
              </div>
              )}
            
            <DialogFooter className="mt-6 flex gap-2">
              <Button
                type="submit"
                className="bg-[#52796f] text-[#cad2c5] hover:bg-[#84a98c] transition-colors duration-200 flex-1 shadow-md hover:shadow-lg"
              >
                Αποθήκευση
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] transition-colors duration-200 flex-1"
              >
                Ακύρωση
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#84a98c] text-xl font-medium">
                Διαγραφή Τμήματος
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#a8c5b5]">
                Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτό το τμήμα;
                <br />
                Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogAction
              onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 flex-1 shadow-md hover:shadow-lg"
            >
              Διαγραφή
            </AlertDialogAction>
              <AlertDialogCancel className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] transition-colors duration-200 flex-1">
                Ακύρωση
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </CardContent>
    </Card>
  );
} 