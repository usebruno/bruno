#!/usr/bin/env python3
from mitmproxy import http, ctx

# Map listening port -> header name
PORT_HEADER_MAP = {
    8091: "X-Bruno-Proxy-System",
    8092: "X-Bruno-Proxy-App",
    8093: "X-Bruno-Proxy-Collection"
}

# value to set for the header
HEADER_VALUE = "via-mitmproxy"

def response(flow: http.HTTPFlow) -> None:
    if not flow.response:
        return

    listen_port = getattr(ctx.options, "listen_port", None)
    header_name = PORT_HEADER_MAP.get(listen_port, "X-Bruno-Proxy")  # fallback

    # add or replace header
    flow.response.headers[header_name] = HEADER_VALUE

    # optional logging
    ctx.log.info(f"Added header {header_name}: {HEADER_VALUE} to {flow.request.pretty_url}")
