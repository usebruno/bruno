import React, { useMemo } from 'react';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';

const extractMeta = (data) => {
  if (!data) return {};
  return {
    name: data.name,
    type: data.type,
    seq: data.seq,
    tags: data.tags
  };
};

const VisualDiffMeta = ({ oldData, newData, showSide }) => {
  const oldMeta = extractMeta(oldData);
  const newMeta = extractMeta(newData);

  const currentMeta = showSide === 'old' ? oldMeta : newMeta;
  const otherMeta = showSide === 'old' ? newMeta : oldMeta;

  const metaFields = useMemo(() => {
    const fields = [];

    if (currentMeta.name || otherMeta.name) {
      let status = 'unchanged';
      if (!otherMeta.name) {
        status = showSide === 'old' ? 'deleted' : 'added';
      } else if (currentMeta.name !== otherMeta.name) {
        status = 'modified';
      }
      fields.push({ key: 'Name', value: currentMeta.name || '', status });
    }

    if (currentMeta.type || otherMeta.type) {
      let status = 'unchanged';
      if (!otherMeta.type) {
        status = showSide === 'old' ? 'deleted' : 'added';
      } else if (currentMeta.type !== otherMeta.type) {
        status = 'modified';
      }
      fields.push({ key: 'Type', value: currentMeta.type || '', status });
    }

    const currentSeq = currentMeta.seq !== undefined ? String(currentMeta.seq) : '';
    const otherSeq = otherMeta.seq !== undefined ? String(otherMeta.seq) : '';
    if (currentSeq || otherSeq) {
      let status = 'unchanged';
      if (!otherSeq) {
        status = showSide === 'old' ? 'deleted' : 'added';
      } else if (currentSeq !== otherSeq) {
        status = 'modified';
      }
      fields.push({ key: 'Sequence', value: currentSeq, status });
    }

    const currentTags = currentMeta.tags || [];
    const otherTags = otherMeta.tags || [];
    if (currentTags.length > 0 || otherTags.length > 0) {
      let status = 'unchanged';
      if (otherTags.length === 0 && currentTags.length > 0) {
        status = showSide === 'old' ? 'deleted' : 'added';
      } else if (!isEqual(currentTags, otherTags)) {
        status = 'modified';
      }
      fields.push({ key: 'Tags', value: currentTags.join(', '), status, isTags: true, tags: currentTags, otherTags });
    }

    return fields;
  }, [currentMeta, otherMeta, showSide]);

  const renderTags = (field) => {
    const { tags = [], otherTags = [] } = field;
    const otherTagsSet = new Set(otherTags);
    const currentTagsSet = new Set(tags);

    return (
      <div className="tags-container">
        {tags.map((tag, idx) => {
          let tagStatus = 'unchanged';
          if (!otherTagsSet.has(tag)) {
            tagStatus = showSide === 'old' ? 'deleted' : 'added';
          }
          return (
            <span key={idx} className={`tag-badge ${tagStatus}`}>
              {tag}
            </span>
          );
        })}
      </div>
    );
  };

  if (metaFields.length === 0) {
    return null;
  }

  return (
    <div className="diff-section">
      <table className="diff-table">
        <thead>
          <tr>
            <th style={{ width: '30px' }}></th>
            <th style={{ width: '30%' }}>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {metaFields.map((field, index) => (
            <tr key={index} className={field.status}>
              <td>
                {field.status !== 'unchanged' && (
                  <span className={`status-badge ${field.status}`}>
                    {field.status === 'added' ? 'A' : field.status === 'deleted' ? 'D' : 'M'}
                  </span>
                )}
              </td>
              <td className="key-cell">{field.key}</td>
              <td className="value-cell">
                {field.isTags ? renderTags(field) : field.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VisualDiffMeta;
