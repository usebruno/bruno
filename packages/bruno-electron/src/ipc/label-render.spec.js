const mockRequest = jest.fn();
const mockGetPreferences = jest.fn();

jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));
jest.mock('../store/preferences', () => ({ getPreferences: () => mockGetPreferences() }));
jest.mock('./network/cert-utils', () => ({ getCertsAndProxyConfig: jest.fn().mockResolvedValue({}) }));
jest.mock('./network/axios-instance', () => ({ makeAxiosInstance: () => ({ request: mockRequest }) }));

const mockChooseFileToSave = jest.fn();
const mockWriteFile = jest.fn();
jest.mock('../utils/filesystem', () => ({
  chooseFileToSave: (...args) => mockChooseFileToSave(...args),
  writeFile: (...args) => mockWriteFile(...args)
}));

const { renderZplLabel, saveLabelFile } = require('./label-render');

const validRequest = { zpl: '^XA^FDHi^FS^XZ', dpmm: 8, widthInches: 4, heightInches: 6 };

describe('renderZplLabel', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockGetPreferences.mockReturnValue({ labelary: { endpoint: 'https://api.labelary.com/', consent: true } });
  });

  it('refuses to render without consent', async () => {
    mockGetPreferences.mockReturnValue({ labelary: { endpoint: 'https://api.labelary.com', consent: false } });
    const result = await renderZplLabel(validRequest);
    expect(result).toMatchObject({ error: true, code: 'CONSENT_REQUIRED' });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...validRequest, zpl: '  ' }],
    [{ ...validRequest, dpmm: 10 }],
    [{ ...validRequest, widthInches: 0 }],
    [{ ...validRequest, heightInches: 99 }]
  ])('rejects invalid input %#', async (req) => {
    expect(await renderZplLabel(req)).toMatchObject({ error: true, code: 'INVALID_REQUEST' });
  });

  it('rejects a non-http endpoint', async () => {
    mockGetPreferences.mockReturnValue({ labelary: { endpoint: 'file:///etc/passwd', consent: true } });
    expect(await renderZplLabel(validRequest)).toMatchObject({ error: true, code: 'INVALID_ENDPOINT' });
  });

  it('posts the ZPL and returns the PNG as base64', async () => {
    mockRequest.mockResolvedValue({ status: 200, data: Buffer.from('png-bytes') });
    const result = await renderZplLabel(validRequest);

    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/',
      method: 'POST',
      data: validRequest.zpl
    }));
    expect(result).toEqual({ image: Buffer.from('png-bytes').toString('base64') });
  });

  it('surfaces the service error message for a non-200 response', async () => {
    mockRequest.mockResolvedValue({ status: 400, data: Buffer.from('ERROR: Invalid ZPL') });
    expect(await renderZplLabel(validRequest)).toEqual({ error: true, code: 'HTTP_400', message: 'ERROR: Invalid ZPL' });
  });

  it('returns a network failure as an error object', async () => {
    mockRequest.mockRejectedValue(Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }));
    expect(await renderZplLabel(validRequest)).toMatchObject({ error: true, code: 'ENOTFOUND' });
  });
});

describe('saveLabelFile', () => {
  const mainWindow = {};

  beforeEach(() => {
    mockChooseFileToSave.mockReset();
    mockWriteFile.mockReset();
  });

  it('writes base64 content as bytes to the chosen path', async () => {
    mockChooseFileToSave.mockResolvedValue('/tmp/label.pdf');
    const result = await saveLabelFile(mainWindow, { fileName: 'label.pdf', content: Buffer.from('%PDF-1.4').toString('base64'), encoding: 'base64' });

    expect(mockChooseFileToSave).toHaveBeenCalledWith(mainWindow, 'label.pdf');
    expect(mockWriteFile).toHaveBeenCalledWith('/tmp/label.pdf', Buffer.from('%PDF-1.4'), true);
    expect(result).toEqual({ success: true, filePath: '/tmp/label.pdf' });
  });

  it('writes ZPL source as utf8 text', async () => {
    mockChooseFileToSave.mockResolvedValue('/tmp/label.zpl');
    await saveLabelFile(mainWindow, { fileName: 'label.zpl', content: '^XA^FDé^FS^XZ', encoding: 'utf8' });
    expect(mockWriteFile).toHaveBeenCalledWith('/tmp/label.zpl', Buffer.from('^XA^FDé^FS^XZ', 'utf8'), true);
  });

  it('reports cancellation without writing', async () => {
    mockChooseFileToSave.mockResolvedValue(undefined);
    expect(await saveLabelFile(mainWindow, { fileName: 'label.png', content: 'AAAA', encoding: 'base64' })).toEqual({ success: false, cancelled: true });
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it.each([
    [{ fileName: '../evil.pdf', content: 'AAAA', encoding: 'base64' }],
    [{ fileName: '', content: 'AAAA', encoding: 'base64' }],
    [{ fileName: 'a.pdf', content: 5, encoding: 'base64' }],
    [{ fileName: 'a.pdf', content: 'AAAA', encoding: 'hex' }]
  ])('rejects invalid input %#', async (req) => {
    await expect(saveLabelFile(mainWindow, req)).rejects.toThrow();
    expect(mockChooseFileToSave).not.toHaveBeenCalled();
  });
});
