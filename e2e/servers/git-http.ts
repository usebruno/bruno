import fs from 'fs';
import path from 'path';
import { runGit } from '../utils/git';
import { startLocalServer } from './http';

type ServeGitRepositoryOptions = {
  sourceRepoPath: string;
  servedRoot: string;
  owner?: string;
  holdResponses?: boolean;
};

export const serveGitRepository = async ({ sourceRepoPath, servedRoot, owner = 'acme', holdResponses = false }: ServeGitRepositoryOptions) => {
  const repoName = `${path.basename(sourceRepoPath)}.git`;
  const barePath = path.join(servedRoot, owner, repoName);
  await fs.promises.mkdir(path.dirname(barePath), { recursive: true });
  runGit(servedRoot, ['clone', '-q', '--bare', sourceRepoPath, barePath]);
  runGit(barePath, ['update-server-info']);

  const root = path.resolve(servedRoot);
  let heldResponses: Array<() => void> | null = holdResponses ? [] : null;
  const server = await startLocalServer((req, res) => {
    const filePath = path.resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`);
    if (!filePath.startsWith(`${root}${path.sep}`)) {
      res.writeHead(403).end();
      return;
    }
    const respond = () => fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' }).end(data);
    });
    if (heldResponses) {
      heldResponses.push(respond);
    } else {
      respond();
    }
  });

  return {
    url: `${server.url}/${owner}/${repoName}`,
    cloneFolderName: path.basename(sourceRepoPath),
    releaseResponses: () => {
      const queued = heldResponses ?? [];
      heldResponses = null;
      queued.forEach((respond) => respond());
    },
    close: server.close
  };
};
