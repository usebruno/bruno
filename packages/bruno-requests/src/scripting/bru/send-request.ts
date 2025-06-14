import { AxiosRequestConfig } from "axios";
import { makeAxiosInstance } from "../../network";

type T_SendRequestCallback = (error: any, response: any) => void;

const sendRequest = (requestConfig: AxiosRequestConfig, callback: T_SendRequestCallback) => {
    const axiosInstance = makeAxiosInstance();
    if (!callback) {
        return axiosInstance(requestConfig);
    }
    axiosInstance(requestConfig)
    .then(response => callback(null, response))
    .catch(error => callback(error, null));
};

export default sendRequest;
