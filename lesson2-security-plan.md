# Lesson 2 online practice — security and grade integration checklist

สถานะ: เอกสารเตรียมปรับระบบเท่านั้น **ยังไม่ได้ติดตั้งใน Google Apps Script และยังไม่พร้อมเปิดใช้งานกับนักเรียนจริง**

## ระบบปัจจุบัน
- GitHub entry: `volleyball-lesson2-online-practice.html`
- Apps Script Web App: `https://script.google.com/macros/s/AKfycbyPQK0WQ7b_0PSN1iSS684d2v4H1rZepGrtd-tsppNrztPjadsLX-XVC-CVxf0u9ksfvg/exec`
- Sandbox sheet: `1okEMeQQcBiLVZeYnackGR79NbztkmNYVuNs4xvp5-hc`, tab `L2_แบบฝึก_ทดลองใหม่`
- Central 29-item tracker: `1adKijoCiK1NYgq0sNdHhLZn19H225QkcLYKDWzjDpc8` — DO NOT WRITE during tests.

## Critical access-control issue
`l2Check(student)` and `l2Submit(student,answers)` currently identify a student using only name, class and number. An unrelated visitor can supply those same values to view prior answers and the answer key. Changing the deployment setting to **Anyone** does not authenticate students.

## Required backend changes BEFORE students use it
1. Add a server-side student authentication factor. Suggested: unique per-student one-time-issued access code, distributed privately by the teacher; store only a salted/peppered hash server-side in a private sheet, not in GitHub/HTML. Alternatively use verified Google Workspace school identity if deployment/account restrictions support it. Do not rely on a self-entered name/class/number.
2. On both `l2Check` and `l2Submit`, verify identity **server-side** before reading or returning any previous answer or key. Never send the complete answer key to clients before successful submission.
3. Keep `LockService` and one completed row per verified student per lesson; prevent repeat submission even if a browser is reloaded, another device is used, or calls are made directly to the endpoint.
4. Return answer key only for the authenticated student with a completed record; never return other students' data.
5. Enforce input length limits and validate class, number, all 10 answers and student roster membership server-side. Add rate limiting for access-code guesses and avoid revealing whether a particular student exists.
6. Keep the sandbox and central tracker separate. Test with fictional identities first. Central tracker should receive only the intended status/score fields, and only after mapping 29-item column headers and teacher approval.

## Acceptance tests
- [x] Sandbox: 10 answers required before submit
- [x] Sandbox: save and show answers after submit
- [x] Sandbox: same identity revisits and cannot submit again
- [ ] Security: a different user entering the same name/class/number cannot view the first user's answers
- [ ] Security: guessed/invalid access code is rejected without leaking answers
- [ ] Security: replayed submit cannot change a completed row
- [ ] Security: no keys exposed before authenticated submission
- [ ] Integration: grade tracker receives correct field only; unrelated grades unchanged
- [ ] Teacher approves public student use

Do not publish real student access until all unchecked security tests pass.
