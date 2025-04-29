const { Worker } = require('node:worker_threads');
const path = require('node:path');
const os = require('node:os');

function getMaxWorkers() {
  return Math.max(1, os.cpus().length - 1);
}

// Create a worker pool to reuse workers
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
function calculateScriptComplexity([name, { events }]) {
  let totalLines = 0;
  
  if (events && Array.isArray(events)) {
    events.forEach(({ script }) => {
      if (script && script.exec) {
        totalLines += countScriptLines(script.exec);
      }
    });
  }
  
  return { name, complexity: totalLines || 1 }; // Minimum complexity of 1
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
  
  // Distribute scripts using a greedy approach
  for (const { name, complexity } of scriptsWithComplexity) {
    // Find the batch with the lowest total complexity
    const targetBatch = batches.reduce(
      (min, current) => current.totalComplexity < min.totalComplexity ? current : min,
      batches[0]
    );
    
    // Add the script to this batch
    targetBatch.entries.push(name);
    targetBatch.totalComplexity += complexity;
  }
  
  // Map batch entries back to original script entries
  const scriptMap = new Map(scriptEntries);
  return batches.map(batch => 
    batch.entries.map(name => [name, scriptMap.get(name)])
  ).filter(batch => batch.length > 0);
}

const scriptTranslationWorker = async (scriptMap) => {
  // Convert the Map to an array of entries
  const scriptEntries = Array.from(scriptMap.entries());
  const maxWorkers = getMaxWorkers();
  
  // For very small collections, don't parallelize
  if (scriptEntries.length <= 5) {
    const workerPool = new WorkerPool('./src/bru/workers/scripts/translate-postman-scripts.js', 1);
    workerPool.initialize();
    
    try {
      const translatedScripts = new Map();
      const result = await workerPool.runTask({ scripts: scriptEntries });
      
      if (result.error) {
        console.error('Error in script translation worker:', result.error);
        throw new Error(result.error);
      }
      
      result.forEach(([name, { request }]) => {
        translatedScripts.set(name, { request });
      });
      
      return translatedScripts;
    } finally {
      workerPool.terminate();
    }
  }
  
  // Calculate optimal worker count based on scripts and available CPUs
  const workerCount = Math.min(maxWorkers, Math.ceil(scriptEntries.length / 2));
  
  // Create balanced batches based on script complexity
  const batches = createBalancedBatches(scriptEntries, workerCount);
  
  const translatedScripts = new Map();
  console.log("maxWorkers", maxWorkers);
  console.log("workerCount", workerCount);
  console.log("batches", batches.length);
  
  // time start
  console.time("translate-postman-scripts");
  
  // Create worker pool with optimal size
  const workerPool = new WorkerPool('./src/bru/workers/scripts/translate-postman-scripts.js', workerCount);
  workerPool.initialize();

  // Process all batches in parallel using worker pool
  const batchPromises = batches.map(batch => {
    return workerPool.runTask({ scripts: batch })
      .then(modScripts => {
        if (modScripts.error) {
          console.error('Error in script translation worker:', modScripts.error);
          throw new Error(modScripts.error);
        }
        modScripts.forEach(([name, { request }]) => {
          translatedScripts.set(name, { request });
        });
      });
  });

  // Wait for all batches to complete
  try {
    await Promise.all(batchPromises);
  } finally {
    // Clean up worker pool
    workerPool.terminate();
  }
  
  console.log("translatedScripts", translatedScripts.size);
  console.timeEnd("translate-postman-scripts");
  return translatedScripts;
};

export default scriptTranslationWorker