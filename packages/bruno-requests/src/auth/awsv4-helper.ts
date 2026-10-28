import { fromIni } from '@aws-sdk/credential-providers';
import { aws4Interceptor } from 'aws4-axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export type AwsV4Config = {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  service?: string;
  region?: string;
  profileName?: string;
};

type RequestWithAwsV4 = {
  awsv4config?: AwsV4Config;
};

const isStrPresent = (str: unknown): boolean => {
  return Boolean(str) && str !== '' && str !== 'undefined';
};

/**
 * When a profile name is set, loads credentials from the shared AWS config/credentials files
 * and writes them onto `request.awsv4config` (mutates in place).
 */
export const resolveAwsV4Credentials = async (request: RequestWithAwsV4): Promise<AwsV4Config> => {
  const awsv4 = request.awsv4config as AwsV4Config;
  if (isStrPresent(awsv4.profileName)) {
    try {
      const credentialsProvider = fromIni({
        profile: awsv4.profileName,
        ignoreCache: true
      });
      const credentials = await credentialsProvider();
      awsv4.accessKeyId = credentials.accessKeyId;
      awsv4.secretAccessKey = credentials.secretAccessKey;
      awsv4.sessionToken = credentials.sessionToken;
    } catch {
      console.error('Failed to fetch credentials from AWS profile.');
    }
  }
  return awsv4;
};

export const addAwsV4Interceptor = (axiosInstance: AxiosInstance, request: RequestWithAwsV4): void => {
  if (!request.awsv4config) {
    console.warn('No Auth Config found!');
    return;
  }

  const awsv4 = request.awsv4config;
  if (!isStrPresent(awsv4.accessKeyId) || !isStrPresent(awsv4.secretAccessKey)) {
    console.warn('Required Auth Fields are not present');
    return;
  }

  const interceptor = aws4Interceptor({
    options: {
      region: awsv4.region,
      service: awsv4.service
    },
    credentials: {
      accessKeyId: awsv4.accessKeyId as string,
      secretAccessKey: awsv4.secretAccessKey as string,
      sessionToken: awsv4.sessionToken
    }
  });

  axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig & { __skipAwsV4Sign?: boolean }) => {
    if (config.__skipAwsV4Sign) {
      return config;
    }
    return interceptor(config);
  });
};
