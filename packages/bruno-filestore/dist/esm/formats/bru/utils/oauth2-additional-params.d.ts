type T_Oauth2ParameterSendInType = 'headers' | 'queryparams' | 'body';
export interface T_OAuth2AdditionalParam {
    name: string;
    value: string;
    enabled: boolean;
    sendIn: T_Oauth2ParameterSendInType;
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
/**
 * This function extracts OAuth2 additional parameters from various sources in the bru json data and organizes
 * them into a structured format based on their usage context (authorization, token, refresh).
 *
 * @param json - json object containing OAuth2 configuration and additional parameters
 * @returns OAuth2 additional parameters
 */
export declare const getOauth2AdditionalParameters: (json: T_BruJson) => T_OAuth2AdditionalParameters;
export {};
