import React, { useState, useRef, useEffect } from 'react';

interface TabsContainerProps {
  children: React.ReactNode[];
}

const TabsContainer: React.FC<TabsContainerProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
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

  return (
    <div className="flex flex-col w-full mb-2 -mt-1">
      <div className="flex border-b border-[#52796f] mb-2" role="tablist">
        <button
          type="button"
          ref={el => (tabRefs.current[0] = el)}
          onClick={() => setActiveTab(0)}
          onKeyDown={(e) => handleKeyDown(e, 0)}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 relative ${
            activeTab === 0
              ? 'text-[#a8c5b5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#a8c5b5] after:rounded-t-sm'
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
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 relative ${
            activeTab === 1
              ? 'text-[#a8c5b5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#a8c5b5] after:rounded-t-sm'
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

      <div className="tab-content" style={{ height: 'auto', minHeight: '450px' }}>
        {/* 
          Using minHeight to prevent tab content from collapsing when switching tabs.
          This ensures a consistent height across all tabs.
        */}
        {React.Children.map(children, (child, index) => (
          <div
            ref={el => (contentRefs.current[index] = el)}
            className={`transition-opacity duration-200 h-full ${
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