import { useTheme } from 'providers/Theme';

const DraftTabIcon = () => {
  const { theme } = useTheme();

  return (
    <svg
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      width="8"
      height="16"
      fill={theme.draftColor}
      className="has-changes-icon"
      viewBox="0 0 8 8"
    >
      <circle cx="4" cy="4" r="3" />
    </svg>
  );
};

export default DraftTabIcon;
