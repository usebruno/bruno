import { isMultiline, quote, withoutQueryString, toEntries, namedEntries, objectEntries, fileBodyParam, fileNameFromPath, jsonBodyText, prettyJsonBodyText, assignStringBody, formFieldEntries, hasDuplicateKeys, formUrlEncodedText } from '../bsl';

describe('1C BSL string helpers', () => {
  test('quote splits CR, LF and CRLF into 1C continuation lines', () => {
    expect(quote('line1\nline2')).toBe('"line1\n|line2"');
    expect(quote('line1\rline2')).toBe('"line1\n|line2"');
    expect(quote('line1\r\nline2')).toBe('"line1\n|line2"');
  });

  test('isMultiline treats CR-only text as multiline', () => {
    expect(isMultiline('line1\rline2')).toBe(true);
    expect(isMultiline('single')).toBe(false);
  });

  test('quote escapes quotes inside a single line', () => {
    expect(quote('say "hello"')).toBe('"say ""hello"""');
  });

  test('withoutQueryString keeps the fragment', () => {
    expect(withoutQueryString('https://example.com/path?q=1#frag')).toBe('https://example.com/path#frag');
    expect(withoutQueryString('https://example.com/path')).toBe('https://example.com/path');
  });

  test('fileNameFromPath keeps only the last path segment', () => {
    expect(fileNameFromPath('/home/aleksandr/amdgpu-install_6.3.60300-1_all.deb')).toBe(
      'amdgpu-install_6.3.60300-1_all.deb'
    );
    expect(fileNameFromPath('C:\\docs\\a.pdf')).toBe('a.pdf');
    expect(fileNameFromPath('doc.pdf')).toBe('doc.pdf');
  });

  test('fileBodyParam reads a non-multipart HAR file body', () => {
    expect(fileBodyParam({
      mimeType: 'image/png',
      text: '/tmp/a.png',
      params: [{ name: 'upload', fileName: '/tmp/a.png', contentType: 'image/png' }]
    })).toEqual({
      path: '/tmp/a.png',
      contentType: 'image/png'
    });
    expect(fileBodyParam({ mimeType: 'multipart/form-data', params: [{ fileName: 'a' }] })).toBeNull();
  });

  test('formFieldEntries prefers the params array so duplicate names survive', () => {
    expect(formFieldEntries({
      paramsObj: { tag: '3' },
      params: [
        { name: 'tag', value: '1' },
        { name: 'tag', value: '2' },
        { name: 'tag', value: '3' }
      ]
    })).toEqual([
      ['tag', '1'],
      ['tag', '2'],
      ['tag', '3']
    ]);
    expect(formFieldEntries({ paramsObj: { title: 'bruno' } })).toEqual([['title', 'bruno']]);
    expect(hasDuplicateKeys([['tag', '1'], ['tag', '2']])).toBe(true);
    expect(hasDuplicateKeys([['tag', '1'], ['other', '2']])).toBe(false);
    expect(formUrlEncodedText({ text: 'tag=1&tag=2', paramsObj: { tag: '2' } })).toBe('tag=1&tag=2');
  });

  test('jsonBodyText prefers HAR text and stringifies jsonObj as fallback', () => {
    expect(jsonBodyText({ text: '{"title":"bruno"}', jsonObj: { title: 'other' } })).toBe('{"title":"bruno"}');
    expect(jsonBodyText({ jsonObj: { user: { id: 1 }, tags: ['a', 'b'] } })).toBe(
      '{"user":{"id":1},"tags":["a","b"]}'
    );
    expect(jsonBodyText({})).toBeUndefined();
  });

  test('prettyJsonBodyText formats objects as a tab-indented multiline literal', () => {
    expect(prettyJsonBodyText({ jsonObj: { user: { id: 1 }, tags: ['a', 'b'] } })).toBe(
      '{\n\t"user": {\n\t\t"id": 1\n\t},\n\t"tags": [\n\t\t"a",\n\t\t"b"\n\t]\n}'
    );
    expect(assignStringBody(prettyJsonBodyText({ text: '{"title":"bruno"}' }), 'ru')).toEqual([
      'ДанныеСтрокой = "{\n|\t""title"": ""bruno""\n|}";'
    ]);
  });

  test('toEntries normalizes objects and named arrays', () => {
    expect(objectEntries({ a: 1 })).toEqual([['a', 1]]);
    expect(namedEntries([{ name: 'a', value: 1 }])).toEqual([['a', 1]]);
    expect(toEntries([{ name: 'a' }])).toEqual([['a', '']]);
  });
});
