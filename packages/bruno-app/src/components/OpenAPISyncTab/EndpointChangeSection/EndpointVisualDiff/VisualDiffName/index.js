import { computeWordDiffForOld, computeWordDiffForNew } from 'components/Git/VisualDiffViewer/utils/diffUtils';

const VisualDiffName = ({ oldData, newData, showSide }) => {
  const oldName = oldData?.name || '';
  const newName = newData?.name || '';
  const segments = showSide === 'old' ? computeWordDiffForOld(oldName, newName) : computeWordDiffForNew(oldName, newName);

  return (
    <div className="diff-section" data-testid={`openapi-sync-diff-name-${showSide}`}>
      <div className="diff-section-content">
        {segments.map((segment, index) => (
          <span key={index} className={segment.status === 'unchanged' ? undefined : `diff-inline ${segment.status}`}>
            {segment.text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default VisualDiffName;
