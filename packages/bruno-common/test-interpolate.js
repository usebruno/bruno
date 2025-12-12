const interpolate = require('./dist/cjs/index.js').interpolate;

console.log('Test 1: Direct mock function');
const result1 = interpolate('https://g.cn?abc={{$isoTimestamp}}', {});
console.log('Result:', result1);
console.log('Contains $isoTimestamp?', result1.includes('$isoTimestamp'));

console.log('\nTest 2: Nested variable with mock function');
const result2 = interpolate('https://g.cn?abc={{myVar}}', {
  myVar: '{{$isoTimestamp}}'
});
console.log('Result:', result2);
console.log('Contains $isoTimestamp?', result2.includes('$isoTimestamp'));

console.log('\nTest 3: Double nested');
const result3 = interpolate('https://g.cn?abc={{var1}}', {
  var1: '{{var2}}',
  var2: '{{$isoTimestamp}}'
});
console.log('Result:', result3);
console.log('Contains $isoTimestamp?', result3.includes('$isoTimestamp'));
