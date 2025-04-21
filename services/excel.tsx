import * as XLSX from 'xlsx';

interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export const jsonToExcel = (data: any[], columns: ExcelColumn[], filename: string) => {
  try {
    // Map data to match column keys and headers
    const formattedData = data.map(item => {
      const row: any = {};
      columns.forEach(col => {
        row[col.header] = item[col.key];
      });
      return row;
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedData, {
      header: columns.map(col => col.header)
    });

    // Set column widths if specified
    if (ws['!cols'] === undefined) {
      ws['!cols'] = [];
    }
    columns.forEach((col, index) => {
      if (col.width) {
        ws['!cols']![index] = { width: col.width };
      }
    });

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw error;
  }
};