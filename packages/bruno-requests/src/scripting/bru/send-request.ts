import { AxiosRequestConfig } from "axios";
import { makeAxiosInstance } from "../../network";

type T_SendRequestCallback = (error: any, response: any) => void;

const sendRequest = async (requestConfig: AxiosRequestConfig, callback: T_SendRequestCallback) => {
    const axiosInstance = makeAxiosInstance();
    if (!callback) {
        return await axiosInstance(requestConfig);
    }
    try {
        const response = await axiosInstance(requestConfig);
        callback(null, response);
    }
    catch(error) {
        callback(error, null);
    }
};

export default sendRequest;
