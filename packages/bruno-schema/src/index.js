const { workspaceSchema } = require("./workspaces");
const { collectionSchema, itemSchema, environmentsSchema } = require("./collections");

module.exports = {
  itemSchema,
  environmentsSchema,
  collectionSchema,
  workspaceSchema,
};
