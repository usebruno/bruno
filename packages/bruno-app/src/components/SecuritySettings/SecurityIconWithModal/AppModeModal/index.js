import { cloneDeep } from 'lodash';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { useState } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal/index';

const AppModeModal = ({ collection, onClose }) => {
  const dispatch = useDispatch();
  const [selectedAppMode, setSelectedAppMode] = useState(collection?.brunoConfig?.security?.appMode || 'developer');

  const handleAppModeChange = (e) => {
    setSelectedAppMode(e.target.value);
  };

  const handleSave = () => {
    let brunoConfig = cloneDeep(collection.brunoConfig) || {};
    brunoConfig.security = {
      ...(brunoConfig?.security || {}),
      appMode: selectedAppMode,
      runtime: selectedAppMode === 'developer' ? 'vm2' : brunoConfig?.security?.runtime
    };
    dispatch(updateBrunoConfig(brunoConfig, collection.uid))
      .then(() => {
        toast.success('JS AppMode updated successfully');
        onClose();
      })
      .catch((err) => console.log(err) && toast.error('Failed to update JS AppMode'));
  };

  return (
    <Portal>
      <Modal
        size="sm"
        title={'App Mode'}
        confirmText="Save"
        handleConfirm={handleSave}
        hideCancel={true}
        hideClose={true}
        disableCloseOnOutsideClick={true}
        disableEscapeKey={true}
      >
        <div className="flex flex-col gap-4">
          <div className="text-xs opacity-70">Choose a app mode for this collection.</div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="restricted" className="flex flex-row gap-2 cursor-pointer items-start">
                <input
                  type="radio"
                  id="restricted"
                  name="appMode"
                  value="restricted"
                  checked={selectedAppMode === 'restricted'}
                  onChange={handleAppModeChange}
                  className="cursor-pointer mt-1"
                />
                <div className="flex flex-col gap-1">
                  Restricted
                  <div className="opacity-50 text-xs">Code execution is not allowed.</div>
                </div>
              </label>
              <label htmlFor="safe" className="flex flex-row gap-2 cursor-pointer items-start">
                <input
                  type="radio"
                  id="safe"
                  name="appMode"
                  value="safe"
                  checked={selectedAppMode === 'safe'}
                  onChange={handleAppModeChange}
                  className="cursor-pointer mt-1"
                />
                <div className="flex flex-col gap-1">
                  Safe
                  <div className="opacity-50 text-xs">Code is executed in isolated-vm.</div>
                </div>
              </label>
              <label htmlFor="developer" className="flex flex-row gap-2 cursor-pointer items-start">
                <input
                  type="radio"
                  id="developer"
                  name="appMode"
                  value="developer"
                  checked={selectedAppMode === 'developer'}
                  onChange={handleAppModeChange}
                  className="cursor-pointer mt-1"
                />
                <div className="flex flex-col gap-1">
                  Developer
                  <div className="opacity-50 text-xs">Code execution is fully anabled.</div>
                </div>
              </label>
            </div>
            {/* <button onClick={handleSave} className="submit btn btn-sm btn-secondary w-fit">
              Save
            </button> */}
          </div>
        </div>
      </Modal>
    </Portal>
  );
};

export default AppModeModal;
