export const vacuumIntoStatement = (backupPath: string): string => {
  const escaped = backupPath.replace(/'/g, `''`);
  return `VACUUM INTO '${escaped}'`;
};
