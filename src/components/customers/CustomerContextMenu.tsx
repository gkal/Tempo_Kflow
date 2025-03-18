import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Phone, Mail, Globe, User, Plus } from "lucide-react";
import "../ui/dropdown.css";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";

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
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  // Create portal container when component mounts
  useEffect(() => {
    const container = document.createElement('div');
    container.setAttribute('data-context-menu-container', customerId);
    document.body.appendChild(container);
    setPortalContainer(container);
    
    // Clean up by removing the container when component unmounts
    return () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, [customerId]);
  
  // Set up global context menu handler
  useEffect(() => {
    // Function to handle right-click on any element with data-customer-id
    const handleGlobalContextMenu = (e: MouseEvent) => {
      // Find the closest element with data-customer-id attribute
      const target = e.target as HTMLElement;
      const customerElement = target.closest('[data-customer-id]');
      
      // If we found an element with our attribute and it matches our customerId
      if (customerElement && customerElement.getAttribute('data-customer-id') === customerId) {
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
      
      // Clean up all force-hover classes when component unmounts
      document.querySelectorAll('tr.force-hover').forEach(row => {
        row.classList.remove('force-hover');
      });
    };
  }, [customerId]);
  
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

  // Add data-customer-id to children
  const childrenWithAttribute = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // Use a type assertion to avoid the linter error
      return React.cloneElement(child, {
        'data-customer-id': customerId
      } as React.HTMLAttributes<HTMLElement>);
    }
    return child;
  });

  // Render the context menu
  const renderContextMenu = () => {
    if (!isOpen || !portalContainer) return null;
    
    return ReactDOM.createPortal(
      <div 
        ref={menuRef}
        className="dropdown-menu" 
        style={{
          position: 'fixed',
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
          minWidth: '180px',
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
          onClick={() => {
            onCreateOffer(customerId, "Phone");
            setIsOpen(false);
            document.querySelectorAll('tr.force-hover').forEach(row => {
              row.classList.remove('force-hover');
            });
          }}
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
          onClick={() => {
            onCreateOffer(customerId, "Email");
            setIsOpen(false);
            document.querySelectorAll('tr.force-hover').forEach(row => {
              row.classList.remove('force-hover');
            });
          }}
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
          onClick={() => {
            onCreateOffer(customerId, "Website");
            setIsOpen(false);
            document.querySelectorAll('tr.force-hover').forEach(row => {
              row.classList.remove('force-hover');
            });
          }}
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
          onClick={() => {
            onCreateOffer(customerId, "In Person");
            setIsOpen(false);
            document.querySelectorAll('tr.force-hover').forEach(row => {
              row.classList.remove('force-hover');
            });
          }}
        >
          <div className="flex items-center">
            <div className="bg-orange-500/20 p-1 rounded-full mr-2">
              <User className="h-3 w-3 text-orange-400" />
            </div>
            <span>Φυσική παρουσία</span>
          </div>
        </div>
      </div>,
      portalContainer
    );
  };

  return (
    <>
      {childrenWithAttribute}
      {renderContextMenu()}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent aria-describedby="delete-customer-description">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription id="delete-customer-description">
              Are you sure you want to delete this customer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 