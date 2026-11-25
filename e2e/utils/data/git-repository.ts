import fs from 'fs';
import path from 'path';
import { runGit } from '../git';

export type GitRepositoryEntry = { folder: string; brunoJson?: string; openCollectionYml?: string };

export const validCollectionEntry = (name: string, folder: string = name): GitRepositoryEntry => ({
  folder,
  brunoJson: JSON.stringify({ version: '1', name, type: 'collection' })
});

export const ymlCollectionEntry = (name: string, folder: string): GitRepositoryEntry => ({
  folder,
  openCollectionYml: `opencollection: 1.0.0\ninfo:\n  name: ${name}\n`
});

export const createGitRepository = async (repoPath: string, entries: GitRepositoryEntry[]) => {
  await fs.promises.mkdir(repoPath, { recursive: true });
  runGit(repoPath, ['init', '-q', '-b', 'main']);
  for (const { folder, brunoJson, openCollectionYml } of entries) {
    const folderPath = path.join(repoPath, folder);
    await fs.promises.mkdir(folderPath, { recursive: true });
    if (brunoJson !== undefined) {
      await fs.promises.writeFile(path.join(folderPath, 'bruno.json'), brunoJson);
    }
    if (openCollectionYml !== undefined) {
      await fs.promises.writeFile(path.join(folderPath, 'opencollection.yml'), openCollectionYml);
    }
  }
  runGit(repoPath, ['add', '-A']);
  runGit(repoPath, ['-c', 'user.name=bruno', '-c', 'user.email=bruno@example.com', 'commit', '-q', '-m', 'init']);
};
