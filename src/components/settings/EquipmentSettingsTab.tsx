import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTableBase } from '@/components/ui/data-table-base';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/GlobalTooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, Plus, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { formatDateTime } from '@/utils/formatUtils';
import { Textarea } from '@/components/ui/textarea';
import ReactDOM from "react-dom";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { equipmentCategoriesService, equipmentItemsService } from '@/database';
import { EquipmentCategory, EquipmentItem } from '@/services/api/types';
import { createRecord, updateRecord, softDeleteRecord, fetchRecords } from '@/services/api/supabaseService';

// For display in the table
interface CategoryWithItems {
  id: string;
  category_name: string;
  created_at: string;
  date_created: string;
  date_updated: string | null;
  user_create: string | null;
  user_updated: string | null;
  isItem: boolean;
  parentId?: string;
  item_name?: string;
  code_prefix?: string | null;
  sortIndex?: number;
  is_available?: boolean;
  dates_available?: number | null;
}

// CategoryContextMenu Component για προσθήκη εξοπλισμού με δεξί κλικ
interface CategoryContextMenuProps {
  children: React.ReactNode;
  categoryId: string;
  onCreateItem: (categoryId: string) => void;
}

function CategoryContextMenu({
  children,
  categoryId,
  onCreateItem,
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
        
        // Set a flag to prevent the dialog from opening when right-clicking
        window.skipNextCategoryOpen = true;
        
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
            onCreateItem(categoryId);
            setIsOpen(false);
          }}
        >
          <div className="flex items-center">
            <Plus className="h-4 w-4 mr-2 text-[#84a98c]" />
            <span>Δημιουργία νέου Εξοπλισμού</span>
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

// Extend Window interface to add our global flag
declare global {
  interface Window {
    skipNextCategoryOpen?: boolean;
  }
}

