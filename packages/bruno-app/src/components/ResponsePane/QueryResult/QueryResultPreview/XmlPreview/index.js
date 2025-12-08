import ErrorAlert from 'components/ErrorAlert/index';
import React, { useState, useMemo } from 'react';
import StyledWrapper from './StyledWrapper';

// The expected "data" prop must be an XML string.
export default function XmlPreview({ data, defaultExpanded = true }) {
  // Parse XML string
  const parsedData = useMemo(() => {
    if (typeof data !== 'string') {
      return { error: 'Invalid input. Expected an XML string.' };
    }

    const parsed = parseXMLString(data);
    if (parsed === null) {
      return { error: 'Failed to parse XML string. Invalid XML format.' };
    }
    return parsed;
  }, [data]);

  // Check for parsing error
  if (parsedData && typeof parsedData === 'object' && parsedData.error) {
    return (
      <ErrorAlert title="Cannot preview as XML" message={parsedData.error} />
    );
  }

  // Validate that data can be rendered as a tree
  const isValidTreeData = (data) => {
    if (data === null || data === undefined) return false;
    if (typeof data === 'object' && !Array.isArray(data)) return true;
    if (Array.isArray(data)) return true;
    return false;
  };

  if (!isValidTreeData(parsedData)) {
    return (
      <ErrorAlert title="Cannot preview as XML" message="Data cannot be rendered as a tree. Expected a valid XML string." />
    );
  }

  // If root is an object with a single key, unwrap it to show the actual root element
  let rootNode = parsedData;
  let rootNodeName = '';

  if (typeof parsedData === 'object' && !Array.isArray(parsedData) && parsedData !== null) {
    const keys = Object.keys(parsedData).filter((k) => k !== '$' && k !== '@_' && k !== '#text');
    if (keys.length === 1) {
      rootNodeName = keys[0];
      rootNode = parsedData[keys[0]];
    } else if (keys.length === 0) {
      // Empty object with no children
      return (
        <ErrorAlert title="Cannot preview as XML" message="Cannot render XML tree. Root object is empty." />
      );
    }
  }

  return (
    <StyledWrapper>
      <div className="xml-container">
        <XmlNode
          node={rootNode}
          nodeName={rootNodeName}
          isRoot={true}
          isLast={true}
          defaultExpanded={defaultExpanded}
        />
      </div>
    </StyledWrapper>
  );
}

