import { replaceLineBreaksWithSpaces } from './utils';

describe('replaceLineBreaksWithSpaces', () => {
  it('replaces CRLF, CR, and LF line breaks with spaces', () => {
    expect(replaceLineBreaksWithSpaces('first\r\nsecond\rthird\nfourth')).toBe('first second third fourth');
  });

  it('preserves values without line breaks', () => {
    expect(replaceLineBreaksWithSpaces('client secret')).toBe('client secret');
  });

  it('preserves non-text input values', () => {
    expect(replaceLineBreaksWithSpaces(false)).toBe(false);
  });
});
