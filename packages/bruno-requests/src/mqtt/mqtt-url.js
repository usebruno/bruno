/**
 * Get parsed MQTT URL object
 * @param {string} url - The MQTT URL
 * @returns {Object} Parsed URL object with protocol, host, port, fullUrl
 */
export const getParsedMqttUrlObject = (url) => {
  const addProtocolIfMissing = (str) => {
    if (str.includes('://')) return str;

    if (str.includes('localhost') || str.includes('127.0.0.1')) {
      return `mqtt://${str}`;
    }

    return `mqtts://${str}`;
  };

  if (!url) return { host: '', port: 1883, fullUrl: '' };

  try {
    // mqtt:// URLs don't parse natively with URL, so replace protocol temporarily
    const withProtocol = addProtocolIfMissing(url);
    const isMqtts = withProtocol.startsWith('mqtts://');
    const httpUrl = withProtocol.replace(/^mqtts?:\/\//, 'http://');
    const urlObj = new URL(httpUrl);

    const protocol = isMqtts ? 'mqtts' : 'mqtt';
    const defaultPort = isMqtts ? 8883 : 1883;
    const port = urlObj.port ? parseInt(urlObj.port, 10) : defaultPort;

    return {
      protocol,
      host: urlObj.hostname,
      port,
      fullUrl: `${protocol}://${urlObj.hostname}:${port}`
    };
  } catch (err) {
    console.error('Failed to parse MQTT URL:', err);
    return {
      host: '',
      port: 1883,
      fullUrl: ''
    };
  }
};
