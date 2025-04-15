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

    expect(result).toBe('{{recursion3}}');
  });

  it('should replace repeated placeholders with 1 level of recursion with values from the object', () => {
    const inputString = '{{repeated}}';
    const inputObject = {
      repeated: '{{repeated2}} {{repeated2}}',
      repeated2: 'repeated2'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(new Array(2).fill('repeated2').join(' '));
  });

  it('should replace repeated placeholders with 2 level of recursion with values from the object', () => {
    const inputString = '{{repeated}}';
    const inputObject = {
      repeated: '{{repeated2}} {{repeated2}}',
      repeated2: '{{repeated3}} {{repeated3}} {{repeated3}}',
      repeated3: 'repeated3'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(new Array(6).fill('repeated3').join(' '));
  });

  it('should replace repeated placeholders with 3 level of recursion with values from the object', () => {
    const inputString = '{{repeated}}';
    const inputObject = {
      repeated: '{{repeated2}} {{repeated2}}',
      repeated2: '{{repeated3}} {{repeated3}} {{repeated3}}',
      repeated3: '{{repeated4}} {{repeated4}} {{repeated4}} {{repeated4}}',
      repeated4: 'repeated4'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(new Array(24).fill('repeated4').join(' '));
  });

  it('should replace multiple interdependent variables in the same input string', () => {
    const inputString = `{
      "x": "{{v2}} {{v1}}"
    }`;
    const inputObject = {
      foo: 'bar',
      v1: '{{foo}}',
      v2: '{{bar}}',
      bar: 'baz'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(`{
      "x": "baz bar"
    }`);
  });
});

describe('interpolate - object handling', () => {
  it('should stringify simple objects when used as replacement values', () => {
    const inputString = 'User data: {{user.data}}';
    const inputObject = {
      'user.data': { name: 'Bruno', age: 4 }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('User data: {\n  "name": "Bruno",\n  "age": 4\n}');
  });

  it('should stringify nested objects when used as replacement values', () => {
    const inputString = 'User data: {{user.data}}';
    const inputObject = {
      'user.data': { 
        name: 'Bruno', 
        age: 4,
        preferences: { 
          food: ['egg', 'meat'],
          toys: { favorite: 'ball' }
        }
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('User data: {\n  "name": "Bruno",\n  "age": 4,\n  "preferences": {\n    "food": [\n      "egg",\n      "meat"\n    ],\n    "toys": {\n      "favorite": "ball"\n    }\n  }\n}');
  });

  it('should stringify arrays when used as replacement values', () => {
    const inputString = 'User favorites: {{user.favorites}}';
    const inputObject = {
      'user.favorites': ['egg', 'meat', 'treats']
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('User favorites: [\n  "egg",\n  "meat",\n  "treats"\n]');
  });

  it('should handle null values correctly', () => {
    const inputString = 'User data: {{user.data}}';
    const inputObject = {
      'user.data': null
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('User data: null');
  });

  it('should handle objects with nested interpolation', () => {
    const inputString = 'User data: {{user.data}}';
    const inputObject = {
      'user.data': { 
        name: 'Bruno', 
        message: '{{user.greeting}}'
      },
      'user.greeting': 'Hello there!'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('User data: {\n  "name": "Bruno",\n  "message": "Hello there!"\n}');
  });

  it('should handle objects within arrays', () => {
    const inputString = 'User items: {{user.items}}';
    const inputObject = {
      'user.items': [
        { id: 1, name: 'Toy' },
        { id: 2, name: 'Bone' },
        { id: 3, name: 'Ball', colors: ['red', 'blue'] }
      ]
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('User items: [\n  {\n    "id": 1,\n    "name": "Toy"\n  },\n  {\n    "id": 2,\n    "name": "Bone"\n  },\n  {\n    "id": 3,\n    "name": "Ball",\n    "colors": [\n      "red",\n      "blue"\n    ]\n  }\n]');
  });
});
