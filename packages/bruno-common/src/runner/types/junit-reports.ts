export type T_JUnitReport = {
  testsuites: {
    testsuite: T_JUnitTestSuite[];
  };
};

export type T_JUnitTestSuite = {
  '@name': string;
  '@errors': number;
  '@failures': number;
  '@skipped': number;
  '@tests': number;
  '@timestamp': string;
  '@hostname': string;
  '@time': string;
  '@classname': string;
  testcase: T_JUnitTestcase[];
};

export type T_JUnitTestcase = {
  '@name': string;
  '@status': string;
  '@classname': string;
  '@time': string;
  failure?: { '@type': string; '@message': string }[];
  error?: { '@type': string; '@message': string }[];
};
