import { ElectronApplication } from '../playwright';

/**
 * Stub the native directory picker so the next `showOpenDialog` resolves to `filePaths`.
 * Pass an empty array to simulate the user cancelling the dialog.
 */
export const stubOpenDirectoryDialog = async (app: ElectronApplication, filePaths: string[] = []) => {
  await app.evaluate(({ dialog }, paths: string[]) => {
    (dialog as { showOpenDialog: typeof dialog.showOpenDialog }).showOpenDialog = () =>
      Promise.resolve({ canceled: paths.length === 0, filePaths: paths });
  }, filePaths);
};

type DocumentsPathState = typeof globalThis & { __e2eOriginalDocumentsPath?: string };

export const stubDocumentsPath = async (app: ElectronApplication, documentsPath: string) => {
  await app.evaluate(({ app: electronApp }, dir: string) => {
    const state = globalThis as DocumentsPathState;
    if (state.__e2eOriginalDocumentsPath === undefined) {
      state.__e2eOriginalDocumentsPath = electronApp.getPath('documents');
    }
    electronApp.setPath('documents', dir);
  }, documentsPath);
};

export const restoreDocumentsPath = async (app: ElectronApplication) => {
  await app.evaluate(({ app: electronApp }) => {
    const state = globalThis as DocumentsPathState;
    if (state.__e2eOriginalDocumentsPath !== undefined) {
      electronApp.setPath('documents', state.__e2eOriginalDocumentsPath);
      delete state.__e2eOriginalDocumentsPath;
    }
  });
};
