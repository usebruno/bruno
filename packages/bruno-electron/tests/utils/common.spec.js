const { flattenDataForDotNotation, parseDataFromRequest, parseDataFromResponse } = require('../../src/utils/common');
const FormData = require('form-data');

describe('utils: flattenDataForDotNotation', () => {
  test('Flatten a simple object with dot notation', () => {
    const input = {
      person: {
        name: 'John',
        age: 30
      }
    };

    const expectedOutput = {
      'person.name': 'John',
      'person.age': 30
    };

    expect(flattenDataForDotNotation(input)).toEqual(expectedOutput);
  });

  test('Flatten an object with nested arrays', () => {
    const input = {
      users: [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 28 }
      ]
    };

    const expectedOutput = {
      'users[0].name': 'Alice',
      'users[0].age': 25,
      'users[1].name': 'Bob',
      'users[1].age': 28
    };

    expect(flattenDataForDotNotation(input)).toEqual(expectedOutput);
  });

  test('Flatten an empty object', () => {
    const input = {};

    const expectedOutput = {};

    expect(flattenDataForDotNotation(input)).toEqual(expectedOutput);
  });

  test('Flatten an object with nested objects', () => {
    const input = {
      person: {
        name: 'Alice',
        address: {
          city: 'New York',
          zipcode: '10001'
        }
      }
    };

    const expectedOutput = {
      'person.name': 'Alice',
      'person.address.city': 'New York',
      'person.address.zipcode': '10001'
    };

    expect(flattenDataForDotNotation(input)).toEqual(expectedOutput);
  });

  test('Flatten an object with arrays of objects', () => {
    const input = {
      teams: [
        { name: 'Team A', members: ['Alice', 'Bob'] },
        { name: 'Team B', members: ['Charlie', 'David'] }
      ]
    };

    const expectedOutput = {
      'teams[0].name': 'Team A',
      'teams[0].members[0]': 'Alice',
      'teams[0].members[1]': 'Bob',
      'teams[1].name': 'Team B',
      'teams[1].members[0]': 'Charlie',
      'teams[1].members[1]': 'David'
    };

    expect(flattenDataForDotNotation(input)).toEqual(expectedOutput);
  });
});

describe('utils: parseDataFromRequest', () => {
  test('should format multipart FormData', () => {
    const formData = new FormData();
    formData._boundary = 'boundary123';
    const request = {
      data: formData,
      _originalMultipartData: [
        { name: 'description', type: 'text', value: 'dfv' },
        { name: 'file', type: 'file', value: ['Dumy.xml'] }
      ],
      headers: {}
    };

    const result = parseDataFromRequest(request);
    expect(result.data).toContain('name: description');
    expect(result.data).toContain('value: dfv');
    expect(result.data).toContain('value: [File: Dumy.xml]');
  });
});

describe('parseDataFromResponse', () => {
  test.each([
    'text/plain; charset=iso-8859-1',
    'text/plain; charset="iso-8859-1"',
    'text/plain; Charset="ISO-8859-1"; format=flowed'
  ])('decodes Latin-1 with %s and preserves the raw bytes', (contentType) => {
    const bytes = Buffer.from([0x63, 0x61, 0x66, 0xe9]);
    const result = parseDataFromResponse({ headers: { 'content-type': contentType }, data: bytes });

    expect(result.data).toBe('café');
    expect(result.dataBuffer).toEqual(bytes);
  });

  test.each([
    undefined,
    'text/plain',
    'text/plain; charset=unknown-encoding',
    'text/plain; charset="unknown-encoding"',
    'text/plain; charset=""',
    'text/plain; charset="utf-8"'
  ])('preserves UTF-8 decoding with %s', (contentType) => {
    const result = parseDataFromResponse({
      headers: { 'content-type': contentType },
      data: Buffer.from('café')
    });

    expect(result.data).toBe('café');
  });

  test.each([false, true])('preserves JSON parsing behavior when disabled=%s', (disableParsingResponseJson) => {
    const body = '{"name":"café"}';
    const result = parseDataFromResponse({
      headers: { 'content-type': 'text/plain; charset="iso-8859-1"' },
      data: Buffer.from(body, 'latin1')
    }, disableParsingResponseJson);

    expect(result.data).toEqual(disableParsingResponseJson ? body : { name: 'café' });
  });
});
