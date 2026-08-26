import { RESPONSE_BODY_CHANNELS } from './media-url';

/**
 * @typedef {{ invoke: (channel: string, ...args: any[]) => Promise<any> }} IpcPort
 */

export const createResponseBodyClient = (ipcPort) => {
  if (!ipcPort || typeof ipcPort.invoke !== 'function') {
    throw new Error('createResponseBodyClient requires an IpcPort with invoke()');
  }

  return {
    getStat(bodyRef) {
      return ipcPort.invoke(RESPONSE_BODY_CHANNELS.STAT, bodyRef);
    },

    async readRange(bodyRef, offset, length) {
      const b64 = await ipcPort.invoke(RESPONSE_BODY_CHANNELS.READ, bodyRef, offset, length);
      if (typeof b64 !== 'string') return Buffer.alloc(0);
      // Browser / renderer: Buffer may be polyfilled; prefer Uint8Array decode
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(b64, 'base64');
      }
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    },

    async readRangeAsText(bodyRef, offset, length, encoding = 'utf-8') {
      const buf = await this.readRange(bodyRef, offset, length);
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder(encoding).decode(buf);
      }
      return Buffer.from(buf).toString(encoding);
    },

    save(bodyRef, { url, pathname, headers } = {}) {
      return ipcPort.invoke(RESPONSE_BODY_CHANNELS.SAVE, { bodyRef, url, pathname, headers });
    },

    pin(bodyRef) {
      return ipcPort.invoke(RESPONSE_BODY_CHANNELS.PIN, bodyRef);
    },

    release(pinIdOrBodyRef) {
      return ipcPort.invoke(RESPONSE_BODY_CHANNELS.RELEASE, pinIdOrBodyRef);
    }
  };
};
