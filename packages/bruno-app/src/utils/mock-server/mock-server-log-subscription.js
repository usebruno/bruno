const listeningUids = new Set();

export const subscribeMockServerLog = (mockServerUid) => {
  if (!mockServerUid) {
    return () => {};
  }

  listeningUids.add(mockServerUid);

  return () => {
    listeningUids.delete(mockServerUid);
  };
};

export const isMockServerLogListening = (mockServerUid) => (
  mockServerUid ? listeningUids.has(mockServerUid) : false
);
