import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { closeElectronApp, expect, test, waitForReadyPage } from '../../../playwright';
import { buildPreferencesLocators, openBackgroundImagePreferences } from '../../utils/page/preferences';
import { stubOpenDialog } from '../../utils/stubs';
import { version } from '../../../packages/bruno-app/package.json';

test('restores the copied background and preserves existing preferences', async ({ launchElectronApp, createTmpDir }) => {
  test.setTimeout(90_000);
  const userDataPath = await createTmpDir('background-profile');
  const preferencesPath = path.join(userDataPath, 'preferences.json');
  const imageDirectory = path.join(userDataPath, 'background-images');
  const originalFile = path.join(userDataPath, 'wallpaper.png');
  const jpegFile = path.join(userDataPath, 'wallpaper.jpg');
  const invalidFile = path.join(userDataPath, 'corrupt.png');

  await writeFile(preferencesPath, JSON.stringify({
    preferences: {
      general: { defaultLocation: userDataPath },
      onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true, lastSeenVersion: version },
      request: { sslVerification: false },
      display: { zoomPercentage: 100 }
    }
  }));

  const firstApp = await launchElectronApp({ userDataPath });
  const firstPage = await waitForReadyPage(firstApp);
  const [png, jpeg] = await firstPage.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#8750cf';
    context.fillRect(0, 0, 32, 32);
    return [canvas.toDataURL('image/png'), canvas.toDataURL('image/jpeg')].map((dataUrl) => dataUrl.split(',')[1]);
  });
  await writeFile(originalFile, Buffer.from(png, 'base64'));
  await writeFile(jpegFile, Buffer.from(jpeg, 'base64'));
  await writeFile(invalidFile, 'this is not an image');

  await openBackgroundImagePreferences(firstPage);
  const background = buildPreferencesLocators(firstPage).backgroundImage;
  await stubOpenDialog(firstApp, [jpegFile]);
  await background.chooseButton().click();
  await expect(background.fileName('wallpaper.jpg')).toBeVisible();
  await expect(background.layer()).toBeVisible();

  await stubOpenDialog(firstApp, [originalFile]);
  await background.chooseButton().click();
  await expect(background.layer()).toBeVisible();
  await expect(background.fileName('wallpaper.png')).toBeVisible();
  await background.transparency().fill('0');
  await expect(background.layer()).toHaveCount(0);
  await background.transparency().fill('55');
  await expect(background.layer()).toBeVisible();
  await background.mode().selectOption('fit');
  await expect(background.layer()).toHaveCSS('background-size', 'contain');
  await background.blur().fill('8');
  await expect(background.layer()).toHaveCSS('filter', 'blur(8px)');

  await stubOpenDialog(firstApp, [invalidFile]);
  await background.chooseButton().click();
  await expect(background.invalidImageMessage()).toBeVisible();
  await expect(background.fileName('wallpaper.png')).toBeVisible();
  await expect.poll(() => readdir(imageDirectory)).toHaveLength(1);
  await unlink(originalFile);
  await expect.poll(async () => JSON.parse(await readFile(preferencesPath, 'utf8')).backgroundImage.blur).toBe(8);
  await closeElectronApp(firstApp);

  const secondApp = await launchElectronApp({ userDataPath });
  const secondPage = await waitForReadyPage(secondApp);
  const restored = buildPreferencesLocators(secondPage).backgroundImage;
  await expect(restored.layer()).toHaveCSS('filter', 'blur(8px)');
  await openBackgroundImagePreferences(secondPage);
  await expect(restored.mode()).toHaveValue('fit');
  await expect(restored.transparency()).toHaveValue('55');
  await expect(restored.fileName('wallpaper.png')).toBeVisible();
  await closeElectronApp(secondApp);

  const [copiedImage] = await readdir(imageDirectory);
  await unlink(path.join(imageDirectory, copiedImage));
  const thirdApp = await launchElectronApp({ userDataPath });
  const thirdPage = await waitForReadyPage(thirdApp);
  await openBackgroundImagePreferences(thirdPage);
  const missing = buildPreferencesLocators(thirdPage).backgroundImage;
  await expect(missing.missingImageMessage()).toBeVisible();
  await expect(missing.layer()).toHaveCount(0);
  await missing.clearButton().click();
  await expect(missing.fileName('wallpaper.png')).toHaveCount(0);

  const saved = JSON.parse(await readFile(preferencesPath, 'utf8'));
  expect(saved.backgroundImage.id).toBeUndefined();
  expect(saved.preferences.request.sslVerification).toBe(false);
});
