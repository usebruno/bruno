const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { exec } = require('child_process');
const { parseRequest } = require('@usebruno/filestore');

let collectionPathToGitRootPathMap = new Map();

const simpleGitInstances = new Map();

const getGitVersion = () => {
  return new Promise((resolve, reject) => {
    exec('git --version', (error, stdout, stderr) => {
      if (error) {
        return resolve(null);
      }
      const gitVersion = stdout.trim();
      return resolve(gitVersion);
    });
  });
};

const getSimpleGitInstanceForPath = (gitRootPath) => {
  let git = simpleGitInstances.get(gitRootPath);
  if (!git) {
    git = simpleGit(gitRootPath);
    simpleGitInstances.set(gitRootPath, git);
  }
  return git;
};

const handleGitOutput = ({ win, processUid, sendStdout = false }) => (command, stdout, stderr) => {
  const sendProgressUpdate = (data) => {
    win.webContents.send('main:update-git-operation-progress', {
      uid: processUid,
      data: data.toString()
    });
  };

  stderr.on('data', sendProgressUpdate);

  if (sendStdout) {
    stdout.on('data', sendProgressUpdate);
  }
};

const findGitRootPath = (collectionPath) => {
  const gitPath = path.join(collectionPath, '.git');
  try {
    if (fs.existsSync(gitPath)) {
      return gitPath?.split('.git')?.[0];
    } else {
      const parentDir = path.dirname(collectionPath);
      if (parentDir === collectionPath) {
        return null;
      } else {
        return findGitRootPath(parentDir);
      }
    }
  } catch (err) {
    console.error('Error finding .git path:', err);
    return null;
  }
};

const getCollectionGitRootPath = (collectionPath) => {
  let savedGitRootPath = collectionPathToGitRootPathMap.get(collectionPath);
  if (savedGitRootPath) {
    return savedGitRootPath;
  }
  let gitRootPath = findGitRootPath(collectionPath);
  collectionPathToGitRootPathMap.set(collectionPath, gitRootPath);
  return gitRootPath;
};

const getCollectionGitRepoUrl = async (gitRootPath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.listRemote(['--get-url', 'origin'], (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data.trim());
    });
  });
};

const initGit = async (gitRootPath) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);
  await git.init();
  // Create and checkout main branch -> This is specific for use with Bruno
  return await git.raw(['branch', '-M', 'main']);
};

const stageChanges = async (gitRootPath, files) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.add(files, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res);
    });
  });
};

const unstageChanges = async (gitRootPath, files) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);

    // First check the status to see which files are actually staged
    git.status(['--porcelain'], (err, status) => {
      if (err) {
        reject(err);
        return;
      }

      // Filter files to only include those that are actually staged
      const stagedFiles = files.filter((fullPath) => {
        const relativePath = path.relative(gitRootPath, fullPath);
        // Normalize path separators for cross-platform compatibility
        const normalizedPath = relativePath.replace(/\\/g, '/');
        return status.files.some((file) =>
          file.path === normalizedPath
          && (file.index === 'M' || file.index === 'A' || file.index === 'D')
        );
      });

      // If no files are actually staged, just resolve
      if (stagedFiles.length === 0) {
        resolve();
        return;
      }

      // Unstage only the files that are actually staged
      git.reset(['HEAD', '--', ...stagedFiles], (err, res) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
  });
};

const discardChanges = async (gitRootPath, filePaths) => {
  return new Promise(async (resolve, reject) => {
    try {
      const git = getSimpleGitInstanceForPath(gitRootPath);

      // Get current git status to categorize files
      git.status(['--porcelain'], async (err, status) => {
        if (err) {
          reject(err);
          return;
        }

        // Create a map of file paths to their status
        const fileStatusMap = {};
        status.files.forEach((file) => {
          fileStatusMap[file.path] = file;
        });

        // Categorize files based on their git status
        const trackedFiles = [];
        const untrackedFiles = [];

        filePaths.forEach((filePath) => {
          // Normalize paths for comparison
          const relativePath = filePath.startsWith(gitRootPath)
            ? path.relative(gitRootPath, filePath) : filePath;

          // Normalize path separators for cross-platform compatibility
          const normalizedPath = relativePath.replace(/\\/g, '/');
          const fileStatus = fileStatusMap[normalizedPath];

          // If the file is untracked, we need to delete it from the filesystem
          // ? means untracked
          if (fileStatus && fileStatus.working_dir === '?') {
            // Untracked file - needs to be deleted from filesystem
            untrackedFiles.push(filePath);
          } else if (fileStatus) {
            // Tracked file - can be discarded with git checkout
            trackedFiles.push(filePath);
          } else {
            // File not in status - might be already deleted, renamed, or doesn't exist
            console.warn(`File not found in git status: ${relativePath}. File may have been already deleted or moved.`);

            // Check if it's an absolute path that needs to be treated as untracked
            if (filePath.startsWith(gitRootPath) && fs.existsSync(filePath)) {
              console.log(`Treating unknown file as untracked: ${relativePath}`);
              untrackedFiles.push(filePath);
            }
          }
        });

        // Handle tracked and untracked files sequentially
        try {
          // Handle tracked files with git checkout
          if (trackedFiles.length > 0) {
            await new Promise((checkoutResolve, checkoutReject) => {
              git.checkout(trackedFiles, (err, res) => {
                if (err) {
                  console.error('Error discarding tracked files:', err);
                  checkoutReject(err);
                } else {
                  console.log(`Discarded ${trackedFiles.length} tracked files`);
                  checkoutResolve(res);
                }
              });
            });
          }

          // Handle untracked files by deleting them from filesystem
          if (untrackedFiles.length > 0) {
            for (const filePath of untrackedFiles) {
              const fullPath = filePath.startsWith(gitRootPath) ? filePath : path.join(gitRootPath, filePath);

              // Check if file exists before trying to delete
              if (fs.existsSync(fullPath)) {
                await fs.promises.unlink(fullPath);
                console.log(`Deleted untracked file: ${fullPath}`);
              }
            }
          }

          resolve({
            trackedFilesDiscarded: trackedFiles.length,
            untrackedFilesDeleted: untrackedFiles.length
          });
        } catch (discardError) {
          console.error('Error during discard operation:', discardError);
          reject(discardError);
        }
      });
    } catch (gitStatusError) {
      reject(gitStatusError);
    }
  });
};

