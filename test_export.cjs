const ExcelJS = require('exceljs');

async function exportToExcel(sales) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte de Ventas');

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
  const headerFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const borderThin = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  const currencyFmt = 'Q#,##0.00';

  // Row 1: Title
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'INFORME DE VENTAS DEL DÍA';
  titleCell.fill = headerFill;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  // Row 2: Headers
  const headers = ["No.", "NOMBRE DEL CLIENTE", "TELEFONO", "HORA", "TOTAL", "FORMA DE PAGO", "VENDEDOR"];
  const headerRow = worksheet.getRow(2);
  headerRow.values = headers;
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderThin;
  });

  // Column Widths
  worksheet.columns = [
    { key: 'id', width: 6 },
    { key: 'name', width: 35 },
    { key: 'phone', width: 25 },
    { key: 'time', width: 10 },
    { key: 'total', width: 15 },
    { key: 'pago', width: 18 },
    { key: 'vendedor', width: 18 }
  ];

  // Set AutoFilter for the header row
  worksheet.autoFilter = 'A2:G2';

  // Force Excel to recalculate all formulas when the workbook opens
  workbook.calcProperties.fullCalcOnLoad = true;

  const morningSales = sales.filter(s => parseInt(s.time.split(':')[0]) < 11);
  const afternoonSales = sales.filter(s => parseInt(s.time.split(':')[0]) >= 11);

  let currentRow = 3;

  const addSalesRows = (saleList) => {
    const start = currentRow;
    saleList.forEach(sale => {
      const row = worksheet.getRow(currentRow);
      row.getCell('A').value = sale.id;
      row.getCell('B').value = sale.customerName;
      row.getCell('C').value = sale.phone;
      row.getCell('D').value = sale.time;
      row.getCell('E').value = sale.total;
      row.getCell('F').value = sale.pago;
      row.getCell('G').value = sale.vendedor;
      
      row.getCell('E').numFmt = currencyFmt;
      currentRow++;
    });
    return { start, end: currentRow - 1 };
  };

  const totalRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  const addTotalRow = (label, range) => {
    const row = worksheet.getRow(currentRow);
    row.getCell('D').value = label;
    row.getCell('D').font = { bold: true };
    row.getCell('D').alignment = { horizontal: 'right' };
    if (range.start <= range.end) {
      row.getCell('E').value = { formula: `SUM(E${range.start}:E${range.end})` };
    } else {
      row.getCell('E').value = 0;
    }
    row.getCell('E').numFmt = currencyFmt;
    row.getCell('E').font = { bold: true };
    
    // Apply gray fill to cells A-G
    ['A','B','C','D','E','F','G'].forEach(col => {
      row.getCell(col).fill = totalRowFill;
      row.getCell(col).border = borderThin;
    });

    currentRow++;
    return currentRow - 1; // Return the row index of the total
  };

  // Morning
  const morningRange = addSalesRows(morningSales);
  const morningTotalIndex = addTotalRow('Total de la mañana', morningRange);
  currentRow++; // blank line

  // Afternoon
  const afternoonRange = addSalesRows(afternoonSales);
  const afternoonTotalIndex = addTotalRow('Total de la Tarde', afternoonRange);
  currentRow++; // blank line

  // Grand Total
  const grandTotalRow = worksheet.getRow(currentRow);
  grandTotalRow.getCell('D').value = 'TOTAL GENERAL DEL DÍA';
  grandTotalRow.getCell('D').font = { bold: true, size: 12 };
  grandTotalRow.getCell('D').alignment = { horizontal: 'right' };
  grandTotalRow.getCell('E').value = { formula: `E${morningTotalIndex} + E${afternoonTotalIndex}` };
  grandTotalRow.getCell('E').numFmt = currencyFmt;
  grandTotalRow.getCell('E').font = { bold: true, size: 12 };
  
  // Apply gray fill
  ['A','B','C','D','E','F','G'].forEach(col => {
    grandTotalRow.getCell(col).fill = totalRowFill;
    grandTotalRow.getCell(col).border = borderThin;
  });
  
  currentRow += 3;

  // Summaries by Vendor
  const vendors = ['FREDY', 'JAIME', 'VIEJO', 'ANDRES Jr.', 'LOCAL'];
  
  vendors.forEach(v => {
    const vSales = sales.filter(s => s.vendedor === v);
    
    // Header for this vendor table
    const headRow = worksheet.getRow(currentRow);
    headRow.getCell('D').value = v;
    headRow.getCell('E').value = 'EFECTIVO';
    headRow.getCell('F').value = 'TRANSFERENCIA';
    headRow.getCell('G').value = 'TARJETA';
    
    ['D','E','F','G'].forEach(col => {
      const cell = headRow.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA6A6A6' } };
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });
    currentRow++;

    // Data for this vendor table
    const dataRow = worksheet.getRow(currentRow);
    // Find all rows where vendor == v, and pago == EFECTIVO etc.
    const maxRow = (afternoonRange.end || morningRange.end || 3);
    const formulaBase = `SUMIFS(E3:E${maxRow}, G3:G${maxRow}, "${v}", F3:F${maxRow}, `;
    
    dataRow.getCell('E').value = { formula: formulaBase + '"EFECTIVO")' };
    dataRow.getCell('F').value = { formula: formulaBase + '"TRANSFERENCIA")' };
    dataRow.getCell('G').value = { formula: formulaBase + '"TARJETA")' };
    
    ['D','E','F','G'].forEach(col => {
      const cell = dataRow.getCell(col);
    if(col !== 'D') cell.numFmt = currencyFmt;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });
    
    currentRow += 2;
  });

  // --- SECOND SHEET: BUSCADOR INTELIGENTE ---
  const searchSheet = workbook.addWorksheet('Buscador Inteligente');
  searchSheet.views = [{ showGridLines: false }];

  searchSheet.columns = [
    { width: 6  }, // A - No.
    { width: 35 }, // B - Nombre del Cliente
    { width: 20 }, // C - Teléfono
    { width: 12 }, // D - Hora
    { width: 15 }, // E - Total
    { width: 18 }, // F - Forma de Pago
    { width: 18 }, // G - Vendedor
  ];

  // ---- Row 1: Title ----
  searchSheet.mergeCells('A1:G1');
  const sTitle = searchSheet.getCell('A1');
  sTitle.value = '🔍 BUSCADOR INTELIGENTE DE VENTAS — Comedor Donde Flory';
  sTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  sTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  searchSheet.getRow(1).height = 30;

  // ---- Row 2: Instruction banner ----
  searchSheet.mergeCells('A2:G2');
  const instrCell = searchSheet.getCell('A2');
  instrCell.value = 'Selecciona Vendedor en C4 y/o Forma de Pago en E4 — los resultados aparecen solos ↓';
  instrCell.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
  instrCell.alignment = { horizontal: 'center', vertical: 'middle' };
  instrCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  searchSheet.getRow(2).height = 18;

  // ---- Row 3: Labels ----
  searchSheet.getCell('B3').value = 'VENDEDOR:';
  searchSheet.getCell('B3').font = { bold: true, size: 11 };
  searchSheet.getCell('B3').alignment = { horizontal: 'right', vertical: 'middle' };
  searchSheet.getCell('D3').value = 'FORMA DE PAGO:';
  searchSheet.getCell('D3').font = { bold: true, size: 11 };
  searchSheet.getCell('D3').alignment = { horizontal: 'right', vertical: 'middle' };
  searchSheet.getRow(3).height = 20;

  // ---- Row 4: Yellow dropdown inputs ----
  const vendorInput = searchSheet.getCell('C4');
  vendorInput.dataValidation = {
    type: 'list', allowBlank: true, showErrorMessage: false,
    formulae: ['"FREDY,JAIME,VIEJO,ANDRES Jr.,LOCAL,OTROS"']
  };
  vendorInput.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE066' } };
  vendorInput.border = borderThin;
  vendorInput.alignment = { horizontal: 'center', vertical: 'middle' };
  vendorInput.font   = { bold: true, size: 12 };

  const pagoInput = searchSheet.getCell('E4');
  pagoInput.dataValidation = {
    type: 'list', allowBlank: true, showErrorMessage: false,
    formulae: ['"EFECTIVO,TRANSFERENCIA,TARJETA"']
  };
  pagoInput.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE066' } };
  pagoInput.border = borderThin;
  pagoInput.alignment = { horizontal: 'center', vertical: 'middle' };
  pagoInput.font   = { bold: true, size: 12 };

  searchSheet.getRow(4).height = 24;

  // ---- Row 5: Spacer ----
  searchSheet.getRow(5).height = 8;

  // ---- Row 6: Results table header ----
  const sHeader = searchSheet.getRow(6);
  sHeader.values = ['No.', 'NOMBRE DEL CLIENTE', 'TELÉFONO', 'HORA', 'TOTAL', 'FORMA DE PAGO', 'VENDEDOR'];
  sHeader.height = 22;
  sHeader.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderThin;
  });

  // ---- Rows 1000+: ALL sales as static hidden values (source for FILTER) ----
  const DATA_START = 1000;
  let dataRow = DATA_START;
  sales.forEach(sale => {
    const dr = searchSheet.getRow(dataRow);
    dr.getCell('A').value = sale.id;
    dr.getCell('B').value = sale.customerName;
    dr.getCell('C').value = sale.phone;
    dr.getCell('D').value = sale.time;
    dr.getCell('E').value = sale.total;
    dr.getCell('F').value = sale.pago;
    dr.getCell('G').value = sale.vendedor;
    dr.hidden = true; // hide from view; FILTER still reads them
    dataRow++;
  });
  const DATA_END = dataRow - 1;

  if (DATA_END >= DATA_START) {
    const cond =
      `((G${DATA_START}:G${DATA_END}=C$4)+(C$4="")=2)*` +
      `((F${DATA_START}:F${DATA_END}=E$4)+(E$4="")=2)`;
    const filterFormula =
      `IFERROR(FILTER(A${DATA_START}:G${DATA_END},${cond}),"Sin coincidencias")`;
    searchSheet.getCell('A7').value = { formula: filterFormula };
  } else {
    searchSheet.getCell('A7').value = 'No hay ventas registradas.';
  }

  await workbook.xlsx.writeFile('test_export_real.xlsx');
}

exportToExcel([{ id: 1, customerName: 'Test', phone: '123', time: '10:00', total: 100, pago: 'EFECTIVO', vendedor: 'FREDY' }])
  .then(() => console.log('Success!'))
  .catch(console.error);
