import React, { useRef, forwardRef, useState } from 'react';
import find from 'lodash/find';
import Dropdown from 'components/Dropdown';
import { selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import EnvironmentSettings from '../EnvironmentSettings';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { ChevronDown, CircleOff, Database, Settings } from 'lucide-react';
import { DropdownItem } from 'components/Dropdown/DropdownItem/dropdown_item';

const EnvironmentSelector = ({ collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const [openSettingsModal, setOpenSettingsModal] = useState(false);
  const { environments, activeEnvironmentUid } = collection;
  const activeEnvironment = activeEnvironmentUid ? find(environments, (e) => e.uid === activeEnvironmentUid) : null;

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="current-enviroment flex items-center justify-center pl-3 pr-2 py-1 select-none">
        {activeEnvironment ? activeEnvironment.name : 'No Environment'}
        <ChevronDown className="caret" size={16} />
      </div>
    );
  });

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
          <div className="flex flex-col px-1">
            {environments && environments.length
              ? environments.map((e) => (
                  <DropdownItem
                    key={e.uid}
                    onClick={() => {
                      onSelect(e);
                      dropdownTippyRef.current.hide();
                    }}
                    active={activeEnvironmentUid === e.uid}
                  >
                    <Database size={16} />
                    <span className="ml-2">{e.name}</span>
                  </DropdownItem>
                ))
              : null}
            <DropdownItem
              warning={!activeEnvironmentUid}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onSelect(null);
              }}
            >
              <CircleOff size={16} />
              <span className="ml-2">No Environment</span>
            </DropdownItem>
            <span className="h-0.25 bg-slate-200 dark:bg-slate-600 my-1 rounded" />
            <DropdownItem onClick={() => setOpenSettingsModal(true)}>
              <Settings className="mr-2" size={16} />
              <span>Configure</span>
            </DropdownItem>
          </div>
        </Dropdown>
      </div>
      {openSettingsModal && <EnvironmentSettings collection={collection} onClose={() => setOpenSettingsModal(false)} />}
    </StyledWrapper>
  );
};

export default EnvironmentSelector;
