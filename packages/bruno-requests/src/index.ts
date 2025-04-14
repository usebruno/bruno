import CLIStore from './store/cli-store';
import ElectronStore from './store/electron-store';
import Oauth2Store from './store/oauth2-store';
import CLIOAuth2Client from './auth/oauth/oauth2/cliOauth2Client';
import ElectronOAuth2Client from './auth/oauth/oauth2/electronOauth2Client';
import isElectron from 'is-electron';

function createOAuthClient() {
  const store = isElectron()
    ? new ElectronStore({ name: 'oauth2', clearInvalidConfig: true })
    : new CLIStore({ name: 'oauth2' });

  const oauth2Store = new Oauth2Store(store);

  return isElectron() ? new ElectronOAuth2Client(oauth2Store) : new CLIOAuth2Client(oauth2Store);
}

const oauthClient = createOAuthClient();

// Export the oauthClient for use in other parts of your application
export default oauthClient;
