const { shouldUseProxy } = require('../../src/utils/proxy-util');

test('no proxy necessary - star', () => {
  const url = 'http://wwww.example.org/test';
  const noProxy = '*';

  expect(shouldUseProxy(url, noProxy)).toEqual(false);
});

test('no proxy necessary - no noProxy bypass', () => {
  const url = 'http://wwww.example.org/test';
  const noProxy = '';

  expect(shouldUseProxy(url, noProxy)).toEqual(true);
});

test('no proxy necessary - wildcard match', () => {
  const url = 'http://wwww.example.org/test';
  const noProxy = '*example.org';

  expect(shouldUseProxy(url, noProxy)).toEqual(false);
});

test('no proxy necessary - direct proxy', () => {
  const url = 'http://wwww.example.org/test';
  const noProxy = 'wwww.example.org';

  expect(shouldUseProxy(url, noProxy)).toEqual(false);
});

test('no proxy necessary - multiple proxy', () => {
  const url = 'http://wwww.example.org/test';
  const noProxy = 'www.example.com,wwww.example.org';

  expect(shouldUseProxy(url, noProxy)).toEqual(false);
});

test('proxy necessary - no proxy match multiple', () => {
  const url = 'https://wwww.example.test/test';
  const noProxy = 'www.example.com,wwww.example.org';

  expect(shouldUseProxy(url, noProxy)).toEqual(true);
});

test('proxy necessary - no proxy match', () => {
  const url = 'https://wwww.example.test/test';
  const noProxy = 'www.example.com';

  expect(shouldUseProxy(url, noProxy)).toEqual(true);
});
