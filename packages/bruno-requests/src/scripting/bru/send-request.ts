import { get } from "lodash-es";
import { T_RequestItem, T_SendRequestConfig } from "../../types/request";

const transformSendRequestConfigToRequestItem = ({ requestConfig }: { requestConfig: T_SendRequestConfig }) => {
  const { url, method = 'GET', body, variables } = requestConfig || {};

  if (!url?.length) throw new Error('URL is required!');

  const requestItem: T_RequestItem = {
    request: {
      method,
      url,
      headers: [],
      auth: {
        mode: 'none'
      },
      script: {
        req: "",
        res: ""
      },
      vars: {
        req: []
      }
    }
  }

  // headers
  const headers = get(requestConfig, 'header', {});
  const headersEntries = Object.entries(headers);
  if (headersEntries?.length) {
    requestItem.request.headers = headersEntries?.map(([name, value]) => ({ 
      name, value, enabled: true 
    }));
  }

  // variables - add them as request-level variables
  if (variables && requestItem?.request?.vars) {
    const variablesEntries = Object.entries(variables);
    requestItem.request.vars.req = variablesEntries?.map(([name, value]) => ({ 
      name, value, enabled: true 
    }));
  }

  // body
  const { mode: bodyMode } = body || {};

  if (bodyMode == "formdata") {
    requestItem.request.body = {
      mode: 'multipartForm',
      multipartForm: body?.formdata?.map(({ key, value }) => ({ 
        name: key, value, type: 'text', enabled: true
      })) || []
    };
  } else if (bodyMode == "urlencoded") {
    requestItem.request.body = {
      mode: 'formUrlEncoded',
      formUrlEncoded: body?.urlencoded?.map(({ key, value }) => ({ 
        name: key, value, enabled: true 
      })) || []
    };
  } else {
    // default
    requestItem.request.body = {
      mode: 'text',
      text: body?.raw || ''
    }
  }
  
  return requestItem;
};

export {
  transformSendRequestConfigToRequestItem
}