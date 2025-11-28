import React, { useRef, forwardRef } from 'react';
import get from 'lodash/get';
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
import Dropdown from 'components/Dropdown';
import { useDispatch } from 'react-redux';
import { updateRequestBodyMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestBodyMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections/index';
import { toastError } from 'utils/common/error';
import { prettifyJsonString } from 'utils/common/index';
import xmlFormat from 'xml-formatter';

const RequestBodyMode = ({ item, collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const bodyMode = body?.mode;

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center pl-3 py-1 select-none selected-body-mode">
        {humanizeRequestBodyMode(bodyMode)} <IconCaretDown className="caret ml-2" size={14} strokeWidth={2} />
      </div>
    );
  });

  const onModeChange = (value) => {
    dispatch(
      updateRequestBodyMode({
        itemUid: item.uid,
        collectionUid: collection.uid,
        mode: value
      })
    );
  };

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
        toastError(new Error('Unable to prettify. Invalid JSON format.'));
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
        toastError(new Error('Unable to prettify. Invalid XML format.'));
      }
    }
  };

  return (
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer body-mode-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div className="label-item">Form</div>
        <div
          className="dropdown-item"
          onClick={() => {
            dropdownTippyRef.current.hide();
            onModeChange('multipartForm');
          }}
        >
            <span className="dropdown-icon">
              <IconForms size={16} strokeWidth={2} />
            </span>
          Multipart Form
        </div>
        <div
          className="dropdown-item"
          onClick={() => {
            dropdownTippyRef.current.hide();
            onModeChange('formUrlEncoded');
          }}
        >
            <span className="dropdown-icon">
              <IconForms size={16} strokeWidth={2} />
            </span>
          Form URL Encoded
        </div>
          <div className="label-item">Raw</div>
        <div
          className="dropdown-item"
          onClick={() => {
            dropdownTippyRef.current.hide();
            onModeChange('json');
          }}
        >
            <span className="dropdown-icon">
              <IconBraces size={16} strokeWidth={2} />
            </span>
          JSON
        </div>
        <div
          className="dropdown-item"
          onClick={() => {
            dropdownTippyRef.current.hide();
            onModeChange('xml');
          }}
        >
            <span className="dropdown-icon">
              <IconCode size={16} strokeWidth={2} />
            </span>
          XML
        </div>
        <div
          className="dropdown-item"
          onClick={() => {
            dropdownTippyRef.current.hide();
            onModeChange('text');
          }}
        >
            <span className="dropdown-icon">
              <IconFileText size={16} strokeWidth={2} />
            </span>
          TEXT
        </div>
        <div
          className="dropdown-item"
          onClick={() => {
            dropdownTippyRef.current.hide();
            onModeChange('sparql');
          }}
        >
            <span className="dropdown-icon">
              <IconDatabase size={16} strokeWidth={2} />
            </span>
          SPARQL
        </div>
          <div className="label-item">Other</div>
        <div
          className="dropdown-item"
          onClick={() => {
            dropdownTippyRef.current.hide();
            onModeChange('file');
          }}
        >
            <span className="dropdown-icon">
              <IconFile size={16} strokeWidth={2} />
            </span>
          File / Binary
        </div>
        <div
          className="dropdown-item"
          onClick={() => {
            dropdownTippyRef.current.hide();
            onModeChange('none');
          }}
        >
            <span className="dropdown-icon">
              <IconX size={16} strokeWidth={2} />
            </span>
          No Body
        </div>
        </Dropdown>
      </div>
      {(bodyMode === 'json' || bodyMode === 'xml') && (
        <button className="ml-2" onClick={onPrettify}>
          Prettify
        </button>
      )}
    </StyledWrapper>
  );
};
export default RequestBodyMode;
