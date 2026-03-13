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

        type Query {
          company: Company
        }
      `,
      resolvers: {
        Query: {
          company: () => ({
            ceo: 'Elon Musk',
            name: 'SpaceX',
            founder: 'Elon Musk'
          })
        }
      }
    }),
    graphqlEndpoint: '/api/graphql'
  });

  app.use(yoga.graphqlEndpoint, yoga);
};

module.exports = setupGraphQL;
