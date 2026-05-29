const fs = require('fs');
const code = fs.readFileSync('src/main.js', 'utf8');
const exportFn = code.substring(code.indexOf('async function exportToExcel'), code.indexOf('// --- INITIALIZATION ---'));
const script = `
  const ExcelJS = require('exceljs');
  class Blob {
    constructor(chunks, options) {
      this.chunks = chunks;
      this.type = options.type;
    }
  }
  global.Blob = Blob;
  function saveAs() { console.log('saveAs called'); }
  ${exportFn}
  exportToExcel([{ id: 1, customerName: 'T', phone: '1', time: '10:00', pedido: 'x', total: 100, pago: 'EFECTIVO', vendedor: 'FREDY' }]).then(() => console.log('Done')).catch(console.error);
`;
fs.writeFileSync('test_error.cjs', script);
