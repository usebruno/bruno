const workerpool = require('workerpool');
const parseFile = require('./jobs/parse-file');
const { JobType } = require('./index');

workerpool.worker({
  [JobType.ParseFile]: parseFile
});
