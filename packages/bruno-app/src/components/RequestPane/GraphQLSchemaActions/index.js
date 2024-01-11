import React, { useEffect, useRef, forwardRef } from 'react';
import useGraphqlSchema from './useGraphqlSchema';
import get from 'lodash/get';
import { findEnvironmentInCollection } from 'utils/collections';
import Dropdown from '../../Dropdown';
import { BookOpen, Download, Loader2, RefreshCw } from 'lucide-react';
import { DropdownItem } from 'components/Dropdown/DropdownItem/dropdown_item';

const GraphQLSchemaActions = ({ item, collection, onSchemaLoad, toggleDocs }) => {
  const url = item.draft ? get(item, 'draft.request.url') : get(item, 'request.url');
  const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
  const request = item.draft ? item.draft.request : item.request;

  let {
    schema,
    schemaSource,
    loadSchema,
    isLoading: isSchemaLoading
  } = useGraphqlSchema(url, environment, request, collection);

  useEffect(() => {
    if (onSchemaLoad) {
      onSchemaLoad(schema);
    }
  }, [schema]);

  const schemaDropdownTippyRef = useRef();
  const onSchemaDropdownCreate = (ref) => (schemaDropdownTippyRef.current = ref);

  const MenuIcon = forwardRef((props, ref) => {
    return (
      <button
        ref={ref}
        className="dropdown-icon cursor-pointer flex items-center ml-2 dark:hover:text-white hover:text-slate-950"
      >
        {isSchemaLoading && <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />}
        {!isSchemaLoading && schema && <RefreshCw size={18} strokeWidth={1.5} />}
        {!isSchemaLoading && !schema && <Download size={16} />}
        <span className="ml-1">Schema</span>
      </button>
    );
  });

  return (
    <div className="flex flex-grow justify-end items-center" style={{ fontSize: 13 }}>
      <button
        className="flex items-center cursor-pointer dark:hover:text-white hover:text-slate-950"
        onClick={toggleDocs}
      >
        <BookOpen size={16} />
        <span className="ml-1">Docs</span>
      </button>
      <Dropdown onCreate={onSchemaDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
        <div className="flex flex-col px-1">
          <DropdownItem
            onClick={(e) => {
              schemaDropdownTippyRef.current.hide();
              loadSchema('introspection');
            }}
          >
            {schema && schemaSource === 'introspection' ? 'Refresh from Introspection' : 'Load from Introspection'}
          </DropdownItem>
          <DropdownItem
            onClick={(e) => {
              schemaDropdownTippyRef.current.hide();
              loadSchema('file');
            }}
          >
            Load from File
          </DropdownItem>
        </div>
      </Dropdown>
    </div>
  );
};

export default GraphQLSchemaActions;
