import { useState } from 'react';
import toast from 'react-hot-toast';
import { buildClientSchema, buildSchema, validateSchema } from 'graphql';
import { fetchGqlSchema } from 'utils/network';
import { simpleHash, safeParseJSON } from 'utils/common';

const buildAndValidateSchema = (data) => {
  let schema;
  if (typeof data === 'object') {
    schema = buildClientSchema(data);
  } else {
    schema = buildSchema(data);
  }

  // Validate the schema to catch issues like empty object types
  // The GraphQL spec requires object types to have at least one field
  const validationErrors = validateSchema(schema);
  if (validationErrors.length > 0) {
    const errorMessages = validationErrors.map((e) => e.message).join('; ');
    console.warn('GraphQL schema has validation issues:', errorMessages);
  }

  return { schema, validationErrors };
};

const schemaHashPrefix = 'bruno.graphqlSchema';

const useGraphqlSchema = (endpoint, environment, request, collection) => {
  const { ipcRenderer } = window;
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
      const { schema } = buildAndValidateSchema(parsedData);
      return schema;
    } catch (err) {
      localStorage.removeItem(localStorageKey);
      console.warn('Failed to load cached GraphQL schema:', err.message);
      return null;
    }
  });

  const loadSchemaFromIntrospection = async () => {
    const response = await fetchGqlSchema(endpoint, environment, request, collection);
    if (!response) {
      throw new Error('Introspection query failed. Please check the URL and try again.');
    }
    if (response.status !== 200) {
      throw new Error('The URL may not be a valid GraphQL endpoint.');
    }
    if (response.data?.errors?.length) {
      const messages = response.data.errors.map((e) => e.message).join('; ');
      throw new Error(`GraphQL introspection returned errors: ${messages}`);
    }
    const data = response.data?.data;
    if (!data) {
      throw new Error(
        'The response does not contain valid GraphQL introspection data. Please verify this is a GraphQL endpoint.'
      );
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
        let schema, validationErrors;
        try {
          ({ schema, validationErrors } = buildAndValidateSchema(data));
        } catch (buildErr) {
          throw new Error(
            'The response could not be parsed as a valid GraphQL schema. Please verify the endpoint returns a valid GraphQL introspection result.'
          );
        }
        setSchema(schema);
        localStorage.setItem(localStorageKey, JSON.stringify(data));

        if (validationErrors.length > 0) {
          const errorMessages = validationErrors.map((e) => e.message).join('; ');
          toast(`Schema validation issues: ${errorMessages}`, {
            icon: '⚠️',
            duration: 5000
          });
        } else {
          toast.success('GraphQL Schema loaded successfully');
        }
      }
    } catch (err) {
      setError(err);
      console.error(err);
      let errorMessage = err.message || 'Unknown error';
      const ipcPrefix = /^Error invoking remote method '[^']+': /;
      errorMessage = errorMessage.replace(ipcPrefix, '');
      // Strip redundant "Error: " prefix if present after stripping IPC wrapper
      errorMessage = errorMessage.replace(/^Error: /, '');
      toast.error(errorMessage);
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
