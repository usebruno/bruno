import { get, post, put } from './base';

const AuthApi = {
  whoami: () => get('auth/v1/user/whoami'),
  signup: (params) => post('auth/v1/user/signup', params),
  login: (params) => {
    return new Promise((resolve, reject) => {
      const { ipcRenderer } = window.require("electron");

      ipcRenderer.invoke('grafnode-account-request', {
        data: params,
        method: 'POST',
        url: `${process.env.NEXT_PUBLIC_GRAFNODE_SERVER_API}/auth/v1/user/login`,
      })
      .then(resolve)
      .catch(reject);
    });
  },
  signout: () => post('auth/v1/user/logout'),
  getProfile: () => get('auth/v1/user/profile'),
  updateProfile: (params) => put('auth/v1/user/profile', params),
  updateUsername: (params) => put('auth/v1/user/username', params)
};

export default AuthApi;