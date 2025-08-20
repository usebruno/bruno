type T_Oauth2ParameterType = 'authorization' | 'token' | 'refresh';
type T_Oauth2ParameterSendInType = 'headers' | 'queryparams' | 'body';

export interface T_OAuth2AdditionalParam {
  name: string;
  value: string;
  enabled: boolean;
  sendIn: T_Oauth2ParameterSendInType
}

export interface T_OAuth2AdditionalParameters {
  authorization?: T_OAuth2AdditionalParam[];
  token?: T_OAuth2AdditionalParam[];
  refresh?: T_OAuth2AdditionalParam[];
}

export interface T_Oauth2Auth {
  grantType: string;
  additionalParameters?: T_OAuth2AdditionalParameters;
}

export interface T_BruJson {
  auth: {
    oauth2: T_Oauth2Auth;
  };
  oauth2_additional_parameters_auth_req_headers?: any[];
  oauth2_additional_parameters_auth_req_queryparams?: any[];
  oauth2_additional_parameters_access_token_req_headers?: any[];
  oauth2_additional_parameters_access_token_req_queryparams?: any[];
  oauth2_additional_parameters_access_token_req_bodyvalues?: any[];
  oauth2_additional_parameters_refresh_token_req_headers?: any[];
  oauth2_additional_parameters_refresh_token_req_queryparams?: any[];
  oauth2_additional_parameters_refresh_token_req_bodyvalues?: any[];
}

interface T_Oauth2ParameterMapping {
  type: T_Oauth2ParameterType;
  sendIn: T_Oauth2ParameterSendInType;
  source: keyof T_BruJson;
}

const PARAMETER_MAPPINGS: T_Oauth2ParameterMapping[] = [
  // Authorization parameters (only for authorization_code grant type)
  { type: 'authorization', sendIn: 'headers', source: 'oauth2_additional_parameters_auth_req_headers' },
  { type: 'authorization', sendIn: 'queryparams', source: 'oauth2_additional_parameters_auth_req_queryparams' },
  
  // Token parameters (for all grant types)
  { type: 'token', sendIn: 'headers', source: 'oauth2_additional_parameters_access_token_req_headers' },
  { type: 'token', sendIn: 'queryparams', source: 'oauth2_additional_parameters_access_token_req_queryparams' },
  { type: 'token', sendIn: 'body', source: 'oauth2_additional_parameters_access_token_req_bodyvalues' },
  
  // Refresh parameters (for grant types that support refresh)
  { type: 'refresh', sendIn: 'headers', source: 'oauth2_additional_parameters_refresh_token_req_headers' },
  { type: 'refresh', sendIn: 'queryparams', source: 'oauth2_additional_parameters_refresh_token_req_queryparams' },
  { type: 'refresh', sendIn: 'body', source: 'oauth2_additional_parameters_refresh_token_req_bodyvalues' },
];

/**
 * Maps source parameters to T_OAuth2AdditionalParam format
 */
const mapParametersFromSource = (sourceParams: any[], sendIn: T_Oauth2ParameterSendInType): T_OAuth2AdditionalParam[] => {
  if (!sourceParams?.length) {
    return [];
  }
  
  return sourceParams.map(param => ({
    ...param,
    sendIn
  }));
};

/**
 * Checks if a parameter type should be included based on grant type
 */
const shouldIncludeParameterType = (type: T_Oauth2ParameterType, grantType: string): boolean => {
  // Authorization parameters are only valid for authorization_code grant type
  if (type === 'authorization') {
    return grantType === 'authorization_code' || grantType === 'implicit';
  }

  if (type === 'token' || type === 'refresh') {
    return grantType !== 'implicit';
  }
  
  // Token and refresh parameters are valid for all grant types
  return true;
};

/**
 * Collects all parameters for a specific type (authorization, token, or refresh)
 */
const collectParametersForType = (
  json: T_BruJson, 
  type: T_Oauth2ParameterType, 
  grantType: string
): T_OAuth2AdditionalParam[] => {
  if (!shouldIncludeParameterType(type, grantType)) {
    return [];
  }

  const relevantMappings = PARAMETER_MAPPINGS.filter(mapping => mapping.type === type);
  const allParams: T_OAuth2AdditionalParam[] = [];

  for (const mapping of relevantMappings) {
    const sourceParams = json[mapping.source] as any[];
    const mappedParams = mapParametersFromSource(sourceParams, mapping.sendIn);
    allParams.push(...mappedParams);
  }

  return allParams;
};

/**
 * This function extracts OAuth2 additional parameters from various sources in the bru json data and organizes
 * them into a structured format based on their usage context (authorization, token, refresh).
 * 
 * @param json - json object containing OAuth2 configuration and additional parameters
 * @returns OAuth2 additional parameters
 */
export const getOauth2AdditionalParameters = (json: T_BruJson): T_OAuth2AdditionalParameters  => {
  const grantType = json.auth.oauth2.grantType;
  const additionalParameters: T_OAuth2AdditionalParameters = {};

  try {
    // Collect parameters for each type
    const parameterTypes: T_Oauth2ParameterType[] = ['authorization', 'token', 'refresh'];
    
    for (const type of parameterTypes) {
      const params = collectParametersForType(json, type, grantType);
      if (params.length > 0) {
        additionalParameters[type] = params;
      }
    }
  }
  catch(error) {
    console.error(error);
    console.error("Error while getting the oauth2 additional parameters!");
  }
  
  return additionalParameters;
};