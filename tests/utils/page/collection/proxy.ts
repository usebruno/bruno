import { Page, expect } from '../../../../playwright';

export type CollectionProxyField = 'hostname' | 'port' | 'username' | 'password';

const COLLECTION_PROXY_FIELD_TEST_IDS: Record<CollectionProxyField, string> = {
  hostname: 'collection-proxy-hostname',
  port: 'collection-proxy-port',
  username: 'collection-proxy-username',
  password: 'collection-proxy-password'
};

export const buildCollectionProxyLocators = (page: Page) => ({
  field: (field: CollectionProxyField) => page.getByTestId(COLLECTION_PROXY_FIELD_TEST_IDS[field]),
  /** A "Proxy mode" option; checked when that mode is selected */
  mode: (option: 'Inherit' | 'Custom' | 'Off') =>
    page.getByTestId('collection-proxy-mode').getByRole('radio', { name: option, exact: true }),
  /** Protocol dropdown trigger; its text is the selected protocol label (e.g. 'SOCKS5') */
  protocol: () => page.getByTestId('collection-proxy-protocol'),
  /** "Proxy authentication" checkbox input */
  authCheckbox: () => page.getByTestId('collection-proxy-auth')
});

/** Read the selected collection proxy protocol label (e.g. 'HTTP', 'SOCKS5'). */
export const readCollectionProxyProtocol = async (page: Page): Promise<string> => {
  const trigger = buildCollectionProxyLocators(page).protocol();
  // No waitFor: callers poll this, so a miss returns '' and the poll retries
  if (!(await trigger.isVisible())) return '';
  return (await trigger.innerText()).trim();
};

/** Read a collection proxy hostname, port, username, or password field. */
export const readCollectionProxyField = async (page: Page, field: CollectionProxyField): Promise<string> => {
  const root = buildCollectionProxyLocators(page).field(field);
  await root.waitFor({ state: 'visible' });

  if (field === 'port') {
    return root.inputValue();
  }

  const editor = root.locator('.CodeMirror').first();
  await editor.waitFor({ state: 'visible' });
  return editor.evaluate((el: any) => (el as any).CodeMirror?.getValue() ?? '');
};

/** Set a collection proxy hostname, port, username, or password field. */
export const writeCollectionProxyField = async (page: Page, field: CollectionProxyField, value: string) => {
  const root = buildCollectionProxyLocators(page).field(field);
  await root.waitFor({ state: 'visible' });

  if (field === 'port') {
    await root.fill(value);
    await expect.poll(() => root.inputValue()).toBe(value);
    return;
  }

  const editor = root.locator('.CodeMirror').first();
  await editor.waitFor({ state: 'visible' });
  await editor.evaluate((el: any, nextValue: string) => {
    el.CodeMirror?.setValue(nextValue);
  }, value);
  await expect.poll(() => readCollectionProxyField(page, field)).toBe(value);
};
