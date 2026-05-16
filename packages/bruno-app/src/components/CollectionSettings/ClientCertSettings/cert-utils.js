export const normalizeDomain = (domain) => domain?.trim().toLowerCase() || '';

export const disableOtherCertsOnSameDomain = (certs, domain, excludeIndex = -1) => {
  if (!domain) return certs;
  return certs.map((cert, index) =>
    index !== excludeIndex && normalizeDomain(cert.domain) === domain
      ? { ...cert, enabled: false }
      : cert
  );
};
