export interface OAuth2Credentials {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  expires_at?: number;
}

export interface OAuth2TokenStoreParams {
  collectionUid: string;
  url: string;
  credentialsId: string;
}

export interface OAuth2TokenStore {
  getCredentials(params: OAuth2TokenStoreParams): OAuth2Credentials | null | Promise<OAuth2Credentials | null>;
  saveCredentials(params: OAuth2TokenStoreParams & { credentials: OAuth2Credentials }): void | Promise<void>;
  clearCredentials(params: OAuth2TokenStoreParams): void | Promise<void>;
}

export class InMemoryTokenStore implements OAuth2TokenStore {
  private store: Map<string, OAuth2Credentials> = new Map();

  private getKey(params: OAuth2TokenStoreParams): string {
    return `${params.collectionUid}:${params.url}:${params.credentialsId}`;
  }

  getCredentials(params: OAuth2TokenStoreParams): OAuth2Credentials | null {
    return this.store.get(this.getKey(params)) || null;
  }

  saveCredentials(params: OAuth2TokenStoreParams & { credentials: OAuth2Credentials }): void {
    this.store.set(this.getKey(params), params.credentials);
  }

  clearCredentials(params: OAuth2TokenStoreParams): void {
    this.store.delete(this.getKey(params));
  }

  clearAll(): void {
    this.store.clear();
  }
}
