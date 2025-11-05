import React, { createContext, useContext } from 'react';
import { useTheme } from 'providers/Theme';

const TabsContext = createContext();

export const Tabs = ({ value, onValueChange, children, className = '' }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={`flex flex-col h-full flex-1 ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className = '' }) => {
  const { theme } = useTheme();

  return (
    <div
      className={`inline-flex h-8 w-fit justify-center rounded-md p-0.5 gap-[2px] ${className}`}
      style={{ background: theme.tabs.secondary.inactive.bg }}
    >
      {children}
    </div>
  );
};

export const TabsTrigger = ({ value: triggerValue, children, className = '' }) => {
  const { value, onValueChange } = useContext(TabsContext);
  const { theme } = useTheme();
  const isActive = value === triggerValue;

  return (
    <button
      onClick={() => onValueChange(triggerValue)}
      className={`inline-flex items-center justify-center rounded-[4px] p-[8px] text-sm whitespace-nowrap transition-all cursor-pointer border border-transparent hover:opacity-90 ${className}`}
      style={{
        background: isActive ? theme.tabs.secondary.active.bg : 'transparent',
        color: isActive ? theme.tabs.secondary.active.color : theme.tabs.secondary.inactive.color
      }}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value: contentValue, children, className = '', dataTestId = '' }) => {
  const { value } = useContext(TabsContext);
  const isActive = value === contentValue;

  return (
    <div
      className={`outline-none flex flex-col h-full flex-1 ${className}`}
      data-testid={dataTestId}
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      {children}
    </div>
  );
};
