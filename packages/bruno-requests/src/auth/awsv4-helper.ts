import { fromIni } from '@aws-sdk/credential-providers';
import { aws4Interceptor } from 'aws4-axios';
import { AxiosInstance } from 'axios';

export interface AwsV4Config {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region: string;
  service: string;
  profileName?: string;
}

const isStrPresent = (str: string | undefined | null): boolean => {
  return !!str && str !== '' && str !== 'undefined';
};

export const resolveAwsV4Credentials = async (request: { awsv4config: AwsV4Config }): Promise<AwsV4Config> => {
  const awsv4 = request.awsv4config;
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

export const addAwsV4Interceptor = (axiosInstance: AxiosInstance, request: { awsv4config?: AwsV4Config }): void => {
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
      accessKeyId: awsv4.accessKeyId!,
      secretAccessKey: awsv4.secretAccessKey!,
      sessionToken: awsv4.sessionToken
    }
  });

  axiosInstance.interceptors.request.use(interceptor);
};
