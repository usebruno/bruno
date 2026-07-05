function FindProxyForURL(url, host) {
    // Route requests whose path starts with /proxied through the local test proxy
    if (url.indexOf("/proxied") > -1) {
        return "PROXY 127.0.0.1:18888";
    }
    return "DIRECT";
}
