import React, { useRef, forwardRef } from 'react';
import { IconDots, IconEraser, IconDownload } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';
import { responseCleared } from 'providers/ReduxStore/slices/collections/index';

const ResponseActions = ({ collection, item }) => {
  const dispatch = useDispatch();
  const { ipcRenderer } = window;
  const response = item.response || {};
  const menuDropdownTippyRef = useRef();

  const onMenuDropdownCreate = (ref) => (menuDropdownTippyRef.current = ref);

  const MenuIcon = forwardRef((_props, ref) => {
    return (
      <div ref={ref} className="cursor-pointer">
        <IconDots size={18} strokeWidth={1.5} />
      </div>
    );
  });

  const clearResponse = () => {
    menuDropdownTippyRef.current.hide();
    dispatch(responseCleared({
      itemUid: item.uid,
      collectionUid: collection.uid,
      response: null
    }));
  };

  const saveResponseToFile = () => {
    menuDropdownTippyRef.current.hide();
    return new Promise((resolve, reject) => {
      ipcRenderer
        .invoke('renderer:save-response-to-file', response, item?.requestSent?.url, item.pathname)
        .then(resolve)
        .catch((err) => {
          toast.error(get(err, 'error.message') || 'Something went wrong!');
          reject(err);
        });
    });
  };

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement="bottom-end">
        <div className="dropdown-item" onClick={clearResponse}>
          <IconEraser size={16} strokeWidth={1.5} className="icon mr-2" />
          Clear
        </div>
        <div
          className="dropdown-item"
          onClick={saveResponseToFile}
          disabled={!response.dataBuffer}
          style={!response.dataBuffer ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <IconDownload size={16} strokeWidth={1.5} className="icon mr-2" />
          Download
        </div>
      </Dropdown>
    </StyledWrapper>
  );
};

export default ResponseActions;
