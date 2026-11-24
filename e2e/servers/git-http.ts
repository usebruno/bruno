import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { startLocalServer } from './http';

const git = (cwd: string, args: string[]) => {
  execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
};

type ServeGitRepositoryOptions = {
  sourceRepoPath: string;
  servedRoot: string;
  owner?: string;
};

// Serves a bare copy of a local repository over git's dumb HTTP protocol, so ls-remote and clone need no network
export const serveGitRepository = async ({ sourceRepoPath, servedRoot, owner = 'acme' }: ServeGitRepositoryOptions) => {
  const repoName = `${path.basename(sourceRepoPath)}.git`;
  const barePath = path.join(servedRoot, owner, repoName);
  await fs.promises.mkdir(path.dirname(barePath), { recursive: true });
  git(servedRoot, ['clone', '-q', '--bare', sourceRepoPath, barePath]);
  git(barePath, ['update-server-info']);

  const root = path.resolve(servedRoot);
  const server = await startLocalServer((req, res) => {
    const filePath = path.resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`);
    if (!filePath.startsWith(`${root}${path.sep}`)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' }).end(data);
    });
  });

  return {
    url: `${server.url}/${owner}/${repoName}`,
    close: server.close
  };
};
