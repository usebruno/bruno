import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export type CollectionFormat = 'bru' | 'yml';

export interface GenerateCollectionOptions {
  /** Name of the collection */
  name?: string;
  /** Total number of requests to generate */
  requestCount: number;
  /** Maximum folder nesting depth (0 = no folders, all requests at root) */
  depth?: number;
  /** Number of folders per level (default: 3) */
  foldersPerLevel?: number;
  /** Collection format: 'bru' or 'yml' */
  format: CollectionFormat;
  /** Number of environments to generate (default: 2) */
  environmentCount?: number;
  /** Include mixed HTTP methods (default: true) */
  mixedMethods?: boolean;
}

export interface GeneratedCollection {
  /** Path to the generated collection directory */
  path: string;
  /** Cleanup function to remove the collection */
  cleanup: () => Promise<void>;
  /** Collection name */
  name: string;
  /** Number of requests generated */
  requestCount: number;
  /** Number of folders generated */
  folderCount: number;
  /** Format used */
  format: CollectionFormat;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

/**
 * Generate a collection with the specified parameters
 */
export async function generateCollection(
  options: GenerateCollectionOptions
): Promise<GeneratedCollection> {
  const {
    name = `Generated Collection ${Date.now()}`,
    requestCount,
    depth = 2,
    foldersPerLevel = 3,
    format,
    environmentCount = 2,
    mixedMethods = true
  } = options;

  // Create temp directory
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'bruno-test-collection-')
  );

  try {
    // Generate collection root files
    await generateCollectionRoot(tempDir, name, format);

    // Generate environments
    if (environmentCount > 0) {
      await generateEnvironments(tempDir, environmentCount, format);
    }

    // Calculate folder structure
    const folders = generateFolderStructure(depth, foldersPerLevel);
    const folderCount = folders.length;

    // Create folders
    for (const folder of folders) {
      await createFolder(tempDir, folder, format);
    }

    // Distribute requests across folders
    const requestsPerLocation = distributeRequests(requestCount, folders);
    let globalIndex = 0;

    for (const [folderPath, count] of Object.entries(requestsPerLocation)) {
      for (let i = 0; i < count; i++) {
        const method = mixedMethods
          ? HTTP_METHODS[globalIndex % HTTP_METHODS.length]
          : 'GET';
        // Pass per-folder index (i) for naming, global index for method cycling
        await createRequest(tempDir, folderPath, i, method, format);
        globalIndex++;
      }
    }

    return {
      path: tempDir,
      cleanup: async () => {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      },
      name,
      requestCount,
      folderCount,
      format
    };
  } catch (error) {
    // Cleanup on error
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Generate collection root files (bruno.json and collection.bru/opencollection.yml)
 */
async function generateCollectionRoot(
  basePath: string,
  name: string,
  format: CollectionFormat
): Promise<void> {
  // Always create bruno.json
  const brunoJson = {
    version: '1',
    name,
    type: 'collection'
  };
  await fs.promises.writeFile(
    path.join(basePath, 'bruno.json'),
    JSON.stringify(brunoJson, null, 2)
  );

  if (format === 'bru') {
    const collectionBru = `meta {
  name: ${name}
}

auth {
  mode: none
}
`;
    await fs.promises.writeFile(
      path.join(basePath, 'collection.bru'),
      collectionBru
    );
  } else {
    const opencollectionYml = `opencollection: "1.0.0"
info:
  name: ${name}
`;
    await fs.promises.writeFile(
      path.join(basePath, 'opencollection.yml'),
      opencollectionYml
    );
  }
}

/**
 * Generate environment files
 */
async function generateEnvironments(
  basePath: string,
  count: number,
  format: CollectionFormat
): Promise<void> {
  const envDir = path.join(basePath, 'environments');
  await fs.promises.mkdir(envDir, { recursive: true });

  const envNames = ['dev', 'staging', 'prod', 'local', 'test'];

  for (let i = 0; i < count; i++) {
    const envName = envNames[i % envNames.length];
    const ext = format === 'bru' ? 'bru' : 'yml';
    const filePath = path.join(envDir, `${envName}.${ext}`);

    if (format === 'bru') {
      const content = `vars {
  host: https://api.${envName}.example.com
  apiKey: ${envName}-api-key-${i}
}
`;
      await fs.promises.writeFile(filePath, content);
    } else {
      const content = `name: ${envName}
variables:
  - name: host
    value: https://api.${envName}.example.com
  - name: apiKey
    value: ${envName}-api-key-${i}
`;
      await fs.promises.writeFile(filePath, content);
    }
  }
}

/**
 * Generate folder structure paths
 * Folder names include parent prefix for verifiable parent-child relationships
 * Uses short names: F1, F1-F1, F1-F1-F1 to avoid OS filename length limits
 */
function generateFolderStructure(
  depth: number,
  foldersPerLevel: number
): string[] {
  if (depth === 0) {
    return ['']; // Root only
  }

  const folders: string[] = [''];

  function addFolders(currentPath: string, parentName: string, currentDepth: number): void {
    if (currentDepth >= depth) return;

    for (let i = 0; i < foldersPerLevel; i++) {
      // Short folder name with parent prefix: F1, F1-F1, F1-F1-F1
      const folderName = parentName ? `${parentName}-F${i + 1}` : `F${i + 1}`;
      const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      folders.push(newPath);
      addFolders(newPath, folderName, currentDepth + 1);
    }
  }

  addFolders('', '', 0);
  return folders;
}

/**
 * Create a folder with its metadata file
 */
async function createFolder(
  basePath: string,
  folderPath: string,
  format: CollectionFormat
): Promise<void> {
  if (!folderPath) return; // Skip root

  const fullPath = path.join(basePath, folderPath);
  await fs.promises.mkdir(fullPath, { recursive: true });

  const folderName = path.basename(folderPath);
  const ext = format === 'bru' ? 'bru' : 'yml';
  const metaPath = path.join(fullPath, `folder.${ext}`);

  if (format === 'bru') {
    const content = `meta {
  name: ${folderName}
}

auth {
  mode: inherit
}
`;
    await fs.promises.writeFile(metaPath, content);
  } else {
    const content = `info:
  name: ${folderName}
`;
    await fs.promises.writeFile(metaPath, content);
  }
}

/**
 * Distribute requests across folders
 */
function distributeRequests(
  requestCount: number,
  folders: string[]
): Record<string, number> {
  const distribution: Record<string, number> = {};

  // Initialize all folders with 0
  for (const folder of folders) {
    distribution[folder] = 0;
  }

  // Distribute requests evenly, with remainder going to first folders
  const perFolder = Math.floor(requestCount / folders.length);
  const remainder = requestCount % folders.length;

  for (let i = 0; i < folders.length; i++) {
    distribution[folders[i]] = perFolder + (i < remainder ? 1 : 0);
  }

  return distribution;
}

/**
 * Create a request file
 * Request names include parent folder prefix for verifiable parent-child relationships
 * Uses short names: R1, F1-R1, F1-F1-R1 to avoid OS filename length limits
 */
async function createRequest(
  basePath: string,
  folderPath: string,
  indexInFolder: number,
  method: typeof HTTP_METHODS[number],
  format: CollectionFormat
): Promise<void> {
  // Get parent folder name from path (e.g., "F1/F1-F1" -> "F1-F1")
  const parentName = folderPath ? path.basename(folderPath) : '';
  const requestName = parentName ? `${parentName}-R${indexInFolder + 1}` : `R${indexInFolder + 1}`;
  const ext = format === 'bru' ? 'bru' : 'yml';
  const fullFolderPath = folderPath
    ? path.join(basePath, folderPath)
    : basePath;
  const filePath = path.join(fullFolderPath, `${requestName}.${ext}`);

  // Ensure folder exists
  await fs.promises.mkdir(fullFolderPath, { recursive: true });

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);

  if (format === 'bru') {
    let content = `meta {
  name: ${requestName}
  type: http
  seq: ${(indexInFolder % 100) + 1}
}

${method.toLowerCase()} {
  url: {{host}}/api/resource/${indexInFolder + 1}
  body: ${hasBody ? 'json' : 'none'}
  auth: none
}
`;

    if (hasBody) {
      content += `
body:json {
  {
    "id": ${indexInFolder + 1},
    "name": "Resource ${indexInFolder + 1}",
    "timestamp": "${new Date().toISOString()}"
  }
}
`;
    }

    await fs.promises.writeFile(filePath, content);
  } else {
    let content = `info:
  name: ${requestName}
  type: http
  seq: ${(indexInFolder % 100) + 1}

http:
  method: ${method}
  url: "{{host}}/api/resource/${indexInFolder + 1}"
`;

    if (hasBody) {
      content += `  body:
    mode: json
    json: |
      {
        "id": ${indexInFolder + 1},
        "name": "Resource ${indexInFolder + 1}",
        "timestamp": "${new Date().toISOString()}"
      }
`;
    }

    await fs.promises.writeFile(filePath, content);
  }
}

