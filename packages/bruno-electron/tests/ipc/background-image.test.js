const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

jest.mock('electron', () => ({
  app: { getPath: jest.fn() },
  dialog: { showOpenDialog: jest.fn() },
  ipcMain: { handle: jest.fn() },
  nativeImage: { createFromBuffer: jest.fn() }
}));

jest.mock('../../src/store/preferences', () => ({
  getBackgroundImage: jest.fn(),
  saveBackgroundImage: jest.fn()
}));

const { app, dialog, ipcMain, nativeImage } = require('electron');
const { getBackgroundImage, saveBackgroundImage } = require('../../src/store/preferences');
const registerBackgroundImageIpc = require('../../src/ipc/background-image');

// Use header-only fixtures so these tests can assert whether decoding was attempted.
function pngHeader(width, height) {
  const bytes = Buffer.alloc(33);
  Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').copy(bytes);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function progressiveJpegHeader(width, height) {
  // An APP1 payload contains marker-like bytes. A padding byte precedes the real SOF2 marker.
  const metadata = Buffer.from('ffd8ffe10006ffc20002ff', 'hex');
  const frame = Buffer.from('ffc2000b080000000001011100', 'hex');
  frame.writeUInt16BE(height, 5);
  frame.writeUInt16BE(width, 7);
  return Buffer.concat([metadata, frame]);
}

describe('background image dimension validation', () => {
  let userData;
  let handlers;

  beforeEach(async () => {
    jest.resetAllMocks();
    userData = await fs.mkdtemp(path.join(os.tmpdir(), 'bruno-background-image-'));
    app.getPath.mockReturnValue(userData);
    getBackgroundImage.mockReturnValue({});
    nativeImage.createFromBuffer.mockReturnValue({ isEmpty: () => false });
    registerBackgroundImageIpc({});
    handlers = new Map(ipcMain.handle.mock.calls);
  });

  afterEach(async () => {
    await fs.rm(userData, { recursive: true, force: true });
  });

  async function chooseImage(name, bytes) {
    const file = path.join(userData, name);
    await fs.writeFile(file, bytes);
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [file] });
    return handlers.get('renderer:background-image:choose')();
  }

  it.each([
    ['oversized.png', pngHeader(20_000, 20_000)],
    ['oversized.jpg', progressiveJpegHeader(20_000, 20_000)]
  ])('rejects %s before decoding or saving it', async (name, bytes) => {
    await expect(chooseImage(name, bytes)).rejects.toThrow('40 megapixels or smaller');
    expect(nativeImage.createFromBuffer).not.toHaveBeenCalled();
    expect(saveBackgroundImage).not.toHaveBeenCalled();
  });

  it.each([
    ['valid.png', pngHeader(8_000, 5_000), 'image/png'],
    ['valid.jpg', progressiveJpegHeader(600, 800), 'image/jpeg']
  ])('still decodes and saves %s within the limit', async (name, bytes, type) => {
    await expect(chooseImage(name, bytes)).resolves.toMatchObject({ fileName: name, image: { type } });
    expect(nativeImage.createFromBuffer).toHaveBeenCalledWith(bytes);
    expect(saveBackgroundImage).toHaveBeenCalledWith(expect.objectContaining({ fileName: name }));
  });

  it.each([
    ['zero-height.png', pngHeader(600, 0)],
    ['truncated.jpg', progressiveJpegHeader(600, 800).subarray(0, -1)]
  ])('rejects %s without attempting to decode it', async (name, bytes) => {
    await expect(chooseImage(name, bytes)).rejects.toThrow('invalid or unsupported header');
    expect(nativeImage.createFromBuffer).not.toHaveBeenCalled();
  });

  it('still rejects an in-bounds image when the decoder fails', async () => {
    nativeImage.createFromBuffer.mockReturnValue({ isEmpty: () => true });

    await expect(chooseImage('corrupt.png', pngHeader(600, 800))).rejects.toThrow('could not be decoded');
    expect(saveBackgroundImage).not.toHaveBeenCalled();
  });

  it('omits an oversized saved image when restoring settings', async () => {
    const id = '12345678-1234-1234-1234-123456789abc.png';
    const directory = path.join(userData, 'background-images');
    await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, id), pngHeader(20_000, 20_000));
    getBackgroundImage.mockReturnValue({ id, fileName: 'oversized.png' });

    await expect(handlers.get('renderer:background-image:load')()).resolves.toMatchObject({
      fileName: 'oversized.png',
      image: null
    });
  });
});
