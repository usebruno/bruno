import type { BrunoCollection } from '@usebruno/schema-types';
import postmanToBruno from '../postman/postman-to-bruno';
import { writeCollectionToDisk } from './writeCollectionToDisk';

export interface ImportPostmanToBrunoOptions {
  preserveScripts?: boolean;
}

/**
 * Converts a Postman collection with `postmanToBruno` and writes it to `outputDir`.
 */
export const importPostmanToBruno = async (
  postmanCollection: unknown,
  outputDir: string,
  { preserveScripts = false }: ImportPostmanToBrunoOptions = {}
): Promise<void> => {
  const { collection } = await postmanToBruno(postmanCollection, { preserveScripts });
  await writeCollectionToDisk(collection as BrunoCollection, outputDir);
};
