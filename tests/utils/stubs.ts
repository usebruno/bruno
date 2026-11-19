import { ElectronApplication } from '../../playwright';

/**
 * Stub the native file or directory picker so the next `showOpenDialog` resolves to `filePaths`.
 * Pass an empty array to simulate the user cancelling the dialog.
 */
export const stubOpenDialog = async (app: ElectronApplication, filePaths: string[] = []) => {
  await app.evaluate(({ dialog }, paths: string[]) => {
    (dialog as { showOpenDialog: typeof dialog.showOpenDialog }).showOpenDialog = () =>
      Promise.resolve({ canceled: paths.length === 0, filePaths: paths });
  }, filePaths);
};

export const stubOpenDirectoryDialog = stubOpenDialog;
