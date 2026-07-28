const setupGraphQL = async (app, schema) => {
  // Dynamic import because `graphql-yoga` is a pure ESM module.
  const { createYoga } = await import('graphql-yoga');

  const yoga = createYoga({
    schema,
    graphqlEndpoint: '/api/graphql'
  });

  app.use(yoga.graphqlEndpoint, yoga);
};

module.exports = setupGraphQL;
