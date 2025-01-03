import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import { deleteFolderDraft } from 'providers/ReduxStore/slices/collections/index';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';

const ConfirmFolderClose = ({ onCancel, collection, folder, tab }) => {
  const dispatch = useDispatch();
  
  return (
    <Modal
      size="md"
      title="Unsaved changes"
      confirmText="Save and Close"
      cancelText="Close without saving"
      disableEscapeKey={true}
      disableCloseOnOutsideClick={true}
      closeModalFadeTimeout={150}
      handleCancel={onCancel}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      hideFooter={true}
    >
      <div className="flex items-center font-normal">
        <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
        <h1 className="ml-2 text-lg font-semibold">Hold on..</h1>
      </div>
      <div className="font-normal mt-4">
        You have unsaved changes in folder <span className="font-semibold">{folder.name}</span>.
      </div>

      <div className="flex justify-between mt-6">
        <div>
          <button className="btn btn-sm btn-danger" onClick={() => {
              dispatch(deleteFolderDraft({ collectionUid: collection.uid, folderUid: folder.uid }));
              dispatch(
                closeTabs({
                  tabUids: [tab.uid]
                })
              );
          }}>
            Don't Save
          </button>
        </div>
        <div>
          <button className="btn btn-close btn-sm mr-2" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => {
            dispatch(saveFolderRoot(collection.uid, folder.uid));
              dispatch(
                closeTabs({
                  tabUids: [tab.uid]
                })
              );
            }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmFolderClose;
