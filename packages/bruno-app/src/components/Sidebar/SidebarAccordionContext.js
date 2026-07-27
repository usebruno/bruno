import React, { createContext, useContext, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSidebarSectionExpanded, removeSidebarSectionSize } from 'providers/ReduxStore/slices/app';

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

  const setSectionExpanded = useCallback((sectionId, expanded) => {
    dispatch(setSidebarSectionExpanded({ id: sectionId, expanded }));
    // Closing a section drops its stored height so it reopens at the 1/N default.
    if (!expanded) {
      dispatch(removeSidebarSectionSize(sectionId));
    }
  }, [dispatch]);

  const isExpanded = useCallback((sectionId) => {
    return expandedSections.includes(sectionId);
  }, [expandedSections]);

  return (
    <SidebarAccordionContext.Provider
      value={{
        expandedSections,
        setSectionExpanded,
        isExpanded,
        dropdownContainerRef
      }}
    >
      <div ref={dropdownContainerRef}>
        {children}
      </div>
    </SidebarAccordionContext.Provider>
  );
};