const commitChanges = async (gitRootPath, message) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.commit(message, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res);
    });
  });
};

const getStagedFileDiff = async (gitRootPath, filePath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.diff(['--no-prefix', '--staged', '--', filePath], (err, stagedChanges) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stagedChanges);
    });
  });
};

const getRenamedFileDiff = async (gitRootPath, file) => {
  return new Promise((resolve, reject) => {
    const git = simpleGit(gitRootPath);
    git.diff(['--staged', '--', file.from, file.to], (err, stagedChanges) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stagedChanges);
    });
  });
};

const getUnstagedFileDiff = async (gitRootPath, filePath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);

    git.status((err, status) => {
      if (err) {
        reject(err);
        return;
      }

      const isFileTracked = status.files.some((file) => {
        const statusFilePath = path.join(gitRootPath, file.path);
        return filePath === statusFilePath && file.index !== '?' && file.working_dir !== '?';
      });

      if (isFileTracked) {
        git.diff(['--no-prefix', '--diff-filter=ACMD', '--', filePath], (err, tracked) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(tracked);
        });
      } else {
        fs.readFile(filePath, 'utf8', (err, content) => {
          if (err) {
            reject(err);
            return;
          }

          const lines = content
            .split('\n')
            .map((line) => `+${line}`)
            .join('\n');

          let diff
            = [
              `diff --git a/${filePath} b/${filePath}`,
              `new file mode 100644`,
              `--- a/${filePath}`,
              `+++ b/${filePath}`,
              `@@ -0,0 +1,${lines.length} @@`,
              `${lines}`
            ].join('\n') + '\n';

          resolve(diff);
        });
      }
    });
  });
};

const getCollectionGitBranches = async (gitRootPath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.branchLocal((err, branches) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(branches.all);
    });
  });
};

const getCurrentGitBranch = async (gitRootPath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.branchLocal((err, branches) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(branches.current);
    });
  });
};

const getDefaultGitBranch = async (gitRootPath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.raw(['symbolic-ref', '--short', 'HEAD'], (err, branch) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(branch.trim());
    });
  });
};

const checkoutGitBranch = async (win, { gitRootPath, branchName, processUid, shouldCreate = false }) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.outputHandler(handleGitOutput({ win, processUid }));

    const checkoutArgs = shouldCreate ? ['-b', branchName, '--progress'] : branchName;
    git.checkout(checkoutArgs, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res);
    });
  });
};

const checkoutRemoteGitBranch = async (win, { gitRootPath, remoteName, branchName, processUid }) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.outputHandler(handleGitOutput({ win, processUid }));

    const remoteBranchName = `${remoteName}/${branchName}`;

    // Check if the remote branch exists
    git.branch(['-r'], async (err, branches) => {
      if (err) {
        reject(err);
        return;
      }

      const remoteBranches = branches.all.map((branch) => branch.trim());
      const remoteBranchExists = remoteBranches.includes(remoteBranchName);

      if (remoteBranchExists) {
        try {
          const localBranches = await getCollectionGitBranches(gitRootPath);
          const localBranchExists = localBranches.includes(branchName);
          if (localBranchExists) {
            // Set the local branch to track the remote branch
            git.branch(['--set-upstream-to', remoteBranchName, branchName], async (err, res) => {
              if (err) {
                reject(err);
              } else {
                git.checkout(branchName, (err, res) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(res);
                  }
                });
              }
            });
          } else {
            git.checkout(['-b', branchName, '--track', remoteBranchName, '--progress'], (err, res) => {
              if (err) {
                reject(err);
              } else {
                resolve(res);
              }
            });
          }
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`Remote branch ${remoteBranchName} does not exist`));
      }
    });
  });
};

const getCollectionGitLogs = async (gitRootPath) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);

  try {
    // Get logs with shortstat for file change info
    const result = await git.raw([
      'log',
      '--format=%H|%s|%an|%aI',
      '--shortstat',
      '-n', '500'
    ]);

    if (!result || !result.trim()) {
      return [];
    }

    const commits = [];
    const lines = result.split('\n');
    let currentCommit = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check if this is a commit line (contains | separators)
      if (trimmedLine.includes('|')) {
        // If we have a pending commit, push it
        if (currentCommit) {
          commits.push(currentCommit);
        }

        const parts = trimmedLine.split('|');
        if (parts.length >= 4) {
          currentCommit = {
            hash: parts[0],
            message: parts[1],
            author_name: parts[2],
            date: parts[3],
            filesChanged: 0,
            insertions: 0,
            deletions: 0
          };
        }
      } else if (currentCommit && trimmedLine.includes('changed')) {
        // This is a shortstat line, parse it
        // Format: " 3 files changed, 45 insertions(+), 12 deletions(-)"
        const filesMatch = trimmedLine.match(/(\d+) files? changed/);
        const insertionsMatch = trimmedLine.match(/(\d+) insertions?\(\+\)/);
        const deletionsMatch = trimmedLine.match(/(\d+) deletions?\(-\)/);

        if (filesMatch) currentCommit.filesChanged = parseInt(filesMatch[1], 10);
        if (insertionsMatch) currentCommit.insertions = parseInt(insertionsMatch[1], 10);
        if (deletionsMatch) currentCommit.deletions = parseInt(deletionsMatch[1], 10);
      }
    }

    // Push the last commit if exists
    if (currentCommit) {
      commits.push(currentCommit);
    }

    return commits;
  } catch (err) {
    console.error('Error getting git logs:', err);
    return [];
  }
};

