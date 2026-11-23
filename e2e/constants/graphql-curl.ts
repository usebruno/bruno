const VARIABLES = { companyId: 42, filter: { active: true } };

export const GRAPHQL_CURL_URL = 'http://localhost:8081/api/graphql';
export const GRAPHQL_CURL_QUERY = 'query Company {\n  company {\n    ceo\n  }\n}';

/**
 * The variables of GRAPHQL_CURL as the GraphQL Variables editor shows them.
 */
export const GRAPHQL_CURL_VARIABLES_EDITOR_TEXT = '{\n  "companyId": 42,\n  "filter": {\n    "active": true\n  }\n}';

/**
 * The variables of GRAPHQL_CURL as Generate Code writes them into the request body.
 */
export const GRAPHQL_CURL_EXPORTED_VARIABLES = '"variables":{"companyId":42,"filter":{"active":true}}';

const buildGraphqlCurl = (variables: unknown) => `curl --request POST \\
  --url ${GRAPHQL_CURL_URL} \\
  --header 'Content-Type: application/json' \\
  --data '${JSON.stringify({ query: GRAPHQL_CURL_QUERY, variables })}'`;

/**
 * A GraphQL cURL with `variables` as a JSON object, the shape Generate Code exports.
 */
export const GRAPHQL_CURL = buildGraphqlCurl(VARIABLES);

/**
 * GRAPHQL_CURL with `variables` as a JSON-encoded string, the shape Bruno v4.3.0 and earlier exported.
 */
export const STRING_VARIABLES_GRAPHQL_CURL = buildGraphqlCurl(JSON.stringify(VARIABLES));
