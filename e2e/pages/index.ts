/**
 * Single entry point for page objects used by specs.
 * Page objects import each other by file path.
 */

// top level
export * from './mock-server';
export * from './runner';

// app-shell
export * from './app-shell/ai-preferences';
export * from './app-shell/preferences';
export * from './app-shell/tabs';
export * from './app-shell/unsaved-changes-modal';

// collection
export * from './collection/collection-run';
export * from './collection/docs';
export * from './collection/export';
export * from './collection/git-clone';
export * from './collection/import';
export * from './collection/manage';
export * from './collection/migrate-to-yml';
export * from './collection/mount';
export * from './collection/proxy';
export * from './collection/remove';
export * from './collection/settings';

// environment
export * from './environment/selector';
export * from './environment/settings';
export * from './environment/variables';

// folder
export * from './folder/settings';

// request
export * from './request/app';
export * from './request/assertions';
export * from './request/auth';
export * from './request/body';
export * from './request/create';
export * from './request/generate-code';
export * from './request/graphql-query-builder';
export * from './request/grpc';
export * from './request/pane';
export * from './request/script';
export * from './request/send';
export * from './request/settings';
export * from './request/websocket';

// response
export * from './response/example';
export * from './response/pane';

// shared-ui
export * from './shared-ui/autocomplete';
export * from './shared-ui/code-editor';
export * from './shared-ui/code-editor-hints';
export * from './shared-ui/code-editor-links';
export * from './shared-ui/code-editor-search';
export * from './shared-ui/dropdown';
export * from './shared-ui/file-mode';
export * from './shared-ui/modal';
export * from './shared-ui/single-line-editor';
export * from './shared-ui/table';
export * from './shared-ui/tags';
export * from './shared-ui/virtual-list';

// sidebar
export * from './sidebar/collection-tree';
export * from './sidebar/item-actions';

// variable
export * from './variable/secret-form';
export * from './variable/set-as-variable';
export * from './variable/tooltip';
export * from './variable/unresolved-info';
export * from './variable/variables-tab';

// workspace
export * from './workspace/workspace';

// buildCommonLocators
export * from './locators';
