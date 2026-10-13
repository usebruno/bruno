export const DEFAULT_ITERATION_CONFIG = { dataFile: null, iterations: '' };

const isIterationsUnset = (iterations) => iterations === '' || iterations === null || iterations === undefined;

export const isIterationsValid = (iterations) => {
  if (isIterationsUnset(iterations)) return true;
  const count = Number(iterations);
  return Number.isInteger(count) && count >= 1;
};

// Shape sent to the main process; an empty iterations field means one iteration per data row
export const toRunIterationConfig = ({ dataFile, iterations }) => ({
  dataFilePath: dataFile?.path || null,
  iterations: isIterationsUnset(iterations) ? null : Number(iterations)
});
