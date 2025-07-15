import { resetSequencesInFolder, isItemBetweenSequences } from 'utils/collections/index';

describe('resetSequencesInFolder', () => {
  it('should fix the sequences in the folder 1', () => {
    const folder = {
      items: [
        { uid: '1', seq: 1 },
        { uid: '2', seq: 3 },
        { uid: '3', seq: 6 },
      ],
    };

    const fixedFolder = resetSequencesInFolder(folder.items);
    expect(fixedFolder).toEqual([
      { uid: '1', seq: 1 },
      { uid: '2', seq: 2 },
      { uid: '3', seq: 3 },
    ]);
  });


  it('should fix the sequences in the folder 2', () => {
    const folder = {
      items: [
        { uid: '1', seq: 3 },
        { uid: '2', seq: 1 },
        { uid: '3', seq: 2 },
      ],
    };

    const fixedFolder = resetSequencesInFolder(folder.items);
    expect(fixedFolder).toEqual([
      { uid: '2', seq: 1 },
      { uid: '3', seq: 2 },
      { uid: '1', seq: 3 },
    ]);
  });

  it('should fix the sequences in the folder with missing sequences', () => {
    const folder = {
      items: [
        { uid: '1', seq: 1 },
        { uid: '2', type: 'folder' },
        { uid: '3', type: 'folder' },
        { uid: '4', seq: 7 },
      ]
    };

    const fixedFolder = resetSequencesInFolder(folder.items);
    expect(fixedFolder).toEqual([
      { uid: '1', seq: 1 },
      { uid: '2', seq: 2, type: 'folder' },
      { uid: '3', seq: 3, type: 'folder' },
      { uid: '4', seq: 4 },
    ]);
  });

  it('should fix the sequences in the folder with same sequences', () => {
    const folder = {
      items: [
        { uid: '1', seq: 2 },
        { uid: '2', seq: 2 },
        { uid: '3', seq: 3 },
        { uid: '4', seq: 1 },
      ],
    };

    const fixedFolder = resetSequencesInFolder(folder.items);
    expect(fixedFolder).toEqual([
      { uid: '4', seq: 1 },
      { uid: '1', seq: 2 },
      { uid: '2', seq: 3 },
      { uid: '3', seq: 4 },
    ]);
  });
});

describe('isItemBetweenSequences', () => {
  it('should return true if the item is between the sequences 1', () => {
    const item = { uid: '1', seq: 2 };
    const draggedSequence = 1;
    const targetSequence = 5;
    const result = isItemBetweenSequences(item?.seq, draggedSequence, targetSequence);
    expect(result).toBe(true);
  });

  it('should return true if the item is between the sequences 2', () => {
    const item = { uid: '1', seq: 2 };
    const draggedSequence = 1;
    const targetSequence = 5;
    const result = isItemBetweenSequences(item?.seq, draggedSequence, targetSequence);
    expect(result).toBe(true);
  });

  it('should return true if the item is between the sequences 3', () => {
    const item = { uid: '1', seq: 4 };
    const draggedSequence = 1;
    const targetSequence = 5;
    const result = isItemBetweenSequences(item?.seq, draggedSequence, targetSequence);
    expect(result).toBe(true);
  });

  it('should return true if the item is between the sequences 4', () => {
    const item = { uid: '1', seq: 1 };
    const draggedSequence = 5;
    const targetSequence = 1;
    const result = isItemBetweenSequences(item?.seq, draggedSequence, targetSequence);
    expect(result).toBe(true);
  });

  it('should return false if the item is between the sequences 1', () => {
    const item = { uid: '1', seq: 1 };
    const draggedSequence = 1;
    const targetSequence = 5;
    const result = isItemBetweenSequences(item?.seq, draggedSequence, targetSequence);
    expect(result).toBe(false);
  });

  it('should return false if the item is between the sequences 2', () => {
    const item = { uid: '1', seq: 5 };
    const draggedSequence = 1;
    const targetSequence = 5;
    const result = isItemBetweenSequences(item?.seq, draggedSequence, targetSequence);
    expect(result).toBe(false);
  });
});
