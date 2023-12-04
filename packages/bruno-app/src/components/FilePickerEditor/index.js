import React from 'react';
import { useDispatch } from 'react-redux';
import { browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import { IconX } from '@tabler/icons';

const FilePickerEditor = ({ value, onChange }) => {
  const dispatch = useDispatch();
  const filnames = value
    .split('|')
    .filter((v) => v != null && v != '')
    .map((v) => v.split('\\').pop());
  const title = filnames.map((v) => `- ${v}`).join('\n');

  const browse = () => {
    dispatch(browseFiles())
      .then((filePaths) => {
        onChange(filePaths.join('|'));
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const clear = () => {
    onChange('');
  };

  const renderButtonText = (filnames) => {
    if (filnames.length == 1) {
      return filnames[0];
    }
    return filnames.length + ' files selected';
  };

  return filnames.length > 0 ? (
    <div
      className="btn btn-secondary px-1"
      style={{ fontWeight: 400, width: '100%', textOverflow: 'ellipsis', overflowX: 'hidden' }}
      title={title}
    >
      <button className="align-middle" onClick={clear}>
        <IconX size={18} />
      </button>
      &nbsp;
      {renderButtonText(filnames)}
    </div>
  ) : (
    <button className="btn btn-secondary px-1" style={{ width: '100%' }} onClick={browse}>
      Select Files
    </button>
  );
};

export default FilePickerEditor;
