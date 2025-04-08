/**
 * AST Node Types based on the ESTree specification
 * Reference: https://github.com/estree/estree
 * Docs https://hexdocs.pm/estree/ESTree.html#summary
 * 
 * This module provides a central reference for all AST node types
 * used by acorn and other ESTree-compatible parsers.
 */

const NodeType = {
  // Program
  Program: 'Program',

  // Statements
  ExpressionStatement: 'ExpressionStatement',
  BlockStatement: 'BlockStatement',
  EmptyStatement: 'EmptyStatement',
  DebuggerStatement: 'DebuggerStatement',
  WithStatement: 'WithStatement',
  ReturnStatement: 'ReturnStatement',
  LabeledStatement: 'LabeledStatement',
  BreakStatement: 'BreakStatement',
  ContinueStatement: 'ContinueStatement',
  IfStatement: 'IfStatement',
  SwitchStatement: 'SwitchStatement',
  ThrowStatement: 'ThrowStatement',
  TryStatement: 'TryStatement',
  WhileStatement: 'WhileStatement',
  DoWhileStatement: 'DoWhileStatement',
  ForStatement: 'ForStatement',
  ForInStatement: 'ForInStatement',
  ForOfStatement: 'ForOfStatement',

  // Declarations
  FunctionDeclaration: 'FunctionDeclaration',
  VariableDeclaration: 'VariableDeclaration',
  VariableDeclarator: 'VariableDeclarator',
  ClassDeclaration: 'ClassDeclaration',

  // Expressions
  ThisExpression: 'ThisExpression',
  ArrayExpression: 'ArrayExpression',
  ObjectExpression: 'ObjectExpression',
  FunctionExpression: 'FunctionExpression',
  ArrowFunctionExpression: 'ArrowFunctionExpression',
  YieldExpression: 'YieldExpression',
  UnaryExpression: 'UnaryExpression',
  UpdateExpression: 'UpdateExpression',
  BinaryExpression: 'BinaryExpression',
  AssignmentExpression: 'AssignmentExpression',
  LogicalExpression: 'LogicalExpression',
  MemberExpression: 'MemberExpression',
  ConditionalExpression: 'ConditionalExpression',
  CallExpression: 'CallExpression',
  NewExpression: 'NewExpression',
  SequenceExpression: 'SequenceExpression',
  TemplateLiteral: 'TemplateLiteral',
  TaggedTemplateExpression: 'TaggedTemplateExpression',
  ClassExpression: 'ClassExpression',
  MetaProperty: 'MetaProperty',
  AwaitExpression: 'AwaitExpression',
  ChainExpression: 'ChainExpression',
  ImportExpression: 'ImportExpression',

  // Patterns
  ObjectPattern: 'ObjectPattern',
  ArrayPattern: 'ArrayPattern',
  AssignmentPattern: 'AssignmentPattern',
  RestElement: 'RestElement',

  // Clauses
  SwitchCase: 'SwitchCase',
  CatchClause: 'CatchClause',

  // Property definition
  Property: 'Property',
  PropertyDefinition: 'PropertyDefinition',
  MethodDefinition: 'MethodDefinition',

  // Imports and Exports
  ImportDeclaration: 'ImportDeclaration',
  ImportSpecifier: 'ImportSpecifier',
  ImportDefaultSpecifier: 'ImportDefaultSpecifier',
  ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
  ExportNamedDeclaration: 'ExportNamedDeclaration',
  ExportSpecifier: 'ExportSpecifier',
  ExportDefaultDeclaration: 'ExportDefaultDeclaration',
  ExportAllDeclaration: 'ExportAllDeclaration',

  // Literals and Identifiers
  Identifier: 'Identifier',
  Literal: 'Literal',
  StringLiteral: 'StringLiteral',
  BooleanLiteral: 'BooleanLiteral',
  NullLiteral: 'NullLiteral',
  NumericLiteral: 'NumericLiteral',
  RegExpLiteral: 'RegExpLiteral',
  BigIntLiteral: 'BigIntLiteral',

  // Other
  SpreadElement: 'SpreadElement',
  TemplateElement: 'TemplateElement',
  Super: 'Super',
  PrivateIdentifier: 'PrivateIdentifier',
  ClassBody: 'ClassBody',
  StaticBlock: 'StaticBlock'
};

// Freeze the object to prevent modifications
Object.freeze(NodeType);

export default NodeType; 