const getCollectionGitTagsWithDetails = (gitRootPath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git
      .tags(['-l', '--format=%(refname:short)||%(creatordate)||%(creator)'])
      .then((tags) => {
        const tagDetails = tags.all?.map((tag) => {
          const [name, date, author] = tag.split('||');
          return { name, date, author };
        });
        resolve(tagDetails);
      })
      .catch(reject);
  });
};

const canPush = async (gitRootPath) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);
  const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
  const remote = await git.listRemote(['--get-url', 'origin']);

  if (!remote) {
    throw new Error('Remote not configured');
  }

  const remoteInfo = await git.lsRemote(['--refs', remote]);
  const logs = await git.log({ maxCount: 1 });
  const localHead = logs.latest.hash;
  const remoteRefs = remoteInfo.split('\n');
  const remoteHeads = remoteRefs.reduce((acc, ref) => {
    const [hash, refName] = ref.split('\t');
    acc[refName.replace('refs/heads/', '')] = hash;
    return acc;
  }, {});
  const remoteHead = remoteHeads[branch];

  if (localHead === remoteHead) {
    return false;
  }

  return true;
};

const pushGitChanges = async (win, { gitRootPath, processUid, remote, remoteBranch }) => {
  return new Promise(async (resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.outputHandler(handleGitOutput({ win, processUid, sendStdout: true }));

    try {
      // Check if the local branch is tracking a remote branch
      git.branch((err, branchSummary) => {
        if (err) {
          reject(err);
          return;
        }

        const currentBranch = branchSummary.branches[remoteBranch];

        if (!currentBranch) {
          reject(new Error(`Branch ${remoteBranch} does not exist.`));
          return;
        }

        const trackingBranch = currentBranch.tracking;

        if (!trackingBranch) {
          // Set the upstream tracking branch
          git.push(['--set-upstream', remote, remoteBranch], (err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          });
        } else {
          // Push the local branch to the remote
          git.push(remote, remoteBranch, (err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          });
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

const pullGitChanges = async (win, data) => {
  const { gitRootPath, processUid, remote, remoteBranch, strategy } = data;
  if (strategy !== '--no-rebase' && strategy !== '--ff-only') {
    throw new Error('Invalid strategy');
  }
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.outputHandler(handleGitOutput({ win, processUid, sendStdout: true })).pull(remote, remoteBranch, [strategy], (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

async function getChangedFilesInCollectionGit(_gitRootPath, _collectionPath) {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(_gitRootPath);
    git.status(['--porcelain', _gitRootPath], async (err, status) => {
      if (err) {
        reject(err);
        return;
      }

      const totalFiles = status?.files?.length || 0;
      if (totalFiles > 5000) {
        return resolve({
          staged: [],
          unstaged: [],
          totalFiles,
          tooManyFiles: true
        });
      }

      const unstaged = await Promise.all(
        status.files
          .filter(
            (file) => file.index === '?' || file.index === ' ' || file.working_dir === '?' || file.working_dir === 'M'
          )
          .map(async (file) => {
            return { path: file.path, type: 'unstaged', fileIndex: file.index, working_dir: file.working_dir };
          })
      );

      const renamed = await Promise.all(
        status.renamed.map(async (file) => {
          return { path: file.to, to: file.to, from: file.from, type: 'renamed', fileIndex: 'R', working_dir: '' };
        })
      );

      const staged = await Promise.all(
        status.files
          .filter(
            (file) =>
              (file.index === 'M' || file.index === 'A' || file.index === 'D')
              && (file.working_dir === 'M' || file.working_dir === ' ')
          )
          .map(async (file) => {
            return { path: file.path, type: 'staged', fileIndex: file.index, working_dir: file.working_dir };
          })
      );

      const conflicted = await Promise.all(
        status.files.filter((file) => file.index === 'U' || file.working_dir === 'U').map(async (file) => {
          return { path: file.path, type: 'conflicted', fileIndex: file.index, working_dir: file.working_dir };
        }) || []
      );

      resolve({
        staged: [...staged, ...renamed],
        unstaged,
        totalFiles,
        tooManyFiles: false,
        conflicted
      });
    });
  });
}

const getCollectionGitData = async (gitRootPath, collectionPath) => {
  if (!gitRootPath) return {};
  const [branches, currentGitBranch, defaultGitBranch, gitRepoUrl] = await Promise.all([
    getCollectionGitBranches(gitRootPath),
    getCurrentGitBranch(gitRootPath),
    getDefaultGitBranch(gitRootPath),
    getCollectionGitRepoUrl(gitRootPath)
  ]);

  const logs = branches.length ? await getCollectionGitLogs(gitRootPath) : [];

  return {
    gitRootPath,
    gitRepoUrl,
    branches,
    currentGitBranch,
    defaultGitBranch,
    logs
  };
};

const cloneGitRepository = async (win, data) => {
  return new Promise((resolve, reject) => {
    const { url, path, processUid } = data;
    const git = getSimpleGitInstanceForPath(path);

    git.outputHandler(handleGitOutput({ win, processUid, sendStdout: true }));
    git.clone(url, path, ['--progress'], (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res);
    });
  });
};

const fetchRemotes = (gitRootPath) => {
  return new Promise((resolve, reject) => {
    if (!gitRootPath) resolve([]);
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.getRemotes(true)
      .then((remoteList) => {
        resolve(remoteList);
      })
      .catch((err) => {
        console.error('Error fetching remotes:', err);
        reject(err);
      });
  });
};

const fetchChanges = (gitRootPath, remote = 'origin') => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.fetch(remote, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res);
    });
  });
};

const fetchRemoteBranches = ({ gitRootPath, remote }) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.branch(['-r'], (err, branches) => {
      if (err) {
        reject(err);
      } else {
        const branchNames = branches?.all
          .filter((branch) => branch.startsWith(`${remote}/`))
          .map((branch) => branch.slice(remote.length + 1));
        resolve(branchNames);
      }
    });
  });
};

