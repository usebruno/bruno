const { describe, it, expect } = require('@jest/globals');
const { buildSchema } = require('graphql');

import {
  getAvailableRootTypes,
  getRootFields,
  getFieldChildren,
  getInputObjectFields,
  generateQueryString,
  validateQueryForSync,
  parseQueryToState
} from './queryBuilder';

const BASIC_SCHEMA = buildSchema(`
  type Query {
    user(id: ID!): User
    users(limit: Int, offset: Int): [User!]!
    post(id: ID!): Post
    search(query: String!): SearchResult
  }

  type Mutation {
    createUser(input: CreateUserInput!): User
    deleteUser(id: ID!): Boolean
  }

  type User {
    id: ID!
    name: String!
    email: String
    age: Int
    active: Boolean
    role: Role
    posts: [Post!]
    friends: [User!]
  }

  type Post {
    id: ID!
    title: String!
    body: String
    author: User!
    comments: [Comment!]
  }

  type Comment {
    id: ID!
    text: String!
    author: User!
  }

  enum Role {
    ADMIN
    USER
    MODERATOR
  }

  union SearchResult = User | Post

  input CreateUserInput {
    name: String!
    email: String!
    age: Int
    address: AddressInput
  }

  input AddressInput {
    street: String
    city: String!
    zip: String
  }
`);

