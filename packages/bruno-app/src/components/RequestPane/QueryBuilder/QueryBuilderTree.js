import React, { useMemo, memo } from 'react';
import { getNamedType } from 'graphql';
import FieldNode from './FieldNode';
import { getFieldChildren } from 'utils/graphql/queryBuilder';

const QueryBuilderTree = ({ fields, unionTypes, ...treeProps }) => {
  return (
    <>
      {unionTypes && unionTypes.map((ut) => (
        <TreeNode key={ut.path} field={ut} isUnion {...treeProps} />
      ))}

      {(fields || []).map((field) => (
        <TreeNode key={field.path} field={field} {...treeProps} />
      ))}
    </>
  );
};

const TreeNode = memo(({ field, isUnion = false, depth, selections, expandedPaths, ...restProps }) => {
  const isChecked = selections.has(field.path);
  const isExpanded = expandedPaths.has(field.path);
  const namedType = isUnion ? field.namedType : getNamedType(field.type);

  const children = useMemo(() => {
    if (isUnion ? !isExpanded : (field.isLeaf || !isExpanded)) return null;
    return getFieldChildren(namedType, field.path);
  }, [isUnion, field.isLeaf, isExpanded, namedType, field.path]);

  const hasChildren = !!(children && (children.fields?.length > 0 || children.unionTypes?.length > 0));

  return (
    <>
      <FieldNode
        field={field}
        depth={depth}
        isChecked={isChecked}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        {...restProps}
      />
      {isExpanded && children && (
        <QueryBuilderTree
          fields={children.fields || []}
          unionTypes={children.unionTypes}
          depth={depth + 1}
          selections={selections}
          expandedPaths={expandedPaths}
          {...restProps}
        />
      )}
    </>
  );
});

export default QueryBuilderTree;
