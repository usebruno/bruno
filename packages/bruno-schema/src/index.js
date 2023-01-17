const { workspaceSchema } = require("./workspaces");
const { collectionSchema, itemSchema, environmentSchema, environmentsSchema } = require("./collections");

module.exports = {
  itemSchema,
  environmentSchema,
  environmentsSchema,
  collectionSchema,
  workspaceSchema
};