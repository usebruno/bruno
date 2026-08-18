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

  it('normalizes malformed cleanup configuration values', () => {
    const yml = `
opencollection: 1.0.0
info:
  name: My API
extensions:
  bruno:
    onExit:
      enabled: "true"
      showReminder: "false"
      reminderMessage:
        invalid: value
      requestPaths:
        - cleanup/valid-request.bru
        - 42
        - true
        - cleanup/another-request.bru
`;

    const { brunoConfig } = parseCollection(yml);

    expect(brunoConfig.onExit).toEqual({
      enabled: false,
      showReminder: true,
      reminderMessage: '',
      requestPaths: ['cleanup/valid-request.bru', 'cleanup/another-request.bru']
    });
  });
});
