import React from 'react';
import classnames from 'classnames';

const Tab = ({ name, label, isActive, onClick, count = 0, className = '', ...props }) => {
  const tabClassName = classnames('tab select-none', {
    active: isActive
  }, className);

  const handleActivate = () => onClick(name);
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActivate();
    }
  };

  return (
    <div
      className={tabClassName}
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      data-testid={`tab-${name}`}
      {...props}
    >
      {label}
      {count > 0 && <sup className="ml-1 font-medium" data-testid={`tab-${name}-count`}>{count}</sup>}
    </div>
  );
};

export default Tab;
