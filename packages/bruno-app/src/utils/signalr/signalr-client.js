import {
  HubConnectionBuilder, LogLevel
} from '@microsoft/signalr';
export function createSignalRConnection({
  url,
  token
}) {
  const connection = new HubConnectionBuilder()
    .withUrl(url, {
      accessTokenFactory() {
        return token ?? '';
      }
    })
    .configureLogging(LogLevel.Information)
    .withAutomaticReconnect()
    .build();

  return connection;
}
