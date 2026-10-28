// Lưu tiến độ học trên máy (localStorage) + xuất/nhập file sao lưu
const Store = (() => {
  const KEY = 'traveltalk-v1';
  const defaults = () => ({
    settings: { accent: 'en-US', rate: 0.9, theme: 'auto', size: 'normal', goal: 20, showVi: true, voiceUS: '', voiceUK: '' },
    savedLines: {},   // id -> {en, vi, ipa, ref}
    savedWords: {},   // vocabId -> true
    scores: {},       // text -> [điểm gần nhất...]
    srs: {},          // vocabId -> {ef, n, int, due}
    done: {},         // situationId -> điểm bài tập
    drafts: {},       // writingId -> nội dung
    streak: { count: 0, last: '' },
    today: { date: '', actions: 0 },
    stats: { spoken: 0, recorded: 0 }
  });

  let state = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const d = defaults();
    state = Object.assign(d, raw);
    state.settings = Object.assign(d.settings, raw.settings || {});
    state.stats = Object.assign(d.stats, raw.stats || {});
  } catch (e) { /* bộ nhớ bị chặn: dùng mặc định */ }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function dayStr(d = new Date()) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Ghi nhận 1 hoạt động học: cập nhật mục tiêu ngày & chuỗi ngày học
  function activity(n = 1) {
    const today = dayStr();
    if (state.today.date !== today) state.today = { date: today, actions: 0 };
    state.today.actions += n;
    if (state.streak.last !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      state.streak.count = state.streak.last === dayStr(y) ? state.streak.count + 1 : 1;
      state.streak.last = today;
    }
    save();
  }

  function todayActions() {
    return state.today.date === dayStr() ? state.today.actions : 0;
  }

  function streak() {
    const y = new Date(); y.setDate(y.getDate() - 1);
    return (state.streak.last === dayStr() || state.streak.last === dayStr(y)) ? state.streak.count : 0;
  }

  function addScore(text, score) {
    const arr = state.scores[text] || [];
    arr.push(score);
    state.scores[text] = arr.slice(-10);
    state.stats.spoken++;
    activity();
  }

  function avgScore() {
    const all = Object.values(state.scores).map(a => a[a.length - 1]);
    return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
  }

  function exportFile() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'traveltalk-backup-' + dayStr() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function importText(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !data.settings) throw new Error('File không hợp lệ');
    const d = defaults();
    state = Object.assign(d, data);
    state.settings = Object.assign(d.settings, data.settings);
    save();
  }

  function reset() { state = defaults(); save(); }

  return {
    get state() { return state; },
    save, activity, todayActions, streak, addScore, avgScore, exportFile, importText, reset, dayStr
  };
})();
