import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const SidebarAccordionContext = createContext();

export const useSidebarAccordion = () => {
  const context = useContext(SidebarAccordionContext);
  if (!context) {
    throw new Error('useSidebarAccordion must be used within SidebarAccordionProvider');
  }
  return context;
};

export const SidebarAccordionProvider = ({ children, defaultExpanded = ['collections'] }) => {
  const [expandedSections, setExpandedSections] = useState(new Set(defaultExpanded));
  const dropdownContainerRef = useRef(null);

  const toggleSection = useCallback((sectionId) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const setSectionExpanded = useCallback((sectionId, expanded) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(sectionId);
      } else {
        newSet.delete(sectionId);
      }
      return newSet;
    });
  }, []);

  const isExpanded = useCallback((sectionId) => {
    return expandedSections.has(sectionId);
  }, [expandedSections]);

  const getExpandedCount = useCallback(() => {
    return expandedSections.size;
  }, [expandedSections]);

  return (
    <SidebarAccordionContext.Provider
      value={{
        expandedSections,
        toggleSection,
        setSectionExpanded,
        isExpanded,
        getExpandedCount,
        dropdownContainerRef
      }}
    >
      <div ref={dropdownContainerRef}>
        {children}
      </div>
    </SidebarAccordionContext.Provider>
  );
};
