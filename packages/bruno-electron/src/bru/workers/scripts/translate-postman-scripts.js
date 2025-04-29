const { parentPort } = require('node:worker_threads');
const { postmanTranslation } = require('@usebruno/converters');

parentPort.on('message', (workerData) => {
  try {
    const { scripts } = workerData;
    const modScripts = scripts.map(([name, { events, request }]) => {
      const requestObject = {
        script: {},
        tests: {}
      }
      
      if (events && Array.isArray(events)) {
        events.forEach(({listen, script}) => {
          if(script && script.exec) {
            if(listen === 'prerequest') {
              if(script.exec && script.exec.length > 0) {
                requestObject.script.req = postmanTranslation(script.exec);
              } else {
                requestObject.script.req = '';
              }
            }

            if(listen === 'test') {
              if(script.exec && script.exec.length > 0) {
                requestObject.tests = postmanTranslation(script.exec);
              } else {
                requestObject.tests = '';
              }
            }
          }
        });
      }

      return [name, { request: requestObject }];
    });
    
    parentPort.postMessage(modScripts);
  }
  catch(error) {
    console.error(error);
    parentPort.postMessage({ error: error?.message });
  }
});