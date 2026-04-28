import { mapCodeMirrorModeToMonaco } from './languageMapping';

describe('mapCodeMirrorModeToMonaco', () => {
  it('maps JavaScript modes', () => {
    expect(mapCodeMirrorModeToMonaco('application/javascript')).toBe('javascript');
    expect(mapCodeMirrorModeToMonaco('javascript')).toBe('javascript');
  });

  it('maps JSON modes', () => {
    expect(mapCodeMirrorModeToMonaco('application/ld+json')).toBe('json');
    expect(mapCodeMirrorModeToMonaco('application/json')).toBe('json');
  });

  it('maps XML modes', () => {
    expect(mapCodeMirrorModeToMonaco('application/xml')).toBe('xml');
    expect(mapCodeMirrorModeToMonaco('xml')).toBe('xml');
  });

  it('maps YAML modes', () => {
    expect(mapCodeMirrorModeToMonaco('application/yaml')).toBe('yaml');
    expect(mapCodeMirrorModeToMonaco('yaml')).toBe('yaml');
  });

  it('maps HTML modes', () => {
    expect(mapCodeMirrorModeToMonaco('application/html')).toBe('html');
    expect(mapCodeMirrorModeToMonaco('html')).toBe('html');
  });

  it('maps plaintext modes', () => {
    expect(mapCodeMirrorModeToMonaco('application/text')).toBe('plaintext');
    expect(mapCodeMirrorModeToMonaco('text/plain')).toBe('plaintext');
  });

  it('maps markdown mode', () => {
    expect(mapCodeMirrorModeToMonaco('markdown')).toBe('markdown');
  });

  it('maps shell mode', () => {
    expect(mapCodeMirrorModeToMonaco('shell')).toBe('shell');
  });

  it('falls back to plaintext for unsupported modes', () => {
    expect(mapCodeMirrorModeToMonaco('application/sparql-query')).toBe('plaintext');
    expect(mapCodeMirrorModeToMonaco('graphql')).toBe('plaintext');
    expect(mapCodeMirrorModeToMonaco('unknown-mode')).toBe('plaintext');
  });

  it('falls back to plaintext for null/undefined', () => {
    expect(mapCodeMirrorModeToMonaco(null)).toBe('plaintext');
    expect(mapCodeMirrorModeToMonaco(undefined)).toBe('plaintext');
  });
});
