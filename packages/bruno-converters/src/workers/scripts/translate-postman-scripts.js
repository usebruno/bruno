const { parentPort } = require('node:worker_threads');
const { postmanTranslation } = require('@usebruno/converters');

parentPort.on('message', (workerData) => {
  try {
    const { scripts } = workerData;
    const modScripts = scripts.map(([uid, { events }]) => {
      const requestObject = {
        script: {},
        tests: {}
      }
      
      if (events && Array.isArray(events)) {
        events.forEach((event) => {
          if(event?.script && event.script.exec) {
            if(event.listen === 'prerequest') {
              if(event.script.exec && event.script.exec.length > 0) {
                requestObject.script.req = postmanTranslation(event.script.exec);
              } else {
                requestObject.script.req = '';
              }
            }

            if(event.listen === 'test') {
              if(event.script.exec && event.script.exec.length > 0) {
                requestObject.tests = postmanTranslation(event.script.exec);
              } else {
                requestObject.tests = '';
              }
            }
          }
        });
      }

      return [uid, { request: requestObject }];
    });
    
    parentPort.postMessage(modScripts);
  }
  catch(error) {
    console.error(error);
    parentPort.postMessage({ error: error?.message });
  }
});