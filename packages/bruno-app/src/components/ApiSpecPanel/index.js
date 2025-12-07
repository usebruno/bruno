import React, { forwardRef, useRef } from 'react';
import find from 'lodash/find';
import { useSelector, useDispatch } from 'react-redux';
import { IconFileCode, IconDots } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import FileEditor from './FileEditor';
import Dropdown from 'components/Dropdown';
import { openApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import { useState } from 'react';
import CreateApiSpec from 'components/Sidebar/ApiSpecs/CreateApiSpec';
import { Suspense } from 'react';
import Swagger from './Renderers/Swagger';
import toast from 'react-hot-toast';

const ApiSpecPanel = () => {
  const dispatch = useDispatch();

  const [createApiSpecModalOpen, setCreateApiSpecModalOpen] = useState(false);

  const { apiSpecs, activeApiSpecUid } = useSelector((state) => state.apiSpec);

  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  let apiSpec = find(apiSpecs, (c) => c.uid === activeApiSpecUid);
  const { filename, pathname, raw, uid } = apiSpec || {};
  if (!uid) {
    return <div className="p-4 opacity-50">API Spec not found!</div>;
  }

  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref}>
        <IconDots size={22} />
      </div>
    );
  });

  const handleOpenApiSpec = () => {
    dispatch(openApiSpec()).catch(
      (err) => console.log(err) && toast.error('An error occurred while opening the API spec')
    );
  };

  return (
    <StyledWrapper className="flex flex-col flex-grow relative">
      {createApiSpecModalOpen ? <CreateApiSpec onClose={() => setCreateApiSpecModalOpen(false)} /> : null}
      <div className="p-3 mb-2 w-full flex flex-row justify-between grid grid-cols-3">
        <div className="flex flex-row justify-start gap-x-4 col-span-1">
          <div className="flex w-fit items-center cursor-pointer">
            <IconFileCode size={18} strokeWidth={1.5} />
            <span className="ml-2 mr-4 font-semibold">API Designer</span>
          </div>
        </div>
        <div className="w-full col-span-1 flex justify-center" title={pathname}>
          {filename}
        </div>
        <div className="menu-icon pr-2 col-span-1 flex justify-end">
          <Dropdown onCreate={onDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
            <div
              className="dropdown-item"
              onClick={(e) => {
                dropdownTippyRef.current.hide();
                setCreateApiSpecModalOpen(true);
              }}
            >
              Create API Spec
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                dropdownTippyRef.current.hide();
                handleOpenApiSpec();
              }}
            >
              Open API Spec
            </div>
          </Dropdown>
        </div>
      </div>
      <section className="main flex flex-grow px-4 relative">
        <div className="w-full grid grid-cols-2">
          <div className="col-span-1">
            <FileEditor apiSpec={apiSpec} />
          </div>
          <div className="col-span-1">
            <Suspense fallback="">
              <Swagger string={raw} />
            </Suspense>
          </div>
        </div>
      </section>
    </StyledWrapper>
  );
};

export default ApiSpecPanel;
