export const RESPONSE_BODY_CHANNELS = {
  STAT: 'renderer:response-body-stat',
  READ: 'renderer:response-body-read',
  SAVE: 'renderer:response-body-save',
  PIN: 'renderer:response-body-pin',
  RELEASE: 'renderer:response-body-release'
};

export const mediaUrlFor = (bodyRef) => {
  if (!bodyRef) return null;
  return `bruno-response://body/${bodyRef}`;
};
