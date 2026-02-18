const splitWithSeparators = (str) => {
  const result = [];
  let current = '';
  for (const char of str) {
    if (/[\s\/\?\&\=\.\-\_\:\@]/.test(char)) {
      if (current) {
        result.push(current);
        current = '';
      }
      result.push(char);
    } else {
      current += char;
    }
  }
  if (current) {
    result.push(current);
  }
  return result;
};

export const computeWordDiffForOld = (oldStr, newStr) => {
  if (oldStr === newStr) {
    return [{ text: oldStr, status: 'unchanged' }];
  }

  if (!oldStr) {
    return [];
  }

  if (!newStr) {
    return [{ text: oldStr, status: 'deleted' }];
  }

  const oldWords = splitWithSeparators(oldStr);
  const newWords = splitWithSeparators(newStr);
  const lcs = computeLCS(oldWords, newWords);

  const segments = [];
  let oldIdx = 0;
  let lcsIdx = 0;

  while (oldIdx < oldWords.length) {
    if (lcsIdx < lcs.length && oldIdx === lcs[lcsIdx].oldIndex) {
      segments.push({ text: oldWords[oldIdx], status: 'unchanged' });
      lcsIdx++;
    } else {
      segments.push({ text: oldWords[oldIdx], status: 'deleted' });
    }
    oldIdx++;
  }

  return mergeSegments(segments);
};

export const computeWordDiffForNew = (oldStr, newStr) => {
  if (oldStr === newStr) {
    return [{ text: newStr, status: 'unchanged' }];
  }

  if (!newStr) {
    return [];
  }

  if (!oldStr) {
    return [{ text: newStr, status: 'added' }];
  }

  const oldWords = splitWithSeparators(oldStr);
  const newWords = splitWithSeparators(newStr);
  const lcs = computeLCS(oldWords, newWords);

  const segments = [];
  let newIdx = 0;
  let lcsIdx = 0;

  while (newIdx < newWords.length) {
    if (lcsIdx < lcs.length && newIdx === lcs[lcsIdx].newIndex) {
      segments.push({ text: newWords[newIdx], status: 'unchanged' });
      lcsIdx++;
    } else {
      segments.push({ text: newWords[newIdx], status: 'added' });
    }
    newIdx++;
  }

  return mergeSegments(segments);
};

const mergeSegments = (segments) => {
  const merged = [];
  for (const segment of segments) {
    if (merged.length > 0 && merged[merged.length - 1].status === segment.status) {
      merged[merged.length - 1].text += segment.text;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
};

const computeLCS = (arr1, arr2) => {
  const m = arr1.length;
  const n = arr2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift({ value: arr1[i - 1], oldIndex: i - 1, newIndex: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
};

export const computeLineDiffForOld = (oldStr, newStr) => {
  if (oldStr === newStr) {
    return (oldStr || '').split('\n').map((line) => ({ text: line, status: 'unchanged' }));
  }

  if (!oldStr) {
    return [];
  }

  if (!newStr) {
    return oldStr.split('\n').map((line) => ({ text: line, status: 'deleted' }));
  }

  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const lcs = computeLCS(oldLines, newLines);

  const segments = [];
  let oldIdx = 0;
  let lcsIdx = 0;

  while (oldIdx < oldLines.length) {
    if (lcsIdx < lcs.length && oldIdx === lcs[lcsIdx].oldIndex) {
      segments.push({ text: oldLines[oldIdx], status: 'unchanged' });
      lcsIdx++;
    } else {
      segments.push({ text: oldLines[oldIdx], status: 'deleted' });
    }
    oldIdx++;
  }

  return segments;
};

export const computeLineDiffForNew = (oldStr, newStr) => {
  if (oldStr === newStr) {
    return (newStr || '').split('\n').map((line) => ({ text: line, status: 'unchanged' }));
  }

  if (!newStr) {
    return [];
  }

  if (!oldStr) {
    return newStr.split('\n').map((line) => ({ text: line, status: 'added' }));
  }

  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const lcs = computeLCS(oldLines, newLines);

  const segments = [];
  let newIdx = 0;
  let lcsIdx = 0;

  while (newIdx < newLines.length) {
    if (lcsIdx < lcs.length && newIdx === lcs[lcsIdx].newIndex) {
      segments.push({ text: newLines[newIdx], status: 'unchanged' });
      lcsIdx++;
    } else {
      segments.push({ text: newLines[newIdx], status: 'added' });
    }
    newIdx++;
  }

  return segments;
};
