/*
 * Git reports failures as raw stderr. These are the ones a user can act on, matched in order;
 * anything else is passed through unchanged so its own message still reaches the UI.
 */
const READABLE_GIT_ERRORS = [
  {
    pattern: /block timeout reached/i,
    message: 'The Git operation took too long. Check your connection and credentials.'
  },
  {
    pattern: /authentication failed|could not read (username|password)|terminal prompts disabled|permission denied \(publickey/i,
    message: 'Authentication failed. Configure your Git credentials (a credential helper or an SSH key).'
  },
  {
    pattern: /please tell me who you are|unable to auto-detect email address/i,
    message: 'Git does not know who you are. Set user.name and user.email in your Git config.'
  },
  {
    pattern: /not possible to fast-forward|diverging branches/i,
    message: 'The remote branch has diverged and cannot be fast-forwarded. Resolve it from the terminal.'
  },
  {
    pattern: /\[rejected\]|non-fast-forward|fetch first/i,
    message: 'The remote has new commits. Pull before pushing.'
  },
  {
    pattern: /'origin' does not appear to be a git repository|no such remote/i,
    message: 'No remote is configured. Connect a remote repository.'
  }
];

const toReadableGitError = (error) => {
  const text = error instanceof Error ? error.message : String(error);
  const known = READABLE_GIT_ERRORS.find(({ pattern }) => pattern.test(text));

  return known ? new Error(known.message, { cause: error }) : error;
};

module.exports = { toReadableGitError };
