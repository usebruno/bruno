import { useState, useEffect, useMemo } from 'react';
import { find } from 'lodash';
import StyledWrapper from './StyledWrapper';
import { IconChevronDown, IconChevronRight, IconCopy, IconCheck } from '@tabler/icons';
import { getAllVariables } from 'utils/collections/index';
import { interpolate } from '@usebruno/common';

const TokenSection = ({ title, token }) => {
  if (!token) return null;

  const [isExpanded, setIsExpanded] = useState(false);
  const [decodedToken, setDecodedToken] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setDecodedToken(payload);
        }
      } catch (err) {
        console.error('Error decoding token:', err);
      }
    }
  }, [token]);

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="token-section mb-2 border rounded-lg overflow-hidden">
      <div
        className="token-header flex items-center justify-between px-3 py-2 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2 w-full">
          {isExpanded
            ? <IconChevronDown size={18} className="text-gray-500" />
            : <IconChevronRight size={18} className="text-gray-500" />}
          <div className="flex flex-row justify-between w-full">
            <h3 className="font-medium">{title}</h3>
            {decodedToken?.exp && <ExpiryTimer expiresIn={decodedToken?.exp} />}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="p-3">
          <div className="relative group">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleCopy(token)}
                className="token-copy-button p-1 rounded"
                title="Copy token"
              >
                {copied
                  ? <IconCheck size={16} className="text-green-700" />
                  : <IconCopy size={16} className="text-gray-500" />}
              </button>
            </div>
            <div className="token-content font-mono text-xs p-2 rounded break-all">
              {token}
            </div>
          </div>
          {decodedToken && (
            <div className="mt-3">
              <div className="token-label text-xs font-medium mb-2">Decoded Payload</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(decodedToken).map(([key, value]) => (
                  <div key={key} className="overflow-hidden text-ellipsis">
                    <span className="font-medium text-xs">{key}: </span>
                    <span className="token-value text-xs">
                      {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const formatExpiryTime = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const ExpiryTimer = ({ expiresIn }) => {
  if (!expiresIn) return null;

  const calculateTimeLeft = () => Math.max(0, Math.floor(expiresIn - Date.now() / 1000));

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresIn]);

  return (
    <div
      className={`token-expiry text-xs px-2 py-1 rounded-full min-w-[120px] text-center ${timeLeft <= 30 ? 'expiring' : ''}`}
    >
      {timeLeft > 0 ? `Expires in ${formatExpiryTime(timeLeft)}` : `Expired`}
    </div>
  );
};

const Oauth2TokenViewer = ({ collection, item, url, credentialsId, handleRun }) => {
  const { uid: collectionUid } = collection;

  const interpolatedUrl = useMemo(() => {
    const variables = getAllVariables(collection, item);
    return interpolate(url, variables);
  }, [collection, item, url]);

  const credentialsData = find(collection?.oauth2Credentials, (creds) => creds?.url == interpolatedUrl && creds?.collectionUid == collectionUid && creds?.credentialsId == credentialsId);
  const creds = credentialsData?.credentials || {};

  return (
    <StyledWrapper className="relative w-auto h-fit mt-2">
      {Object.keys(creds)?.length ? (
        creds?.error ? (
          <pre className="token-error">Error fetching token. Check network logs for more details.</pre>
        ) : (
          <div className="token-info-container border rounded-lg p-4 shadow-sm">
            <TokenSection title="Access Token" token={creds.access_token} />
            <TokenSection title="Refresh Token" token={creds.refresh_token} />
            <TokenSection title="ID Token" token={creds.id_token} />
            {(creds.token_type || creds.scope) ? (
              <div className="token-info-section mt-3 p-2 rounded-lg text-xs">
                <div className="grid grid-cols-2 gap-2">
                  {creds.token_type ? (
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">Token Type:</span>
                      <span className="token-value">{creds.token_type}</span>
                    </div>
                  ) : null}
                  {creds?.scope ? (
                    <div className="flex items-center space-x-1 min-w-0">
                      <span className="font-medium flex-shrink-0">Scope:</span>
                      <span className="token-value truncate" title={creds.scope}>
                        {creds.scope}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )
      ) : (
        <div className="token-empty">No token found</div>
      )}
    </StyledWrapper>
  );
};

export default Oauth2TokenViewer;
