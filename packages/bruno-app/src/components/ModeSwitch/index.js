const ModeSwitch = ({ checked, onChange, leftComponent, rightComponent, className, ...props }) => {
  const leftIconClassName = checked
    ? 'text-neutral-500 dark:text-neutral-200'
    : 'text-neutral-800 dark:text-neutral-800';

  const rightIconClassName = checked
    ? 'text-neutral-800 dark:text-neutral-800'
    : 'text-neutral-500 dark:text-neutral-200';

  return (
    <button
      onClick={onChange}
      className={`
          relative w-[80px] h-[40px] p-1 flex justify-between
          bg-neutral-200 dark:bg-neutral-900 rounded-sm  dark:border-gray-600
          transition-colors flex-shrink-0 ${className}`}
      {...props}
    >
      <div
        className={`
            absolute top-1 bottom-1 left-1 w-[36px] bg-neutral-300 dark:bg-gray-300
            rounded-sm transition-transform duration-300
            ${checked ? 'translate-x-[36px]' : 'translate-x-0'}
          `}
      />

      {leftComponent && (
        <span
          className={`
            relative flex items-center justify-center
            w-full h-full transition-colors ${leftIconClassName}`}
        >
          {leftComponent}
        </span>
      )}
      {rightComponent && (
        <span
          className={`
            relative flex items-center justify-center
            w-full  h-full transition-colors ${rightIconClassName}
          `}
        >
          {rightComponent}
        </span>
      )}
    </button>
  );
};

export default ModeSwitch;
