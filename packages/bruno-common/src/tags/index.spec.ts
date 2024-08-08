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
});