const addRemote = ({ gitRootPath, remoteName, remoteUrl }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const git = getSimpleGitInstanceForPath(gitRootPath);
      console.log('Adding remote:', { gitRootPath, remoteName, remoteUrl });
      await git.addRemote(remoteName, remoteUrl);
      const remotes = await fetchRemotes(gitRootPath);
      resolve(remotes);
    } catch (err) {
      console.error('Error adding remote:', err);
      reject(err);
    }
  });
};

const removeRemote = ({ gitRootPath, remoteName }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const git = getSimpleGitInstanceForPath(gitRootPath);
      console.log('Removing remote:', { gitRootPath, remoteName });
      await git.removeRemote(remoteName);
      const remotes = await fetchRemotes(gitRootPath);
      resolve(remotes);
    } catch (err) {
      console.error('Error removing remote:', err);
      reject(err);
    }
  });
};

const getBehindCount = async (gitRootPath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);

    // First try to get status which includes tracking info and counts
    git.status((err, status) => {
      if (err) {
        reject(err);
        return;
      }

      // Check if we have tracking branch information
      const trackingBranch = status.tracking;
      if (!trackingBranch) {
        // No tracking branch set
        resolve({
          behind: 0,
          commits: []
        });
        return;
      }

      // Use status.behind if available, otherwise calculate manually
      const behindCount = status.behind || 0;

      if (behindCount === 0) {
        resolve({
          behind: 0,
          commits: []
        });
        return;
      }

      // Get the actual commits that are behind
      git.log(['HEAD..' + trackingBranch], (err, log) => {
        if (err) {
          // If log fails, return the count from status but empty commits
          resolve({
            behind: behindCount,
            commits: []
          });
          return;
        }

        const commits = log.all.map((commit) => ({
          hash: commit.hash,
          message: commit.message,
          author: commit.author_name,
          time: new Date(commit.date).toLocaleString()
        }));

        resolve({
          behind: behindCount,
          commits
        });
      });
    });
  });
};

const getAheadCount = async (gitRootPath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);

    // First try to get status which includes tracking info and counts
    git.status((err, status) => {
      if (err) {
        reject(err);
        return;
      }

      // Check if we have tracking branch information
      const trackingBranch = status.tracking;
      if (!trackingBranch) {
        // No tracking branch set - get all local commits as "ahead"
        git.log(['HEAD'], (err, allLog) => {
          if (err) {
            resolve({
              ahead: 0,
              commits: []
            });
            return;
          }

          const commits = allLog.all.map((commit) => ({
            hash: commit.hash,
            message: commit.message,
            author: commit.author_name,
            time: new Date(commit.date).toLocaleString()
          }));

          resolve({
            ahead: commits.length,
            commits
          });
        });
        return;
      }

      // Use status.ahead if available, otherwise calculate manually
      const aheadCount = status.ahead || 0;

      if (aheadCount === 0) {
        resolve({
          ahead: 0,
          commits: []
        });
        return;
      }

      // Get commits that are ahead (in local but not on remote)
      git.log([trackingBranch + '..HEAD'], (err, log) => {
        if (err) {
          // If remote doesn't exist, get all local commits (they're all "ahead")
          git.log(['HEAD'], (err, allLog) => {
            if (err) {
              resolve({
                ahead: aheadCount,
                commits: []
              });
              return;
            }

            const commits = allLog.all.map((commit) => ({
              hash: commit.hash,
              message: commit.message,
              author: commit.author_name,
              time: new Date(commit.date).toLocaleString()
            }));

            resolve({
              ahead: aheadCount,
              commits
            });
          });
          return;
        }

        const commits = log.all.map((commit) => ({
          hash: commit.hash,
          message: commit.message,
          author: commit.author_name,
          time: new Date(commit.date).toLocaleString()
        }));

        resolve({
          ahead: aheadCount,
          commits
        });
      });
    });
  });
};

const getAheadBehindCount = async (gitRootPath) => {
  try {
    const [behindStatus, aheadStatus] = await Promise.all([
      getBehindCount(gitRootPath),
      getAheadCount(gitRootPath)
    ]);

    return {
      behind: behindStatus.behind,
      ahead: aheadStatus.ahead,
      behindCommits: behindStatus.commits,
      aheadCommits: aheadStatus.commits
    };
  } catch (error) {
    console.error('Error getting ahead/behind count:', error);
    // Return safe defaults
    return {
      behind: 0,
      ahead: 0,
      behindCommits: [],
      aheadCommits: []
    };
  }
};

const abortConflictResolution = async (gitRootPath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    if (fs.existsSync(path.join(gitRootPath, '.git', 'MERGE_HEAD'))) {
      git.raw(['merge', '--abort'], (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    } else {
      reject(new Error('No merge in progress'));
    }
  });
};

