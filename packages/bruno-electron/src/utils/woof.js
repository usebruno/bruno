const easterEggResponse = (request) => {
  const woofStart = Date.now();
  const body = [
    'Woof! Woof!',
    '',
    '       __',
    '   (___()\'`;',
    '   /,    /`',
    '   \\\\"--\\\\',
    '',
    'Bruno fetched your request. Good human.'
  ].join('\n');
  const buffer = Buffer.from(body, 'utf-8');
  return {
    status: 200,
    statusText: 'Woof!',
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-good-boy': 'true',
      'x-fetched-by': 'bruno'
    },
    data: body,
    dataBuffer: buffer.toString('base64'),
    size: buffer.byteLength,
    duration: Date.now() - woofStart,
    url: request.url,
    timeline: [],
    requestSent: {
      url: request.url,
      method: 'WOOF',
      headers: request.headers,
      data: null,
      timestamp: woofStart
    }
  };
};

module.exports = { easterEggResponse };
