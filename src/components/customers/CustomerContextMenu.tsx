import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Phone, Mail, Globe, User, Plus } from "lucide-react";
import "../ui/dropdown.css";
import { AlertDialog, AlertDialogHeader, AlertDialogDescription, AlertDialogTitle, AlertDialogContent } from "@/components/ui/alert-dialog";
import { AccessibleAlertDialogContent } from "@/components/ui/DialogUtilities";
import { GlobalTooltip } from "@/components/ui/GlobalTooltip";

interface CustomerContextMenuProps {
  children: React.ReactNode;
  customerId: string;
  onCreateOffer: (customerId: string, source: string) => void;
}

export function CustomerContextMenu({
  children,
  customerId,
  onCreateOffer,
}: CustomerContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Set up context menu handler
  useEffect(() => {
    // Handle right clicks on customer elements
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const customerElement = target.closest('[data-customer-id]');
      
      if (customerElement && customerElement.getAttribute('data-customer-id') === customerId) {
        e.preventDefault();
        
        // Position the menu at cursor
        setMenuPosition({
          top: e.clientY,
          left: e.clientX
        });
        
        // Show the menu
        setIsOpen(true);
        
        // Highlight the row
        const row = target.closest('tr');
        if (row) {
          row.classList.add('force-hover');
        }
      }
    };
    
    // Handle clicks anywhere to close the menu
    const handleDocumentClick = (e: MouseEvent) => {
      // If menu is open and click is outside menu, close it
      if (isOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        
        // Remove row highlights
        document.querySelectorAll('tr.force-hover').forEach(row => {
          row.classList.remove('force-hover');
        });
      }
    };
    
    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleDocumentClick);
    
    // Clean up
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleDocumentClick);
      
      // Clean up any remaining highlights
      document.querySelectorAll('tr.force-hover').forEach(row => {
        row.classList.remove('force-hover');
      });
    };
  }, [customerId, isOpen]);

  // Add data-customer-id to children
  const childrenWithAttribute = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        'data-customer-id': customerId
      } as React.HTMLAttributes<HTMLElement>);
    }
    return child;
  });

  // Menu item handler that stops propagation
  const handleMenuItemClick = (source: string) => (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event from reaching the row click handler
    onCreateOffer(customerId, source);
    setIsOpen(false);
    
    // Remove any highlight classes
    document.querySelectorAll('tr.force-hover').forEach(row => {
      row.classList.remove('force-hover');
    });
  };

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
          minWidth: '180px',
          zIndex: 99999,
          backgroundColor: '#2f3e46',
          border: '1px solid #52796f',
          borderRadius: '4px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          padding: '0',
          overflow: 'hidden',
          fontSize: '0.8125rem'
        }}
      >
        {/* Header */}
        <div className="py-1.5 text-center border-b border-[#52796f] cursor-default">
          <div className="text-[#84a98c] font-medium flex items-center justify-center px-3 cursor-default">
            <Plus className="h-3 w-3 mr-1.5" />
            Νέα Προσφορά
          </div>
        </div>
        
        {/* Menu items */}
        <div 
          className="dropdown-item py-1"
          onClick={handleMenuItemClick("Phone")}
        >
          <div className="flex items-center">
            <div className="bg-blue-500/20 p-1 rounded-full mr-2">
              <Phone className="h-3 w-3 text-blue-400" />
            </div>
            <span>Τηλέφωνο</span>
          </div>
        </div>
        
        <div 
          className="dropdown-item py-1"
          onClick={handleMenuItemClick("Email")}
        >
          <div className="flex items-center">
            <div className="bg-green-500/20 p-1 rounded-full mr-2">
              <Mail className="h-3 w-3 text-green-400" />
            </div>
            <span>Email</span>
          </div>
        </div>
        
        <div 
          className="dropdown-item py-1"
          onClick={handleMenuItemClick("Site")}
        >
          <div className="flex items-center">
            <div className="bg-purple-500/20 p-1 rounded-full mr-2">
              <Globe className="h-3 w-3 text-purple-400" />
            </div>
            <span>Ιστοσελίδα</span>
          </div>
        </div>
        
        <div 
          className="dropdown-item py-1"
          onClick={handleMenuItemClick("Physical")}
        >
          <div className="flex items-center">
            <div className="bg-orange-500/20 p-1 rounded-full mr-2">
              <User className="h-3 w-3 text-orange-400" />
            </div>
            <span>Φυσική παρουσία</span>
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
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent aria-labelledby="delete-dialog-title" aria-describedby="delete-customer-description">
          <AlertDialogHeader>
            <AlertDialogTitle id="delete-dialog-title">Delete Customer</AlertDialogTitle>
            <AlertDialogDescription id="delete-customer-description">
              Are you sure you want to delete this customer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 