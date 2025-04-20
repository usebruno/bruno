export const getContentType = (headers: Record<string, string | number | undefined>): string => {
  if (!headers || typeof headers !== 'object') {
    return '';
  }
  const contentType = Object.entries(headers)
    .find(([key]) => key.toLowerCase() === 'content-type')?.[1];
  return typeof contentType === 'string' ? contentType : '';
};

export const isHtmlContentType = (contentType: string) => {
  return contentType?.includes("html");
};

export const redactImageData = (data: string | object | number | boolean, contentType: string) => {
  if (contentType?.includes("image")) {
    return "Response content redacted (image data)";
  }
  return data;
}