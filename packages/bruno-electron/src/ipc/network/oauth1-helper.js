const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { BrowserWindow } = require('electron');
const { preferencesUtil } = require('../../store/preferences');

const addOAuth1Authorization = async (request, collectionPath) => {

  const absoluteFilePath = (file) => {
    return path.isAbsolute(file) ? file : path.join(collectionPath, file)
  }

  const hash_function = (signatureMethod) => {

    // https://oauth.net/core/1.0a/#anchor15
    // 9.2.  HMAC-SHA1
    if (signatureMethod.startsWith('HMAC')) {
      return (base_string, key) => {
        return crypto
          .createHmac(signatureMethod.slice('HMAC-'.length).toLowerCase(), key)
          .update(base_string)
          .digest('base64')
      }
    }

    // https://oauth.net/core/1.0a/#anchor18
    // 9.3.  RSA-SHA1
    if (signatureMethod.startsWith('RSA')) {
      return (base_string, unused_key) => {
        const rsaPrivateKey = fs.readFileSync(absoluteFilePath(request.oauth1.rsaPrivateKey), 'utf8');
        return crypto
          .createSign(signatureMethod)
          .update(base_string)
          .sign(rsaPrivateKey, 'base64')
      }
    }

    // https://oauth.net/core/1.0a/#anchor21
    // 9.4.  PLAINTEXT
    if(signatureMethod === 'PLAINTEXT') {
      return (base_string, key) => {
        return key;
      }
    }

    throw new Error('Unsupported signature method');
  }

  const oauth = OAuth({
    consumer: {
      key: request.oauth1.consumerKey,
      secret: request.oauth1.consumerSecret
    },
    signature_method: request.oauth1.signatureMethod,
    hash_function: hash_function(request.oauth1.signatureMethod)
  });

  // https://oauth.net/core/1.0a/#auth_step1
  // 6.1.  Obtaining an Unauthorized Request Token
  const getRequestToken = async () => {
    try {
      const requestTokenRequest = {
        url: request.oauth1.requestTokenUrl,
        method: 'POST',
        data: {
          oauth_callback: request.oauth1.callbackUrl
        }
      };
      const signingToken = {
        // requestToken does not need signing
      }
      const authHeader = oauth.toHeader(oauth.authorize(requestTokenRequest, signingToken));
      console.log("Requesting temporary request token from", requestTokenRequest.url);
      const requestTokenResponse = await axios.post(requestTokenRequest.url, requestTokenRequest.data, { headers: authHeader });
      const formattedResponse = Object.fromEntries(new URLSearchParams(requestTokenResponse.data));
      console.info('Request Token Response:', requestTokenResponse.status, formattedResponse);
      return formattedResponse;
    } catch (error) {
      console.error('Error obtaining request token:', error.message);
      throw new Error(error.message);
    }
  };

  // https://oauth.net/core/1.0a/#auth_step2
  // 6.2.  Obtaining User Authorization
  const requestUserAuthorization = (oauthToken) => {
    return new Promise(async (resolve, reject) => {
      const matchesCallbackUrl = (url, callbackUrl) => {
        return url ? url.href.startsWith(callbackUrl.href) : false;
      };

      let finalUrl;
      let window;
      const onRedirect = (_, url) => {
        try {
          if (matchesCallbackUrl(new URL(url), new URL(request.oauth1.callbackUrl))) {
            finalUrl = url;
            window.close();
          }
        } catch (error) {
          console.error("Error parsing redirect URL:", error);
        }
      };

      try {
        window = new BrowserWindow({
          webPreferences: {
            nodeIntegration: false
          }
        });
        window.on('ready-to-show', () => window.show());
        window.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
          event.preventDefault();
          callback(!preferencesUtil.shouldVerifyTls());
        });
        window.webContents.on('did-navigate', onRedirect);
        window.webContents.on('will-redirect', onRedirect);

        window.on('close', () => {
          window.webContents.removeListener('did-navigate', onRedirect);
          window.webContents.removeListener('will-redirect', onRedirect);

          if (finalUrl) {
            try {
              const callbackUrlWithVerifier = new URL(finalUrl);
              const params = Object.fromEntries(callbackUrlWithVerifier.searchParams);
              console.log("Authorization successful:", params);
              resolve(params);
            } catch (error) {
              console.error("Error processing final URL:", error);
              reject(new Error('Invalid authorization response'));
            }
          } else {
            console.warn('Authorization window closed by user');
            reject(new Error('Authorization window closed by user'));
          }
        });

        const authorizeUrl = new URL(request.oauth1.authorizeUrl);
        authorizeUrl.searchParams.append('oauth_token', oauthToken);

        console.log("Requesting user authorization from", authorizeUrl.toString());
        window.loadURL(authorizeUrl.toString()).catch((error) => {
          console.error("Error loading authorization URL:", error);
          reject(new Error('Failed to load authorization URL'));
          window.close();
        });
      } catch (error) {
        console.error("Error during user authorization setup:", error);
        if (window) window.close();
        reject(new Error('User authorization setup failed'));
      }
    });
  };

  // https://oauth.net/core/1.0a/#auth_step3
  // 6.3.  Obtaining an Access Token
  const exchangeRequestTokenForAccessToken = async (oauthToken, oauthTokenSecret, verifier) => {
    try {
      const accessTokenRequestData = {
        url: request.oauth1.accessTokenUrl,
        method: 'POST',
        data: {
          oauth_token: oauthToken,
          oauth_verifier: verifier
        }
      };
      const signingToken = {
        key: request.oauth1.consumerSecret,
        secret: oauthTokenSecret
      }
      const authHeader = oauth.toHeader(oauth.authorize(accessTokenRequestData, signingToken));
      console.log("Requesting Access Token from", accessTokenRequestData.url);
      const accessTokenResponse = await axios.post(accessTokenRequestData.url, {},{ headers: authHeader });
      const formattedResponse = Object.fromEntries(new URLSearchParams(accessTokenResponse.data));
      console.log("Access Token Response", accessTokenResponse.status, formattedResponse);
      return formattedResponse;
    } catch (error) {
      console.error("Invalid Access Token Response", error.code, error.message);
      throw new Error(error.message);
    }
  };

  // https://oauth.net/core/1.0a/#anchor13
  // 9.1.1.  Normalize Request Parameters
  const isPostWithUrlEncodedFormData = (request) => {
    return request.headers['content-type'] === 'application/x-www-form-urlencoded' && request.method === 'POST';
  }

  // https://oauth.net/core/1.0a/#anchor12
  // 7.  Accessing Protected Resources
  const evaluateOAuth1Parameters = (request, accessToken, accessTokenSecret) => {
    let requestData;
    if (isPostWithUrlEncodedFormData(request)) {
      requestData = {
        url: request.url,
        method: request.method,
        data: Object.fromEntries(new URLSearchParams(request.data).entries())
      }
    } else {
      requestData = {
        url: request.url,
        method: request.method,
      }
    }

    const signingToken = {
      key: accessToken,
      secret: accessTokenSecret
    }

    return oauth.authorize(requestData, signingToken);
  }

  // https://oauth.net/core/1.0a/#consumer_req_param
  // 5.2.  Consumer Request Parameters
  const addAuthorizationToRequest = (request, oauth1RequestParameters, parameterTransmissionMethod) => {
    switch (parameterTransmissionMethod) {
      case 'authorization_header': {
        const authHeader = oauth.toHeader(oauth1RequestParameters);
        request.headers['authorization'] = authHeader.Authorization;
        break;
      }
      case 'request_body': {
        if(! isPostWithUrlEncodedFormData(request)) {
          throw new Error('"Parameter Transmission Method: Request Body" is only supported ' +
            'for POST request with a content-type of application/x-www-form-urlencoded.');
        }
        request.data = new URLSearchParams(oauth1RequestParameters).toString();
        break;
      }
      case 'query_param': {
        const url = new URL(request.url);
        Object.entries(oauth1RequestParameters).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        })
        request.url = url.toString();
        break;
      }
    }
  }

  // With Access Token provided, we may skip directly to authorizing of user's request
  // With verifier provided - we may skip user authorization (third leg) step
  let { accessToken, accessTokenSecret, verifier, parameterTransmissionMethod } = request.oauth1;

  try {
    if(!accessToken || !accessTokenSecret) {
      const { oauth_token: oauthToken, oauth_token_secret: oauthTokenSecret} = await getRequestToken();
      if(!verifier) {
        ({ oauth_verifier: verifier } = await requestUserAuthorization(oauthToken));
      }
      ({ oauth_token: accessToken, oauth_token_secret: accessTokenSecret } = await exchangeRequestTokenForAccessToken(oauthToken, oauthTokenSecret, verifier));
    }
    const requestParameters = evaluateOAuth1Parameters(request, accessToken, accessTokenSecret);
    addAuthorizationToRequest(request, requestParameters, parameterTransmissionMethod)

  } catch (error) {
    console.error("OAuth flow failed", error.message);
    throw error;
  }
};

module.exports = { addOAuth1Authorization };