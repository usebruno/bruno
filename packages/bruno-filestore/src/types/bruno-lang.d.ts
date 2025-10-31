declare module '@usebruno/lang' {
  export function bruToJsonV2(bruContent: string): any;
  export function jsonToBruV2(jsonData: any): string;
  export function bruToEnvJsonV2(bruContent: string): any;
  export function envJsonToBruV2(jsonData: any): string;
  export function collectionBruToJson(bruContent: string): any;
  export function jsonToCollectionBru(jsonData: any): string;
  export function dotenvToJson(envContent: string): Record<string, string>;
} 