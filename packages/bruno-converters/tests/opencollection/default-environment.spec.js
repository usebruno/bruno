import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

const makeBrunoCollection = (presets) => ({
  name: 'My API',
  brunoConfig: { name: 'My API', type: 'collection', ignore: [], presets },
  items: [],
  environments: [],
  root: {}
});

describe('opencollection <-> bruno — presets.defaultEnvironment', () => {
  it('maps brunoConfig.presets.defaultEnvironment to extensions.bruno.presets.defaultEnvironment', () => {
    const oc = brunoToOpenCollection(
      makeBrunoCollection({ requestType: 'http', requestUrl: 'https://example.com', defaultEnvironment: 'prod' })
    );

    expect(oc.extensions.bruno.presets.defaultEnvironment).toBe('prod');
  });

  it('reads defaultEnvironment back from opencollection into brunoConfig.presets', () => {
    const bruno = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'My API' },
      items: [],
      extensions: { bruno: { presets: { defaultEnvironment: 'staging' } } }
    });

    expect(bruno.brunoConfig.presets.defaultEnvironment).toBe('staging');
  });

  it('round-trips defaultEnvironment through bruno -> opencollection -> bruno', () => {
    const oc = brunoToOpenCollection(makeBrunoCollection({ defaultEnvironment: 'prod' }));
    const back = openCollectionToBruno(oc);

    expect(back.brunoConfig.presets.defaultEnvironment).toBe('prod');
  });

  it('does not add a presets block when defaultEnvironment is absent', () => {
    const oc = brunoToOpenCollection(makeBrunoCollection(undefined));

    expect(oc.extensions?.bruno?.presets).toBeUndefined();
  });
});
