import { z } from 'zod';

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
  type: z.string(),
  uid: z.string(),
  permanent: z.boolean(),
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

export const schema = z.object({
  version: z.literal(1),
  activeWorkspacePathname: z.string().nullable(),
  workspaces: z.array(workspaceSchema),
  collections: z.array(collectionSchema),
  extras: extrasSchema
});

// Migration to next version (implement when v2 is created)
export const migrate = null;
