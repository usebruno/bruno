const setupGraphQL = async (app) => {
  // Dynamic import because `graphql-yoga` is a pure ESM module.
  const { createYoga, createSchema } = await import('graphql-yoga');

  const yoga = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
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

        type Query {
          company: Company
        }
        
        type Mutation {
          create(payload: ICreate!): Message
        }
      `,
      resolvers: {
        Query: {
          company: () => ({
            ceo: 'Elon Musk',
            name: 'SpaceX',
            founder: 'Elon Musk'
          })
        },
        Mutation: {
          create: () => ({
            success: true
          })
        }
      }
    }),
    graphqlEndpoint: '/api/graphql'
  });

  app.use(yoga.graphqlEndpoint, yoga);
};

module.exports = setupGraphQL;
