import { get, post, put } from './base';

const AuthApi = {
  whoami: () =>get('auth/v1/user/whoami'),
  signup: (params) =>post('auth/v1/user/signup', params),
  login: (params) =>post('auth/v1/user/login', params),
  signout: () => post('auth/v1/user/logout'),
  getProfile: () =>get('auth/v1/user/profile'),
  updateProfile: (params) =>put('auth/v1/user/profile', params),
  updateUsername: (params) =>put('auth/v1/user/username', params)
};

export default AuthApi;