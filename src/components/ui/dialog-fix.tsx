import { useEffect } from 'react';

export function DialogFix() {
  useEffect(() => {
    // Fix for dialog backdrop not being removed when dialog is closed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const dialogBackdrops = document.querySelectorAll('[data-radix-popper-content-wrapper]');
          
          if (dialogBackdrops.length > 1) {
            // Remove all but the last one
            for (let i = 0; i < dialogBackdrops.length - 1; i++) {
              dialogBackdrops[i].remove();
            }
          }
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return null;
} 