const continueMerge = async (gitRootPath, conflictedFiles, commitMessage) => {
  return new Promise(async (resolve, reject) => {
    try {
      const fsPromises = require('fs/promises');

      // Step 1: Write all conflicted files' final state to disk
      for (const file of conflictedFiles) {
        // file.path is relative to gitRootPath, convert to absolute path
        const fullFilePath = path.join(gitRootPath, file.path);

        // Ensure directory exists
        const dir = path.dirname(fullFilePath);
        await fsPromises.mkdir(dir, { recursive: true });

        // Write the resolved content
        await fsPromises.writeFile(fullFilePath, file.content, 'utf8');
      }

      // Step 2: Stage the conflicted files
      const filePaths = conflictedFiles.map((f) => f.path);
      const fullPaths = filePaths.map((p) => path.join(gitRootPath, p));
      await stageChanges(gitRootPath, fullPaths);

      // Step 3: Write commit message to .git/MERGE_MSG
      const mergeMsgPath = path.join(gitRootPath, '.git', 'MERGE_MSG');
      await fsPromises.writeFile(mergeMsgPath, commitMessage, 'utf8');

      // Step 4: Call git merge --continue
      exec('git -c core.editor=: merge --continue', { cwd: gitRootPath }, (err, stdout) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stdout);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const getCommitFiles = async (gitRootPath, commitHash) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    // Get the list of files changed in this commit with stats
    git.raw(['show', '--stat', '--name-status', '--format=', commitHash], (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      const lines = result.trim().split('\n').filter((line) => line.trim());
      const files = [];

      for (const line of lines) {
        // Parse name-status format: M<tab>filename or A<tab>filename or D<tab>filename
        const match = line.match(/^([AMDRC])\t(.+)$/);
        if (match) {
          const [, status, filePath] = match;
          files.push({
            path: filePath,
            status: status === 'A' ? 'added' : status === 'D' ? 'deleted' : status === 'M' ? 'modified' : status === 'R' ? 'renamed' : 'changed'
          });
        }
      }

      resolve(files);
    });
  });
};

const getCommitFileDiff = async (gitRootPath, commitHash, filePath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    // Get the diff for a specific file in a commit (compare with parent)
    git.raw(['show', '--no-prefix', '-p', commitHash, '--', filePath], (err, diff) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(diff);
    });
  });
};

/**
 * Get the list of files changed between two commits
 * @param {string} gitRootPath - Path to git repository
 * @param {string} fromCommit - Base commit hash (older)
 * @param {string} toCommit - Target commit hash (newer)
 * @returns {Promise<Array>} List of changed files with status
 */
const getCommitCompareFiles = async (gitRootPath, fromCommit, toCommit) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    // Get the list of files changed between two commits
    git.raw(['diff', '--name-status', fromCommit, toCommit], (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      const lines = result.trim().split('\n').filter((line) => line.trim());
      const files = [];

      for (const line of lines) {
        // Parse name-status format: M<tab>filename or A<tab>filename or D<tab>filename
        const match = line.match(/^([AMDRC])\t(.+)$/);
        if (match) {
          const [, status, filePath] = match;
          files.push({
            path: filePath,
            status: status === 'A' ? 'added' : status === 'D' ? 'deleted' : status === 'M' ? 'modified' : status === 'R' ? 'renamed' : 'changed'
          });
        }
      }

      resolve(files);
    });
  });
};

/**
 * Get the diff for a specific file between two commits
 * @param {string} gitRootPath - Path to git repository
 * @param {string} fromCommit - Base commit hash (older)
 * @param {string} toCommit - Target commit hash (newer)
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} Diff string
 */
const getCommitCompareFileDiff = async (gitRootPath, fromCommit, toCommit, filePath) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    // Get the diff for a specific file between two commits
    git.raw(['diff', '--no-prefix', fromCommit, toCommit, '--', filePath], (err, diff) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(diff);
    });
  });
};

/**
 * Get git history for a specific file
 * @param {string} gitRootPath - Path to git repository
 * @param {string} filePath - Path to the file (relative to git root)
 * @returns {Promise<Array>} List of commits that touched this file
 */
const getFileGitHistory = async (gitRootPath, filePath) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);

  try {
    const result = await git.raw([
      'log',
      '--format=%H|%s|%an|%aI',
      '--follow',
      '-n', '100',
      '--', filePath
    ]);

    if (!result || !result.trim()) {
      return [];
    }

    const commits = [];
    const lines = result.trim().split('\n');

    for (const line of lines) {
      if (line.includes('|')) {
        const [hash, message, author, date] = line.split('|');
        commits.push({
          hash,
          message,
          author_name: author,
          date
        });
      }
    }

    return commits;
  } catch (err) {
    console.error('Error getting file git history:', err);
    return [];
  }
};

/**
 * Get git graph data for visualization
 * Gets commits from branch with parent info in a single git log call
 * Only includes branch commits that fall within the time range of the main line
 */
/**
 * Create a new stash with a message
 * @param {string} gitRootPath - Path to git repository
 * @param {string} message - Stash message/identifier
 * @returns {Promise<void>}
 */
