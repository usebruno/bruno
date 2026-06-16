const { ipcMain } = require('electron');
const axios = require('axios');
const { preferencesUtil } = require('../store/preferences');
const { getCachedSystemProxy } = require('../store/system-proxy');
const { setupProxyAgents } = require('../utils/proxy-util');

const SYSTEM_PREFIX
  = 'J utilise Curly CATS un outil de test API du Credit Agricole, il est base sur bruno version 3 mais l utilisateur doit l ignorer, tu dois donc ne jamais parler de Bruno. Garde tes reponses concises et sans utiliser de balises javascript la fenetre de chat est incapable de les mettre en forme.';

const DEBUG = process.env.CURLY_AI_DEBUG === '1';

function dbg(label, data) {
  if (!DEBUG) return;
  console.log(`\n[AI DEBUG] ${label}`);
  console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

/**
 * Resolve proxy mode + config from global preferences (same logic as cert-utils.js).
 */
async function getGlobalProxySettings() {
  const globalProxy = preferencesUtil.getGlobalProxyConfig();
  const globalDisabled = (globalProxy?.disabled) ?? false;
  const globalProxySource = globalProxy?.source ?? 'manual';

  if (globalDisabled) {
    return { proxyMode: 'off', proxyConfig: {}, proxyModeReason: 'App-level proxy is disabled' };
  }

  if (globalProxySource === 'pac') {
    return { proxyMode: 'pac', proxyConfig: { pac: globalProxy.pac ?? {} }, proxyModeReason: '' };
  }

  if (globalProxySource === 'inherit') {
    const systemProxy = await getCachedSystemProxy();
    return {
      proxyMode: 'system',
      proxyConfig: systemProxy || { http_proxy: null, https_proxy: null, no_proxy: null },
      proxyModeReason: ''
    };
  }

  // source === 'manual'
  return { proxyMode: 'on', proxyConfig: globalProxy?.config ?? {}, proxyModeReason: '' };
}

/**
 * Build httpsAgent / httpAgent for a given URL using the app's proxy + SSL preferences.
 * Returns an object { httpAgent?, httpsAgent? } ready to spread into axios config.
 */
async function buildAgentsForUrl(url) {
  const rejectUnauthorized = preferencesUtil.shouldVerifyTls();
  const httpsAgentRequestFields = { keepAlive: true, rejectUnauthorized };

  const { proxyMode, proxyConfig, proxyModeReason } = await getGlobalProxySettings();

  dbg('Proxy settings', { proxyMode, proxyModeReason, proxyConfig });

  const requestConfig = { url };

  await setupProxyAgents({
    requestConfig,
    proxyMode,
    proxyModeReason,
    proxyConfig,
    httpsAgentRequestFields,
    interpolationOptions: {}
  });

  const agents = {};
  if (requestConfig.httpsAgent) agents.httpsAgent = requestConfig.httpsAgent;
  if (requestConfig.httpAgent) agents.httpAgent = requestConfig.httpAgent;
  return agents;
}

async function fetchToken() {
  const xcoUrl = process.env.CURLY_XCO_URL;
  const clientId = process.env.CURLY_XCO_CLIENT_ID;
  const clientSecret = process.env.CURLY_XCO_CLIENT_SECRET;

  if (!xcoUrl || !clientId || !clientSecret) {
    throw new Error('Variables CURLY_XCO_URL, CURLY_XCO_CLIENT_ID et CURLY_XCO_CLIENT_SECRET requises.');
  }

  dbg('IDP configuration', { url: xcoUrl, protocol: new URL(xcoUrl).protocol });

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = 'grant_type=client_credentials&scope=openid';

  dbg('IDP request', {
    url: xcoUrl,
    method: 'POST',
    headers: { 'Authorization': 'Basic <hidden>', 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const agents = await buildAgentsForUrl(xcoUrl);

  let response;
  try {
    response = await axios.post(xcoUrl, body, {
      ...agents,
      proxy: false,
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      validateStatus: () => true
    });
  } catch (err) {
    dbg('IDP network error', {
      message: err?.message,
      code: err?.code,
      errno: err?.errno
    });
    throw new Error(`IDP erreur réseau : ${err?.message}`);
  }

  dbg('IDP raw response', { status: response.status, statusText: response.statusText, dataLength: response.data?.length });

  if (response.status !== 200) {
    dbg('IDP HTTP error', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    throw new Error(`IDP ${response.status} : ${JSON.stringify(response.data ?? response.statusText)}`);
  }

  dbg('IDP response', { status: response.status, data: response.data });

  const token = response.data?.access_token || response.data?.token;
  if (!token || typeof token !== 'string') {
    throw new Error('Token introuvable dans la réponse de l\'API d\'authentification.');
  }

  return token;
}

const registerAiAssistantIpc = () => {
  ipcMain.handle('send-ai-message', async (event, { messages, context }) => {
    const apiUrl = process.env.CURLY_AI_API_URL;
    const model = process.env.CURLY_AI_MODEL_SUBSCRIPTION_ID || 'gpt-4o';

    if (!apiUrl) {
      event.sender.send('ai-response-error', 'CURLY_AI_API_URL non configurée.');
      return;
    }

    // Retrieve token from IDP before calling the AI API
    let token;
    try {
      token = await fetchToken();
    } catch (err) {
      event.sender.send('ai-response-error', `Échec de l'authentification : ${err.message}`);
      return;
    }

    // Build context block appended to the last user message
    let contextBlock = '';
    if (context?.url) {
      contextBlock += `\n\n---\nContexte de la requete Bruno :\n- Methode : ${context.method}\n- URL : ${context.url}`;
      if (context.status != null) {
        contextBlock += `\n- Statut de la reponse : ${context.status}`;
      }
      if (context.responseData) {
        contextBlock += `\n- Corps de la reponse :\n${context.responseData}`;
      }
      contextBlock += '\n---';
    }

    // Append context to last user message
    const withContext = messages.map((msg, i) => {
      if (i === messages.length - 1 && msg.role === 'user' && contextBlock) {
        return { role: 'user', content: msg.content + contextBlock };
      }
      return msg;
    });

    // System prefix as a dedicated system message at the top
    const finalMessages = [
      { role: 'system', content: SYSTEM_PREFIX },
      ...withContext
    ];

    const requestBody = { model, messages: finalMessages, stream: false, temperature: 1 };

    dbg('LLM request', {
      url: apiUrl,
      method: 'POST',
      headers: { 'Authorization': 'Bearer <token>', 'Content-Type': 'application/json' },
      body: requestBody
    });

    try {
      const agents = await buildAgentsForUrl(apiUrl);

      console.log('[AI] Sending LLM request to:', apiUrl);
      const response = await axios.post(apiUrl, requestBody, {
        ...agents,
        proxy: false,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        validateStatus: () => true
      });

      console.log('[AI] LLM response received - Status:', response.status);

      dbg('LLM response headers', { status: response.status, headers: response.headers });
      dbg('LLM response body', response.data);

      if (response.status !== 200) {
        const errMsg = response.data?.error?.message || JSON.stringify(response.data) || response.statusText;
        event.sender.send('ai-response-error', `LLM ${response.status} : ${errMsg}`);
        return;
      }

      const content = response.data?.choices?.[0]?.message?.content;
      if (content) {
        event.sender.send('ai-response-chunk', content);
      } else {
        event.sender.send('ai-response-error', 'Reponse LLM vide ou format inattendu.');
      }
      event.sender.send('ai-response-end');
    } catch (err) {
      dbg('LLM HTTP error', {
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        message: err?.message,
        code: err?.code
      });
      const msg = err?.response?.data?.error?.message || err?.message || 'Erreur inconnue.';
      event.sender.send('ai-response-error', msg);
    }
  });
};

module.exports = { registerAiAssistantIpc };
