import { useState } from 'react';
import toast from 'react-hot-toast';
import { getIntrospectionQuery, buildClientSchema } from 'graphql';
import { simpleHash } from 'utils/common';

const schemaHashPrefix = 'bruno.graphqlSchema';

const fetchSchema = (endpoint) => {
  const introspectionQuery = getIntrospectionQuery();
  const queryParams = {
    query: introspectionQuery
  };

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(queryParams)
  });
}

const useGraphqlSchema = (endpoint) => {
  const localStorageKey = `${schemaHashPrefix}.${simpleHash(endpoint)}`;
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if(!saved) {
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
    fetchSchema(endpoint)
      .then((res) => res.json())
      .then((s) => {
        if (s && s.data) {
          setSchema(buildClientSchema(s.data));
          setIsLoading(false);
          localStorage.setItem(localStorageKey, JSON.stringify(s.data));
          toast.success('Graphql Schema loaded successfully');
        } else {
          return Promise.reject(new Error('An error occurred while introspecting schema'));
        }
      })
      .catch((err) => {
        setIsLoading(false);
        setError(err);
        toast.error('Error occured while loading Graphql Schema');
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