const createStash = async (gitRootPath, message) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    // Use --include-untracked to stash untracked files as well
    git.stash(['push', '--include-untracked', '-m', message], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

/**
 * Get stash diff stats (files changed, insertions, deletions)
 * Includes both tracked and untracked files
 * @param {object} git - simple-git instance
 * @param {number} stashIndex - Index of the stash
 * @returns {Promise<object>} Object with filesChanged, insertions, deletions
 */
const getStashStats = async (git, stashIndex) => {
  let filesChanged = 0;
  let insertions = 0;
  let deletions = 0;

  try {
    // Get stats for tracked files
    const trackedResult = await git.raw(['stash', 'show', '--numstat', `stash@{${stashIndex}}`]);

    if (trackedResult) {
      const lines = trackedResult.trim().split('\n').filter((line) => line.trim());
      filesChanged += lines.length;

      lines.forEach((line) => {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const added = parseInt(parts[0], 10) || 0;
          const removed = parseInt(parts[1], 10) || 0;
          insertions += added;
          deletions += removed;
        }
      });
    }
  } catch (err) {
    // No tracked changes or error, continue
  }

  try {
    // Get stats for untracked files (stored in stash^3)
    // First check if the third parent exists (untracked files commit)
    const untrackedResult = await git.raw(['diff', '--numstat', '4b825dc642cb6eb9a060e54bf8d69288fbee4904', `stash@{${stashIndex}}^3`]);

    if (untrackedResult) {
      const lines = untrackedResult.trim().split('\n').filter((line) => line.trim());
      filesChanged += lines.length;

      lines.forEach((line) => {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const added = parseInt(parts[0], 10) || 0;
          // Untracked files are all additions
          insertions += added;
        }
      });
    }
  } catch (err) {
    // No untracked files in stash or stash^3 doesn't exist, that's fine
  }

  return { filesChanged, insertions, deletions };
};

/**
 * List all stashes
 * @param {string} gitRootPath - Path to git repository
 * @returns {Promise<Array>} List of stashes with index, message, date, and diff stats
 */
const listStashes = async (gitRootPath) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);

  try {
    const stashList = await git.stashList();
    const stashEntries = stashList.all || [];

    // Fetch stats for each stash in parallel
    const stashesWithStats = await Promise.all(
      stashEntries.map(async (stash, index) => {
        const stats = await getStashStats(git, index);
        return {
          index: index,
          hash: stash.hash,
          message: stash.message,
          date: stash.date,
          filesChanged: stats.filesChanged,
          insertions: stats.insertions,
          deletions: stats.deletions
        };
      })
    );

    return stashesWithStats;
  } catch (err) {
    throw err;
  }
};

/**
 * Apply a stash by index (restores changes but keeps stash)
 * @param {string} gitRootPath - Path to git repository
 * @param {number} stashIndex - Index of the stash to apply
 * @returns {Promise<void>}
 */
const applyStash = async (gitRootPath, stashIndex) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.stash(['apply', `stash@{${stashIndex}}`], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

/**
 * Drop (delete) a stash by index
 * @param {string} gitRootPath - Path to git repository
 * @param {number} stashIndex - Index of the stash to drop
 * @returns {Promise<void>}
 */
const dropStash = async (gitRootPath, stashIndex) => {
  return new Promise((resolve, reject) => {
    const git = getSimpleGitInstanceForPath(gitRootPath);
    git.stash(['drop', `stash@{${stashIndex}}`], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

/**
 * Get list of files in a stash (both tracked and untracked)
 * @param {string} gitRootPath - Path to git repository
 * @param {number} stashIndex - Index of the stash
 * @returns {Promise<Array>} List of files with status
 */
const getStashFiles = async (gitRootPath, stashIndex) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);
  const files = [];

  try {
    // Get tracked files from stash
    const trackedResult = await git.raw(['stash', 'show', '--name-status', `stash@{${stashIndex}}`]);

    if (trackedResult) {
      const lines = trackedResult.trim().split('\n').filter((line) => line.trim());
      for (const line of lines) {
        const match = line.match(/^([AMDRC])\t(.+)$/);
        if (match) {
          const [, status, filePath] = match;
          files.push({
            path: filePath,
            status: status === 'A' ? 'added' : status === 'D' ? 'deleted' : status === 'M' ? 'modified' : status === 'R' ? 'renamed' : 'changed',
            isUntracked: false
          });
        }
      }
    }
  } catch (err) {
    // No tracked files or error
  }

  try {
    // Get untracked files from stash^3
    const untrackedResult = await git.raw(['ls-tree', '-r', '--name-only', `stash@{${stashIndex}}^3`]);

    if (untrackedResult) {
      const lines = untrackedResult.trim().split('\n').filter((line) => line.trim());
      for (const filePath of lines) {
        files.push({
          path: filePath,
          status: 'added',
          isUntracked: true
        });
      }
    }
  } catch (err) {
    // No untracked files in stash
  }

  return files;
};

/**
 * Get diff for a specific file in a stash
 * @param {string} gitRootPath - Path to git repository
 * @param {number} stashIndex - Index of the stash
 * @param {string} filePath - Path to the file
 * @param {boolean} isUntracked - Whether the file is untracked
 * @returns {Promise<string>} Diff string
 */
const getStashFileDiff = async (gitRootPath, stashIndex, filePath, isUntracked = false) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);

  try {
    if (isUntracked) {
      // For untracked files, show the full content as a diff against empty
      const content = await git.raw(['show', `stash@{${stashIndex}}^3:${filePath}`]);
      // Format as a unified diff showing all lines as additions
      const lines = content.split('\n');
      const diffLines = [
        `diff --git a/${filePath} b/${filePath}`,
        'new file mode 100644',
        '--- /dev/null',
        `+++ b/${filePath}`,
        `@@ -0,0 +1,${lines.length} @@`,
        ...lines.map((line) => `+${line}`)
      ];
      return diffLines.join('\n');
    } else {
      // For tracked files, use git diff to compare stash against its parent
      // stash@{n}^ is the parent commit, stash@{n} is the stash commit
      const diff = await git.raw(['diff', `stash@{${stashIndex}}^`, `stash@{${stashIndex}}`, '--', filePath]);
      return diff;
    }
  } catch (err) {
    throw err;
  }
};

/**
 * Get file content at a specific commit
 * @param {string} gitRootPath - Path to git repository
 * @param {string} commitHash - Commit hash
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} File content
 */
const getFileContentAtCommit = async (gitRootPath, commitHash, filePath) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);
  try {
    const content = await git.raw(['show', `${commitHash}:${filePath}`]);
    return content;
  } catch (err) {
    // File might not exist at this commit (e.g., newly added file)
    return null;
  }
};

