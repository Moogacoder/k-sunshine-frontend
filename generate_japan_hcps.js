import XLSX from 'xlsx';

const surnames = ['Yamada', 'Sato', 'Tanaka', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Nakamura', 'Kobayashi', 'Yamamoto', 'Kato', 'Yoshida', 'Yamaguchi', 'Saito', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki'];
const kanjiSurnames = ['山田', '佐藤', '田中', '鈴木', '高橋', '渡辺', '伊藤', '中村', '小林', '山本', '加藤', '吉田', '山口', '斉藤', '松本', '井上', '木村', '林', '清水', '山崎'];

const givenNames = ['Taro', 'Kenji', 'Yoko', 'Ichiro', 'Hiroshi', 'Naoki', 'Kazuo', 'Shinji', 'Keiko', 'Ayumi', 'Takeshi', 'Masahiro', 'Yoshio', 'Takashi', 'Ryu', 'Satoshi', 'Jun', 'Mari', 'Miho', 'Koji'];
const kanjiGivenNames = ['太郎', '健二', '陽子', '一郎', '寛', '直樹', '和夫', '慎二', '恵子', '歩', '武', '雅弘', '吉雄', '隆', '竜', '聡', '淳', '真理', '美穂', '浩二'];

const specialties = ['Oncology', 'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Endocrinology', 'Dermatology', 'Gastroenterology', 'Ophthalmology', 'Psychiatry'];

const hospitals = [
  'Tokyo University Hospital', 'Kyoto University Hospital', 'Osaka General Medical Center', 
  'Hokkaido University Hospital', 'Tohoku University Hospital', 'Nagoya University Hospital',
  'Kyushu University Hospital', 'Kobe University Hospital', 'Hiroshima Citizens Hospital', 'Keio University Hospital'
];

const places = ['Tokyo', 'Osaka', 'Kyoto', 'Nagoya', 'Fukuoka', 'Sapporo', 'Sendai', 'Hiroshima', 'Yokohama', 'Kobe'];

const headers = [
  'Recipient Type', 'Recipient Name', 'License Number', 
  'Workplace', 'Specialty', 'Category of Benefit', 
  'Date of Provision', 'Place', 'Purpose', 'Details', 'Amount (JPY)'
];

// Helper to generate a random date in FY2025 (April 2025 - March 2026)
function getRandomDate() {
  const start = new Date('2025-04-01').getTime();
  const end = new Date('2026-03-31').getTime();
  const date = new Date(start + Math.random() * (end - start));
  
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const sampleData = [];

for (let i = 0; i < 100; i++) {
  const nameIdx = Math.floor(Math.random() * surnames.length);
  const givenIdx = Math.floor(Math.random() * givenNames.length);
  const specialtyIdx = Math.floor(Math.random() * specialties.length);
  const hospIdx = Math.floor(Math.random() * hospitals.length);
  const placeIdx = Math.floor(Math.random() * places.length);
  
  const name = `Dr. ${surnames[nameIdx]} ${givenNames[givenIdx]} (${kanjiSurnames[nameIdx]} ${kanjiGivenNames[givenIdx]})`;
  const license = `JP-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const workplace = hospitals[hospIdx];
  const specialty = specialties[specialtyIdx];
  const place = places[placeIdx];
  const date = getRandomDate();
  
  // Distribute categories
  // 40% LECTURE_FEES, 20% RESEARCH_DEV, 15% ACADEMIC_DONATION, 10% PROMOTIONAL_INFO, 15% OTHER_MEALS
  const roll = Math.random();
  let category = '';
  let amount = 0;
  let purpose = '';
  let details = '';
  
  if (roll < 0.40) {
    category = 'LECTURE_FEES';
    amount = (Math.floor(Math.random() * 13) + 3) * 10000; // 30,000 to 150,000 JPY
    purpose = 'JPMA Scientific Symposium Lecture';
    details = 'Speaker Honorarium';
  } else if (roll < 0.60) {
    category = 'RESEARCH_DEV';
    amount = (Math.floor(Math.random() * 51) + 10) * 50000; // 500,000 to 3,000,000 JPY
    purpose = 'Oncology Phase III Clinical Trial Research';
    details = 'Research and Development Funding';
  } else if (roll < 0.75) {
    category = 'ACADEMIC_DONATION';
    amount = (Math.floor(Math.random() * 15) + 1) * 100000; // 100,000 to 1,500,000 JPY
    purpose = 'Medical Department Academic Research Support';
    details = 'Educational Grant Donation';
  } else if (roll < 0.85) {
    category = 'PROMOTIONAL_INFO';
    amount = (Math.floor(Math.random() * 27) + 4) * 500; // 2,000 to 15,000 JPY
    purpose = 'Medical Information Dissemination Material';
    details = 'Product Brochure and Scientific Journals';
  } else {
    category = 'OTHER_MEALS';
    amount = (Math.floor(Math.random() * 17) + 3) * 1000; // 3,000 to 19,000 JPY (keep realistic)
    purpose = 'Advisory Board Post-Seminar Dinner';
    details = 'HCP Meal Hospitality';
  }
  
  sampleData.push({
    'Recipient Type': 'HCP',
    'Recipient Name': name,
    'License Number': license,
    'Workplace': workplace,
    'Specialty': specialty,
    'Category of Benefit': category,
    'Date of Provision': date,
    'Place': place,
    'Purpose': purpose,
    'Details': details,
    'Amount (JPY)': amount
  });
}

const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Japan Transparency Data');
XLSX.writeFile(workbook, 'japan_100_hcps.xlsx');

console.log("Successfully generated 100 Japan HCP spend records into 'japan_100_hcps.xlsx'.");
