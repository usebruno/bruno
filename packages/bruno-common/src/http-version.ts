export const HttpVersionMode = {
  Auto: 'auto',
  Http1: 'http1',
  Http2: 'http2'
} as const;
export type HttpVersionMode = (typeof HttpVersionMode)[keyof typeof HttpVersionMode];

/**
 * The app/collection level setting: the three modes plus `inherit`
 */
export const HttpVersionSetting = {
  ...HttpVersionMode,
  Inherit: 'inherit'
} as const;
export type HttpVersionSetting = (typeof HttpVersionSetting)[keyof typeof HttpVersionSetting];

export const HTTP_VERSION_MODES = Object.values(HttpVersionMode) as HttpVersionMode[];
export const HTTP_VERSION_SETTINGS = Object.values(HttpVersionSetting) as HttpVersionSetting[];

export const isHttpVersionMode = (value: unknown): value is HttpVersionMode =>
  typeof value === 'string' && (HTTP_VERSION_MODES as string[]).includes(value);

export const isHttpVersionSetting = (value: unknown): value is HttpVersionSetting =>
  typeof value === 'string' && (HTTP_VERSION_SETTINGS as string[]).includes(value);
