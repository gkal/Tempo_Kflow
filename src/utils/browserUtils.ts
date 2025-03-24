/**
 * Browser Utilities
 * 
 * Utilities for interacting with browser-specific functionality such as
 * form autocomplete, DOM manipulation, and browser feature detection.
 * 
 * Usage:
 * ```ts
 * import { disableAutocomplete, detectBrowserFeatures } from '@/utils/browserUtils';
 * 
 * // Disable browser autocomplete on all forms
 * disableAutocomplete();
 * ```
 * 
 * Files using these utilities:
 * - src/main.tsx: App initialization disables autocomplete
 * 
 * @module browserUtils
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
  try {
    // Try to override the autocomplete property getter/setter
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'autocomplete'
    );

    if (originalDescriptor && originalDescriptor.configurable) {
      Object.defineProperty(HTMLInputElement.prototype, 'autocomplete', {
        get: function() {
          return this.getAttribute('autocomplete') || 'off';
        },
        set: function(value) {
          // Still allow explicitly setting autocomplete
          this.setAttribute('autocomplete', value);
        },
        configurable: true
      });
    }
  } catch (e) {
    console.error('Failed to override autocomplete property', e);
  }
}

/**
 * Disables browser autocomplete functionality throughout the application
 */
export function disableAutocomplete(): void {
  // Add autocomplete="off" to all inputs when the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', disableInputAutocomplete);
  } else {
    disableInputAutocomplete();
  }
  
  // Set up observer for future DOM changes
  setupMutationObserver();
  
  // Try to override the autocomplete property
  overrideAutocompleteProperty();
}

/**
 * Detects if the browser supports a specific feature
 * 
 * @param feature - Feature to detect
 * @returns Whether the feature is supported
 */
export function detectBrowserFeature(feature: 'MutationObserver' | 'IntersectionObserver' | 'ResizeObserver'): boolean {
  switch (feature) {
    case 'MutationObserver':
      return typeof MutationObserver !== 'undefined';
    case 'IntersectionObserver':
      return typeof IntersectionObserver !== 'undefined';
    case 'ResizeObserver':
      return typeof ResizeObserver !== 'undefined';
    default:
      return false;
  }
}

// Export all browser utilities as a namespace
export const browserUtils = {
  disableAutocomplete,
  detectBrowserFeature
};

export default browserUtils; 