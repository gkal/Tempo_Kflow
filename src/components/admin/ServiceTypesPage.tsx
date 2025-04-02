import { useState, useEffect } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTableBase } from "@/components/ui/data-table-base";
import { Plus, RefreshCw, ArrowLeft } from "lucide-react";
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
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";
import { formatDateTime } from "@/utils/formatUtils";
import ReactDOM from "react-dom";
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import { useDataService } from "@/hooks/useDataService";

// Extend Window interface to include our custom property
declare global {
  interface Window {
    dotsObserver?: MutationObserver;
    skipNextEditDialog?: boolean;
  }
}

// Define the service category interface
interface ServiceCategory {
  id: string;
  name: string;
  created_at: string;
  category_name: string;
  date_created: string;
  date_updated: string | null;
  user_create: string;
  user_updated: string | null;
}

// Define the service subcategory interface
interface ServiceSubcategory {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  subcategory_name: string;
  date_created: string;
  date_updated: string | null;
  user_create: string;
  user_updated: string | null;
}

// Define the combined type for display in the table
interface CategoryWithSubcategories extends ServiceCategory {
  isSubcategory: boolean;
  parentId?: string;
  category_id?: string;
  subcategory_name?: string;
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

  // State for active tab
  const [activeTab, setActiveTab] = useState<string>("categories");
  
  // Refresh triggers for each tab
  const [categoriesRefreshTrigger, setCategoriesRefreshTrigger] = useState(0);
  const [unitsRefreshTrigger, setUnitsRefreshTrigger] = useState(0);
  const [departmentsRefreshTrigger, setDepartmentsRefreshTrigger] = useState(0);

  // Handler for tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Refresh the data for the newly selected tab
    if (value === 'categories') {
      setCategoriesRefreshTrigger(prev => prev + 1);
    } else if (value === 'units') {
      setUnitsRefreshTrigger(prev => prev + 1);
    } else if (value === 'departments') {
      setDepartmentsRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="py-6 px-8 bg-[#2f3e46]">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#cad2c5]">Ρυθμίσεις Συστήματος</h1>
        <Button
          variant="outline"
          className="gap-2 border-[#52796f] text-[#84a98c] hover:bg-[#354f52] hover:text-[#cad2c5]"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" /> Επιστροφή
        </Button>
      </div>

      <AppTabs defaultValue="categories" onValueChange={handleTabChange}>
        <AppTabsList className="w-full">
          <AppTabsTrigger value="categories">Κατηγορίες Εργασιών</AppTabsTrigger>
          <AppTabsTrigger value="units">Μονάδες Μέτρησης</AppTabsTrigger>
          <AppTabsTrigger value="departments">Τμήματα</AppTabsTrigger>
        </AppTabsList>
        <AppTabsContent value="categories">
          <CategoriesTab refreshTrigger={categoriesRefreshTrigger} />
        </AppTabsContent>
        <AppTabsContent value="units">
          <UnitsTab refreshTrigger={unitsRefreshTrigger} />
        </AppTabsContent>
        <AppTabsContent value="departments">
          <DepartmentsTab refreshTrigger={departmentsRefreshTrigger} />
        </AppTabsContent>
      </AppTabs>
    </div>
  );
}

