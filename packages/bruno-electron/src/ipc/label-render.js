const path = require('path');
const { ipcMain } = require('electron');
const { get } = require('lodash');
const { getPreferences } = require('../store/preferences');
const { chooseFileToSave, writeFile } = require('../utils/filesystem');
const { getCertsAndProxyConfig } = require('./network/cert-utils');
const { makeAxiosInstance } = require('./network/axios-instance');

const SUPPORTED_DPMM = [6, 8, 12, 24];
const MAX_LABEL_INCHES = 15;
const RENDER_TIMEOUT_MS = 30000;
const MAX_ZPL_LENGTH = 4 * 1024 * 1024;
const MAX_RENDERED_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_ERROR_MESSAGE_LENGTH = 300;

const fail = (code, message) => ({ error: true, code, message });

const isValidDimension = (value) => typeof value === 'number' && value > 0 && value <= MAX_LABEL_INCHES;

/**
 * Renders a single ZPL label to a PNG through a Labelary-compatible endpoint.
 * The label leaves the machine, so rendering requires the user's recorded consent for this exact endpoint.
 * The renderer applies the same rule to decide whether to show its consent prompt (LabelPane); keep the two in sync.
 */
const renderZplLabel = async (req) => {
  const { zpl, dpmm, widthInches, heightInches } = req || {};
  const labelary = get(getPreferences(), 'labelary', {});

  if (!labelary.endpoint || labelary.consentedEndpoint !== labelary.endpoint) {
    return fail('CONSENT_REQUIRED', 'Rendering ZPL sends the label to the configured Labelary endpoint. Consent is required.');
  }
  if (typeof zpl !== 'string' || !zpl.trim() || zpl.length > MAX_ZPL_LENGTH) {
    return fail('INVALID_REQUEST', 'Missing or oversized ZPL content');
  }
  if (!SUPPORTED_DPMM.includes(dpmm) || !isValidDimension(widthInches) || !isValidDimension(heightInches)) {
    return fail('INVALID_REQUEST', 'Invalid label resolution or size');
  }

  let baseUrl;
  try {
    const parsed = new URL(labelary.endpoint);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Unsupported protocol');
    }
    baseUrl = parsed.origin + parsed.pathname.replace(/\/+$/, '');
  } catch (err) {
    return fail('INVALID_ENDPOINT', 'The Labelary endpoint in preferences is not a valid http(s) URL');
  }

  const url = `${baseUrl}/v1/printers/${dpmm}dpmm/labels/${widthInches}x${heightInches}/0/`;

  try {
    const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions }
      = await getCertsAndProxyConfig({
        collectionUid: null,
        collection: { promptVariables: {} },
        request: { url },
        envVars: {},
        runtimeVariables: {},
        processEnvVars: {},
        collectionPath: '',
        globalEnvironmentVariables: {}
      });

    const axiosInstance = makeAxiosInstance({
      proxyMode,
      proxyConfig,
      httpsAgentRequestFields,
      interpolationOptions
    });

    const response = await axiosInstance.request({
      url,
      method: 'POST',
      headers: { 'Accept': 'image/png', 'Content-Type': 'application/x-www-form-urlencoded' },
      data: zpl,
      responseType: 'arraybuffer',
      validateStatus: () => true,
      maxRedirects: 0,
      maxBodyLength: MAX_ZPL_LENGTH,
      maxContentLength: MAX_RENDERED_IMAGE_BYTES,
      timeout: RENDER_TIMEOUT_MS
    });

    const body = Buffer.from(response.data || '');
    if (response.status !== 200) {
      const message = body.toString('utf8').trim().slice(0, MAX_ERROR_MESSAGE_LENGTH);
      return fail(`HTTP_${response.status}`, message || `Labelary responded with status ${response.status}`);
    }

    return { image: body.toString('base64') };
  } catch (err) {
    return fail(err.code || 'UNKNOWN', err.message || String(err));
  }
};

const LABEL_FILE_ENCODINGS = ['base64', 'utf8'];

/**
 * Saves a label (PDF, ZPL source or rendered PNG) to a location the user picks.
 * `content` is base64 for binary labels and plain text for ZPL source.
 */
const saveLabelFile = async (mainWindow, req) => {
  const { fileName, content, encoding } = req || {};

  if (typeof fileName !== 'string' || !fileName || fileName !== path.basename(fileName)) {
    throw new Error('Invalid label file name');
  }
  if (typeof content !== 'string' || !LABEL_FILE_ENCODINGS.includes(encoding)) {
    throw new Error('Invalid label content');
  }

  const filePath = await chooseFileToSave(mainWindow, fileName);
  if (!filePath) {
    return { success: false, cancelled: true };
  }

  await writeFile(filePath, Buffer.from(content, encoding), true);
  return { success: true, filePath };
};

const registerLabelRenderIpc = (mainWindow) => {
  ipcMain.handle('renderer:render-zpl-label', async (event, req) => {
    return renderZplLabel(req);
  });

  ipcMain.handle('renderer:save-label-file', async (event, req) => {
    return saveLabelFile(mainWindow, req);
  });
};

module.exports = { renderZplLabel, saveLabelFile, registerLabelRenderIpc };
