const workerpool = require('workerpool');
const parseFile = require('./jobs/parse-file');
const scanCollection = require('./jobs/scan-collection');
const { JobType } = require('./index');

workerpool.worker({
  [JobType.ParseFile]: parseFile,
  [JobType.ScanCollection]: scanCollection
});
