import { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { cloneDeep, find, get } from 'lodash';
import { IconLoader2, IconX } from '@tabler/icons';
import { interpolate } from '@usebruno/common';
import { fetchOauth2Credentials, clearOauth2Cache, refreshOauth2Credentials, cancelOauth2AuthorizationRequest, isOauth2AuthorizationRequestInProgress } from 'providers/ReduxStore/slices/collections/actions';
import { getAllVariables } from 'utils/collections/index';
import Button from 'ui/Button';

const Oauth2ActionButtons = ({ item, request, collection, url: accessTokenUrl, credentialsId }) => {
  const { uid: collectionUid } = collection;

  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const [fetchingToken, toggleFetchingToken] = useState(false);
  const [refreshingToken, toggleRefreshingToken] = useState(false);
  const [fetchingAuthorizationCode, toggleFetchingAuthorizationCode] = useState(false);

  const useSystemBrowser = get(preferences, 'request.oauth2.useSystemBrowser', false);

  // Check for pending authorization when component mounts or when fetching starts
  useEffect(() => {
    if (useSystemBrowser && fetchingToken) {
      const getRequestStatus = async () => {
        try {
          toggleFetchingAuthorizationCode(await dispatch(isOauth2AuthorizationRequestInProgress()));
        } catch (err) {
          console.error('Error checking pending authorization:', err);
        }
      };
      getRequestStatus();
    }
  }, [useSystemBrowser, fetchingToken, dispatch]);

  const interpolatedAccessTokenUrl = useMemo(() => {
    const variables = getAllVariables(collection, item);
    return interpolate(accessTokenUrl, variables);
  }, [collection, item, accessTokenUrl]);

  const activeEnvironmentUid = collection?.activeEnvironmentUid ?? null;
  const credentialsData = find(collection?.oauth2Credentials, (creds) =>
    creds?.url == interpolatedAccessTokenUrl
    && creds?.collectionUid == collectionUid
    && creds?.credentialsId == credentialsId
    && (creds?.activeEnvironmentUid ?? null) == activeEnvironmentUid
  );
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

      // Check if the result contains error or if access_token is missing
      if (!result || !result.access_token) {
        const errorMessage = result?.error || 'No access token received from authorization server';
        console.error(errorMessage);
        toast.error(errorMessage);
        return;
      }

      toast.success('Token fetched successfully!');
    } catch (error) {
      console.error('could not fetch the token!');
      console.error(error);
      // Don't show error toast for user cancellation
      if (error?.message && error.message.includes('cancelled by user')) {
        return;
      }
      toast.error(error?.message || 'An error occurred while fetching token!');
    } finally {
      toggleFetchingToken(false);
      toggleFetchingAuthorizationCode(false);
    }
  };

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
    } catch (error) {
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

  const handleCancelAuthorization = async () => {
    try {
      const result = await dispatch(cancelOauth2AuthorizationRequest());
      if (result.success && result.cancelled) {
        toast.error('Authorization cancelled');
        toggleFetchingToken(false);
        toggleFetchingAuthorizationCode(false);
      }
    } catch (err) {
      console.error('Error cancelling authorization:', err);
      toast.error('Failed to cancel authorization');
    }
  };

  return (
    <div className="flex flex-row gap-2 mt-4">
      <Button
        size="sm"
        color="secondary"
        onClick={handleFetchOauth2Credentials}
        disabled={fetchingToken || refreshingToken}
        loading={fetchingToken}
      >
        Get Access Token
      </Button>
      {creds?.refresh_token
        ? (
            <Button
              size="sm"
              color="secondary"
              onClick={handleRefreshAccessToken}
              disabled={fetchingToken || refreshingToken}
              loading={refreshingToken}
            >
              Refresh Token
            </Button>
          )
        : null}
      {useSystemBrowser && fetchingAuthorizationCode
        ? (
            <Button
              size="sm"
              color="secondary"
              onClick={handleCancelAuthorization}
              icon={<IconX size={16} />}
              iconPosition="left"
            >
              Cancel Authorization
            </Button>
          ) : null}
      <Button
        size="sm"
        color="secondary"
        variant="ghost"
        onClick={handleClearCache}
      >
        Clear Cache
      </Button>
    </div>
  );
};

export default Oauth2ActionButtons;
