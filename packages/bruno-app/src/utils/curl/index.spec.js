const { describe, it, expect } = require('@jest/globals');

import { getRequestFromCurlCommand } from '.';

describe('getRequestFromCurlCommand', () => {
  it('preserves duplicate form-url-encoded fields from curl imports', () => {
    const curlCommand = `curl --request GET \\
      --url https://postman-echo.com/get \\
      --header 'content-type: application/x-www-form-urlencoded' \\
      --data tag=value \\
      --data name=ishowspeed \\
      --data tag=brook`;

    const result = getRequestFromCurlCommand(curlCommand);

    expect(result.body.formUrlEncoded).toEqual([
      { name: 'tag', value: 'value', enabled: true },
      { name: 'tag', value: 'brook', enabled: true },
      { name: 'name', value: 'ishowspeed', enabled: true }
    ]);
  });
});
