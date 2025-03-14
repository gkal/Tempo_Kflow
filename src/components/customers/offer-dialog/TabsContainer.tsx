import React, { useState, useRef, useEffect } from 'react';

interface TabsContainerProps {
  children: React.ReactNode[];
}

const TabsContainer: React.FC<TabsContainerProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      
      const direction = e.key === 'ArrowLeft' ? -1 : 1;
      const tabCount = React.Children.count(children);
      const newIndex = (index + direction + tabCount) % tabCount;
      
      setActiveTab(newIndex);
      tabRefs.current[newIndex]?.focus();
    }
  };

  // Set up refs for tab buttons
  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, React.Children.count(children));
    contentRefs.current = contentRefs.current.slice(0, React.Children.count(children));
  }, [children]);

  // Calculate and set the maximum height of all tab contents
  useEffect(() => {
    // Wait for the DOM to be fully rendered
    const timer = setTimeout(() => {
      // Get the heights of all tab panels
      const heights = contentRefs.current
        .filter(Boolean)
        .map(ref => ref?.scrollHeight || 0);
      
      // Set the maximum height
      if (heights.length > 0) {
        const maxHeight = Math.max(...heights);
        setContentHeight(maxHeight);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [children]);

  return (
    <div className="flex flex-col w-full mb-4">
      <div className="flex border-b border-[#52796f] mb-4" role="tablist">
        <button
          type="button"
          ref={el => (tabRefs.current[0] = el)}
          onClick={() => setActiveTab(0)}
          onKeyDown={(e) => handleKeyDown(e, 0)}
          className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            activeTab === 0
              ? 'text-[#a8c5b5] border-b-2 border-[#a8c5b5]'
              : 'text-[#cad2c5] hover:text-[#a8c5b5]'
          }`}
          aria-selected={activeTab === 0}
          role="tab"
          tabIndex={activeTab === 0 ? 0 : -1}
          aria-controls="tab-panel-0"
          id="tab-0"
        >
          Βασικά Στοιχεία
        </button>
        <button
          type="button"
          ref={el => (tabRefs.current[1] = el)}
          onClick={() => setActiveTab(1)}
          onKeyDown={(e) => handleKeyDown(e, 1)}
          className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            activeTab === 1
              ? 'text-[#a8c5b5] border-b-2 border-[#a8c5b5]'
              : 'text-[#cad2c5] hover:text-[#a8c5b5]'
          }`}
          aria-selected={activeTab === 1}
          role="tab"
          tabIndex={activeTab === 1 ? 0 : -1}
          aria-controls="tab-panel-1"
          id="tab-1"
        >
          Λεπτομέρειες
        </button>
      </div>

      <div className="tab-content" style={{ minHeight: contentHeight ? `${contentHeight}px` : 'auto' }}>
        {React.Children.map(children, (child, index) => (
          <div
            ref={el => (contentRefs.current[index] = el)}
            className={`transition-opacity duration-200 ${
              activeTab === index ? 'block' : 'hidden'
            }`}
            role="tabpanel"
            aria-hidden={activeTab !== index}
            id={`tab-panel-${index}`}
            aria-labelledby={`tab-${index}`}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabsContainer; 