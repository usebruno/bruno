const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { app, dialog, ipcMain, nativeImage } = require('electron');
const { normalizeBackgroundDisplay } = require('@usebruno/common');
const { getBackgroundImage, saveBackgroundImage } = require('../store/preferences');

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const ASSET_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(png|jpg)$/;

function backgroundDirectory() {
  return path.join(app.getPath('userData'), 'background-images');
}

async function readImage(filePath) {
  const file = await fs.open(filePath, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile()) {
      throw new Error('Choose a PNG or JPEG file.');
    }
    const { size } = stat;
    if (size > MAX_IMAGE_SIZE) {
      throw new Error('Background images must be 20 MB or smaller.');
    }

    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const { bytesRead } = await file.read(bytes, offset, size - offset, offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset !== size || (await file.stat()).size !== size) {
      throw new Error('The image changed while it was being read. Please select it again.');
    }
    if (bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
      return { bytes, type: 'image/png', extension: 'png' };
    }
    if (bytes.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) {
      return { bytes, type: 'image/jpeg', extension: 'jpg' };
    }
    throw new Error('Choose a PNG or JPEG image.');
  } finally {
    await file.close();
  }
}

async function removeAsset(id) {
  if (typeof id === 'string' && ASSET_ID.test(id)) {
    await fs.rm(path.join(backgroundDirectory(), id), { force: true })
      .catch((error) => console.warn('Could not remove unused background image:', error.message));
  }
}

async function loadBackgroundImage() {
  const { id, fileName, ...options } = getBackgroundImage();
  const display = normalizeBackgroundDisplay(options);
  if (typeof id !== 'string' || !ASSET_ID.test(id)) {
    return { display, fileName: null, image: null };
  }
  try {
    const image = await readImage(path.join(backgroundDirectory(), id));
    return { display, fileName, image };
  } catch {
    return { display, fileName, image: null };
  }
}

function registerBackgroundImageIpc(mainWindow) {
  ipcMain.handle('renderer:background-image:load', loadBackgroundImage);

  ipcMain.handle('renderer:background-image:choose', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
    });
    if (canceled || !filePaths[0]) return null;

    const filePath = filePaths[0];
    if (!(await fs.stat(filePath)).isFile()) {
      throw new Error('Choose a PNG or JPEG file.');
    }
    const image = await readImage(filePath);
    const decoded = nativeImage.createFromBuffer(image.bytes);
    if (decoded.isEmpty()) {
      throw new Error('The selected image could not be decoded.');
    }
    const { width, height } = decoded.getSize();
    if (width * height > MAX_IMAGE_PIXELS) {
      throw new Error('Background images must be 40 megapixels or smaller.');
    }

    const id = `${randomUUID()}.${image.extension}`;
    const fileName = path.basename(filePath);
    await fs.mkdir(backgroundDirectory(), { recursive: true });
    try {
      await fs.writeFile(path.join(backgroundDirectory(), id), image.bytes, { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if (error.code !== 'EEXIST') await removeAsset(id);
      throw error;
    }

    const previous = getBackgroundImage();
    try {
      saveBackgroundImage({ ...normalizeBackgroundDisplay(previous), id, fileName });
    } catch (error) {
      await removeAsset(id);
      throw error;
    }
    await removeAsset(previous.id);
    return { fileName, image };
  });

  ipcMain.handle('renderer:background-image:display', (_event, display) => {
    const { id, fileName } = getBackgroundImage();
    saveBackgroundImage({ ...normalizeBackgroundDisplay(display), id, fileName });
  });

  ipcMain.handle('renderer:background-image:clear', async () => {
    const previous = getBackgroundImage();
    saveBackgroundImage(normalizeBackgroundDisplay(previous));
    await removeAsset(previous.id);
  });
}

module.exports = registerBackgroundImageIpc;
