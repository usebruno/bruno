import React from 'react';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { Download } from 'lucide-react';

const ResponseSave = ({ item }) => {
  const { ipcRenderer } = window;
  const response = item.response || {};

  const saveResponseToFile = () => {
    return new Promise((resolve, reject) => {
      ipcRenderer
        .invoke('renderer:save-response-to-file', response, item.requestSent.url)
        .then(resolve)
        .catch((err) => {
          toast.error(get(err, 'error.message') || 'Something went wrong!');
          reject(err);
        });
    });
  };

  return (
    <button
      className="ml-2 hover:text-slate-950 dark:hover:text-white"
      onClick={saveResponseToFile}
      disabled={!response.dataBuffer}
      title="Save response to file"
    >
      <Download size={16} />
    </button>
  );
};
export default ResponseSave;
