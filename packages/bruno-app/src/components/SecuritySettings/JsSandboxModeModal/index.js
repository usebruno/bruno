import { saveCollectionSecurityConfig } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { useState } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';

const JsSandboxModeModal = ({ collection }) => {
  const dispatch = useDispatch();
  const [jsSandboxMode, setJsSandboxMode] = useState(collection?.securityConfig?.jsSandboxMode || 'safe');

  const handleChange = (e) => {
    setJsSandboxMode(e.target.value);
  };

  const handleSave = () => {
    dispatch(
      saveCollectionSecurityConfig(collection?.uid, {
        jsSandboxMode: jsSandboxMode
      })
    )
      .then(() => {
        toast.success('Sandbox mode updated successfully');
      })
      .catch((err) => console.log(err) && toast.error('Failed to update sandbox mode'));
  };

  return (
    <Portal>
      <Modal
        size="sm"
        title={'JavaScript Sandbox'}
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
                name="jsSandboxMode"
                value="safe"
                checked={jsSandboxMode === 'safe'}
                onChange={handleChange}
                className="cursor-pointer"
              />
              <span className={jsSandboxMode === 'safe' ? 'font-medium' : 'font-normal'}>
                Safe Mode
              </span>
              <span className='beta-tag'>BETA</span>
            </label>
            <p className='text-sm text-muted mt-1'>
              JavaScript code is executed in a secure sandbox and cannot access your filesystem or execute system commands.
            </p>

            <label htmlFor="developer" className="flex flex-row gap-2 mt-6 cursor-pointer">
              <input
                type="radio"
                id="developer"
                name="jsSandboxMode"
                value="developer"
                checked={jsSandboxMode === 'developer'}
                onChange={handleChange}
                className="cursor-pointer"
              />
              <span className={jsSandboxMode === 'developer' ? 'font-medium' : 'font-normal'}>
                Developer Mode
                <span className='ml-1 developer-mode-warning'>(use only if you trust the collections authors)</span>
              </span>
            </label>
            <p className='text-sm text-muted mt-1'>
              JavaScript code has access to the filesystem, can execute system commands and access sensitive information.
            </p>
            <small className='text-muted mt-6'>
              * SAFE mode has been introduced v1.26 onwards and is in beta. Please report any issues on github.
            </small>
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default JsSandboxModeModal;
