function FindProxyForURL(url, host) {
  if (url.indexOf('/proxied') !== -1) {
    return 'PROXY localhost:18888';
  }
  return 'DIRECT';
}
