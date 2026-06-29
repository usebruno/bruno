const {
  isFormUrlEncodedContentType,
  stringifyFormUrlEncodedBody
} = require('../../src/ipc/network/form-url-encoded');

describe('form urlencoded request body handling', () => {
  it('recognizes content type parameters such as charset', () => {
    expect(
      isFormUrlEncodedContentType('application/x-www-form-urlencoded;charset=UTF-8')
    ).toBe(true);
    expect(
      isFormUrlEncodedContentType(' application/x-www-form-urlencoded ; charset=UTF-8')
    ).toBe(true);
  });

  it('stringifies form rows when the content type has parameters', () => {
    const data = [
      { uid: '1', name: 'termId', value: '1476459455', enabled: true },
      { uid: '2', name: 'question', value: '{"id":123,"title":"test"}', enabled: true }
    ];

    const result = stringifyFormUrlEncodedBody(
      'application/x-www-form-urlencoded;charset=UTF-8',
      data
    );

    expect(result).toBe(
      'termId=1476459455&question=%7B%22id%22%3A123%2C%22title%22%3A%22test%22%7D'
    );
    expect(result).not.toContain('0%5Bname%5D');
    expect(result).not.toContain('0[name]');
  });

  it('leaves non-urlencoded content types unchanged', () => {
    const data = [{ name: 'termId', value: '1476459455' }];

    expect(stringifyFormUrlEncodedBody('application/json', data)).toBe(data);
  });

  it('leaves pre-encoded string bodies unchanged', () => {
    const body = 'termId=1476459455';

    expect(
      stringifyFormUrlEncodedBody('application/x-www-form-urlencoded;charset=UTF-8', body)
    ).toBe(body);
  });
});
