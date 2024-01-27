import interpolate from './index';

describe('interpolate', () => {
  it('should replace placeholders with values from the object', () => {
    const inputString = 'Hello, my name is {{user.name}} and I am {{user.age}} years old';
    const inputObject = {
      'user.name': 'Bruno',
      user: {
        age: 4
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Hello, my name is Bruno and I am 4 years old');
  });

  it('should handle missing values by leaving the placeholders unchanged using {{}} as delimiters', () => {
    const inputString = 'Hello, my name is {{user.name}} and I am {{user.age}} years old';
    const inputObject = {
      user: {
        name: 'Bruno'
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Hello, my name is Bruno and I am {{user.age}} years old');
  });

  it('should handle all valid keys', () => {
    const inputObject = {
      user: {
        full_name: 'Bruno',
        age: 4,
        'fav-food': ['egg', 'meat'],
        'want.attention': true
      }
    };
    const inputStr = `
  Hi, I am {{user.full_name}},
  I am {{user.age}} years old.
  My favorite food is {{user.fav-food[0]}} and {{user.fav-food[1]}}.
  I like attention: {{user.want.attention}}
`;
    const expectedStr = `
  Hi, I am Bruno,
  I am 4 years old.
  My favorite food is egg and meat.
  I like attention: true
`;
    const result = interpolate(inputStr, inputObject);
    expect(result).toBe(expectedStr);
  });

  it('should strictly match the keys (whitespace matters)', () => {
    const inputString = 'Hello, my name is {{ user.name }} and I am {{user.age}} years old';
    const inputObject = {
      'user.name': 'Bruno',
      user: {
        age: 4
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Hello, my name is {{ user.name }} and I am 4 years old');
  });

  it('should give precedence to the last key in case of duplicates', () => {
    const inputString = 'Hello, my name is {{user.name}} and I am {{user.age}} years old';
    const inputObject = {
      'user.name': 'Bruno',
      user: {
        name: 'Not Bruno',
        age: 4
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Hello, my name is Not Bruno and I am 4 years old');
  });
});