/**
 * Check if file supports visual diff
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file supports visual diff
 */
const supportsVisualDiff = (filePath) => {
  if (!filePath) return false;

  const fileName = filePath.split('/').pop();
  const excludedFiles = ['folder.yml', 'folder.bru', 'opencollection.yml', 'collection.bru'];
  if (excludedFiles.includes(fileName)) {
    return false;
  }

  return filePath.endsWith('.bru') || filePath.endsWith('.yml');
};

/**
 * Parse content for visual diff viewer
 * Uses parseRequest to get consistent BrunoItem structure for both .bru and .yml files
 * @param {string} content - Raw file content
 * @param {string} filePath - Path to the file
 * @returns {object|null} Parsed BrunoItem or null if parsing fails
 */
const parseContentForVisualDiff = (content, filePath) => {
  if (!content) return null;
  try {
    if (filePath?.endsWith('.bru')) {
      return parseRequest(content, { format: 'bru' });
    } else if (filePath?.endsWith('.yml')) {
      return parseRequest(content, { format: 'yml' });
    }
    return null;
  } catch (err) {
    console.error('Error parsing content for visual diff:', err);
    return null;
  }
};

/**
 * Get old and new file content for visual diff
 * @param {string} gitRootPath - Path to git repository
 * @param {string} commitHash - Commit hash
 * @param {string} filePath - Path to the file
 * @returns {Promise<{oldContent: string|null, newContent: string|null, oldParsed: object|null, newParsed: object|null}>} Old and new file content
 */
const getFileContentForVisualDiff = async (gitRootPath, commitHash, filePath) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);
  const canParseVisualDiff = supportsVisualDiff(filePath);

  try {
    // Get the new content (at the commit)
    let newContent = null;
    try {
      newContent = await git.raw(['show', `${commitHash}:${filePath}`]);
    } catch (err) {
      // File might be deleted in this commit
      newContent = null;
    }

    // Get the old content (at the parent commit)
    let oldContent = null;
    try {
      oldContent = await git.raw(['show', `${commitHash}^:${filePath}`]);
    } catch (err) {
      // File might not exist in parent (newly added)
      oldContent = null;
    }

    // Parse content if applicable
    let oldParsed = null;
    let newParsed = null;

    if (canParseVisualDiff) {
      oldParsed = parseContentForVisualDiff(oldContent, filePath);
      newParsed = parseContentForVisualDiff(newContent, filePath);
    }

    return { oldContent, newContent, oldParsed, newParsed };
  } catch (err) {
    throw err;
  }
};

/**
 * Get old and new file content for visual diff (for staged/unstaged changes)
 * @param {string} gitRootPath - Path to git repository
 * @param {string} filePath - Path to the file (relative to git root)
 * @param {string} type - Type of change: 'staged', 'unstaged', or 'renamed'
 * @returns {Promise<{oldContent: string|null, newContent: string|null, oldParsed: object|null, newParsed: object|null}>} Old and new file content
 */
const getWorkingFileContentForVisualDiff = async (gitRootPath, filePath, type) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);
  const fullPath = path.join(gitRootPath, filePath);
  const canParseVisualDiff = supportsVisualDiff(filePath);

  try {
    let oldContent = null;
    let newContent = null;

    if (type === 'staged') {
      // For staged changes: old = HEAD, new = index (staged)
      try {
        oldContent = await git.raw(['show', `HEAD:${filePath}`]);
      } catch (err) {
        // File might be newly added
        oldContent = null;
      }

      try {
        newContent = await git.raw(['show', `:${filePath}`]);
      } catch (err) {
        // File might be deleted
        newContent = null;
      }
    } else if (type === 'unstaged') {
      // For unstaged changes: old = index or HEAD, new = working directory
      try {
        // Try to get from index first (if there are staged changes)
        oldContent = await git.raw(['show', `:${filePath}`]);
      } catch (err) {
        try {
          // Fall back to HEAD
          oldContent = await git.raw(['show', `HEAD:${filePath}`]);
        } catch (err2) {
          // File might be untracked
          oldContent = null;
        }
      }

      // Read working directory content
      try {
        newContent = fs.readFileSync(fullPath, 'utf8');
      } catch (err) {
        // File might be deleted
        newContent = null;
      }
    }

    // Parse content if applicable
    let oldParsed = null;
    let newParsed = null;

    if (canParseVisualDiff) {
      oldParsed = parseContentForVisualDiff(oldContent, filePath);
      newParsed = parseContentForVisualDiff(newContent, filePath);
    }

    return { oldContent, newContent, oldParsed, newParsed };
  } catch (err) {
    throw err;
  }
};

/**
 * Get old and new file content for visual diff (for stash)
 * @param {string} gitRootPath - Path to git repository
 * @param {number} stashIndex - Index of the stash
 * @param {string} filePath - Path to the file
 * @param {boolean} isUntracked - Whether the file is untracked
 * @returns {Promise<{oldContent: string|null, newContent: string|null, oldParsed: object|null, newParsed: object|null}>} Old and new file content
 */
