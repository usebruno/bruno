import type { KeyValue, Auth, GraphqlBody } from '../common';

export interface GraphqlSubscriptionRequestBody {
  mode: 'graphql';
  graphql?: GraphqlBody | null;
}

export interface GraphqlSubscriptionRequest {
  url: string;
  headers: KeyValue[];
  auth?: Auth | null;
  body: GraphqlSubscriptionRequestBody;
  connectionParams?: string | null;
  docs?: string | null;
}
