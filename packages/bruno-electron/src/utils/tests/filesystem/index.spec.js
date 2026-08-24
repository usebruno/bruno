const path = require('path');
const fs = require('fs/promises');
const os = require('os');
const { copyPathTo, removePath, getUniqueTargetPath, writeFileUnique } = require('../../filesystem');
const { initialCollectionStructure, finalCollectionStructure } = require('../fixtures/filesystem/copypath-removepath');

const moveInto = async (sourcePath, destDir) => {
  const targetPath = path.join(destDir, path.basename(sourcePath));
  await copyPathTo(sourcePath, targetPath);
};

describe('File System Operations', () => {
  let tempDir;

  beforeAll(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bruno-test-'));
    await createFilesAndFolders(tempDir, initialCollectionStructure);
    const result = await verifyFilesAndFolders(tempDir, initialCollectionStructure);
    expect(result).toBe(true);
  });

  afterAll(async () => {
    // clean up after each test
    await fs.rm(tempDir, { recursive: true, force: true });
    // confirm the temp directory is deleted
    expect(await fs.access(tempDir).then(() => true).catch(() => false)).toBe(false);
  });

  describe('copyPathTo and removePath', () => {
    it('should move files and folder items multiple times', async () => {
      {
        const sourcePath = path.join(tempDir, 'folder_1', 'file_2.bru');
        const destDir = path.join(tempDir, 'folder_1', 'folder_1_1');
        await moveInto(sourcePath, destDir);
        await removePath(sourcePath);
      }

      {
        const sourcePath = path.join(tempDir, 'folder_2');
        const destDir = path.join(tempDir, 'folder_1', 'folder_1_1');
        await moveInto(sourcePath, destDir);
        await removePath(sourcePath);
      }

      {
        const sourcePath = path.join(tempDir, 'folder_1', 'folder_1_1', 'folder_2', 'file_2_2.bru');
        const destDir = path.join(tempDir, 'folder_1');
        await moveInto(sourcePath, destDir);
        await removePath(sourcePath);
      }

      {
        const sourcePath = path.join(tempDir, 'folder_1', 'folder_1_1', 'folder_2', 'folder_2_1');
        const destDir = path.join(tempDir);
        await moveInto(sourcePath, destDir);
        await removePath(sourcePath);
      }

      const result = await verifyFilesAndFolders(tempDir, finalCollectionStructure);
      expect(result).toBe(true);
    });

    it('should resolve a unique suffixed target when the destination has the same filename', async () => {
      const srcDir = path.join(tempDir, 'suffix_src');
      const destDir = path.join(tempDir, 'suffix_dest');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.mkdir(destDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'dup.bru'), 'source');
      await fs.writeFile(path.join(destDir, 'dup.bru'), 'existing');

      const targetPath = getUniqueTargetPath(path.join(srcDir, 'dup.bru'), destDir);
      // silent numeric suffix instead of throwing
      expect(path.basename(targetPath)).toBe('dup 1.bru');
    });

    it('suffixes a dotted DIRECTORY name without splitting on the dot', async () => {
      const srcDir = path.join(tempDir, 'dotdir_src');
      const destDir = path.join(tempDir, 'dotdir_dest');
      await fs.mkdir(path.join(srcDir, 'v1.2'), { recursive: true });
      await fs.mkdir(path.join(destDir, 'v1.2'), { recursive: true }); // colliding folder

      // Directories have no extension: "v1.2" must suffix to "v1.2 1", not "v1 2.2".
      const targetPath = getUniqueTargetPath(path.join(srcDir, 'v1.2'), destDir);
      expect(path.basename(targetPath)).toBe('v1.2 1');
    });
  });

  describe('copyPathTo self-copy guard', () => {
    const GUARD_ERR = /Cannot copy a path into itself/;

    it('rejects copying a path into itself', async () => {
      const dir = path.join(tempDir, 'guard_self');
      await fs.mkdir(dir, { recursive: true });
      await expect(copyPathTo(dir, dir)).rejects.toThrow(GUARD_ERR);
    });

    it('rejects copying a path into its own descendant', async () => {
      const dir = path.join(tempDir, 'guard_desc');
      await fs.mkdir(dir, { recursive: true });
      await expect(copyPathTo(dir, path.join(dir, 'sub'))).rejects.toThrow(GUARD_ERR);
    });
  });

  describe('MAX_DUPLICATE_NAMES cap', () => {
    it('caps at 200: creates req.bru, req 1.bru … req 199.bru, then the 201st rejects', async () => {
      const dir = path.join(tempDir, 'cap');
      await fs.mkdir(dir, { recursive: true });

      for (let i = 0; i < 200; i++) {
        const { filename } = await writeFileUnique(dir, 'req', 'bru', 'x');
        expect(filename).toBe(i === 0 ? 'req.bru' : `req ${i}.bru`);
      }

      await expect(writeFileUnique(dir, 'req', 'bru', 'x')).rejects.toThrow(
        /Too many items named "req" \(limit 200\)/
      );
    });
  });
});

// create folders and files recursively based on the defined json structure
const createFilesAndFolders = async (dir, filesAndFolders) => {
  for (const item of filesAndFolders) {
    const itemPath = path.join(dir, item.name);
    if (item.type === 'folder') {
      await fs.mkdir(itemPath, { recursive: true });
      await createFilesAndFolders(itemPath, item.files);
    } else {
      await fs.writeFile(itemPath, item.content);
    }
  }
};

// if a file/folder doesnt exist, return false
// should only contain files and folders that are defined in the json structure
const verifyFilesAndFolders = async (dir, filesAndFolders) => {
  const verify = async (dir, filesAndFolders) => {
    const files = await fs.readdir(dir);
    if (files.length !== filesAndFolders.length) {
      return false;
    }
    for (const file of files) {
      const itemPath = path.join(dir, file);
      const item = filesAndFolders.find((f) => f.name === file);
      if (!item) {
        return false;
      }
      if (item.type === 'folder') {
        return await verify(itemPath, item.files);
      } else {
        return await fs.readFile(itemPath, 'utf8').then((content) => content === item.content);
      }
    }
    return true;
  };

  try {
    const verified = await verify(dir, filesAndFolders);
    return verified;
  } catch (error) {
    console.error(error);
    return false;
  }
};
