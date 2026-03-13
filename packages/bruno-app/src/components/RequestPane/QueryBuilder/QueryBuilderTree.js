import React, { useMemo } from 'react';
import { getNamedType } from 'graphql';
import FieldNode from './FieldNode';
import { getFieldChildren } from 'utils/graphql/queryBuilder';

const QueryBuilderTree = ({
  fields,
  unionTypes,
  depth,
  selections,
  expandedPaths,
  argValues,
  enabledArgs,
  onToggleCheck,
  onToggleExpand,
  onToggleArg,
  onArgChange,
  onToggleInputField,
  onSetInputFieldValue,
  visitedTypes
}) => {
  const treeProps = {
    depth, selections, expandedPaths, argValues, enabledArgs,
    onToggleCheck, onToggleExpand, onToggleArg, onArgChange,
    onToggleInputField, onSetInputFieldValue, visitedTypes
  };

  return (
    <>
      {unionTypes && unionTypes.map((ut) => (
        <TreeNode key={ut.path} field={ut} isUnion {...treeProps} />
      ))}

      {fields.map((field) => (
        <TreeNode key={field.path} field={field} {...treeProps} />
      ))}
    </>
  );
};

const TreeNode = ({
  field,
  depth,
  isUnion,
  selections,
  expandedPaths,
  argValues,
  enabledArgs,
  onToggleCheck,
  onToggleExpand,
  onToggleArg,
  onArgChange,
  onToggleInputField,
  onSetInputFieldValue,
  visitedTypes
}) => {
  const isChecked = selections.has(field.path);
  const isExpanded = expandedPaths.has(field.path);
  const namedType = isUnion ? field.namedType : getNamedType(field.type);
  const isCircular = isUnion ? false : visitedTypes.has(namedType?.name);

  const children = useMemo(() => {
    if (isUnion ? !isExpanded : (field.isLeaf || !isExpanded || isCircular)) return null;
    return getFieldChildren(namedType, field.path, visitedTypes);
  }, [isUnion, field.isLeaf, isExpanded, isCircular, namedType, field.path, visitedTypes]);

  return (
    <>
      <FieldNode
        field={field}
        depth={depth}
        isChecked={isChecked}
        isExpanded={isExpanded}
        onToggleCheck={onToggleCheck}
        onToggleExpand={onToggleExpand}
        argValues={argValues}
        enabledArgs={enabledArgs}
        onToggleArg={onToggleArg}
        onArgChange={onArgChange}
        onToggleInputField={onToggleInputField}
        onSetInputFieldValue={onSetInputFieldValue}
        isCircular={isCircular}
        hasChildren={!!(children && (children.fields?.length > 0 || children.unionTypes?.length > 0))}
      />
      {isExpanded && children && (
        <QueryBuilderTree
          fields={children.fields || []}
          unionTypes={children.unionTypes}
          depth={depth + 1}
          selections={selections}
          expandedPaths={expandedPaths}
          argValues={argValues}
          enabledArgs={enabledArgs}
          onToggleCheck={onToggleCheck}
          onToggleExpand={onToggleExpand}
          onToggleArg={onToggleArg}
          onArgChange={onArgChange}
          onToggleInputField={onToggleInputField}
          onSetInputFieldValue={onSetInputFieldValue}
          visitedTypes={new Set([...visitedTypes, namedType?.name])}
        />
      )}
    </>
  );
};

export default QueryBuilderTree;
