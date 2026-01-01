import { useMemo } from 'react';
import { useTheme } from 'providers/Theme';

const Method = ({ method }) => {
  const { theme } = useTheme();

  const methodColor = useMemo(() => {
    const methodLower = method?.toLowerCase();
    return theme.request.methods[methodLower] || theme.text;
  }, [method, theme]);

  return (
    <span className="font-medium" style={{ color: methodColor, fontSize: theme.font.size.xs }}>
      {method}
    </span>
  );
};

export default Method;