describe('queryBuilder', () => {
  describe('getAvailableRootTypes', () => {
    it('should return available root types from schema', () => {
      const types = getAvailableRootTypes(BASIC_SCHEMA);
      expect(types).toEqual(['Query', 'Mutation']);
    });

    it('should return empty array when schema is null', () => {
      expect(getAvailableRootTypes(null)).toEqual([]);
    });

    it('should return only Query when no mutation exists', () => {
      const schema = buildSchema(`type Query { hello: String }`);
      expect(getAvailableRootTypes(schema)).toEqual(['Query']);
    });

    it('should include Subscription when present', () => {
      const schema = buildSchema(`
        type Query { hello: String }
        type Subscription { onMessage: String }
      `);
      expect(getAvailableRootTypes(schema)).toEqual(['Query', 'Subscription']);
    });
  });

  describe('getRootFields', () => {
    it('should return all query fields', () => {
      const fields = getRootFields(BASIC_SCHEMA, 'Query');
      const names = fields.map((f) => f.name);
      expect(names).toEqual(['user', 'users', 'post', 'search']);
    });

    it('should return all mutation fields', () => {
      const fields = getRootFields(BASIC_SCHEMA, 'Mutation');
      const names = fields.map((f) => f.name);
      expect(names).toEqual(['createUser', 'deleteUser']);
    });

    it('should return empty for non-existent root type', () => {
      expect(getRootFields(BASIC_SCHEMA, 'Subscription')).toEqual([]);
    });

    it('should return empty when schema is null', () => {
      expect(getRootFields(null, 'Query')).toEqual([]);
    });

    it('should build correct field descriptors', () => {
      const fields = getRootFields(BASIC_SCHEMA, 'Query');
      const userField = fields.find((f) => f.name === 'user');

      expect(userField.path).toBe('Query.user');
      expect(userField.isLeaf).toBe(false);
      expect(userField.typeLabel).toBe('User');
      expect(userField.args).toHaveLength(1);
      expect(userField.args[0].name).toBe('id');
      expect(userField.args[0].typeLabel).toBe('ID!');
      expect(userField.args[0].isRequired).toBe(true);
    });

    it('should identify leaf fields correctly', () => {
      const schema = buildSchema(`type Query { name: String!, count: Int }`);
      const fields = getRootFields(schema, 'Query');
      expect(fields[0].isLeaf).toBe(true);
      expect(fields[1].isLeaf).toBe(true);
    });

    it('should build descriptors with enum info', () => {
      const fields = getRootFields(BASIC_SCHEMA, 'Query');
      const userField = fields.find((f) => f.name === 'user');
      const userChildren = getFieldChildren(userField.namedType, userField.path);
      const roleField = userChildren.fields.find((f) => f.name === 'role');
      // Role is an enum, so it's a leaf
      expect(roleField.isLeaf).toBe(true);
    });

    it('should build args with isInputObject for input object args', () => {
      const fields = getRootFields(BASIC_SCHEMA, 'Mutation');
      const createUser = fields.find((f) => f.name === 'createUser');
      expect(createUser.args[0].name).toBe('input');
      expect(createUser.args[0].isInputObject).toBe(true);
      expect(createUser.args[0].typeLabel).toBe('CreateUserInput!');
    });

    it('should build args with boolean detection', () => {
      const schema = buildSchema(`type Query { flag(active: Boolean): String }`);
      const fields = getRootFields(schema, 'Query');
      expect(fields[0].args[0].isBoolean).toBe(true);
    });

    it('should build args with enum info', () => {
      const schema = buildSchema(`
        type Query { users(role: Role): [String] }
        enum Role { ADMIN USER }
      `);
      const fields = getRootFields(schema, 'Query');
      expect(fields[0].args[0].isEnum).toBe(true);
      expect(fields[0].args[0].enumValues).toEqual(['ADMIN', 'USER']);
    });
  });

  describe('getFieldChildren', () => {
    it('should return children of an object type', () => {
      const fields = getRootFields(BASIC_SCHEMA, 'Query');
      const userField = fields.find((f) => f.name === 'user');
      const children = getFieldChildren(userField.namedType, 'Query.user');

      expect(children.isCircular).toBe(false);
      const names = children.fields.map((f) => f.name);
      expect(names).toContain('id');
      expect(names).toContain('name');
      expect(names).toContain('email');
      expect(names).toContain('posts');
      expect(names).toContain('friends');
    });

    it('should build correct paths for children', () => {
      const fields = getRootFields(BASIC_SCHEMA, 'Query');
      const userField = fields.find((f) => f.name === 'user');
      const children = getFieldChildren(userField.namedType, 'Query.user');

      const nameChild = children.fields.find((f) => f.name === 'name');
      expect(nameChild.path).toBe('Query.user.name');
    });

    it('should detect circular types', () => {
      const fields = getRootFields(BASIC_SCHEMA, 'Query');
      const userField = fields.find((f) => f.name === 'user');
      const visited = new Set(['User']);
      const children = getFieldChildren(userField.namedType, 'Query.user', visited);

      expect(children.fields).toEqual([]);
      expect(children.isCircular).toBe(true);
    });

    it('should return union types for union fields', () => {
      const fields = getRootFields(BASIC_SCHEMA, 'Query');
      const searchField = fields.find((f) => f.name === 'search');
      const children = getFieldChildren(searchField.namedType, 'Query.search');

      expect(children.fields).toEqual([]);
      expect(children.unionTypes).toHaveLength(2);
      expect(children.unionTypes[0].name).toBe('User');
      expect(children.unionTypes[0].path).toBe('Query.search.__on_User');
      expect(children.unionTypes[0].isUnionMember).toBe(true);
      expect(children.unionTypes[1].name).toBe('Post');
      expect(children.unionTypes[1].path).toBe('Query.search.__on_Post');
    });

    it('should return empty for null type', () => {
      expect(getFieldChildren(null, 'Query.foo')).toEqual({ fields: [], isCircular: false });
    });
  });

  describe('getInputObjectFields', () => {
    it('should return fields of an input object type', () => {
      const mutationFields = getRootFields(BASIC_SCHEMA, 'Mutation');
      const createUser = mutationFields.find((f) => f.name === 'createUser');
      const inputType = createUser.args[0].namedType;
      const fields = getInputObjectFields(inputType);

      const names = fields.map((f) => f.name);
      expect(names).toEqual(['name', 'email', 'age', 'address']);
    });

    it('should identify nested input object fields', () => {
      const mutationFields = getRootFields(BASIC_SCHEMA, 'Mutation');
      const createUser = mutationFields.find((f) => f.name === 'createUser');
      const inputType = createUser.args[0].namedType;
      const fields = getInputObjectFields(inputType);

      const addressField = fields.find((f) => f.name === 'address');
      expect(addressField.isInputObject).toBe(true);
      expect(addressField.typeLabel).toBe('AddressInput');
    });

    it('should identify required fields', () => {
      const mutationFields = getRootFields(BASIC_SCHEMA, 'Mutation');
      const createUser = mutationFields.find((f) => f.name === 'createUser');
      const inputType = createUser.args[0].namedType;
      const fields = getInputObjectFields(inputType);

      expect(fields.find((f) => f.name === 'name').isRequired).toBe(true);
      expect(fields.find((f) => f.name === 'email').isRequired).toBe(true);
      expect(fields.find((f) => f.name === 'age').isRequired).toBe(false);
    });

    it('should return empty for null type', () => {
      expect(getInputObjectFields(null)).toEqual([]);
    });

    it('should return empty for non-input-object type', () => {
      const fields = getRootFields(BASIC_SCHEMA, 'Query');
      const userField = fields.find((f) => f.name === 'user');
      expect(getInputObjectFields(userField.namedType)).toEqual([]);
    });
  });

  describe('validateQueryForSync', () => {
    it('should accept valid single named query', () => {
      expect(validateQueryForSync('query GetUser { user { id } }')).toEqual({ valid: true, error: null });
    });

    it('should accept valid single named mutation', () => {
      expect(validateQueryForSync('mutation CreateUser { createUser { id } }')).toEqual({ valid: true, error: null });
    });

    it('should accept empty/null query', () => {
      expect(validateQueryForSync('')).toEqual({ valid: true, error: null });
      expect(validateQueryForSync(null)).toEqual({ valid: true, error: null });
      expect(validateQueryForSync('   ')).toEqual({ valid: true, error: null });
    });

    it('should reject multiple operations of the same type', () => {
      const result = validateQueryForSync('query A { user { id } } query B { post { id } }');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('multiple_operations');
    });

    it('should reject mixed operation types (query + mutation)', () => {
      const result = validateQueryForSync('query A { user { id } } mutation B { createUser { id } }');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('multiple_operations');
    });

    it('should reject mixed operation types (query + subscription)', () => {
      const result = validateQueryForSync('query A { user { id } } subscription B { onUserCreated { id } }');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('multiple_operations');
    });

    it('should return valid false with no error for invalid syntax', () => {
      const result = validateQueryForSync('this is not graphql');
      expect(result.valid).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should handle queries with empty selection sets', () => {
      const result = validateQueryForSync('query Test { user {} }');
      expect(result.valid).toBe(true);
    });

    it('should handle queries with empty args', () => {
      const result = validateQueryForSync('query Test { user() { id } }');
      expect(result.valid).toBe(true);
    });
  });

  describe('generateQueryString', () => {
    it('should return empty for no selections', () => {
      const result = generateQueryString(new Set(), new Map(), BASIC_SCHEMA, 'Query', new Set());
      expect(result).toEqual({ query: '', variables: {} });
    });

    it('should return empty for null schema', () => {
      const result = generateQueryString(new Set(['Query.user']), new Map(), null, 'Query', new Set());
      expect(result).toEqual({ query: '', variables: {} });
    });

    it('should generate a simple query with leaf fields', () => {
      const selections = new Set(['Query.user', 'Query.user.id', 'Query.user.name']);
      const result = generateQueryString(selections, new Map(), BASIC_SCHEMA, 'Query', new Set());

      expect(result.query).toContain('query');
      expect(result.query).toContain('user');
      expect(result.query).toContain('id');
      expect(result.query).toContain('name');
      expect(result.variables).toEqual({});
    });

    it('should auto-generate operation name from first field', () => {
      const selections = new Set(['Query.user', 'Query.user.id']);
      const result = generateQueryString(selections, new Map(), BASIC_SCHEMA, 'Query', new Set());

      expect(result.query).toMatch(/query User/);
    });

    it('should use existing operation name when provided', () => {
      const selections = new Set(['Query.user', 'Query.user.id']);
      const result = generateQueryString(selections, new Map(), BASIC_SCHEMA, 'Query', new Set(), 'MyCustomQuery');

      expect(result.query).toMatch(/query MyCustomQuery/);
    });

    it('should generate mutation operation type', () => {
      const selections = new Set(['Mutation.deleteUser']);
      const result = generateQueryString(selections, new Map(), BASIC_SCHEMA, 'Mutation', new Set());

      expect(result.query).toMatch(/mutation/);
    });

    it('should generate variables for enabled args', () => {
      const selections = new Set(['Query.user', 'Query.user.id', 'Query.user.name']);
      const enabledArgs = new Set(['Query.user.id']);
      const argValues = new Map([['Query.user.id', '123']]);
      const result = generateQueryString(selections, argValues, BASIC_SCHEMA, 'Query', enabledArgs);

      expect(result.query).toContain('$id');
      expect(result.query).toContain('ID!');
      expect(result.query).toContain('id: $id');
      expect(result.variables.id).toBe('123');
    });

    it('should coerce Int values', () => {
      const selections = new Set(['Query.users']);
      const enabledArgs = new Set(['Query.users.limit']);
      const argValues = new Map([['Query.users.limit', '10']]);
      const result = generateQueryString(selections, argValues, BASIC_SCHEMA, 'Query', enabledArgs);

      expect(result.variables.limit).toBe(10);
    });

    it('should coerce Boolean values', () => {
      const schema = buildSchema(`type Query { flag(active: Boolean!): String }`);
      const selections = new Set(['Query.flag']);
      const enabledArgs = new Set(['Query.flag.active']);
      const argValues = new Map([['Query.flag.active', 'true']]);
      const result = generateQueryString(selections, argValues, schema, 'Query', enabledArgs);

      expect(result.variables.active).toBe(true);
    });

    it('should handle multiple selected fields', () => {
      const selections = new Set([
        'Query.user', 'Query.user.id', 'Query.user.name',
        'Query.post', 'Query.post.title'
      ]);
      const result = generateQueryString(selections, new Map(), BASIC_SCHEMA, 'Query', new Set());

      expect(result.query).toContain('user');
      expect(result.query).toContain('post');
      expect(result.query).toContain('title');
    });

    it('should handle nested non-leaf fields with __typename fallback', () => {
      // Select user.posts but no children of posts
      const selections = new Set(['Query.user', 'Query.user.posts']);
      const result = generateQueryString(selections, new Map(), BASIC_SCHEMA, 'Query', new Set());

      // posts should still be in the query (with __typename fallback, which gets stripped)
      expect(result.query).toContain('posts');
    });

    it('should handle union types with inline fragments', () => {
      const selections = new Set([
        'Query.search',
        'Query.search.__on_User',
        'Query.search.__on_User.name',
        'Query.search.__on_Post',
        'Query.search.__on_Post.title'
      ]);
      const enabledArgs = new Set(['Query.search.query']);
      const argValues = new Map([['Query.search.query', 'test']]);
      const result = generateQueryString(selections, argValues, BASIC_SCHEMA, 'Query', enabledArgs);

      expect(result.query).toContain('... on User');
      expect(result.query).toContain('... on Post');
      expect(result.query).toContain('name');
      expect(result.query).toContain('title');
    });

    it('should disambiguate duplicate variable names', () => {
      const selections = new Set([
        'Query.user', 'Query.user.id',
        'Query.post', 'Query.post.id'
      ]);
      const enabledArgs = new Set(['Query.user.id', 'Query.post.id']);
      const argValues = new Map([
        ['Query.user.id', '1'],
        ['Query.post.id', '2']
      ]);
      const result = generateQueryString(selections, argValues, BASIC_SCHEMA, 'Query', enabledArgs);

      // Both should have variables, and they should be disambiguated
      const varMatches = result.query.match(/\$\w+/g) || [];
      const uniqueVars = new Set(varMatches);
      expect(uniqueVars.size).toBeGreaterThanOrEqual(2);
    });

    it('should handle input object arguments with nested fields', () => {
      const selections = new Set(['Mutation.createUser', 'Mutation.createUser.id']);
      const enabledArgs = new Set([
        'Mutation.createUser.input',
        'Mutation.createUser.input.name',
        'Mutation.createUser.input.email'
      ]);
      const argValues = new Map([
        ['Mutation.createUser.input.name', 'Alice'],
        ['Mutation.createUser.input.email', 'alice@test.com']
      ]);
      const result = generateQueryString(selections, argValues, BASIC_SCHEMA, 'Mutation', enabledArgs);

      expect(result.query).toContain('input:');
      expect(result.query).toContain('$name');
      expect(result.query).toContain('$email');
      expect(result.variables.name).toBe('Alice');
      expect(result.variables.email).toBe('alice@test.com');
    });
  });

  describe('parseQueryToState', () => {
    it('should return null for null schema', () => {
      expect(parseQueryToState('query Test { user { id } }', null)).toBeNull();
    });

    it('should return empty state for empty query', () => {
      const result = parseQueryToState('', BASIC_SCHEMA);
      expect(result.selections.size).toBe(0);
      expect(result.expandedPaths.size).toBe(0);
    });

    it('should return null for unparseable query', () => {
      expect(parseQueryToState('this is not graphql', BASIC_SCHEMA)).toBeNull();
    });

    it('should parse a simple query', () => {
      const state = parseQueryToState('query GetUser { user { id name } }', BASIC_SCHEMA);

      expect(state.selections.has('Query.user')).toBe(true);
      expect(state.selections.has('Query.user.id')).toBe(true);
      expect(state.selections.has('Query.user.name')).toBe(true);
      expect(state.expandedPaths.has('Query.user')).toBe(true);
    });

    it('should parse nested selections', () => {
      const state = parseQueryToState(`
        query GetUser {
          user {
            id
            posts {
              title
            }
          }
        }
      `, BASIC_SCHEMA);

      expect(state.selections.has('Query.user')).toBe(true);
      expect(state.selections.has('Query.user.posts')).toBe(true);
      expect(state.selections.has('Query.user.posts.title')).toBe(true);
      expect(state.expandedPaths.has('Query.user')).toBe(true);
      expect(state.expandedPaths.has('Query.user.posts')).toBe(true);
    });

    it('should parse arguments with variable references', () => {
      const query = 'query GetUser($id: ID!) { user(id: $id) { name } }';
      const variables = JSON.stringify({ id: '123' });
      const state = parseQueryToState(query, BASIC_SCHEMA, variables);

      expect(state.enabledArgs.has('Query.user.id')).toBe(true);
      expect(state.argValues.get('Query.user.id')).toBe('123');
    });

    it('should parse inline argument values', () => {
      const state = parseQueryToState(`
        query GetUsers {
          users(limit: 10) {
            id
          }
        }
      `, BASIC_SCHEMA);

      expect(state.enabledArgs.has('Query.users.limit')).toBe(true);
      expect(state.argValues.get('Query.users.limit')).toBe('10');
    });

    it('should parse mutation operations', () => {
      const state = parseQueryToState('mutation Delete { deleteUser(id: "1") }', BASIC_SCHEMA);
      expect(state.selections.has('Mutation.deleteUser')).toBe(true);
      expect(state.enabledArgs.has('Mutation.deleteUser.id')).toBe(true);
    });

    it('should parse inline fragments for union types', () => {
      const query = `
        query Search($query: String!) {
          search(query: $query) {
            ... on User { name }
            ... on Post { title }
          }
        }
      `;
      const variables = JSON.stringify({ query: 'test' });
      const state = parseQueryToState(query, BASIC_SCHEMA, variables);

      expect(state.selections.has('Query.search')).toBe(true);
      expect(state.selections.has('Query.search.__on_User')).toBe(true);
      expect(state.selections.has('Query.search.__on_User.name')).toBe(true);
      expect(state.selections.has('Query.search.__on_Post')).toBe(true);
      expect(state.selections.has('Query.search.__on_Post.title')).toBe(true);
    });

    it('should parse input object arguments', () => {
      const query = `
        mutation CreateUser($name: String!, $email: String!) {
          createUser(input: { name: $name, email: $email }) {
            id
          }
        }
      `;
      const variables = JSON.stringify({ name: 'Alice', email: 'alice@test.com' });
      const state = parseQueryToState(query, BASIC_SCHEMA, variables);

      expect(state.enabledArgs.has('Mutation.createUser.input')).toBe(true);
      expect(state.enabledArgs.has('Mutation.createUser.input.name')).toBe(true);
      expect(state.enabledArgs.has('Mutation.createUser.input.email')).toBe(true);
      expect(state.argValues.get('Mutation.createUser.input.name')).toBe('Alice');
      expect(state.argValues.get('Mutation.createUser.input.email')).toBe('alice@test.com');
    });

    it('should handle empty selection sets', () => {
      const state = parseQueryToState('query Test { user {} }', BASIC_SCHEMA);
      expect(state).not.toBeNull();
      expect(state.selections.has('Query.user')).toBe(true);
    });

    it('should handle queries with empty args', () => {
      const state = parseQueryToState('query Test { user() { id } }', BASIC_SCHEMA);
      expect(state).not.toBeNull();
    });

    it('should skip __typename fields', () => {
      const state = parseQueryToState('query Test { user { __typename id } }', BASIC_SCHEMA);
      expect(state.selections.has('Query.user.__typename')).toBe(false);
      expect(state.selections.has('Query.user.id')).toBe(true);
    });
  });

  describe('roundtrip: generate then parse', () => {
    it('should roundtrip a simple query', () => {
      const selections = new Set(['Query.user', 'Query.user.id', 'Query.user.name']);
      const generated = generateQueryString(selections, new Map(), BASIC_SCHEMA, 'Query', new Set());
      const parsed = parseQueryToState(generated.query, BASIC_SCHEMA);

      expect(parsed.selections.has('Query.user')).toBe(true);
      expect(parsed.selections.has('Query.user.id')).toBe(true);
      expect(parsed.selections.has('Query.user.name')).toBe(true);
    });

    it('should roundtrip a query with arguments', () => {
      const selections = new Set(['Query.user', 'Query.user.id', 'Query.user.name']);
      const enabledArgs = new Set(['Query.user.id']);
      const argValues = new Map([['Query.user.id', '42']]);
      const generated = generateQueryString(selections, argValues, BASIC_SCHEMA, 'Query', enabledArgs);

      const varsJson = JSON.stringify(generated.variables);
      const parsed = parseQueryToState(generated.query, BASIC_SCHEMA, varsJson);

      expect(parsed.selections.has('Query.user')).toBe(true);
      expect(parsed.enabledArgs.has('Query.user.id')).toBe(true);
      expect(parsed.argValues.get('Query.user.id')).toBe('42');
    });

    it('should roundtrip a mutation with input object', () => {
      const selections = new Set(['Mutation.createUser', 'Mutation.createUser.id']);
      const enabledArgs = new Set([
        'Mutation.createUser.input',
        'Mutation.createUser.input.name',
        'Mutation.createUser.input.email',
        'Mutation.createUser.input.address',
        'Mutation.createUser.input.address.city'
      ]);
      const argValues = new Map([
        ['Mutation.createUser.input.name', 'Bob'],
        ['Mutation.createUser.input.email', 'bob@test.com'],
        ['Mutation.createUser.input.address.city', 'NYC']
      ]);

      const generated = generateQueryString(selections, argValues, BASIC_SCHEMA, 'Mutation', enabledArgs);
      const varsJson = JSON.stringify(generated.variables);
      const parsed = parseQueryToState(generated.query, BASIC_SCHEMA, varsJson);

      expect(parsed.enabledArgs.has('Mutation.createUser.input')).toBe(true);
      expect(parsed.enabledArgs.has('Mutation.createUser.input.name')).toBe(true);
      expect(parsed.enabledArgs.has('Mutation.createUser.input.email')).toBe(true);
      expect(parsed.enabledArgs.has('Mutation.createUser.input.address')).toBe(true);
      expect(parsed.enabledArgs.has('Mutation.createUser.input.address.city')).toBe(true);
      expect(parsed.argValues.get('Mutation.createUser.input.name')).toBe('Bob');
      expect(parsed.argValues.get('Mutation.createUser.input.email')).toBe('bob@test.com');
      expect(parsed.argValues.get('Mutation.createUser.input.address.city')).toBe('NYC');
    });

    it('should roundtrip a query with union types', () => {
      const selections = new Set([
        'Query.search',
        'Query.search.__on_User',
        'Query.search.__on_User.name',
        'Query.search.__on_Post',
        'Query.search.__on_Post.title'
      ]);
      const enabledArgs = new Set(['Query.search.query']);
      const argValues = new Map([['Query.search.query', 'hello']]);

      const generated = generateQueryString(selections, argValues, BASIC_SCHEMA, 'Query', enabledArgs);
      const varsJson = JSON.stringify(generated.variables);
      const parsed = parseQueryToState(generated.query, BASIC_SCHEMA, varsJson);

      expect(parsed.selections.has('Query.search.__on_User')).toBe(true);
      expect(parsed.selections.has('Query.search.__on_User.name')).toBe(true);
      expect(parsed.selections.has('Query.search.__on_Post')).toBe(true);
      expect(parsed.selections.has('Query.search.__on_Post.title')).toBe(true);
    });
  });
});
