import fs from 'fs';
import path from 'path';
import { expect, test, waitForReadyPage } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import {
  collectionName,
  openRequest,
  setupBoundActionsData
} from './helpers';

const customShortcutText = {
  sendRequest: process.platform === 'darwin' ? '⇧ + ↩' : 'Shift + Enter',
  newRequest: process.platform === 'darwin' ? '⌥ + N' : 'Alt + N',
  editEnvironment: process.platform === 'darwin' ? '⌥ + E' : 'Alt + E'
};

const writePreferencesWithCustomKeybindings = async (initUserDataPath: string) => {
  await fs.promises.writeFile(
    path.join(initUserDataPath, 'preferences.json'),
    JSON.stringify({
      preferences: {
        onboarding: {
          hasLaunchedBefore: true,
          hasSeenWelcomeModal: true
        },
        keyBindings: {
          sendRequest: {
            mac: 'shift+bind+enter',
            windows: 'shift+bind+enter'
          },
          newRequest: {
            mac: 'alt+bind+n',
            windows: 'alt+bind+n'
          },
          editEnvironment: {
            mac: 'alt+bind+e',
            windows: 'alt+bind+e'
          }
        }
      }
    }),
    'utf8'
  );
};

test.describe('Shortcut Keys - Response Placeholder', () => {
  test('shows shortcut labels from customized keybindings', async ({ launchElectronApp, createTmpDir }) => {
    const initUserDataPath = await createTmpDir('shortcut-placeholder-user-data');
    await writePreferencesWithCustomKeybindings(initUserDataPath);

    const app = await launchElectronApp({ initUserDataPath });
    const page = await waitForReadyPage(app);

    await setupBoundActionsData(page, createTmpDir);
    await openRequest(page, collectionName, 'req-5', { persist: true });

    const placeholder = page.getByTestId('response-placeholder');
    await expect(placeholder).toContainText('Send Request');
    await expect(placeholder).toContainText(customShortcutText.sendRequest);
    await expect(placeholder).toContainText('New Request');
    await expect(placeholder).toContainText(customShortcutText.newRequest);
    await expect(placeholder).toContainText('Edit Environments');
    await expect(placeholder).toContainText(customShortcutText.editEnvironment);

    await closeAllCollections(page);
  });
});
