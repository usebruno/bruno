import React, { forwardRef, useRef, useCallback } from 'react';
import find from 'lodash/find';
import { useSelector, useDispatch } from 'react-redux';
import { IconFileCode, IconDots } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import SpecViewer from './SpecViewer';
import Dropdown from 'components/Dropdown';
import { openApiSpec, saveApiSpecToFile, updateApiSpecPanelLeftPaneWidth } from 'providers/ReduxStore/slices/apiSpec';
import { useState } from 'react';
import CreateApiSpec from 'components/Sidebar/ApiSpecs/CreateApiSpec';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const ApiSpecPanel = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [createApiSpecModalOpen, setCreateApiSpecModalOpen] = useState(false);

  const { apiSpecs, activeApiSpecUid } = useSelector((state) => state.apiSpec);

  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  let apiSpec = find(apiSpecs, (c) => c.uid === activeApiSpecUid);
  const { filename, pathname, raw, uid, leftPaneWidth } = apiSpec || {};

  const handleLeftPaneWidthChange = useCallback(
    (w) => {
      if (!uid) return;
      dispatch(updateApiSpecPanelLeftPaneWidth({ uid, leftPaneWidth: w }));
    },
    [dispatch, uid]
  );

  if (!uid) {
    return <div className="p-4 opacity-50">{t('API_SPECS.NOT_FOUND')}</div>;
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
      (err) => console.log(err) && toast.error(t('API_SPECS.ERROR_OPEN_API_SPEC'))
    );
  };

  return (
    <StyledWrapper className="flex flex-col flex-grow relative">
      {createApiSpecModalOpen ? <CreateApiSpec onClose={() => setCreateApiSpecModalOpen(false)} /> : null}
      <div className="p-3 mb-2 w-full flex flex-row justify-between grid grid-cols-3">
        <div className="flex flex-row justify-start gap-x-4 col-span-1">
          <div className="flex w-fit items-center cursor-pointer">
            <IconFileCode size={18} strokeWidth={1.5} />
            <span className="ml-2 mr-4 font-semibold">{t('API_SPECS.API_DESIGNER')}</span>
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
              {t('API_SPECS.CREATE_API_SPEC')}
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                dropdownTippyRef.current.hide();
                handleOpenApiSpec();
              }}
            >
              {t('API_SPECS.OPEN_API_SPEC')}
            </div>
          </Dropdown>
        </div>
      </div>
      <SpecViewer
        content={raw}
        onSave={(content) => dispatch(saveApiSpecToFile({ uid, content }))}
        leftPaneWidth={leftPaneWidth ?? null}
        onLeftPaneWidthChange={handleLeftPaneWidthChange}
      />
    </StyledWrapper>
  );
};

export default ApiSpecPanel;
