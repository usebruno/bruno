const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveOpenApiSpecRefs, truncateCycles, collectIdsAndAnchors, rewriteIdBasedRefs } = require('../src/ipc/openapi-ref-resolver');

describe('collectIdsAndAnchors / rewriteIdBasedRefs', () => {
  test('rewrites a $ref matching a same-document $id into a JSON pointer', () => {
    const doc = {
      components: {
        schemas: {
          Pet: { properties: { details: { $ref: '/api/v31/components/schemas/petdetails' } } },
          PetDetails: { $id: '/api/v31/components/schemas/petdetails', type: 'object' }
        }
      }
    };
    const idMap = new Map();
    const anchorMap = new Map();
    collectIdsAndAnchors(doc, [], null, idMap, anchorMap);
    const result = rewriteIdBasedRefs(doc, idMap, anchorMap);
    expect(result.components.schemas.Pet.properties.details.$ref).toBe('#/components/schemas/PetDetails');
  });

  test('rewrites a $ref matching an $id + $anchor pair, scoped to the nearest $id', () => {
    const doc = {
      components: {
        schemas: {
          Pet: { petDetailsId: { $ref: '/api/v31/components/schemas/petdetails#pet_details_id' } },
          PetDetails: {
            $id: '/api/v31/components/schemas/petdetails',
            properties: { id: { $anchor: 'pet_details_id', type: 'integer' } }
          }
        }
      }
    };
    const idMap = new Map();
    const anchorMap = new Map();
    collectIdsAndAnchors(doc, [], null, idMap, anchorMap);
    const result = rewriteIdBasedRefs(doc, idMap, anchorMap);
    expect(result.components.schemas.Pet.petDetailsId.$ref).toBe('#/components/schemas/PetDetails/properties/id');
  });

  test('leaves a $ref alone when it does not match any known $id', () => {
    const doc = { a: { $ref: '/some/unrelated/path' } };
    const result = rewriteIdBasedRefs(doc, new Map(), new Map());
    expect(result.a.$ref).toBe('/some/unrelated/path');
  });

  test('leaves plain JSON-pointer and remote-URL $refs untouched', () => {
    const doc = {
      a: { $ref: '#/components/schemas/Foo' },
      b: { $ref: 'https://example.com/schema.json#/Foo' }
    };
    const result = rewriteIdBasedRefs(doc, new Map([['x', ['y']]]), new Map());
    expect(result.a.$ref).toBe('#/components/schemas/Foo');
    expect(result.b.$ref).toBe('https://example.com/schema.json#/Foo');
  });
});

