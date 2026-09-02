import fs from 'fs';

const content = fs.readFileSync('src/components/TransmittalModule.tsx', 'utf8').replace(/\r\n/g, '\n');
const lines = content.split('\n');

for (let i = 1346; i <= 1356; i++) {
  console.log(i + 1, JSON.stringify(lines[i]));
}
