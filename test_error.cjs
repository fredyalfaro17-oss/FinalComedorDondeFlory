
  const ExcelJS = require('exceljs');
  class Blob {
    constructor(chunks, options) {
      this.chunks = chunks;
      this.type = options.type;
    }
  }
  global.Blob = Blob;
  global.alert = function(msg) { console.log('ALERT:', msg); };
  function saveAs() { console.log('saveAs called'); }
  async function exportToExcel(sales) {
  if (!sales || sales.length === 0) {
    alert('No hay ventas para exportar.');
    return;
  }

  console.log('🚀 Iniciando exportación a Excel...');
  console.log('Datos a procesar:', sales.length, 'ventas');

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Ventas');

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
  const headerFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const borderThin = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  const currencyFmt = 'Q#,##0.00';

  // Row 1: Title
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'INFORME DE VENTAS DEL DÍA';
  titleCell.fill = headerFill;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  // Row 2: Headers
  const headers = ["No.", "NOMBRE DEL CLIENTE", "TELEFONO", "HORA", "DETALLE DE PEDIDO", "TOTAL", "FORMA DE PAGO", "VENDEDOR"];
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
    { key: 'pedido', width: 45 },
    { key: 'total', width: 15 },
    { key: 'pago', width: 18 },
    { key: 'vendedor', width: 18 },
    { key: 'extra_col', width: 18 }
  ];

  // Set AutoFilter for the header row
  worksheet.autoFilter = 'A2:H2';

  // Force Excel to recalculate all formulas when the workbook opens
  workbook.calcProperties.fullCalcOnLoad = true;

  console.log('Filtrando ventas por horario...');
  const morningSales = sales.filter(s => {
    if (!s.time || typeof s.time !== 'string') return true; // Default to morning if time is weird
    const hour = parseInt(s.time.split(':')[0]);
    return isNaN(hour) ? true : hour < 11;
  });
  
  const afternoonSales = sales.filter(s => {
    if (!s.time || typeof s.time !== 'string') return false;
    const hour = parseInt(s.time.split(':')[0]);
    return isNaN(hour) ? false : hour >= 11;
  });

  console.log(`Ventas filtradas: Mañana(${morningSales.length}), Tarde(${afternoonSales.length})`);

  let currentRow = 3;

  const addSalesRows = (saleList) => {
    const start = currentRow;
    saleList.forEach(sale => {
      sale.excelRow = currentRow;
      const row = worksheet.getRow(currentRow);
      row.getCell('A').value = sale.id;
      row.getCell('B').value = sale.customerName;
      row.getCell('C').value = sale.phone;
      row.getCell('D').value = sale.time;
      row.getCell('E').value = sale.items;
      row.getCell('F').value = sale.total;
      
      const pagoCell = row.getCell('G');
      pagoCell.value = sale.pago;
      pagoCell.dataValidation = {
        type: 'list', allowBlank: true, showErrorMessage: false,
        formulae: ['"EFECTIVO,TRANSFERENCIA,TARJETA,NO PAGO"']
      };

      const vendedorCell = row.getCell('H');
      vendedorCell.value = sale.vendedor;
      vendedorCell.dataValidation = {
        type: 'list', allowBlank: true, showErrorMessage: false,
        formulae: ['"FREDY,JAIME,VIEJO,ANDRES Jr.,LOCAL,FERNANDO"']
      };
      
      row.getCell('F').numFmt = currencyFmt;
      currentRow++;
    });
    return { start, end: currentRow - 1 };
  };

  const totalRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  const addTotalRow = (label, range) => {
    const row = worksheet.getRow(currentRow);
    row.getCell('E').value = label;
    row.getCell('E').font = { bold: true };
    row.getCell('E').alignment = { horizontal: 'right' };
    if (range.start <= range.end) {
      row.getCell('F').value = { formula: `SUM(F${range.start}:F${range.end})` };
    } else {
      row.getCell('F').value = 0;
    }
    row.getCell('F').numFmt = currencyFmt;
    row.getCell('F').font = { bold: true };
    
    // Apply gray fill to cells A-G
    ['A','B','C','D','E','F','G','H'].forEach(col => {
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
  grandTotalRow.getCell('E').value = 'TOTAL GENERAL DEL DÍA';
  grandTotalRow.getCell('E').font = { bold: true, size: 12 };
  grandTotalRow.getCell('E').alignment = { horizontal: 'right' };
  grandTotalRow.getCell('F').value = { formula: `F${morningTotalIndex} + F${afternoonTotalIndex}` };
  grandTotalRow.getCell('F').numFmt = currencyFmt;
  grandTotalRow.getCell('F').font = { bold: true, size: 12 };
  
  // Apply gray fill
  ['A','B','C','D','E','F','G','H'].forEach(col => {
    grandTotalRow.getCell(col).fill = totalRowFill;
    grandTotalRow.getCell(col).border = borderThin;
  });
  
  currentRow += 3;

  console.log('Adding conditional formatting...');
  // Add elegant conditional formatting for the VENDEDOR column (H)
  worksheet.addConditionalFormatting({
    ref: 'H3:H1000',
    rules: [
      {
        type: 'cellIs', operator: 'equal', formulae: ['"FREDY"'],
        style: { 
          font: { color: { argb: 'FF154360' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD4E6F1' } }
        }
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"JAIME"'],
        style: { 
          font: { color: { argb: 'FF145A32' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD5F5E3' } }
        }
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"VIEJO"'],
        style: { 
          font: { color: { argb: 'FF7E5109' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDEBD0' } }
        }
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"ANDRES Jr."'],
        style: { 
          font: { color: { argb: 'FF512E5F' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF5EEF8' } }
        }
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"LOCAL"'],
        style: { 
          font: { color: { argb: 'FF424949' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE5E8E8' } }
        }
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"FERNANDO"'],
        style: { 
          font: { color: { argb: 'FF7B241C' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDEDEC' } }
        }
      }
    ]
  });

  // Add elegant conditional formatting for the FORMA DE PAGO column (G)
  worksheet.addConditionalFormatting({
    ref: 'G3:G1000',
    rules: [
      {
        type: 'cellIs', operator: 'equal', formulae: ['"NO PAGO"'],
        style: { 
          font: { color: { argb: 'FF922B21' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FADBD8' } }
        }
      }
    ]
  });

  // Summaries by Vendor
  const vendorColors = {
    'FREDY': { font: 'FF154360', fill: 'FFD4E6F1' },
    'JAIME': { font: 'FF145A32', fill: 'FFD5F5E3' },
    'VIEJO': { font: 'FF7E5109', fill: 'FFFDEBD0' },
    'ANDRES Jr.': { font: 'FF512E5F', fill: 'FFF5EEF8' },
    'LOCAL': { font: 'FF424949', fill: 'FFE5E8E8' },
    'FERNANDO': { font: 'FF7B241C', fill: 'FFFDEDEC' }
  };
  const vendors = ['FREDY', 'JAIME', 'VIEJO', 'ANDRES Jr.', 'LOCAL', 'FERNANDO'];
  const vendorTotalRows = [];
  
  vendors.forEach(v => {
    // Header for this vendor table
    const headRow = worksheet.getRow(currentRow);
    headRow.getCell('C').value = v;
    headRow.getCell('D').value = 'EFECTIVO';
    headRow.getCell('E').value = 'TRANSFERENCIA';
    headRow.getCell('F').value = 'TARJETA';
    headRow.getCell('G').value = 'NO PAGO';
    headRow.getCell('H').value = 'TOTAL';

    ['C','D','E','F','G','H'].forEach(col => {
      const cell = headRow.getCell(col);
      let fontColor = 'FF000000';
      let fillColor = 'FFA6A6A6';
      if (col === 'C') {
        fontColor = vendorColors[v].font;
        fillColor = vendorColors[v].fill;
      } else if (col === 'G') {
        fontColor = 'FF922B21';
        fillColor = 'FFFADBD8';
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      cell.font = { bold: true, color: { argb: fontColor } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });
    currentRow++;

    // Data for this vendor table
    const dataRow = worksheet.getRow(currentRow);
    const maxRow = (afternoonRange.end || morningRange.end || 3);
    const formulaBase = `SUMIFS(F3:F${maxRow}, H3:H${maxRow}, "${v}", G3:G${maxRow}, `;
    
    dataRow.getCell('D').value = { formula: formulaBase + '"EFECTIVO")' };
    dataRow.getCell('E').value = { formula: formulaBase + '"TRANSFERENCIA")' };
    dataRow.getCell('F').value = { formula: formulaBase + '"TARJETA")' };
    dataRow.getCell('G').value = { formula: formulaBase + '"NO PAGO")' };
    dataRow.getCell('H').value = { formula: `D${currentRow} + E${currentRow} + F${currentRow} + G${currentRow}` };
    
    vendorTotalRows.push(currentRow);

    ['C','D','E','F','G','H'].forEach(col => {
      const cell = dataRow.getCell(col);
      if(col !== 'C') cell.numFmt = currencyFmt;
      if (col === 'H') {
        cell.font = { bold: true };
      } else if (col === 'G') {
        cell.font = { bold: true, color: { argb: 'FF922B21' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFADBD8' } };
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });
    
    currentRow += 2;
  });

  // --- FINAL TOTAL VENDIDO POR TODOS ---
  const finalTotalRow = worksheet.getRow(currentRow);
  finalTotalRow.getCell('G').value = 'TOTAL VENDIDO';
  finalTotalRow.getCell('G').font = { bold: true, color: { argb: 'FFFFFFFF' } };
  finalTotalRow.getCell('G').alignment = { horizontal: 'center', vertical: 'middle' };
  finalTotalRow.getCell('G').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
  
  finalTotalRow.getCell('H').value = { formula: vendorTotalRows.map(r => `H${r}`).join('+') };
  finalTotalRow.getCell('H').font = { bold: true, color: { argb: 'FFFFFFFF' } };
  finalTotalRow.getCell('H').numFmt = currencyFmt;
  finalTotalRow.getCell('H').alignment = { horizontal: 'center', vertical: 'middle' };
  finalTotalRow.getCell('H').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
  finalTotalRow.getCell('H').border = borderThin;
  finalTotalRow.getCell('G').border = borderThin;

  currentRow += 3;



  // --- SECOND SHEET: BUSCADOR INTELIGENTE ---
  // ARCHITECTURE:
  //   • All sales written as STATIC VALUES in hidden rows 1000+ (same sheet).
  //   • ONE Excel FILTER formula in A7 spills results automatically.
  //   • C4 = Vendor selector  |  E4 = Payment selector.
  //   • Empty selector = show all. Works in Excel 365 / Excel 2019+.
  const searchSheet = workbook.addWorksheet('Buscador Inteligente');
  searchSheet.views = [{ showGridLines: false }];

  searchSheet.columns = [
    { width: 6  }, // A - No.
    { width: 35 }, // B - Nombre del Cliente
    { width: 20 }, // C - Teléfono
    { width: 12 }, // D - Hora
    { width: 45 }, // E - Detalle de Pedido
    { width: 15 }, // F - Total
    { width: 18 }, // G - Forma de Pago
    { width: 18 }, // H - Vendedor
  ];

  // ---- Row 1: Title ----
  searchSheet.mergeCells('A1:H1');
  const sTitle = searchSheet.getCell('A1');
  sTitle.value = '🔍 BUSCADOR INTELIGENTE DE VENTAS — Comedor Donde Flory';
  sTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  sTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  searchSheet.getRow(1).height = 30;

  // ---- Row 2: Instruction banner ----
  searchSheet.mergeCells('A2:H2');
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
    formulae: ['"FREDY,JAIME,VIEJO,ANDRES Jr.,LOCAL,OTROS,FERNANDO"']
  };
  vendorInput.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE066' } };
  vendorInput.border = borderThin;
  vendorInput.alignment = { horizontal: 'center', vertical: 'middle' };
  vendorInput.font   = { bold: true, size: 12 };

  const pagoInput = searchSheet.getCell('E4');
  pagoInput.dataValidation = {
    type: 'list', allowBlank: true, showErrorMessage: false,
    formulae: ['"EFECTIVO,TRANSFERENCIA,TARJETA,NO PAGO"']
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
  sHeader.values = ['No.', 'NOMBRE DEL CLIENTE', 'TELÉFONO', 'HORA', 'DETALLE DE PEDIDO', 'TOTAL', 'FORMA DE PAGO', 'VENDEDOR'];
  sHeader.height = 22;
  sHeader.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderThin;
  });

  // ---- Rows 1000+: ALL sales linked live to Sheet 1 (source for FILTER) ----
  const DATA_START = 1000;
  let dataRow = DATA_START;
  sales.forEach(sale => {
    const dr = searchSheet.getRow(dataRow);
    dr.getCell('A').value = { formula: `'Reporte de Ventas'!A${sale.excelRow}` };
    dr.getCell('B').value = { formula: `'Reporte de Ventas'!B${sale.excelRow}` };
    dr.getCell('C').value = { formula: `'Reporte de Ventas'!C${sale.excelRow}` };
    dr.getCell('D').value = { formula: `'Reporte de Ventas'!D${sale.excelRow}` };
    dr.getCell('E').value = { formula: `'Reporte de Ventas'!E${sale.excelRow}` };
    dr.getCell('F').value = { formula: `'Reporte de Ventas'!F${sale.excelRow}` };
    dr.getCell('G').value = { formula: `'Reporte de Ventas'!G${sale.excelRow}` };
    dr.getCell('H').value = { formula: `'Reporte de Ventas'!H${sale.excelRow}` };
    dr.hidden = true; // hide from view; INDEX/MATCH still reads them
    dataRow++;
  });
  const DATA_END = dataRow - 1;
  console.log('Adding formulas for Buscador Inteligente...');

  // ---- Row 7: INDEX/MATCH formulas for universal compatibility ----
  // FILTER() causes corruption in older Excel versions when exported by ExcelJS.
  // We use a helper column H to tag matching rows, and INDEX/MATCH to pull them up.
  searchSheet.getCell('J999').value = 0; // Base for MAX

  if (DATA_END >= DATA_START) {
    // 1. Helper column formulas in rows 1000+
    for (let i = DATA_START; i <= DATA_END; i++) {
      searchSheet.getCell(`J${i}`).value = { 
        formula: `IF(AND(OR($C$4="", H${i}=$C$4), OR($E$4="", G${i}=$E$4)), MAX($J$999:J${i-1})+1, "")` 
      };
    }

    // 2. Results formulas in rows 7 to 7 + sales.length
    const resultsEndRow = 7 + sales.length - 1;
    for (let i = 7; i <= resultsEndRow; i++) {
      const rowNumOffset = i - 6; // Row 7 is match #1
      ['A','B','C','D','E','F','G', 'H'].forEach(col => {
        const cell = searchSheet.getCell(`${col}${i}`);
        cell.value = { 
          formula: `IFERROR(INDEX(${col}$${DATA_START}:${col}$${DATA_END}, MATCH(${rowNumOffset}, $J$${DATA_START}:$J$${DATA_END}, 0)), "")` 
        };
        // Apply styling to results area
        if (col === 'F') cell.numFmt = currencyFmt;
        cell.border = borderThin;
        if (col !== 'B' && col !== 'E') cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }
  } else {
    searchSheet.getCell('A7').value = 'No hay ventas registradas.';
  }

  // Add elegant conditional formatting for the FORMA DE PAGO column (G) on Buscador Inteligente
  searchSheet.addConditionalFormatting({
    ref: 'G7:G1000',
    rules: [
      {
        type: 'cellIs', operator: 'equal', formulae: ['"NO PAGO"'],
        style: { 
          font: { color: { argb: 'FF922B21' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FADBD8' } }
        }
      }
    ]
  });

  // Export
  console.log('Generando buffer del archivo...');
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('Buffer generado exitosamente (Tamaño:', buffer.byteLength, 'bytes)');
    
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const fileName = `REPORTE_FLORY_${new Date().toISOString().split('T')[0]}.xlsx`;
    console.log('Disparando descarga:', fileName);
    
    saveAs(blob, fileName);
    console.log('✅ Exportación completada.');
    } catch (error) {
      console.error('❌ Error en el proceso de ExcelJS:', error);
      alert('Error al construir el libro de Excel: ' + error.message);
    }
  } catch (error) {
    console.error('❌ Error fatal en exportToExcel:', error);
    alert('No se pudo iniciar la exportación. Error: ' + error.message);
  }
}


  exportToExcel([{ id: 1, customerName: 'T', phone: '1', time: '10:00', pedido: 'x', total: 100, pago: 'EFECTIVO', vendedor: 'FREDY' }]).then(() => console.log('Done')).catch(console.error);