/**
 * Generate collections in both formats for comparison testing
 */
export async function generateCollectionPair(
  options: Omit<GenerateCollectionOptions, 'format'>
): Promise<{
  bru: GeneratedCollection;
  yml: GeneratedCollection;
  cleanup: () => Promise<void>;
}> {
  const bru = await generateCollection({ ...options, format: 'bru' });
  const yml = await generateCollection({ ...options, format: 'yml' });

  return {
    bru,
    yml,
    cleanup: async () => {
      await Promise.all([bru.cleanup(), yml.cleanup()]);
    }
  };
}

/**
 * Item definition for sorting test collections
 */
export interface SortingTestItem {
  /** Name of the request */
  name: string;
  /** Sequence number (omit to test alphabetical sorting) */
  seq?: number;
  /** HTTP method (default: GET) */
  method?: typeof HTTP_METHODS[number];
}

/**
 * Options for generating a sorting test collection
 */
export interface SortingTestCollectionOptions {
  /** Name of the collection */
  name: string;
  /** Items to generate with specific names and sequences */
  items: SortingTestItem[];
  /** Collection format */
  format: CollectionFormat;
}

/**
 * Generate a collection specifically for sorting tests.
 * Allows specifying exact item names and sequence numbers.
 */
export async function generateSortingTestCollection(
  options: SortingTestCollectionOptions
): Promise<GeneratedCollection> {
  const { name, items, format } = options;

  // Create temp directory
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'bruno-test-sorting-')
  );

  try {
    // Generate collection root files
    await generateCollectionRoot(tempDir, name, format);

    // Create each request with specified name and sequence
    for (const item of items) {
      await createSortingTestRequest(tempDir, item, format);
    }

    return {
      path: tempDir,
      cleanup: async () => {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      },
      name,
      requestCount: items.length,
      folderCount: 0,
      format
    };
  } catch (error) {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Create a request file for sorting tests with specific name and sequence
 */
async function createSortingTestRequest(
  basePath: string,
  item: SortingTestItem,
  format: CollectionFormat
): Promise<void> {
  const { name, seq, method = 'GET' } = item;
  const ext = format === 'bru' ? 'bru' : 'yml';
  const filePath = path.join(basePath, `${name}.${ext}`);

  if (format === 'bru') {
    const seqLine = seq !== undefined ? `\n  seq: ${seq}` : '';
    const content = `meta {
  name: ${name}
  type: http${seqLine}
}

${method.toLowerCase()} {
  url: {{host}}/api/${name.toLowerCase().replace(/\s+/g, '-')}
  body: none
  auth: none
}
`;
    await fs.promises.writeFile(filePath, content);
  } else {
    const seqLine = seq !== undefined ? `\n  seq: ${seq}` : '';
    const content = `info:
  name: ${name}
  type: http${seqLine}

http:
  method: ${method}
  url: "{{host}}/api/${name.toLowerCase().replace(/\s+/g, '-')}"
`;
    await fs.promises.writeFile(filePath, content);
  }
}

/**
 * Set up a sorting test fixture with collection and user data directory
 */
export async function setupSortingTestFixture(
  options: SortingTestCollectionOptions
): Promise<TestFixture> {
  const collection = await generateSortingTestCollection(options);

  const userDataPath = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'bruno-test-userdata-')
  );

  try {
    const preferences = {
      lastOpenedCollections: [collection.path],
      preferences: {
        onboarding: {
          hasLaunchedBefore: true,
          hasSeenWelcomeModal: true
        }
      }
    };

    await fs.promises.writeFile(
      path.join(userDataPath, 'preferences.json'),
      JSON.stringify(preferences, null, 2)
    );

    return {
      collection,
      userDataPath,
      cleanup: async () => {
        await Promise.all([
          collection.cleanup(),
          fs.promises.rm(userDataPath, { recursive: true, force: true })
        ]);
      }
    };
  } catch (error) {
    await Promise.all([
      collection.cleanup(),
      fs.promises.rm(userDataPath, { recursive: true, force: true })
    ]);
    throw error;
  }
}

