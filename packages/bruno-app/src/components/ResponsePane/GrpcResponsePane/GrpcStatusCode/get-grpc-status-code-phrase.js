// https://grpc.github.io/grpc/core/md_doc_statuscodes.html
const grpcStatusCodePhraseMap = {
  0: 'OK',
  1: 'Cancelled',
  2: 'Unknown',
  3: 'Invalid Argument',
  4: 'Deadline Exceeded',
  5: 'Not Found',
  6: 'Already Exists',
  7: 'Permission Denied',
  8: 'Resource Exhausted',
  9: 'Failed Precondition',
  10: 'Aborted',
  11: 'Out of Range',
  12: 'Unimplemented',
  13: 'Internal',
  14: 'Unavailable',
  15: 'Data Loss',
  16: 'Unauthenticated'
};

export default grpcStatusCodePhraseMap; 