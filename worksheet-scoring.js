(function () {
  const clean = value => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

  function questionScore(index, answer) {
    const text = clean(answer);
    if (text.length < 8) return 0;
    const item = Q[index];
    if (Array.isArray(item[2])) {
      const hits = item[2].filter(group => group.some(word => text.includes(clean(word)))).length;
      const ratio = hits / Math.max(1, item[2].length);
      return ratio >= 0.67 ? 1 : ratio >= 0.34 ? 0.5 : 0;
    }
    const terms = String(item[1] || '')
      .split(/[\s,./()→–—]+/)
      .map(clean)
      .filter(word => word.length >= 4);
    const unique = [...new Set(terms)];
    const hits = unique.filter(word => text.includes(word)).length;
    const ratio = hits / Math.max(1, Math.min(6, unique.length));
    return ratio >= 0.5 ? 1 : ratio >= 0.2 ? 0.5 : 0;
  }

  function calculate(prefix) {
    const earned = Q.reduce((sum, _, index) => sum + questionScore(index, v(prefix + index)), 0);
    return Math.round((earned / Q.length) * 100) / 10;
  }

  function addSummary() {
    const target = document.querySelector('.buttons');
    if (!target || document.getElementById('worksheetScore')) return;
    target.insertAdjacentHTML('beforebegin', '<div id="worksheetScore" class="done"></div>');
  }

  async function sendScore(stage, prefix) {
    const score = calculate(prefix);
    await fetch(WEB_APP_URL, {
      method: 'POST', mode: 'no-cors',
      headers: {'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({
        recordType: 'worksheet_score', worksheetStage: stage,
        stage: stage, topic: LESSON, lesson: LESSON,
        name: v('name'), classno: `${v('room')} เลขที่ ${v('no')}`,
        score: score,
        question: `[${LESSON}] สรุปคะแนนแบบฝึกหัด${stage === 'before' ? 'ครั้งแรก' : 'หลังแก้ไข'}`,
        answer: `${score}/10`
      })
    });
    return score;
  }

  addSummary();
  const originalBatch = batch;
  batch = async function (stage, prefix) {
    await originalBatch(stage, prefix);
    const score = await sendScore(stage, prefix);
    const panel = document.getElementById('worksheetScore');
    panel.style.display = 'block';
    panel.innerHTML = `<b>${stage === 'before' ? 'คะแนนครั้งแรก' : 'คะแนนหลังแก้ไข'}: ${score}/10</b><p>เป็นผลประเมินสาระสำคัญเบื้องต้น ครูสามารถตรวจรายละเอียดคำตอบเพิ่มเติมได้</p>`;
  };

  const originalFeedback = showFeedback;
  showFeedback = function () {
    originalFeedback();
    Q.forEach((_, index) => {
      const score = questionScore(index, v('a' + index));
      const feedback = document.getElementById('f' + index);
      if (feedback && !feedback.querySelector('.auto-score')) {
        const label = score === 1 ? 'ครบสาระสำคัญ' : score === 0.5 ? 'ถูกบางส่วน ควรเพิ่มเติม' : 'ควรทบทวนและแก้ไข';
        feedback.insertAdjacentHTML('afterbegin', `<p class="auto-score"><b>ผลประเมินเบื้องต้น: ${label}</b></p>`);
      }
    });
  };
})();
