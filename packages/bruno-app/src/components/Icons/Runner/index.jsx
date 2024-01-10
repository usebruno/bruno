export const Runner = ({ className = '', size = 16, strokeWidth = 2 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`icon icon-tabler icon-tabler-run ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M4 17l5 1l.75 -1.5" />
      <path d="M15 21l0 -4l-4 -3l1 -6" />
      <path d="M7 12l0 -3l5 -1l3 3l3 1" />
    </svg>
  );
};
