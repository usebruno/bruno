import React from 'react';
import classnames from 'classnames';

export const DropdownItem = ({ children, className, onClick, isTitle, active, warning }) => {
  const baseClasses = 'flex items-center px-2 group leading-5';
  const activeClasses = 'font-medium !text-green-600 dark:!text-green-500 bg-green-100 dark:bg-green-400/10 my-0.75';
  const warningClasses = '!text-amber-500 bg-amber-400/10 my-0.75';
  const conditionalClasses = isTitle
    ? 'cursor-default bg-slate-700 rounded-none -mx-1 py-1 my-0.75'
    : 'py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:bg-zinc-200 dark:focus:bg-zinc-700';
  return (
    <button
      className={classnames(
        baseClasses,
        conditionalClasses,
        { [activeClasses]: active },
        { [warningClasses]: warning },
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
