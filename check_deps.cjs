const fs = require('fs');
const p1 = JSON.parse(fs.readFileSync('node_modules/file-saver/package.json'));
const p2 = JSON.parse(fs.readFileSync('node_modules/exceljs/package.json'));
console.log('file-saver:', p1.version, '| main:', p1.main);
console.log('exceljs:', p2.version, '| main:', p2.main);
