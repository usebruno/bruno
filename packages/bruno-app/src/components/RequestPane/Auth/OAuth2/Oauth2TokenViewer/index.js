import { useState, useEffect, useMemo } from "react";
import { find } from "lodash";
import StyledWrapper from "./StyledWrapper";
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
    <div className="mb-2 border dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2 w-full">
          {isExpanded ?
            <IconChevronDown size={18} className="text-gray-500" /> :
            <IconChevronRight size={18} className="text-gray-500" />
          }
          <div className="flex flex-row justify-between w-full">
            <h3 className="text-sm font-medium">{title}</h3>
            {decodedToken?.exp && <ExpiryTimer expiresIn={decodedToken?.exp} />}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="p-3 text-sm">
          <div className="relative group">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleCopy(token)}
                className="p-1 bg-indigo-100 dark:hover:bg-indigo-200 rounded"
                title="Copy token"
              >
                {copied ?
                  <IconCheck size={16} className="text-green-700" /> :
                  <IconCopy size={16} className="text-gray-500" />
                }
              </button>
            </div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded break-all">
              {token}
            </div>
          </div>
          {decodedToken && (
            <div className="mt-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Decoded Payload</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(decodedToken).map(([key, value]) => (
                  <div key={key} className="overflow-hidden text-ellipsis">
                    <span className="font-medium text-xs">{key}: </span>
                    <span className="text-xs text-gray-600 dark:text-gray-300">
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
      className={`text-xs px-2 py-1 rounded-full min-w-[120px] text-center ${timeLeft <= 30
          ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        }`}
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

  const credentialsData = find(collection?.oauth2Credentials, creds => creds?.url == interpolatedUrl && creds?.collectionUid == collectionUid && creds?.credentialsId == credentialsId);
  const creds = credentialsData?.credentials || {};

  return (
    <StyledWrapper className="relative w-auto h-fit mt-2">
      {Object.keys(creds)?.length ? (
        creds?.error ? (
          <pre className="text-red-600 dark:text-red-400">Error fetching token. Check network logs for more details.</pre>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
            <TokenSection title="Access Token" token={creds.access_token} />
            <TokenSection title="Refresh Token" token={creds.refresh_token} />
            <TokenSection title="ID Token" token={creds.id_token} />
            {(creds.token_type || creds.scope) ? <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
              <div className="grid grid-cols-2 gap-2">
                {creds.token_type ? <div className="flex items-center space-x-1">
                  <span className="font-medium">Token Type:</span>
                  <span className="text-gray-600 dark:text-gray-300">{creds.token_type}</span>
                </div> : null}
                {creds?.scope ? <div className="flex items-center space-x-1 min-w-0">
                  <span className="font-medium flex-shrink-0">Scope:</span>
                  <span className="text-gray-600 dark:text-gray-300 truncate" title={creds.scope}>
                    {creds.scope}
                  </span>
                </div> : null}
              </div>
            </div> : null}
          </div>
        )     
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">No token found</div>
      )}
    </StyledWrapper>
  );
};

export default Oauth2TokenViewer;