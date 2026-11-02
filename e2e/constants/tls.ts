// Node surfaces the server's mTLS rejection as an OpenSSL handshake alert (e.g.
// "tlsv13 alert certificate required" / "sslv3 alert handshake failure"). Match the
// family of TLS/client-cert failures so an unrelated error (DNS, timeout, script) can't
// satisfy the test.
export const TLS_HANDSHAKE_FAILURE = /certificate required|handshake failure|bad certificate|tlsv1.*alert|sslv3 alert|SSL alert number|SSL routines/i;
export const SELF_SIGNED_CERTIFICATE = /self[ -]signed certificate/i;
