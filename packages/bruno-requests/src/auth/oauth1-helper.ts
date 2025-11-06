import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import qs from 'qs';
import debug from 'debug';

const debugLog = debug('bruno:oauth1');

export interface OAuth1TokenStore {
  saveOAuth1Credential({ credentialsId, credentials }: { credentialsId: string; credentials: any }): Promise<boolean>;
  getOAuth1Credential({ credentialsId }: { credentialsId: string }): Promise<any>;
  deleteOAuth1Credential({ credentialsId }: { credentialsId: string }): Promise<boolean>;
}

export interface OAuth1Config {
  consumerKey: string;
  consumerSecret: string;
  signatureMethod?: string;
  parameterTransmission?: 'authorization_header' | 'request_body' | 'query_param';
  accessToken?: string;
  accessTokenSecret?: string;
  rsaPrivateKey?: string;
  credentialsId?: string;
  callbackUrl?: string;
}

interface SignRequestParams {
  request: any;
  oauth1Config: OAuth1Config;
  requestUrl: string;
  requestMethod: string;
  requestHeaders: Record<string, any>;
  requestBody?: string;
}

/**
 * Create an OAuth 1.0a instance with the appropriate signature method
 */
const createOAuthInstance = ({
  consumerKey,
  consumerSecret,
  signatureMethod = 'HMAC-SHA1',
  rsaPrivateKey
}: OAuth1Config): OAuth => {
  let hashFunction: any;

  // Convert escaped newlines to actual newlines in RSA private key
  // This handles cases where the key is stored with \n as literal characters
  let processedRsaKey = rsaPrivateKey;
  if (processedRsaKey && typeof processedRsaKey === 'string') {
    processedRsaKey = processedRsaKey.replace(/\\n/g, '\n');
  }

  if (signatureMethod === 'PLAINTEXT') {
    hashFunction = null;
  } else if (signatureMethod.startsWith('HMAC-')) {
    const algorithm = signatureMethod.replace('HMAC-', '').toLowerCase();
    hashFunction = (baseString: string, key: string) => {
      return crypto.createHmac(algorithm, key).update(baseString).digest('base64');
    };
  } else if (signatureMethod.startsWith('RSA-')) {
    if (!processedRsaKey) {
      throw new Error('RSA Private Key is required for RSA signature methods');
    }
    // crypto.createSign expects the full algorithm name like 'RSA-SHA256'
    hashFunction = (baseString: string) => {
      const sign = crypto.createSign(signatureMethod);
      sign.update(baseString);
      return sign.sign(processedRsaKey, 'base64');
    };
  } else {
    // Default to HMAC-SHA1
    hashFunction = (baseString: string, key: string) => {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64');
    };
  }

  return new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: signatureMethod,
    hash_function: hashFunction,
    version: '1.0'
  });
};

/**
 * Get OAuth 1.0 token (for CLI use - requires manual token input)
 * In CLI context, users should provide access token and secret manually
 */
export const getOAuth1Token = async (oauth1Config: OAuth1Config,
  tokenStore: OAuth1TokenStore,
  verbose: boolean = false): Promise<{ credentials: any; credentialsId: string; error?: string }> => {
  const { consumerKey, consumerSecret, credentialsId = 'credentials', accessToken, accessTokenSecret } = oauth1Config;

  if (!consumerKey) {
    return {
      credentials: null,
      credentialsId,
      error: 'Consumer Key is required for OAuth 1.0'
    };
  }

  if (!consumerSecret) {
    return {
      credentials: null,
      credentialsId,
      error: 'Consumer Secret is required for OAuth 1.0'
    };
  }

  // Try to get stored credentials
  try {
    const storedCredentials = await tokenStore.getOAuth1Credential({ credentialsId });
    if (storedCredentials && storedCredentials.accessToken && storedCredentials.accessTokenSecret) {
      if (verbose) {
        debugLog('Using stored OAuth 1.0 credentials');
      }
      return { credentials: storedCredentials, credentialsId };
    }
  } catch (error) {
    if (verbose) {
      debugLog('Error retrieving stored credentials:', error);
    }
  }

  // If access token and secret are provided, store and return them
  if (accessToken && accessTokenSecret) {
    const credentials = {
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
      signatureMethod: oauth1Config.signatureMethod || 'HMAC-SHA1',
      parameterTransmission: oauth1Config.parameterTransmission || 'authorization_header',
      rsaPrivateKey: oauth1Config.rsaPrivateKey,
      credentialsId
    };

    try {
      await tokenStore.saveOAuth1Credential({ credentialsId, credentials });
      if (verbose) {
        debugLog('Saved OAuth 1.0 credentials');
      }
    } catch (error) {
      if (verbose) {
        debugLog('Error saving credentials:', error);
      }
    }

    return { credentials, credentialsId };
  }

  // No stored credentials and no provided credentials
  return {
    credentials: null,
    credentialsId,
    error: 'No OAuth 1.0 credentials found. Please provide access token and secret.'
  };
};

