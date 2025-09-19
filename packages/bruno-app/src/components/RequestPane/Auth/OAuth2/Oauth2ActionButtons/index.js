import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import toast from 'react-hot-toast';
import { cloneDeep, find } from 'lodash';
import { IconLoader2 } from '@tabler/icons';
import { interpolate } from '@usebruno/common';
import { fetchOauth2Credentials, clearOauth2Cache, refreshOauth2Credentials } from 'providers/ReduxStore/slices/collections/actions';
import { getAllVariables } from "utils/collections/index";

const Oauth2ActionButtons = ({ item, request, collection, url: accessTokenUrl, credentialsId }) => {
  const { uid: collectionUid } = collection;

  const dispatch = useDispatch();
  const [fetchingToken, toggleFetchingToken] = useState(false);
  const [refreshingToken, toggleRefreshingToken] = useState(false);

  const interpolatedAccessTokenUrl = useMemo(() => {
    const variables = getAllVariables(collection, item);
    return interpolate(accessTokenUrl, variables);
  }, [collection, item, accessTokenUrl]);

  const credentialsData = find(collection?.oauth2Credentials, creds => creds?.url == interpolatedAccessTokenUrl && creds?.collectionUid == collectionUid && creds?.credentialsId == credentialsId);
  const creds = credentialsData?.credentials || {};

  const handleFetchOauth2Credentials = async () => {
    let requestCopy = cloneDeep(request);
    requestCopy.oauth2 = requestCopy?.auth.oauth2;
    requestCopy.headers = {};
    toggleFetchingToken(true);
    try {
      const result = await dispatch(fetchOauth2Credentials({ 
        itemUid: item.uid, 
        request: requestCopy, 
        collection,
        forceGetToken: true
      }));
      
      toggleFetchingToken(false);
      
      // Check if the result contains error or if access_token is missing
      if (!result || !result.access_token) {
        const errorMessage = result?.error || 'No access token received from authorization server';
        console.error(errorMessage);
        toast.error(errorMessage);
        return;
      }
      
      toast.success('Token fetched successfully!');
    }
    catch (error) {
      console.error('could not fetch the token!');
      console.error(error);
      toggleFetchingToken(false);
      toast.error(error?.message || 'An error occurred while fetching token!');
    }
  }

  const handleRefreshAccessToken = async () => {
    let requestCopy = cloneDeep(request);
    requestCopy.oauth2 = requestCopy?.auth.oauth2;
    requestCopy.headers = {};
    toggleRefreshingToken(true);
    try {
      const result = await dispatch(refreshOauth2Credentials({ 
        itemUid: item.uid, 
        request: requestCopy, 
        collection,
        forceGetToken: true
      }));
      
      toggleRefreshingToken(false);
      
      // Check if the result contains error or if access_token is missing
      if (!result || !result.access_token) {
        const errorMessage = result?.error || 'No access token received from authorization server';
        console.error(errorMessage);
        toast.error(errorMessage);
        return;
      }
      
      toast.success('Token refreshed successfully!');
    }
    catch(error) {
      console.error(error);
      toggleRefreshingToken(false);
      toast.error(error?.message || 'An error occurred while refreshing token!');
    }
  };

  const handleClearCache = (e) => {
    dispatch(clearOauth2Cache({ collectionUid: collection?.uid, url: interpolatedAccessTokenUrl, credentialsId }))
    .then(() => {
      toast.success('Cleared cache successfully');
    })
    .catch((err) => {
      toast.error(err.message);
    });
  };

  return (
    <div className="flex flex-row gap-4 mt-4">
      <button 
        onClick={handleFetchOauth2Credentials} 
        className={`submit btn btn-sm btn-secondary w-fit flex flex-row`}
        disabled={fetchingToken || refreshingToken}
      >
        Get Access Token{fetchingToken? <IconLoader2 className="animate-spin ml-2" size={18} strokeWidth={1.5} /> : ""}
      </button>
      {creds?.refresh_token ? 
        <button 
          onClick={handleRefreshAccessToken}
          className={`submit btn btn-sm btn-secondary w-fit flex flex-row`}
          disabled={fetchingToken || refreshingToken}
        >
          Refresh Token{refreshingToken? <IconLoader2 className="animate-spin ml-2" size={18} strokeWidth={1.5} /> : ""}
        </button> 
      : null}
      <button onClick={handleClearCache} className="submit btn btn-sm btn-secondary w-fit">
        Clear Cache
      </button>
    </div>
  )
}

export default Oauth2ActionButtons;