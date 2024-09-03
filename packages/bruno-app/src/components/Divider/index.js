import { useTheme } from 'providers/Theme/index';

export function Divider() {
  const { theme } = useTheme();
  return <hr className={`m-1 border-[${theme.divider.borderColor}]`} />;
}
