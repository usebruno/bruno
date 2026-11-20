import { describeImportText } from './utils';

describe('describeImportText', () => {
  it.each([
    ['https://a.dev/spec.yaml', 'YAML from a URL · a Bruno collection is unpacked, an OpenAPI spec is converted'],
    ['https://a.dev/spec.yml?x=1', 'YAML from a URL · a Bruno collection is unpacked, an OpenAPI spec is converted'],
    ['https://a.dev/spec.json', 'JSON from a URL · Bruno detects Postman, Insomnia or OpenAPI'],
    ['https://a.dev/spec', 'URL · Bruno fetches it and detects the format'],
    ['{ "a": 1 }', 'Raw text · Bruno detects the format']
  ])('describes %s', (text, description) => {
    expect(describeImportText(text)).toEqual({ text: description });
  });

  it('warns that a ZIP URL is not supported', () => {
    expect(describeImportText('https://a.dev/a.zip')).toEqual({
      isWarning: true,
      text: 'Bruno collection (.zip) from a URL · not supported yet. Download it and drop it here.'
    });
  });
});
