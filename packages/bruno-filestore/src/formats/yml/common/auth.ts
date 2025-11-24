import type {
  Auth,
  AuthApiKey,
  AuthAwsV4,
  AuthBasic,
  AuthBearer,
  AuthDigest,
  AuthNTLM,
  AuthWsse
} from '@opencollection/types/common/auth';
import type { Auth as BrunoAuth } from '@usebruno/schema-types/common/auth';
import { isString } from '../../../utils';
import { toOpenCollectionOAuth2, toBrunoOAuth2 } from './auth-oauth2';

const buildAwsV4Auth = (config?: BrunoAuth['awsv4']): AuthAwsV4 => {
  const auth: AuthAwsV4 = { type: 'awsv4' };

  if (!config) {
    return auth;
  }

  if (isString(config.accessKeyId)) auth.accessKeyId = config.accessKeyId;
  if (isString(config.secretAccessKey)) auth.secretAccessKey = config.secretAccessKey;
  if (isString(config.sessionToken)) auth.sessionToken = config.sessionToken;
  if (isString(config.service)) auth.service = config.service;
  if (isString(config.region)) auth.region = config.region;
  if (isString(config.profileName)) auth.profileName = config.profileName;

  return auth;
};

const buildBasicAuth = (config?: BrunoAuth['basic']): AuthBasic => {
  const auth: AuthBasic = { type: 'basic' };

  if (!config) {
    return auth;
  }

  if (isString(config.username)) auth.username = config.username;
  if (isString(config.password)) auth.password = config.password;

  return auth;
};

const buildBearerAuth = (config?: BrunoAuth['bearer']): AuthBearer => {
  const auth: AuthBearer = { type: 'bearer' };

  if (!config) {
    return auth;
  }

  if (isString(config.token)) auth.token = config.token;

  return auth;
};

const buildDigestAuth = (config?: BrunoAuth['digest']): AuthDigest => {
  const auth: AuthDigest = { type: 'digest' };

  if (!config) {
    return auth;
  }

  if (isString(config.username)) auth.username = config.username;
  if (isString(config.password)) auth.password = config.password;

  return auth;
};

const buildNtlmAuth = (config?: BrunoAuth['ntlm']): AuthNTLM => {
  const auth: AuthNTLM = { type: 'ntlm' };

  if (!config) {
    return auth;
  }

  if (isString(config.username)) auth.username = config.username;
  if (isString(config.password)) auth.password = config.password;
  if (isString(config.domain)) auth.domain = config.domain;

  return auth;
};

const buildWsseAuth = (config?: BrunoAuth['wsse']): AuthWsse => {
  const auth: AuthWsse = { type: 'wsse' };

  if (!config) {
    return auth;
  }

  if (isString(config.username)) auth.username = config.username;
  if (isString(config.password)) auth.password = config.password;

  return auth;
};

const buildApiKeyAuth = (config?: BrunoAuth['apikey']): AuthApiKey => {
  const auth: AuthApiKey = { type: 'apikey' };

  if (!config) {
    return auth;
  }

  if (isString(config.key)) auth.key = config.key;
  if (isString(config.value)) auth.value = config.value;

  if (isString(config.placement)) {
    if (config.placement === 'header') {
      auth.placement = 'header';
    } else if (config.placement === 'queryparams') {
      auth.placement = 'query';
    }
  }

  return auth;
};

export const toOpenCollectionAuth = (auth?: BrunoAuth | null): Auth | undefined => {
  if (!auth || auth.mode === 'none') {
    return undefined;
  }

  if (auth.mode === 'inherit') {
    return 'inherit';
  }

  switch (auth.mode) {
    case 'awsv4':
      return buildAwsV4Auth(auth.awsv4);
    case 'basic':
      return buildBasicAuth(auth.basic);
    case 'bearer':
      return buildBearerAuth(auth.bearer);
    case 'digest':
      return buildDigestAuth(auth.digest);
    case 'ntlm':
      return buildNtlmAuth(auth.ntlm);
    case 'wsse':
      return buildWsseAuth(auth.wsse);
    case 'apikey':
      return buildApiKeyAuth(auth.apikey);
    case 'oauth2':
      return toOpenCollectionOAuth2(auth.oauth2);
    default:
      console.warn(`toOpenCollectionAuth failed: Unsupported auth mode "${auth.mode}".`);
      return undefined;
  }
};

export const toBrunoAuth = (auth: Auth | null | undefined): BrunoAuth | null => {
  const brunoAuth: BrunoAuth = {
    mode: 'none',
    awsv4: null,
    basic: null,
    bearer: null,
    digest: null,
    ntlm: null,
    oauth2: null,
    wsse: null,
    apikey: null
  };

  if (!auth) {
    return brunoAuth;
  }

  if (auth === 'inherit') {
    brunoAuth.mode = 'inherit';
    return brunoAuth;
  }

  switch (auth.type) {
    case 'awsv4':
      brunoAuth.mode = 'awsv4';
      brunoAuth.awsv4 = {
        accessKeyId: auth.accessKeyId || null,
        secretAccessKey: auth.secretAccessKey || null,
        sessionToken: auth.sessionToken || null,
        service: auth.service || null,
        region: auth.region || null,
        profileName: auth.profileName || null
      };
      break;

    case 'basic':
      brunoAuth.mode = 'basic';
      brunoAuth.basic = {
        username: auth.username || null,
        password: auth.password || null
      };
      break;

    case 'bearer':
      brunoAuth.mode = 'bearer';
      brunoAuth.bearer = {
        token: auth.token || null
      };
      break;

    case 'digest':
      brunoAuth.mode = 'digest';
      brunoAuth.digest = {
        username: auth.username || null,
        password: auth.password || null
      };
      break;

    case 'ntlm':
      brunoAuth.mode = 'ntlm';
      brunoAuth.ntlm = {
        username: auth.username || null,
        password: auth.password || null,
        domain: auth.domain || null
      };
      break;

    case 'wsse':
      brunoAuth.mode = 'wsse';
      brunoAuth.wsse = {
        username: auth.username || null,
        password: auth.password || null
      };
      break;

    case 'apikey':
      brunoAuth.mode = 'apikey';
      brunoAuth.apikey = {
        key: auth.key || null,
        value: auth.value || null,
        placement: auth.placement === 'query' ? 'queryparams' : (auth.placement === 'header' ? 'header' : null)
      };
      break;

    case 'oauth2':
      brunoAuth.mode = 'oauth2';
      brunoAuth.oauth2 = toBrunoOAuth2(auth);
      break;

    default:
      console.warn('toBrunoAuth failed: Unsupported auth type');
      break;
  }

  return brunoAuth;
};
