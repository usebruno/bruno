const { flattenDataForDotNotation } = require('../../src/utils/common');

describe('utils: flattenDataForDotNotation', () => {
  test('Flatten a simple object with dot notation', () => {
    const input = {
      person: {
        name: 'John',
        age: 30,
      },
    };

    const expectedOutput = {
      'person.name': 'John',
      'person.age': 30,
    };

    expect(flattenDataForDotNotation(input)).toEqual(expectedOutput);
  });

  test('Flatten an object with nested arrays', () => {
    const input = {
      users: [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 28 },
      ],
    };
  
    const expectedOutput = {
      'users[0].name': 'Alice',
      'users[0].age': 25,
      'users[1].name': 'Bob',
      'users[1].age': 28,
    };
  
    expect(flattenDataForDotNotation(input)).toEqual(expectedOutput);
  });
  
  test('Flatten an empty object', () => {
    const input = {};
  
    const expectedOutput = {};
  
    expect(flattenDataForDotNotation(input)).toEqual(expectedOutput);
  });
  
  test('Flatten an object with nested objects', () => {
    const input = {
      person: {
        name: 'Alice',
        address: {
          city: 'New York',
          zipcode: '10001',
        },
      },
    };
  
    const expectedOutput = {
      'person.name': 'Alice',
      'person.address.city': 'New York',
      'person.address.zipcode': '10001',
    };
  
    expect(flattenDataForDotNotation(input)).toEqual(expectedOutput);
  });
  
  test('Flatten an object with arrays of objects', () => {
    const input = {
      teams: [
        { name: 'Team A', members: ['Alice', 'Bob'] },
        { name: 'Team B', members: ['Charlie', 'David'] },
      ],
    };
  
    const expectedOutput = {
      'teams[0].name': 'Team A',
      'teams[0].members[0]': 'Alice',
      'teams[0].members[1]': 'Bob',
      'teams[1].name': 'Team B',
      'teams[1].members[0]': 'Charlie',
      'teams[1].members[1]': 'David',
    };
  
    expect(flattenDataForDotNotation(input)).toEqual(expectedOutput);
  });
});