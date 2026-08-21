import { toOpenCollectionParams, toBrunoParams } from './params';

describe('path params with several candidate rows per name', () => {
  it('round-trips duplicate-name path params with a disabled alternate', () => {
    const brunoParams = [
      { uid: 'u1', name: 'kind', value: 'Logo', type: 'path', enabled: true },
      { uid: 'u2', name: 'kind', value: 'Signature', type: 'path', enabled: false }
    ] as any;

    const ocParams = toOpenCollectionParams(brunoParams);

    expect(ocParams).toEqual([
      { name: 'kind', value: 'Logo', type: 'path' },
      { name: 'kind', value: 'Signature', type: 'path', disabled: true }
    ]);

    const roundTripped = toBrunoParams(ocParams);

    expect(roundTripped).toEqual([
      expect.objectContaining({ name: 'kind', value: 'Logo', type: 'path', enabled: true }),
      expect.objectContaining({ name: 'kind', value: 'Signature', type: 'path', enabled: false })
    ]);
  });

  it('parses a legacy row without the disabled flag as enabled', () => {
    const out = toBrunoParams([{ name: 'id', value: '123', type: 'path' }] as any);

    expect(out).toEqual([expect.objectContaining({ name: 'id', value: '123', type: 'path', enabled: true })]);
  });
});
