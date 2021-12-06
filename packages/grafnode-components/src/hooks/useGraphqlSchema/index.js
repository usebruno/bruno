import { useState, useEffect } from 'react';
import { getIntrospectionQuery, buildClientSchema } from 'graphql';

const useGraphqlSchema =(endpoint) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [schema, setSchema] = useState(null);
  const [error, setError] = useState(null);

  const introspectionQuery = getIntrospectionQuery();
  const queryParams = {
    query: introspectionQuery
  }

  useEffect(() => {
    fetch(endpoint, {
        method: "POST",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryParams)
      })
      .then((res) => res.json())
      .then((s) => {
        if(s && s.data) {
          setSchema(buildClientSchema(s.data));
          setIsLoaded(true);
        } else {
          return Promise.reject(new Error('An error occurred while introspecting schema'));
        }
      })
      .catch((err) => {
        setError(err);
        console.log(err);
      });
  }, []);

  return {
    isLoaded,
    schema,
    error
  };
}

export default useGraphqlSchema;