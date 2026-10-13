import { isIterationsValid, toRunIterationConfig } from './runner-iterations';

describe('runner iterations', () => {
  describe('isIterationsValid', () => {
    it('accepts an empty field and positive whole numbers', () => {
      expect(isIterationsValid('')).toBe(true);
      expect(isIterationsValid(null)).toBe(true);
      expect(isIterationsValid('3')).toBe(true);
    });

    it('rejects zero, negatives, fractions and text', () => {
      ['0', '-1', '1.5', 'abc'].forEach((value) => expect(isIterationsValid(value)).toBe(false));
    });
  });

  describe('toRunIterationConfig', () => {
    it('sends the data file path and a numeric count', () => {
      expect(toRunIterationConfig({ dataFile: { path: '/data/users.csv' }, iterations: '4' })).toEqual({ dataFilePath: '/data/users.csv', iterations: 4 });
    });

    it('leaves the count unset so the main process runs one iteration per row', () => {
      expect(toRunIterationConfig({ dataFile: null, iterations: '' })).toEqual({ dataFilePath: null, iterations: null });
    });
  });
});
