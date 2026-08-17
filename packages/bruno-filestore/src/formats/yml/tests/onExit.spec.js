import parseCollection from '../parseCollection';
import stringifyCollection from '../stringifyCollection';

const collectionRoot = { meta: null, request: null, docs: null };

describe('yml collection - on-exit cleanup round-trip', () => {
  it('writes and reads the cleanup request configuration', () => {
    const brunoConfig = {
      name: 'My API',
      type: 'collection',
      ignore: [],
      onExit: {
        enabled: true,
        showReminder: true,
        reminderMessage: 'Release the shared environment.',
        requestPaths: ['cleanup/request-one.bru', 'cleanup/request-two.bru']
      }
    };

    const yml = stringifyCollection(collectionRoot, brunoConfig);
    expect(yml).toContain('onExit:');
    expect(yml).toContain('request-one');

    const { brunoConfig: parsed } = parseCollection(yml);
    expect(parsed.onExit).toEqual(brunoConfig.onExit);
  });
});
