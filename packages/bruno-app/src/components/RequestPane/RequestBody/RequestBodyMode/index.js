import React, { useRef, forwardRef } from 'react';
import get from 'lodash/get';
import Dropdown from 'components/Dropdown';
import { useDispatch } from 'react-redux';
import { updateRequestBodyMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestBodyMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections/index';
import { toastError } from 'utils/common/error';
import { ChevronDown } from 'lucide-react';
import { DropdownItem } from 'components/Dropdown/DropdownItem/dropdown_item';

const RequestBodyMode = ({ item, collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const bodyMode = body?.mode;
  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center pl-3 py-1 select-none selected-body-mode">
        {humanizeRequestBodyMode(bodyMode)} <ChevronDown className="caret ml-2 mr-2" size={14} />
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
        const bodyJson = JSON.parse(body.json);
        const prettyBodyJson = JSON.stringify(bodyJson, null, 2);
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
    }
  };
  return (
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer body-mode-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div className="flex flex-col px-1">
            <DropdownItem isTitle>Form</DropdownItem>
            <DropdownItem
              active={bodyMode === 'multipartForm'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('multipartForm');
              }}
            >
              Multipart Form
            </DropdownItem>
            <DropdownItem
              active={bodyMode === 'formUrlEncoded'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('formUrlEncoded');
              }}
            >
              Form URL Encoded
            </DropdownItem>
            <DropdownItem isTitle>Raw</DropdownItem>
            <DropdownItem
              active={bodyMode === 'json'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('json');
              }}
            >
              JSON
            </DropdownItem>
            <DropdownItem
              active={bodyMode === 'xml'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('xml');
              }}
            >
              XML
            </DropdownItem>
            <DropdownItem
              active={bodyMode === 'text'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('text');
              }}
            >
              TEXT
            </DropdownItem>
            <DropdownItem
              active={bodyMode === 'sparql'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('sparql');
              }}
            >
              SPARQL
            </DropdownItem>
            <DropdownItem isTitle>Other</DropdownItem>
            <DropdownItem
              warning={bodyMode === 'none'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('none');
              }}
            >
              No Body
            </DropdownItem>
          </div>
        </Dropdown>
      </div>
      {bodyMode === 'json' && (
        <button className="ml-1" onClick={onPrettify}>
          Prettify
        </button>
      )}
    </StyledWrapper>
  );
};
export default RequestBodyMode;
