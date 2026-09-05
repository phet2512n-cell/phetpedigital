/**
 * PE Digital Learning Center — ระบบคะแนนก่อน/หลังเรียน 4 เรื่อง
 * รองรับข้อมูลเดิมจากแบบทดสอบ ม.2/2 และแบบฝึกหัดเดิม
 */

const SCORE_SHEET_NAME = 'คะแนนก่อนหลัง';
const LOG_SHEET_NAME = 'คำตอบนักเรียน';
const WORKSHEET_SHEET_NAME = 'คะแนนแบบฝึกหัด';
const SCORE_HEADERS = [
  'วันเวลาอัปเดต', 'ชื่อ-สกุล', 'ชั้น/เลขที่',
  'ก่อน-กระโดดสูง', 'หลัง-กระโดดสูง',
  'ก่อน-กระโดดไกล', 'หลัง-กระโดดไกล',
  'ก่อน-ขว้างจักร', 'หลัง-ขว้างจักร',
  'ก่อน-ทุ่มน้ำหนัก', 'หลัง-ทุ่มน้ำหนัก',
  'รวมก่อนเรียน /40', 'รวมหลังเรียน /40', 'พัฒนาการ'
];

function doGet(e) {
  if (e && e.parameter && e.parameter.admin === '1') {
    return HtmlService.createHtmlOutputFromFile('admin')
      .setTitle('PE Digital - ควบคุมการสอบ');
  }
  return json_({ok:true, message:'PE Digital score backend is ready.'});
}

function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('ACCEPTING_RESPONSES') === 'false') {
    return json_({ok:false, error:'ปิดรับคำตอบแล้ว'});
  }
  try {
    const data = parsePayload_(e);
    const ss = getOrCreateSpreadsheet_();
    appendLog_(ss, data);

    const assessment = normalizeAssessment_(data);
    if (assessment) upsertScore_(ss, assessment);

    const worksheet = normalizeWorksheet_(data);
    if (worksheet) upsertWorksheetScore_(ss, worksheet);

    return json_({ok:true});
  } catch (err) {
    return json_({ok:false, error:String(err)});
  }
}

function normalizeWorksheet_(data) {
  if (String(data.recordType || '') !== 'worksheet_score') return null;
  const topic = String(data.topic || data.lesson || '').trim();
  const stage = String(data.worksheetStage || data.stage || '').toLowerCase();
  const score = Number(data.score);
  const allowedTopics = ['กระโดดสูง','กระโดดไกล','ขว้างจักร','ทุ่มน้ำหนัก'];
  if (!allowedTopics.includes(topic) || !['before','after'].includes(stage) || !Number.isFinite(score)) return null;
  return {
    name:String(data.name || '').trim(),
    classno:String(data.classno || '').trim(),
    topic,
    stage,
    score:Math.max(0, Math.min(10, score))
  };
}

function upsertWorksheetScore_(ss, item) {
  let sh = ss.getSheetByName(WORKSHEET_SHEET_NAME);
  if (!sh) sh = ss.insertSheet(WORKSHEET_SHEET_NAME);
  const headers = [
    'วันเวลาอัปเดต','ชื่อ-สกุล','ชั้น/เลขที่',
    'ครั้งแรก-กระโดดสูง /10','หลังแก้-กระโดดสูง /10','พัฒนา-กระโดดสูง',
    'ครั้งแรก-กระโดดไกล /10','หลังแก้-กระโดดไกล /10','พัฒนา-กระโดดไกล',
    'ครั้งแรก-ขว้างจักร /10','หลังแก้-ขว้างจักร /10','พัฒนา-ขว้างจักร',
    'ครั้งแรก-ทุ่มน้ำหนัก /10','หลังแก้-ทุ่มน้ำหนัก /10','พัฒนา-ทุ่มน้ำหนัก',
    'รวมครั้งแรก /40','รวมหลังแก้ /40','พัฒนาการรวม','สถานะ'
  ];
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }

  const lastRow = sh.getLastRow();
  let row = lastRow + 1;
  if (lastRow >= 2) {
    const identities = sh.getRange(2, 2, lastRow - 1, 2).getDisplayValues();
    const found = identities.findIndex(r => r[0].trim() === item.name && r[1].trim() === item.classno);
    if (found >= 0) row = found + 2;
  }
  if (row > lastRow) sh.getRange(row, 2, 1, 2).setValues([[item.name, item.classno]]);

  const map = {
    'before|กระโดดสูง':4, 'after|กระโดดสูง':5,
    'before|กระโดดไกล':7, 'after|กระโดดไกล':8,
    'before|ขว้างจักร':10, 'after|ขว้างจักร':11,
    'before|ทุ่มน้ำหนัก':13, 'after|ทุ่มน้ำหนัก':14
  };
  sh.getRange(row, 1).setValue(new Date());
  sh.getRange(row, map[item.stage + '|' + item.topic]).setValue(item.score);
  [6,9,12,15].forEach((col, i) => {
    const beforeCol = 4 + (i * 3);
    sh.getRange(row, col).setFormula(`=IF(OR(${columnLetter_(beforeCol)}${row}="",${columnLetter_(beforeCol+1)}${row}=""),"",${columnLetter_(beforeCol+1)}${row}-${columnLetter_(beforeCol)}${row})`);
  });
  sh.getRange(row, 16).setFormula(`=SUM(D${row},G${row},J${row},M${row})`);
  sh.getRange(row, 17).setFormula(`=SUM(E${row},H${row},K${row},N${row})`);
  sh.getRange(row, 18).setFormula(`=Q${row}-P${row}`);
  sh.getRange(row, 19).setFormula(`=IF(COUNT(E${row},H${row},K${row},N${row})<4,"ยังไม่ครบ",IF(Q${row}>=32,"ผ่านเกณฑ์","ควรแก้ไข"))`);
}

