import { useState } from 'react';
import toast from 'react-hot-toast';
import { buildClientSchema } from 'graphql';
import { fetchGqlSchema } from 'utils/network';
import { simpleHash } from 'utils/common';

const schemaHashPrefix = 'bruno.graphqlSchema';

const useGraphqlSchema = (endpoint, environment, request, collection) => {
  const localStorageKey = `${schemaHashPrefix}.${simpleHash(endpoint)}`;
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (!saved) {
        return null;
      }
      return buildClientSchema(JSON.parse(saved));
    } catch {
      localStorage.setItem(localStorageKey, null);
      return null;
    }
  });

  const loadSchema = () => {
    setIsLoading(true);
    fetchGqlSchema(endpoint, environment, request, collection)
      .then((res) => {
        if (!res || res.status !== 200) {
          return Promise.reject(new Error(res.statusText));
        }
        return res.data;
      })
      .then((s) => {
        if (s && s.data) {
          setSchema(buildClientSchema(s.data));
          setIsLoading(false);
          localStorage.setItem(localStorageKey, JSON.stringify(s.data));
          toast.success('GraphQL Schema loaded successfully');
        } else {
          return Promise.reject(new Error('An error occurred while introspecting schema'));
        }
      })
      .catch((err) => {
        setIsLoading(false);
        setError(err);
        toast.error(`Error occurred while loading GraphQL Schema: ${err.message}`);
      });
  };

  return {
    isLoading,
    schema,
    loadSchema,
    error
  };
};

export default useGraphqlSchema;
