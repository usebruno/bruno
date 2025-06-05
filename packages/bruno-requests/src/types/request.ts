type T_KeyValue = {
  key: string;
  value: string;
};

type T_SendRequestConfig = {
  url: string;
  method?: string;
  header?: Record<string, string> | T_KeyValue[];
  body: {
    mode: 'raw' | 'urlencoded' | 'formdata' | 'graphql' | 'file';
    raw?: string | object;
    urlencoded?: T_KeyValue[];
    formdata?: T_KeyValue[];
  },
  variables?: Record<string, string>,
  script?: {
    req?: string;
    res?: string;
  }
};

type T_NameValue = {
  name: string;
  value: string;
  enabled: boolean;
};

type T_RawBody = {
  mode: 'text',
  text: string | object;
};

type T_MultipartFormBody = {
  mode: 'multipartForm';
  multipartForm: (T_NameValue & { type: 'text' })[];
};

type T_FormUrlEncodedBody = {
  mode: 'formUrlEncoded';
  formUrlEncoded: T_NameValue[]
};

type T_RequestItem = {
  request: {
    url: string;
    method: string;
    headers: T_NameValue[];
    auth: {
      mode: string
    };
    body?: T_RawBody | T_MultipartFormBody | T_FormUrlEncodedBody;
    script?: {
      req?: string;
      res?: string;
    },
    vars?: {
      req?: T_NameValue[]
    }
  }
};

export {
  T_SendRequestConfig,
  T_RequestItem
};