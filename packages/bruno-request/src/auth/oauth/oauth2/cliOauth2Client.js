import OAuth2Client from './oauth2Client';

class CLIOAuth2Client extends OAuth2Client {
  constructor(store) {
    super(store);
  }

  async getOAuth2TokenUsingAuthorizationCode(params) {
    throw new Error('Authorization Code Grant is not supported in CLI context.');
  }
}

export default CLIOAuth2Client;
