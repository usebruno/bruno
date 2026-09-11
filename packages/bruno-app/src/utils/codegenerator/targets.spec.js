import { getLanguages } from './targets';

describe('code generator languages', () => {
  test('marks 1C clients as plain text for the code view', () => {
    const languages = getLanguages().filter((language) => language.target === '1c');

    expect(languages).toHaveLength(6);
    languages.forEach((language) => {
      expect(language.name).toMatch(/^1C-/);
      expect(language.language).toBe('text/plain');
    });
  });
});
