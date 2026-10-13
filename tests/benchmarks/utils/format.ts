// TODO (chirag): use this in the mount test in another PR
export const round = (value: number, decimals = 0): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const formatMib = (bytes: number): string => `${round(bytes / 1024 ** 2, 1)} MiB`;
