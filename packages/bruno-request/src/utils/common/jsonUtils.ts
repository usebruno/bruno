export function safeStringifyJSON(data: any) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    return null;
  }
}

export function safeParseJSON(data: string) {
  try {
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}
