import type {
  KeyValue,
  Script,
  Variables,
  Auth,
  MultipartForm,
  FileList,
  GraphqlBody
} from '../common';

export type HttpRequestParamType = 'query' | 'path';

export interface HttpRequestParam extends KeyValue {
  type: HttpRequestParamType;
}

export type HttpRequestBodyMode
  = | 'none'
    | 'json'
    | 'text'
    | 'xml'
    | 'formUrlEncoded'
    | 'multipartForm'
    | 'graphql'
    | 'sparql'
    | 'file';

export interface HttpRequestBody {
  mode: HttpRequestBodyMode;
  json?: string | null;
  text?: string | null;
  xml?: string | null;
  sparql?: string | null;
  formUrlEncoded?: KeyValue[] | null;
  multipartForm?: MultipartForm | null;
  graphql?: GraphqlBody | null;
  file?: FileList | null;
}

export interface BodyVariant {
  uid: string;
  name: string;
  body: HttpRequestBody;
}

export interface HttpRequest {
  url: string;
  method: string;
  headers: KeyValue[];
  params: HttpRequestParam[];
  auth?: Auth | null;
  body?: HttpRequestBody | null;
  bodyVariants?: BodyVariant[] | null;
  activeBodyVariantUid?: string | null;
  script?: Script | null;
  vars?: {
    req: Variables;
    res: Variables;
  } | null;
  assertions?: KeyValue[] | null;
  tests?: string | null;
  docs?: string | null;
}
