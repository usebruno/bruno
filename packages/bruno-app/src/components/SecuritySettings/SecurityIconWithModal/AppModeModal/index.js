import { saveCollectionSecurityConfig } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { useState } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';

const AppModeModal = ({ collection, onClose }) => {
  const dispatch = useDispatch();
  const [selectedAppMode, setSelectedAppMode] = useState(collection?.securityConfig?.appMode || 'developer');

  const handleAppModeChange = (e) => {
    setSelectedAppMode(e.target.value);
  };

  const handleSave = () => {
    dispatch(
      saveCollectionSecurityConfig(collection?.uid, {
        appMode: selectedAppMode,
        runtime: selectedAppMode === 'developer' ? 'vm2' : selectedAppMode === 'safe' ? 'isolated-vm' : undefined
      })
    )
      .then(() => {
        toast.success('App Mode updated successfully');
        onClose();
      })
      .catch((err) => console.log(err) && toast.error('Failed to update JS AppMode'));
  };

  return (
    <Portal>
      <Modal
        size="sm"
        title={'Scripting Sandbox'}
        confirmText="Save"
        handleConfirm={handleSave}
        hideCancel={true}
        hideClose={true}
        disableCloseOnOutsideClick={true}
        disableEscapeKey={true}
      >
        <StyledWrapper>
          <div>
            The collection might include JavaScript code in Variables, Scripts, Tests, and Assertions.
          </div>

          <div className='text-muted mt-6'>
            Please choose the security level for the JavaScript code execution.
          </div>

          <div className="flex flex-col mt-4">
            <label htmlFor="safe" className="flex flex-row items-center gap-2 cursor-pointer">
              <input
                type="radio"
                id="safe"
                name="appMode"
                value="safe"
                checked={selectedAppMode === 'safe'}
                onChange={handleAppModeChange}
                className="cursor-pointer"
              />
              <span className={selectedAppMode === 'safe' ? 'font-medium' : 'font-normal'}>
                Safe Mode
              </span>
              <span className='beta-tag'>BETA</span>
            </label>
            <p className='text-sm text-muted mt-1'>
              JavaScript code is executed in a secure sandbox and cannot excess your filesystem or execute system commands.
            </p>

            <label htmlFor="developer" className="flex flex-row gap-2 mt-6 cursor-pointer">
              <input
                type="radio"
                id="developer"
                name="appMode"
                value="developer"
                checked={selectedAppMode === 'developer'}
                onChange={handleAppModeChange}
                className="cursor-pointer"
              />
              <span className={selectedAppMode === 'developer' ? 'font-medium' : 'font-normal'}>
                Developer Mode
                <span className='ml-1 developer-mode-warning'>(use only if you trust the collections authors)</span>
              </span>
            </label>
            <p className='text-sm text-muted mt-1'>
              JavaScript code has access to the filesystem, can execute system commands and access sensitive information.
            </p>
            <small className='text-muted mt-6'>
              * SAFE mode has been introduced v1.25 onwards and is in beta. Please report any issues on github.
            </small>
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default AppModeModal;
