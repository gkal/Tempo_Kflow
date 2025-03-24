/**
 * Utility to disable browser autocomplete functionality.
 * This module adds the autocomplete="off" attribute to all input elements
 * and overrides browser autocomplete suggestions.
 * 
 * @deprecated This file will be moved to src/utils/browserUtils.ts in the future.
 * Please update your imports to use '@/utils/browserUtils' once the migration is complete.
 */

/**
 * Sets autocomplete="off" on all input elements
 */
function disableInputAutocomplete(): void {
  document.querySelectorAll<HTMLInputElement>('input').forEach(input => {
    if (!input.hasAttribute('autocomplete')) {
      input.setAttribute('autocomplete', 'off');
    }
  });
}

/**
 * Observes DOM for new input elements and disables autocomplete on them
 */
function setupMutationObserver(): void {
  if (!window.MutationObserver) return;
  
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        disableInputAutocomplete();
        break;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Overrides the autocomplete property on all input elements
 */
function overrideAutocompleteProperty(): void {
  if (!HTMLInputElement.prototype) return;
  
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype, 
    'autocomplete'
  );
  
  if (descriptor?.configurable) {
    Object.defineProperty(HTMLInputElement.prototype, 'autocomplete', {
      get: function() {
        return this.getAttribute('autocomplete') || 'off';
      },
      set: function() {
        this.setAttribute('autocomplete', 'off');
      },
      configurable: true
    });
  }
}

/**
 * Main function to disable autocomplete across the application
 */
export function disableAutocomplete(): void {
  // Run on page load
  if (document.readyState === 'complete') {
    disableInputAutocomplete();
  } else {
    window.addEventListener('load', disableInputAutocomplete);
  }

  setupMutationObserver();
  overrideAutocompleteProperty();
} 