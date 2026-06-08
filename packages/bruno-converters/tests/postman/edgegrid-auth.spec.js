import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../src/postman/postman-to-bruno';
import { brunoToPostman } from '../../src/postman/bruno-to-postman';

// Bruno's auth.edgegrid keys are camelCase, 1:1 with Postman (baseURL, maxBodySize, etc.).
const EDGEGRID = {
  accessToken: 'akab-access-token',
  clientToken: 'akab-client-token',
  clientSecret: 'secret==',
  nonce: 'my-nonce',
  timestamp: '20240101T00:00:00+0000',
  baseURL: 'https://akaa-x.luna.akamaiapis.net',
  headersToSign: 'X-Test1,X-Test2',
  maxBodySize: '2048'
};

const brunoCollectionWithEdgeGrid = () => ({
  name: 'EdgeGrid Collection',
  items: [
    {
      name: 'EdgeGrid Request',
      type: 'http-request',
      request: {
        method: 'GET',
        url: 'https://akaa-x.luna.akamaiapis.net/identity/v1',
        headers: [],
        auth: { mode: 'edgegrid', edgegrid: { ...EDGEGRID } }
      }
    }
  ]
});

const findByKey = (arr, key) => arr.find((x) => x.key === key)?.value;

describe('EdgeGrid — Postman export (bruno → postman)', () => {
  it('produces a postman edgegrid auth block with all fields incl. maxBodySize', () => {
    const result = brunoToPostman(brunoCollectionWithEdgeGrid());
    const auth = result.item[0].request.auth;

    expect(auth.type).toBe('edgegrid');
    expect(findByKey(auth.edgegrid, 'accessToken')).toBe(EDGEGRID.accessToken);
    expect(findByKey(auth.edgegrid, 'clientToken')).toBe(EDGEGRID.clientToken);
    expect(findByKey(auth.edgegrid, 'clientSecret')).toBe(EDGEGRID.clientSecret);
    expect(findByKey(auth.edgegrid, 'baseURL')).toBe(EDGEGRID.baseURL);
    expect(findByKey(auth.edgegrid, 'nonce')).toBe(EDGEGRID.nonce);
    expect(findByKey(auth.edgegrid, 'timestamp')).toBe(EDGEGRID.timestamp);
    expect(findByKey(auth.edgegrid, 'headersToSign')).toBe(EDGEGRID.headersToSign);
    expect(findByKey(auth.edgegrid, 'maxBodySize')).toBe(EDGEGRID.maxBodySize);
  });

  it('handles empty optional fields without crashing', () => {
    const collection = {
      name: 'c',
      items: [
        {
          name: 'r',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://x.luna.akamaiapis.net/',
            headers: [],
            auth: { mode: 'edgegrid', edgegrid: { accessToken: 'at', clientToken: 'ct', clientSecret: 'cs' } }
          }
        }
      ]
    };
    const result = brunoToPostman(collection);
    const auth = result.item[0].request.auth;
    expect(auth.type).toBe('edgegrid');
    expect(findByKey(auth.edgegrid, 'baseURL')).toBe('');
    expect(findByKey(auth.edgegrid, 'maxBodySize')).toBe('');
  });
});

describe('EdgeGrid — Postman import (postman → bruno)', () => {
  it('imports edgegrid auth at request level with all credentials', async () => {
    const postmanCollection = {
      info: { name: 'C', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [
        {
          name: 'EdgeGrid Request',
          request: {
            method: 'GET',
            url: 'https://akaa-x.luna.akamaiapis.net/identity/v1',
            auth: {
              type: 'edgegrid',
              edgegrid: [
                { key: 'accessToken', value: EDGEGRID.accessToken },
                { key: 'clientToken', value: EDGEGRID.clientToken },
                { key: 'clientSecret', value: EDGEGRID.clientSecret },
                { key: 'baseURL', value: EDGEGRID.baseURL },
                { key: 'nonce', value: EDGEGRID.nonce },
                { key: 'timestamp', value: EDGEGRID.timestamp },
                { key: 'headersToSign', value: EDGEGRID.headersToSign },
                { key: 'maxBodySize', value: EDGEGRID.maxBodySize }
              ]
            }
          }
        }
      ]
    };
    const { collection } = await postmanToBruno(postmanCollection);
    const auth = collection.items[0].request.auth;
    expect(auth.mode).toBe('edgegrid');
    expect(auth.edgegrid).toEqual(EDGEGRID);
  });
});

describe('EdgeGrid — Postman round-trip (bruno → postman → bruno)', () => {
  it('preserves all 8 fields including maxBodySize', async () => {
    const postman = brunoToPostman(brunoCollectionWithEdgeGrid());
    const { collection } = await postmanToBruno(postman);
    const auth = collection.items[0].request.auth;
    expect(auth.mode).toBe('edgegrid');
    expect(auth.edgegrid).toEqual(EDGEGRID);
  });
});
