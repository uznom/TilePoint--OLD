import fs from 'fs';

const content = fs.readFileSync('src/components/TransmittalModule.tsx', 'utf8').replace(/\r\n/g, '\n');
const lines = content.split('\n');

console.log('Line 1348 (start M1):', lines[1347]);
console.log('Line 1349:', lines[1348]);
console.log('Line 1358 (after form tag):', lines[1357]);
console.log('Line 1463 (form close):', lines[1462]);
console.log('Line 1464 (div close):', lines[1463]);
console.log('Line 1465 (portal close):', lines[1464]);

console.log('Line 1468 (start M2):', lines[1467]);
console.log('Line 1475 (after card open):', lines[1474]);
console.log('Line 1667 (div close):', lines[1666]);
console.log('Line 1668 (div close):', lines[1667]);
console.log('Line 1669 (portal close):', lines[1668]);

console.log('Line 1838 (start M3):', lines[1837]);
console.log('Line 1845 (after card open):', lines[1844]);
console.log('Line 1887 (div close):', lines[1886]);
console.log('Line 1888 (div close):', lines[1887]);
console.log('Line 1889 (portal close):', lines[1888]);
