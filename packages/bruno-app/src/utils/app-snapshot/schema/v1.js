import { z } from 'zod';

/**
 * Snapshot Schema v1
 *
 * This is the initial versioned schema for app snapshots.
 * It captures the UI state that should be restored on app restart.
 */

const tabRequestSchema = z.object({
  tab: z.string().nullable(),
  width: z.number(),
  height: z.number()
});

const tabResponseSchema = z.object({
  tab: z.string(),
  format: z.string().nullable(),
  preview: z.boolean()
});

const tabSchema = z.object({
  type: z.enum(['preferences', 'runner', 'variables', 'collection', 'environment', 'global-environment', 'item']),
  permanent: z.boolean(),
  itemPath: z.string().optional(),
  layout: z.enum(['vertical', 'horizontal']).optional(),
  request: tabRequestSchema.optional(),
  response: tabResponseSchema.optional()
});

const collectionSchema = z.object({
  pathname: z.string(),
  isMounted: z.boolean(),
  isOpen: z.boolean(),
  environment: z.string().nullable(),
  tabs: z.array(tabSchema),
  activeTabIndex: z.number()
});

const workspaceSchema = z.object({
  pathname: z.string(),
  collections: z.array(collectionSchema)
});

const devToolsSchema = z.object({
  open: z.boolean(),
  tab: z.string(),
  height: z.number()
});

const extrasSchema = z.object({
  devTools: devToolsSchema
});

/**
 * The complete v1 snapshot schema
 */
export const schema = z.object({
  version: z.literal(1),
  activeWorkspacePathname: z.string().nullable(),
  workspaces: z.array(workspaceSchema),
  collections: z.array(collectionSchema),
  extras: extrasSchema
});

/**
 * Migration function from v1 to v2
 * Returns null since v1 is currently the latest version.
 * When v2 is created, implement the migration logic here.
 *
 * @param {object} snapshot - A valid v1 snapshot
 * @returns {object} A valid v2 snapshot
 */
export const migrate = null;
