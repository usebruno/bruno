import toast from 'react-hot-toast';
import IpcErrorModal from 'components/Errors/IpcErrorModal/index';

const { ipcRenderer } = window;

export const getFileContentForVisualDiff = ({ gitRootPath, commitHash, filePath }) => () => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('renderer:get-file-content-for-visual-diff', gitRootPath, commitHash, filePath)
      .then(resolve)
      .catch((err) => {
        toast.custom(<IpcErrorModal error={err?.message} />);
        reject(err);
      });
  });
};

export const getWorkingFileContentForVisualDiff = ({ gitRootPath, filePath, type }) => () => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('renderer:get-working-file-content-for-visual-diff', gitRootPath, filePath, type)
      .then(resolve)
      .catch((err) => {
        toast.custom(<IpcErrorModal error={err?.message} />);
        reject(err);
      });
  });
};

export const getStashFileContentForVisualDiff = ({ gitRootPath, stashIndex, filePath, isUntracked }) => () => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('renderer:get-stash-file-content-for-visual-diff', gitRootPath, stashIndex, filePath, isUntracked)
      .then(resolve)
      .catch((err) => {
        toast.custom(<IpcErrorModal error={err?.message} />);
        reject(err);
      });
  });
};
