// HTTP/2 RST_STREAM / GOAWAY error codes. Values are fixed by the spec.
const ERROR_CODE_NAMES: Record<number, string> = {
  0: 'NO_ERROR',
  1: 'PROTOCOL_ERROR',
  2: 'INTERNAL_ERROR',
  3: 'FLOW_CONTROL_ERROR',
  4: 'SETTINGS_TIMEOUT',
  5: 'STREAM_CLOSED',
  6: 'FRAME_SIZE_ERROR',
  7: 'REFUSED_STREAM',
  8: 'CANCEL',
  9: 'COMPRESSION_ERROR',
  10: 'CONNECT_ERROR',
  11: 'ENHANCE_YOUR_CALM',
  12: 'INADEQUATE_SECURITY',
  13: 'HTTP_1_1_REQUIRED'
};

export const rstCodeLabel = (code: number): string => {
  const name = ERROR_CODE_NAMES[code];
  return name ? `${name} (${code})` : `code ${code}`;
};
