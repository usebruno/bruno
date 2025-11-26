const { Worker } = require('node:worker_threads');
const path = require('node:path');
const os = require('node:os');

function getMaxWorkers() {
  return Math.max(os.availableParallelism(), 1)
}

class WorkerPool {
  constructor(scriptPath, size) {
    this.workers = [];
    this.idle = [];
    this.queue = [];
    this.scriptPath = scriptPath;
    this.size = size;
  }

  // Initialize the worker pool
  initialize() {
    for (let i = 0; i < this.size; i++) {
      const worker = new Worker(this.scriptPath);
      this.workers.push(worker);
      this.idle.push(i);
    }
  }

  // Run a task on a worker
  runTask(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };
      
      if (this.idle.length > 0) {
        this._runTaskOnWorker(this.idle.shift(), task);
      } else {
        this.queue.push(task);
      }
    });
  }

  // Run a task on a specific worker
  _runTaskOnWorker(workerId, task) {
    const worker = this.workers[workerId];
    
    const messageHandler = (result) => {
      // Cleanup listeners
      worker.removeListener('message', messageHandler);
      worker.removeListener('error', errorHandler);
      
      // Mark worker as idle
      this.idle.push(workerId);
      
      // Process queue if tasks are waiting
      if (this.queue.length > 0) {
        this._runTaskOnWorker(workerId, this.queue.shift());
      }
      
      // Resolve the task
      task.resolve(result);
    };
    
    const errorHandler = (err) => {
      worker.removeListener('message', messageHandler);
      worker.removeListener('error', errorHandler);
      
      this.idle.push(workerId);
      
      if (this.queue.length > 0) {
        this._runTaskOnWorker(workerId, this.queue.shift());
      }
      
      task.reject(err);
    };
    
    worker.on('message', messageHandler);
    worker.on('error', errorHandler);
    worker.postMessage(task.data);
  }
  
  // Terminate all workers
  terminate() {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.idle = [];
  }
}

// Helper function to count lines in a script
function countScriptLines(script) {
  if (!script) return 0;
  return Array.isArray(script) ? script.length : script.split('\n').length;
}

// Calculate complexity of a script entry
function calculateScriptComplexity([uid, entry]) {
  let totalLines = 0;
  const { events }  = entry
  
  if (events && Array.isArray(events)) {
    events.forEach(({ script }) => {
      if (script && script.exec) {
        totalLines += countScriptLines(script.exec);
      }
    });
  }
  
  return { uid, entry, complexity: totalLines || 1 }; // Minimum complexity of 1
}

// Create balanced batches based on script complexity
function createBalancedBatches(scriptEntries, workerCount) {
  // Calculate complexity for each script
  const scriptsWithComplexity = scriptEntries.map(calculateScriptComplexity);
  
  // Sort scripts by complexity (descending)
  scriptsWithComplexity.sort((a, b) => b.complexity - a.complexity);
  
  // Initialize batches
  const batches = Array.from({ length: workerCount }, () => ({ 
    entries: [], 
    totalComplexity: 0 
  }));
  
  // Algorithm: Greedy load balancing
  // 1. Process scripts in descending order of complexity
  // 2. Always assign each script to the batch with lowest current load
  // 3. This minimizes the maximum workload across all workers
  for (const { uid, entry, complexity } of scriptsWithComplexity) {

    const batchWithLowestComplexity = batches.reduce(
      (target, current) => current.totalComplexity < target.totalComplexity ? current : target
    );
    
    // Add the script to this batch
    batchWithLowestComplexity.entries.push({uid, entry});
    batchWithLowestComplexity.totalComplexity += complexity;
  }
  
  return batches.map(batch => 
    batch.entries.map(({ uid, entry }) => [uid, entry])
  ).filter(batch => batch.length > 0);
}

const scriptTranslationWorker = async (scriptMap) => {
  // Convert the Map to an array of entries
  const scriptEntries = Array.from(scriptMap.entries());
  const maxWorkers = getMaxWorkers();
  
  // For very small collections, don't parallelize
  if (scriptEntries.length <= 50) {
    const workerPool = new WorkerPool(path.join(__dirname,'./src/workers/scripts/translate-postman-scripts.js'), 1);
    workerPool.initialize();
    
    try {
      const translatedScripts = new Map();
      const result = await workerPool.runTask({ scripts: scriptEntries });
      
      if (result.error) {
        console.error('Error in script translation worker:', result.error);
        throw new Error(result.error);
      }
      
      result.forEach(([uid, { request }]) => {
        translatedScripts.set(uid, { request });
      });
      
      return translatedScripts;
    } finally {
      workerPool.terminate();
    }
  }
  

  const workerCount = Math.min(maxWorkers, 4);
  
  // Create balanced batches based on script complexity
  const batches = createBalancedBatches(scriptEntries, workerCount);
  
  const translatedScripts = new Map();  

  // Create worker pool with optimal size
  const workerPool = new WorkerPool(path.join(__dirname,'./src/workers/scripts/translate-postman-scripts.js'), workerCount);
  workerPool.initialize();

  // Process all batches in parallel using worker pool
  const batchPromises = batches.map(batch => {
    return workerPool.runTask({ scripts: batch })
      .then(modScripts => {
        modScripts.forEach(([name, { request }]) => {
          translatedScripts.set(name, { request });
        });
      })
      .catch(err => {
        console.error('Error in script translation worker:', err);
        throw new Error(err);
      });
  });

  // Wait for all batches to complete
  try {
    await Promise.allSettled(batchPromises);
  } finally {
    // Clean up worker pool
    workerPool.terminate();
  }

  return translatedScripts;
};

export default scriptTranslationWorker