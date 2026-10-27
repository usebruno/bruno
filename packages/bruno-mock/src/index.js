const mockServer = require('./mock-server');
const mockServerStore = require('./mock-server-store');
const mockRuleMatcher = require('./mock-rule-matcher');
const mockResponseRoutes = require('./mock-response-routes');
const mockSpecRoutes = require('./mock-spec-routes');
const mockExampleGenerator = require('./mock-example-generator');

module.exports = {
  mockServer,
  ...mockServerStore,
  ...mockRuleMatcher,
  ...mockResponseRoutes,
  ...mockSpecRoutes,
  ...mockExampleGenerator
};
