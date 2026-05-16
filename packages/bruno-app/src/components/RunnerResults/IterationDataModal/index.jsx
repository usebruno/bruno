import React from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';

const PREVIEW_ROWS = 5;

const IterationDataModal = ({ data, onConfirm, onCancel, previewOnly = false }) => {
  if (!data) return null;

  const { filePath, rows } = data;
  const fileName = filePath.split(/[\\/]/).pop();
  const columns = Object.keys(rows[0] || {});
  const previewRows = rows.slice(0, PREVIEW_ROWS);
  const hasMore = rows.length > PREVIEW_ROWS;

  return (
    <Portal>
      <Modal
        size="lg"
        title="Iteration Data Preview"
        confirmText={previewOnly ? 'Close' : 'Use Data File'}
        cancelText="Cancel"
        handleConfirm={previewOnly ? onCancel : onConfirm}
        handleCancel={onCancel}
        hideCancel={previewOnly}
        dataTestId="iteration-data-modal"
      >
        <StyledWrapper>
          {/* File summary */}
          <div className="file-summary">
            <div className="file-info">
              <span className="file-name">{fileName}</span>
              <span className="file-meta">
                {rows.length} iteration{rows.length !== 1 ? 's' : ''}
                {columns.length > 0 && (
                  <> &middot; {columns.length} variable{columns.length !== 1 ? 's' : ''}</>
                )}
              </span>
            </div>
          </div>

          {/* Variable chips */}
          {columns.length > 0 && (
            <div className="section">
              <div className="section-label">Available variables</div>
              <div className="var-chips">
                {columns.map((col) => (
                  <span
                    key={col}
                    className="var-chip"
                    title={`Use as {{${col}}} in your requests`}
                  >
                    {`{{${col}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Data preview table */}
          {columns.length > 0 && (
            <div className="section">
              <div className="section-label">
                Data preview
                {hasMore && (
                  <span className="preview-note">
                    {' '}— showing {PREVIEW_ROWS} of {rows.length} rows
                  </span>
                )}
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="col-num">#</th>
                      {columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="col-num">{idx + 1}</td>
                        {columns.map((col) => (
                          <td key={col} title={String(row[col] ?? '')}>
                            {String(row[col] ?? '').length > 30
                              ? `${String(row[col]).slice(0, 28)}…`
                              : String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMore && (
                <div className="more-rows">
                  + {rows.length - PREVIEW_ROWS} more row{rows.length - PREVIEW_ROWS !== 1 ? 's' : ''} not shown
                </div>
              )}
            </div>
          )}

          {columns.length === 0 && (
            <div className="empty-warning">
              The file was loaded but contains no columns. Please check the file format.
            </div>
          )}
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default IterationDataModal;
