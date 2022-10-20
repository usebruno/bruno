import { get, post, put } from "./base";

// not used. kept as a placeholder for reference while implementing license key stuff
const AuthApi = {
  whoami: () => get("auth/v1/user/whoami"),
  signup: (params) => post("auth/v1/user/signup", params),
  login: (params) => {
    return new Promise((resolve, reject) => {
      const { ipcRenderer } = window.require("electron");

      ipcRenderer
        .invoke("bruno-account-request", {
          data: params,
          method: "POST",
          url: `${process.env.NEXT_PUBLIC_BRUNO_SERVER_API}/auth/v1/user/login`,
        })
        .then(resolve)
        .catch(reject);
    });
  },
};

export default AuthApi;
