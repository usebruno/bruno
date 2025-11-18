import toast from 'react-hot-toast';
import Bruno from 'components/Bruno';
import Dropdown from 'components/Dropdown';
import CreateCollection from '../CreateCollection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';

import { IconDots } from '@tabler/icons';
import { useState, forwardRef, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { showHomePage } from 'providers/ReduxStore/slices/app';
import { openCollection, importCollection } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { multiLineMsg } from "utils/common";
import { formatIpcError } from "utils/common/error";

const TitleBar = () => {
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);
  const [importData, setImportData] = useState(null);
  const dispatch = useDispatch();
  const { ipcRenderer } = window;

  const handleImportCollection = ({ rawData, type }) => {
    setImportData({ rawData, type });
    setImportCollectionModalOpen(false);
    setImportCollectionLocationModalOpen(true);
  };

  const handleImportCollectionLocation = (convertedCollection, collectionLocation) => {
    dispatch(importCollection(convertedCollection, collectionLocation))
      .then(() => {
        setImportCollectionLocationModalOpen(false);
        setImportData(null);
        toast.success('Collection imported successfully');
      })
      .catch((err) => {
        console.error(err);
        toast.error(multiLineMsg('An error occurred while importing the collection.', formatIpcError(err)));
      });
  };

  const menuDropdownTippyRef = useRef();
  const onMenuDropdownCreate = (ref) => (menuDropdownTippyRef.current = ref);
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="dropdown-icon cursor-pointer">
        <IconDots size={22} />
      </div>
    );
  });

  const handleTitleClick = () => dispatch(showHomePage());

  const handleOpenCollection = () => {
    dispatch(openCollection()).catch(
      (err) => {
        console.log(err);
        toast.error('An error occurred while opening the collection');
      }
    );
  };

  const openDevTools = () => {
    ipcRenderer.invoke('renderer:open-devtools');
  };

  return (
    <StyledWrapper className="px-2 py-2">
      {createCollectionModalOpen ? <CreateCollection onClose={() => setCreateCollectionModalOpen(false)} /> : null}
      {importCollectionModalOpen ? (
        <ImportCollection onClose={() => setImportCollectionModalOpen(false)} handleSubmit={handleImportCollection} />
      ) : null}
      {importCollectionLocationModalOpen && importData ? (
        <ImportCollectionLocation
          rawData={importData.rawData}
          format={importData.type}
          onClose={() => setImportCollectionLocationModalOpen(false)}
          handleSubmit={handleImportCollectionLocation}
        />
      ) : null}

      <div className="flex items-center">
        <button className="bruno-logo flex items-center gap-2 text-sm font-medium" onClick={handleTitleClick}>
          <span aria-hidden>
            <Bruno width={30} />
          </span>
          bruno
        </button>
        <div className="collection-dropdown flex flex-grow items-center justify-end">
          <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
            <div
              className="dropdown-item"
              onClick={(e) => {
                setCreateCollectionModalOpen(true);
                menuDropdownTippyRef.current.hide();
              }}
            >
              Create Collection
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                handleOpenCollection();
                menuDropdownTippyRef.current.hide();
              }}
            >
              Open Collection
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setImportCollectionModalOpen(true);
              }}
            >
              Import Collection
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                openDevTools();
              }}
            >
              Devtools
            </div>
          </Dropdown>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default TitleBar;
