const setupGraphQL = async (app) => {
  // Dynamic import because `graphql-yoga` is a pure ESM module.
  const { createYoga, createSchema } = await import('graphql-yoga');

  const yoga = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          name: String!
          email: String!
          age: Int
          posts: [Post!]!
        }

        type Post {
          id: ID!
          title: String!
          body: String!
          author: User!
          comments: [Comment!]!
        }

        type Comment {
          id: ID!
          text: String!
          author: User!
        }

        union SearchResult = User | Post

        input CreateUserInput {
          name: String!
          email: String!
          age: Int
        }

        input UpdateUserInput {
          name: String
          email: String
          age: Int
        }

        input CreatePostInput {
          title: String!
          body: String!
          authorId: ID!
        }

        type Query {
          user(id: ID!): User
          users(limit: Int, offset: Int): [User!]!
          post(id: ID!): Post
          search(term: String!): [SearchResult!]!
        }

        type Mutation {
          createUser(input: CreateUserInput!): User!
          updateUser(id: ID!, input: UpdateUserInput!): User
          deleteUser(id: ID!): Boolean!
          createPost(input: CreatePostInput!): Post!
        }
      `,
      resolvers: {
        Query: {
          user: (_parent, args) => ({
            id: args.id,
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            posts: []
          }),
          users: () => [
            { id: '1', name: 'John Doe', email: 'john@example.com', age: 30, posts: [] },
            { id: '2', name: 'Jane Smith', email: 'jane@example.com', age: 25, posts: [] }
          ],
          post: (_parent, args) => ({
            id: args.id,
            title: 'Test Post',
            body: 'Post body',
            author: { id: '1', name: 'John Doe', email: 'john@example.com', age: 30, posts: [] },
            comments: []
          }),
          search: () => []
        },
        Mutation: {
          createUser: (_parent, { input }) => ({
            id: '3',
            ...input,
            posts: []
          }),
          updateUser: (_parent, { id, input }) => ({
            id,
            name: input.name || 'John Doe',
            email: input.email || 'john@example.com',
            age: input.age || 30,
            posts: []
          }),
          deleteUser: () => true,
          createPost: (_parent, { input }) => ({
            id: '1',
            title: input.title,
            body: input.body,
            author: { id: input.authorId, name: 'John Doe', email: 'john@example.com', age: 30, posts: [] },
            comments: []
          })
        },
        SearchResult: {
          __resolveType: (obj) => (obj.email ? 'User' : 'Post')
        }
      }
    }),
    graphqlEndpoint: '/api/graphql'
  });

  app.use(yoga.graphqlEndpoint, yoga);
};

module.exports = setupGraphQL;