/**
 * Options for setting up a test fixture
 */
export interface TestFixtureOptions extends GenerateCollectionOptions {
  /** Additional collections to preload (paths) */
  additionalCollections?: string[];
}

/**
 * Result of setting up a test fixture
 */
export interface TestFixture {
  /** Generated collection */
  collection: GeneratedCollection;
  /** Path to user data directory with preferences */
  userDataPath: string;
  /** Cleanup function to remove all generated files */
  cleanup: () => Promise<void>;
}

/**
 * Set up a complete test fixture with collection and user data directory.
 * This creates:
 * 1. A generated collection based on the provided options
 * 2. A user data directory with preferences.json configured to preload the collection
 *
 * Use this in beforeAll to set up fixtures, and call cleanup() in afterAll.
 * Note: This does NOT handle app launching or closing - that should be done separately.
 */
export async function setupTestFixture(
  options: TestFixtureOptions
): Promise<TestFixture> {
  const { additionalCollections = [], ...collectionOptions } = options;

  // Generate the collection
  const collection = await generateCollection(collectionOptions);

  // Create user data directory
  const userDataPath = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'bruno-test-userdata-')
  );

  try {
    // Create preferences.json with collection preloaded
    const preferences = {
      lastOpenedCollections: [collection.path, ...additionalCollections],
      preferences: {
        onboarding: {
          hasLaunchedBefore: true,
          hasSeenWelcomeModal: true
        }
      }
    };

    await fs.promises.writeFile(
      path.join(userDataPath, 'preferences.json'),
      JSON.stringify(preferences, null, 2)
    );

    return {
      collection,
      userDataPath,
      cleanup: async () => {
        await Promise.all([
          collection.cleanup(),
          fs.promises.rm(userDataPath, { recursive: true, force: true })
        ]);
      }
    };
  } catch (error) {
    // Cleanup on error
    await Promise.all([
      collection.cleanup(),
      fs.promises.rm(userDataPath, { recursive: true, force: true })
    ]);
    throw error;
  }
}
