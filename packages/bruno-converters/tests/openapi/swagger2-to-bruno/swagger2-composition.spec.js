import { describe, it, expect } from '@jest/globals';
import { swagger2ToBruno } from '../../../src/openapi/swagger2-to-bruno';

const ref = (name) => ({ $ref: `#/definitions/${name}` });

const buildSpec = ({ paths, definitions, definitionsFirst = true }) => {
  const head = { swagger: '2.0', info: { title: 'Composition', version: '1.0.0' }, host: 'api.example.com', schemes: ['https'] };
  return definitionsFirst ? { ...head, definitions, paths } : { ...head, paths, definitions };
};

const postBody = (schema) => ({
  '/target': {
    post: {
      summary: 'Target',
      consumes: ['application/json'],
      parameters: [{ name: 'body', in: 'body', required: true, schema }],
      responses: { 200: { description: 'ok', schema } }
    }
  }
});

const firstRequest = (spec) => swagger2ToBruno(spec).items[0];

const definitions = {
  Person: { type: 'object', properties: { name: { type: 'string' }, age: { type: 'integer' } } },
  Employee: { allOf: [ref('Person'), { type: 'object', properties: { employeeId: { type: 'integer' } } }] }
};

describe('swagger 2.0 schema composition', () => {
  it('merges allOf inheritance in a body parameter', () => {
    const request = firstRequest(buildSpec({ definitions, paths: postBody(ref('Employee')) }));
    expect(JSON.parse(request.request.body.json)).toEqual({ name: '', age: 0, employeeId: 0 });
  });

  it('merges allOf inheritance in a response example', () => {
    const request = firstRequest(buildSpec({ definitions, paths: postBody(ref('Employee')) }));
    expect(JSON.parse(request.examples[0].response.body.content)).toEqual({ name: '', age: 0, employeeId: 0 });
  });

  it.each([true, false])('imports a model that redeclares an inherited recursive property (definitions first: %s)', (definitionsFirst) => {
    const recursive = {
      Person: { type: 'object', properties: { name: { type: 'string' }, manager: ref('Person') } },
      Employee: { allOf: [ref('Person'), { type: 'object', properties: { manager: ref('Employee'), department: { type: 'string' } } }] }
    };
    const request = firstRequest(buildSpec({ definitions: recursive, paths: postBody(ref('Employee')), definitionsFirst }));
    expect(JSON.parse(request.request.body.json)).toHaveProperty('department', '');
  });

  it('labels each subtype with its definition name when the parent declares the discriminator', () => {
    const pets = {
      Pet: { type: 'object', discriminator: 'petType', required: ['petType'], properties: { petType: { type: 'string' }, name: { type: 'string' } } },
      Cat: { allOf: [ref('Pet'), { type: 'object', properties: { huntingSkill: { type: 'string' } } }] },
      Dog: { allOf: [ref('Pet'), { type: 'object', properties: { packSize: { type: 'integer' } } }] }
    };
    const body = (name) => JSON.parse(firstRequest(buildSpec({ definitions: pets, paths: postBody(ref(name)) })).request.body.json);
    expect(body('Cat')).toEqual({ petType: 'Cat', name: '', huntingSkill: '' });
    expect(body('Dog')).toEqual({ petType: 'Dog', name: '', packSize: 0 });
  });

  it('reflects an edit to an object that is converted again', () => {
    const schema = { $ref: '#/definitions/Missing', allOf: [{ type: 'object', properties: { a: { type: 'string' } } }] };
    const spec = buildSpec({ definitions, paths: postBody(schema) });
    const body = () => JSON.parse(firstRequest(spec).request.body.json);
    expect(body()).toEqual({ a: '' });
    schema.allOf.push({ type: 'object', properties: { b: { type: 'integer' } } });
    expect(body()).toEqual({ a: '', b: 0 });
  });
});
