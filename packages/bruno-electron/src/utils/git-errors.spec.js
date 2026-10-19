const { toReadableGitError } = require('./git-errors');

describe('toReadableGitError', () => {
  it.each([
    ['fatal: Authentication failed for \'https://github.com/org/repo.git/\'', 'Authentication failed'],
    ['fatal: could not read Username for \'https://github.com\': terminal prompts disabled', 'Authentication failed'],
    ['git@github.com: Permission denied (publickey).', 'Authentication failed'],
    ['*** Please tell me who you are.', 'Set user.name and user.email'],
    [' ! [rejected]        main -> main (fetch first)', 'Pull before pushing'],
    ['fatal: Not possible to fast-forward, aborting.', 'cannot be fast-forwarded'],
    ['fatal: \'origin\' does not appear to be a git repository', 'No remote is configured'],
    ['block timeout reached', 'took too long']
  ])('maps "%s" to a readable message', (stderr, expected) => {
    const original = new Error(stderr);
    const readable = toReadableGitError(original);

    expect(readable.message).toContain(expected);
    expect(readable.cause).toBe(original);
  });

  it('passes an unknown error through unchanged', () => {
    const original = new Error('fatal: something unexpected');

    expect(toReadableGitError(original)).toBe(original);
  });
});
