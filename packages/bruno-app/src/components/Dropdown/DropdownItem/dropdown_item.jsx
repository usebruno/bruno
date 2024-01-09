import React from 'react';

export const DropdownItem = ({ children, className, onClick }) => {
  return (
    <button
      className={`flex items-center py-1 px-2 rounded ${className} hover:bg-zinc-100 focus:outline-none focus:bg-zinc-100`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
