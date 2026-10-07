import type { Page } from '@playwright/test';
import { closeEnvironmentPanel, openEnvironmentConfigTab, setEnvironmentSecrets } from '../../utils/page';

// `echo` and `workspace-vars` assert the whole environment they resolved, secret rows included, so
// the values below have to be in the secret store before either request goes out. The CLI suite
// runs the same two requests and injects the same values with `--env-var` / `--global-env-var`,
// which is the only way a `bru run` can give a secret a value.
export const BASE_SECRETS = { base_token: 'token-from-base', base_secret_object: '{"scope":"admin"}' };
export const SECRET_REDECLARED_AS_NON_SECRET = { overridden_secret: 'secret-from-base' };
export const DEV_SECRETS = { overridden_plain: 'secret-from-dev' };

export const WORKSPACE_BASE_SECRETS = {
  workspace_token: 'token-from-workspace-base',
  workspace_secret_object: '{"scope":"admin"}'
};
export const WORKSPACE_SECRET_REDECLARED_AS_NON_SECRET = {
  workspace_overridden_secret: 'secret-from-workspace-base'
};
export const WORKSPACE_DEV_SECRETS = { workspace_overridden_plain: 'secret-from-workspace-dev' };

export const seedEchoSecrets = async (page: Page) => {
  await openEnvironmentConfigTab(page);
  await setEnvironmentSecrets(page, 'base', { ...BASE_SECRETS, ...SECRET_REDECLARED_AS_NON_SECRET });
  await setEnvironmentSecrets(page, 'dev', DEV_SECRETS);
  await closeEnvironmentPanel(page);
};

export const seedWorkspaceVarsSecrets = async (page: Page) => {
  await openEnvironmentConfigTab(page, 'global');
  await setEnvironmentSecrets(
    page,
    'workspace_base',
    { ...WORKSPACE_BASE_SECRETS, ...WORKSPACE_SECRET_REDECLARED_AS_NON_SECRET },
    'global'
  );
  await setEnvironmentSecrets(page, 'workspace_dev', WORKSPACE_DEV_SECRETS, 'global');
  await closeEnvironmentPanel(page, 'global');
};
