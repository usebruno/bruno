import { useState } from 'react';
import toast from 'react-hot-toast';
import { buildClientSchema, buildSchema } from 'graphql';
import { fetchGqlSchema } from 'utils/network';
import { simpleHash, safeParseJSON } from 'utils/common';
import { get } from 'lodash';

const schemaHashPrefix = 'bruno.graphqlSchema';

const useGraphqlSchema = (environment, request, collection, item) => {
  const { ipcRenderer } = window;
  const endpoint = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');
  const localStorageKey = `${schemaHashPrefix}.${simpleHash(endpoint)}`;
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schemaSource, setSchemaSource] = useState('');
  const [schema, setSchema] = useState(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (!saved) {
        return null;
      }
      let parsedData = safeParseJSON(saved);
      if (typeof parsedData === 'object') {
        return buildClientSchema(parsedData);
      } else {
        return buildSchema(parsedData);
      }
    } catch {
      localStorage.setItem(localStorageKey, null);
      return null;
    }
  });

  const loadSchemaFromIntrospection = async () => {
    const response = await fetchGqlSchema(environment, request, collection, item);
    if (!response) {
      throw new Error('Introspection query failed');
    }
    if (response.status !== 200) {
      throw new Error(response.statusText);
    }
    const data = response.data?.data;
    if (!data) {
      throw new Error('No data returned from introspection query');
    }
    setSchemaSource('introspection');
    return data;
  };

  const loadSchemaFromFile = async () => {
    const schemaContent = await ipcRenderer.invoke('renderer:load-gql-schema-file');
    if (!schemaContent) {
      setIsLoading(false);
      return;
    }
    setSchemaSource('file');
    return schemaContent?.data || schemaContent;
  };

  const loadSchema = async (schemaSource) => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      let data;
      if (schemaSource === 'file') {
        data = await loadSchemaFromFile();
      } else {
        // fallback to introspection if source is unknown
        data = await loadSchemaFromIntrospection();
      }
      if (data) {
        if (typeof data === 'object') {
          setSchema(buildClientSchema(data));
        } else {
          setSchema(buildSchema(data));
        }
        localStorage.setItem(localStorageKey, JSON.stringify(data));
        toast.success('GraphQL Schema loaded successfully');
      }
    } catch (err) {
      setError(err);
      console.error(err);
      toast.error(`Error occurred while loading GraphQL Schema: ${err.message}`);
    }

    setIsLoading(false);
  };

  return {
    isLoading,
    schema,
    schemaSource,
    loadSchema,
    error
  };
};

export default useGraphqlSchema;
