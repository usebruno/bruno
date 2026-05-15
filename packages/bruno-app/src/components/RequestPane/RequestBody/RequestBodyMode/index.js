import React, { useMemo, useCallback } from 'react';
import get from 'lodash/get';
import { useTranslation } from 'react-i18next';
import {
  IconCaretDown,
  IconForms,
  IconBraces,
  IconCode,
  IconFileText,
  IconDatabase,
  IconFile,
  IconX
} from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { useDispatch } from 'react-redux';
import { updateRequestBodyMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestBodyMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections/index';
import { toastError } from 'utils/common/error';
import { prettifyJsonString } from 'utils/common/index';
import xmlFormat from 'xml-formatter';

const RequestBodyMode = ({ item, collection }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const bodyMode = body?.mode;

  const DEFAULT_MODES = [
    {
      name: t('BODY_MODE.FORM'),
      options: [
        { id: 'multipartForm', label: t('BODY_MODE.MULTIPART_FORM'), leftSection: IconForms },
        { id: 'formUrlEncoded', label: t('BODY_MODE.FORM_URL_ENCODED'), leftSection: IconForms }
      ]
    },
    {
      name: t('BODY_MODE.RAW'),
      options: [
        { id: 'json', label: t('BODY_MODE.JSON'), leftSection: IconBraces },
        { id: 'xml', label: t('BODY_MODE.XML'), leftSection: IconCode },
        { id: 'text', label: t('BODY_MODE.TEXT'), leftSection: IconFileText },
        { id: 'sparql', label: t('BODY_MODE.SPARQL'), leftSection: IconDatabase }
      ]
    },
    {
      name: t('BODY_MODE.OTHER'),
      options: [
        { id: 'file', label: t('BODY_MODE.FILE_BINARY'), leftSection: IconFile },
        { id: 'none', label: t('BODY_MODE.NO_BODY'), leftSection: IconX }
      ]
    }
  ];

  const onModeChange = useCallback((value) => {
    dispatch(
      updateRequestBodyMode({
        itemUid: item.uid,
        collectionUid: collection.uid,
        mode: value
      })
    );
  }, [dispatch, item.uid, collection.uid]);

  const onPrettify = () => {
    if (body?.json && bodyMode === 'json') {
      try {
        const prettyBodyJson = prettifyJsonString(body.json);
        dispatch(
          updateRequestBody({
            content: prettyBodyJson,
            itemUid: item.uid,
            collectionUid: collection.uid
          })
        );
      } catch (e) {
        toastError(new Error(t('REQUEST_BODY.PRETTIFY_JSON_ERROR')));
      }
    } else if (body?.xml && bodyMode === 'xml') {
      try {
        const prettyBodyXML = xmlFormat(body.xml, { collapseContent: true });
        dispatch(
          updateRequestBody({
            content: prettyBodyXML,
            itemUid: item.uid,
            collectionUid: collection.uid
          })
        );
      } catch (e) {
        toastError(new Error(t('REQUEST_BODY.PRETTIFY_XML_ERROR')));
      }
    }
  };

  const menuItems = useMemo(() => {
    return DEFAULT_MODES.map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        onClick: () => onModeChange(option.id)
      }))
    }));
  }, [onModeChange, DEFAULT_MODES]);

  return (
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer body-mode-selector" data-testid="request-body-mode-selector">
        <MenuDropdown
          items={menuItems}
          placement="bottom-end"
          selectedItemId={bodyMode}
          showGroupDividers={false}
          groupStyle="select"
        >
          <div className="flex items-center justify-center pl-3 py-1 select-none selected-body-mode">
            {humanizeRequestBodyMode(bodyMode, t)} <IconCaretDown className="caret ml-1" size={14} strokeWidth={2} />
          </div>
        </MenuDropdown>
      </div>
      {(bodyMode === 'json' || bodyMode === 'xml') && (
        <button className="ml-2" onClick={onPrettify}>
          {t('REQUEST_BODY.PRETTIFY')}
        </button>
      )}
    </StyledWrapper>
  );
};
export default RequestBodyMode;
