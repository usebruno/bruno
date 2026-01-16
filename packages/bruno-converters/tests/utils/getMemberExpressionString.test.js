const { describe, it, expect } = require('@jest/globals');
const { getMemberExpressionString } = require('../../src/utils/ast-utils');
const j = require('jscodeshift');

describe('getMemberExpressionString', () => {
  it('should correctly convert simple member expressions to strings', () => {
    // Create a simple member expression: pm.environment.get
    const memberExpr = j.memberExpression(
      j.memberExpression(
        j.identifier('pm'),
        j.identifier('environment')
      ),
      j.identifier('get')
    );

    const result = getMemberExpressionString(memberExpr);
    expect(result).toBe('pm.environment.get');
  });

  it('should handle computed properties with string literals', () => {
    // Create a computed member expression: pm["environment"]["get"]
    const memberExpr = j.memberExpression(
      j.memberExpression(
        j.identifier('pm'),
        j.literal('environment'),
        true // computed
      ),
      j.literal('get'),
      true // computed
    );

    const result = getMemberExpressionString(memberExpr);
    expect(result).toBe('pm.environment.get');
  });

  it('should mark non-string computed properties as [computed]', () => {
    // Create a computed member expression with variable: obj[varName]
    const memberExpr = j.memberExpression(
      j.identifier('obj'),
      j.identifier('varName'),
      true // computed
    );

    const result = getMemberExpressionString(memberExpr);
    expect(result).toBe('obj.[computed]');
  });

  it('should handle basic identifiers', () => {
    const identifier = j.identifier('pm');
    const result = getMemberExpressionString(identifier);
    expect(result).toBe('pm');
  });
});