describe('truncateCycles', () => {
  test('leaves non-circular data untouched', () => {
    const input = { a: 1, b: [1, 2, { c: 'x' }], d: null };
    expect(truncateCycles(input)).toEqual(input);
  });

  test('lets the same object appear at unrelated sibling locations without truncating it', () => {
    const shared = { type: 'string' };
    const input = { a: shared, b: shared };
    const result = truncateCycles(input);
    expect(result).toEqual({ a: { type: 'string' }, b: { type: 'string' } });
  });

  test('cuts off a direct self-reference with a finite stub', () => {
    const node = { type: 'object', title: 'Self' };
    node.self = node;
    const result = truncateCycles(node);
    expect(result.self).toEqual({ type: 'object', title: 'Self' });
    expect(result.self.self).toBeUndefined();
  });

  test('cuts off a cycle that loops back through an array with an empty array, not {}', () => {
    // A $ref with a sibling keyword (e.g. `{ $ref: '#/definitions/User', 'x-nullable': true }`)
    // gets merged with its target's own keys during dereferencing. If that target is
    // itself shaped like `{ allOf: [...] }`, the cyclic slot ends up being the array
    // itself, not a plain object -- swagger-ui-react's own validation rejects
    // `allOf: {}` outright ("allOf must be an array"), so the stub must stay an array.
    const user = { allOf: [{ type: 'object' }] };
    user.allOf.push({ type: 'object', properties: { manager: { 'x-nullable': true } } });
    user.allOf[1].properties.manager.allOf = user.allOf;

    const result = truncateCycles(user);
    const truncatedAllOf = result.allOf[1].properties.manager.allOf;
    expect(Array.isArray(truncatedAllOf)).toBe(true);
    expect(truncatedAllOf).toEqual([]);
  });

  test('terminates on a deep, indirect cycle instead of recursing forever', () => {
    const a = { type: 'object' };
    const b = { type: 'object' };
    a.b = b;
    b.a = a;
    const result = truncateCycles(a);
    expect(result).toEqual({ type: 'object', b: { type: 'object', a: { type: 'object' } } });
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});

describe('resolveOpenApiSpecRefs', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-openapi-ref-resolver-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3 });
  });

  test('returns an error when the spec file does not exist', async () => {
    const result = await resolveOpenApiSpecRefs(path.join(tmpDir, 'missing.yaml'));

    expect(result.error).toBe('Spec file not found');
    expect(result.spec).toBeUndefined();
  });

  test('returns an error when called with no pathname', async () => {
    const result = await resolveOpenApiSpecRefs(undefined);

    expect(result.error).toBe('Spec file not found');
  });

  test('resolves an external $ref against the spec file directory, not cwd', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'root.yaml'),
      [
        'openapi: 3.0.0',
        'info:',
        '  title: t',
        '  version: \'1\'',
        'paths:',
        '  /foo:',
        '    get:',
        '      responses:',
        '        \'200\':',
        '          description: ok',
        '          content:',
        '            application/json:',
        '              schema:',
        '                $ref: \'./external.yaml#/User\''
      ].join('\n')
    );
    fs.writeFileSync(
      path.join(tmpDir, 'external.yaml'),
      ['User:', '  type: object', '  properties:', '    name:', '      type: string'].join('\n')
    );

    const result = await resolveOpenApiSpecRefs(path.join(tmpDir, 'root.yaml'));

    expect(result.error).toBeUndefined();
    const schema = result.spec.paths['/foo'].get.responses['200'].content['application/json'].schema;
    expect(schema.$ref).toBeUndefined();
    expect(schema).toEqual({ type: 'object', properties: { name: { type: 'string' } } });
  });

  test('inlines an internal (same-document) $ref, leaving no $ref behind', async () => {
    // This is the actual reported bug: swagger-ui-react's OpenAPI 3.1 resolver
    // re-resolves refs lazily when a request is opened, and that pass fails on
    // *any* unresolved $ref under a packaged app's file:// origin — including a
    // same-document ref like '#/components/schemas/Pet'.
    fs.writeFileSync(
      path.join(tmpDir, 'petstore.yaml'),
      [
        'openapi: 3.1.0',
        'paths:',
        '  /pet:',
        '    post:',
        '      requestBody:',
        '        content:',
        '          application/json:',
        '            schema:',
        '              $ref: \'#/components/schemas/Pet\'',
        'components:',
        '  schemas:',
        '    Pet:',
        '      type: object',
        '      properties:',
        '        name:',
        '          type: string'
      ].join('\n')
    );

    const result = await resolveOpenApiSpecRefs(path.join(tmpDir, 'petstore.yaml'));

    expect(result.error).toBeUndefined();
    const schema = result.spec.paths['/pet'].post.requestBody.content['application/json'].schema;
    expect(schema.$ref).toBeUndefined();
    expect(schema).toEqual({ type: 'object', properties: { name: { type: 'string' } } });
  });

  test('truncates a genuinely self-referential schema instead of leaving a $ref or crashing', async () => {
    // A tree-shaped schema (Category with sub-Categories) can't be inlined without
    // creating a real circular JS object, which breaks JSON serialization. But
    // leaving a $ref for just that one schema isn't safe either -- any unresolved
    // $ref, anywhere, re-triggers the exact resolver bug this module exists to
    // avoid. So the cycle must be cut off with a finite, $ref-free stub instead.
    fs.writeFileSync(
      path.join(tmpDir, 'tree.yaml'),
      [
        'Category:',
        '  type: object',
        '  properties:',
        '    subcategories:',
        '      type: array',
        '      items:',
        '        $ref: \'#/Category\''
      ].join('\n')
    );

    const result = await resolveOpenApiSpecRefs(path.join(tmpDir, 'tree.yaml'));

    expect(result.error).toBeUndefined();
    expect(() => JSON.stringify(result.spec)).not.toThrow();
    const truncated = result.spec.Category.properties.subcategories.items;
    expect(truncated.$ref).toBeUndefined();
    expect(truncated).toEqual({ type: 'object' });
  });

  test('keeps allOf an array when a $ref-with-sibling cycle loops back through it', async () => {
    // Real Swagger 2.0 pattern: a nullable circular self-reference is written as
    // `$ref` plus a sibling vendor extension (`x-nullable`), and the referenced
    // schema (User) is itself defined as `allOf: [...]`.
    fs.writeFileSync(
      path.join(tmpDir, 'nullable-cycle.yaml'),
      [
        'User:',
        '  allOf:',
        '    - type: object',
        '    - type: object',
        '      properties:',
        '        manager:',
        '          $ref: \'#/User\'',
        '          x-nullable: true'
      ].join('\n')
    );

    const result = await resolveOpenApiSpecRefs(path.join(tmpDir, 'nullable-cycle.yaml'));

    expect(result.error).toBeUndefined();
    expect(() => JSON.stringify(result.spec)).not.toThrow();
    const manager = result.spec.User.allOf[1].properties.manager;
    expect(manager['x-nullable']).toBe(true);
    expect(Array.isArray(manager.allOf)).toBe(true);
  });

  test('resolves discriminator/oneOf polymorphism, a parameter $ref with a sibling override, and additionalProperties $ref', async () => {
    // A broader proactive sweep, not a reported bug -- covers three common
    // real-world patterns (Stripe/GitHub-style polymorphism, parameter reuse
    // with per-use overrides, and a $ref as a map's value type) that hadn't
    // been exercised by any prior fixture in this file.
    fs.writeFileSync(
      path.join(tmpDir, 'discriminator.yaml'),
      [
        'openapi: 3.0.3',
        'paths:',
        '  /pets:',
        '    get:',
        '      parameters:',
        '        - $ref: \'#/components/parameters/LimitParam\'',
        '          description: Overridden via sibling on a parameter $ref',
        '      responses:',
        '        \'200\':',
        '          description: ok',
        '          content:',
        '            application/json:',
        '              schema:',
        '                $ref: \'#/components/schemas/Pet\'',
        'components:',
        '  parameters:',
        '    LimitParam:',
        '      name: limit',
        '      in: query',
        '      schema:',
        '        type: integer',
        '  schemas:',
        '    Pet:',
        '      oneOf:',
        '        - $ref: \'#/components/schemas/Cat\'',
        '        - $ref: \'#/components/schemas/Dog\'',
        '      discriminator:',
        '        propertyName: petType',
        '    Cat:',
        '      type: object',
        '      properties:',
        '        toy:',
        '          $ref: \'#/components/schemas/Toy\'',
        '    Dog:',
        '      type: object',
        '    Toy:',
        '      type: object',
        '      additionalProperties:',
        '        $ref: \'#/components/schemas/ToyAttribute\'',
        '    ToyAttribute:',
        '      type: string'
      ].join('\n')
    );

    const result = await resolveOpenApiSpecRefs(path.join(tmpDir, 'discriminator.yaml'));

    expect(result.error).toBeUndefined();
    expect(JSON.stringify(result.spec)).not.toMatch(/"\$ref"/);
    const param = result.spec.paths['/pets'].get.parameters[0];
    expect(param.description).toBe('Overridden via sibling on a parameter $ref');
    expect(param.name).toBe('limit');
    const pet = result.spec.components.schemas.Pet;
    expect(pet.discriminator).toEqual({ propertyName: 'petType' });
    expect(pet.oneOf[0].properties.toy.additionalProperties).toEqual({ type: 'string' });
  });

  test('truncates a circular external $ref instead of leaving a $ref or hanging', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'a.yaml'),
      ['A:', '  type: object', '  properties:', '    b:', '      $ref: \'./b.yaml#/B\''].join('\n')
    );
    fs.writeFileSync(
      path.join(tmpDir, 'b.yaml'),
      ['B:', '  type: object', '  properties:', '    a:', '      $ref: \'./a.yaml#/A\''].join('\n')
    );

    const result = await resolveOpenApiSpecRefs(path.join(tmpDir, 'a.yaml'));

    expect(result.error).toBeUndefined();
    expect(() => JSON.stringify(result.spec)).not.toThrow();
    const truncated = result.spec.A.properties.b.properties.a;
    expect(truncated.$ref).toBeUndefined();
    expect(truncated).toEqual({ type: 'object' });
  });

  test('resolves $id/$anchor-based refs (the real Swagger Petstore 3.1 sample pattern)', async () => {
    // @apidevtools/json-schema-ref-parser only understands plain JSON pointers
    // and http(s)/file URLs -- an $id-style $ref like this one gets treated as
    // a filesystem path, throws ENOENT, and previously aborted resolving the
    // *entire* document (breaking even plain #/... refs elsewhere in the spec).
    fs.writeFileSync(
      path.join(tmpDir, 'petstore-3.1.json'),
      JSON.stringify({
        openapi: '3.1.0',
        paths: {
          '/pet': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      properties: {
                        petDetailsId: { $ref: '/api/v31/components/schemas/petdetails#pet_details_id' },
                        petDetails: { $ref: '/api/v31/components/schemas/petdetails' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        components: {
          schemas: {
            PetDetails: {
              $id: '/api/v31/components/schemas/petdetails',
              type: 'object',
              properties: {
                id: { $anchor: 'pet_details_id', type: 'integer' }
              }
            }
          }
        }
      })
    );

    const result = await resolveOpenApiSpecRefs(path.join(tmpDir, 'petstore-3.1.json'));

    expect(result.error).toBeUndefined();
    expect(JSON.stringify(result.spec)).not.toMatch(/"\$ref"/);
    const schema = result.spec.paths['/pet'].post.requestBody.content['application/json'].schema;
    expect(schema.properties.petDetails).toEqual(result.spec.components.schemas.PetDetails);
    expect(schema.properties.petDetailsId).toEqual({ $anchor: 'pet_details_id', type: 'integer' });
  });

  test('does not leave a temp rewrite file behind after resolving $id-based refs', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'with-id.json'),
      JSON.stringify({
        a: { $ref: '/x' },
        b: { $id: '/x', type: 'string' }
      })
    );

    await resolveOpenApiSpecRefs(path.join(tmpDir, 'with-id.json'));

    const leftoverFiles = fs.readdirSync(tmpDir).filter((f) => f.startsWith('.bruno-openapi-resolve-'));
    expect(leftoverFiles).toEqual([]);
  });

  test('returns an error when an external $ref points at a missing file', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'broken.yaml'),
      [
        'openapi: 3.0.0',
        'paths:',
        '  /x:',
        '    get:',
        '      responses:',
        '        \'200\':',
        '          description: ok',
        '          content:',
        '            application/json:',
        '              schema:',
        '                $ref: \'./does-not-exist.yaml#/Foo\''
      ].join('\n')
    );

    const result = await resolveOpenApiSpecRefs(path.join(tmpDir, 'broken.yaml'));

    expect(result.spec).toBeUndefined();
    expect(result.error).toMatch(/does-not-exist\.yaml/);
  });
});
