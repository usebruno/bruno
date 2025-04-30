const path = require('path');
const fs = require('fs/promises');
const os = require('os');
const { copyPath, removePath } = require('../../filesystem');
const { initialCollectionStructure, finalCollectionStructure } = require('../fixtures/filesystem/copypath-removepath');

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

  describe('copyPath and removePath', () => {
    it('should move files and folder items multiple times', async () => {

      {
        const sourcePath = path.join(tempDir, 'folder_1', 'file_2.bru');
        const destDir = path.join(tempDir, 'folder_1', 'folder_1_1');
        await copyPath(sourcePath, destDir);
        await removePath(sourcePath);
      }
      
      {
        const sourcePath = path.join(tempDir, 'folder_2');
        const destDir = path.join(tempDir, 'folder_1', 'folder_1_1');
        await copyPath(sourcePath, destDir);
        await removePath(sourcePath);
      }

      {
        const sourcePath = path.join(tempDir, 'folder_1', 'folder_1_1', 'folder_2', 'file_2_2.bru');
        const destDir = path.join(tempDir, 'folder_1');
        await copyPath(sourcePath, destDir);
        await removePath(sourcePath);
      }

      {
        const sourcePath = path.join(tempDir, 'folder_1', 'folder_1_1', 'folder_2', 'folder_2_1');
        const destDir = path.join(tempDir);
        await copyPath(sourcePath, destDir);
        await removePath(sourcePath);
      }

      const result = await verifyFilesAndFolders(tempDir, finalCollectionStructure);
      expect(result).toBe(true);
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
}

// if a file/folder doesnt exist, return false
const verifyFilesAndFolders = async (dir, filesAndFolders) => {
  const verify = async (dir, filesAndFolders) => {
    for (const item of filesAndFolders) {
      const itemPath = path.join(dir, item.name);
      if (item.type === 'folder') {
        await verify(itemPath, item.files);
      } else {
        expect(await fs.readFile(itemPath, 'utf8')).toBe(item.content);
      }
    }
  }

  try {
    await verify(dir, filesAndFolders);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}