/**
 * Sign an OAuth 1.0 request with the appropriate signature
 */
export const signOAuth1Request = ({
  request,
  oauth1Config,
  requestUrl,
  requestMethod,
  requestHeaders,
  requestBody
}: SignRequestParams): { requestHeaders: Record<string, any>; requestUrl: string; requestBody?: string } => {
  const {
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    signatureMethod = 'HMAC-SHA1',
    parameterTransmission = 'authorization_header',
    rsaPrivateKey,
    callbackUrl
  } = oauth1Config;

  if (!consumerKey || !consumerSecret) {
    return { requestHeaders, requestUrl, requestBody };
  }

  try {
    const oauth1Instance = createOAuthInstance({
      consumerKey,
      consumerSecret,
      signatureMethod,
      rsaPrivateKey
    });

    const requestData: any = {
      url: requestUrl,
      method: requestMethod
    };

    // Initialize data object for parameters that should be included in signature
    requestData.data = {};

    // Include body parameters in signature for form-encoded POST requests
    const contentType = requestHeaders['content-type'] || requestHeaders['Content-Type'];
    if (
      requestMethod === 'POST'
      && contentType === 'application/x-www-form-urlencoded'
      && requestBody
    ) {
      try {
        requestData.data = qs.parse(requestBody);
      } catch (error) {
        // If parsing fails, reset to empty object
        requestData.data = {};
      }
    }

    // Include callback URL if provided (for request token requests)
    // This ensures oauth_callback is included in the signature
    if (callbackUrl) {
      requestData.data.oauth_callback = callbackUrl;
    }

    // Remove data if it's empty
    if (Object.keys(requestData.data).length === 0) {
      delete requestData.data;
    }

    const token
      = accessToken && accessTokenSecret ? { key: accessToken, secret: accessTokenSecret } : undefined;
    const authData = oauth1Instance.authorize(requestData, token);

    // Add oauth_callback to authData if provided (for request token requests)
    // This ensures it's included in the Authorization header/query params/body
    if (callbackUrl) {
      authData.oauth_callback = callbackUrl;
    }

    const modifiedHeaders = { ...requestHeaders };
    let modifiedUrl = requestUrl;
    let modifiedBody = requestBody;

    switch (parameterTransmission) {
      case 'authorization_header':
        modifiedHeaders['Authorization'] = oauth1Instance.toHeader(authData).Authorization;
        break;

      case 'query_param':
        try {
          const urlObj = new URL(requestUrl);
          Object.keys(authData).forEach((key) => {
            urlObj.searchParams.append(key, authData[key]);
          });
          modifiedUrl = urlObj.toString();
        } catch (error) {
          // If URL parsing fails, fall back to header
          modifiedHeaders['Authorization'] = oauth1Instance.toHeader(authData).Authorization;
        }
        break;

      case 'request_body':
        if (requestMethod === 'POST') {
          const bodyParams = requestBody ? qs.parse(requestBody) : {};
          const combinedParams = { ...bodyParams, ...authData };
          modifiedBody = qs.stringify(combinedParams);
          modifiedHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        } else {
          // Fallback to header if not POST
          modifiedHeaders['Authorization'] = oauth1Instance.toHeader(authData).Authorization;
        }
        break;

      default:
        modifiedHeaders['Authorization'] = oauth1Instance.toHeader(authData).Authorization;
    }

    return {
      requestHeaders: modifiedHeaders,
      requestUrl: modifiedUrl,
      requestBody: modifiedBody
    };
  } catch (error) {
    console.error('Error signing OAuth 1.0 request:', error);
    return { requestHeaders, requestUrl, requestBody };
  }
};
