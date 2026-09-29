import { SQLITE_FILE_CHANNEL, type FileEntry, type FileRange } from '../shared/files';
import type { SQLiteBridge } from '../shared/ipc';

export interface FileClient {
  stat(id: number): Promise<FileEntry | null>;
  read(id: number, range?: FileRange): Promise<Uint8Array | null>;
  readText(id: number, range?: FileRange): Promise<string | null>;
}

const concat = (parts: Uint8Array[], length: number): Uint8Array => {
  if (parts.length === 1) return parts[0];
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
};

export const createFileClient = (bridge: SQLiteBridge): FileClient => {
  const channel = SQLITE_FILE_CHANNEL;

  const stat = (id: number) => bridge.invoke(channel, { name: 'stat', params: { id } }) as Promise<FileEntry | null>;

  const readRanges = async (id: number, from: number, to: number): Promise<Uint8Array | null> => {
    const parts: Uint8Array[] = [];
    let length = 0;
    // The main side owns the transfer size: ask for the whole remaining range, let it clamp to
    // its maxTransferBytes, and advance by what actually came back. A stride chosen here would
    // skip bytes whenever the reply is shorter than the request.
    let offset = from;
    while (offset < to) {
      const chunk = (await bridge.invoke(channel, {
        name: 'read',
        params: { id, range: { offset, length: to - offset } }
      })) as Uint8Array | null;
      if (chunk === null) return parts.length === 0 ? null : concat(parts, length);
      if (chunk.byteLength === 0) break;
      parts.push(chunk);
      length += chunk.byteLength;
      offset += chunk.byteLength;
    }
    return concat(parts.length === 0 ? [new Uint8Array(0)] : parts, length);
  };

  const resolve = async (id: number, range: FileRange = {}) => {
    const offset = range.offset ?? 0;
    if (range.length !== undefined) return { from: offset, to: offset + range.length };
    const entry = await stat(id);
    return entry === null ? null : { from: offset, to: entry.size };
  };

  return {
    stat,

    async read(id, range = {}) {
      const bounds = await resolve(id, range);
      if (bounds === null) return null;
      return readRanges(id, bounds.from, bounds.to);
    },

    async readText(id, range = {}) {
      const bounds = await resolve(id, range);
      if (bounds === null) return null;
      const bytes = await readRanges(id, bounds.from, bounds.to);
      return bytes === null ? null : new TextDecoder('utf-8').decode(bytes);
    }
  };
};
