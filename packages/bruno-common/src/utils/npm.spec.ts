import { describe, it, expect } from '@jest/globals';
import { isValidNpmPackageName } from './npm';

describe('isValidNpmPackageName', () => {
  it.each([
    'lodash',
    'dayjs',
    'uuid',
    '@scope/pkg',
    'csv-parse',
    'package.name',
    '@team/secret-sauce'
  ])('accepts valid package name: %s', (name) => {
    expect(isValidNpmPackageName(name)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['whitespace', 'foo bar'],
    ['shell injection', 'foo; rm -rf /'],
    ['command substitution', '$(whoami)'],
    ['leading dot', '.hidden'],
    ['non-string', 123],
    ['null', null],
    ['undefined', undefined]
  ])('rejects %s', (_label, name) => {
    expect(isValidNpmPackageName(name)).toBe(false);
  });
});
