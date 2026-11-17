const { describe, it, expect } = require('@jest/globals');
const { openApiToBruno } = require('@usebruno/converters');
const { _test: { specConversionOptions } } = require('../../src/ipc/openapi-sync');

const spec = {
  openapi: '3.0.3',
  info: { title: 'Pets', version: '1.0' },
  servers: [{ url: 'https://example.com' }],
  paths: {
    '/pets/{petId}': {
      get: { summary: 'Find pet by ID', operationId: 'getPetById', description: 'Returns a single pet.', responses: { 200: { description: 'OK' } } }
    }
  }
};

const syncedNameWith = (syncConfig) => openApiToBruno(spec, specConversionOptions({ openapi: [{ sourceUrl: '../openapi.yaml', ...syncConfig }] })).items[0].name;

describe('syncing with the saved request naming', () => {
  it.each([
    ['summary', 'Find pet by ID'],
    ['operationId', 'getPetById'],
    ['description', 'Returns a single pet'],
    ['path', 'GET /pets/{petId}']
  ])('names synced requests from the saved %s choice', (requestNameSource, name) => {
    expect(specConversionOptions({ openapi: [{ sourceUrl: '../openapi.yaml', requestNameSource }] }).requestNameSource).toBe(requestNameSource);
    expect(syncedNameWith({ requestNameSource })).toBe(name);
  });

  it.each([undefined, 'title', 'OperationId', 7])('names synced requests from the summary when the saved choice is %p', (requestNameSource) => {
    expect(syncedNameWith({ requestNameSource })).toBe('Find pet by ID');
  });
});
