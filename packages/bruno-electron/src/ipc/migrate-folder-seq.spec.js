const { stampFolderSeqFromDisplayOrder } = require('./migrate-folder-seq');

describe('stampFolderSeqFromDisplayOrder', () => {
  it('assigns contiguous seq matching bru display order including drag seq', () => {
    const items = [
      {
        folderPath: '/col/zeta',
        name: 'zeta',
        seq: undefined,
        folderData: { meta: { name: 'zeta' } }
      },
      {
        folderPath: '/col/alpha',
        name: 'alpha',
        seq: undefined,
        folderData: { meta: { name: 'alpha' } }
      },
      {
        folderPath: '/col/dragged',
        name: 'dragged',
        seq: 1,
        folderData: { meta: { name: 'dragged', seq: 1 } }
      }
    ];

    stampFolderSeqFromDisplayOrder(items);

    // bru display: dragged @ seq1, then alpha/zeta alpha
    expect(items.find((i) => i.name === 'dragged').folderData.meta.seq).toBe(1);
    expect(items.find((i) => i.name === 'alpha').folderData.meta.seq).toBe(2);
    expect(items.find((i) => i.name === 'zeta').folderData.meta.seq).toBe(3);
  });

  it('sequences each parent independently', () => {
    const items = [
      {
        folderPath: '/col/a',
        name: 'b-folder',
        seq: undefined,
        folderData: { meta: { name: 'b-folder' } }
      },
      {
        folderPath: '/col/a2',
        name: 'a-folder',
        seq: undefined,
        folderData: { meta: { name: 'a-folder' } }
      },
      {
        folderPath: '/col/nested/z',
        name: 'z',
        seq: undefined,
        folderData: { meta: { name: 'z' } }
      }
    ];

    stampFolderSeqFromDisplayOrder(items);

    expect(items.find((i) => i.name === 'a-folder').folderData.meta.seq).toBe(1);
    expect(items.find((i) => i.name === 'b-folder').folderData.meta.seq).toBe(2);
    expect(items.find((i) => i.name === 'z').folderData.meta.seq).toBe(1);
  });
});
