import React, { createContext, useContext, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSidebarSectionExpanded } from 'providers/ReduxStore/slices/app';

const SidebarAccordionContext = createContext();

export const useSidebarAccordion = () => {
  const context = useContext(SidebarAccordionContext);
  if (!context) {
    throw new Error('useSidebarAccordion must be used within SidebarAccordionProvider');
  }
  return context;
};

// Expansion state lives in the redux `app` slice so it persists across restarts
// through the snapshot (alongside sidebarSectionSizes). This provider is a thin
// wrapper exposing the same imperative API the sidebar already consumed, plus a
// ref used to anchor sidebar dropdowns.
export const SidebarAccordionProvider = ({ children }) => {
  const dispatch = useDispatch();
  const expandedSections = useSelector((state) => state.app.sidebarExpandedSections);
  const dropdownContainerRef = useRef(null);

  const toggleSection = useCallback((sectionId) => {
    dispatch(setSidebarSectionExpanded({ id: sectionId, expanded: !expandedSections.includes(sectionId) }));
  }, [dispatch, expandedSections]);

  const setSectionExpanded = useCallback((sectionId, expanded) => {
    dispatch(setSidebarSectionExpanded({ id: sectionId, expanded }));
  }, [dispatch]);

  const isExpanded = useCallback((sectionId) => {
    return expandedSections.includes(sectionId);
  }, [expandedSections]);

  const getExpandedCount = useCallback(() => {
    return expandedSections.length;
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