function columnLetter_(column) {
  let result = '';
  while (column > 0) {
    column--;
    result = String.fromCharCode(65 + (column % 26)) + result;
    column = Math.floor(column / 26);
  }
  return result;
}

function parsePayload_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  if (raw) {
    try { return JSON.parse(raw); } catch (ignore) {}
  }
  return e && e.parameter ? e.parameter : {};
}

function normalizeAssessment_(data) {
  let topic = String(data.topic || '').trim();
  let testType = String(data.testType || '').toLowerCase();
  let score = Number(data.score);
  const question = String(data.question || '');
  const answer = String(data.answer || '');

  // รองรับแบบทดสอบหลังเรียนเดิมที่ส่ง stage=แบบทดสอบ
  if (!topic) {
    const found = question.match(/\[(กระโดดสูง|กระโดดไกล|ขว้างจักร|ทุ่มน้ำหนัก)\]/);
    if (found) topic = found[1];
  }
  if (!testType && String(data.stage || '') === 'แบบทดสอบ') testType = 'posttest';
  if (!testType && String(data.stage || '') === 'ก่อนเรียน') testType = 'pretest';
  if (!testType && String(data.stage || '') === 'หลังเรียน') testType = 'posttest';
  if (!Number.isFinite(score)) {
    const foundScore = answer.match(/(\d+)\s*\/\s*10/);
    if (foundScore) score = Number(foundScore[1]);
  }

  const allowedTopics = ['กระโดดสูง','กระโดดไกล','ขว้างจักร','ทุ่มน้ำหนัก'];
  if (!allowedTopics.includes(topic) || !['pretest','posttest'].includes(testType) || !Number.isFinite(score)) return null;
  return {
    name:String(data.name || '').trim(),
    classno:String(data.classno || '').trim(),
    topic,
    testType,
    score:Math.max(0, Math.min(10, score))
  };
}

function appendLog_(ss, data) {
  let sh = ss.getSheetByName(LOG_SHEET_NAME);
  if (!sh) sh = ss.insertSheet(LOG_SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['วันเวลา','ช่วงคำตอบ','ชื่อ-สกุล','ชั้น/เลขที่','บทเรียน','คำถาม','คำตอบนักเรียน']);
    sh.setFrozenRows(1);
  }
  sh.appendRow([
    new Date(), data.stage || data.testType || '', data.name || '', data.classno || '',
    data.lesson || data.topic || '', data.question || '', data.answer || ''
  ]);
}

function upsertScore_(ss, item) {
  let sh = ss.getSheetByName(SCORE_SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SCORE_SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(SCORE_HEADERS);
    sh.setFrozenRows(1);
  }

  const lastRow = sh.getLastRow();
  let row = lastRow + 1;
  if (lastRow >= 2) {
    const identities = sh.getRange(2, 2, lastRow - 1, 2).getDisplayValues();
    const found = identities.findIndex(r => r[0].trim() === item.name && r[1].trim() === item.classno);
    if (found >= 0) row = found + 2;
  }
  if (row > lastRow) sh.getRange(row, 2, 1, 2).setValues([[item.name, item.classno]]);

  const columnMap = {
    'pretest|กระโดดสูง':4, 'posttest|กระโดดสูง':5,
    'pretest|กระโดดไกล':6, 'posttest|กระโดดไกล':7,
    'pretest|ขว้างจักร':8, 'posttest|ขว้างจักร':9,
    'pretest|ทุ่มน้ำหนัก':10, 'posttest|ทุ่มน้ำหนัก':11
  };
  sh.getRange(row, 1).setValue(new Date());
  sh.getRange(row, columnMap[item.testType + '|' + item.topic]).setValue(item.score);
  sh.getRange(row, 12).setFormula(`=SUM(D${row},F${row},H${row},J${row})`);
  sh.getRange(row, 13).setFormula(`=SUM(E${row},G${row},I${row},K${row})`);
  sh.getRange(row, 14).setFormula(`=M${row}-L${row}`);
}

function getOrCreateSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  // ใช้ SHEET_ID เดิมก่อน เพื่อให้คะแนนใหม่ต่อใน Google Sheet เดิมของครู
  let id = props.getProperty('SHEET_ID') || props.getProperty('PE_DIGITAL_SHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); }
    catch (e) {
      props.deleteProperty('SHEET_ID');
      props.deleteProperty('PE_DIGITAL_SHEET_ID');
    }
  }
  const ss = SpreadsheetApp.create('PE_Digital_ผลการเรียนรู้_กรีฑาประเภทลาน');
  props.setProperty('SHEET_ID', ss.getId());
  props.setProperty('PE_DIGITAL_SHEET_ID', ss.getId());
  return ss;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
