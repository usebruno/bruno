import { toOpenCollectionBody, toBrunoBody } from './body';

describe('file body description', () => {
  it('toOpenCollectionBody: preserves description, omits when absent or whitespace-only', () => {
    const out = toOpenCollectionBody({
      mode: 'file',
      file: [
        { uid: 'f1', filePath: '/tmp/readme.pdf', contentType: 'application/pdf', selected: true, description: 'Upload doc' },
        { uid: 'f2', filePath: '/tmp/other.bin', contentType: 'application/octet-stream', selected: false },
        { uid: 'f3', filePath: '/tmp/plain.bin', contentType: 'application/octet-stream', selected: false, description: '   ' }
      ]
    } as any);

    expect(out?.type).toBe('file');
    expect(out?.data).toHaveLength(3);
    expect(out?.data[0]).toMatchObject({ filePath: '/tmp/readme.pdf', description: 'Upload doc' });
    expect(out?.data[1]).not.toHaveProperty('description');
    expect(out?.data[2]).not.toHaveProperty('description');
  });

  it('toBrunoBody: parses description from file body entries', () => {
    const out = toBrunoBody({
      type: 'file',
      data: [
        { filePath: '/tmp/readme.pdf', contentType: 'application/pdf', selected: true, description: 'Upload doc' },
        { filePath: '/tmp/other.bin', contentType: 'application/octet-stream', selected: false }
      ]
    } as any);

    expect(out?.mode).toBe('file');
    expect(out?.file).toHaveLength(2);

    // already fails on the length check above if no bodies are recieved, the if below is just
    // to satisfy typescript and then validate the content of the files
    if (out?.file) {
      expect(out?.file[0]).toMatchObject({ filePath: '/tmp/readme.pdf', description: 'Upload doc' });
      expect(out?.file[1].description).toBeFalsy();
    }
  });

  it('round-trips file body descriptions through OC conversion', () => {
    const brunoBody = {
      mode: 'file',
      file: [
        { uid: 'f1', filePath: '/tmp/readme.pdf', contentType: 'application/pdf', selected: true, description: 'Upload doc' },
        { uid: 'f2', filePath: '/tmp/other.bin', contentType: 'application/octet-stream', selected: false }
      ]
    } as any;

    const oc = toOpenCollectionBody(brunoBody);
    const back = toBrunoBody(oc);

    expect(back?.file).toHaveLength(2);

    // already fails on the length check above if no bodies are recieved, the if below is just
    // to satisfy typescript and then validate the content of the files
    if (back?.file) {
      expect(back?.file[0]).toMatchObject({ filePath: '/tmp/readme.pdf', description: 'Upload doc' });
      expect(back?.file[1].description).toBeFalsy();
    }
  });
});
