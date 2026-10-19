import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';
import { getDefaultValueForSchema, buildEmptyJsonBody } from '../../../src/openapi/openapi-common';

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const buildSpec = ({ paths, schemas = {}, componentsFirst = true, openapi = '3.0.3' }) => {
  const head = { openapi, info: { title: 'Composition', version: '1.0.0' }, servers: [{ url: 'https://api.example.com' }] };
  const components = { schemas };
  return componentsFirst ? { ...head, components, paths } : { ...head, paths, components };
};

const postBody = (schema, mimeType = 'application/json') => ({
  '/target': { post: { summary: 'Target', requestBody: { content: { [mimeType]: { schema } } }, responses: { 200: { description: 'ok' } } } }
});

const getWithResponse = (schema) => ({
  '/target': { get: { summary: 'Target', responses: { 200: { description: 'ok', content: { 'application/json': { schema } } } } } }
});

const getWithParameters = (parameters) => ({
  '/target': { get: { summary: 'Target', parameters, responses: { 200: { description: 'ok' } } } }
});

const firstRequest = (spec) => openApiToBruno(spec).items[0];
const requestBody = (spec) => JSON.parse(firstRequest(spec).request.body.json);
const responseExample = (spec) => JSON.parse(firstRequest(spec).examples[0].response.body.content);
const queryParams = (spec) => firstRequest(spec).request.params.filter((p) => p.type === 'query').map((p) => [p.name, p.value]);

const petSchemas = {
  Pet: { type: 'object', required: ['pet_type'], properties: { pet_type: { type: 'string' } }, discriminator: { propertyName: 'pet_type' } },
  Cat: { allOf: [ref('Pet'), { type: 'object', properties: { hunts: { type: 'boolean' }, age: { type: 'integer' } } }] },
  Dog: { allOf: [ref('Pet'), { type: 'object', properties: { bark: { type: 'boolean' }, breed: { type: 'string', enum: ['Dingo', 'Husky'] } } }] }
};

const plainPets = {
  Cat: { type: 'object', properties: { petType: { type: 'string' }, meow: { type: 'string' } } },
  Dog: { type: 'object', properties: { petType: { type: 'string' }, bark: { type: 'string' } } }
};

