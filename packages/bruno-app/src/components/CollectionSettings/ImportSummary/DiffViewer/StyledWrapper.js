import styled from 'styled-components';

const StyledWrapper = styled.div`

/* Base container for the diff viewer */
.diff-viewer-container {
  font-family: "Courier New", Courier, monospace;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 20px;
  margin: 0;
  border-radius: 5px;
}

/* Header styles (file names in GitHub-like format) */
.diff-header {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.diff-column {
  width: 48%;
  text-align: center;
}

/* The side-by-side diff table container */
.diff-content {
  display: flex;
  flex-direction: row;
  font-size: 10px;
  line-height: 1.5;
}

/* Add the diff header styles for GitHub-like views */
.diff-viewer .d2h-diff-table {
  width: 100%;
  display: table;
  border-collapse: collapse;
}

.diff-viewer .d2h-diff-table .d2h-diff-row {
  display: table-row;
}

.diff-viewer .d2h-diff-table .d2h-diff-side {
  display: table-cell;
  vertical-align: top;
  width: 50%;
  padding: 10px;
}

/* Ensure the added lines on the right side don't stretch the left side's width */
.diff-viewer .d2h-diff-table .d2h-diff-side:nth-child(1) {
  width: 50%;
}

.diff-viewer .d2h-diff-table .d2h-diff-side:nth-child(2) {
  width: 50%;
  padding-left: 20px;
}

/* GitHub-like styles for added lines */
.diff-viewer .d2h-diff-table .d2h-diff-side .d2h-diff-line.d2h-ins {
  background-color: #e6f9d7; /* Lighter green for added lines */
  color: #2c974b;
  border-radius: 5px;
  margin-bottom: 2px;
  font-size: 10px;
}

.diff-viewer .d2h-diff-table .d2h-diff-side .d2h-diff-line.d2h-ins span {
  font-weight: normal;  /* Lighter font weight */
}

/* GitHub-like styles for removed lines */
.diff-viewer .d2h-diff-table .d2h-diff-side .d2h-diff-line.d2h-del {
  background-color: #fdd; /* Lighter red for removed lines */
  color: #d14e2d;
  border-radius: 5px;
  margin-bottom: 2px;
  font-size: 10px;
}

.diff-viewer .d2h-diff-table .d2h-diff-side .d2h-diff-line.d2h-del span {
  font-weight: normal;  /* Lighter font weight */
}

/* GitHub-like styles for unchanged lines */
.diff-viewer .d2h-diff-table .d2h-diff-side .d2h-diff-line.d2h-unchanged {
  background-color: #f7f7f7;
  color: #333;
  border-radius: 5px;
  margin-bottom: 2px;
  font-size: 10px;
}

/* Line number styling for left side only */
.diff-viewer .d2h-diff-table .d2h-diff-side .d2h-line-number {
  color: #888;
  padding-right: 10px;
  text-align: right;
  font-size: 10px;
  user-select: none;
}

/* Hide line numbers on the right side */
.diff-viewer .d2h-diff-table .d2h-diff-side:nth-child(2) .d2h-line-number {
  display: none;
}
  .diff-viewer .d2h-diff-header,
.diff-viewer .d2h-filelist, .diff-viewer .d2h-code-linenos {
  display: none;
}

.diff-viewer .d2h-ins {
  background-color: #e6f7e6;
}

.diff-viewer .d2h-del {
  background-color: #fdd;
}



`;

export default StyledWrapper;
