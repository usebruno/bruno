import React from 'react';
import classnames from 'classnames';

const Tab = ({ name, label, isActive, onClick, count = 0, className = '', ...props }) => {
  const tabClassName = classnames("tab select-none", {
    active: isActive
  }, className);

  return (
    <div 
      className={tabClassName} 
      role="tab" 
      onClick={() => onClick(name)}
      {...props}
    >
      {label}
      {count > 0 && <sup className="ml-1 font-medium">{count}</sup>}
    </div>
  );
};

export default Tab; 