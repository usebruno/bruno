export const toBrunoScripts = (scripts) => {
  const result = { req: '', res: '' };

  if (scripts?.preRequest) {
    result.req = scripts.preRequest;
  }
  if (scripts?.postResponse) {
    result.res = scripts.postResponse;
  }

  return result;
};

export const toOpenCollectionScripts = (request) => {
  const scripts = {};

  if (request?.script?.req) {
    scripts.preRequest = request.script.req;
  }
  if (request?.script?.res) {
    scripts.postResponse = request.script.res;
  }
  if (request?.tests) {
    scripts.tests = request.tests;
  }

  return Object.keys(scripts).length > 0 ? scripts : undefined;
};
