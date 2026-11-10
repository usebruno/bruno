const { parentPort } = require('node:worker_threads');
const { translatePostmanScript } = require('@usebruno/converters');

parentPort.on('message', (workerData) => {
  try {
    const { scripts } = workerData;
    const modScripts = scripts.map(([uid, { events }]) => {
      const requestObject = {
        script: {}
      };
      // Only the counts may cross the thread boundary.
      const scriptUsages = [];

      const translate = (exec) => {
        const { translated, usage } = translatePostmanScript(exec);
        if (usage) scriptUsages.push(usage);
        return translated;
      };

      if (events && Array.isArray(events)) {
        events.forEach((event) => {
          if (event?.script && event.script.exec) {
            if (event.listen === 'prerequest') {
              if (event.script.exec && event.script.exec.length > 0) {
                requestObject.script.req = translate(event.script.exec);
              } else {
                requestObject.script.req = '';
              }
            }

            if (event.listen === 'test') {
              if (event.script.exec && event.script.exec.length > 0) {
                requestObject.script.res = translate(event.script.exec);
              } else {
                requestObject.script.res = '';
              }
            }
          }
        });
      }

      return [uid, { request: requestObject, scriptUsages }];
    });

    parentPort.postMessage(modScripts);
  } catch (error) {
    console.error(error);
    parentPort.postMessage({ error: error?.message });
  }
});
