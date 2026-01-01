import { useTheme } from 'providers/Theme';

const Method = ({ method }) => {
  const { theme } = useTheme();
  const methodUpper = method?.toUpperCase();
  const methodColor = theme.request.methods[methodUpper?.toLowerCase()] || theme.text;

  return (
    <span className="timeline-method" style={{ color: methodColor, fontWeight: 'bold' }}>
      {methodUpper}
    </span>
  );
};

export default Method;
