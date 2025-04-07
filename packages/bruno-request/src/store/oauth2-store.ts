import { v4 as uuid } from 'uuid';
import { safeParseJSON, safeStringifyJSON } from '../utils/common/index';
import { encryptString, decryptString } from '../utils/common/encryption';

interface Store {
  get(key: string): any;
  set(key: string, value: any): void;
}

interface OAuth2Credentials {
  url: string;
  data: string;
  credentialsId: string;
}

interface OAuth2Data {
  collectionUid: string;
  sessionId?: string;
  credentials?: OAuth2Credentials[];
}

interface CollectionParams {
  collectionUid: string;
  url: string;
}

interface CredentialsParams extends CollectionParams {
  credentialsId: string;
  credentials?: Record<string, any>;
}

class Oauth2Store {
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  public getAllOauth2Data(): OAuth2Data[] {
    let oauth2Data = this.store.get('collections');
    if (!Array.isArray(oauth2Data)) oauth2Data = [];
    return oauth2Data;
  }

  public getOauth2DataOfCollection({ collectionUid, url }: CollectionParams): OAuth2Data {
    let oauth2Data = this.getAllOauth2Data();
    let oauth2DataForCollection = oauth2Data.find((d) => d?.collectionUid === collectionUid);

    if (!oauth2DataForCollection) {
      const newOauth2DataForCollection: OAuth2Data = { collectionUid };
      const updatedOauth2Data = [...oauth2Data, newOauth2DataForCollection];
      this.store.set('collections', updatedOauth2Data);
      return newOauth2DataForCollection;
    }

    return oauth2DataForCollection;
  }

  public updateOauth2DataOfCollection({
    collectionUid,
    url,
    data
  }: {
    collectionUid: string;
    url: string;
    data: OAuth2Data;
  }): void {
    let oauth2Data = this.getAllOauth2Data();
    let updatedOauth2Data = oauth2Data.filter((d) => d.collectionUid !== collectionUid);
    updatedOauth2Data.push({ ...data });
    this.store.set('collections', updatedOauth2Data);
  }

  public createNewOauth2SessionIdForCollection({ collectionUid, url }: CollectionParams): OAuth2Data {
    let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });
    let newSessionId = uuid();
    let newOauth2DataForCollection = { ...oauth2DataForCollection, sessionId: newSessionId };
    this.updateOauth2DataOfCollection({ collectionUid, url, data: newOauth2DataForCollection });
    return newOauth2DataForCollection;
  }

  public getSessionIdOfCollection({ collectionUid, url }: CollectionParams): string | undefined {
    try {
      let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });
      if (oauth2DataForCollection?.sessionId && typeof oauth2DataForCollection.sessionId === 'string') {
        return oauth2DataForCollection.sessionId;
      }
      let newOauth2DataForCollection = this.createNewOauth2SessionIdForCollection({ collectionUid, url });
      return newOauth2DataForCollection?.sessionId;
    } catch (err) {
      console.log('error retrieving session id from cache', err);
    }
  }

  public clearSessionIdOfCollection({ collectionUid, url }: CollectionParams): void {
    try {
      let oauth2Data = this.getAllOauth2Data();
      let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });
      delete oauth2DataForCollection.sessionId;
      delete oauth2DataForCollection.credentials;
      let updatedOauth2Data = oauth2Data.filter((d) => d.collectionUid !== collectionUid);
      updatedOauth2Data.push({ ...oauth2DataForCollection });
      this.store.set('collections', updatedOauth2Data);
    } catch (err) {
      console.log('error while clearing the oauth2 session cache', err);
    }
  }

  public getCredentialsForCollection({
    collectionUid,
    url,
    credentialsId
  }: CredentialsParams): Record<string, any> | null {
    try {
      let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });
      let credentials = oauth2DataForCollection?.credentials?.find(
        (c) => c?.url === url && c?.credentialsId === credentialsId
      );
      if (!credentials?.data) return null;
      let decryptedCredentialsData = safeParseJSON(decryptString(credentials?.data));
      return decryptedCredentialsData;
    } catch (err) {
      console.log('error retrieving oauth2 credentials from cache', err);
      return null;
    }
  }

  public updateCredentialsForCollection({
    collectionUid,
    url,
    credentialsId,
    credentials = {}
  }: CredentialsParams): OAuth2Data | undefined {
    try {
      // @ts-ignore
      // FIX this
      let encryptedCredentialsData = encryptString(safeStringifyJSON(credentials));
      let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });
      let filteredCredentials =
        oauth2DataForCollection?.credentials?.filter((c) => c?.url !== url || c?.credentialsId !== credentialsId) || [];
      filteredCredentials.push({ url, data: encryptedCredentialsData, credentialsId });
      let newOauth2DataForCollection = { ...oauth2DataForCollection, credentials: filteredCredentials };
      this.updateOauth2DataOfCollection({ collectionUid, url, data: newOauth2DataForCollection });
      return newOauth2DataForCollection;
    } catch (err) {
      console.log('error updating oauth2 credentials from cache', err);
    }
  }

  public clearCredentialsForCollection({
    collectionUid,
    url,
    credentialsId
  }: CredentialsParams): OAuth2Data | undefined {
    try {
      let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });
      let filteredCredentials = oauth2DataForCollection?.credentials?.filter(
        (c) => c?.url !== url || c?.credentialsId !== credentialsId
      );
      let newOauth2DataForCollection = { ...oauth2DataForCollection, credentials: filteredCredentials };
      this.updateOauth2DataOfCollection({ collectionUid, url, data: newOauth2DataForCollection });
      return newOauth2DataForCollection;
    } catch (err) {
      console.log('error clearing oauth2 credentials from cache', err);
    }
  }
}

export default Oauth2Store;
