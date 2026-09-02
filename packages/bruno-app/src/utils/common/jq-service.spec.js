import { runJqFilter } from './jq-service';

describe('runJqFilter', () => {
  const data = {
    store: {
      books: [
        { title: 'Sayings of the Century', author: 'Nigel Rees', price: 8.95 },
        { title: 'Sword of Honour', author: 'Evelyn Waugh', price: 12.99 }
      ]
    }
  };

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should return the jq output for the given filter', async () => {
    const result = await runJqFilter(data, '.store.books[].author');

    expect(JSON.parse(`[${result.trim().split('\n').join(',')}]`)).toEqual(['Nigel Rees', 'Evelyn Waugh']);
  });

  it('should support filters that build new values', async () => {
    const result = await runJqFilter(data, '[.store.books[] | select(.price > 10) | .title]');

    expect(JSON.parse(result)).toEqual(['Sword of Honour']);
  });

  it('should accept a JSON string as input', async () => {
    const result = await runJqFilter(JSON.stringify(data), '.store.books | length');

    expect(JSON.parse(result)).toBe(2);
  });

  it('should throw the jq error message for an invalid filter', async () => {
    await expect(runJqFilter(data, '.store.books[')).rejects.toThrow(/syntax error/);
    expect(console.warn).toHaveBeenCalledWith('Could not apply jq filter:', expect.stringMatching(/syntax error/));
  });

  it('should throw when the filter fails at runtime', async () => {
    await expect(runJqFilter(data, '.store.books.title')).rejects.toThrow(/Cannot index array/);
  });
});
