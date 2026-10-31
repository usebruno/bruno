/**
 * Single entry point for page objects used by specs.
 *
 * Temporarily re-exports the legacy page layer from tests/utils/page,
 * along with page objects missing from its barrel. Once migration is
 * complete, only local page objects will be exported.
 */

export * from '../../tests/utils/page';
export * from './api-spec';
export * from './response-example';
export * from './request-tabs';
export * from './response-timeline';
export * from './app-shell/title-bar';
export * from './app-shell/devtools';
export * from './app-shell/network-log';
export * from './app-shell/toast';
export * from './collection/header';
export * from './collection/docs';
export * from './collection/proxy';
export * from './collection/manage';
export * from './collection/import';
export * from './collection/export';
export * from './collection/settings';
export * from './folder/settings';
export * from './environment/environment';
export * from './environment/selector';
export * from './environment/settings';
export * from './environment/variables';
export * from './shared-ui/code-editor';
export * from './shared-ui/data-type-selector';
export * from './shared-ui/modal';
export * from './shared-ui/dropdown';
export * from './shared-ui/pane-tabs';
export * from './shared-ui/tags';
export * from './variable/secret-form';
export * from './workspace/create-workspace-modal';
export * from './workspace/import-workspace';
export * from './workspace/manage-workspace';
export * from './workspace/remove-workspace-modal';
export * from './workspace/rename-workspace-modal';
export * from './workspace/workspace-overview';
export * from './workspace/workspace';
export * from './request/app';
export * from './shared-ui/code-editor-links';
export * from './variable/tooltip';
export * from './shared-ui/virtual-list';
