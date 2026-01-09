import React, { createContext, useContext } from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

const TabsContext = createContext();

export const Tabs = ({ value, onValueChange, children, className = '' }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <StyledWrapper className={`flex flex-col h-full flex-1 ${className}`}>{children}</StyledWrapper>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className = '' }) => {
  return <div className={`tabs-list ${className}`}>{children}</div>;
};

export const TabsTrigger = ({ value: triggerValue, children, className = '' }) => {
  const { value, onValueChange } = useContext(TabsContext);
  const isActive = value === triggerValue;

  return (
    <button
      onClick={() => onValueChange(triggerValue)}
      className={classnames('tab-trigger', className, { active: isActive })}
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
