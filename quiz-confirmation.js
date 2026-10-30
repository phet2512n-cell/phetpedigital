/* Quiz status check for the staged volleyball pages. Requires matching Apps Script doGet handler. */
function quizStatus(classroom, number, quizType) {
  return new Promise((resolve, reject) => {
    const callback = 'quizStatus_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    let finished = false;
    const cleanup = () => { delete window[callback]; script.remove(); clearTimeout(timer); };
    const timer = setTimeout(() => { if (!finished) { finished=true; cleanup(); reject(new Error('หมดเวลาตรวจสอบสถานะ')); } }, 12000);
    window[callback] = data => { if (finished) return; finished=true; cleanup(); if (!data || data.success !== true) reject(new Error('ตรวจสอบสถานะไม่ได้')); else resolve(data.submitted === true); };
    script.onerror = () => { if (!finished) { finished=true; cleanup(); reject(new Error('เชื่อมต่อระบบตรวจสอบไม่ได้')); } };
    script.src = (typeof WEB_APP_URL !== 'undefined' ? WEB_APP_URL : URL) + '?action=quizStatus&class=' + encodeURIComponent(classroom) + '&no=' + encodeURIComponent(number) + '&quizType=' + encodeURIComponent(quizType) + '&callback=' + encodeURIComponent(callback);
    document.head.appendChild(script);
  });
}
