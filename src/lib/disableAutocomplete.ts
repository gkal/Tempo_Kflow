/**
 * Utility to disable browser autocomplete functionality
 * This script adds the autocomplete="off" attribute to all input elements
 * and disables browser autocomplete suggestions
 */

export function disableAutocomplete() {
  // Function to disable autocomplete on all inputs
  const disableInputAutocomplete = () => {
    // Get all input elements
    const inputs = document.querySelectorAll('input');
    
    // Add autocomplete="off" attribute to all inputs
    inputs.forEach(input => {
      if (!input.hasAttribute('autocomplete')) {
        input.setAttribute('autocomplete', 'off');
      }
    });
  };

  // Run on page load
  if (document.readyState === 'complete') {
    disableInputAutocomplete();
  } else {
    window.addEventListener('load', disableInputAutocomplete);
  }

  // Run when DOM changes (for dynamically added inputs)
  if (window.MutationObserver) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          disableInputAutocomplete();
        }
      });
    });

    // Start observing the document
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Additional measure: override the autocomplete property
  if (HTMLInputElement.prototype) {
    const originalAutocompleteDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'autocomplete');
    
    if (originalAutocompleteDescriptor && originalAutocompleteDescriptor.configurable) {
      Object.defineProperty(HTMLInputElement.prototype, 'autocomplete', {
        get: function() {
          return this.getAttribute('autocomplete') || 'off';
        },
        set: function(val) {
          // Always set to 'off' regardless of the value being set
          this.setAttribute('autocomplete', 'off');
        },
        configurable: true
      });
    }
  }
} 