import React, { useRef, forwardRef } from 'react';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { useDispatch } from 'react-redux';
import { updateRequestBodyMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestBodyMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections/index';
import { toastError } from 'utils/common/error';
import { format, applyEdits } from 'jsonc-parser';
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
        {humanizeRequestBodyMode(bodyMode)} <IconCaretDown className="caret ml-2 mr-2" size={14} strokeWidth={2} />
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
        const edits = format(body.json, undefined, { tabSize: 2, insertSpaces: true });
        const prettyBodyJson = applyEdits(body.json, edits);
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
          <div className="label-item font-medium">Form</div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('multipartForm');
            }}
          >
            Multipart Form
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('formUrlEncoded');
            }}
          >
            Form URL Encoded
          </div>
          <div className="label-item font-medium">Raw</div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('json');
            }}
          >
            JSON
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('xml');
            }}
          >
            XML
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('text');
            }}
          >
            TEXT
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('sparql');
            }}
          >
            SPARQL
          </div>
          <div className="label-item font-medium">Other</div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('rawFile');
            }}
          >
            Raw File
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('none');
            }}
          >
            No Body
          </div>
        </Dropdown>
      </div>
      {(bodyMode === 'json' || bodyMode === 'xml') && (
        <button className="ml-1" onClick={onPrettify}>
          Prettify
        </button>
      )}
    </StyledWrapper>
  );
};
export default RequestBodyMode;
