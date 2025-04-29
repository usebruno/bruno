

const { Worker } = require('node:worker_threads');
const path = require('node:path');
const os = require('node:os');

function getMaxWorkers() {
  return Math.max(1, os.cpus().length - 1);
}

const scriptTranslationWorker = async (scriptMap) => {
  // Convert the Map to an array of entries
  const scriptEntries = Array.from(scriptMap.entries());
  const maxWorkers = getMaxWorkers();
  const tasksPerWorker = Math.floor(scriptEntries.length / maxWorkers);
  const remainingTasks = scriptEntries.length % maxWorkers;
  const batches = [];
  const translatedScripts = new Map();
  console.log("maxWorkers", maxWorkers);
  
  for (let i = 0; i < maxWorkers; i++) {
    const startIndex = i * tasksPerWorker;
    const endIndex = startIndex + tasksPerWorker;
    batches.push(scriptEntries.slice(startIndex, endIndex));
  }

  if (remainingTasks > 0) {
    batches.push(scriptEntries.slice(maxWorkers * tasksPerWorker, scriptEntries.length));
  }
  
  console.log("batches", batches.length);
  // time start
  console.time("translate-postman-scripts");
  

  // Process all batches in parallel
  const batchPromises = batches.map(batch => {
    return new Promise((resolve, reject) => {
      // Create a new worker for this batch
      const worker = new Worker('./src/bru/workers/scripts/translate-postman-scripts.js');
      
      // Handle worker messages
      worker.on('message', (modScripts) => {
        // console.log('modScripts', modScripts);
        if (modScripts.error) {
          console.error('Error in script translation worker:', modScripts.error);
          worker.terminate();
          reject(new Error(modScripts.error));
          return;
        }
        modScripts.forEach(([name, { request }]) => {
          translatedScripts.set(name, { request });
        });
        worker.terminate();
        resolve();
      });
      
      // Handle worker errors
      worker.on('error', (err) => {
        console.error('Worker error:', err);
        worker.terminate();
        reject(err);
      });
      
      // Send the batch to the worker
      worker.postMessage({ scripts: batch });
    });
  });

  // Wait for all batches to complete
  await Promise.all(batchPromises);
  console.log("translatedScripts", translatedScripts.size);
  console.timeEnd("translate-postman-scripts");
  return translatedScripts;
};

export default scriptTranslationWorker