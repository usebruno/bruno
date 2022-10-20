import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GRAFNODE_SERVER_API,
});

apiClient.interceptors.request.use(
  (config) => {
    const headers = {
      "Content-Type": "application/json",
    };

    return {
      ...config,
      headers: headers,
    };
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    return Promise.reject(error.response ? error.response.data : error);
  }
);

const { get, post, put, delete: destroy } = apiClient;

export { get, post, put, destroy };