function CategoriesTab({ refreshTrigger }: { refreshTrigger: number }) {
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

  // Initialize data services
  const { 
    fetchAll: fetchAllCategories,
    create: createCategory,
    update: updateCategory,
    softDelete: removeCategory
  } = useDataService<ServiceCategory>('service_categories');
  
  const {
    fetchAll: fetchAllSubcategories,
    create: createSubcategory,
    update: updateSubcategory,
    softDelete: removeSubcategory
  } = useDataService<ServiceSubcategory>('service_subcategories');

  // Fetch service categories and subcategories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Fetch categories using DataService
      const categoriesData = await fetchAllCategories({
        order: { column: "category_name", ascending: true }
      });
      
      // Fetch subcategories using DataService
      const subcategoriesData = await fetchAllSubcategories({
        order: { column: "subcategory_name", ascending: true }
      });
      
      setSubcategories(subcategoriesData || []);
      
      // Combine categories and subcategories for display
      const combinedData: CategoryWithSubcategories[] = [];
      
      // Process each category and its subcategories
      categoriesData?.forEach(category => {
        // Add the main category
        combinedData.push({
          ...category,
          isSubcategory: false,
          category_name: category.category_name || category.name || '',
          date_created: category.created_at || '',
          date_updated: '',
          user_create: '',
          user_updated: ''
        } as CategoryWithSubcategories);
        
        // Find and add subcategories under their parent
        const relatedSubcategories = subcategoriesData?.filter(
          sub => sub.category_id === category.id
        ) || [];
        
        relatedSubcategories.forEach(subcategory => {
          combinedData.push({
            id: subcategory.id,
            name: subcategory.name,
            created_at: subcategory.created_at,
            category_name: subcategory.subcategory_name || subcategory.name || '',
            date_created: subcategory.created_at,
            date_updated: null,
            user_create: '',
            user_updated: null,
            isSubcategory: true,
            parentId: subcategory.category_id
          } as CategoryWithSubcategories);
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

  // Fetch data on component mount or when refresh trigger changes
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories, refreshTrigger]);

  // Set up real-time subscriptions using Supabase's built-in capabilities
  useEffect(() => {
    // Service categories subscription
    const categoriesSubscription = supabase
      .channel('service-categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_categories'
        },
        () => {
          fetchCategories(); // Refresh the list
        }
      )
      .subscribe();
      
    // Service subcategories subscription
    const subcategoriesSubscription = supabase
      .channel('service-subcategories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_subcategories'
        },
        () => {
          fetchCategories(); // Refresh the list
        }
      )
      .subscribe();

    return () => {
      categoriesSubscription.unsubscribe();
      subcategoriesSubscription.unsubscribe();
    };
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
        // Update existing category using DataService
        const updatedCategory = await updateCategory(currentCategory.id, {
          category_name: formData.category_name,
          date_updated: new Date().toISOString(),
          user_updated: user?.id,
        });

        if (!updatedCategory) {
          throw new Error("Failed to update category");
        }
        
        setFormMessage({
          type: "success",
          text: "Η κατηγορία ενημερώθηκε με επιτυχία."
        });
      } else if (currentCategory && currentCategory.isSubcategory) {
        // Update existing subcategory using DataService
        const updatedSubcategory = await updateSubcategory(currentCategory.id, {
          subcategory_name: formData.category_name,
          date_updated: new Date().toISOString(),
          user_updated: user?.id,
        });

        if (!updatedSubcategory) {
          throw new Error("Failed to update subcategory");
        }
        
        setFormMessage({
          type: "success",
          text: "Η περιγραφή ενημερώθηκε με επιτυχία."
        });
      } else {
        // Create new category using DataService
        const newCategory = await createCategory({
          category_name: formData.category_name,
          date_created: new Date().toISOString(),
          user_create: user?.id,
        });

        if (!newCategory) {
          throw new Error("Failed to create category");
        }
        
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
      // Create new subcategory using DataService
      const newSubcategory = await createSubcategory({
        subcategory_name: formData.subcategory_name,
        category_id: currentParentCategory?.id,
        date_created: new Date().toISOString(),
        user_create: user?.id,
      });

      if (!newSubcategory) {
        throw new Error("Failed to create subcategory");
      }
      
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
    // Check if we should skip opening the edit dialog
    if (window.skipNextEditDialog) {
      window.skipNextEditDialog = false;
      return;
    }
    
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
      // Set a flag to prevent opening edit dialog after
      window.skipNextEditDialog = true;
      
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
        // Delete subcategory using DataService
        const success = await removeSubcategory(currentCategory.id);

        if (!success) {
          throw new Error("Failed to delete subcategory");
        }
        
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
        
        // Delete category using DataService
        const success = await removeCategory(currentCategory.id);

        if (!success) {
          throw new Error("Failed to delete category");
        }
      
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
        
        // Simple content without complex DOM structure
        if (row.isSubcategory) {
          return (
            <div className="pl-6 flex items-center text-[#84a98c] font-semibold">
              <span className="mr-2 text-[#52796f] flex-shrink-0">└─</span>
              <TruncateWithTooltip text={value} maxLength={40} />
            </div>
          );
        }
        
        // For main categories, wrap with context menu
        return (
          <CategoryContextMenu 
            categoryId={row.id} 
            onCreateSubcategory={handleCreateSubcategory}
          >
            <div className="text-[#cad2c5] text-base">
              <TruncateWithTooltip text={value} maxLength={40} />
            </div>
          </CategoryContextMenu>
        );
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
          pageSize={categories.length > 100 ? 100 : categories.length}
          showSearch={false}
          onRowClick={handleEdit}
          rowClassName="cursor-pointer hover:bg-[#354f52]"
          footerHint="Πατήστε δεξί κλικ σε κεντρική κατηγορία, για να προσθέσετε νέα υποκατηγορία"
        />

        {/* Category Form Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent 
            className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-xl h-auto max-h-[90vh] overflow-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10"
            aria-labelledby="category-dialog-title"
          >
            <DialogHeader>
              <DialogTitle id="category-dialog-title" className="text-[#84a98c] text-xl font-medium">
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
          <DialogContent 
            className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-xl h-auto max-h-[90vh] overflow-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10"
            aria-labelledby="subcategory-dialog-title"
          >
            <DialogHeader>
              <DialogTitle id="subcategory-dialog-title" className="text-[#84a98c] text-xl font-medium">
                {currentParentCategory?.category_name 
                  ? (currentParentCategory.category_name.length > 40 
                      ? <TruncateWithTooltip text={currentParentCategory.category_name} maxLength={40} tooltipPosition="top" />
                      : currentParentCategory.category_name)
                  : "Προσθήκη Περιγραφής"
                }
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
          <AlertDialogContent 
            className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10"
            aria-labelledby="delete-dialog-title"
          >
            <AlertDialogHeader>
              <AlertDialogTitle id="delete-dialog-title" className="text-[#84a98c] text-xl font-medium">
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

function UnitsTab({ refreshTrigger }: { refreshTrigger: number }) {
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

  // Initialize data service for units
  const { 
    fetchAll: fetchAllUnits,
    create: createUnit,
    update: updateUnit,
    softDelete: removeUnit
  } = useDataService<any>('units');

  // Fetch units
  const fetchUnits = async () => {
    try {
      setLoading(true);
      
      // Use DataService to fetch units
      const unitsData = await fetchAllUnits({
        order: { column: "name", ascending: true }
      });
      
      setUnits(unitsData || []);
    } catch (error) {
      console.error("Error fetching units:", error);
      setFormMessage({
        type: "error",
        text: "Υπήρξε πρόβλημα κατά την ανάκτηση των μονάδων μέτρησης."
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount or when refresh trigger changes
  useEffect(() => {
    fetchUnits();
  }, [fetchUnits, refreshTrigger]);

  // Set up real-time subscription using Supabase's built-in capabilities
  useEffect(() => {
    const unitsSubscription = supabase
      .channel('units-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'units'
        },
        () => {
          fetchUnits(); // Refresh the list
        }
      )
      .subscribe();

    return () => {
      unitsSubscription.unsubscribe();
    };
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
        // Update existing unit using DataService
        const updatedUnit = await updateUnit(currentUnit.id, { 
          name: formData.name,
          date_updated: new Date().toISOString()
        });
          
        if (!updatedUnit) {
          throw new Error("Failed to update unit");
        }
        
        setFormMessage({
          type: "success",
          text: "Η μονάδα μέτρησης ενημερώθηκε με επιτυχία."
        });
      } else {
        // Create new unit using DataService
        const newUnit = await createUnit({
          name: formData.name,
          date_created: new Date().toISOString()
        });

        if (!newUnit) {
          throw new Error("Failed to create unit");
        }
        
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
      // Delete unit using DataService
      const success = await removeUnit(currentUnit.id);

      if (!success) {
        throw new Error("Failed to delete unit");
      }
      
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
          pageSize={units.length > 100 ? 100 : units.length}
          showSearch={false}
          onRowClick={handleEdit}
          rowClassName="cursor-pointer hover:bg-[#354f52]"
          defaultSortColumn="name"
          defaultSortDirection="asc"
        />

        {/* Unit Form Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent 
            className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-xl h-auto max-h-[90vh] overflow-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10"
            aria-labelledby="unit-dialog-title"
          >
            <DialogHeader>
              <DialogTitle id="unit-dialog-title" className="text-[#84a98c] text-xl font-medium">
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
          <AlertDialogContent 
            className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10"
            aria-labelledby="delete-unit-dialog-title"
          >
            <AlertDialogHeader>
              <AlertDialogTitle id="delete-unit-dialog-title" className="text-[#84a98c] text-xl font-medium">
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

function DepartmentsTab({ refreshTrigger }: { refreshTrigger: number }) {
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

  // Initialize data service for departments
  const { 
    fetchAll: fetchAllDepartments,
    create: createDepartment,
    update: updateDepartment,
    softDelete: removeDepartment
  } = useDataService<Department>('departments');

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      
      // Use DataService to fetch departments
      const departmentsData = await fetchAllDepartments({
        order: { column: "name", ascending: true }
      });
      
      setDepartments(departmentsData || []);
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

  // Fetch data on component mount or when refresh trigger changes
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments, refreshTrigger]);

  // Set up real-time subscription using Supabase's built-in capabilities
  useEffect(() => {
    const departmentsSubscription = supabase
      .channel('departments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'departments'
        },
        () => {
          fetchDepartments(); // Refresh the list
        }
      )
      .subscribe();

    return () => {
      departmentsSubscription.unsubscribe();
    };
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
        // Update existing department using DataService
        const updatedDepartment = await updateDepartment(currentDepartment.id, { 
          name: formData.name 
        });
          
        if (!updatedDepartment) {
          throw new Error("Failed to update department");
        }
        
        setFormMessage({
          type: "success",
          text: "Το τμήμα ενημερώθηκε με επιτυχία."
        });
      } else {
        // Create new department using DataService
        const newDepartment = await createDepartment({
          name: formData.name,
        });

        if (!newDepartment) {
          throw new Error("Failed to create department");
        }
        
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
      // Delete department using DataService
      const success = await removeDepartment(currentDepartment.id);

      if (!success) {
        throw new Error("Failed to delete department");
      }
      
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
          pageSize={departments.length > 100 ? 100 : departments.length}
          showSearch={false}
          onRowClick={handleEdit}
          rowClassName="cursor-pointer hover:bg-[#354f52]"
          defaultSortColumn="name"
          defaultSortDirection="asc"
        />

        {/* Department Form Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent 
            className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-xl h-auto max-h-[90vh] overflow-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10"
            aria-labelledby="department-dialog-title"
          >
            <DialogHeader>
              <DialogTitle id="department-dialog-title" className="text-[#84a98c] text-xl font-medium">
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
          <AlertDialogContent 
            className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10"
            aria-labelledby="delete-department-dialog-title"
          >
            <AlertDialogHeader>
              <AlertDialogTitle id="delete-department-dialog-title" className="text-[#84a98c] text-xl font-medium">
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