// Component for rendering array entries with expand/collapse functionality
const XmlArrayNode = ({ arrayKey, items, depth, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = (e) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  return (
    <div style={{ paddingLeft: `${(depth + 1) * 20}px` }}>
      <div className="flex items-center mb-1">
        <button
          onClick={toggle}
          className="xml-array-toggle-button"
          tabIndex={-1}
          aria-expanded={expanded}
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span className="xml-node-name">{arrayKey}</span>
        <span className="xml-count">[{items.length}]</span>
      </div>
      {expanded && (
        <div className="array-content">
          {items.map((item, itemIdx) => (
            <XmlNode
              key={`${arrayKey}-${itemIdx}`}
              node={item}
              nodeName={`${itemIdx}`}
              isLast={itemIdx === items.length - 1}
              defaultExpanded={false}
              depth={depth + 2}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const XmlNode = ({
  node,
  nodeName = '',
  isRoot = false,
  isLast = true,
  defaultExpanded = true,
  depth = 0
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  let displayNodeName = nodeName;

  if (Array.isArray(node)) {
    // For repeated XML elements with same name (e.g. <item>...</item><item>...</item>)
    return (
      <>
        {node.map((item, idx) => (
          <XmlNode
            key={idx}
            node={item}
            nodeName={displayNodeName}
            isRoot={false}
            isLast={idx === node.length - 1}
            defaultExpanded={false}
            depth={depth}
          />
        ))}
      </>
    );
  }

  const childEntries = getChildrenEntries(node);
  const childCount = getChildCount(node);
  const isLeaf = isTextNode(node) || (typeof node === 'object' && childCount === 0);

  const toggle = (e) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  // For leaf nodes with text content or attributes with empty values
  if (isLeaf && isTextNode(node)) {
    const value = String(node);

    return (
      <div className="flex items-start mb-1" style={{ paddingLeft: `${depth * 20}px` }}>
        {displayNodeName && (
          <>
            <span className="xml-node-name">{displayNodeName}</span>
            <span className="xml-separator">:</span>
          </>
        )}
        <span className="xml-value">{value}</span>
      </div>
    );
  }

  // For empty leaf nodes (attributes without values, etc)
  if (isLeaf && !isTextNode(node)) {
    // Check if this is an attribute-only node with _text
    if (typeof node === 'object' && node !== null && '_text' in node) {
      // This node has both attributes and text, handle in expandable section
      // Fall through to expandable node rendering
    } else {
      return (
        <div className="flex items-center mb-1" style={{ paddingLeft: `${depth * 20}px` }}>
          {displayNodeName && (
            <>
              <span className="xml-node-name">{displayNodeName}</span>
              <span className="xml-separator">:</span>
              <span className="xml-empty-value">{'{}'}</span>
            </>
          )}
        </div>
      );
    }
  }

  // For expandable nodes - show as tree structure
  // If no node name at root level, render children directly
  if (!displayNodeName && depth === 0) {
    if (childEntries.length > 0) {
      return (
        <div>
          {childEntries.map(([key, value], idx) => (
            <XmlNode
              key={key + idx}
              node={value}
              nodeName={key}
              isLast={idx === childEntries.length - 1}
              defaultExpanded={defaultExpanded}
              depth={0}
            />
          ))}
        </div>
      );
    }
    return null;
  }

  // If no display name at non-root level, use a fallback
  if (!displayNodeName) {
    displayNodeName = '(unnamed)';
  }

  // Determine if this node's value is an array
  const hasArrayValue = Array.isArray(node);
  const arrayLength = hasArrayValue ? node.length : 0;

  return (
    <div style={{ paddingLeft: `${depth * 20}px` }}>
      <div className="flex items-center mb-1">
        <button
          onClick={toggle}
          className="xml-toggle-button"
          tabIndex={-1}
          aria-expanded={expanded}
        >
          {expanded ? '▼' : '▶'}
        </button>

        <span className="xml-node-name">
          {displayNodeName}
        </span>

        {childCount > 0 && (
          <span className="xml-count">
            {`{${childCount}}`}
          </span>
        )}
      </div>

      {expanded && childEntries.length > 0 && (
        <div>
          {childEntries.map(([key, value], idx) => {
            // Check if this is an attribute (starts with _)
            const isAttribute = key.startsWith('_');

            // Handle attributes
            if (isAttribute) {
              const displayValue = value === '' ? 'value' : value;

              return (
                <div key={key + idx} className="flex items-start mb-1" style={{ paddingLeft: `${(depth + 1) * 20}px` }}>
                  <span className="xml-node-name">{key}</span>
                  <span className="xml-separator">:</span>
                  <span className={value === '' ? 'xml-empty-value' : 'xml-value'}>{displayValue}</span>
                </div>
              );
            }

            // Check if this child is an array
            const isArrayChild = Array.isArray(value);

            if (isArrayChild) {
              return (
                <XmlArrayNode
                  key={`${key}-${idx}`}
                  arrayKey={key}
                  items={value}
                  depth={depth}
                  defaultExpanded={true}
                />
              );
            }

            return (
              <XmlNode
                key={key + idx}
                node={value}
                nodeName={key}
                isLast={idx === childEntries.length - 1}
                defaultExpanded={false}
                depth={depth + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// Helper function to parse XML string to object
function parseXMLString(xmlString) {
  if (typeof xmlString !== 'string') return null;

  try {
    const parser = new DOMParser();
    // Parse as XML only
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      return null;
    }

    // Convert XML DOM to object
    function xmlToObject(node) {
      if (node.nodeType !== 1) return null; // Not an element node

      const result = {};

      // Get attributes - store them directly with underscore prefix
      if (node.attributes && node.attributes.length > 0) {
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          result[`_${attr.name}`] = attr.value || '';
        }
      }

      // Get child nodes
      const childNodes = Array.from(node.childNodes);
      const elementChildren = childNodes.filter((child) => child.nodeType === 1);
      const textChildren = childNodes.filter((child) => child.nodeType === 3 && child.textContent.trim());

      // If only text children and no element children, return text content
      if (elementChildren.length === 0 && textChildren.length > 0) {
        const textContent = textChildren.map((t) => t.textContent.trim()).join(' ').trim();
        // If has attributes, store text as a special property
        if (Object.keys(result).length > 0) {
          result['_text'] = textContent;
          return result;
        }
        return textContent || null;
      }

      // Process element children
      if (elementChildren.length > 0) {
        const childMap = {};
        elementChildren.forEach((child) => {
          const childName = child.nodeName; // Preserve original casing
          const childValue = xmlToObject(child);

          if (childValue !== null || elementChildren.filter((c) => c.nodeName.toLowerCase() === childName).length > 1) {
            if (childMap[childName]) {
              // Multiple children with same name - convert to array
              if (!Array.isArray(childMap[childName])) {
                childMap[childName] = [childMap[childName]];
              }
              childMap[childName].push(childValue);
            } else {
              childMap[childName] = childValue;
            }
          }
        });

        // Merge children into result
        Object.assign(result, childMap);
      }

      return Object.keys(result).length > 0 ? result : null;
    }

    const rootElement = xmlDoc.documentElement;
    if (!rootElement) return null;

    const parsed = xmlToObject(rootElement);
    return parsed ? { [rootElement.nodeName]: parsed } : null;
  } catch (error) {
    return null;
  }
}

function isTextNode(node) {
  return typeof node === 'string' || typeof node === 'number' || node === null;
}

function getChildrenEntries(node) {
  // Given an XML-like JS object, return an array of [key, value] for all properties
  // This includes attributes (with _ prefix) and child elements
  if (typeof node !== 'object' || node === null) return [];
  return Object.entries(node);
}

function getChildCount(node) {
  if (Array.isArray(node)) {
    return node.length;
  }
  const children = getChildrenEntries(node);
  return children.length;
}
