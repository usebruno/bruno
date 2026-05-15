import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'providers/Theme';

const getRelativeTime = (date, language) => {
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  const diff = (date - new Date()) / 1000;

  const timeUnits = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 }
  ];

  for (const { unit, seconds } of timeUnits) {
    if (Math.abs(diff) >= seconds || unit === 'second') {
      return rtf.format(Math.round(diff / seconds), unit);
    }
  }
};

export const RelativeTime = ({ timestamp }) => {
  const { i18n } = useTranslation();
  const [relativeTime, setRelativeTime] = useState(getRelativeTime(new Date(timestamp), i18n.language));
  const { theme } = useTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(new Date(timestamp), i18n.language));
    }, 1000);

    return () => clearInterval(interval);
  }, [timestamp, i18n.language]);

  return (
    <span
      title={new Date(timestamp).toLocaleString()}
      style={{
        fontSize: theme.font.size.xs,
        color: theme.colors.text.muted
      }}
    >
      {relativeTime}
    </span>
  );
};
