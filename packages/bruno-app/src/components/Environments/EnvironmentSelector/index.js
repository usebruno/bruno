import React, { useRef, forwardRef, useState } from 'react';
import find from 'lodash/find';
import Dropdown from 'components/Dropdown';
import { selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { updateEnvironmentSettingsModalVisibility } from 'providers/ReduxStore/slices/app';
import { IconSettings, IconCaretDown, IconDatabase, IconDatabaseOff } from '@tabler/icons';
import EnvironmentSettings from '../EnvironmentSettings';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';

const EnvironmentSelector = ({ collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const [openSettingsModal, setOpenSettingsModal] = useState(false);
  const { environments, activeEnvironmentUid } = collection;
  const activeEnvironment = activeEnvironmentUid ? find(environments, (e) => e.uid === activeEnvironmentUid) : null;

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="current-environment flex items-center justify-center pl-3 pr-2 py-1 select-none">
        {activeEnvironment ? activeEnvironment.name : 'No Environment'}
        <IconCaretDown className="caret" size={14} strokeWidth={2} />
      </div>
    );
  });

  const handleSettingsIconClick = () => {
    setOpenSettingsModal(true);
    dispatch(updateEnvironmentSettingsModalVisibility(true));
  };

  const handleModalClose = () => {
    setOpenSettingsModal(false);
    dispatch(updateEnvironmentSettingsModalVisibility(false));
  };

  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const onSelect = (environment) => {
    dispatch(selectEnvironment(environment ? environment.uid : null, collection.uid))
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
      <div className="flex items-center cursor-pointer environment-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div className="label-item font-medium">Collection Environments</div>
          {environments && environments.length
            ? environments.map((e) => (
                <div
                  className={`dropdown-item ${e?.uid === activeEnvironmentUid ? 'active' : ''}`}
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
      {openSettingsModal && <EnvironmentSettings collection={collection} onClose={handleModalClose} />}
    </StyledWrapper>
  );
};

export default EnvironmentSelector;
