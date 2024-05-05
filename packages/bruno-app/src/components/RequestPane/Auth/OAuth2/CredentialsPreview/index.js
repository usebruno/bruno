import React, { useEffect, useState } from 'react';
import { clearOauth2Cache, readOauth2CachedCredentials } from 'utils/network';
import { sendCollectionOauth2Request, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';

const CredentialsPreview = ({ item, collection }) => {
  const oauth2CredentialsAreaRef = React.createRef();
  const [oauth2Credentials, setOauth2Credentials] = useState({});

  const dispatch = useDispatch();
  useEffect(() => {
    oauth2CredentialsAreaRef.current.value = oauth2Credentials;
    readOauth2CachedCredentials(collection.uid).then((credentials) => setOauth2Credentials(credentials));
  }, [oauth2CredentialsAreaRef]);

  const handleRun = async () => {
    if (item) {
      dispatch(sendRequest(item, collection.uid));
    } else {
      dispatch(sendCollectionOauth2Request(collection.uid));
    }
  };

  const handleClearCache = (e) => {
    clearOauth2Cache(collection?.uid)
      .then(() => {
        readOauth2CachedCredentials(collection.uid).then((credentials) => {
          setOauth2Credentials(credentials);
          toast.success('Cleared cache successfully');
        });
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  const sortedFields = () => {
    const tokens = {};
    const extras = {};
    Object.entries(oauth2Credentials).forEach(([key, value]) => {
      if (key.endsWith('_token')) {
        tokens[key] = value;
      } else {
        extras[key] = value;
      }
    });
    return { ...tokens, ...extras };
  };

  return (
    <StyledWrapper className="flex flex-col w-full gap-1 mt-4">
      <div className="credential-item-wrapper" ref={oauth2CredentialsAreaRef}>
        {Object.entries(oauth2Credentials).length > 0 ? (
          <>
            <button onClick={handleClearCache} className="submit btn btn-sm btn-secondary w-fit">
              Clear Access Token Cache
            </button>
            <details className="cursor-pointer flex flex-row w-full mt-2 gap-2">
              <summary>Cached OAuth2 Credentials</summary>
              {Object.entries(sortedFields()).map(([field, value]) => (
                <div key={field}>
                  <label className="text-xs">{field}</label>
                  <textarea className="w-full h-24 p-2 text-xs border rounded" value={value} readOnly />
                </div>
              ))}
            </details>
          </>
        ) : (
          <button onClick={handleRun} className="submit btn btn-sm btn-secondary w-fit">
            Get Access Token
          </button>
        )}
      </div>
    </StyledWrapper>
  );
};

export default CredentialsPreview;
