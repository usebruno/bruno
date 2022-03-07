import { get, post, put } from './base';

const IdentityApi = {
  whoami: () =>get('v1/user/whoami'),
  signup: (params) =>post('v1/user/register', params),
  login: (params) =>post('v1/user/login', params),
  signout: () => post('v1/user/logout'),
  getProfile: () =>get('v1/user/profile'),
  updateProfile: (params) =>put('v1/user/profile', params),
  updateUsername: (params) =>put('v1/user/username', params)
};

export default IdentityApi;