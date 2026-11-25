import { runGit } from '../../../utils/git';

export const currentGitBranch = (repoPath: string) => runGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
