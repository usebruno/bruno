import React, { useRef, forwardRef } from 'react';
import { IconDots } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';
import ResponseClear from 'src/components/ResponsePane/ResponseClear';
import ResponseSave from 'src/components/ResponsePane/ResponseSave';

const ResponseActions = ({ collection, item }) => {
  const menuDropdownTippyRef = useRef();

  const onMenuDropdownCreate = (ref) => (menuDropdownTippyRef.current = ref);

  const MenuIcon = forwardRef((_props, ref) => {
    return (
      <div ref={ref} className="cursor-pointer">
        <IconDots size={18} strokeWidth={1.5} />
      </div>
    );
  });

  const handleClose = () => {
    menuDropdownTippyRef.current.hide();
  };

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement="bottom-end">
        <ResponseClear item={item} collection={collection} asDropdownItem onClose={handleClose} />
        <ResponseSave item={item} asDropdownItem onClose={handleClose} />
      </Dropdown>
    </StyledWrapper>
  );
};

export default ResponseActions;
