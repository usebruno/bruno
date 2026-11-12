import { matchesClientCertDomain } from './http-https-agents';

describe('matchesClientCertDomain', () => {
  it('should match exact domains with https scheme', () => {
    expect(matchesClientCertDomain('example.com', 'https://example.com/api')).toBe(true);
    expect(matchesClientCertDomain('example.com', 'https://example.com:8443/api')).toBe(true);
    expect(matchesClientCertDomain('example.com', 'https://example.com')).toBe(true);
    expect(matchesClientCertDomain('example.com', 'https://example.com?query=true')).toBe(true);
  });

  it('should match schemeless URLs', () => {
    expect(matchesClientCertDomain('example.com', 'example.com/api')).toBe(true);
    expect(matchesClientCertDomain('example.com', 'example.com:443')).toBe(true);
  });

  it('should match grpc and wss schemes', () => {
    expect(matchesClientCertDomain('example.com', 'grpc://example.com:50051')).toBe(true);
    expect(matchesClientCertDomain('example.com', 'grpcs://example.com:50051')).toBe(true);
    expect(matchesClientCertDomain('example.com', 'wss://example.com/socket')).toBe(true);
  });

  it('should match wildcard subdomains', () => {
    expect(matchesClientCertDomain('*.example.com', 'https://api.example.com/test')).toBe(true);
    expect(matchesClientCertDomain('*.example.com', 'https://sub.domain.example.com/test')).toBe(true);
  });

  it('should NOT match untrusted domains sharing the domain prefix (prevent credential leak)', () => {
    expect(matchesClientCertDomain('example.com', 'https://example.com.evil.com/path')).toBe(false);
    expect(matchesClientCertDomain('example.com', 'https://example.company.com')).toBe(false);
    expect(matchesClientCertDomain('example.com', 'https://example.com-phishing.com')).toBe(false);
    expect(matchesClientCertDomain('api.example.com', 'https://api.example.com.attacker.com')).toBe(false);
  });

  it('should safely return false for empty or missing inputs', () => {
    expect(matchesClientCertDomain('', 'https://example.com')).toBe(false);
    expect(matchesClientCertDomain('example.com', '')).toBe(false);
    expect(matchesClientCertDomain(null as any, 'https://example.com')).toBe(false);
  });
});