const getStashFileContentForVisualDiff = async (gitRootPath, stashIndex, filePath, isUntracked = false) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);
  const canParseVisualDiff = supportsVisualDiff(filePath);

  try {
    let oldContent = null;
    let newContent = null;

    if (isUntracked) {
      // For untracked files in stash, old is null (didn't exist)
      oldContent = null;
      try {
        newContent = await git.raw(['show', `stash@{${stashIndex}}^3:${filePath}`]);
      } catch (err) {
        newContent = null;
      }
    } else {
      // For tracked files: old = stash parent, new = stash content
      try {
        oldContent = await git.raw(['show', `stash@{${stashIndex}}^:${filePath}`]);
      } catch (err) {
        oldContent = null;
      }

      try {
        newContent = await git.raw(['show', `stash@{${stashIndex}}:${filePath}`]);
      } catch (err) {
        newContent = null;
      }
    }

    // Parse content if applicable
    let oldParsed = null;
    let newParsed = null;

    if (canParseVisualDiff) {
      oldParsed = parseContentForVisualDiff(oldContent, filePath);
      newParsed = parseContentForVisualDiff(newContent, filePath);
    }

    return { oldContent, newContent, oldParsed, newParsed };
  } catch (err) {
    throw err;
  }
};

const getGitGraph = async (gitRootPath, branchName, limit = 50) => {
  const git = getSimpleGitInstanceForPath(gitRootPath);

  try {
    // Get commits with parent info, request one extra to check if there are more
    const result = await git.raw([
      'log',
      '--format=%H|%P|%s|%an|%aI',
      '--first-parent',
      '-n', String(limit + 1), // Request one extra to check hasMore
      branchName || 'HEAD'
    ]);

    if (!result || !result.trim()) {
      return { commits: [], branches: [], hasMore: false };
    }

    const lines = result.trim().split('\n');

    // Check if there are more commits beyond this page
    const hasMore = lines.length > limit;
    const commitLines = hasMore ? lines.slice(0, limit) : lines;

    const commits = [];
    const mainLineHashes = new Set();

    // Parse main line commits
    for (const line of commitLines) {
      const [hash, parents, message, author, date] = line.split('|');
      const parentList = parents ? parents.split(' ').filter((p) => p) : [];
      const isMerge = parentList.length > 1;

      commits.push({
        hash,
        message,
        author_name: author,
        date,
        isMerge,
        parents: parentList
      });
      mainLineHashes.add(hash);
    }

    // Get the time range of the main line commits
    // First commit is newest, last commit is oldest
    const oldestMainCommitDate = commits.length > 0 ? commits[commits.length - 1].date : null;

    // For merge commits, get branch commits (only within main line time range)
    const branches = [];

    for (const commit of commits) {
      if (commit.isMerge && commit.parents[1]) {
        try {
          // Build git log command with --since to limit to main line time range
          const logArgs = [
            'log',
            '--format=%H|%P|%s|%an|%aI',
            '--first-parent',
            '-n', '50'
          ];

          // Only include commits since the oldest main line commit
          if (oldestMainCommitDate) {
            logArgs.push('--since=' + oldestMainCommitDate);
          }

          logArgs.push(commit.parents[1]);

          const branchResult = await git.raw(logArgs);

          if (branchResult && branchResult.trim()) {
            const branchLines = branchResult.trim().split('\n');
            const branchCommits = [];

            for (const bLine of branchLines) {
              const [bHash, bParents, bMessage, bAuthor, bDate] = bLine.split('|');

              // Stop if we hit main line
              if (mainLineHashes.has(bHash)) break;

              branchCommits.push({
                hash: bHash,
                message: bMessage,
                author_name: bAuthor,
                date: bDate,
                parents: bParents ? bParents.split(' ').filter((p) => p) : []
              });
            }

            if (branchCommits.length > 0) {
              branches.push({
                mergeCommitHash: commit.hash,
                commits: branchCommits
              });
            }
          }
        } catch (err) {
          // Ignore errors for individual branch traversal
        }
      }
    }

    return { commits, branches, hasMore };
  } catch (err) {
    console.error('Error getting git graph:', err);
    return { commits: [], branches: [], hasMore: false };
  }
};

module.exports = {
  getCollectionGitRootPath,
  getCollectionGitRepoUrl,
  stageChanges,
  unstageChanges,
  discardChanges,
  commitChanges,
  getChangedFilesInCollectionGit,
  getCollectionGitBranches,
  getDefaultGitBranch,
  getCurrentGitBranch,
  checkoutGitBranch,
  getCollectionGitLogs,
  getCollectionGitTagsWithDetails,
  canPush,
  pushGitChanges,
  pullGitChanges,
  initGit,
  getCollectionGitData,
  getStagedFileDiff,
  getUnstagedFileDiff,
  getRenamedFileDiff,
  cloneGitRepository,
  fetchChanges,
  fetchRemotes,
  fetchRemoteBranches,
  checkoutRemoteGitBranch,
  getGitVersion,
  addRemote,
  removeRemote,
  getAheadBehindCount,
  getAheadCount,
  getBehindCount,
  abortConflictResolution,
  continueMerge,
  getCommitFiles,
  getCommitFileDiff,
  getCommitCompareFiles,
  getCommitCompareFileDiff,
  getFileGitHistory,
  getGitGraph,
  createStash,
  listStashes,
  applyStash,
  dropStash,
  getStashFiles,
  getStashFileDiff,
  getFileContentAtCommit,
  getFileContentForVisualDiff,
  getWorkingFileContentForVisualDiff,
  getStashFileContentForVisualDiff
};
