const ExcelJS = require('exceljs');

async function createTestFile() {
    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;

    const worksheet = workbook.addWorksheet('Reporte de Ventas');
    const searchSheet = workbook.addWorksheet('Buscador Inteligente');

    worksheet.getCell('A1').value = 'No.';
    worksheet.getCell('F1').value = 'PAGO';
    worksheet.getCell('G1').value = 'VENDEDOR';
    worksheet.getCell('H1').value = 'HELPER';

    worksheet.getCell('H2').value = 0;

    worksheet.getCell('A3').value = 1;
    worksheet.getCell('F3').value = 'EFECTIVO';
    worksheet.getCell('G3').value = 'FREDY';
    worksheet.getCell('H3').value = { formula: `IF(AND(OR('Buscador Inteligente'!$B$5="", G3='Buscador Inteligente'!$B$5), OR('Buscador Inteligente'!$D$5="", F3='Buscador Inteligente'!$D$5), A3<>""), MAX($H$2:H2)+1, "")` };

    worksheet.getCell('A4').value = 2;
    worksheet.getCell('F4').value = 'TARJETA';
    worksheet.getCell('G4').value = 'JAIME';
    worksheet.getCell('H4').value = { formula: `IF(AND(OR('Buscador Inteligente'!$B$5="", G4='Buscador Inteligente'!$B$5), OR('Buscador Inteligente'!$D$5="", F4='Buscador Inteligente'!$D$5), A4<>""), MAX($H$2:H3)+1, "")` };

    searchSheet.getCell('B5').value = 'FREDY';
    searchSheet.getCell('D5').value = 'EFECTIVO';

    searchSheet.getCell('A9').value = { formula: `IFERROR(INDEX('Reporte de Ventas'!A$1:A$1000, MATCH(1, 'Reporte de Ventas'!$H$1:$H$1000, 0)), "")` };
    searchSheet.getCell('F9').value = { formula: `IFERROR(INDEX('Reporte de Ventas'!F$1:F$1000, MATCH(1, 'Reporte de Ventas'!$H$1:$H$1000, 0)), "")` };

    await workbook.xlsx.writeFile('test_output.xlsx');
    console.log('File written to test_output.xlsx');
}

createTestFile().catch(console.error);
