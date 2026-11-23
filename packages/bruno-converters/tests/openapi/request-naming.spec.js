import { describe, it, expect } from '@jest/globals';
import { sanitizeName } from '@usebruno/common/utils';
import openApiToBruno from '../../src/openapi/openapi-to-bruno';

const buildOpenApiSpec = (paths) => ({
  openapi: '3.0.0',
  info: { title: 'Petstore' },
  servers: [{ url: 'https://api.example.com' }],
  paths
});

const buildSwaggerSpec = (paths) => ({
  swagger: '2.0',
  info: { title: 'Petstore' },
  host: 'api.example.com',
  basePath: '/v2',
  schemes: ['https'],
  paths
});

const utf8Length = (text) => new TextEncoder().encode(text).length;

describe.each([
  ['OpenAPI 3', buildOpenApiSpec],
  ['Swagger 2', buildSwaggerSpec]
])('%s request names', (_label, buildSpec) => {
  const namesOf = (paths, options) => openApiToBruno(buildSpec(paths), options).items.map((item) => item.name);
  const nameOf = (operation, options) => namesOf({ '/pet/{petId}': { get: { responses: {}, ...operation } } }, options)[0];

  const petOperation = {
    summary: 'Find pet by ID',
    operationId: 'getPetById',
    description: 'Returns a single pet. Requires an API key.'
  };

  describe('the selected field', () => {
    it.each([
      ['summary', 'Find pet by ID'],
      ['operationId', 'getPetById'],
      ['description', 'Returns a single pet'],
      ['path', '/pet/{petId}']
    ])('names the request from %s', (requestNameSource, name) => {
      expect(nameOf(petOperation, { requestNameSource })).toBe(name);
    });

    it.each([undefined, '', 'Summary', 'operationid', 'title', 42, null])('uses the summary when the setting is %p', (requestNameSource) => {
      expect(nameOf(petOperation, { requestNameSource })).toBe('Find pet by ID');
    });
  });

  describe('the fallback order', () => {
    it.each([
      ['summary', { operationId: 'getPetById', description: 'Returns a single pet.' }, 'getPetById'],
      ['summary', { description: 'Returns a single pet.' }, 'Returns a single pet'],
      ['summary', {}, '/pet/{petId}'],
      ['operationId', { summary: 'Find pet by ID', description: 'Returns a single pet.' }, 'Find pet by ID'],
      ['operationId', { description: 'Returns a single pet.' }, 'Returns a single pet'],
      ['operationId', {}, '/pet/{petId}'],
      ['description', { summary: 'Find pet by ID', operationId: 'getPetById' }, 'Find pet by ID'],
      ['description', { operationId: 'getPetById' }, 'getPetById'],
      ['description', {}, '/pet/{petId}']
    ])('with %s selected and only %j, falls back to %s', (requestNameSource, operation, name) => {
      expect(nameOf(operation, { requestNameSource })).toBe(name);
    });

    it('gives a request that falls back to its path a file named after its method and path', () => {
      const [item] = openApiToBruno(buildSpec({ '/pet/{petId}': { get: { responses: {} } } })).items;

      expect(item.name).toBe('/pet/{petId}');
      expect(item.filename).toBe('GET /pet/{petId}.bru');
    });

    it('leaves the file name to the request name when a field names the request', () => {
      const [item] = openApiToBruno(buildSpec({ '/pet/{petId}': { get: { summary: 'Find pet by ID', responses: {} } } })).items;

      expect(item).not.toHaveProperty('filename');
    });

    it('falls back when the selected field is left empty by the cleanup', () => {
      expect(nameOf({ summary: ' ... ', operationId: 'getPetById' })).toBe('getPetById');
      expect(nameOf({ summary: '---\n', operationId: 'getPetById' })).toBe('getPetById');
      expect(nameOf({ description: '```json\n{"id": 1}\n```', summary: 'Find pet by ID' }, { requestNameSource: 'description' })).toBe('Find pet by ID');
      expect(nameOf({ description: '---\n\n', operationId: 'getPetById' }, { requestNameSource: 'description' })).toBe('getPetById');
    });

    it('skips a field that is not text', () => {
      expect(nameOf({ summary: { en: 'Find pet' }, operationId: 'getPetById' })).toBe('getPetById');
      expect(nameOf({ operationId: ['getPetById'], description: 'Returns a single pet.' }, { requestNameSource: 'operationId' })).toBe('Returns a single pet');
    });

    it('uses a numeric operationId as written', () => {
      expect(nameOf({ operationId: 1234 }, { requestNameSource: 'operationId' })).toBe('1234');
    });
  });

  describe('with Summary selected', () => {
    it.each([
      'Add a new pet to the store',
      'Update an existing pet.',
      'Finds Pets by status',
      'Get user\'s orders (v2)',
      'Delete pet #42',
      'Search: by name & tag',
      'List items 1-10, sorted',
      'Multiply 2 * 3',
      'get_user_by_id',
      'Returns 50% of the total',
      'Is the pet available?',
      'Größe ändern',
      '获取宠物。',
      'List orders by filter[status][eq]',
      'Returns the pet [deprecated](use v2 instead)',
      'Call the function with *args and **kwargs',
      'Upload files matching **/*.json',
      'Returns the API key masked as ********',
      'Compute x**2 + y**2',
      'Resize to 1920*1080*3',
      'Convert Either<A, B> to Result',
      'Wrap the body in <s:Envelope>',
      'Returns List<Pet>',
      'Compute <p-value>',
      '1. Create user',
      'Use ``a`',
      'Returns */* content',
      'Delete *.* files',
      '*.*',
      '[Beta]: listPets',
      '===',
      `Star ${String.fromCodePoint(0xE02A)} rating`,
      '# of items in cart',
      'Get __init__ data',
      'Returns the `User` object',
      '- Create user',
      '**Find** `pet` by [ID](https://example.com/docs/(id))'
    ])('names the short single-line summary %p as written', (summary) => {
      const nameAsWritten = summary.replace(/[\r\n\s]+/g, ' ').trim().replace(/[.\s]+$/, '');
      expect(nameOf({ summary })).toBe(nameAsWritten);
    });

    it('joins a short multi-line summary into one line', () => {
      expect(nameOf({ summary: 'Get users\n\nwith newline' })).toBe('Get users with newline');
    });

    it('strips markdown from a multi-line summary', () => {
      expect(nameOf({ summary: '**Find** `pet`\nby [ID](https://example.com)' })).toBe('Find pet by ID');
    });

    it('names a long summary after its first sentence', () => {
      const summary = 'Enrolls a member into the Loyalty Program.\r\nThis will create a new member in the system and send an activation link via SMS to the member.\r\nIf the member already exists, a new activation link will be sent.';
      expect(nameOf({ summary })).toBe('Enrolls a member into the Loyalty Program');
    });

    it('cuts a long summary without a sentence break at a word boundary', () => {
      const summary = `Lists ${'every pet and owner '.repeat(10)}in the store`;
      const name = nameOf({ summary });

      expect(name.length).toBeLessThanOrEqual(100);
      expect(summary.startsWith(name)).toBe(true);
      expect(summary[name.length]).toBe(' ');
    });
  });

  describe('the cleanup', () => {
    it('strips markdown from a name taken from the description', () => {
      const descriptionNameOf = (description) => nameOf({ description }, { requestNameSource: 'description' });

      expect(descriptionNameOf('**Find** `pet` by [ID](https://example.com/docs/(id))')).toBe('Find pet by ID');
      expect(descriptionNameOf('## Find _pet_ by ~~the~~ ID')).toBe('Find pet by the ID');
      expect(descriptionNameOf('> Find <b>pet</b> by ![ID](id.png)')).toBe('Find pet by ID');
      expect(descriptionNameOf('- Find pets &amp; owners &#x2014; fast')).toBe('Find pets & owners \u2014 fast');
      expect(descriptionNameOf('Returns the user&rsquo;s profile')).toBe(`Returns the user${String.fromCodePoint(0x2019)}s profile`);
      expect(descriptionNameOf('Calls <tt>getPet</tt> fast')).toBe('Calls getPet fast');
      expect(descriptionNameOf('Contact <foo@bar.com>')).toBe('Contact foo@bar.com');
      expect(descriptionNameOf('See [a [b] c](https://x) now')).toBe('See a [b] c now');
      expect(descriptionNameOf('```json``` example')).toBe('json example');
    });

    it('keeps escaped and code characters as written', () => {
      const descriptionNameOf = (description) => nameOf({ description }, { requestNameSource: 'description' });

      expect(descriptionNameOf('Find \\*all\\* pets')).toBe('Find *all* pets');
      expect(descriptionNameOf('Call `**kwargs` &amp; more')).toBe('Call **kwargs & more');
      expect(descriptionNameOf('Escape quotes with `\\`')).toBe('Escape quotes with \\');
      expect(descriptionNameOf('Validate with `^\\w+\\.json$`')).toBe('Validate with ^\\w+\\.json$');
    });

    it('never uses a whole description', () => {
      expect(nameOf({ description: 'Returns a single pet. Requires an API key.\n\nThe pet must exist.' }, { requestNameSource: 'description' })).toBe('Returns a single pet');
      expect(nameOf({ description: 'Returns a single pet\nfrom the store. More details follow.' }, { requestNameSource: 'description' })).toBe('Returns a single pet');
      expect(nameOf({ description: '# Pet lookup\n\nReturns a single pet.' }, { requestNameSource: 'description' })).toBe('Pet lookup');
      expect(nameOf({ description: '```\nGET /pet/1\n```\n\nReturns a single **pet**. Done.' }, { requestNameSource: 'description' })).toBe('Returns a single pet');
    });

    it.each([
      ['a line break tag', 'Returns a pet.<br>Requires an API key.'],
      ['HTML paragraphs', '<p>Returns a pet.</p><p>Requires an API key.</p>'],
      ['a leading table', '| Name | Value |\n|---|---|\n| a | b |\n\nReturns a pet.'],
      ['a code block whose last line looks like a fence with an info string', '```\ncode\n```js\nhidden?\n```\nReturns a pet.'],
      ['an inline code span made of three backticks', '```Returns``` a pet. Then stops.'],
      ['an HTML pre block', '<pre>\ncurl -X GET /pets\n</pre>\n\nReturns a pet.'],
      ['an HTML table', '<table><tr><th>Name</th><th>Value</th></tr></table>\n\nReturns a pet.'],
      ['an HTML style block', '<style>p { color: red }</style>\n\nReturns a pet.'],
      ['an HTML section', '<section>Returns a pet.</section>'],
      ['a numbered item that holds only code', '1. ```\n   curl -X GET /pets\n   ```\n\nReturns a pet.']
    ])('takes the first line of a description that starts with %s', (_, description) => {
      expect(nameOf({ description }, { requestNameSource: 'description' })).toBe('Returns a pet');
    });

    it('names a description that opens with an image after its alt text', () => {
      const description = `![Sequence diagram](data:image/png;base64,${'iVBORw0KGgo'.repeat(2000)})\n\nReturns a pet.`;
      expect(nameOf({ description }, { requestNameSource: 'description' })).toBe('Sequence diagram');
      expect(nameOf({ description: '<ul><li>Cats</li><li>Dogs</li></ul>' }, { requestNameSource: 'description' })).toBe('Cats');
    });

    it('does not end a sentence at a common abbreviation or a list number', () => {
      expect(nameOf({ description: 'Returns pets, e.g. dogs and cats. Paginated.' }, { requestNameSource: 'description' })).toBe('Returns pets, e.g. dogs and cats');
      expect(nameOf({ description: 'Returns the settings (e.g. theme, language). Requires auth.' }, { requestNameSource: 'description' })).toBe('Returns the settings (e.g. theme, language)');
      expect(nameOf({ description: 'Returns 304 when unchanged (cf. RFC 7232). Supports ETags.' }, { requestNameSource: 'description' })).toBe('Returns 304 when unchanged (cf. RFC 7232)');
      expect(nameOf({ description: '1. Returns a pet. Then stops.' }, { requestNameSource: 'description' })).toBe('1. Returns a pet');
    });

    it('ends a sentence at Chinese and Japanese sentence punctuation', () => {
      expect(nameOf({ description: '根据ID获取宠物。需要API密钥。' }, { requestNameSource: 'description' })).toBe('根据ID获取宠物');
      expect(nameOf({ description: 'ペットを取得します。APIキーが必要です。' }, { requestNameSource: 'description' })).toBe('ペットを取得します');
      expect(nameOf({ summary: `根据ID获取宠物。${'返回宠物的详细信息。'.repeat(12)}` })).toBe('根据ID获取宠物');
    });

    it('caps a long description sentence', () => {
      const name = nameOf({ description: `Returns ${'a very long pet description '.repeat(10)}` }, { requestNameSource: 'description' });
      expect(name.length).toBeLessThanOrEqual(100);
      expect(name.startsWith('Returns a very long pet description')).toBe(true);
    });

    it('keeps an operationId as written', () => {
      expect(nameOf({ operationId: '_list_pets_' }, { requestNameSource: 'operationId' })).toBe('_list_pets_');
      expect(nameOf({ operationId: '__init__' }, { requestNameSource: 'operationId' })).toBe('__init__');
    });

    it('caps names by UTF-8 bytes so filenames stay within limits', () => {
      const name = nameOf({ summary: '宠物'.repeat(60) });

      expect(utf8Length(name)).toBeLessThanOrEqual(200);
      expect(Array.from(name).length).toBe(66);
    });

    it('never splits a character made of two UTF-16 units', () => {
      const name = nameOf({ summary: '🐶'.repeat(80) });

      expect(name).toBe('🐶'.repeat(50));
    });

    it('never splits a character made of several code points', () => {
      const accented = String.fromCodePoint(0x65, 0x301);
      const flag = String.fromCodePoint(0x1F1FA, 0x1F1F8);

      expect(nameOf({ summary: `x${accented.repeat(60)}` })).toBe(`x${accented.repeat(49)}`);
      expect(nameOf({ summary: `a${flag.repeat(30)}` })).toBe(`a${flag.repeat(24)}`);
    });

    it('names an operation with a huge description of unclosed markdown without slowing down', () => {
      const name = nameOf({ description: '*a '.repeat(300000) }, { requestNameSource: 'description' });

      expect(name.length).toBeLessThanOrEqual(100);
    });

    it('names operations whose summaries nest emphasis deeply without slowing down', () => {
      const paths = Object.fromEntries(Array.from({ length: 50 }, (_, index) => [
        `/pets/${index}`,
        { get: { summary: `${'*'.repeat(2500)}pets${'*'.repeat(2500)}`, responses: {} } }
      ]));

      expect(namesOf(paths)).toHaveLength(50);
    });

    it('names operations whose descriptions hold long runs of punctuation without slowing down', () => {
      const paths = Object.fromEntries(Array.from({ length: 50 }, (_, index) => [
        `/pets/${index}`,
        { get: { description: `Returns pets${'.'.repeat(9000)}x`, responses: {} } }
      ]));

      expect(namesOf(paths, { requestNameSource: 'description' })).toHaveLength(50);
    });

    it('names an operation with a huge operationId or path without slowing down', () => {
      expect(nameOf({ operationId: `a${'.'.repeat(100000)}x` }, { requestNameSource: 'operationId' }).length).toBeLessThanOrEqual(100);
      expect(namesOf({ [`/a${'.'.repeat(100000)}x`]: { get: { responses: {} } } }, { requestNameSource: 'path' })[0].length).toBeLessThanOrEqual(100);
    });

    it('caps a long path', () => {
      const longPath = `/${'segment/'.repeat(15)}{id}`;
      const [name] = namesOf({ [longPath]: { get: { responses: {} } } }, { requestNameSource: 'path' });

      expect(name.length).toBeLessThanOrEqual(100);
      expect(longPath.startsWith(name)).toBe(true);
    });
  });

  describe('uniqueness', () => {
    it('keeps names that the cleanup made equal and gives the second its own file', () => {
      const { items } = openApiToBruno(buildSpec({
        '/pets': {
          get: { summary: `Lists pets. ${'Filtered by status. '.repeat(8)}`, responses: {} },
          post: { summary: `Lists pets. ${'Sorted by name. '.repeat(8)}`, responses: {} }
        }
      }));

      expect(items.map((item) => item.name)).toEqual(['Lists pets', 'Lists pets']);
      expect(items.map((item) => item.filename)).toEqual([undefined, 'Lists pets (POST).bru']);
    });

    it.each(['summary', 'operationId', 'description'])('shows a duplicate %s as written and adds the method, then a number, only to its file name', (requestNameSource) => {
      const operation = { summary: 'Pets', operationId: 'Pets', description: 'Pets', responses: {} };
      const { items } = openApiToBruno(buildSpec({
        '/pets': { get: operation, post: operation },
        '/animals': { get: operation },
        '/beasts': { get: operation }
      }), { requestNameSource });

      expect(items.map((item) => item.name)).toEqual(['Pets', 'Pets', 'Pets', 'Pets']);
      expect(items.map((item) => item.filename)).toEqual([undefined, 'Pets (POST).bru', 'Pets (GET).bru', 'Pets (1).bru']);
    });

    it('keeps names that differ only by case or by characters a file name cannot hold, with a file each', () => {
      const { items } = openApiToBruno(buildSpec({
        '/pets': { get: { summary: 'List Pets', responses: {} } },
        '/animals': { get: { summary: 'list pets', responses: {} } },
        '/a': { get: { summary: 'a/b', responses: {} } },
        '/b': { get: { summary: 'a:b', responses: {} } }
      }));
      const files = items.map((item) => sanitizeName(item.filename || `${item.name}.bru`).toLowerCase());

      expect(items.map((item) => item.name)).toEqual(['List Pets', 'list pets', 'a/b', 'a:b']);
      expect(new Set(files).size).toBe(4);
    });

    it('falls back to the next field, then the path, when a name has nothing a file name can hold', () => {
      const { items } = openApiToBruno(buildSpec({
        '/pets': {
          get: { summary: '???', operationId: 'listPets', responses: {} },
          post: { summary: '<*>', operationId: '/:', responses: {} }
        }
      }));

      expect(items.map((item) => item.name)).toEqual(['listPets', '/pets']);
      expect(items.map((item) => item.filename)).toEqual([undefined, 'POST /pets.bru']);
    });

    it('shows the same name when a fallback field matches a name already used, with its own file', () => {
      const { items } = openApiToBruno(buildSpec({
        '/pets': {
          get: { summary: 'Pets', responses: {} },
          post: { operationId: 'Pets', responses: {} },
          put: { description: 'Pets.', responses: {} }
        }
      }));

      expect(items.map((item) => item.name)).toEqual(['Pets', 'Pets', 'Pets']);
      expect(items.map((item) => item.filename)).toEqual([undefined, 'Pets (POST).bru', 'Pets (PUT).bru']);
    });

    it('names every operation on a shared path after the path and gives each method its own file', () => {
      const { items } = openApiToBruno(buildSpec({
        '/pet/{petId}': {
          get: { summary: 'Find pet', responses: {} },
          post: { summary: 'Update pet', responses: {} },
          delete: { summary: 'Delete pet', responses: {} }
        }
      }), { requestNameSource: 'path' });

      expect(items.map((item) => item.name)).toEqual(['/pet/{petId}', '/pet/{petId}', '/pet/{petId}']);
      expect(items.map((item) => item.filename)).toEqual(['GET /pet/{petId}.bru', 'POST /pet/{petId}.bru', 'DELETE /pet/{petId}.bru']);
    });

    it('keeps a trailing slash in the path name and its file name', () => {
      const { items } = openApiToBruno(buildSpec({
        '/pets': { get: { summary: 'Lists pets', responses: {} } },
        '/pets/': { get: { summary: 'Lists pets', responses: {} } }
      }), { requestNameSource: 'path' });

      expect(items.map((item) => item.name)).toEqual(['/pets', '/pets/']);
      expect(items.map((item) => item.filename)).toEqual(['GET /pets.bru', 'GET /pets/.bru']);
    });

    it('gives each request its own file when paths become the same file once sanitized or compared without case', () => {
      const { items } = openApiToBruno(buildSpec({
        '/a/b': { get: { summary: 'Nested', responses: {} } },
        '/a-b': { get: { summary: 'Dashed', responses: {} } },
        '/Users': { get: { summary: 'Upper users', responses: {} } },
        '/users': { get: { summary: 'Lower users', responses: {} } }
      }), { requestNameSource: 'path' });
      const files = items.map((item) => item.filename);

      expect(items.map((item) => item.name)).toEqual(['/a/b', '/a-b', '/Users', '/users']);
      expect(files).toEqual(['GET /a/b.bru', 'GET /a-b (GET).bru', 'GET /Users.bru', 'GET /users (GET).bru']);
      expect(new Set(files.map((file) => sanitizeName(file).toLowerCase())).size).toBe(4);
    });

    it('keeps files unique when a summary reads like another request\'s method and path', () => {
      const { items } = openApiToBruno(buildSpec({
        '/pets': {
          get: { responses: {} },
          post: { summary: 'GET /pets', responses: {} }
        }
      }));
      const files = items.map((item) => sanitizeName(item.filename || `${item.name}.bru`).toLowerCase());

      expect(items.find((item) => item.request.method === 'GET').name).toBe('/pets');
      expect(items.find((item) => item.request.method === 'POST').name).toBe('GET /pets');
      expect(new Set(files).size).toBe(2);
    });

    it('names the root path after the path and still gives it a file name', () => {
      const [item] = openApiToBruno(buildSpec({ '/': { get: { responses: {} } } }), { requestNameSource: 'path' }).items;

      expect(item.name).toBe('/');
      expect(sanitizeName(item.filename)).toBe('GET -.bru');
    });

    it.each(['', '...'])('names a request after its method when the path %p leaves no name', (emptyPath) => {
      const [item] = openApiToBruno(buildSpec({ [emptyPath]: { get: { responses: {} } } }), { requestNameSource: 'path' }).items;

      expect(item.name).toBe('GET');
      expect(item.filename || `${item.name}.bru`).toBe('GET.bru');
    });
  });

  it('applies the setting under path grouping too', () => {
    const collection = openApiToBruno(buildSpec({ '/pets/{id}': { get: { summary: 'Find pet', operationId: 'getPet', responses: {} } } }), {
      groupBy: 'path',
      requestNameSource: 'operationId'
    });

    expect(collection.items[0].items[0].items[0].name).toBe('getPet');
  });
});
