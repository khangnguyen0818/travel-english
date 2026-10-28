// Phát âm (Text-to-Speech), ghi âm (MediaRecorder), nhận dạng giọng nói & chấm điểm
const Speech = (() => {
  let voices = [];
  const hasTTS = 'speechSynthesis' in window;

  function loadVoices() { voices = hasTTS ? speechSynthesis.getVoices() : []; }
  if (hasTTS) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  const langOf = v => (v.lang || '').replace('_', '-');

  function englishVoices(lang) {
    return voices.filter(v => langOf(v) === lang);
  }

  function pickVoice(lang) {
    const s = Store.state.settings;
    const wanted = lang === 'en-GB' ? s.voiceUK : s.voiceUS;
    const list = englishVoices(lang);
    return list.find(v => v.voiceURI === wanted)
      || list.find(v => /natural|neural|premium|enhanced|google/i.test(v.name))
      || list[0]
      || voices.find(v => langOf(v).startsWith('en'));
  }

  function speak(text, opts = {}) {
    return new Promise(resolve => {
      if (!hasTTS) { resolve(); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const lang = opts.lang || Store.state.settings.accent;
      u.lang = lang;
      const v = pickVoice(lang);
      if (v) u.voice = v;
      u.rate = opts.rate || Store.state.settings.rate;
      u.pitch = opts.pitch || 1;
      let finished = false;
      const end = () => { if (!finished) { finished = true; resolve(); } };
      u.onend = end; u.onerror = end;
      // Một số trình duyệt không gọi onend: hẹn giờ dự phòng
      setTimeout(end, 1500 + text.length * 120 / u.rate);
      speechSynthesis.speak(u);
    });
  }

  function stopSpeaking() { if (hasTTS) speechSynthesis.cancel(); }

  // ---------- Nhận dạng giọng nói ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;

  function canRecognize() { return !!SR; }

  function recognize(lang = 'en-US') {
    return new Promise((resolve, reject) => {
      if (!SR) { reject('not-supported'); return; }
      stopSpeaking();
      rec = new SR();
      rec.lang = lang;
      rec.interimResults = false;
      rec.maxAlternatives = 5;
      rec.continuous = false;
      let done = false;
      rec.onresult = e => {
        done = true;
        resolve([...e.results[0]].map(a => a.transcript));
      };
      rec.onerror = e => { if (!done) { done = true; reject(e.error || 'error'); } };
      rec.onend = () => { if (!done) { done = true; resolve([]); } };
      try { rec.start(); } catch (err) { done = true; reject('busy'); }
    });
  }

  function stopRecognize() { if (rec) try { rec.stop(); } catch (e) {} }

  // ---------- Ghi âm giọng người học ----------
  let recorder = null, chunks = [];

  function canRecord() { return !!(navigator.mediaDevices && window.MediaRecorder); }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.start();
  }

  function stopRecording() {
    return new Promise(resolve => {
      if (!recorder || recorder.state === 'inactive') { resolve(null); return; }
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach(t => t.stop());
        resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.stop();
    });
  }

  function isRecording() { return !!recorder && recorder.state === 'recording'; }

  // ---------- Chấm điểm ----------
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function numToWords(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n > 9999) return String(n);
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
    if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
    return numToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
  }

  const CONTRACTIONS = {
    "i'm": 'i am', "i'd": 'i would', "i'll": 'i will', "i've": 'i have', "you're": 'you are', "you'll": 'you will',
    "you've": 'you have', "you'd": 'you would', "it's": 'it is', "that's": 'that is', "there's": 'there is',
    "here's": 'here is', "what's": 'what is', "where's": 'where is', "how's": 'how is', "let's": 'let us',
    "we're": 'we are', "we'll": 'we will', "we've": 'we have', "they're": 'they are', "he's": 'he is', "she's": 'she is',
    "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'can not', "cannot": 'can not',
    "won't": 'will not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "couldn't": 'could not',
    "wouldn't": 'would not', "shouldn't": 'should not', "haven't": 'have not', "o'clock": 'oclock'
  };

  function normalize(s) {
    return s.toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/\$(\d+)/g, '$1 dollars')
      .replace(/(\d+)%/g, '$1 percent')
      .replace(/(\d+)(st|nd|rd|th)\b/g, '$1')
      .replace(/[^a-z0-9' ]+/g, ' ')
      .split(/\s+/).filter(Boolean)
      .map(w => CONTRACTIONS[w] || (/^\d+$/.test(w) ? numToWords(w) : w.replace(/^'+|'+$/g, '')))
      .join(' ').split(' ').filter(Boolean);
  }

  function lev(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }

  const sim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);

  // Căn chỉnh từ mục tiêu với từ nghe được -> nhãn g (đúng) / y (gần đúng) / r (sai, thiếu)
  function align(target, heard) {
    const m = target.length, n = heard.length;
    const cost = (i, j) => { const s = sim(target[i], heard[j]); return s === 1 ? 0 : s >= 0.5 ? 0.6 : 1; };
    const d = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) d[i][0] = i;
    for (let j = 1; j <= n; j++) d[0][j] = j * 0.7;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 0.7, d[i - 1][j - 1] + cost(i - 1, j - 1));
    const labels = Array(m).fill('r');
    let i = m, j = n, extra = 0;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && Math.abs(d[i][j] - (d[i - 1][j - 1] + cost(i - 1, j - 1))) < 1e-9) {
        const s = sim(target[i - 1], heard[j - 1]);
        labels[i - 1] = s === 1 ? 'g' : s >= 0.5 ? 'y' : 'r';
        i--; j--;
      } else if (i > 0 && Math.abs(d[i][j] - (d[i - 1][j] + 1)) < 1e-9) {
        labels[i - 1] = 'r'; i--;
      } else { extra++; j--; }
    }
    return { labels, extra };
  }

  // So sánh câu mẫu với các phương án nhận dạng, chọn phương án tốt nhất
  function score(targetText, alternatives) {
    const tokens = targetText.split(/\s+/).filter(Boolean);
    const parts = tokens.map(t => normalize(t));
    const flat = [], owner = [];
    parts.forEach((p, k) => p.forEach(w => { flat.push(w); owner.push(k); }));
    let best = null;
    for (const alt of (alternatives.length ? alternatives : [''])) {
      const heard = normalize(alt);
      const { labels, extra } = align(flat, heard);
      const pts = labels.reduce((s, l) => s + (l === 'g' ? 1 : l === 'y' ? 0.5 : 0), 0);
      const value = Math.max(0, Math.round((pts - extra * 0.25) / Math.max(flat.length, 1) * 100));
      if (!best || value > best.score) best = { score: value, labels, heard: alt };
    }
    // Gộp nhãn về từng từ gốc (ví dụ "I'd" = "i would")
    const rank = { g: 0, y: 1, r: 2 };
    const words = tokens.map((t, k) => {
      const ls = best.labels.filter((_, idx) => owner[idx] === k);
      const worst = ls.reduce((a, b) => (rank[b] > rank[a] ? b : a), 'g');
      return { text: t, label: ls.length ? worst : 'g' };
    });
    return { score: best.score, words, heard: best.heard };
  }

  function feedback(result) {
    const bad = result.words.filter(w => w.label !== 'g').map(w => w.text.replace(/[.,!?]/g, ''));
    if (result.score >= 90) return 'Tuyệt vời! Phát âm rất rõ ràng 👏';
    if (result.score >= 75) return 'Khá tốt! Chú ý thêm: ' + bad.slice(0, 4).join(', ');
    if (result.score >= 50) return 'Tạm được. Nghe lại ở tốc độ chậm và luyện các từ: ' + bad.slice(0, 5).join(', ');
    return 'Hãy nghe mẫu chậm (🐢), nói chậm và rõ từng từ, đặc biệt âm cuối.';
  }

  return {
    speak, stopSpeaking, englishVoices, hasTTS,
    canRecognize, recognize, stopRecognize,
    canRecord, startRecording, stopRecording, isRecording,
    score, feedback, normalize, sim
  };
})();
