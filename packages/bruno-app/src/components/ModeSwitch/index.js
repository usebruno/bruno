const ModeSwitch = ({ checked, onChange, leftComponent, rightComponent, className, ...props }) => {
  return (
    <button
      onClick={onChange}
      className={`
          relative w-[80px] p-1 flex justify-between
          bg-neutral-900 rounded-sm  dark:border-gray-600
          transition-colors h-full flex-shrink-0 ${className}`}
      {...props}
    >
      <div
        className={`
            absolute top-1 bottom-1 left-1 w-[30px] bg-white dark:bg-gray-300
            rounded-sm transition-transform duration-300
            ${checked ? 'translate-x-[40px]' : 'translate-x-1'}
          `}
      />

      {leftComponent && (
        <span
          className="
            relative flex items-center justify-center
            w-full h-full transition-colors
          "
          style={{ color: checked ? '#666' : '#000' }}
        >
          {leftComponent}
        </span>
      )}
      {rightComponent && (
        <span
          className="
            relative flex items-center justify-center
            w-full  h-full transition-colors
          "
          style={{ color: checked ? '#000' : '#666' }}
        >
          {rightComponent}
        </span>
      )}
    </button>
  );
};

export default ModeSwitch;
