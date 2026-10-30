// STAGED ONLY — NOT YET ADDED TO APPS SCRIPT.
// Add the following two lines at the beginning of the existing doGet function,
// before its existing return HtmlService statement:
//
// if (e && e.parameter && e.parameter.action === 'quizStatus') {
//   return getVolleyballQuizStatus_(e.parameter);
// }
//
// Then add the function below to รหัส.gs. Do not replace doPost or the teacher page.
// This exposes only whether a class/number has submitted; no names, answers or scores.
function getVolleyballQuizStatus_(p) {
  const cb = String(p.callback || '');
  if (!/^quizStatus_[A-Za-z0-9_]+$/.test(cb)) {
    return ContentService.createTextOutput('/* invalid callback */')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  const names = {
    'lesson1-pre': 'แบบทดสอบก่อนเรียน แผนที่ 1',
    'lesson1-post': 'แบบทดสอบหลังเรียน แผนที่ 1',
    'lesson2-pre': 'แบบทดสอบก่อนเรียน แผนที่ 2',
    'lesson2-post': 'แบบทดสอบหลังเรียน แผนที่ 2'
  };
  let output = {success:false};
  try {
    const sheetName = names[String(p.quizType || '')];
    const cls = String(p.class || '').trim();
    const no = String(p.no || '').trim();
    if (!sheetName || !/^ม\.3\/[1-6]$/.test(cls) || !/^(?:[1-9]|[1-4][0-9]|50)$/.test(no)) {
      throw new Error('Invalid quiz query');
    }
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error('Quiz sheet unavailable');
    const last = sheet.getLastRow();
    const rows = last > 1 ? sheet.getRange(2,2,last-1,2).getDisplayValues() : [];
    output = {success:true,submitted:rows.some(r => String(r[0]).trim() === cls && String(r[1]).trim() === no)};
  } catch (err) {
    console.error('Quiz status query failed: ' + err);
  }
  return ContentService.createTextOutput(cb + '(' + JSON.stringify(output) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// IMPORTANT: Verify the four sheet names against the actual Google Sheets
// before deployment. The frontend is staged on a separate GitHub branch.
// Test the status endpoint and all four pages before merging or publishing.
// Public class/number submission status is visible to anyone who can call this URL.
