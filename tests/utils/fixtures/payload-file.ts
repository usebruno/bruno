import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Builders for request-body payload files, sized on demand so no binary blobs are committed.
 * The files carry their type's prefix but are not valid documents — assert on bytes, not parsing.
 */

/** Leading bytes identifying a file type. An unlisted extension is filler only. */
const EXTENSION_PREFIXES: Record<string, Buffer> = {
  '.csv': Buffer.from('id,name,email,status\n'),
  '.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  '.pdf': Buffer.from('%PDF-1.4\n')
};

export interface WritePayloadFileOptions {
  /** Must already exist */
  dir: string;
  /** Its extension decides the prefix */
  fileName: string;
  sizeInBytes: number;
}

export interface PayloadFile {
  /** Absolute path to the written file */
  path: string;
  sha256: string;
  sizeInBytes: number;
}

/** Write a payload of `sizeInBytes` carrying its extension's prefix. */
export const writePayloadFile = async ({
  dir,
  fileName,
  sizeInBytes
}: WritePayloadFileOptions): Promise<PayloadFile> => {
  const extension = path.extname(fileName).toLowerCase();
  const prefix = EXTENSION_PREFIXES[extension] ?? Buffer.alloc(0);
  if (sizeInBytes < prefix.length) {
    throw new Error(`sizeInBytes ${sizeInBytes} is smaller than the ${extension} prefix (${prefix.length} bytes)`);
  }

  const buffer = Buffer.alloc(sizeInBytes, 'a');
  prefix.copy(buffer);

  const filePath = path.join(dir, fileName);
  await fs.promises.writeFile(filePath, buffer);

  return {
    path: filePath,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    sizeInBytes
  };
};
