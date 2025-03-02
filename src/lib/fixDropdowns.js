/**
 * This script completely removes all dropdown arrows from select elements
 * and other dropdown components by directly modifying the DOM.
 */

export function fixDropdowns() {
  // Function to remove all SVG elements that might be arrows
  function removeArrows() {
    // Target all possible arrow elements
    const selectors = [
      'select + svg',
      '.select + svg',
      '[role="combobox"] + svg',
      '[role="combobox"] svg',
      'button[aria-haspopup="listbox"] svg',
      'button[aria-expanded] svg',
      '.SelectTrigger svg',
      '.select-trigger svg',
      '.DataSelectTrigger svg',
      '.data-select-trigger svg',
      'svg[data-icon="chevron-down"]',
      'svg.chevron-down',
      'svg.arrow-down',
      'svg[class*="arrow"]',
      'svg[class*="chevron"]',
      'svg[class*="caret"]',
      // Target specific elements that might be arrows
      '[class*="indicator"]',
      '[class*="Indicator"]',
      '[class*="arrow"]',
      '[class*="Arrow"]',
      '[class*="chevron"]',
      '[class*="Chevron"]',
      '[class*="caret"]',
      '[class*="Caret"]'
    ];

    // Find all elements matching our selectors
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        // Check if it's likely an arrow (small element, or has arrow-related classes)
        const isLikelyArrow = 
          element.clientWidth < 20 || 
          element.clientHeight < 20 ||
          element.className.toLowerCase().includes('arrow') ||
          element.className.toLowerCase().includes('chevron') ||
          element.className.toLowerCase().includes('caret') ||
          element.className.toLowerCase().includes('indicator');
        
        if (isLikelyArrow) {
          // Hide the element
          element.style.display = 'none';
          element.style.opacity = '0';
          element.style.visibility = 'hidden';
          element.style.pointerEvents = 'none';
          
          // If it's an SVG, we can also clear its contents
          if (element.tagName.toLowerCase() === 'svg') {
            element.innerHTML = '';
          }
        }
      });
    });
  }

  // Run immediately
  removeArrows();

  // Also run on DOM changes to catch dynamically added elements
  const observer = new MutationObserver(mutations => {
    removeArrows();
  });

  // Start observing the document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also run on hover events
  document.addEventListener('mouseover', event => {
    // Check if the hovered element is a dropdown trigger
    const isDropdownTrigger = 
      event.target.matches('select') ||
      event.target.matches('.select') ||
      event.target.matches('[role="combobox"]') ||
      event.target.matches('button[aria-haspopup="listbox"]') ||
      event.target.matches('button[aria-expanded]') ||
      event.target.matches('.SelectTrigger') ||
      event.target.matches('.select-trigger') ||
      event.target.matches('.DataSelectTrigger') ||
      event.target.matches('.data-select-trigger');
    
    if (isDropdownTrigger) {
      removeArrows();
    }
  }, true);
} 