describe('openapi schema composition', () => {
  describe('the Swagger documentation examples', () => {
    it.each([true, false])('labels the polymorphic body with the schema name when the discriminator has no mapping (components first: %s)', (componentsFirst) => {
      const schema = { oneOf: [ref('Cat'), ref('Dog')], discriminator: { propertyName: 'pet_type' } };
      expect(requestBody(buildSpec({ schemas: petSchemas, paths: postBody(schema), componentsFirst }))).toEqual({ pet_type: 'Cat', hunts: false, age: 0 });
    });

    it('keeps the required property of the first anyOf branch', () => {
      const schemas = {
        PetByAge: { type: 'object', required: ['age'], properties: { age: { type: 'integer' }, nickname: { type: 'string' } } },
        PetByType: { type: 'object', required: ['pet_type'], properties: { pet_type: { type: 'string', enum: ['Cat', 'Dog'] } } }
      };
      expect(requestBody(buildSpec({ schemas, paths: postBody({ anyOf: [ref('PetByAge'), ref('PetByType')] }) }))).toEqual({ age: 0, nickname: '' });
    });

    it('merges every model in an allOf, including required properties', () => {
      const schemas = {
        BasicErrorModel: { type: 'object', required: ['message', 'code'], properties: { message: { type: 'string' }, code: { type: 'integer' } } },
        ExtendedErrorModel: { allOf: [ref('BasicErrorModel'), { type: 'object', required: ['rootCause'], properties: { rootCause: { type: 'string' } } }] }
      };
      expect(requestBody(buildSpec({ schemas, paths: postBody(ref('ExtendedErrorModel')) }))).toEqual({ message: '', code: 0, rootCause: '' });
    });
  });

  describe('oneOf and anyOf', () => {
    it('generates the body from exactly one branch', () => {
      const schema = { oneOf: [ref('Cat'), ref('Dog')] };
      expect(requestBody(buildSpec({ schemas: plainPets, paths: postBody(schema) }))).toEqual({ petType: '', meow: '' });
    });

    it('generates the response example from the first anyOf branch', () => {
      const schema = { anyOf: [{ type: 'object', properties: { total: { type: 'integer' } } }, { type: 'object', properties: { cursor: { type: 'string' } } }] };
      expect(responseExample(buildSpec({ paths: getWithResponse(schema) }))).toEqual({ total: 0 });
    });

    it.each([
      ['a null type', { type: 'null' }],
      ['a null-only type list', { type: ['null'] }],
      ['a null const', { const: null }],
      ['a null-only enum', { enum: [null] }],
      ['an empty schema', {}],
      ['an unresolvable external reference', { $ref: 'other.yaml#/Thing' }]
    ])('skips a leading branch that is %s', (label, emptyBranch) => {
      const schema = { type: 'object', properties: { address: { anyOf: [emptyBranch, ref('Address')] } } };
      const schemas = { Address: { type: 'object', properties: { street: { type: 'string', example: 'Main St' } } } };
      expect(requestBody(buildSpec({ schemas, paths: postBody(schema), openapi: '3.1.0' }))).toEqual({ address: { street: 'Main St' } });
    });

    it('selects a branch that extends an external base', () => {
      const schema = {
        anyOf: [
          { allOf: [{ $ref: './common.yaml#/components/schemas/Base' }, { type: 'object', properties: { card: { type: 'string', example: 'visa' } } }] },
          { type: 'object', properties: { iban: { type: 'string', example: 'DE89' } } }
        ]
      };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ card: 'visa' });
    });

    it('satisfies both oneOf and anyOf when a schema declares both', () => {
      const schema = {
        oneOf: [{ type: 'object', properties: { fromOneOf: { type: 'string' } } }],
        anyOf: [{ type: 'object', properties: { fromAnyOf: { type: 'string' } } }]
      };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ fromOneOf: '', fromAnyOf: '' });
    });

    it('takes the value of a const alternative', () => {
      const schema = { type: 'object', properties: { level: { oneOf: [{ const: 1, title: 'Low' }, { const: 2, title: 'High' }] } } };
      expect(requestBody(buildSpec({ paths: postBody(schema), openapi: '3.1.0' }))).toEqual({ level: 1 });
    });
  });

  describe('discriminator', () => {
    const mapped = (mapping, alternatives = [ref('Cat'), ref('Dog')]) => ({ oneOf: alternatives, discriminator: { propertyName: 'petType', mapping } });

    it('follows a $ref mapping to a branch that has no title', () => {
      const schema = mapped({ dog: '#/components/schemas/Dog', cat: '#/components/schemas/Cat' });
      expect(requestBody(buildSpec({ schemas: plainPets, paths: postBody(schema) }))).toEqual({ petType: 'dog', bark: '' });
    });

    it('follows a mapping written with bare schema names', () => {
      expect(requestBody(buildSpec({ schemas: plainPets, paths: postBody(mapped({ dog: 'Dog' })) }))).toEqual({ petType: 'dog', bark: '' });
    });

    it('falls back to the component name for a branch the mapping does not list', () => {
      const schema = mapped({ fish: '#/components/schemas/Fish' });
      expect(requestBody(buildSpec({ schemas: plainPets, paths: postBody(schema) }))).toEqual({ petType: 'Cat', meow: '' });
    });

    it('labels the response example too', () => {
      const schema = mapped({ dog: '#/components/schemas/Dog' });
      expect(responseExample(buildSpec({ schemas: plainPets, paths: getWithResponse(schema) }))).toEqual({ petType: 'dog', bark: '' });
    });

    it('lands the value on a property the branch inherits through allOf', () => {
      const schema = { oneOf: [ref('Cat'), ref('Dog')], discriminator: { propertyName: 'pet_type', mapping: { dog: '#/components/schemas/Dog' } } };
      expect(requestBody(buildSpec({ schemas: petSchemas, paths: postBody(schema) }))).toEqual({ pet_type: 'dog', bark: false, breed: 'Dingo' });
    });

    it('does not mislabel a branch through an enum the branches share', () => {
      const schemas = {
        PetType: { type: 'string', enum: ['cat', 'dog'] },
        Cat: { type: 'object', properties: { petType: ref('PetType'), meow: { type: 'string' } } },
        Dog: { type: 'object', properties: { petType: ref('PetType'), bark: { type: 'string' } } }
      };
      const schema = mapped({ dog: '#/components/schemas/Dog', cat: '#/components/schemas/Cat' }, [ref('Cat'), ref('Dog')]);
      expect(requestBody(buildSpec({ schemas, paths: postBody(schema) }))).toEqual({ petType: 'dog', bark: '' });
    });

    it('overrides an example the property inherits from the base', () => {
      const schemas = {
        Pet: { type: 'object', properties: { petType: { type: 'string', example: 'dog' } } },
        Cat: { allOf: [ref('Pet'), { type: 'object', properties: { meow: { type: 'string' } } }] },
        Dog: { allOf: [ref('Pet'), { type: 'object', properties: { bark: { type: 'string' } } }] }
      };
      const schema = mapped({ cat: '#/components/schemas/Cat', dog: '#/components/schemas/Dog' });
      expect(requestBody(buildSpec({ schemas, paths: postBody(schema) }))).toEqual({ petType: 'cat', meow: '' });
    });

    it('keeps the type of a value the branch pins', () => {
      const schemas = {
        Cat: { type: 'object', properties: { kind: { type: 'integer', enum: [1] }, meow: { type: 'string' } } },
        Dog: { type: 'object', properties: { kind: { type: 'integer', enum: [2] }, bark: { type: 'string' } } }
      };
      const schema = { oneOf: [ref('Cat'), ref('Dog')], discriminator: { propertyName: 'kind', mapping: { 1: '#/components/schemas/Cat', 2: '#/components/schemas/Dog' } } };
      expect(requestBody(buildSpec({ schemas, paths: postBody(schema) }))).toEqual({ kind: 1, meow: '' });
    });

    it('stamps a discriminator property declared beside the oneOf', () => {
      const schema = { type: 'object', properties: { petType: { type: 'string' } }, ...mapped({ dog: '#/components/schemas/Dog' }) };
      const schemas = { Cat: { type: 'object', properties: { meow: { type: 'string' } } }, Dog: { type: 'object', properties: { bark: { type: 'string' } } } };
      expect(requestBody(buildSpec({ schemas, paths: postBody(schema) }))).toEqual({ petType: 'dog', bark: '' });
    });

    it('skips a mapping entry that points to an unresolvable external schema', () => {
      const schema = {
        oneOf: [{ $ref: 'sysObject.json#/sysObject' }, ref('Dog')],
        discriminator: { propertyName: 'petType', mapping: { system: 'sysObject.json#/sysObject', dog: '#/components/schemas/Dog' } }
      };
      expect(requestBody(buildSpec({ schemas: plainPets, paths: postBody(schema) }))).toEqual({ petType: 'dog', bark: '' });
    });

    it('does not add a discriminator property no schema declares', () => {
      const schemas = { Thing: { type: 'object', properties: { a: { type: 'string' } } } };
      const schema = { oneOf: [ref('Thing')], discriminator: { propertyName: 'kind' } };
      expect(requestBody(buildSpec({ schemas, paths: postBody(schema) }))).toEqual({ a: '' });
    });

    it('keeps the label the oneOf chose when a wrapper adds a description', () => {
      const schemas = {
        ...petSchemas,
        AnyPet: { oneOf: [ref('Cat'), ref('Dog')], discriminator: { propertyName: 'pet_type', mapping: { cat: '#/components/schemas/Cat', dog: '#/components/schemas/Dog' } } },
        Animal: { allOf: [ref('AnyPet')], description: 'An animal' }
      };
      expect(requestBody(buildSpec({ schemas, paths: postBody(ref('Animal')) }))).toEqual({ pet_type: 'cat', hunts: false, age: 0 });
    });

    it.each([null, 'text', { propertyName: 7 }, { propertyName: 'kind', mapping: 'nope' }])('tolerates a malformed discriminator %p', (discriminator) => {
      const schema = { oneOf: [{ type: 'object', properties: { a: { type: 'string' } } }], discriminator };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ a: '' });
    });

    it.each([
      ['without a mapping', undefined, 'Cat', 'Dog'],
      ['with a mapping', { cat: '#/components/schemas/Cat', dog: '#/components/schemas/Dog' }, 'cat', 'dog']
    ])('labels each subtype of a parent that declares the discriminator but lists no subtypes (%s)', (label, mapping, cat, dog) => {
      const schemas = {
        Pet: { type: 'object', properties: { petType: { type: 'string' }, name: { type: 'string' } }, discriminator: { propertyName: 'petType', mapping } },
        Cat: { allOf: [ref('Pet'), { type: 'object', properties: { huntingSkill: { type: 'string' } } }] },
        Dog: { allOf: [ref('Pet'), { type: 'object', properties: { packSize: { type: 'integer' } } }] }
      };
      const body = (schema) => requestBody(buildSpec({ schemas, paths: postBody(schema) }));
      expect(body(ref('Cat'))).toEqual({ petType: cat, name: '', huntingSkill: '' });
      expect(body(ref('Dog'))).toEqual({ petType: dog, name: '', packSize: 0 });
      expect(body({ oneOf: [ref('Dog'), ref('Cat')] })).toEqual({ petType: dog, name: '', packSize: 0 });
    });

    it('labels a subtype and a middle level of the classic layout with their own names', () => {
      const schemas = {
        Pet: { type: 'object', properties: { petType: { type: 'string' } }, discriminator: { propertyName: 'petType' } },
        Mammal: { allOf: [ref('Pet'), { type: 'object', properties: { fur: { type: 'boolean' } } }] },
        Cat: { allOf: [ref('Mammal'), { type: 'object', properties: { meow: { type: 'boolean' } } }] }
      };
      const body = (name) => requestBody(buildSpec({ schemas, paths: postBody(ref(name)) }));
      expect(body('Cat')).toEqual({ petType: 'Cat', fur: false, meow: false });
      expect(body('Mammal')).toEqual({ petType: 'Mammal', fur: false });
    });

    it('leaves the base of the classic layout unlabelled, also behind an inline wrapper', () => {
      const schemas = {
        Pet: { type: 'object', properties: { petType: { type: 'string' } }, discriminator: { propertyName: 'petType' } },
        Cat: { allOf: [ref('Pet'), { type: 'object', properties: { meow: { type: 'boolean' } } }] }
      };
      const body = (schema) => requestBody(buildSpec({ schemas, paths: postBody(schema) }));
      expect(body(ref('Pet'))).toEqual({ petType: '' });
      expect(body({ allOf: [ref('Pet')], description: 'any pet' })).toEqual({ petType: '' });
    });
  });

  describe('allOf', () => {
    it('merges sibling properties declared alongside allOf', () => {
      const schema = { type: 'object', properties: { sibling: { type: 'string' } }, allOf: [{ type: 'object', properties: { composed: { type: 'boolean' } } }] };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ sibling: '', composed: false });
    });

    it('resolves nested allOf and a oneOf inside an allOf branch', () => {
      const schema = {
        allOf: [
          { allOf: [{ type: 'object', properties: { level1: { type: 'string' } } }] },
          { oneOf: [{ type: 'object', properties: { variantA: { type: 'integer' } } }, { type: 'object', properties: { variantB: { type: 'boolean' } } }] }
        ]
      };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ level1: '', variantA: 0 });
    });

    it('falls back to the first branch when two branches type the same property differently', () => {
      const schema = {
        allOf: [
          { type: 'object', properties: { id: { type: 'string' }, label: { type: 'string' } } },
          { type: 'object', properties: { id: { type: 'integer' }, count: { type: 'integer' } } }
        ]
      };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ id: '', label: '' });
    });

    it('falls back to the first branch that describes content when branches conflict', () => {
      const schema = {
        allOf: [
          { description: 'metadata only' },
          { type: 'object', properties: { id: { type: 'string' } } },
          { type: 'object', properties: { id: { type: 'integer' } } },
          { type: 'object', properties: { extra: { type: 'boolean' } } }
        ]
      };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ id: '' });
    });

    it('narrows a property to the const one branch pins', () => {
      const schemas = {
        Pet: { type: 'object', properties: { petType: { type: 'string', enum: ['cat', 'dog'] } } },
        Dog: { allOf: [ref('Pet'), { type: 'object', properties: { petType: { const: 'dog' }, bark: { type: 'boolean' } } }] }
      };
      expect(requestBody(buildSpec({ schemas, paths: postBody(ref('Dog')), openapi: '3.1.0' }))).toEqual({ petType: 'dog', bark: false });
    });

    it('drops an inherited example the merged property no longer allows', () => {
      const schemas = {
        Base: { type: 'object', properties: { status: { type: 'string', example: 'draft' } } },
        Published: { allOf: [ref('Base'), { type: 'object', properties: { status: { enum: ['published', 'archived'] } } }] }
      };
      expect(requestBody(buildSpec({ schemas, paths: postBody(ref('Published')) }))).toEqual({ status: 'published' });
    });

    it('merges integer and number instead of treating them as a conflict', () => {
      const schema = { allOf: [{ type: 'object', properties: { n: { type: 'number' } } }, { type: 'object', properties: { n: { type: 'integer' }, m: { type: 'string' } } }] };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ n: 0, m: '' });
    });

    it('intersects enums so the value satisfies every branch', () => {
      const schema = { type: 'object', properties: { size: { allOf: [{ enum: ['s', 'm', 'l'] }, { enum: ['l', 'm'] }] } } };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ size: 'm' });
    });

    it('intersects OpenAPI 3.1 type lists', () => {
      const schema = { allOf: [{ type: ['array', 'null'], items: { type: 'string', example: 'x' } }, { type: 'array' }] };
      expect(requestBody(buildSpec({ paths: postBody(schema), openapi: '3.1.0' }))).toEqual(['x']);
    });

    it('lets the composed schema keep its own keywords over the referenced branch', () => {
      const schemas = { Status: { type: 'string', enum: ['a', 'b', 'c'] }, Code: { type: 'string', example: 'ABC' } };
      const schema = {
        type: 'object',
        properties: {
          status: { allOf: [ref('Status')], enum: ['b', 'c'] },
          code: { allOf: [ref('Code')], enum: ['X1', 'X2'] }
        }
      };
      expect(requestBody(buildSpec({ schemas, paths: postBody(schema) }))).toEqual({ status: 'b', code: 'X1' });
    });

    it('keeps the extension properties when the base schema carries an example', () => {
      const schemas = {
        Person: { type: 'object', properties: { name: { type: 'string' }, age: { type: 'integer' } }, example: { name: 'Ada', age: 36 } },
        Employee: { allOf: [ref('Person'), { type: 'object', properties: { employeeId: { type: 'integer' } } }] }
      };
      expect(requestBody(buildSpec({ schemas, paths: postBody(ref('Employee')) }))).toEqual({ name: 'Ada', age: 36, employeeId: 0 });
    });

    it('keeps a referenced example when the wrapper only adds a description', () => {
      const schemas = { Person: { type: 'object', properties: { name: { type: 'string' } }, example: { name: 'Ada' } } };
      expect(requestBody(buildSpec({ schemas, paths: postBody({ description: 'A person', allOf: [ref('Person')] }) }))).toEqual({ name: 'Ada' });
    });

    it('keeps the composed schema\'s own example over one carried by a branch', () => {
      const schema = { example: { parentWins: true }, allOf: [{ type: 'object', example: { branchWins: true } }] };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ parentWins: true });
    });

    it('merges a property both branches describe, three levels deep', () => {
      const schema = {
        allOf: [
          { type: 'object', properties: { a: { type: 'object', properties: { b: { type: 'object', properties: { x: { type: 'string' } } } } } } },
          { type: 'object', properties: { a: { type: 'object', properties: { b: { type: 'object', properties: { y: { type: 'integer' } } } } } } }
        ]
      };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ a: { b: { x: '', y: 0 } } });
    });

    it('combines a property that both branches refine with their own allOf', () => {
      const schema = {
        allOf: [
          { type: 'object', properties: { p: { allOf: [{ type: 'object', properties: { x: { type: 'string' } } }] } } },
          { type: 'object', properties: { p: { allOf: [{ type: 'object', properties: { y: { type: 'boolean' } } }] } } }
        ]
      };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ p: { x: '', y: false } });
    });

    it('honours additionalProperties: false from any branch', () => {
      const schema = { allOf: [{ type: 'object', properties: { a: { type: 'string' } }, additionalProperties: { type: 'string' } }, { additionalProperties: false }] };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ a: '' });
    });

    it('ignores a boolean required while unioning required lists', () => {
      const schema = { allOf: [{ type: 'object', required: true, properties: { a: { type: 'string' } } }, { type: 'object', required: ['b'], properties: { b: { type: 'string' } } }] };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ a: '', b: '' });
    });

    it('keeps the larger minimum when two branches both set one', () => {
      const parameters = [{ name: 'limit', in: 'query', schema: { allOf: [{ type: 'integer', minimum: 10 }, { type: 'integer', minimum: 1 }] } }];
      expect(queryParams(buildSpec({ paths: getWithParameters(parameters) }))).toEqual([['limit', '10']]);
    });

    it('merges the items of two array branches', () => {
      const schema = {
        allOf: [
          { type: 'array', items: { type: 'object', properties: { a: { type: 'string' } } } },
          { type: 'array', items: { type: 'object', properties: { b: { type: 'integer' } } } }
        ]
      };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual([{ a: '', b: 0 }]);
    });

    it('merges the additionalProperties of two map branches', () => {
      const schema = {
        allOf: [
          { type: 'object', additionalProperties: { type: 'object', properties: { x: { type: 'string' } } } },
          { type: 'object', additionalProperties: { type: 'object', properties: { y: { type: 'integer' } } } }
        ]
      };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ additionalProp1: { x: '', y: 0 } });
    });
  });

  describe('not', () => {
    const notBody = (property) => requestBody(buildSpec({ paths: postBody({ type: 'object', properties: { value: property } }), openapi: '3.1.0' })).value;

    it('drops a forbidden value from the enum', () => {
      expect(notBody({ type: 'string', enum: ['admin', 'editor'], not: { enum: ['admin'] } })).toBe('editor');
    });

    it('applies a not from one allOf branch to values another branch supplies', () => {
      expect(notBody({ allOf: [{ type: 'string', enum: ['a', 'b', 'c'] }, { not: { enum: ['a'] } }] })).toBe('b');
    });

    it('keeps both negations when two branches carry one', () => {
      expect(notBody({ allOf: [{ type: 'string', enum: ['a', 'b', 'c'], not: { enum: ['a'] } }, { not: { enum: ['b'] } }] })).toBe('c');
    });

    it('reads values forbidden through anyOf inside not', () => {
      expect(notBody({ type: 'string', enum: ['admin', 'root', 'editor'], not: { anyOf: [{ enum: ['admin'] }, { enum: ['root'] }] } })).toBe('editor');
    });

    it('forbids a const value', () => {
      expect(notBody({ type: 'string', enum: ['a', 'b'], not: { const: 'a' } })).toBe('b');
    });

    it('emits an allowed value when the type default itself is forbidden', () => {
      expect(notBody({ type: 'string', not: { enum: [''] } })).not.toBe('');
      expect(notBody({ type: 'integer', not: { enum: [0] } })).not.toBe(0);
    });

    it('avoids the type not forbids when the schema declares none', () => {
      expect(typeof notBody({ not: { type: 'string' } })).not.toBe('string');
    });

    it('treats integer as forbidden when number is', () => {
      expect(notBody({ type: ['integer', 'boolean'], not: { type: 'number' } })).toBe(false);
    });

    it('finds an allowed integer past several forbidden ones', () => {
      expect([0, 1, 2]).not.toContain(notBody({ type: 'integer', not: { enum: [0, 1, 2] } }));
    });

    it('ignores a length rule in not, as the importer does everywhere', () => {
      expect(notBody({ type: 'string', not: { maxLength: 0 } })).toBe('');
      expect(notBody({ type: 'string', not: { maxLength: 5000000 } })).toBe('');
      expect(notBody({ type: 'string', not: { maxLength: Infinity } })).toBe('');
    });

    it('emits null when not leaves only the null type', () => {
      expect(notBody({ type: ['string', 'null'], not: { type: 'string' } })).toBeNull();
    });

    it('drops a property an object-shaped not forbids', () => {
      const schema = { type: 'object', properties: { url: { type: 'string' }, html: { type: 'string' } }, not: { type: 'object', required: ['html'] } };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ url: '' });
    });

    it('keeps a forbidden default out of primitive array items in a response example', () => {
      const schema = { type: 'array', items: { type: 'integer', not: { const: 0 } } };
      expect(responseExample(buildSpec({ paths: getWithResponse(schema), openapi: '3.1.0' }))).not.toContain(0);
    });

    it('keeps an object an object when not forbids another type', () => {
      const schema = { properties: { name: { type: 'string' } }, not: { type: 'null' } };
      expect(responseExample(buildSpec({ paths: getWithResponse(schema), openapi: '3.1.0' }))).toEqual({ name: '' });
    });

    it('drops an optional property that not.required forbids sending', () => {
      const schema = { type: 'object', required: ['a'], properties: { a: { type: 'string' }, b: { type: 'string' } }, not: { required: ['a', 'b'] } };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ a: '' });
    });

    it('keeps the plain default when not forbids every value', () => {
      expect(notBody({ not: {} })).toBe('');
      expect(notBody({ type: 'boolean', not: { type: 'boolean' } })).toBe(false);
    });

    it('ignores a pattern in not and still applies the rest of the not', () => {
      expect(notBody({ type: 'string', not: { pattern: '^(string)?$' } })).toBe('');
      expect(notBody({ allOf: [{ type: 'string' }], not: { anyOf: [{ pattern: '^(x+)+y$' }, { maxLength: 40 }] } })).toBe('');
      expect(notBody({ type: 'string', not: { anyOf: [{ pattern: '(' }, { enum: [''] }] } })).toBe('string');
    });

    it('emits true when not forbids false', () => {
      expect(notBody({ type: 'boolean', not: { enum: [false] } })).toBe(true);
    });

    it('finds an allowed value for a schema without a type', () => {
      expect(notBody({ not: { enum: [''] } })).toBe('string');
    });
  });

  describe('composition outside the JSON request body', () => {
    it('expands an allOf object query parameter into its properties', () => {
      const parameters = [{
        name: 'filter',
        in: 'query',
        schema: { allOf: [{ type: 'object', properties: { color: { type: 'string', example: 'red' } } }, { type: 'object', properties: { size: { type: 'integer', example: 3 } } }] }
      }];
      expect(queryParams(buildSpec({ paths: getWithParameters(parameters) }))).toEqual([['color', 'red'], ['size', '3']]);
    });

    it('keeps a deepObject parameter whole instead of emitting bare keys', () => {
      const parameters = [{
        name: 'created',
        in: 'query',
        style: 'deepObject',
        explode: true,
        schema: { anyOf: [{ type: 'object', properties: { gt: { type: 'integer' }, lt: { type: 'integer' } } }, { type: 'integer' }] }
      }];
      expect(queryParams(buildSpec({ paths: getWithParameters(parameters) })).map(([name]) => name)).toEqual(['created']);
    });

    it('keeps a form query parameter whole when it may be one of several shapes', () => {
      const parameters = [{
        name: 'created',
        in: 'query',
        schema: { oneOf: [{ type: 'object', properties: { gt: { type: 'integer' } } }, { type: 'integer' }] }
      }];
      expect(queryParams(buildSpec({ paths: getWithParameters(parameters) })).map(([name]) => name)).toEqual(['created']);
    });

    it('keeps an allOf parameter whole when a part it wraps offers alternatives', () => {
      const schemas = { Lookup: { oneOf: [{ type: 'object', properties: { name: { type: 'string' } } }, { type: 'object', properties: { id: { type: 'integer' } } }] } };
      const parameters = [{ name: 'lookup', in: 'query', schema: { allOf: [ref('Lookup')], nullable: true } }];
      expect(queryParams(buildSpec({ schemas, paths: getWithParameters(parameters) })).map(([name]) => name)).toEqual(['lookup']);
    });

    it('leaves an optional parameter that uses not disabled and empty', () => {
      const parameters = [{ name: 'q', in: 'query', schema: { type: 'string', not: { const: '' } } }];
      const [param] = firstRequest(buildSpec({ paths: getWithParameters(parameters), openapi: '3.1.0' })).request.params;
      expect([param.value, param.enabled]).toEqual(['', false]);
    });

    it('does not send the object example of a composed parameter as [object Object]', () => {
      const schemas = { Filter: { type: 'object', properties: { status: { type: 'string' } }, example: { status: 'active' } } };
      const parameters = [{ name: 'X-Filter', in: 'header', schema: { oneOf: [ref('Filter'), { type: 'string' }] } }];
      const headers = firstRequest(buildSpec({ schemas, paths: getWithParameters(parameters) })).request.headers;
      expect(headers.map((h) => [h.name, h.value])).toEqual([['X-Filter', 'status,active']]);
    });

    it('keeps composed header and path parameters as the declared parameter', () => {
      const object = { oneOf: [{ type: 'object', properties: { traceId: { type: 'string' } } }, { type: 'string' }] };
      const spec = buildSpec({
        paths: {
          '/pets/{ref}': {
            get: {
              summary: 'Target',
              parameters: [{ name: 'ref', in: 'path', required: true, schema: object }, { name: 'X-Trace', in: 'header', schema: object }],
              responses: { 200: { description: 'ok' } }
            }
          }
        }
      });
      const request = firstRequest(spec).request;
      expect(request.params.filter((p) => p.type === 'path').map((p) => p.name)).toEqual(['ref']);
      expect(request.headers.map((h) => h.name)).toEqual(['X-Trace']);
    });

    it('keeps a composed object header or path parameter in one value built from its properties', () => {
      const schemas = { Colour: { type: 'object', properties: { R: { type: 'integer', example: 100 }, G: { type: 'integer', example: 200 } } } };
      const colour = { allOf: [ref('Colour'), { type: 'object', properties: { B: { type: 'integer', example: 150 } } }] };
      const spec = buildSpec({
        schemas,
        paths: {
          '/colours/{colour}': {
            get: {
              summary: 'Target',
              parameters: [{ name: 'colour', in: 'path', required: true, schema: colour }, { name: 'X-Colour', in: 'header', schema: colour }],
              responses: { 200: { description: 'ok' } }
            }
          }
        }
      });
      const request = firstRequest(spec).request;
      expect(request.params.filter((p) => p.type === 'path').map((p) => [p.name, p.value])).toEqual([['colour', 'R,100,G,200,B,150']]);
      expect(request.headers.map((h) => [h.name, h.value])).toEqual([['X-Colour', 'R,100,G,200,B,150']]);
    });

    it('writes the default a composed parameter inherits in the parameter style', () => {
      const parameters = [
        { name: 'colour', in: 'query', schema: { allOf: [{ type: 'object', default: { R: 1, G: 2 } }] } },
        { name: 'tags', in: 'query', schema: { allOf: [{ type: 'array', items: { type: 'string' }, default: ['a', 'b'] }] } },
        { name: 'X-Tags', in: 'header', schema: { allOf: [{ type: 'array', items: { type: 'string' }, default: ['a', 'b'] }] } }
      ];
      const request = firstRequest(buildSpec({ paths: getWithParameters(parameters) })).request;
      expect(request.params.map((p) => [p.name, p.value])).toEqual([['R', '1'], ['G', '2'], ['tags', 'a'], ['tags', 'b']]);
      expect(request.headers.map((h) => [h.name, h.value])).toEqual([['X-Tags', 'a,b']]);
    });

    it('keeps a composed property that declares an empty value when it builds an object parameter', () => {
      const schema = { type: 'object', properties: { R: { allOf: [{ type: 'string', example: '' }] }, G: { type: 'integer', example: 2 } } };
      const headers = firstRequest(buildSpec({ paths: getWithParameters([{ name: 'X-Colour', in: 'header', schema }]) })).request.headers;
      expect(headers.map((h) => [h.name, h.value])).toEqual([['X-Colour', 'R,,G,2']]);
    });

    it('resolves composition in a query parameter schema', () => {
      const parameters = [{ name: 'status', in: 'query', schema: { oneOf: [{ type: 'string', enum: ['active', 'archived'] }, { type: 'integer' }] } }];
      expect(queryParams(buildSpec({ paths: getWithParameters(parameters) }))).toEqual([['status', 'active'], ['status', 'archived']]);
    });

    it('resolves composition under array parameter items', () => {
      const parameters = [{ name: 'tags', in: 'query', schema: { type: 'array', items: { allOf: [{ type: 'string', enum: ['x', 'y'] }], not: { enum: ['x'] } } } }];
      expect(queryParams(buildSpec({ paths: getWithParameters(parameters) }))).toEqual([['tags', 'y']]);
    });

    it('does not send the object example of a composed array item as [object Object]', () => {
      const schemas = { Filter: { type: 'object', properties: { status: { type: 'string' } }, example: { status: 'active' } } };
      const parameters = [{ name: 'X-Filters', in: 'header', schema: { type: 'array', items: { allOf: [ref('Filter')] } } }];
      const headers = firstRequest(buildSpec({ schemas, paths: getWithParameters(parameters) })).request.headers;
      expect(headers.map((h) => [h.name, h.value])).toEqual([['X-Filters', '']]);
    });

    it('resolves composition per form-urlencoded field', () => {
      const schema = { type: 'object', properties: { mode: { allOf: [{ type: 'string', example: 'fast' }], description: 'Speed' } } };
      const fields = firstRequest(buildSpec({ paths: postBody(schema, 'application/x-www-form-urlencoded') })).request.body.formUrlEncoded;
      expect(fields.map((f) => [f.name, f.value, f.description])).toEqual([['mode', 'fast', 'Speed']]);
    });

    it('detects a multipart file field declared through allOf', () => {
      const schema = { type: 'object', properties: { upload: { allOf: [{ type: 'string', format: 'binary' }] } } };
      const fields = firstRequest(buildSpec({ paths: postBody(schema, 'multipart/form-data') })).request.body.multipartForm;
      expect(fields.map((f) => [f.name, f.type])).toEqual([['upload', 'file']]);
    });

    it('renders composed nested properties and attributes in an XML body', () => {
      const schemas = { Lang: { type: 'string', xml: { attribute: true, name: 'xml-lang' } } };
      const schema = {
        type: 'object',
        xml: { name: 'Doc' },
        example: { language: 'en' },
        properties: {
          language: { allOf: [ref('Lang')] },
          address: { allOf: [{ type: 'object', properties: { city: { type: 'string' } } }, { type: 'object', properties: { zip: { type: 'string' } } }] }
        }
      };
      const xml = firstRequest(buildSpec({ schemas, paths: postBody(schema, 'application/xml') })).request.body.xml;
      expect(xml).toContain('<Doc xml-lang="en">');
      expect(xml).toContain('<city></city>');
      expect(xml).toContain('<zip></zip>');
    });

    it('generates a response example for an array of composed items', () => {
      const schema = { type: 'array', items: { allOf: [{ type: 'object', properties: { id: { type: 'integer' } } }, { type: 'object', properties: { name: { type: 'string' } } }] } };
      expect(responseExample(buildSpec({ paths: getWithResponse(schema) }))).toEqual([{ id: 0, name: '' }]);
    });

    it('imports a composed form body whose example is a string', () => {
      const schemas = { TokenRequest: { type: 'object', properties: { grant_type: { type: 'string' } }, example: 'grant_type=client_credentials' } };
      const schema = { description: 'Token request', allOf: [ref('TokenRequest')] };
      const fields = firstRequest(buildSpec({ schemas, paths: postBody(schema, 'application/x-www-form-urlencoded') })).request.body.formUrlEncoded;
      expect(fields.map((f) => f.name)).toEqual(['grant_type']);
    });

    it('leaves a plain additionalProperties map empty', () => {
      const schema = { type: 'object', additionalProperties: { type: 'integer' } };
      expect(responseExample(buildSpec({ paths: getWithResponse(schema) }))).toEqual({});
    });

    it('adds no entry for a map whose values are all forbidden', () => {
      const schema = { type: 'object', additionalProperties: { not: {} } };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({});
    });

    it('fills a map typed through additionalProperties without overwriting a declared key', () => {
      const schema = { type: 'object', properties: { additionalProp1: { type: 'boolean' } }, additionalProperties: { oneOf: [{ type: 'integer' }] } };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ additionalProp1: false, additionalProp2: 0 });
    });

    it('uses the example of a composed SPARQL body', () => {
      const query = 'SELECT ?s WHERE { ?s ?p ?o }';
      const spec = buildSpec({ paths: postBody({ allOf: [{ type: 'string', example: query }] }, 'application/sparql-query') });
      expect(firstRequest(spec).request.body.sparql).toBe(query);
    });

    it('uses the example of a composed text body', () => {
      const spec = buildSpec({ paths: postBody({ allOf: [{ type: 'string', example: 'hello' }] }, 'text/plain') });
      expect(firstRequest(spec).request.body.text).toBe('hello');
    });
  });

  describe.each([true, false])('recursive schemas (components first: %s)', (componentsFirst) => {
    const importBody = (schemas, schema, mimeType) => {
      const request = firstRequest(buildSpec({ schemas, paths: postBody(schema, mimeType), componentsFirst })).request;
      return mimeType ? request.body.xml : JSON.parse(request.body.json);
    };

    it('imports a model that redeclares an inherited recursive property', () => {
      const schemas = {
        Person: { type: 'object', properties: { name: { type: 'string' }, manager: ref('Person') } },
        Employee: { allOf: [ref('Person'), { type: 'object', properties: { manager: ref('Employee'), department: { type: 'string' } } }] }
      };
      expect(importBody(schemas, ref('Employee'))).toHaveProperty('department', '');
      expect(importBody(schemas, ref('Employee'), 'application/xml')).toContain('<department></department>');
    });

    it('imports a schema whose allOf refers back to itself', () => {
      const schemas = { Tree: { allOf: [{ type: 'object', properties: { name: { type: 'string' } } }, { type: 'object', properties: { parent: ref('Tree') } }] } };
      expect(importBody(schemas, ref('Tree'))).toHaveProperty('name', '');
    });

    it('imports two schemas that compose each other', () => {
      const schemas = { A: { allOf: [ref('B'), { type: 'object', properties: { a: { type: 'string' } } }] }, B: { allOf: [ref('A'), { type: 'object', properties: { b: { type: 'string' } } }] } };
      expect(importBody(schemas, ref('A'))).toEqual({ a: '', b: '' });
    });

    it('imports a self-referencing array reached through oneOf', () => {
      const schemas = { NestedList: { type: 'array', items: { oneOf: [ref('NestedList'), { type: 'string' }] } } };
      expect(importBody(schemas, ref('NestedList'))).toEqual([[[]]]);
    });

    it('expands a model behind annotated or nullable wrappers no further than behind a plain $ref', () => {
      const linked = (wrap) => ({
        Node: { type: 'object', properties: { id: { type: 'integer' }, a: wrap(ref('Node')), b: wrap(ref('Node')), c: wrap(ref('Node')) } }
      });
      const body = (wrap, first) => JSON.stringify(firstRequest(buildSpec({ schemas: linked(wrap), paths: postBody(ref('Node')), componentsFirst: first })).request.body.json);
      const plain = body((target) => target, true);
      [(target) => ({ description: 'link', allOf: [target] }), (target) => ({ anyOf: [target, { type: 'null' }] })].forEach((wrap) => {
        expect(body(wrap, true)).toBe(plain);
        expect(body(wrap, componentsFirst)).toBe(plain);
      });
    });
  });

  describe('robustness', () => {
    it('accepts a visited map passed by a caller of the exported helpers', () => {
      const schema = { type: 'object', properties: { id: { type: 'integer' }, pet: { allOf: [{ type: 'object', properties: { name: { type: 'string' } } }] } } };
      const visited = new Map();
      expect(getDefaultValueForSchema(schema, visited)).toEqual({ id: 0, pet: { name: '' } });
      expect(buildEmptyJsonBody(schema, visited)).toEqual({ id: 0, pet: { name: '' } });
      expect(visited.size).toBe(0);
    });

    it('ignores composition keywords that are malformed', () => {
      const schema = { type: 'object', properties: { kept: { type: 'string' } }, allOf: 'nonsense', oneOf: [null, 1, 'a'], anyOf: {} };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ kept: '' });
    });

    it('treats a property with no schema as an empty value instead of failing the import', () => {
      const schema = { allOf: [{ type: 'object', properties: { empty: null, name: { type: 'string' } } }] };
      expect(requestBody(buildSpec({ paths: postBody(schema) }))).toEqual({ empty: '', name: '' });
    });

    it('gives an operation the same body whatever other operations the spec lists first', () => {
      const schemas = {
        Pet: { type: 'object', properties: { pet_type: { type: 'string' } }, discriminator: { propertyName: 'pet_type' }, oneOf: [ref('Cat'), ref('Dog')] },
        Cat: { allOf: [ref('Pet'), { type: 'object', properties: { hunts: { type: 'boolean' } } }] },
        Dog: { allOf: [ref('Pet'), { type: 'object', properties: { bark: { type: 'boolean' } } }] }
      };
      const body = (paths) => {
        const items = openApiToBruno(buildSpec({ schemas, paths })).items;
        return items.find((item) => item.name === 'Pets').request.body.json;
      };
      const op = (name, schema) => ({ post: { summary: name, requestBody: { content: { 'application/json': { schema } } }, responses: { 200: { description: 'ok' } } } });
      const petsAlone = body({ '/pets': op('Pets', ref('Pet')) });
      expect(body({ '/cats': op('Cats', ref('Cat')), '/pets': op('Pets', ref('Pet')) })).toBe(petsAlone);
      expect(JSON.parse(petsAlone)).toEqual({ pet_type: 'Cat', hunts: false });
    });

    it.each([true, false])('builds a subtype body from its own branch whatever resolved the base first (components first: %s)', (componentsFirst) => {
      const schemas = {
        Pet: { type: 'object', properties: { pet_type: { type: 'string' } }, discriminator: { propertyName: 'pet_type' }, oneOf: [ref('Cat'), ref('Dog')] },
        Cat: { allOf: [ref('Pet'), { type: 'object', properties: { hunts: { type: 'boolean' } } }] },
        Dog: { allOf: [ref('Pet'), { type: 'object', properties: { bark: { type: 'boolean' } } }] }
      };
      const op = (name, schema) => ({ post: { summary: name, requestBody: { content: { 'application/json': { schema } } }, responses: { 200: { description: 'ok' } } } });
      const dogs = (paths) => openApiToBruno(buildSpec({ schemas, paths, componentsFirst })).items.find((item) => item.name === 'Dogs').request.body.json;
      const alone = dogs({ '/dogs': op('Dogs', ref('Dog')) });
      expect(dogs({ '/pets': op('Pets', ref('Pet')), '/dogs': op('Dogs', ref('Dog')) })).toBe(alone);
      expect(JSON.parse(alone)).not.toHaveProperty('hunts');
    });

    it.each([
      ['one middle level', { Mammal: { allOf: [ref('Pet'), { type: 'object', properties: { fur: { type: 'boolean' } } }] } }, { fur: false }],
      ['two middle levels', {
        Animal: { allOf: [ref('Pet'), { type: 'object', properties: { legs: { type: 'integer' } } }] },
        Mammal: { allOf: [ref('Animal'), { type: 'object', properties: { fur: { type: 'boolean' } } }] }
      }, { legs: 0, fur: false }]
    ])('builds a subtype body from its own branch through %s, whatever the spec lists first', (label, middle, inherited) => {
      const schemas = {
        Pet: {
          type: 'object',
          properties: { petType: { type: 'string' } },
          oneOf: [ref('Cat'), ref('Dog')],
          discriminator: { propertyName: 'petType', mapping: { cat: '#/components/schemas/Cat', dog: '#/components/schemas/Dog' } }
        },
        ...middle,
        Cat: { allOf: [ref('Mammal'), { type: 'object', properties: { meow: { type: 'boolean' } } }] },
        Dog: { allOf: [ref('Mammal'), { type: 'object', properties: { bark: { type: 'string' } } }] }
      };
      const op = (name) => ({ post: { summary: name, requestBody: { content: { 'application/json': { schema: ref(name) } } }, responses: { 200: { description: 'ok' } } } });
      const dog = (names) => {
        const items = openApiToBruno(buildSpec({ schemas, paths: Object.fromEntries(names.map((name) => [`/${name}`, op(name)])) })).items;
        return JSON.parse(items.find((item) => item.name === 'Dog').request.body.json);
      };
      const expected = { petType: 'dog', ...inherited, bark: '' };
      expect(dog(['Dog'])).toEqual(expected);
      expect(dog([...Object.keys(middle), 'Cat', 'Dog'])).toEqual(expected);
    });

    it('reflects an edit to an object that is converted again', () => {
      const schema = { $ref: '#/components/schemas/Missing', allOf: [{ type: 'object', properties: { a: { type: 'string' } } }] };
      const spec = buildSpec({ paths: postBody(schema) });
      expect(requestBody(spec)).toEqual({ a: '' });
      schema.allOf.push({ type: 'object', properties: { b: { type: 'integer' } } });
      expect(requestBody(spec)).toEqual({ a: '', b: 0 });
    });

    it('bounds the example for a densely linked model graph', () => {
      const schemas = {};
      for (let i = 0; i < 18; i += 1) {
        const links = {};
        [1, 2, 3].forEach((k) => {
          if (i + k < 18) links[`link${k}`] = { anyOf: [ref(`M${i + k}`), { type: 'object', nullable: true }] };
        });
        schemas[`M${i}`] = { type: 'object', properties: { id: { type: 'integer' }, ...links } };
      }
      const json = firstRequest(buildSpec({ schemas, paths: postBody(ref('M0')) })).request.body.json;
      expect(json.length).toBeLessThan(500000);
      expect(JSON.parse(json)).toHaveProperty('link1.id', 0);
    });

    it('bounds a composed body whose branch leads into a densely linked plain model graph', () => {
      const schemas = {};
      for (let i = 0; i < 18; i += 1) {
        const links = {};
        [1, 2, 3].forEach((k) => {
          if (i + k < 18) links[`link${k}`] = ref(`M${i + k}`);
        });
        schemas[`M${i}`] = { type: 'object', properties: { id: { type: 'integer' }, ...links } };
      }
      const json = firstRequest(buildSpec({ schemas, paths: postBody({ allOf: [ref('M0')] }) })).request.body.json;
      expect(json.length).toBeLessThan(500000);
    });

    it('keeps composition next to a large plain model', () => {
      const big = { type: 'object', properties: {} };
      for (let i = 0; i < 6000; i += 1) big.properties[`p${i}`] = { type: 'string' };
      const schemas = { Status: { type: 'string', enum: ['active', 'inactive'] }, Big: big };
      const schema = { type: 'object', properties: { status: { allOf: [ref('Status')], description: 'Lifecycle' }, data: ref('Big') } };
      expect(requestBody(buildSpec({ schemas, paths: postBody(schema) })).status).toBe('active');
    });

    it('keeps a large example written in the spec whole, in JSON, XML and response examples', () => {
      const example = Object.fromEntries(Array.from({ length: 5200 }, (_, i) => [`key${i}`, i]));
      const schemas = { Big: { type: 'object', example } };
      const schema = { allOf: [ref('Big')] };
      expect(requestBody(buildSpec({ schemas, paths: postBody(schema) }))).toEqual(example);
      const xml = firstRequest(buildSpec({ schemas, paths: postBody(schema, 'application/xml') })).request.body.xml;
      expect(xml.match(/<key\d+>/g)).toHaveLength(5200);
      expect(responseExample(buildSpec({ schemas, paths: getWithResponse(schema) }))).toEqual(example);
    });

    it('fills every sibling that uses the same schema, in JSON, XML and arrays', () => {
      const schemas = {
        Address: { type: 'object', properties: { street: { type: 'string' }, city: { type: 'string' } } },
        Order: { type: 'object', properties: { billingAddress: ref('Address'), shippingAddress: ref('Address') } },
        Matrix: { type: 'array', items: { type: 'array', items: { anyOf: [ref('Grid'), { type: 'string' }] } } },
        Grid: { allOf: [{ type: 'object', properties: { rows: ref('Matrix'), cols: ref('Matrix') } }] }
      };
      const address = { street: '', city: '' };
      expect(requestBody(buildSpec({ schemas, paths: postBody(ref('Order')) }))).toEqual({ billingAddress: address, shippingAddress: address });
      const xml = firstRequest(buildSpec({ schemas, paths: postBody(ref('Order'), 'application/xml') })).request.body.xml;
      expect(xml.match(/<street><\/street>/g)).toHaveLength(2);
      expect(requestBody(buildSpec({ schemas, paths: postBody(ref('Grid')) }))).toEqual({ rows: [[{}]], cols: [[{}]] });
    });

    it('builds each oneOf branch once inside a $ref loop, so a long loop stays fast', () => {
      const levels = 18;
      const schemas = {};
      for (let i = 0; i < levels; i += 1) {
        schemas[`S${i}`] = { oneOf: [{ allOf: [ref(`S${(i + 1) % levels}`), { type: 'object', properties: { [`f${i}`]: { type: 'string' } } }] }, { type: 'string' }] };
      }
      const started = performance.now();
      const body = requestBody(buildSpec({ schemas, paths: postBody(ref('S0')) }));
      expect(performance.now() - started).toBeLessThan(500);
      expect(body).toEqual(Object.fromEntries(Array.from({ length: levels }, (_, i) => [`f${i}`, ''])));
    });

    it('merges plain recursive models of different cycle lengths without overflowing the stack', () => {
      const schemas = {};
      [2, 3, 5, 7, 11].forEach((length, ring) => {
        for (let i = 0; i < length; i += 1) {
          schemas[`R${ring}N${i}`] = { type: 'object', properties: { id: { type: 'string' }, next: ref(`R${ring}N${(i + 1) % length}`) } };
        }
      });
      const schema = { allOf: [0, 1, 2, 3, 4].map((ring) => ref(`R${ring}N0`)) };
      const body = requestBody(buildSpec({ schemas, paths: postBody(schema) }));
      expect(body).toMatchObject({ id: '', next: { id: '', next: { id: '' } } });
      let levels = 0;
      for (let node = body; node && typeof node === 'object'; node = node.next) levels += 1;
      expect(levels).toBeLessThanOrEqual(32);
    });

    it('stops a recursive list of objects at the repeated object', () => {
      const schemas = { L: { type: 'array', items: { type: 'object', properties: { sub: ref('L'), n: { type: 'string' } } } } };
      const schema = { type: 'object', properties: { list: ref('L') } };
      expect(requestBody(buildSpec({ schemas, paths: postBody(schema) }))).toEqual({ list: [{ sub: [{}], n: '' }] });
    });

    it('stops nested arrays that loop back through an object at the repeated object', () => {
      const schemas = {
        A: { type: 'array', items: ref('B') },
        B: { type: 'array', items: ref('O') },
        O: { type: 'object', properties: { list: ref('A') } }
      };
      const schema = { type: 'object', properties: { list: ref('A') } };
      expect(requestBody(buildSpec({ schemas, paths: postBody(schema) }))).toEqual({ list: [[{ list: [[{}]] }]] });
    });
  });
});
