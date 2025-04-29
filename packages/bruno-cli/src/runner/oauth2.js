const axios = require('axios');
const qs = require('qs');
const tokenStore = require('./tokenStore');

/**
 * Fetches an OAuth2 token using client credentials grant
 * @param {Object} oauth2Config - OAuth2 configuration
 * @returns {Promise<Object>} - Token response
 */
const fetchTokenClientCredentials = async (oauth2Config) => {
  const {
    accessTokenUrl,
    clientId,
    clientSecret,
    scope,
    credentialsPlacement = 'header'
  } = oauth2Config;

  if (!accessTokenUrl || !clientId) {
    throw new Error('Missing required OAuth2 parameters');
  }

  const data = {
    grant_type: 'client_credentials',
    scope: scope || ''
  };

  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  // Handle credentials placement
  if (credentialsPlacement === 'header') {
    config.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret || ''}`).toString('base64')}`;
  } else {
    // Credentials in body
    data.client_id = clientId;
    if (clientSecret) {
      data.client_secret = clientSecret;
    }
  }

  try {
    const response = await axios.post(accessTokenUrl, qs.stringify(data), config);
    return response.data;
  } catch (error) {
    console.error('CLIENT_CREDENTIALS: Error fetching OAuth2 token:', error.message);
    throw error;
  }
};

/**
 * Fetches an OAuth2 token using password grant
 * @param {Object} oauth2Config - OAuth2 configuration
 * @returns {Promise<Object>} - Token response
 */
const fetchTokenPassword = async (oauth2Config) => {
  const {
    accessTokenUrl,
    clientId,
    clientSecret,
    username,
    password,
    scope,
    credentialsPlacement = 'header'
  } = oauth2Config;


  if (!accessTokenUrl || !username || !password) {
    throw new Error('Missing required OAuth2 parameters for password grant');
  }

  const data = {
    grant_type: 'password',
    username,
    password,
    scope: scope || ''
  };

  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  // Handle credentials placement
  if (credentialsPlacement === 'header' && clientId) {
    config.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret || ''}`).toString('base64')}`;
  } else if (clientId) {
    // Credentials in body
    data.client_id = clientId;
    if (clientSecret) {
      data.client_secret = clientSecret;
    }
  }

  try {
    const response = await axios.post(accessTokenUrl, qs.stringify(data), config);
    return response.data;
  } catch (error) {
    console.error('PASSWORD_GRANT: Error fetching OAuth2 token:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status, 'Response:', error.response.data);
    }
    throw error;
  }
};

/**
 * Manages OAuth2 token retrieval and storage
 * @param {Object} oauth2Config - OAuth2 configuration
 * @returns {Promise<string>} - Access token
 */
const getOAuth2Token = async (oauth2Config) => {
  const { grantType, clientId, accessTokenUrl } = oauth2Config;
  
  if (!grantType || !accessTokenUrl) {
    throw new Error('Missing required OAuth2 parameters: grantType or accessTokenUrl');
  }

  const serviceId = accessTokenUrl;
  const account = clientId || oauth2Config.username || 'default';

  // Check if we already have a token stored
  const existingToken = await tokenStore.getToken(serviceId, account);
  
  if (existingToken) {
    // Check if token is expired
    if (existingToken.expires_at && existingToken.expires_at > Date.now()) {
      return existingToken.access_token;
    }
  }

  // No valid token found, fetch a new one
  try {
    let tokenResponse;
    
    if (grantType === 'client_credentials') {
      tokenResponse = await fetchTokenClientCredentials(oauth2Config);
    } else if (grantType === 'password') {
      tokenResponse = await fetchTokenPassword(oauth2Config);
    } else {
      throw new Error(`Unsupported grant type: ${grantType}`);
    }
    
    // Calculate expiry time if expires_in is provided
    if (tokenResponse.expires_in) {
      tokenResponse.expires_at = Date.now() + tokenResponse.expires_in * 1000;
    }

    // Store the token
    await tokenStore.saveToken(serviceId, account, tokenResponse);
    
    return tokenResponse.access_token;
  } catch (error) {
    console.error('Failed to get OAuth2 token:', error.message);
    return null;
  }
};



module.exports = {
  getOAuth2Token
}; 