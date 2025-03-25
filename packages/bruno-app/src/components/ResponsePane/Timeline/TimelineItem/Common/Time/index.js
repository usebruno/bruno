import { useState, useEffect } from "react";

const getRelativeTime = (date) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
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
    const [relativeTime, setRelativeTime] = useState(getRelativeTime(new Date(timestamp)));

    useEffect(() => {
        const interval = setInterval(() => {
            setRelativeTime(getRelativeTime(new Date(timestamp)));
        }, 60000);

        return () => clearInterval(interval);
    }, [timestamp]);

    return <pre className="text-xs">{relativeTime}</pre>;
};
