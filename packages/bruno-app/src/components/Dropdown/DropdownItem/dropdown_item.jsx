import React from 'react';

export const DropdownItem = ({ children, className, onClick }) => {
  return (
    <button
      className={`
      flex items-center py-1.5 px-2 rounded group leading-5 hover:bg-slate-200 
      dark:hover:bg-slate-700 focus:outline-none focus:bg-zinc-200 dark:focus:bg-zinc-700
      ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
