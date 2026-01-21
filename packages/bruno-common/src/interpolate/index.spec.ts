import interpolate, { interpolateObject } from './index';
import moment from 'moment';

const BRUNO_BIRTH_DATE = new Date('2019-08-08');

const calculateAgeFromBirthDate = (birthDate = BRUNO_BIRTH_DATE) => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  const hasBirthdayPassedThisYear
    = today.getMonth() > birthDate.getMonth()
      || (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassedThisYear) {
    age--;
  }

  return age;
};

const BRUNO_AGE = calculateAgeFromBirthDate(BRUNO_BIRTH_DATE);

describe('interpolate', () => {
  it('should replace placeholders with values from the object', () => {
    const inputString = 'Hello, my name is {{user.name}} and I am {{user.age}} years old';
    const inputObject = {
      'user.name': 'Bruno',
      'user': {
        age: BRUNO_AGE
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(`Hello, my name is Bruno and I am ${BRUNO_AGE} years old`);
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
        'full_name': 'Bruno',
        'age': BRUNO_AGE,
        'fav-food': ['egg', 'meat'],
        'want.attention': true
      }
    };
    const inputStr = `
  Hi, I am {{user.full_name}},
  I am {{user.age}} years old.
  My favorite food is {{user.fav-food[0]}} and {{user.fav-food[1]}}.
  I like attention: {{user['want.attention']}}
`;
    const expectedStr = `
  Hi, I am Bruno,
  I am ${BRUNO_AGE} years old.
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
      'user': {
        age: BRUNO_AGE
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(`Hello, my name is {{ user.name }} and I am ${BRUNO_AGE} years old`);
  });

  test('should give precedence to the last key in case of duplicates (not at the top level)', () => {
    const inputString = `Hello, my name is {{data['user.name']}} and {{data.user.name}} I am {{data.user.age}} years old`;
    const inputObject = {
      data: {
        'user.name': 'Bruno',
        'user': {
          name: 'Not _Bruno_',
          age: BRUNO_AGE
        }
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(`Hello, my name is Bruno and Not _Bruno_ I am ${BRUNO_AGE} years old`);
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
      'user': {
        age: BRUNO_AGE
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(`Hello, my name is Bruno and I am ${BRUNO_AGE} years old`);
  });

  it('should replace placeholders with 2 level of recursion with values from the object', () => {
    const inputString = '{{user.message}}';
    const inputObject = {
      'user.message': 'Hello, my name is {{user.name}} and I am {{user.age}} years old',
      'user.name': 'Bruno {{user.lastName}}',
      'user.lastName': 'Dog',
      'user': {
        age: BRUNO_AGE
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(`Hello, my name is Bruno Dog and I am ${BRUNO_AGE} years old`);
  });

  it('should replace placeholders with 3 level of recursion with values from the object', () => {
    const inputString = '{{user.message}}';
    const inputObject = {
      'user.message': 'Hello, my name is {{user.full_name}} and I am {{user.age}} years old',
      'user.full_name': '{{user.name}}',
      'user.name': 'Bruno {{user.lastName}}',
      'user.lastName': 'Dog',
      'user': {
        age: BRUNO_AGE
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(`Hello, my name is Bruno Dog and I am ${BRUNO_AGE} years old`);
  });

  it('should handle missing values with 1 level of recursion by leaving the placeholders unchanged using {{}} as delimiters', () => {
    const inputString = '{{user.message}}';
    const inputObject = {
      'user.message': 'Hello, my name is {{user.name}} and I am {{user.age}} years old',
      'user': {
        age: BRUNO_AGE
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(`Hello, my name is {{user.name}} and I am ${BRUNO_AGE} years old`);
  });

  it('should handle all valid keys with 1 level of recursion', () => {
    const message = `
  Hi, I am {{user.full_name}},
  I am {{user.age}} years old.
  My favorite food is {{user.fav-food[0]}} and {{user.fav-food[1]}}.
  I like attention: {{user['want.attention']}}
`;
    const inputObject = {
      user: {
        message,
        'full_name': 'Bruno',
        'age': BRUNO_AGE,
        'fav-food': ['egg', 'meat'],
        'want.attention': true
      }
    };

    const inputStr = '{{user.message}}';
    const expectedStr = `
  Hi, I am Bruno,
  I am ${BRUNO_AGE} years old.
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

  it('should replace variables pointing to mock data functions', () => {
    const inputString = 'Timestamp: {{folderVar}}';
    const inputObject = {
      folderVar: '{{$isoTimestamp}}'
    };

    const result = interpolate(inputString, inputObject);

    // Validate that the result is a valid ISO timestamp
    const timestampPattern = /^Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(timestampPattern.test(result)).toBe(true);
  });

  it('should replace nested variables pointing to mock data functions', () => {
    const inputString = 'Random values: {{var1}} and {{var2}}';
    const inputObject = {
      var1: '{{nestedVar}}',
      nestedVar: '{{$randomInt}}',
      var2: '{{$randomBoolean}}'
    };

    const result = interpolate(inputString, inputObject);

    // Validate the result
    const parts = result.split(' and ');
    expect(parts.length).toBe(2);

    const randomInt = parts[0].replace('Random values: ', '');
    const randomBoolean = parts[1];

    // Check if randomInt is a number
    expect(!isNaN(Number(randomInt))).toBe(true);
    expect(Number(randomInt)).toBeGreaterThanOrEqual(0);
    expect(Number(randomInt)).toBeLessThanOrEqual(1000);

    // Check if randomBoolean is a boolean
    expect(['true', 'false'].includes(randomBoolean)).toBe(true);
  });

  it('should replace variables pointing to mock data functions with escapeJSONStrings option', () => {
    const inputString = '{"timestamp": "{{folderVar}}"}';
    const inputObject = {
      folderVar: '{{$isoTimestamp}}'
    };

    const result = interpolate(inputString, inputObject, { escapeJSONStrings: true });

    // Should produce valid JSON
    expect(() => {
      const parsed = JSON.parse(result);
      // Validate that the timestamp is a valid ISO timestamp
      const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(timestampPattern.test(parsed.timestamp)).toBe(true);
    }).not.toThrow();
  });
});

describe('interpolate - object handling', () => {
  it('should stringify simple objects', () => {
    const inputString = 'User: {{user}}';
    const inputObject = {
      user: { name: 'Bruno', age: BRUNO_AGE }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(`User: {"name":"Bruno","age":${BRUNO_AGE}}`);
  });

  it('should stringify simple objects (dot notation)', () => {
    const inputString = 'User: {{user.data}}';
    const inputObject = {
      'user.data': { name: 'Bruno', age: BRUNO_AGE }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(`User: {"name":"Bruno","age":${BRUNO_AGE}}`);
  });

  it('should stringify nested objects', () => {
    const inputString = 'User: {{user}}';
    const inputObject = {
      user: {
        name: 'Bruno',
        age: BRUNO_AGE,
        preferences: {
          food: ['egg', 'meat'],
          toys: { favorite: 'ball' }
        }
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe(`User: {"name":"Bruno","age":${BRUNO_AGE},"preferences":{"food":["egg","meat"],"toys":{"favorite":"ball"}}}`);
  });

  it('should stringify arrays', () => {
    const inputString = 'User favorites: {{favorites}}';
    const inputObject = {
      favorites: ['egg', 'meat', 'treats']
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('User favorites: ["egg","meat","treats"]');
  });

  it('should handle null values correctly', () => {
    const inputString = 'User: {{user}}';
    const inputObject = {
      user: null
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('User: null');
  });

  it('should handle objects with nested interpolation', () => {
    const inputString = 'User: {{user}}';
    const inputObject = {
      'user': {
        name: 'Bruno',
        message: '{{user.greeting}}'
      },
      'user.greeting': 'Hello there!'
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('User: {"name":"Bruno","message":"Hello there!"}');
  });

  it('should handle objects within arrays', () => {
    const inputString = 'Items: {{items}}';
    const inputObject = {
      items: [
        { id: 1, name: 'Toy' },
        { id: 2, name: 'Bone' },
        { id: 3, name: 'Ball', colors: ['red', 'blue'] }
      ]
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Items: [{"id":1,"name":"Toy"},{"id":2,"name":"Bone"},{"id":3,"name":"Ball","colors":["red","blue"]}]');
  });
});

describe('interpolate - mock variable interpolation', () => {
  it('should replace mock variables with generated values', () => {
    const inputString = '{{$randomInt}}, {{$randomIP}}, {{$randomIPV4}}, {{$randomIPV6}}, {{$randomBoolean}}';

    const result = interpolate(inputString, {});

    // Validate the result using regex patterns
    const randomIntPattern = /^(?:[0-9]{1,2}|[1-9][0-9]{2}|1000)$/;
    const randomIPPattern = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$|^(\d{1,3}\.){3}\d{1,3}$/;
    const randomIPV4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const randomIPV6Pattern = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/;
    const randomBooleanPattern = /^(true|false)$/;

    const [randomInt, randomIP, randomIPV4, randomIPV6, randomBoolean] = result.split(', ');

    expect(randomIntPattern.test(randomInt)).toBe(true);
    expect(randomIPPattern.test(randomIP)).toBe(true);
    expect(randomIPV4Pattern.test(randomIPV4)).toBe(true);
    expect(randomIPV6Pattern.test(randomIPV6)).toBe(true);
    expect(randomBooleanPattern.test(randomBoolean)).toBe(true);
  });

  it('should leave mock variables unchanged if no corresponding function exists', () => {
    const inputString = 'Random number: {{$nonExistentMock}}';

    const result = interpolate(inputString, {});

    expect(result).toBe('Random number: {{$nonExistentMock}}');
  });

  it('should escape special characters in mock variable values and produce valid JSON when escapeJSONStrings is true', () => {
    const inputString = '{"escapedValue": "{{$randomLoremParagraphs}}"}';

    expect(() => {
      const result = interpolate(inputString, {}, { escapeJSONStrings: true });
      JSON.parse(result); // This should not throw an error
    }).not.toThrow();
  });

  it('should not produce valid JSON when escapeJSONStrings is false', () => {
    const inputString = '{"escapedValue": "{{$randomLoremParagraphs}}"}';

    expect(() => {
      const result = interpolate(inputString, {}, { escapeJSONStrings: false });
      JSON.parse(result); // This should throw an error
    }).toThrow();
  });

  it('should throw an error when producing invalid JSON regardless of escapeJSONStrings option', () => {
    const inputString = '{"escapedValue": "{{$randomLoremParagraphs}}"}';

    // Test without providing the options argument
    expect(() => {
      const result = interpolate(inputString, {});
      JSON.parse(result); // This should throw an error
    }).toThrow();

    // Test with escapeJSONStrings explicitly set to false
    expect(() => {
      const result = interpolate(inputString, {}, { escapeJSONStrings: false });
      JSON.parse(result); // This should throw an error
    }).toThrow();
  });

  it('should process mock variables in nested objects', () => {
    const inputString = '{{user.data}}';
    const inputObject = {
      user: {
        data: {
          id: '{{$randomUUID}}',
          timestamp: '{{$isoTimestamp}}',
          nested: {
            randomInt: '{{$randomInt}}'
          }
        }
      }
    };

    const result = interpolate(inputString, inputObject);
    const parsed = JSON.parse(result);

    // Validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidPattern.test(parsed.id)).toBe(true);

    // Validate ISO timestamp format
    const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(isoTimestampPattern.test(parsed.timestamp)).toBe(true);

    // Validate nested randomInt
    expect(!isNaN(Number(parsed.nested.randomInt))).toBe(true);
    expect(Number(parsed.nested.randomInt)).toBeGreaterThanOrEqual(0);
    expect(Number(parsed.nested.randomInt)).toBeLessThanOrEqual(1000);
  });
});

describe('interpolate - Date() handling', () => {
  it('should interpolate Date() using JSON.stringify', () => {
    const inputString = 'Date is {{date}}';
    const inputObject = {
      date: new Date('2025-04-17T15:33:41.117Z')
    };

    const jsonStringifiedDate = JSON.stringify(inputObject.date);
    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Date is "2025-04-17T15:33:41.117Z"');
    expect(result).toBe(`Date is ${jsonStringifiedDate}`);
  });

  it('should interpolate Date() when its nested in an object', () => {
    const inputString = 'Date is {{date}}';
    const inputObject = {
      date: {
        now: new Date('2025-04-17T15:33:41.117Z')
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Date is {"now":"2025-04-17T15:33:41.117Z"}');
  });
});

describe('interpolate - moment() handling', () => {
  it('should interpolate moment() using JSON.stringify', () => {
    const inputString = 'Date is {{date}}';
    const inputObject = {
      date: moment('2025-04-17T15:33:41.117Z')
    };

    const jsonStringifiedDate = JSON.stringify(inputObject.date);
    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Date is "2025-04-17T15:33:41.117Z"');
    expect(result).toBe(`Date is ${jsonStringifiedDate}`);
  });

  it('should interpolate moment() when its nested in an object', () => {
    const inputString = 'Date is {{date}}';
    const inputObject = {
      date: {
        now: moment('2025-04-17T15:33:41.117Z')
      }
    };

    const result = interpolate(inputString, inputObject);

    expect(result).toBe('Date is {"now":"2025-04-17T15:33:41.117Z"}');
  });
});

describe('interpolateObject', () => {
  it('should interpolate strings in a flat object', () => {
    const obj = {
      url: '{{baseUrl}}/api/users',
      name: '{{userName}}'
    };
    const variables = { baseUrl: 'https://api.example.com', userName: 'Bruno' };

    const result = interpolateObject(obj, variables);

    expect(result).toEqual({
      url: 'https://api.example.com/api/users',
      name: 'Bruno'
    });
  });

  it('should interpolate strings in nested objects', () => {
    const obj = {
      request: {
        url: '{{baseUrl}}/api',
        headers: {
          Authorization: 'Bearer {{token}}'
        }
      }
    };
    const variables = { baseUrl: 'https://api.example.com', token: 'abc123' };

    const result = interpolateObject(obj, variables);

    expect(result).toEqual({
      request: {
        url: 'https://api.example.com/api',
        headers: {
          Authorization: 'Bearer abc123'
        }
      }
    });
  });

  it('should interpolate strings in arrays', () => {
    const obj = {
      urls: ['{{baseUrl}}/one', '{{baseUrl}}/two']
    };
    const variables = { baseUrl: 'https://api.example.com' };

    const result = interpolateObject(obj, variables);

    expect(result).toEqual({
      urls: ['https://api.example.com/one', 'https://api.example.com/two']
    });
  });

  it('should preserve non-string values', () => {
    const obj = {
      name: '{{name}}',
      age: 5,
      active: true,
      data: null
    };
    const variables = { name: 'Bruno' };

    const result = interpolateObject(obj, variables);

    expect(result).toEqual({
      name: 'Bruno',
      age: 5,
      active: true,
      data: null
    });
  });

  it('should return null and undefined as-is', () => {
    expect(interpolateObject(null, {})).toBeNull();
    expect(interpolateObject(undefined, {})).toBeUndefined();
  });

  it('should throw on circular references', () => {
    const obj: any = { a: 1 };
    obj.self = obj;

    expect(() => interpolateObject(obj, {})).toThrow('Circular reference detected during interpolation.');
  });

  it('should handle shared object references without throwing false positives', () => {
    const shared = { value: '{{sharedValue}}' };
    const obj = {
      x: shared,
      y: shared
    };
    const variables = { sharedValue: 'test' };

    const result = interpolateObject(obj, variables);

    expect(result).toEqual({
      x: { value: 'test' },
      y: { value: 'test' }
    });
  });

  it('should handle shared object references in arrays', () => {
    const shared = { id: '{{id}}' };
    const obj = {
      items: [shared, shared, shared]
    };
    const variables = { id: '123' };

    const result = interpolateObject(obj, variables);

    expect(result).toEqual({
      items: [{ id: '123' }, { id: '123' }, { id: '123' }]
    });
  });

  it('should handle shared object references in nested structures', () => {
    const shared = { name: '{{name}}' };
    const obj = {
      user: shared,
      profile: {
        user: shared,
        metadata: {
          user: shared
        }
      }
    };
    const variables = { name: 'Bruno' };

    const result = interpolateObject(obj, variables);

    expect(result).toEqual({
      user: { name: 'Bruno' },
      profile: {
        user: { name: 'Bruno' },
        metadata: {
          user: { name: 'Bruno' }
        }
      }
    });
  });

  it('should handle shared array references', () => {
    const shared = ['{{item1}}', '{{item2}}'];
    const obj = {
      list1: shared,
      list2: shared
    };
    const variables = { item1: 'a', item2: 'b' };

    const result = interpolateObject(obj, variables);

    expect(result).toEqual({
      list1: ['a', 'b'],
      list2: ['a', 'b']
    });
  });

  it('should still detect actual circular references', () => {
    const obj: any = {
      a: { value: '{{val}}' },
      b: { value: '{{val}}' }
    };
    obj.a.circular = obj.a; // Circular reference

    expect(() => interpolateObject(obj, { val: 'test' })).toThrow('Circular reference detected during interpolation.');
  });

  it('should handle deeply nested circular references', () => {
    const obj: any = {
      level1: {
        level2: {
          level3: {}
        }
      }
    };
    obj.level1.level2.level3.circular = obj.level1;

    expect(() => interpolateObject(obj, {})).toThrow('Circular reference detected during interpolation.');
  });
});
