import { AxiosRequestConfig } from "axios";
import { makeAxiosInstance } from "../network";

type T_SendRequestCallback = (error: any, response: any) => void;

const sendRequest = async (requestConfig: AxiosRequestConfig, callback: T_SendRequestCallback) => {
  const axiosInstance = makeAxiosInstance();
  if (!callback) {
    return await axiosInstance(requestConfig);
  }
  try {
    const response = await axiosInstance(requestConfig);
    try {
      callback(null, response);
    }
    catch(error) {
      return Promise.reject(error);
    }
  }
  catch (error) {
    try {
      callback(error, null);
    }
    catch(err) {
      return Promise.reject(err);
    }
  }
};

export default sendRequest;
