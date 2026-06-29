import isRequestTagsIncluded from './index';

describe('isRequestTagsIncluded', () => {
  it('should include request when it has an included tag', () => {
    const requestTags = ['tag1', 'tag2'];
    const includeTags = ['tag1'];
    const excludeTags: string[] = [];
    const result = isRequestTagsIncluded(requestTags, includeTags, excludeTags);
    expect(result).toBe(true);
  });

  it('should include request when included tags is empty', () => {
    const requestTags = ['tag1', 'tag2'];
    const includeTags: string[] = [];
    const excludeTags: string[] = [];
    const result = isRequestTagsIncluded(requestTags, includeTags, excludeTags);
    expect(result).toBe(true);
  });

  it('should exclude request when it does not have an included tag', () => {
    const requestTags = ['tag1'];
    const includeTags = ['tag2'];
    const excludeTags: string[] = [];
    const result = isRequestTagsIncluded(requestTags, includeTags, excludeTags);
    expect(result).toBe(false);
  });

  it('should exclude request when it has an excluded tag', () => {
    const requestTags = ['tag1'];
    const includeTags: string[] = [];
    const excludeTags = ['tag1'];
    const result = isRequestTagsIncluded(requestTags, includeTags, excludeTags);
    expect(result).toBe(false);
  });

  it('should exclude request when it has both included and excluded tag', () => {
    const requestTags = ['tag1', 'tag2'];
    const includeTags: string[] = ['tag2'];
    const excludeTags = ['tag1'];
    const result = isRequestTagsIncluded(requestTags, includeTags, excludeTags);
    expect(result).toBe(false);
  });

  it('should handle requestTags as a single string when excluding', () => {
    const result = isRequestTagsIncluded('ignore', [], ['ignore']);
    expect(result).toBe(false);
  });

  it('should handle requestTags as a single string when including', () => {
    const result = isRequestTagsIncluded('smoke', ['smoke'], []);
    expect(result).toBe(true);
  });

  it('should handle requestTags as a single string that does not match exclude', () => {
    const result = isRequestTagsIncluded('smoke', [], ['ignore']);
    expect(result).toBe(true);
  });

  it('should handle requestTags as undefined without crashing', () => {
    const result = isRequestTagsIncluded(undefined, [], ['ignore']);
    expect(result).toBe(true);
  });

  it('should not include request when requestTags is undefined and includeTags is non-empty', () => {
    const result = isRequestTagsIncluded(undefined, ['smoke'], []);
    expect(result).toBe(false);
  });

  it('should handle requestTags as null without crashing', () => {
    const result = isRequestTagsIncluded(null, [], ['ignore']);
    expect(result).toBe(true);
  });

  it('should handle requestTags as a comma-separated string', () => {
    const result = isRequestTagsIncluded('smoke, api', ['smoke'], []);
    expect(result).toBe(true);
  });

  it('should handle comma-separated string with exclusion', () => {
    const result = isRequestTagsIncluded('smoke, ignore', [], ['ignore']);
    expect(result).toBe(false);
  });
});
