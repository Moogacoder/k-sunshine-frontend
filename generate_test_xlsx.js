import XLSX from 'xlsx';

const headers = [
  'Recipient Type', 'Recipient Name', 'License Number', 
  'Workplace', 'Specialty', 'Category of Benefit', 
  'Date of Provision', 'Place', 'Purpose', 'Details', 'Amount (JPY)'
];

const sampleData = [{
  'Recipient Type': 'HCP',
  'Recipient Name': 'Dr. Taro Yamada (山田 太郎)',
  'License Number': 'JP-8849201',
  'Workplace': 'Tokyo University Hospital',
  'Specialty': 'Oncology',
  'Category of Benefit': 'LECTURE_FEES',
  'Date of Provision': '2026-03-22',
  'Place': 'Tokyo',
  'Purpose': 'JPMA Oncology Symposium Lecture',
  'Details': 'Speaker Fee',
  'Amount (JPY)': 50000
}, {
  'Recipient Type': 'HCO',
  'Recipient Name': 'Japan Cancer Association',
  'License Number': 'JP-1192834',
  'Workplace': 'Association Office',
  'Specialty': '',
  'Category of Benefit': 'ACADEMIC_DONATION',
  'Date of Provision': '2026-04-10',
  'Place': 'Kyoto',
  'Purpose': 'Annual JCA Meeting Support',
  'Details': 'Donation',
  'Amount (JPY)': 1000000
}];

const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporting Template');
XLSX.writeFile(workbook, 'japan_test.xlsx');
console.log("japan_test.xlsx generated successfully.");
