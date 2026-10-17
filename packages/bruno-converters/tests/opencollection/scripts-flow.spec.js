import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

describe('brunoToOpenCollection (export): scripts.flow', () => {
  it('writes flow: sequential under extensions.bruno.scripts', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: { scripts: { flow: 'sequential' } },
      items: []
    });
    expect(oc.extensions?.bruno?.scripts?.flow).toBe('sequential');
  });

  it('writes flow: sandwich under extensions.bruno.scripts', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: { scripts: { flow: 'sandwich' } },
      items: []
    });
    expect(oc.extensions?.bruno?.scripts?.flow).toBe('sandwich');
  });

  it('writes nothing when the collection has no flow', () => {
    const oc = brunoToOpenCollection({ name: 'API', brunoConfig: {}, items: [] });
    expect(oc.extensions?.bruno?.scripts).toBeUndefined();
  });

  it('drops an unrecognized flow value', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: { scripts: { flow: 'parallel' } },
      items: []
    });
    expect(oc.extensions?.bruno?.scripts).toBeUndefined();
  });
});

describe('openCollectionToBruno (import): scripts.flow', () => {
  it('reads flow: sequential from extensions.bruno.scripts', () => {
    const { brunoConfig } = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      extensions: { bruno: { scripts: { flow: 'sequential' } } }
    });
    expect(brunoConfig.scripts?.flow).toBe('sequential');
  });

  it('ignores an unrecognized flow value', () => {
    const { brunoConfig } = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      extensions: { bruno: { scripts: { flow: 'parallel' } } }
    });
    expect(brunoConfig.scripts).toBeUndefined();
  });
});

describe('scripts.flow: export then import keeps it the same', () => {
  it('preserves flow across a round trip', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: { scripts: { flow: 'sequential' } },
      items: []
    });
    const { brunoConfig } = openCollectionToBruno(oc);
    expect(brunoConfig.scripts?.flow).toBe('sequential');
  });
});
