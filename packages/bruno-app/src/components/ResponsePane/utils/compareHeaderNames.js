const compareHeaderNames = (nameA, nameB) => {
  const normalizedNameA = String(nameA ?? '').toLowerCase();
  const normalizedNameB = String(nameB ?? '').toLowerCase();

  if (normalizedNameA < normalizedNameB) return -1;
  if (normalizedNameA > normalizedNameB) return 1;
  return 0;
};

export default compareHeaderNames;
