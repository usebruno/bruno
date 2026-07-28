// Dynamic import because `graphql-yoga` is a pure ESM module.
const createGraphQLSchema = async () => {
  const { createSchema } = await import('graphql-yoga');

  const clearOnDone = async function* (iterable, onDone) {
    try {
      for await (const value of iterable) {
        yield value;
      }
    } finally {
      onDone();
    }
  };

  const intervalIterator = (intervalMs, mapValue) => {
    let count = 0;
    const queue = [];
    let resolveNext;

    const handle = setInterval(() => {
      const value = mapValue(count++);
      if (resolveNext) {
        resolveNext({ value, done: false });
        resolveNext = null;
      } else {
        queue.push(value);
      }
    }, intervalMs);

    return clearOnDone({
      [Symbol.asyncIterator]() {
        return {
          next() {
            if (queue.length) {
              return Promise.resolve({ value: queue.shift(), done: false });
            }
            return new Promise((resolve) => {
              resolveNext = resolve;
            });
          },
          return() {
            clearInterval(handle);
            return Promise.resolve({ value: undefined, done: true });
          }
        };
      }
    }, () => clearInterval(handle));
  };

  return createSchema({
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

      type Company {
        ceo: String
        name: String
        founder: String
      }

      input ICreate {
        id: String!
      }

      type Message {
        success: Boolean
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

      type Tick {
        count: Int!
      }

      type Query {
        company: Company
        user(id: ID!): User
        users(limit: Int, offset: Int): [User!]!
        post(id: ID!): Post
        search(term: String!): [SearchResult!]!
      }

      type Mutation {
        create(payload: ICreate!): Message
        createUser(input: CreateUserInput!): User!
        updateUser(id: ID!, input: UpdateUserInput!): User
        deleteUser(id: ID!): Boolean!
        createPost(input: CreatePostInput!): Post!
      }

      type Subscription {
        "Ticks forever, once per second, until unsubscribed."
        counter: Tick!
        "Ticks 3 times then completes (server-initiated complete)."
        countdown: Tick!
        "Ticks with an object payload, once per second, forever."
        ticker: Tick!
        "Ticks twice, then throws mid-stream — graphql-ws's reference server closes the socket with 4500 for an uncaught source-iterable error (a genuinely different case from a validation error against a malformed query, which instead sends a per-operation \`error\` message and leaves the socket open)."
        failing: Tick!
        "Completes immediately with no payload — a zero-message subscription."
        immediate: Tick!
        "Emits a next payload carrying non-fatal field errors alongside data."
        fieldErrors: Tick!
        "Emits frames as fast as possible to exercise the client's batching path."
        flood: Tick!
      }
    `,
    resolvers: {
      Query: {
        company: () => ({
          ceo: 'Elon Musk',
          name: 'SpaceX',
          founder: 'Elon Musk'
        }),
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
        create: () => ({
          success: true
        }),
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
      },
      Subscription: {
        counter: {
          subscribe: () => intervalIterator(1000, (count) => ({ counter: { count } }))
        },
        countdown: {
          subscribe: async function* () {
            try {
              for (let count = 3; count >= 1; count--) {
                await new Promise((resolve) => setTimeout(resolve, 300));
                yield { countdown: { count } };
              }
            } finally {
              // Nothing to clear — setTimeout already ran to completion — but
              // every generator here follows the same try/finally shape so an
              // early unsubscribe (a thrown `return()`) never leaks a timer.
            }
          }
        },
        ticker: {
          subscribe: () => intervalIterator(1000, (count) => ({ ticker: { count } }))
        },
        failing: {
          subscribe: async function* () {
            let handle;
            try {
              let count = 0;
              while (true) {
                await new Promise((resolve) => {
                  handle = setTimeout(resolve, 300);
                });
                count++;
                if (count > 2) {
                  throw new Error('Simulated mid-stream subscription failure');
                }
                yield { failing: { count } };
              }
            } finally {
              clearTimeout(handle);
            }
          }
        },
        immediate: {
          subscribe: async function* () {
            // An async generator that returns without yielding completes the
            // operation with no `next` frames at all.
            return;
          }
        },
        fieldErrors: {
          subscribe: () => intervalIterator(1000, (count) => ({ fieldErrors: { count } })),
          resolve: (payload) => {
            throw new Error('Simulated non-fatal field error');
          }
        },
        flood: {
          subscribe: async function* () {
            let count = 0;
            try {
              while (true) {
                yield { flood: { count: count++ } };
                // Yield to the event loop without imposing real inter-message
                // delay, so frames arrive back-to-back and exercise batching.
                await new Promise((resolve) => setImmediate(resolve));
              }
            } finally {
              // No timer/interval to clear for this generator.
            }
          }
        }
      }
    }
  });
};

module.exports = { createGraphQLSchema };
