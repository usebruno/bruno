import { expect, Page, Locator } from '../../playwright';
import { buildGrpcLocators } from '../request/grpc';
import { buildRequestLocators } from '../request/pane';

export type LinkAwareRequestType = 'http' | 'graphql' | 'grpc' | 'ws';

// Name of the committed sample collection used by the link-aware specs.
export const LINK_AWARE_COLLECTION_NAME = 'codemirror-linkaware';

// Cmd on macOS, Ctrl elsewhere — matches isCmdOrCtrlPressed() in linkAware.js.
export const LINK_CLICK_MODIFIER: 'Meta' | 'Control' = process.platform === 'darwin' ? 'Meta' : 'Control';

export const LINK_AWARE_METHOD_LABEL: Record<LinkAwareRequestType, string | null> = {
  http: null, // HTTP shows the verb (GET/POST/...), not a fixed label
  graphql: 'GQL',
  grpc: 'gRPC',
  ws: 'WS'
};

export const linkAwareUrlBarCm = (page: Page, type: LinkAwareRequestType): Locator =>
  type === 'grpc'
    ? buildGrpcLocators(page).request.queryUrlContainer().locator('.CodeMirror')
    : buildRequestLocators(page).urlInput();

/** Asserts the currently active tab is a freshly-created transient request of the given type. */
export const expectTransientRequestOpened = async (page: Page, opts: { type: LinkAwareRequestType; url?: string }) => {
  const tab = page.locator('.request-tab.active');
  await expect(tab).toContainText('Untitled', { timeout: 10000 });

  const expectedLabel = LINK_AWARE_METHOD_LABEL[opts.type];
  if (expectedLabel) {
    await expect(tab.locator('.tab-method')).toHaveText(expectedLabel, { timeout: 5000 });
  } else {
    await expect(tab.locator('.tab-method')).not.toHaveText('', { timeout: 5000 });
  }

  if (opts.url && opts.type !== 'ws') {
    await expect.poll(
      () => linkAwareUrlBarCm(page, opts.type).evaluate((el: any) => el.CodeMirror?.getValue() ?? ''),
      { timeout: 5000 }
    ).toBe(opts.url);
  }
};

/** Plain click on the marked link — asserts a new transient request of `type` opens with `url`. */
export const expectLinkOpensRequest = async (page: Page, cm: Locator, opts: { type: LinkAwareRequestType; url: string }) => {
  const link = cm.locator('.CodeMirror-link').first();
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  await expectTransientRequestOpened(page, opts);
};

/** Modifier+click on the marked link — must fall back to "open externally", no new tab. */
export const expectLinkOpensExternally = async (page: Page, cm: Locator) => {
  const link = cm.locator('.CodeMirror-link').first();
  await expect(link).toBeVisible({ timeout: 10000 });
  const tabCountBefore = await page.locator('.request-tab').count();
  await link.click({ modifiers: [LINK_CLICK_MODIFIER] });
  await page.waitForTimeout(300); // no new-tab locator to await — asserting absence of change
  await expect(page.locator('.request-tab')).toHaveCount(tabCountBefore);
};

/**
 * Editable fields (Params, Vars, Headers, ...) only mark URLs and let Cmd/Ctrl+Click open them
 * externally — a plain click just places the cursor, matching the URL bar's pre-existing
 * behaviour. Click-to-open-as-a-request is reserved for response previews.
 */
export const expectLinkDoesNotOpenRequest = async (page: Page, cm: Locator) => {
  const link = cm.locator('.CodeMirror-link').first();
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  await expect(cm).toContainClass('CodeMirror-focused');

  await expectLinkOpensExternally(page, cm);
};

/**
 * A URL-looking value must behave as plain text (e.g. `{{var}}`-interpolated, `ws://`, or a
 * field with link-awareness disabled): clicking it — with or without the open-externally
 * modifier — must be handled as a normal text click (CodeMirror focuses and places the
 * cursor), never intercepted to open a transient request.
 */
export const expectNoLink = async (cm: Locator) => {
  await cm.click();
  await expect(cm).toContainClass('CodeMirror-focused');

  await cm.click({ modifiers: [LINK_CLICK_MODIFIER] });
  await expect(cm).toContainClass('CodeMirror-focused');
};
