export const RESPONSE_BODY_CHANNELS = {
  SAVE: 'renderer:response-body-save',
  READ: 'renderer:response-body-read',
  PIN: 'renderer:response-body-pin',
  RELEASE: 'renderer:response-body-release'
};

export const mediaUrlFor = (bodyRef) => {
  if (!bodyRef) return null;
  return `bruno-response://body/${bodyRef}`;
};
