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

describe('interpolate - template edge cases', () => {
  it('should return the input string if the template is not a string', () => {
    const inputString = 123;
    const inputObject = {
      user: 'Bruno'
    };

    const result = interpolate(inputString as any, inputObject);
    expect(result).toBe(inputString);
  });

  it('should return the input string if the template is null', () => {
    const inputString = null;
    const inputObject = {
      user: 'Bruno'
    };

    const result = interpolate(inputString as any, inputObject);
    expect(result).toBe(inputString);
  });

  it('should return the input string if the template is undefined', () => {
    const inputString = undefined;
    const inputObject = {
      user: 'Bruno'
    };

    const result = interpolate(inputString as any, inputObject);
    expect(result).toBe(inputString);
  });

  it('should return the input string if the template is empty', () => {
    const inputString = '';
    const inputObject = {
      user: 'Bruno'
    };

    const result = interpolate(inputString, inputObject);
    expect(result).toBe(inputString);
  });

  it('should return preserve whitespaces', () => {
    const inputString = '    ';
    const inputObject = {
      user: 'Bruno'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(inputString);
  });
});

describe('interpolate - value edge cases', () => {
  it('should return the input string if the value is not an object', () => {
    const inputString = 'Hello, my name is {{user.name}}';
    const inputObject = 123;

    const result = interpolate(inputString, inputObject as any);
    expect(result).toBe(inputString);
  });

  it('should return the input string if the value is null', () => {
    const inputString = 'Hello, my name is {{user.name}}';
    const inputObject = null;

    const result = interpolate(inputString, inputObject as any);
    expect(result).toBe(inputString);
  });

  it('should return the input string if the value is undefined', () => {
    const inputString = 'Hello, my name is {{user.name}}';
    const inputObject = undefined;

    const result = interpolate(inputString, inputObject as any);
    expect(result).toBe(inputString);
  });

  it('should return the input string if the value is empty', () => {
    const inputString = 'Hello, my name is {{user.name}}';
    const inputObject = {};

    const result = interpolate(inputString, inputObject);
    expect(result).toBe(inputString);
  });
});

describe('interpolate - recursive', () => {
  it('should replace placeholders with 1 level of recursion with values from the object', () => {
    const inputString = '{{user.message}}';
    const inputObject = {
      'user.message': 'Hello, my name is {{user.name}} and I am {{user.age}} years old',
      'user.name': 'Bruno',
      user: {
        age: 4
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Hello, my name is Bruno and I am 4 years old');
  });

  it('should replace placeholders with 2 level of recursion with values from the object', () => {
    const inputString = '{{user.message}}';
    const inputObject = {
      'user.message': 'Hello, my name is {{user.name}} and I am {{user.age}} years old',
      'user.name': 'Bruno {{user.lastName}}',
      'user.lastName': 'Dog',
      user: {
        age: 4
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Hello, my name is Bruno Dog and I am 4 years old');
  });

  it('should replace placeholders with 3 level of recursion with values from the object', () => {
    const inputString = '{{user.message}}';
    const inputObject = {
      'user.message': 'Hello, my name is {{user.full_name}} and I am {{user.age}} years old',
      'user.full_name': '{{user.name}}',
      'user.name': 'Bruno {{user.lastName}}',
      'user.lastName': 'Dog',
      user: {
        age: 4
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Hello, my name is Bruno Dog and I am 4 years old');
  });

  it('should handle missing values with 1 level of recursion by leaving the placeholders unchanged using {{}} as delimiters', () => {
    const inputString = '{{user.message}}';
    const inputObject = {
      'user.message': 'Hello, my name is {{user.name}} and I am {{user.age}} years old',
      user: {
        age: 4
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Hello, my name is {{user.name}} and I am 4 years old');
  });

  it('should handle all valid keys with 1 level of recursion', () => {
    const message = `
  Hi, I am {{user.full_name}},
  I am {{user.age}} years old.
  My favorite food is {{user.fav-food[0]}} and {{user.fav-food[1]}}.
  I like attention: {{user.want.attention}}
`;
    const inputObject = {
      user: {
        message,
        full_name: 'Bruno',
        age: 4,
        'fav-food': ['egg', 'meat'],
        'want.attention': true
      }
    };

    const inputStr = '{{user.message}}';
    const expectedStr = `
  Hi, I am Bruno,
  I am 4 years old.
  My favorite food is egg and meat.
  I like attention: true
`;
    const result = interpolate(inputStr, inputObject);
    expect(result).toBe(expectedStr);
  });

  it('should not process 1 level of cycle recursion with values from the object', () => {
    const inputString = '{{recursion}}';
    const inputObject = {
      recursion: '{{recursion}}'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('{{recursion}}');
  });

  it('should not process 2 level of cycle recursion with values from the object', () => {
    const inputString = '{{recursion}}';
    const inputObject = {
      recursion: '{{recursion2}}',
      recursion2: '{{recursion}}'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('{{recursion2}}');
  });

  it('should not process 3 level of cycle recursion with values from the object', () => {
    const inputString = '{{recursion}}';
    const inputObject = {
      recursion: '{{recursion2}}',
      recursion2: '{{recursion3}}',
      recursion3: '{{recursion}}'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('{{recursion2}}');
  });

  it('should replace repetead placeholders with 1 level of recursion with values from the object', () => {
    const inputString = '{{repetead}}';
    const inputObject = {
      repetead: '{{repetead2}} {{repetead2}}',
      repetead2: 'repetead2'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(new Array(2).fill('repetead2').join(' '));
  });

  it('should replace repetead placeholders with 2 level of recursion with values from the object', () => {
    const inputString = '{{repetead}}';
    const inputObject = {
      repetead: '{{repetead2}} {{repetead2}}',
      repetead2: '{{repetead3}} {{repetead3}} {{repetead3}}',
      repetead3: 'repetead3'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(new Array(6).fill('repetead3').join(' '));
  });

  it('should replace repetead placeholders with 3 level of recursion with values from the object', () => {
    const inputString = '{{repetead}}';
    const inputObject = {
      repetead: '{{repetead2}} {{repetead2}}',
      repetead2: '{{repetead3}} {{repetead3}} {{repetead3}}',
      repetead3: '{{repetead4}} {{repetead4}} {{repetead4}} {{repetead4}}',
      repetead4: 'repetead4'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(new Array(24).fill('repetead4').join(' '));
  });
});
