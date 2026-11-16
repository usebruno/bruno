import type { AuthOAuth2 } from '@opencollection/types/common/auth';
import type {
  OAuth2 as BrunoOAuth2,
  OAuthAdditionalParameter as BrunoOAuthAdditionalParameter
} from '@usebruno/schema-types/common/auth';
import { toBrunoOAuth2, toOpenCollectionOAuth2 } from './auth-oauth2';

// Hand-written yml can hold any scalar, or nothing, where the schema expects a string.
const readTokenParameter = (parameter: Record<string, unknown>) => {
  const oauth = {
    type: 'oauth2',
    flow: 'client_credentials',
    accessTokenUrl: 'https://auth.example.com/token',
    additionalParameters: { accessTokenRequest: [{ placement: 'body', ...parameter }] }
  } as unknown as AuthOAuth2;

  return toBrunoOAuth2(oauth)?.additionalParameters?.token;
};

describe('oauth2 additional parameters', () => {
  it.each([
    ['a missing value', { name: 'a_missing_value' }, { name: 'a_missing_value', value: '' }],
    ['a missing name', { value: 'a_missing_name' }, { name: '', value: 'a_missing_name' }],
    ['a number value', { name: 'a_number_value', value: 1 }, { name: 'a_number_value', value: '1' }],
    ['a zero value', { name: 'a_zero_value', value: 0 }, { name: 'a_zero_value', value: '0' }],
    ['a false value', { name: 'a_false_value', value: false }, { name: 'a_false_value', value: 'false' }]
  ])('reads %s as a string', (_case, parameter, expected) => {
    const result = readTokenParameter(parameter);

    expect(result).toEqual([{ ...expected, sendIn: 'body', enabled: true }]);
  });

  it('round-trips a parameter with an empty value through OC conversion', () => {
    const parameter: BrunoOAuthAdditionalParameter = { name: 'empty_value', value: '', sendIn: 'body', enabled: true };
    const oauth: BrunoOAuth2 = {
      grantType: 'client_credentials',
      accessTokenUrl: 'https://auth.example.com/token',
      additionalParameters: { token: [parameter] }
    };

    const result = toBrunoOAuth2(toOpenCollectionOAuth2(oauth));

    expect(result?.additionalParameters?.token).toEqual([parameter]);
  });
});
