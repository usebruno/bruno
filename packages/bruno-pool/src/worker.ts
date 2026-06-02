import * as workerpool from 'workerpool';
import parseFile from './scripts/parse-file';
import { JobType } from './pool';

workerpool.worker({
  [JobType.ParseFile]: parseFile
});
