export const encodeBase64 = (str: string) => {
	const bytes = new TextEncoder().encode(str);
	const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
	return btoa(binary);
}

export const decodeBase64 =(base64: string) => {
  const binary = atob(base64); // Base64 → binary string
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0)); // binary → bytes
  return new TextDecoder().decode(bytes); // bytes → UTF-8 string
}

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