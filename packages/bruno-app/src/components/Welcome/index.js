import { useState } from 'react';
import toast from 'react-hot-toast';
import { isElectron } from 'utils/common/platform';
import { useSelector, useDispatch } from 'react-redux';
import { collectionImported } from 'providers/ReduxStore/slices/collections';
import { openLocalCollection } from 'providers/ReduxStore/slices/collections/actions';
import { addCollectionToWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { IconBrandGithub, IconPlus, IconUpload, IconFiles, IconFolders, IconPlayerPlay, IconBrandChrome, IconSpeakerphone, IconDeviceDesktop } from '@tabler/icons';

import Bruno from 'components/Bruno';
import CreateCollection from 'components/Sidebar/CreateCollection';
import SelectCollection from 'components/Sidebar/Collections/SelectCollection';
import { importSampleCollection } from 'utils/importers/bruno-collection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import StyledWrapper from './StyledWrapper';

const Welcome = () => {
  const dispatch = useDispatch();
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [addCollectionToWSModalOpen, setAddCollectionToWSModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const { activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const isPlatformElectron = isElectron();

  const handleAddCollectionToWorkspace = (collectionUid) => {
    setAddCollectionToWSModalOpen(false);
    dispatch(addCollectionToWorkspace(activeWorkspaceUid, collectionUid))
      .then(() => {
        toast.success('Collection added to workspace');
      })
      .catch(() => toast.error('An error occured while adding collection to workspace'));
  };

  const handleImportSampleCollection = () => {
    importSampleCollection()
      .then((collection) => {
        dispatch(collectionImported({ collection: collection }));
        dispatch(addCollectionToWorkspace(activeWorkspaceUid, collection.uid));
      })
      .then(() => toast.success('Sample Collection loaded successfully'))
      .catch((err) => {
        toast.error('Load sample collection failed');
        console.log(err);
      });
  };

  const handleOpenLocalCollection = () => {
    dispatch(openLocalCollection()).catch((err) => console.log(err) && toast.error('An error occured while opening the local collection'));
  };

  return (
    <StyledWrapper className="pb-4 px-6 mt-6">
      {createCollectionModalOpen ? <CreateCollection isLocal={createCollectionModalOpen === 'local' ? true : false} onClose={() => setCreateCollectionModalOpen(false)} /> : null}
      {importCollectionModalOpen ? <ImportCollection onClose={() => setImportCollectionModalOpen(false)} /> : null}

      {addCollectionToWSModalOpen ? (
        <SelectCollection title="Add Collection to Workspace" onClose={() => setAddCollectionToWSModalOpen(false)} onSelect={handleAddCollectionToWorkspace} />
      ) : null}

      <div className="">
        <Bruno width={50} />
      </div>
      <div className="text-xl font-semibold select-none">bruno</div>
      <div className="mt-4">Local-first, Opensource API Client.</div>

      <div className="uppercase font-semibold heading mt-10">Collections</div>
      <div className="mt-4 flex items-center collection-options select-none">
        <div className="flex items-center">
          <IconPlus size={18} strokeWidth={2} />
          <span className="label ml-2" id="create-collection" onClick={() => setCreateCollectionModalOpen(true)}>
            Create Collection
          </span>
        </div>
        <div className="flex items-center ml-6">
          <IconFiles size={18} strokeWidth={2} />
          <span className="label ml-2" id="add-collection" onClick={() => setAddCollectionToWSModalOpen(true)}>
            Add Collection to Workspace
          </span>
        </div>
        <div className="flex items-center ml-6" onClick={() => setImportCollectionModalOpen(true)}>
          <IconUpload size={18} strokeWidth={2} />
          <span className="label ml-2" id="import-collection">Import Collection</span>
        </div>
        <div className="flex items-center ml-6" onClick={handleImportSampleCollection}>
          <IconPlayerPlay size={18} strokeWidth={2} />
          <span className="label ml-2" id="load-sample-collection">Load Sample Collection</span>
        </div>
      </div>

      <div className="uppercase font-semibold heading mt-10 pt-6">Local Collections</div>
      {isPlatformElectron ? (
        <div className="mt-4 flex items-center collection-options select-none">
          <div className="flex items-center">
            <IconPlus size={18} strokeWidth={2} />
            <span className="label ml-2" onClick={() => setCreateCollectionModalOpen('local')}>
              Create Collection
            </span>
          </div>
          <div className="flex items-center ml-6">
            <IconFolders size={18} strokeWidth={2} />
            <span className="label ml-2" onClick={handleOpenLocalCollection}>
              Open Collection
            </span>
          </div>
        </div>
      ) : (
        <div className="muted mt-4 flex items-center collection-options select-none text-gray-600 text-xs">Local collections are only available on the desktop app.</div>
      )}

      <div className="uppercase font-semibold heading mt-10 pt-6">Links</div>
      <div className="mt-4 flex flex-col collection-options select-none">
        <div>
          <a href="https://www.usebruno.com/downloads" target="_blank" className="flex items-center">
            <IconBrandChrome size={18} strokeWidth={2} />
            <span className="label ml-2">Chrome Extension</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://www.usebruno.com/downloads" target="_blank" className="flex items-center">
            <IconDeviceDesktop size={18} strokeWidth={2} />
            <span className="label ml-2">Desktop App</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://github.com/usebruno/bruno/issues" target="_blank" className="flex items-center">
            <IconSpeakerphone size={18} strokeWidth={2} />
            <span className="label ml-2">Report Issues</span>
          </a>
        </div>
        {/* <div className="flex items-center mt-2">
          <IconBook size={18} strokeWidth={2}/><span className="label ml-2">Docs</span>
        </div> */}
        <div className="mt-2">
          <a href="https://github.com/usebruno/bruno" target="_blank" className="flex items-center">
            <IconBrandGithub size={18} strokeWidth={2} />
            <span className="label ml-2">Github</span>
          </a>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Welcome;
