import { computeLineDiffForOld, computeLineDiffForNew } from 'components/Git/VisualDiffViewer/utils/diffUtils';

const VisualDiffDocs = ({ oldData, newData, showSide }) => {
  const oldDocs = oldData?.request?.docs || '';
  const newDocs = newData?.request?.docs || '';
  const lines = showSide === 'old' ? computeLineDiffForOld(oldDocs, newDocs) : computeLineDiffForNew(oldDocs, newDocs);

  return (
    <div className="diff-section" data-testid={`openapi-sync-diff-docs-${showSide}`}>
      <div className="code-diff-content">
        {lines.map((line, index) => (
          <div key={index} className={`diff-line ${line.status}`}>
            {line.text || '\u00A0'}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VisualDiffDocs;
