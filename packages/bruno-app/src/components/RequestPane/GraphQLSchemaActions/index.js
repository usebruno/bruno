import React, { useEffect, useRef, forwardRef } from 'react';
import useGraphqlSchema from './useGraphqlSchema';
import { IconBook, IconDownload, IconLoader2, IconRefresh } from '@tabler/icons';
import get from 'lodash/get';
import { findEnvironmentInCollection } from 'utils/collections';
import Dropdown from '../../Dropdown';

const GraphQLSchemaActions = ({ item, collection, onSchemaLoad, toggleDocs }) => {
  const url = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');
  const pathname = item.draft ? get(item, 'draft.pathname', '') : get(item, 'pathname', '');
  const uid = item.draft ? get(item, 'draft.uid', '') : get(item, 'uid', '');
  const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
  const request = item.draft ? { ...item.draft.request, pathname, uid } : { ...item.request, pathname, uid };

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
      <div ref={ref} className="dropdown-icon cursor-pointer flex hover:underline ml-2">
        {isSchemaLoading && <IconLoader2 className="animate-spin" size={18} strokeWidth={1.5} />}
        {!isSchemaLoading && schema && <IconRefresh size={18} strokeWidth={1.5} />}
        {!isSchemaLoading && !schema && <IconDownload size={18} strokeWidth={1.5} />}
        <span className="ml-1">Schema</span>
      </div>
    );
  });

  return (
    <div className="flex flex-grow justify-end items-center" style={{ fontSize: 13 }}>
      <div className="flex items-center cursor-pointer hover:underline" onClick={toggleDocs}>
        <IconBook size={18} strokeWidth={1.5} />
        <span className="ml-1">Docs</span>
      </div>
      <Dropdown onCreate={onSchemaDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
        <div
          className="dropdown-item"
          onClick={(e) => {
            schemaDropdownTippyRef.current.hide();
            loadSchema('introspection');
          }}
        >
          {schema && schemaSource === 'introspection' ? 'Refresh from Introspection' : 'Load from Introspection'}
        </div>
        <div
          className="dropdown-item"
          onClick={(e) => {
            schemaDropdownTippyRef.current.hide();
            loadSchema('file');
          }}
        >
          Load from File
        </div>
      </Dropdown>
    </div>
  );
};

export default GraphQLSchemaActions;
