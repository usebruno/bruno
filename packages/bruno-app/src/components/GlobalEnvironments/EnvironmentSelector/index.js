import React, { useRef, forwardRef, useState } from 'react';
import find from 'lodash/find';
import Dropdown from 'components/Dropdown';
import { IconSettings, IconWorld, IconDatabase, IconDatabaseOff, IconCheck } from '@tabler/icons';
import EnvironmentSettings from '../EnvironmentSettings';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { selectGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import ToolHint from 'components/ToolHint/index';

const EnvironmentSelector = () => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector((state) => state.globalEnvironments.activeGlobalEnvironmentUid);
  const [openSettingsModal, setOpenSettingsModal] = useState(false);
  const activeEnvironment = activeGlobalEnvironmentUid ? find(globalEnvironments, (e) => e.uid === activeGlobalEnvironmentUid) : null;

  const Icon = forwardRef((props, ref) => {
    return (
        <div ref={ref} className={`current-environment flex flex-row gap-1 rounded-xl text-xs cursor-pointer items-center justify-center select-none ${activeGlobalEnvironmentUid? 'environment-active': ''}`}>
          <ToolHint text="Global Environments" toolhintId="GlobalEnvironmentsToolhintId" className='flex flex-row'>
            <IconWorld className="globe" size={16} strokeWidth={1.5} />
            {
              activeEnvironment ? <div className='text-nowrap truncate max-w-32'>{activeEnvironment?.name}</div> : null
            }
          </ToolHint>
        </div>
    );
  });

  const handleSettingsIconClick = () => {
    setOpenSettingsModal(true);
  };

  const handleModalClose = () => {
    setOpenSettingsModal(false);
  };

  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const onSelect = (environment) => {
    dispatch(selectGlobalEnvironment({ environmentUid: environment ? environment.uid : null }))
      .then(() => {
        if (environment) {
          toast.success(`Environment changed to ${environment.name}`);
        } else {
          toast.success(`No Environments are active now`);
        }
      })
      .catch((err) => console.log(err) && toast.error('An error occurred while selecting the environment'));
  };

  return (
    <StyledWrapper>
      <div className="flex items-center cursor-pointer environment-selector mr-3">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end" transparent={true}>
          <div className="label-item font-medium">Global Environments</div>
          {globalEnvironments && globalEnvironments.length
            ? globalEnvironments.map((e) => (
                <div
                  className={`dropdown-item ${e?.uid === activeGlobalEnvironmentUid ? 'active' : ''}`}
                  key={e.uid}
                  onClick={() => {
                    onSelect(e);
                    dropdownTippyRef.current.hide();
                  }}
                >
                  <IconDatabase size={18} strokeWidth={1.5} /> <span className="ml-2 break-all">{e.name}</span>
                </div>
              ))
            : null}
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onSelect(null);
            }}
          >
            <IconDatabaseOff size={18} strokeWidth={1.5} />
            <span className="ml-2">No Environment</span>
          </div>
          <div className="dropdown-item border-top" onClick={handleSettingsIconClick}>
            <div className="pr-2 text-gray-600">
              <IconSettings size={18} strokeWidth={1.5} />
            </div>
            <span>Configure</span>
          </div>
        </Dropdown>
      </div>
      {openSettingsModal && <EnvironmentSettings globalEnvironments={globalEnvironments} activeGlobalEnvironmentUid={activeGlobalEnvironmentUid} onClose={handleModalClose} />}
    </StyledWrapper>
  );
};

export default EnvironmentSelector;
