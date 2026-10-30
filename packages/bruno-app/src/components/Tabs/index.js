import React, { Children, createContext, isValidElement, useContext, useRef } from 'react';
import classnames from 'classnames';
import { IconChevronsRight } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import useTabsOverflow from './useTabsOverflow';
import StyledWrapper from './StyledWrapper';

const TabsContext = createContext();

const textContentOf = (children) =>
  Children.toArray(children)
    .filter((child) => typeof child === 'string' || typeof child === 'number')
    .join('')
    .trim();

const overflowIcon = <IconChevronsRight size={16} strokeWidth={2} />;

export const Tabs = ({ value, onValueChange, children, className = '' }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <StyledWrapper className={`flex flex-col h-full flex-1 ${className}`}>{children}</StyledWrapper>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className = '', dataTestId = 'tabs-list' }) => {
  const { value, onValueChange } = useContext(TabsContext);
  const menuDropdownRef = useRef(null);

  const triggers = Children.toArray(children).filter(isValidElement);
  const keys = triggers.map((trigger) => trigger.props.value);
  const { listRef, measureRowRef, overflowTriggerMeasureRef, setMeasureRef, overflowKeys } = useTabsOverflow({
    keys,
    activeKey: value
  });

  const visibleTriggers = triggers.filter((trigger) => !overflowKeys.includes(trigger.props.value));
  const overflowTriggers = overflowKeys
    .map((key) => triggers.find((trigger) => trigger.props.value === key))
    .filter(Boolean);

  const overflowMenuItems = overflowTriggers.map((trigger) => ({
    id: trigger.props.value,
    label: <span className="flex items-center gap-1">{trigger.props.children}</span>,
    ariaLabel: textContentOf(trigger.props.children) || trigger.props.value,
    onClick: () => {
      onValueChange(trigger.props.value);
      menuDropdownRef.current?.hide();
    }
  }));

  return (
    <div ref={listRef} className={`tabs-list ${className}`} data-testid={dataTestId}>
      {/* Measured clones are plain buttons, not TabsTrigger, so `tab-trigger-${value}` ids stay unique. */}
      <div ref={measureRowRef} className="tabs-list-measure" aria-hidden="true">
        {triggers.map((trigger) => (
          <button
            key={trigger.props.value}
            type="button"
            tabIndex={-1}
            className={classnames('tab-trigger', trigger.props.className)}
            ref={(el) => setMeasureRef(trigger.props.value, el)}
          >
            {trigger.props.children}
          </button>
        ))}
        <button
          type="button"
          tabIndex={-1}
          className="tab-trigger tabs-overflow-trigger"
          ref={overflowTriggerMeasureRef}
        >
          {overflowIcon}
        </button>
      </div>

      {visibleTriggers}

      {overflowTriggers.length > 0 && (
        <MenuDropdown
          ref={menuDropdownRef}
          items={overflowMenuItems}
          placement="bottom-start"
          selectedItemId={value}
          appendTo={() => document.body}
        >
          <button
            type="button"
            className="tab-trigger tabs-overflow-trigger"
            data-testid="tabs-overflow-trigger"
            aria-label="More tabs"
          >
            {overflowIcon}
          </button>
        </MenuDropdown>
      )}
    </div>
  );
};

export const TabsTrigger = ({ value: triggerValue, children, className = '' }) => {
  const { value, onValueChange } = useContext(TabsContext);
  const isActive = value === triggerValue;

  return (
    <button
      onClick={() => onValueChange(triggerValue)}
      data-testid={`tab-trigger-${triggerValue}`}
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