export function EquipmentSettingsTab() {
  const { user: session } = useAuth();
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryWithItems | null>(null);
  const [currentParentCategory, setCurrentParentCategory] = useState<CategoryWithItems | null>(null);
  const [formData, setFormData] = useState<{
    category_name: string;
    item_name: string;
    code: string;
    is_active: boolean;
    dates_available: string;
  }>({
    category_name: "",
    item_name: "",
    code: "",
    is_active: true,
    dates_available: ""
  });
  const [formMessage, setFormMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch equipment categories and items
  const fetchEquipmentSettings = useCallback(async () => {
    try {
      setLoading(true);
      setFormMessage(null);
      
      // Fetch categories using DataService
      const { data: categoriesData, error: categoriesError } = await fetchRecords<EquipmentCategory>(
        'equipment_categories',
        { order: { column: 'category_name', ascending: true } }
      );
        
      if (categoriesError) throw categoriesError;
      
      // Fetch items using DataService
      const { data: itemsData, error: itemsError } = await fetchRecords<EquipmentItem>(
        'equipment_items',
        { order: { column: 'item_name', ascending: true } }
      );
        
      if (itemsError) throw itemsError;
      
      // Set items without logging
      setItems(itemsData as EquipmentItem[] || []);
      
      // Combine categories and items for display
      const combinedData: CategoryWithItems[] = [];
      let sortOrder = 0;
      
      // Process each category and its items
      if (categoriesData) {
        (categoriesData as EquipmentCategory[]).forEach(category => {
          // Add the main category
          combinedData.push({
            id: category.id,
            category_name: category.category_name,
            created_at: category.created_at || category.date_created,
            date_created: category.date_created,
            date_updated: category.date_updated,
            user_create: category.user_create,
            user_updated: category.user_updated,
            isItem: false,
            code_prefix: category.code_prefix || null,
            sortIndex: sortOrder++
          });
          
          // Find and add items under their parent category immediately after the category
          const relatedItems = (itemsData as EquipmentItem[])?.filter(
            item => item.category_id === category.id
          ) || [];
          
          relatedItems.forEach(item => {
            // Create a properly typed item entry
            const itemEntry: CategoryWithItems = {
              id: item.id,
              category_name: item.item_name,
              date_created: item.date_created,
              date_updated: item.date_updated,
              user_create: item.user_create,
              user_updated: item.user_updated,
              created_at: item.created_at,
              isItem: true,
              parentId: item.category_id,
              item_name: item.item_name,
              is_available: item.is_available,
              dates_available: item.dates_available !== null && item.dates_available !== undefined
                ? Math.floor(Number(item.dates_available))
                : null,
              sortIndex: sortOrder++
            };
            
            combinedData.push(itemEntry);
          });
        });
      }
      
      setCategories(combinedData || []);
    } catch (error) {
      console.error('Error fetching equipment settings:', error);
      setFormMessage({ 
        type: 'error', 
        text: 'Σφάλμα φόρτωσης ρυθμίσεων εξοπλισμού.' 
      });
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch data on component mount
  useEffect(() => {
    fetchEquipmentSettings();
  }, [fetchEquipmentSettings]);
  
  // Set up real-time subscriptions
  useEffect(() => {
    // Equipment categories subscription
    const categoriesSubscription = supabase
      .channel('equipment-categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment_categories'
        },
        () => {
          // Refresh data when changes occur
          fetchEquipmentSettings();
        }
      )
      .subscribe();
      
    // Equipment items subscription
    const itemsSubscription = supabase
      .channel('equipment-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment_items'
        },
        () => {
          // Refresh data when changes occur
          fetchEquipmentSettings();
        }
      )
      .subscribe();

    return () => {
      categoriesSubscription.unsubscribe();
      itemsSubscription.unsubscribe();
    };
  }, [fetchEquipmentSettings]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Open dialog for category editing
  const openCategoryDialog = async (category?: CategoryWithItems) => {
    // Check if we should skip opening the dialog (for right-click handling)
    if (window.skipNextCategoryOpen) {
      window.skipNextCategoryOpen = false;
      return;
    }
    
    // If this is an item (subcategory) being edited
    if (category && category.isItem) {
      // Set current category
      setCurrentCategory(category);
      
      // Fetch detailed item data to get all fields
      try {
        const { data, error } = await supabase
          .from('equipment_items')
          .select('*')
          .eq('id', category.id)
          .single();
          
        if (error) {
          console.error('Error fetching item details:', error);
        }
        
        // Initialize form with item data for editing
        setFormData({
          category_name: category.category_name,
          item_name: data?.item_name || category.item_name || category.category_name,
          code: data?.code || "",
          // Use is_available field directly rather than status
          is_active: data?.is_available === true,
          // Convert number to string for the input field, but ensure it's not a date
          dates_available: data?.dates_available !== null && data?.dates_available !== undefined ? 
                           String(Number(data.dates_available)) : ""
        });
      } catch (error) {
        console.error('Error retrieving item data:', error);
        // Initialize with basic data if error
        setFormData({
          category_name: category.category_name,
          item_name: "",
          code: "",
          is_active: true,
          dates_available: ""
        });
      }
    } else if (category) {
      // Regular category editing
      setCurrentCategory(category);
      setFormData({
        ...formData,
        category_name: category.category_name
      });
    } else {
      // Creating a new category
      setCurrentCategory(null);
      setFormData({
        ...formData,
        category_name: ""
      });
    }
    setShowCategoryDialog(true);
  };
  
  // Open dialog for item creation or editing
  const openItemDialog = async (parentCategory: CategoryWithItems) => {
    setCurrentParentCategory(parentCategory);
    
    // If this is an item (i.e., editing an existing item)
    if (parentCategory.isItem && parentCategory.parentId) {
      // Find the category for this item
      const category = categories.find(cat => cat.id === parentCategory.parentId);
      if (category) {
        setCurrentParentCategory(category);
      }
      
      // Set currentCategory for editing
      setCurrentCategory(parentCategory);
      
      // Look for the item's dates_available value
      try {
        const { data, error } = await supabase
          .from('equipment_items')
          .select('*')
          .eq('id', parentCategory.id)
          .single();
          
        if (error) {
          console.error('Error fetching item details:', error);
        }
        
        // Initialize form with item data
        setFormData({
          category_name: "",
          item_name: parentCategory.item_name || parentCategory.category_name,
          code: data?.code || "",
          // Use is_available directly - it's a boolean
          is_active: data?.is_available === true,
          // Convert number to string for the input field, but ensure it's not a date
          dates_available: data?.dates_available !== null && data?.dates_available !== undefined ? 
                           String(Number(data.dates_available)) : ""
        });
      } catch (error) {
        console.error('Error retrieving item data:', error);
        // Initialize with basic data if error
        setFormData({
          category_name: "",
          item_name: parentCategory.item_name || parentCategory.category_name,
          code: "",
          is_active: true,
          dates_available: ""
        });
      }
    } else {
      // Creating a new item
      setCurrentCategory(null);
      setFormData({
        category_name: "",
        item_name: "",
        code: "",
        is_active: true,
        dates_available: ""
      });
    }
    
    setShowItemDialog(true);
  };
  
  // Open delete confirmation dialog
  const openDeleteDialog = (item: CategoryWithItems) => {
    setCurrentCategory(item);
    setShowDeleteDialog(true);
  };
  
  // Handle category form submission
  const handleCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormMessage(null);

    try {
      // Check if currentCategory is actually an item, not a category
      if (currentCategory && currentCategory.isItem) {
        // If it's an item, update it in the equipment_items table
        const { error } = await updateRecord<EquipmentItem>(
          'equipment_items',
          currentCategory.id,
          {
            item_name: formData.category_name,
            name: formData.category_name,
            date_updated: new Date().toISOString(),
            user_updated: null // Set to null to avoid foreign key constraint issues
          }
        );

        if (error) throw error;
      } else if (currentCategory && currentCategory.id) {
        // Updating existing category using DataService
        const { data: updatedCategory, error } = await updateRecord<EquipmentCategory>(
          'equipment_categories',
          currentCategory.id,
          {
            category_name: formData.category_name,
            date_updated: new Date().toISOString(),
            user_updated: null // Set to null to avoid foreign key constraint issues
          }
        );

        if (error) throw error;
      } else {
        // Creating new category using DataService
        const { data: newCategory, error } = await createRecord<EquipmentCategory>(
          'equipment_categories',
          {
            category_name: formData.category_name,
            date_created: new Date().toISOString(),
            created_at: new Date().toISOString(),
            user_create: null // Set to null to avoid foreign key constraint issues
          }
        );

        if (error) throw error;
      }

      // Success - refetch data
      fetchEquipmentSettings();
      setShowCategoryDialog(false);
    } catch (error) {
      console.error('Error saving category:', error);
      setFormMessage({
        type: 'error',
        text: 'Υπήρξε πρόβλημα κατά την αποθήκευση της κατηγορίας.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle item update if it exists
  const handleItemUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    
    if (!formData.item_name.trim()) {
      setFormMessage({
        type: 'error',
        text: 'Το όνομα του εξοπλισμού είναι υποχρεωτικό.'
      });
      return;
    }

    try {
      // Convert dates_available to integer if provided
      let maxDaysValue: number | null = null;
      if (formData.dates_available.trim() !== '') {
        // Parse directly to integer, don't convert through Date
        maxDaysValue = parseInt(formData.dates_available, 10);
        // Extra validation to ensure it's a valid number
        if (isNaN(maxDaysValue) || maxDaysValue < 0) {
          maxDaysValue = null;
        }
      }
      
      // Create update data - ensure both is_available and status fields get the same boolean value
      const updateData: any = {
        item_name: formData.item_name,
        name: formData.item_name,
        code: formData.code || "",
        date_updated: new Date().toISOString(),
        user_updated: null,
        // Set both fields to the same boolean value
        is_available: formData.is_active,
        status: formData.is_active
      };
      
      // Add dates_available if it's a valid number
      if (maxDaysValue !== null) {
        // Store directly as a number
        updateData.dates_available = maxDaysValue;
      } else {
        // Make sure to set null if no valid value
        updateData.dates_available = null;
      }
      
      // Use DataService to update the record
      const { error } = await updateRecord<EquipmentItem>(
        'equipment_items',
        currentCategory?.id || '',
        updateData
      );
        
      if (error) {
        console.error('Update item error:', error);
        throw error;
      }
        
      setFormMessage({
        type: 'success',
        text: 'Το στοιχείο εξοπλισμού ενημερώθηκε επιτυχώς.'
      });
        
      // Refresh data
      fetchEquipmentSettings();
        
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({ category_name: "", item_name: "", code: "", is_active: true, dates_available: "" });
        setCurrentCategory(null);
        setShowCategoryDialog(false); // Close the category dialog instead of item dialog
        setFormMessage(null);
      }, 1500);
    } catch (error) {
      console.error('Error updating equipment item:', error);
      setFormMessage({
        type: 'error',
        text: 'Σφάλμα κατά την ενημέρωση του στοιχείου εξοπλισμού.'
      });
    }
  };
  
  // Handle item form submission
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    if (!formData.item_name.trim()) {
      setFormMessage({
        type: 'error',
        text: 'Το όνομα του εξοπλισμού είναι υποχρεωτικό.'
      });
      return;
    }

    if (!currentParentCategory) {
      console.error('No category selected for item');
      return;
    }

    try {
      // Convert dates_available to integer if provided
      let maxDaysValue: number | null = null;
      if (formData.dates_available.trim() !== '') {
        // Parse directly to integer, don't convert through Date
        maxDaysValue = parseInt(formData.dates_available, 10);
        // Extra validation to ensure it's a valid number
        if (isNaN(maxDaysValue) || maxDaysValue < 0) {
          maxDaysValue = null;
        }
      }
      
      // Create new item data - both status and is_available are set to the same boolean value
      const newItemData: any = {
        item_name: formData.item_name,
        name: formData.item_name,
        code: formData.code || "",
        category_id: currentParentCategory.id,
        date_created: new Date().toISOString(),
        created_at: new Date().toISOString(),
        user_create: null,
        // Set both fields as booleans
        is_available: formData.is_active,
        status: formData.is_active
      };

      // Add dates_available if it's a valid number
      if (maxDaysValue !== null) {
        // Store directly as a number
        newItemData.dates_available = maxDaysValue;
      } else {
        // Make sure to set null if no valid value
        newItemData.dates_available = null;
      }

      // Use DataService to create a new record
      const { data, error } = await createRecord<EquipmentItem>(
        'equipment_items',
        newItemData
      );

      if (error) {
        console.error('Create item error:', error);
        throw error;
      }

      setFormMessage({
        type: 'success',
        text: 'Το στοιχείο εξοπλισμού δημιουργήθηκε επιτυχώς.'
      });

      // Refresh data
      fetchEquipmentSettings();

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({ category_name: "", item_name: "", code: "", is_active: true, dates_available: "" });
        setShowItemDialog(false);
        setFormMessage(null);
      }, 1500);
    } catch (error) {
      console.error('Error creating equipment item:', error);
      setFormMessage({
        type: 'error',
        text: 'Σφάλμα κατά τη δημιουργία του στοιχείου εξοπλισμού.'
      });
    }
  };
  
  // Handle delete confirmation
  const handleDelete = async () => {
    if (!currentCategory) return;
    
    try {
      if (currentCategory.isItem) {
        // Use DataService for soft delete
        const { error } = await softDeleteRecord(
          'equipment_items',
          currentCategory.id
        );
          
        if (error) throw error;
        
        // Success - close dialog
        setShowDeleteDialog(false);
        
        // Show success message in main screen
        setFormMessage({
          type: 'success',
          text: 'Το στοιχείο εξοπλισμού διαγράφηκε επιτυχώς.'
        });
      } else {
        // Check if category has items
        const relatedItems = items.filter(
          item => item.category_id === currentCategory.id
        );
        
        if (relatedItems.length > 0) {
          // Display error in dialog context by not closing it
          setFormMessage({
            type: 'error',
            text: 'Δεν μπορείτε να διαγράψετε αυτή την κατηγορία επειδή περιέχει στοιχεία εξοπλισμού.'
          });
          return;
        }
        
        // Use DataService for soft delete
        const { error } = await softDeleteRecord(
          'equipment_categories',
          currentCategory.id
        );
          
        if (error) throw error;
        
        // Success - close dialog
        setShowDeleteDialog(false);
        
        // Show success message in main screen
        setFormMessage({
          type: 'success',
          text: 'Η κατηγορία διαγράφηκε επιτυχώς.'
        });
      }
      
      // Refresh data
      fetchEquipmentSettings();
    } catch (error) {
      console.error('Error deleting equipment item/category:', error);
      setFormMessage({
        type: 'error',
        text: 'Σφάλμα κατά τη διαγραφή.'
      });
    } finally {
      setCurrentCategory(null);
    }
  };
  
  // Handle create new item with context menu
  const handleCreateItem = (categoryId: string) => {
    const parentCategory = categories.find(cat => cat.id === categoryId && !cat.isItem);
    if (parentCategory) {
      setCurrentParentCategory(parentCategory);
      setFormData({
        ...formData,
        item_name: "",
        code: ""
      });
      setShowItemDialog(true);
    }
  };
  
  // Column definitions for the table
  const columns = [
    {
      header: "Ονομασία Εξοπλισμού",
      accessor: "category_name",
      width: "300px",
      cell: (value: string, row: CategoryWithItems) => {
        if (!value) return "-";
        
        if (row.isItem) {
          return (
            <div 
              className="pl-6 flex items-center text-[#84a98c]"
              onClick={(e) => {
                e.stopPropagation(); // Prevent the category click from firing
                openCategoryDialog(row); // Open dialog for this subcategory
              }}
            >
              <span className="mr-2 text-[#52796f] flex-shrink-0">└─</span>
              {value}
            </div>
          );
        }
        
        // For main categories, use the context menu
        return (
          <CategoryContextMenu 
            categoryId={row.id} 
            onCreateItem={handleCreateItem}
          >
            <div className="text-[#cad2c5] text-base">
              {value}
            </div>
          </CategoryContextMenu>
        );
      }
    },
    {
      header: "Διαθεσιμότητα",
      accessor: "is_available",
      width: "120px",
      cell: (value: boolean, row: CategoryWithItems) => {
        if (!row.isItem) return "";
        
        // Find the actual item in the items array to get its availability
        const item = items.find(i => i.id === row.id);
        const isAvailable = item?.is_available === true;
        
        return (
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isAvailable ? 'Ενεργός' : 'Ανενεργός'}</span>
          </div>
        );
      }
    },
    {
      header: "Τελευταία ενημέρωση",
      accessor: "date_updated",
      type: "date" as const,
      cell: (value: string) => value ? formatDateTime(value) : "-"
    },
    {
      header: "Ενέργειες",
      accessor: "actions",
      width: "120px",
      cell: (_, row: CategoryWithItems) => (
        <div className="flex justify-end space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-[#354f52] text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteDialog(row);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Διαγραφή</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )
    }
  ];
  
  // Add debug information to check item structure
  useEffect(() => {
    // No debug logs needed
  }, [items]);
  
  return (
    <TooltipProvider>
      <div className="px-2 py-2 bg-[#2f3e46] text-[#cad2c5]">
        {formMessage && (
          <div className={`p-3 mb-4 rounded-md ${
            formMessage.type === 'success' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {formMessage.text}
          </div>
        )}
        
        {/* Button to add new category */}
        <div className="flex justify-between items-center mb-6">
          <Button
            onClick={() => openCategoryDialog()}
            className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
          >
            <Plus className="h-5 w-5 text-white" /> Προσθήκη Κατηγορίας Εξοπλισμού
          </Button>
        </div>
        
        {/* Equipment List */}
        <Card className="bg-[#2f3e46] text-[#cad2c5] shadow-none border-0">
          <CardContent className="p-6">
            <DataTableBase
              columns={columns}
              data={categories}
              isLoading={loading}
              pageSize={categories.length > 25 ? 25 : categories.length || 10}
              defaultSortColumn="sortIndex"
              defaultSortDirection="asc"
              emptyStateMessage="Δεν υπάρχουν καταχωρημένες κατηγορίες εξοπλισμού."
              showSearch={false}
              onRowClick={(row) => {
                // Only open the category dialog for categories, not subcategories
                if (!row.isItem) {
                  openCategoryDialog(row);
                }
              }}
              containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
              rowClassName="cursor-pointer hover:bg-[#354f52]"
            />
          </CardContent>
        </Card>
        
        {/* Category Dialog */}
        <Dialog 
          open={showCategoryDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowCategoryDialog(false);
              setCurrentCategory(null);
              setFormMessage(null);
            }
          }}
        >
          <DialogContent 
            className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-xl h-auto max-h-[90vh] overflow-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10"
            aria-labelledby="category-dialog-title"
          >
            <DialogHeader className="pb-4">
              <DialogTitle id="category-dialog-title" className="text-[#cad2c5] text-xl mb-2">
                {currentCategory 
                  ? (currentCategory.isItem 
                    ? 'Επεξεργασία Στοιχείου Εξοπλισμού' 
                    : 'Επεξεργασία Κατηγορίας') 
                  : 'Προσθήκη Κατηγορίας Εξοπλισμού'}
              </DialogTitle>
            </DialogHeader>
            
            {currentCategory && currentCategory.isItem ? (
              // If editing a subcategory (equipment item), show all fields
              <form onSubmit={handleItemUpdate} className="space-y-6">
                <div className="bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
                  <div className="bg-[#3a5258] px-4 py-1 border-b border-[#52796f]">
                    <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                      ΣΤΟΙΧΕΙΑ ΕΞΟΠΛΙΣΜΟΥ
                    </h2>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-4">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-2">
                        Όνομα Εξοπλισμού <span className="text-red-500">*</span>
                      </div>
                      <div className="w-2/3">
                        <Input
                          id="item_name"
                          name="item_name"
                          value={formData.item_name || formData.category_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value, category_name: e.target.value }))}
                          className="bg-[#1e2629] border border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]/50 focus:ring-2 focus:ring-[#84a98c] hover:border-[#84a98c] transition-all duration-200 w-full"
                          placeholder="π.χ. Φορτηγό Mercedes 3.5T"
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center mb-4">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-2">
                        Κωδικός (προαιρετικό)
                      </div>
                      <div className="w-2/3">
                        <Input
                          id="code"
                          name="code"
                          value={formData.code}
                          onChange={handleInputChange}
                          placeholder="π.χ. EQ001"
                          className="bg-[#1e2629] border border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]/50 focus:ring-2 focus:ring-[#84a98c] hover:border-[#84a98c] transition-all duration-200 w-full"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center mb-4">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-2">
                        Μέγιστο Διάστημα Διαθεσιμότητας (ημέρες)
                      </div>
                      <div className="w-2/3">
                        <Input
                          id="dates_available"
                          name="dates_available"
                          type="number"
                          min="0"
                          value={formData.dates_available}
                          onChange={(e) => setFormData(prev => ({ ...prev, dates_available: e.target.value }))}
                          placeholder="π.χ. 7"
                          className="bg-[#1e2629] border border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]/50 focus:ring-2 focus:ring-[#84a98c] hover:border-[#84a98c] transition-all duration-200 w-full"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-2">
                        Κατάσταση
                      </div>
                      <div className="w-2/3 flex items-center gap-3">
                        <div 
                          className={`relative w-12 h-6 ${formData.is_active ? 'bg-[#84a98c]' : 'bg-gray-600'} rounded-full cursor-pointer border border-[#52796f] transition-colors duration-300`}
                          onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                        >
                          <div 
                            className={`absolute top-[3px] transform transition-transform duration-300 ease-in-out ${
                              formData.is_active ? 'translate-x-6' : 'translate-x-1'
                            } w-4 h-4 bg-white rounded-full border border-green-700`}
                          />
                        </div>
                        
                        <Label className="text-[#cad2c5] cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}>
                          {formData.is_active ? 
                            <span>Ενεργός</span> : 
                            <span>Ανενεργός</span>}
                        </Label>
                        <input 
                          type="checkbox" 
                          id="is_active" 
                          className="hidden"
                          checked={formData.is_active}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        />
                      </div>
                    </div>
                  </div>
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
                
                <DialogFooter className="mt-6 border-t border-[#52796f] pt-6 flex gap-2">
                  <Button
                    type="submit"
                    disabled={loading || !formData.item_name.trim()}
                    className={`text-[#cad2c5] transition-colors duration-200 flex-1 shadow-md hover:shadow-lg ${
                      !formData.item_name.trim() ? 'bg-[#52796f]/50 cursor-not-allowed' : 'bg-[#52796f] hover:bg-[#84a98c]'
                    }`}
                  >
                    Αποθήκευση
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCategoryDialog(false);
                      setCurrentCategory(null);
                      setFormMessage(null);
                    }}
                    className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] transition-colors duration-200 flex-1"
                    disabled={loading}
                  >
                    Ακύρωση
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              // Otherwise show regular category form
              <form onSubmit={handleCategorySubmit} className="space-y-6">
                <div className="bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
                  <div className="bg-[#3a5258] px-4 py-1 border-b border-[#52796f]">
                    <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                      ΣΤΟΙΧΕΙΑ ΚΑΤΗΓΟΡΙΑΣ
                    </h2>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-4">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-2">
                        Όνομα Κατηγορίας <span className="text-red-500">*</span>
                      </div>
                      <div className="w-2/3">
                        <Input
                          id="category_name"
                          name="category_name"
                          value={formData.category_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, category_name: e.target.value }))}
                          className="bg-[#1e2629] border border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]/50 focus:ring-2 focus:ring-[#84a98c] hover:border-[#84a98c] transition-all duration-200 w-full"
                          placeholder="π.χ. Οχήματα, Μηχανήματα έργου κ.λ.π."
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>
                  </div>
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
                
                <DialogFooter className="mt-6 border-t border-[#52796f] pt-6 flex gap-2">
                  <Button
                    type="submit"
                    disabled={loading || !formData.category_name.trim()}
                    className={`text-[#cad2c5] transition-colors duration-200 flex-1 shadow-md hover:shadow-lg ${
                      !formData.category_name.trim() ? 'bg-[#52796f]/50 cursor-not-allowed' : 'bg-[#52796f] hover:bg-[#84a98c]'
                    }`}
                  >
                    Αποθήκευση
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCategoryDialog(false);
                      setCurrentCategory(null);
                      setFormMessage(null);
                    }}
                    className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] transition-colors duration-200 flex-1"
                    disabled={loading}
                  >
                    Ακύρωση
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Item Dialog */}
        <Dialog 
          open={showItemDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowItemDialog(false);
              setCurrentParentCategory(null);
              setFormMessage(null);
            }
          }}
        >
          <DialogContent 
            className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-xl h-auto max-h-[90vh] overflow-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10"
            aria-labelledby="item-dialog-title"
          >
            <DialogHeader className="pb-4">
              <DialogTitle id="item-dialog-title" className="text-[#cad2c5] text-xl mb-2">
                Προσθήκη Εξοπλισμού στην κατηγορία {currentParentCategory?.category_name}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleItemSubmit} className="space-y-6">
              <div className="bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
                <div className="bg-[#3a5258] px-4 py-1 border-b border-[#52796f]">
                  <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                    ΣΤΟΙΧΕΙΑ ΕΞΟΠΛΙΣΜΟΥ
                  </h2>
                </div>
                <div className="p-4">
                  <div className="flex items-center mb-4">
                    <div className="w-1/3 text-[#a8c5b5] text-sm pr-2">
                      Όνομα Εξοπλισμού <span className="text-red-500">*</span>
                    </div>
                    <div className="w-2/3">
                      <Input
                        id="item_name"
                        name="item_name"
                        value={formData.item_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                        className="bg-[#1e2629] border border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]/50 focus:ring-2 focus:ring-[#84a98c] hover:border-[#84a98c] transition-all duration-200 w-full"
                        placeholder="π.χ. Φορτηγό Mercedes 3.5T"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center mb-4">
                    <div className="w-1/3 text-[#a8c5b5] text-sm pr-2">
                      Κωδικός (προαιρετικό)
                    </div>
                    <div className="w-2/3">
                      <Input
                        id="code"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        placeholder="π.χ. EQ001"
                        className="bg-[#1e2629] border border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]/50 focus:ring-2 focus:ring-[#84a98c] hover:border-[#84a98c] transition-all duration-200 w-full"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center mb-4">
                    <div className="w-1/3 text-[#a8c5b5] text-sm pr-2">
                      Μέγιστο Διάστημα Διαθεσιμότητας (ημέρες)
                    </div>
                    <div className="w-2/3">
                      <Input
                        id="dates_available"
                        name="dates_available"
                        type="number"
                        min="0"
                        value={formData.dates_available}
                        onChange={(e) => setFormData(prev => ({ ...prev, dates_available: e.target.value }))}
                        placeholder="π.χ. 7"
                        className="bg-[#1e2629] border border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]/50 focus:ring-2 focus:ring-[#84a98c] hover:border-[#84a98c] transition-all duration-200 w-full"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-1/3 text-[#a8c5b5] text-sm pr-2">
                      Κατάσταση
                    </div>
                    <div className="w-2/3 flex items-center gap-3">
                      <div 
                        className={`relative w-12 h-6 ${formData.is_active ? 'bg-[#84a98c]' : 'bg-gray-600'} rounded-full cursor-pointer border border-[#52796f] transition-colors duration-300`}
                        onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                      >
                        <div 
                          className={`absolute top-[3px] transform transition-transform duration-300 ease-in-out ${
                            formData.is_active ? 'translate-x-6' : 'translate-x-1'
                          } w-4 h-4 bg-white rounded-full border border-green-700`}
                        />
                      </div>
                      
                      <Label className="text-[#cad2c5] cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}>
                        {formData.is_active ? 
                          <span>Ενεργός</span> : 
                          <span>Ανενεργός</span>}
                      </Label>
                      <input 
                        type="checkbox" 
                        id="is_active" 
                        className="hidden"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      />
                    </div>
                  </div>
                </div>
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
              
              <DialogFooter className="mt-6 border-t border-[#52796f] pt-6 flex gap-2">
                <Button
                  type="submit"
                  disabled={loading || !formData.item_name.trim()}
                  className={`text-[#cad2c5] transition-colors duration-200 flex-1 shadow-md hover:shadow-lg ${
                    !formData.item_name.trim() ? 'bg-[#52796f]/50 cursor-not-allowed' : 'bg-[#52796f] hover:bg-[#84a98c]'
                  }`}
                >
                  Αποθήκευση
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowItemDialog(false);
                    setCurrentParentCategory(null);
                    setFormMessage(null);
                  }}
                  className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] transition-colors duration-200 flex-1"
                  disabled={loading}
                >
                  Ακύρωση
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Delete confirmation dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#84a98c] text-xl font-medium">Επιβεβαίωση Διαγραφής</AlertDialogTitle>
              <AlertDialogDescription className="text-[#a8c5b5]">
                {currentCategory?.isItem
                  ? 'Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτό το στοιχείο εξοπλισμού;'
                  : 'Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτή την κατηγορία;'
                }
                <br />
                {!currentCategory?.isItem && 
                  <span className="text-yellow-500 font-semibold block mt-2">
                    Σημείωση: Η κατηγορία μπορεί να διαγραφεί μόνο εάν δεν περιέχει στοιχεία εξοπλισμού.
                  </span>
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {formMessage && (
              <div
                className={`p-3 rounded-md mt-4 ${
                  formMessage.type === "success"
                    ? "bg-green-900/30 text-green-300 border border-green-800"
                    : "bg-red-900/30 text-red-300 border border-red-800"
                }`}
              >
                {formMessage.text}
              </div>
            )}
            
            <AlertDialogFooter className="mt-6 flex gap-2">
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-red-700 hover:bg-red-800 text-white transition-colors duration-200 flex-1 shadow-md hover:shadow-lg"
              >
                Διαγραφή
              </AlertDialogAction>
              <AlertDialogCancel className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] transition-colors duration-200 flex-1">
                Ακύρωση
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
} 
