import { describe, it, expect } from '@jest/globals';
import { nonUnaryOperators, specialOperators, unaryOperators, parseAssertion } from './index';

describe.each(['', ' ', 0, false, null, undefined, NaN])('Invalid assertions', function (assertionString) {
  it(`should return default result when the value is ${assertionString}`, function () {
    // arrange
    const expectedResult = {
      operator: 'eq',
      value: ''
    };

    // act
    const actualResult = parseAssertion(assertionString);

    // assert
    expect(actualResult).toEqual(expectedResult);
  });
});

describe.each(unaryOperators)('Assertions with unary operator', function (operator) {
  it(`should return empty string in value field when operator is ${operator}`, function () {
    // arrange
    const expectedResult = {
      operator,
      value: ''
    };

    // act
    const actualResult = parseAssertion(`${operator} 12`);

    // assert
    expect(actualResult).toEqual(expectedResult);
  });
});

describe.each([...nonUnaryOperators, ...specialOperators])(
  'Assertions with non-unary/special operator',
  function (operator) {
    it(`should return actual value in value field when operator is ${operator}`, function () {
      // arrange
      const value = 'expected value';

      const expectedResult = {
        operator,
        value
      };

      // act
      const actualResult = parseAssertion(`${operator} ${value}`);

      // assert
      expect(actualResult).toEqual(expectedResult);
    });
  }
);
