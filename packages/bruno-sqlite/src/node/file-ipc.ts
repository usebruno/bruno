import { MAX_TRANSFER_BYTES, SQLITE_FILE_CHANNEL, type FileRange, type FileRequest } from '../shared/files';
import type { FileStore } from './files';

export interface FileIpcMainLike {
  handle(channel: string, listener: (event: unknown, request: FileRequest) => unknown): void;
}

export type FileIpcOptions = {
  maxTransferBytes?: number;
};

export const registerFileIpc = (
  ipcMain: FileIpcMainLike,
  files: FileStore,
  options: FileIpcOptions = {}
): ((request: FileRequest) => Promise<unknown>) => {
  const maxTransfer = options.maxTransferBytes ?? MAX_TRANSFER_BYTES;

  const clamp = (range: FileRange = {}): FileRange => ({
    offset: range.offset,
    length: Math.min(range.length ?? maxTransfer, maxTransfer)
  });

  const dispatch = async (request: FileRequest): Promise<unknown> => {
    const { id, range } = request.params;
    switch (request.name) {
      case 'stat':
        return files.stat(id);
      case 'read': {
        const bytes = await files.read(id, clamp(range));
        return bytes === null ? null : new Uint8Array(bytes);
      }
      default:
        throw new Error(`unknown file operation: ${(request as { name: string }).name}`);
    }
  };

  ipcMain.handle(SQLITE_FILE_CHANNEL, (_event, request) => dispatch(request));

  return dispatch;
};
