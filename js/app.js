// TravelTalk – giao diện & điều hướng
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

let view = $('#view');
let run = 0; // tăng lên để dừng các chuỗi phát âm đang chạy (nghe cả bài, nhập vai, shadowing)

// ================= Dữ liệu =================
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Không tải được ' + url);
  return r.json();
}
const Data = {
  _topics: null, _topicFiles: {}, _vocab: null, _survival: null,
  async topics() { return this._topics || (this._topics = await fetchJSON('data/topics.json')); },
  async topic(id) { return this._topicFiles[id] || (this._topicFiles[id] = await fetchJSON(`data/topics/${id}.json`)); },
  async readyTopics() { return (await this.topics()).filter(t => t.ready); },
  async allTopicFiles() { return Promise.all((await this.readyTopics()).map(t => this.topic(t.id))); },
  async vocab() { return this._vocab || (this._vocab = await fetchJSON('data/vocab.json')); },
  async survival() { return this._survival || (this._survival = await fetchJSON('data/survival.json')); }
};

// ================= Ảnh thực tế (Wikimedia Commons) =================
const Img = (() => {
  const KEY = 'traveltalk-img';
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const pending = {};
  const strip = html => new DOMParser().parseFromString(html, 'text/html').body.textContent.trim().slice(0, 50);

  function find(q) {
    if (q in cache) return Promise.resolve(cache[q]);
    if (pending[q]) return pending[q];
    const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
      '&generator=search&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|mime|extmetadata' +
      '&iiextmetadatafilter=Artist|LicenseShortName&iiurlwidth=640&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap');
    pending[q] = fetch(api).then(r => r.json()).then(j => {
      const pages = Object.values((j.query && j.query.pages) || {}).sort((a, b) => a.index - b.index);
      const p = pages.find(p => p.imageinfo && /jpeg|png|webp/.test(p.imageinfo[0].mime));
      let res = null;
      if (p) {
        const ii = p.imageinfo[0], meta = ii.extmetadata || {};
        res = {
          src: ii.thumburl || ii.url, page: ii.descriptionurl,
          by: (meta.Artist && strip(meta.Artist.value)) || 'Wikimedia Commons',
          lic: (meta.LicenseShortName && meta.LicenseShortName.value) || ''
        };
      }
      cache[q] = res;
      try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {}
      return res;
    }).catch(() => null).finally(() => { delete pending[q]; });
    return pending[q];
  }

  async function load(el) {
    const info = el.dataset.src ? { src: el.dataset.src, by: el.dataset.by || '' } : await find(el.dataset.img);
    if (!info || !info.src) return;
    const img = new Image();
    img.alt = el.dataset.alt || '';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      el.appendChild(img);
      if (el.dataset.credit && info.by) {
        const c = document.createElement(info.page ? 'a' : 'span');
        c.className = 'cr';
        c.textContent = '📷 ' + info.by + (info.lic ? ' · ' + info.lic : '');
        if (info.page) { c.href = info.page; c.target = '_blank'; c.rel = 'noopener'; }
        el.appendChild(c);
      }
    };
    img.src = info.src;
  }

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { io.unobserve(e.target); load(e.target); }
    }), { rootMargin: '300px' })
    : null;

  function hydrate(root = document) {
    $$('.ph[data-img]:not([data-h])', root).forEach(el => {
      el.dataset.h = '1';
      io ? io.observe(el) : load(el);
    });
  }

  return { find, hydrate };
})();

function imgBox(query, emoji = '🖼️', opts = {}) {
  return `<div class="ph ${opts.cls || ''}" data-img="${esc(query)}" ${opts.src ? `data-src="${esc(opts.src)}" data-by="${esc(opts.by || '')}"` : ''}
    ${opts.credit ? 'data-credit="1"' : ''} data-alt="${esc(opts.alt || query)}"><span class="emo">${emoji}</span></div>`;
}

// ================= Tiện ích giao diện =================
function setTitle(t) { $('#pageTitle').textContent = t; document.title = t + ' · TravelTalk'; }

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

let sheetOnClose = null;
function openSheet(html, onClose) {
  stopMic();
  const c = $('#sheetContent');
  c.innerHTML = html;
  $('#sheet').hidden = false;
  sheetOnClose = onClose || null;
  $('.sheet-body').scrollTop = 0;
  Img.hydrate(c);
  return c;
}
function closeSheet(silent) {
  $('#sheet').hidden = true;
  $('#sheetContent').innerHTML = '';
  stopMic();
  const cb = sheetOnClose; sheetOnClose = null;
  if (!silent && cb) cb();
}
function stopMic() {
  Speech.stopRecognize();
  if (Speech.isRecording()) Speech.stopRecording();
}

function showNative(en, vi) {
  const el = $('#showNative');
  el.innerHTML = `<div class="big">${esc(en)}</div>${vi ? `<div class="vi">${esc(vi)}</div>` : ''}
    <div class="row"><button class="btn" data-say="${esc(en)}" data-rate="0.85">🔊 Đọc to</button>
    <button class="btn ghost" id="closeNative">✕ Đóng</button></div>`;
  el.hidden = false;
  $('#closeNative').onclick = () => { el.hidden = true; Speech.stopSpeaking(); };
}

const speakerClass = (speakers, name) => ['a', 'b', 'c'][Math.max(0, speakers.indexOf(name)) % 3];
const pitchFor = (speakers, name) => [1, 0.8, 1.2][Math.max(0, speakers.indexOf(name)) % 3];
const levelBadge = lv => `<span class="badge ${/^A/.test(lv) ? 'ok' : /^B2/.test(lv) ? 'warn' : ''}">${esc(lv)}</span>`;

const NOT_SUPPORTED = `<div class="notice">Trình duyệt này chưa hỗ trợ chấm điểm giọng nói.
  Hãy dùng <b>Chrome</b> (Android/máy tính) hoặc <b>Safari</b> (iPhone, iOS 14.5+).
  Bạn vẫn có thể <b>ghi âm và nghe lại</b> để tự so sánh với giọng mẫu.</div>`;

function micError(err) {
  if (err === 'not-allowed' || err === 'service-not-allowed') {
    return isIOS()
      ? '🎤 Chưa có quyền dùng micro. Vào Cài đặt → Safari → Micrô → Cho phép, và bật Cài đặt chung → Bàn phím → Đọc chính tả. Nếu đang mở app từ màn hình chính, hãy thử mở bằng Safari.'
      : '🎤 Chưa có quyền dùng micro. Bấm biểu tượng bên trái thanh địa chỉ → Quyền → Micro → Cho phép, rồi thử lại.';
  }
  if (err === 'no-speech') return 'Không nghe thấy gì. Hãy nói to và rõ hơn, rồi thử lại.';
  if (err === 'network') return 'Chấm điểm giọng nói cần kết nối Internet. Hãy kiểm tra mạng.';
  if (err === 'audio-capture') return 'Không tìm thấy micro trên thiết bị.';
  return 'Không nhận dạng được giọng nói (' + err + '). Thử lại nhé.';
}

function scoreHTML(r, text) {
  const cls = r.score >= 80 ? 'ok' : r.score >= 55 ? 'warn' : 'bad';
  const hist = (Store.state.scores[text] || []).slice(-6);
  return `<div class="score-box">
    <div class="row"><span class="score-num" style="color:var(--${cls})">${r.score}</span><span class="muted">/ 100</span></div>
    <div>${r.words.map(w => `<span class="w ${w.label}" data-say="${esc(w.text.replace(/[.,!?]/g, ''))}" data-rate="0.6">${esc(w.text)}</span>`).join(' ')}</div>
    <p class="heard">Máy nghe được: “${esc(r.heard || '…')}”</p>
    <p>${esc(Speech.feedback(r))}</p>
    <p class="small muted">🟢 đúng · 🟡 gần đúng · 🔴 sai/thiếu — bấm vào từ để nghe chậm.</p>
    ${hist.length > 1 ? `<p class="small muted">Các lần gần đây: ${hist.join(' → ')}</p>` : ''}
  </div>`;
}

// Gợi ý khi điện thoại không nhận được giọng nói
function noSpeechHelp() {
  let tip = 'Không nghe thấy gì. Hãy bấm nút, đợi chữ “Đang nghe” hiện ra rồi nói to, rõ, gần micro.';
  if (isIOS() && isStandalone()) {
    tip += ' Trên iPhone, chấm điểm giọng nói thường không chạy khi mở app từ màn hình chính – hãy mở link bằng Safari để luyện nói.';
  } else if (isIOS()) {
    tip += ' Trên iPhone: vào Cài đặt → Safari → Micrô → Cho phép; và Cài đặt → Cài đặt chung → Bàn phím → bật Đọc chính tả.';
  } else {
    tip += ' Trên Android: dùng Chrome và cho phép quyền Micro (bấm biểu tượng bên trái thanh địa chỉ).';
  }
  return `<div class="notice">${esc(tip)}</div>`;
}

function bindSay(btn, text, out) {
  btn.addEventListener('click', async () => {
    if (btn.classList.contains('rec')) {
      // Đang nghe mà bấm lần nữa: dừng và chấm điểm phần đã nghe được
      btn.innerHTML = '⏳ Đang xử lý…';
      Speech.stopRecognize();
      return;
    }
    if (!Speech.canRecognize()) { out.innerHTML = NOT_SUPPORTED; return; }
    const label = btn.innerHTML;
    btn.classList.add('rec');
    btn.innerHTML = '🔴 Đang nghe… nói xong bấm vào đây';
    out.innerHTML = '<p class="heard">🎧 Hãy nói câu tiếng Anh…</p>';
    try {
      const alts = await Speech.recognize(Store.state.settings.accent, partial => {
        if (partial) out.innerHTML = `<p class="heard">🎧 Đang nghe: “${esc(partial)}”</p>`;
      });
      if (!alts.length) {
        out.innerHTML = noSpeechHelp();
      } else {
        const r = Speech.score(text, alts);
        Store.addScore(text, r.score);
        out.innerHTML = scoreHTML(r, text);
      }
    } catch (err) {
      out.innerHTML = `<div class="notice">${esc(micError(err))}</div>`;
    } finally {
      btn.classList.remove('rec');
      btn.innerHTML = label;
    }
  });
}

// Khung luyện phát âm dùng chung: nghe mẫu, chấm điểm, ghi âm & nghe lại
function practicePanel(container, item) {
  const s = Store.state.settings;
  container.innerHTML = `
    <div class="word-big" style="font-size:1.45rem">${esc(item.en)}</div>
    ${item.ipa ? `<div class="ipa">${esc(item.ipa)}</div>` : ''}
    ${item.vi ? `<p class="muted">${esc(item.vi)}</p>` : ''}
    ${s.showGrammar !== false && /\s/.test(item.en.trim()) ? Grammar.html(item.en) : ''}
    <div class="row" style="margin:10px 0">
      <button class="btn secondary" data-say="${esc(item.en)}">🔊 Nghe mẫu</button>
      <button class="btn secondary" data-say="${esc(item.en)}" data-rate="0.6">🐢 Chậm</button>
      <div class="seg" role="group" aria-label="Giọng">
        <button data-accent="en-US" class="${s.accent === 'en-US' ? 'on' : ''}">🇺🇸 Mỹ</button>
        <button data-accent="en-GB" class="${s.accent === 'en-GB' ? 'on' : ''}">🇬🇧 Anh</button>
      </div>
    </div>
    <h3>✅ Chấm điểm phát âm</h3>
    <button class="btn block pSay">🎙️ Bấm rồi đọc câu trên</button>
    <div class="pResult"></div>
    <h3>⏺ Ghi âm & so sánh</h3>
    <div class="row">
      <button class="btn ghost pRec">⏺ Ghi âm giọng tôi</button>
      <button class="btn ghost pMine" disabled>▶ Nghe giọng tôi</button>
    </div>
    <p class="small muted">Mẹo: nghe mẫu → ghi âm → nghe lại giọng mình → so sánh ngữ điệu và âm cuối.</p>`;

  bindSay($('.pSay', container), item.en, $('.pResult', container));
  $$('[data-accent]', container).forEach(b => b.onclick = () => {
    s.accent = b.dataset.accent; Store.save();
    $$('[data-accent]', container).forEach(x => x.classList.toggle('on', x === b));
    Speech.speak(item.en);
  });

  const rec = $('.pRec', container), mine = $('.pMine', container);
  let url = null;
  rec.onclick = async () => {
    if (!Speech.canRecord()) { toast('Thiết bị không hỗ trợ ghi âm trong trình duyệt.'); return; }
    if (Speech.isRecording()) {
      const blob = await Speech.stopRecording();
      rec.classList.remove('rec'); rec.textContent = '⏺ Ghi âm lại';
      if (blob) {
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(blob);
        mine.disabled = false;
        Store.state.stats.recorded++; Store.activity();
        new Audio(url).play();
      }
      return;
    }
    try {
      Speech.stopSpeaking();
      await Speech.startRecording();
      rec.classList.add('rec'); rec.textContent = '⏹ Dừng ghi âm';
    } catch (err) {
      toast('🎤 Hãy cho phép ứng dụng dùng micro.');
    }
  };
  mine.onclick = () => { if (url) new Audio(url).play(); };
}

function openPractice(item) {
  const c = openSheet('<div class="pp"></div>');
  practicePanel($('.pp', c), item);
}

// ================= Phân tích câu =================
function analysisHTML(l) {
  const a = l.analysis || {};
  const say = (t, label = '🔊') => `<button class="chip" style="padding:2px 8px" data-say="${esc(t)}" aria-label="Nghe">${label}</button>`;
  let h = '<div class="analysis">';
  if (a.vocab && a.vocab.length) {
    h += '<h4>📚 Từ vựng</h4><ul>' + a.vocab.map(v => `<li><b>${esc(v.word)}</b> ${say(v.word)}
      <span class="ipa">${esc(v.ipa || '')}</span> <i class="muted">${esc(v.pos || '')}</i> – ${esc(v.vi)}
      ${v.example ? `<br><span class="small">VD: ${esc(v.example)} ${say(v.example)}</span>` : ''}</li>`).join('') + '</ul>';
  }
  if (a.phrases && a.phrases.length) {
    h += '<h4>🔗 Cụm từ cố định</h4><ul>' + a.phrases.map(p => `<li><b>${esc(p.phrase)}</b> – ${esc(p.vi)}</li>`).join('') + '</ul>';
  }
  // Khi dòng ngữ pháp đã hiện ngay dưới câu thì không lặp lại trong bảng phân tích
  if (a.grammar && Store.state.settings.showGrammar === false) {
    const g = a.grammar;
    h += `<h4>🧩 Ngữ pháp</h4><p><span class="formula">${esc(g.pattern)}</span></p><p>${esc(g.explainVi)}</p>`;
    if (g.examples) h += '<ul>' + g.examples.map(e => `<li>${esc(e)} ${say(e)}</li>`).join('') + '</ul>';
  }
  if (l.variants) {
    h += '<h4>🔄 Cách nói khác</h4><ul>' +
      (l.variants.polite ? `<li><b>Lịch sự:</b> ${esc(l.variants.polite)} ${say(l.variants.polite)}</li>` : '') +
      (l.variants.casual ? `<li><b>Thân mật / ngắn:</b> ${esc(l.variants.casual)} ${say(l.variants.casual)}</li>` : '') + '</ul>';
  }
  if (a.pronunciation) h += `<h4>🗣️ Phát âm & ngữ điệu</h4><p>${esc(a.pronunciation)}</p>`;
  if (a.culture) h += `<h4>🌍 Văn hóa</h4><p>${esc(a.culture)}</p>`;
  if (a.commonMistake) {
    h += `<h4>⚠️ Lỗi người Việt hay mắc</h4><p><span class="wrong">${esc(a.commonMistake.wrong)}</span> → <span class="right">${esc(a.commonMistake.right)}</span></p>`;
  }
  return h + '</div>';
}

// ================= Màn hình =================
async function homeView() {
  setTitle('TravelTalk');
  const st = Store.state;
  const goal = st.settings.goal, done = Store.todayActions();
  const [vocab, survival] = await Promise.all([Data.vocab().catch(() => []), Data.survival().catch(() => [])]);
  const due = SRS.dueIds(vocab.map(v => v.id)).length;
  const learned = vocab.filter(v => SRS.isLearned(v.id)).length;
  const tip = survival.length ? survival[Math.floor(Math.random() * survival.length)] : null;
  const last = st.last;

  view.innerHTML = `
    <section class="hero">
      <h2>Xin chào 👋</h2>
      <p>Mỗi ngày một chút — tự tin nói tiếng Anh khi đi du lịch.</p>
      <div class="stats">
        <div class="stat"><b>🔥 ${Store.streak()}</b><span class="small">ngày liên tiếp</span></div>
        <div class="stat"><b>${Store.avgScore() || '–'}</b><span class="small">điểm phát âm</span></div>
        <div class="stat"><b>${learned}</b><span class="small">từ đã thuộc</span></div>
      </div>
      <div class="progress"><i style="width:${Math.min(100, done / goal * 100)}%"></i></div>
      <p class="small">Mục tiêu hôm nay: ${Math.min(done, goal)}/${goal} hoạt động</p>
    </section>
    ${installBanner()}
    <a class="list-item" href="${last ? esc(last.href) : '#/topic/airport'}">
      <span class="emo">▶️</span><div class="grow"><b>${last ? 'Học tiếp' : 'Bắt đầu học'}</b>
      <div class="muted small">${last ? esc(last.title) : 'Chủ đề đầu tiên: Tại sân bay'}</div></div><span>›</span></a>
    <a class="list-item" href="#/flash"><span class="emo">🃏</span><div class="grow"><b>Ôn từ vựng</b>
      <div class="muted small">${due ? due + ' từ cần ôn hôm nay' : 'Học từ mới với thẻ có hình ảnh'}</div></div>${due ? `<span class="badge warn">${due}</span>` : '<span>›</span>'}</a>
    <a class="list-item" href="#/survival"><span class="emo">🆘</span><div class="grow"><b>Câu cứu nguy</b>
      <div class="muted small">50 câu dùng ngay khi gặp sự cố — dùng được offline</div></div><span>›</span></a>
    <a class="list-item" href="#/notes"><span class="emo">⭐</span><div class="grow"><b>Sổ tay của tôi</b>
      <div class="muted small">${Object.keys(st.savedLines).length} câu · ${Object.keys(st.savedWords).length} từ đã lưu</div></div><span>›</span></a>
    ${tip ? `<div class="card"><div class="small muted">💡 Câu hôm nay</div>
      <div class="word-big" style="font-size:1.3rem">${esc(tip.en)}</div><div class="ipa">${esc(tip.ipa)}</div>
      <p class="muted">${esc(tip.vi)}</p>
      <div class="row"><button class="btn secondary" data-say="${esc(tip.en)}">🔊 Nghe</button>
      <button class="btn secondary" data-practice="${esc(tip.en)}" data-ipa="${esc(tip.ipa)}" data-vi="${esc(tip.vi)}">🎙️ Luyện nói</button></div></div>` : ''}`;
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function installBanner() {
  if (isStandalone()) return '';
  return `<button class="list-item" style="width:100%;border:0;cursor:pointer;text-align:left" data-install>
    <span class="emo">📲</span><div class="grow"><b>Cài app lên màn hình chính</b>
    <div class="muted small">Mở nhanh như app thật, học cả khi không có mạng</div></div><span>›</span></button>`;
}

function installHelp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(() => { deferredPrompt = null; });
    return;
  }
  openSheet(`<h2>📲 Cài TravelTalk lên điện thoại</h2>
    <h3>${isIOS() ? '👉 ' : ''}iPhone / iPad (Safari)</h3>
    <ol><li>Mở trang này bằng <b>Safari</b>.</li><li>Bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên ↑) ở thanh dưới.</li>
    <li>Kéo xuống, chọn <b>“Thêm vào MH chính”</b> (Add to Home Screen).</li><li>Bấm <b>Thêm</b>.</li></ol>
    <h3>${!isIOS() ? '👉 ' : ''}Android (Chrome)</h3>
    <ol><li>Bấm nút <b>⋮</b> ở góc trên bên phải.</li><li>Chọn <b>“Cài đặt ứng dụng”</b> hoặc <b>“Thêm vào màn hình chính”</b>.</li>
    <li>Bấm <b>Cài đặt</b>.</li></ol>
    <p class="muted small">Sau khi cài, biểu tượng TravelTalk sẽ xuất hiện trên màn hình chính. Mở một lần khi có mạng để app tải dữ liệu dùng offline.</p>`);
}

async function learnView() {
  setTitle('Học theo chủ đề');
  // Chủ đề đã có bài lên trước, chủ đề "Sắp có" xuống cuối
  const topics = [...await Data.topics()].sort((a, b) => b.ready - a.ready);
  view.innerHTML = `
    <input type="search" id="q" placeholder="🔍 Tìm câu, từ… (tiếng Anh hoặc tiếng Việt)" autocomplete="off">
    <div id="results"></div>
    <div id="topicGrid">
      <h2>Chủ đề du lịch</h2>
      <div class="grid">${topics.map(t => t.ready
        ? `<a class="tile" href="#/topic/${t.id}"><span class="emo">${t.icon}</span><b>${esc(t.titleVi)}</b><span class="muted small">${esc(t.title)}</span></a>`
        : `<div class="tile locked"><span class="badge">Sắp có</span><span class="emo">${t.icon}</span><b>${esc(t.titleVi)}</b><span class="muted small">${esc(t.title)}</span></div>`).join('')}
      </div>
      <p class="muted small center">Thêm chủ đề mới bằng cách thêm file JSON vào thư mục <code>data/topics/</code> (xem README).</p>
    </div>`;
  let timer;
  $('#q').addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(() => search(e.target.value.trim()), 250);
  });
}

async function search(q) {
  const box = $('#results'), grid = $('#topicGrid');
  if (!box) return;
  if (q.length < 2) { box.innerHTML = ''; grid.hidden = false; return; }
  grid.hidden = true;
  box.innerHTML = '<p class="muted">Đang tìm…</p>';
  const f = fold(q);
  const [files, vocab, survival] = await Promise.all([Data.allTopicFiles(), Data.vocab(), Data.survival()]);
  const res = [];
  files.forEach(t => t.situations.forEach(s => s.dialogue.forEach(l => {
    if (fold(l.en).includes(f) || fold(l.vi).includes(f))
      res.push(`<a class="list-item" href="#/sit/${t.topicId}/${s.id}"><span class="emo">💬</span><div class="grow"><b>${esc(l.en)}</b>
        <div class="muted small">${esc(l.vi)} · ${esc(s.titleVi)}</div></div></a>`);
  })));
  vocab.filter(v => fold(v.word).includes(f) || fold(v.vi).includes(f)).forEach(v =>
    res.push(`<button class="list-item" style="width:100%;border:0;text-align:left;cursor:pointer" data-word="${v.id}"><span class="emo">${v.emoji || '🔤'}</span>
      <div class="grow"><b>${esc(v.word)}</b> <span class="ipa">${esc(v.ipaUS)}</span><div class="muted small">${esc(v.vi)}</div></div></button>`));
  survival.filter(s => fold(s.en).includes(f) || fold(s.vi).includes(f)).forEach(s =>
    res.push(`<button class="list-item" style="width:100%;border:0;text-align:left;cursor:pointer" data-practice="${esc(s.en)}" data-ipa="${esc(s.ipa)}" data-vi="${esc(s.vi)}">
      <span class="emo">🆘</span><div class="grow"><b>${esc(s.en)}</b><div class="muted small">${esc(s.vi)}</div></div></button>`));
  box.innerHTML = res.length ? `<p class="muted small">${res.length} kết quả</p>` + res.slice(0, 60).join('') : '<div class="empty">Không tìm thấy kết quả.</div>';
}

async function topicView(id) {
  const t = await Data.topic(id);
  setTitle(t.titleVi);
  const done = Store.state.done;
  view.innerHTML = `
    <p class="muted">${esc(t.descriptionVi || '')}</p>
    <h2>💬 Tình huống hội thoại</h2>
    ${t.situations.map(s => `<a class="list-item" href="#/sit/${id}/${s.id}">
      <span class="emo">${done[s.id] != null ? '✅' : '💬'}</span>
      <div class="grow"><b>${esc(s.titleVi)}</b><div class="muted small">${esc(s.title)} · ${s.dialogue.length} câu</div></div>
      ${levelBadge(s.level)}</a>`).join('')}
    ${t.reading && t.reading.length ? `<h2>📖 Đọc hiểu</h2>` + t.reading.map((r, i) => `<a class="list-item" href="#/read/${id}/${i}">
      <span class="emo">📄</span><div class="grow"><b>${esc(r.titleVi)}</b><div class="muted small">${esc(r.title)}</div></div><span>›</span></a>`).join('') : ''}
    ${t.writing && t.writing.length ? `<h2>✍️ Viết</h2>` + t.writing.map((w, i) => `<a class="list-item" href="#/write/${id}/${i}">
      <span class="emo">${w.form ? '🗒️' : '✉️'}</span><div class="grow"><b>${esc(w.titleVi)}</b><div class="muted small">${esc(w.title)}</div></div><span>›</span></a>`).join('') : ''}
    <h2>🖼️ Từ vựng</h2>
    <a class="list-item" href="#/vocab/${id}"><span class="emo">🔤</span><div class="grow"><b>Từ vựng chủ đề này</b>
      <div class="muted small">Có phiên âm, hình ảnh thực tế, phát âm</div></div><span>›</span></a>`;
}

async function situationView(topicId, sitId) {
  const t = await Data.topic(topicId);
  const sit = t.situations.find(s => s.id === sitId);
  if (!sit) throw new Error('Không tìm thấy tình huống');
  setTitle(sit.titleVi);
  Store.state.last = { href: `#/sit/${topicId}/${sitId}`, title: `${t.titleVi} › ${sit.titleVi}` };
  Store.save();
  const speakers = [...new Set(sit.dialogue.map(l => l.speaker))];
  const showVi = Store.state.settings.showVi;
  const showGram = Store.state.settings.showGrammar !== false;

  view.innerHTML = `
    <div class="cover">${imgBox(sit.imageQuery || sit.title, t.icon, { src: sit.image, by: sit.imageCredit, credit: true })}
      <div class="cap"><b>${esc(sit.title)}</b> ${levelBadge(sit.level)}</div></div>
    <p>${esc(sit.contextVi)}</p>
    <div class="modes">
      <button class="btn" data-mode="all">▶ Nghe cả bài</button>
      <button class="btn secondary" data-mode="role">🎭 Nhập vai</button>
      <button class="btn secondary" data-mode="shadow">🗣️ Nói đuổi</button>
      <a class="btn secondary" href="#/ex/${topicId}/${sitId}">📝 Bài tập</a>
    </div>
    <div id="dialogue">${sit.dialogue.map((l, i) => `
      <article class="line ${speakerClass(speakers, l.speaker)}" data-i="${i}" data-sp="${esc(l.speaker)}">
        <div class="who">${esc(l.speaker)}</div>
        <div class="en">${esc(l.en)}</div>
        <div class="ipa">${esc(l.ipa)}</div>
        <div class="vi ${showVi ? '' : 'hide'}" ${showVi ? '' : 'title="Bấm để xem nghĩa"'}>${esc(l.vi)}</div>
        ${showGram ? Grammar.html(l.en, l.analysis && l.analysis.grammar) : ''}
        <div class="acts">
          <button data-act="play" aria-label="Phát âm">🔊</button>
          <button data-act="slow" aria-label="Phát âm chậm">🐢</button>
          <button data-act="practice" aria-label="Luyện nói và chấm điểm">🎙️</button>
          <button data-act="an" aria-label="Phân tích">🔍 Phân tích</button>
          <button data-act="save" class="${Store.state.savedLines[sit.id + '#' + i] ? 'on' : ''}" aria-label="Lưu">⭐</button>
          <button data-act="show" aria-label="Đưa người bản xứ xem">📢</button>
        </div>
      </article>`).join('')}</div>
    ${sit.keyPhrases && sit.keyPhrases.length ? `<div class="card"><h3 style="margin-top:0">🔑 Mẫu câu cần nhớ</h3>
      ${sit.keyPhrases.map(p => `<p><button class="chip" data-say="${esc(p)}">🔊</button> ${esc(p)}</p>`).join('')}</div>` : ''}
    <a class="btn block" href="#/ex/${topicId}/${sitId}">📝 Làm bài tập tình huống này</a>`;
  Img.hydrate(view);

  const lines = sit.dialogue;
  const hl = i => {
    $$('.line', view).forEach(el => el.classList.toggle('active', +el.dataset.i === i));
    const el = $(`.line[data-i="${i}"]`, view);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  $('#dialogue').addEventListener('click', e => {
    const vi = e.target.closest('.vi.hide');
    if (vi) { vi.classList.remove('hide'); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const i = +b.closest('.line').dataset.i, l = lines[i];
    const act = b.dataset.act;
    if (act === 'play' || act === 'slow') { run++; Speech.speak(l.en, { rate: act === 'slow' ? 0.6 : undefined, pitch: pitchFor(speakers, l.speaker) }); Store.activity(); }
    if (act === 'practice') openPractice(l);
    if (act === 'show') showNative(l.en, l.vi);
    if (act === 'an') {
      const card = b.closest('.line'), ex = $('.analysis', card);
      if (ex) ex.remove(); else card.insertAdjacentHTML('beforeend', analysisHTML(l));
      b.classList.toggle('on', !ex);
    }
    if (act === 'save') {
      const id = sit.id + '#' + i, saved = Store.state.savedLines;
      if (saved[id]) delete saved[id];
      else saved[id] = { en: l.en, vi: l.vi, ipa: l.ipa, ref: `#/sit/${topicId}/${sitId}` };
      Store.save();
      b.classList.toggle('on', !!saved[id]);
      toast(saved[id] ? '⭐ Đã lưu vào sổ tay' : 'Đã bỏ lưu');
    }
  });

  $$('[data-mode]', view).forEach(b => b.addEventListener('click', () => {
    const mode = b.dataset.mode;
    if (mode === 'all') playAll();
    if (mode === 'shadow') shadowing();
    if (mode === 'role') {
      openSheet(`<h2>🎭 Nhập vai</h2><p>Bạn muốn đóng vai ai? App sẽ nói lời của người còn lại, đến lượt bạn thì bạn nói và được chấm điểm.</p>
        ${speakers.map(sp => `<button class="btn block" style="margin:8px 0" data-role="${esc(sp)}">Tôi là ${esc(sp)}</button>`).join('')}`);
      $$('[data-role]', $('#sheetContent')).forEach(rb => rb.onclick = () => { closeSheet(true); roleplay(rb.dataset.role); });
    }
  }));

  async function playAll() {
    const my = ++run;
    for (let i = 0; i < lines.length; i++) {
      if (my !== run) return;
      hl(i);
      await Speech.speak(lines[i].en, { pitch: pitchFor(speakers, lines[i].speaker) });
      await sleep(350);
    }
    if (my === run) { hl(-1); Store.activity(); }
  }

  async function shadowing() {
    const my = ++run;
    toast('🗣️ Nghe từng câu rồi nói đuổi theo ngay. Bấm 🔊 bất kỳ để dừng.', 4000);
    await sleep(1500);
    for (let i = 0; i < lines.length; i++) {
      if (my !== run) return;
      hl(i);
      await Speech.speak(lines[i].en, { rate: 0.85, pitch: pitchFor(speakers, lines[i].speaker) });
      if (my !== run) return;
      toast('👉 Đến lượt bạn nhắc lại…', 1800);
      await sleep(1200 + lines[i].en.split(' ').length * 550);
    }
    if (my === run) { hl(-1); Store.activity(3); toast('🎉 Hoàn thành nói đuổi!'); }
  }

  async function roleplay(role) {
    const my = ++run;
    $$('.line', view).forEach(el => el.classList.toggle('hidden-en', el.dataset.sp === role));
    const finish = () => $$('.line', view).forEach(el => el.classList.remove('hidden-en'));
    for (let i = 0; i < lines.length; i++) {
      if (my !== run) { finish(); return; }
      hl(i);
      const l = lines[i];
      if (l.speaker !== role) {
        await Speech.speak(l.en, { pitch: pitchFor(speakers, l.speaker) });
        await sleep(300);
      } else {
        const go = await userTurn(l);
        if (!go) { run++; finish(); hl(-1); return; }
      }
    }
    finish(); hl(-1);
    if (my === run) {
      Store.activity(3);
      openSheet(`<h2>🎉 Hoàn thành nhập vai!</h2><p>Bạn đã đóng vai <b>${esc(role)}</b>. Hãy thử đóng vai còn lại để luyện cả hai phía của cuộc hội thoại.</p>
        <button class="btn block" data-close>Đóng</button>`);
    }
  }

  function userTurn(l) {
    return new Promise(resolve => {
      const c = openSheet(`<span class="badge warn">Đến lượt bạn</span>
        <p class="word-big" style="font-size:1.25rem">${esc(l.vi)}</p>
        <button class="btn ghost" id="rtHint">👀 Xem gợi ý câu tiếng Anh</button>
        <div id="rtEn" hidden><p class="en" style="font-weight:600;font-size:1.15rem">${esc(l.en)}</p><div class="ipa">${esc(l.ipa)}</div></div>
        <p></p>
        <button class="btn block" id="rtSay">🎙️ Nói câu của bạn</button>
        <div id="rtRes"></div>
        <div class="row" style="margin-top:12px">
          <button class="btn secondary" data-say="${esc(l.en)}">🔊 Nghe mẫu</button>
          <button class="btn ok" id="rtNext">Tiếp ▶</button>
        </div>
        <button class="btn ghost block" style="margin-top:8px" id="rtStop">⏹ Dừng nhập vai</button>`, () => resolve(false));
      $('#rtHint', c).onclick = () => { $('#rtEn', c).hidden = false; $('#rtHint', c).hidden = true; };
      bindSay($('#rtSay', c), l.en, $('#rtRes', c));
      $('#rtNext', c).onclick = () => { closeSheet(true); resolve(true); };
      $('#rtStop', c).onclick = () => { closeSheet(true); resolve(false); };
    });
  }
}

// ---------- Bài tập tự sinh từ hội thoại ----------
function buildExercises(sit) {
  const lines = sit.dialogue;
  const clean = w => w.replace(/[^A-Za-z'-]/g, '');
  const allWords = [...new Set(lines.flatMap(l => l.en.split(/\s+/).map(clean).filter(w => w.length >= 4)))];
  const types = ['listen', 'blank', 'order', 'translate'];
  const qs = [];
  shuffle(lines.map((_, i) => i)).slice(0, 8).forEach((li, k) => {
    const l = lines[li], words = l.en.split(/\s+/);
    let type = types[k % 4];
    if (type === 'order' && (words.length < 3 || words.length > 14)) type = 'listen';
    if (type === 'blank') {
      let key = ((l.analysis && l.analysis.vocab) || []).map(v => v.word)
        .find(w => new RegExp('\\b' + escRe(w) + '\\b', 'i').test(l.en));
      if (!key) key = words.map(clean).sort((a, b) => b.length - a.length)[0];
      const distract = shuffle(allWords.filter(w => !key.toLowerCase().includes(w.toLowerCase()) && !w.toLowerCase().includes(key.toLowerCase()))).slice(0, 3);
      if (key && distract.length === 3) { qs.push({ type, l, key, options: shuffle([key, ...distract]) }); return; }
      type = 'listen';
    }
    if (type === 'listen') {
      const others = shuffle(lines.filter(x => x !== l && x.vi !== l.vi)).slice(0, 3).map(x => x.vi);
      qs.push({ type, l, options: shuffle([l.vi, ...others]) });
      return;
    }
    if (type === 'order') { qs.push({ type, l, chips: shuffle(words.map((w, i) => ({ w, i }))) }); return; }
    qs.push({ type: 'translate', l });
  });
  return qs;
}

async function exerciseView(topicId, sitId) {
  const t = await Data.topic(topicId);
  const sit = t.situations.find(s => s.id === sitId);
  setTitle('Bài tập: ' + sit.titleVi);
  const qs = buildExercises(sit);
  let idx = 0, correct = 0;

  const next = () => { idx++; idx < qs.length ? render() : finish(); };
  const fb = (ok, extra = '') => `<div class="feedback ${ok ? 'ok' : 'bad'}">${ok ? '✅ Chính xác!' : '❌ Chưa đúng.'} ${extra}</div>
    <button class="btn block" style="margin-top:10px" id="nextQ">${idx + 1 < qs.length ? 'Câu tiếp ▶' : 'Xem kết quả'}</button>`;
  const bindNext = () => { $('#nextQ').onclick = next; };

  function header(title) {
    return `<div class="progress dark"><i style="width:${idx / qs.length * 100}%"></i></div>
      <p class="muted small">Câu ${idx + 1}/${qs.length}</p><h2>${title}</h2>`;
  }

  function render() {
    const q = qs[idx], l = q.l;
    if (q.type === 'listen') {
      view.innerHTML = header('🎧 Nghe và chọn nghĩa đúng') +
        `<button class="btn secondary block" data-say="${esc(l.en)}">🔊 Nghe câu</button>
        <button class="btn ghost block" style="margin-top:6px" data-say="${esc(l.en)}" data-rate="0.6">🐢 Nghe chậm</button>
        <div id="opts">${q.options.map(o => `<button class="opt">${esc(o)}</button>`).join('')}</div><div id="fb"></div>`;
      Speech.speak(l.en);
      choose(o => o === l.vi, `<br><b>${esc(l.en)}</b>`);
    } else if (q.type === 'blank') {
      const shown = esc(l.en).replace(new RegExp('\\b' + escRe(esc(q.key)) + '\\b', 'i'), '<b style="color:var(--brand)">_____</b>');
      view.innerHTML = header('✏️ Chọn từ đúng điền vào chỗ trống') +
        `<div class="card"><p style="font-size:1.15rem">${shown}</p><p class="muted">${esc(l.vi)}</p></div>
        <div id="opts">${q.options.map(o => `<button class="opt">${esc(o)}</button>`).join('')}</div><div id="fb"></div>`;
      choose(o => o.toLowerCase() === q.key.toLowerCase(), `<br><b>${esc(l.en)}</b>`, true);
    } else if (q.type === 'order') {
      view.innerHTML = header('🧱 Sắp xếp thành câu đúng') +
        `<p class="muted">${esc(l.vi)}</p><div class="answer-area" id="ans"></div>
        <div id="pool">${q.chips.map(c => `<button class="word-chip" data-k="${c.i}">${esc(c.w)}</button>`).join('')}</div>
        <div class="row" style="margin-top:10px"><button class="btn ghost" id="clr">↺ Làm lại</button><button class="btn" id="chk">Kiểm tra</button></div><div id="fb"></div>`;
      const ans = $('#ans'), pool = $('#pool');
      view.onclick = e => {
        const chip = e.target.closest('.word-chip');
        if (!chip || !$('#fb') || $('#fb').innerHTML) return;
        (chip.parentElement === pool ? ans : pool).appendChild(chip);
      };
      $('#clr').onclick = () => $$('.word-chip', ans).forEach(c => pool.appendChild(c));
      $('#chk').onclick = () => {
        const built = $$('.word-chip', ans).map(c => c.textContent).join(' ');
        const ok = Speech.normalize(built).join(' ') === Speech.normalize(l.en).join(' ');
        if (ok) correct++;
        $('#chk').disabled = true;
        $('#fb').innerHTML = fb(ok, `<br><b>${esc(l.en)}</b> <button class="chip" data-say="${esc(l.en)}">🔊</button>`);
        bindNext();
      };
    } else {
      view.innerHTML = header('🔁 Dịch sang tiếng Anh') +
        `<div class="card"><p style="font-size:1.15rem">${esc(l.vi)}</p></div>
        <textarea id="tr" style="min-height:100px" placeholder="Gõ câu tiếng Anh của bạn…" autocapitalize="sentences"></textarea>
        <button class="btn block" style="margin-top:10px" id="chk">Kiểm tra</button><div id="fb"></div>`;
      $('#chk').onclick = () => {
        const r = Speech.score(l.en, [$('#tr').value]);
        const ok = r.score >= 70;
        if (ok) correct++;
        $('#chk').disabled = true;
        $('#fb').innerHTML = fb(ok, `Độ khớp ${r.score}%.<br>Đáp án gợi ý: <b>${esc(l.en)}</b> <button class="chip" data-say="${esc(l.en)}">🔊</button>
          <br><span class="small">Câu của bạn có thể vẫn đúng nếu diễn đạt khác nhưng cùng nghĩa.</span>`);
        bindNext();
      };
    }
  }

  function choose(isRight, extra, speakAfter) {
    $$('#opts .opt').forEach(b => b.onclick = () => {
      if ($('#fb').innerHTML) return;
      const ok = isRight(b.textContent);
      if (ok) correct++;
      b.classList.add(ok ? 'correct' : 'incorrect');
      if (!ok) $$('#opts .opt').find(x => isRight(x.textContent)).classList.add('correct');
      $('#fb').innerHTML = fb(ok, extra);
      if (speakAfter) Speech.speak(qs[idx].l.en);
      bindNext();
    });
  }

  function finish() {
    const pct = Math.round(correct / qs.length * 100);
    Store.state.done[sit.id] = Math.max(Store.state.done[sit.id] || 0, pct);
    Store.activity(5);
    view.innerHTML = `<div class="card center"><div style="font-size:3rem">${pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div>
      <h2>Bạn đúng ${correct}/${qs.length} câu (${pct}%)</h2>
      <p class="muted">${pct >= 80 ? 'Xuất sắc! Hãy thử nhập vai để luyện nói.' : 'Ôn lại hội thoại rồi làm lại nhé — mỗi lần bài tập sẽ được xáo trộn mới.'}</p>
      <div class="row"><a class="btn secondary" href="#/sit/${topicId}/${sitId}">↩ Về hội thoại</a>
      <button class="btn" id="again">🔁 Làm lại</button></div></div>`;
    $('#again').onclick = () => exerciseView(topicId, sitId);
  }

  render();
}

// ---------- Đọc hiểu ----------
async function readingView(topicId, i) {
  const t = await Data.topic(topicId);
  const r = t.reading[+i];
  setTitle(r.titleVi);
  const keys = Object.keys(r.glossary || {}).sort((a, b) => b.length - a.length);
  let text = esc(r.text);
  if (keys.length) {
    const re = new RegExp('\\b(' + keys.map(k => escRe(esc(k))).join('|') + ')\\b', 'gi');
    text = text.replace(re, m => `<span class="gl" data-gl="${m}">${m}</span>`);
  }
  view.innerHTML = `<p>${esc(r.introVi || '')}</p>
    <div class="reading-text">${text}</div>
    <div class="row" style="margin:10px 0"><button class="btn secondary" data-say="${esc(r.text)}" data-rate="0.85">🔊 Đọc to cả bài</button></div>
    <p class="small muted">Bấm vào từ gạch chân để xem nghĩa và nghe phát âm.</p>
    <h2>❓ Câu hỏi</h2>
    ${r.questions.map((q, qi) => `<div class="card" data-q="${qi}"><b>${qi + 1}. ${esc(q.q)}</b>
      ${q.options.map((o, oi) => `<button class="opt" data-o="${oi}">${esc(o)}</button>`).join('')}<div class="qfb"></div></div>`).join('')}`;

  view.addEventListener('click', e => {
    const g = e.target.closest('.gl');
    if (g) {
      const k = keys.find(k => k.toLowerCase() === g.dataset.gl.toLowerCase());
      toast(`${g.dataset.gl}: ${r.glossary[k]}`, 3500);
      Speech.speak(g.dataset.gl, { rate: 0.8 });
      return;
    }
    const b = e.target.closest('.opt');
    if (!b) return;
    const card = b.closest('[data-q]'), q = r.questions[+card.dataset.q];
    if ($('.qfb', card).innerHTML) return;
    const ok = +b.dataset.o === q.answer;
    b.classList.add(ok ? 'correct' : 'incorrect');
    $(`[data-o="${q.answer}"]`, card).classList.add('correct');
    $('.qfb', card).innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}">${ok ? '✅ Đúng!' : '❌ Chưa đúng.'} ${esc(q.explainVi || '')}</div>`;
    Store.activity();
  });
}

// ---------- Viết ----------
async function writingView(topicId, i) {
  const t = await Data.topic(topicId);
  const w = t.writing[+i];
  const draftKey = topicId + '-w' + i;
  setTitle(w.titleVi);

  if (w.form) {
    view.innerHTML = `<p>${esc(w.taskVi)}</p>
      <div class="card">${w.form.map((f, fi) => `<label style="display:block;margin:10px 0">
        <b>${esc(f.label)}</b> <span class="muted small">(${esc(f.labelVi)})</span>
        <input type="text" data-f="${fi}" placeholder="${esc(f.hintVi || '')}"></label>`).join('')}</div>
      <button class="btn block" id="chk">✅ Xem cách điền mẫu</button><div id="fb"></div>`;
    $('#chk').onclick = () => {
      $('#fb').innerHTML = `<div class="card">${w.form.map(f => `<p><b>${esc(f.label)}:</b> <span class="right">${esc(f.example)}</span><br><span class="small muted">${esc(f.noteVi || '')}</span></p>`).join('')}</div>`;
      Store.activity(2);
    };
    return;
  }

  view.innerHTML = `
    <div class="card"><b>📝 Yêu cầu</b><p>${esc(w.taskVi)}</p>
      ${w.info ? '<ul>' + w.info.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : ''}</div>
    <h3>💡 Mẫu câu gợi ý (bấm để chèn)</h3>
    <div>${w.starters.map(s => `<button class="word-chip" data-ins="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <textarea id="txt" placeholder="Viết bằng tiếng Anh tại đây…" autocapitalize="sentences" spellcheck="true">${esc(Store.state.drafts[draftKey] || '')}</textarea>
    <div class="row" style="margin-top:10px"><button class="btn" id="chk">🔍 Kiểm tra bài</button>
      <button class="btn secondary" id="sample">👀 Bài mẫu</button></div>
    <div id="fb"></div>
    <div class="card checklist"><b>✅ Tự kiểm tra</b>${w.checklist.map(c => `<label><input type="checkbox"> <span>${esc(c)}</span></label>`).join('')}</div>`;

  const ta = $('#txt');
  ta.addEventListener('input', () => { Store.state.drafts[draftKey] = ta.value; Store.save(); });
  $$('[data-ins]', view).forEach(b => b.onclick = () => {
    const s = ta.selectionStart ?? ta.value.length;
    const ins = (s > 0 && !/\s$/.test(ta.value.slice(0, s)) ? ' ' : '') + b.dataset.ins;
    ta.value = ta.value.slice(0, s) + ins + ta.value.slice(s);
    ta.focus(); ta.selectionStart = ta.selectionEnd = s + ins.length;
    ta.dispatchEvent(new Event('input'));
  });
  $('#sample').onclick = () => {
    $('#fb').innerHTML = `<div class="card"><b>Bài mẫu</b> <button class="chip" data-say="${esc(w.sample)}">🔊</button>
      <div class="reading-text" style="margin-top:8px;font-family:inherit">${esc(w.sample)}</div></div>`;
  };
  $('#chk').onclick = () => {
    const v = ta.value.trim();
    const words = v ? v.split(/\s+/).length : 0;
    const letter = w.letter !== false; // email/thư cần lời chào & kết thư; review, tin nhắn ngắn thì không
    const checks = [
      [words >= (w.minWords || 40), `Độ dài: ${words} từ (nên ≥ ${w.minWords || 40} từ)`],
      ...(letter ? [
        [/^(dear|hi|hello|good (morning|afternoon|evening))\b/i.test(v), 'Có lời chào mở đầu (Dear…, Hello…)'],
        [/(regards|thank you|thanks|sincerely|best wishes|cheers)/i.test(v), 'Có lời cảm ơn / kết thư'],
        [/\b(please|could|would|kindly|may i)\b/i.test(v), 'Dùng từ lịch sự (please, could, would…)']
      ] : []),
      [!/(^|[.!?]\s+)[a-z]/.test(v) && !/\bi\b/.test(v), 'Viết hoa đầu câu và chữ “I”'],
      [/[.!?]\s*$/.test(v), 'Kết thúc câu bằng dấu chấm / dấu hỏi'],
      ...(w.mustInclude || []).map(m => [new RegExp(m.regex, 'i').test(v), m.labelVi])
    ];
    const ok = checks.filter(c => c[0]).length;
    $('#fb').innerHTML = `<div class="card"><b>Kết quả: ${ok}/${checks.length}</b>
      ${checks.map(c => `<p>${c[0] ? '✅' : '⬜'} ${esc(c[1])}</p>`).join('')}
      <p class="small muted">Máy chỉ kiểm tra hình thức. Hãy so sánh với bài mẫu để học cách diễn đạt.</p></div>`;
    Store.activity(3);
  };
}

// ---------- Từ vựng ----------
let vocabTopic = 'all';

async function vocabView(topic) {
  if (topic) vocabTopic = topic;
  setTitle('Từ vựng du lịch');
  const [vocab, topics] = await Promise.all([Data.vocab(), Data.topics()]);
  const used = [...new Set(vocab.map(v => v.topic))];
  const names = Object.fromEntries(topics.map(t => [t.id, t.icon + ' ' + t.titleVi]));
  names.general = '🌐 Chung';
  const list = () => vocab.filter(v => vocabTopic === 'all' || v.topic === vocabTopic);
  const due = SRS.dueIds(list().map(v => v.id)).length;

  view.innerHTML = `
    <div class="chips">${['all', ...used].map(id => `<button class="chip ${id === vocabTopic ? 'on' : ''}" data-t="${id}">${id === 'all' ? '📚 Tất cả' : esc(names[id] || id)}</button>`).join('')}</div>
    <input type="search" id="vq" placeholder="🔍 Tìm từ (Anh/Việt)…">
    <div class="row" style="margin:12px 0">
      <a class="btn" href="#/flash">🃏 Ôn thẻ${due ? ` (${due})` : ''}</a>
      <a class="btn secondary" href="#/picquiz">🖼️ Nghe & chọn ảnh</a>
    </div>
    <p class="muted small" id="vcount"></p>
    <div class="vgrid" id="vgrid"></div>
    <p class="credit center">Ảnh minh họa từ Wikimedia Commons (giấy phép tự do). Bấm vào thẻ để xem tác giả.</p>`;

  const draw = () => {
    const f = fold($('#vq').value.trim());
    const items = list().filter(v => !f || fold(v.word).includes(f) || fold(v.vi).includes(f));
    $('#vcount').textContent = `${items.length} từ · ${items.filter(v => SRS.isLearned(v.id)).length} đã thuộc`;
    $('#vgrid').innerHTML = items.map(v => `<button class="vcard" data-word="${v.id}">
      ${imgBox(v.img || v.word, v.emoji || '🔤')}
      <div class="t"><b>${esc(v.word)}</b><span class="ipa small">${esc(v.ipaUS)}</span><div class="muted small">${esc(v.vi)}</div></div></button>`).join('');
    Img.hydrate($('#vgrid'));
  };
  $$('[data-t]', view).forEach(b => b.onclick = () => { vocabTopic = b.dataset.t; vocabView(); });
  $('#vq').addEventListener('input', draw);
  draw();
}

async function wordDetail(id) {
  const v = (await Data.vocab()).find(x => x.id === id);
  if (!v) return;
  const saved = !!Store.state.savedWords[id];
  const c = openSheet(`<div class="vdetail">
    ${imgBox(v.img || v.word, v.emoji || '🔤', { credit: true })}
    <div class="word-big">${esc(v.word)}</div>
    <p><i class="muted">${esc(v.pos)}</i> · ${levelBadge(v.level || 'A2')}</p>
    <p class="ipa">🇺🇸 ${esc(v.ipaUS)} <button class="chip" data-say="${esc(v.word)}" data-lang="en-US">🔊 Mỹ</button></p>
    <p class="ipa">🇬🇧 ${esc(v.ipaUK || v.ipaUS)} <button class="chip" data-say="${esc(v.word)}" data-lang="en-GB">🔊 Anh</button></p>
    <p style="font-size:1.15rem"><b>${esc(v.vi)}</b></p>
    ${v.example ? `<div class="card"><p>${esc(v.example)} <button class="chip" data-say="${esc(v.example)}">🔊</button></p><p class="muted">${esc(v.exampleVi || '')}</p></div>` : ''}
    ${Grammar.wordUsage(v)}
    <div class="row" style="margin-top:12px"><button class="btn" id="wPr">🎙️ Luyện phát âm</button>
      <button class="btn secondary" id="wSave">${saved ? '⭐ Đã lưu' : '☆ Lưu từ'}</button></div>
    <div class="pp" style="margin-top:12px"></div></div>`);
  Speech.speak(v.word);
  $('#wPr', c).onclick = () => { practicePanel($('.pp', c), { en: v.word, ipa: v.ipaUS, vi: v.vi }); $('.pp', c).scrollIntoView({ behavior: 'smooth' }); };
  $('#wSave', c).onclick = () => {
    const s = Store.state.savedWords;
    if (s[id]) delete s[id]; else s[id] = true;
    Store.save();
    $('#wSave', c).textContent = s[id] ? '⭐ Đã lưu' : '☆ Lưu từ';
  };
}

async function flashView() {
  setTitle('Ôn thẻ từ vựng');
  const vocab = (await Data.vocab()).filter(v => vocabTopic === 'all' || v.topic === vocabTopic);
  const due = vocab.filter(v => SRS.isDue(v.id));
  const fresh = vocab.filter(v => SRS.isNew(v.id));
  let queue = [...shuffle(due), ...fresh.slice(0, 10)];
  let shown = 0;
  const total = queue.length;
  if (!queue.length) {
    view.innerHTML = `<div class="empty"><div style="font-size:3rem">🎉</div><p>Không còn thẻ cần ôn trong mục này. Quay lại vào ngày mai nhé!</p>
      <a class="btn" href="#/vocab">Về trang từ vựng</a></div>`;
    return;
  }

  function render() {
    if (!queue.length) {
      view.innerHTML = `<div class="empty"><div style="font-size:3rem">✅</div><p>Hoàn thành ${total} thẻ! Các từ sẽ được nhắc ôn lại đúng lúc sắp quên.</p>
        <a class="btn" href="#/vocab">Về trang từ vựng</a></div>`;
      return;
    }
    const v = queue[0];
    view.innerHTML = `<div class="progress dark"><i style="width:${shown / (total || 1) * 100}%"></i></div>
      <p class="muted small">Còn ${queue.length} thẻ ${SRS.isNew(v.id) ? '· <span class="badge">Từ mới</span>' : ''}</p>
      <div class="flash"><div class="face">
        ${imgBox(v.img || v.word, v.emoji || '🔤', { cls: 'fimg' })}
        <div class="word-big">${esc(v.word)}</div>
        <button class="chip" data-say="${esc(v.word)}">🔊 Nghe</button>
        <div id="back" hidden>
          <p class="ipa">${esc(v.ipaUS)}</p><p style="font-size:1.2rem"><b>${esc(v.vi)}</b></p>
          ${v.example ? `<p>${esc(v.example)} <button class="chip" data-say="${esc(v.example)}">🔊</button></p><p class="muted small">${esc(v.exampleVi || '')}</p>` : ''}
          <div style="text-align:left">${Grammar.wordUsage(v)}</div>
        </div></div></div>
      <button class="btn block" id="flip" style="margin-top:12px">🔄 Lật thẻ — bạn có nhớ nghĩa không?</button>
      <div class="rate" id="rate" hidden>
        <button class="btn bad" data-q="1">😵<span>Quên</span></button>
        <button class="btn warn" data-q="3">😐<span>Khó</span></button>
        <button class="btn" data-q="4">🙂<span>Nhớ</span></button>
        <button class="btn ok" data-q="5">😎<span>Dễ</span></button>
      </div>`;
    Img.hydrate(view);
    Speech.speak(v.word);
    $('#flip').onclick = () => { $('#back').hidden = false; $('#flip').hidden = true; $('#rate').hidden = false; };
    $$('#rate [data-q]').forEach(b => b.onclick = () => {
      const q = +b.dataset.q;
      SRS.review(v.id, q);
      queue.shift();
      if (q < 3) queue.push(v); else shown++;
      render();
    });
  }
  render();
}

async function picQuizView() {
  setTitle('Nghe & chọn ảnh');
  const vocab = (await Data.vocab()).filter(v => vocabTopic === 'all' || v.topic === vocabTopic);
  const pool = vocab.length >= 4 ? vocab : await Data.vocab();
  const rounds = shuffle(pool).slice(0, 10);
  let idx = 0, score = 0;

  function render() {
    if (idx >= rounds.length) {
      Store.activity(3);
      view.innerHTML = `<div class="empty"><div style="font-size:3rem">🏁</div><h2>Bạn đúng ${score}/${rounds.length}</h2>
        <div class="row" style="justify-content:center"><button class="btn" id="again">🔁 Chơi lại</button><a class="btn secondary" href="#/vocab">Từ vựng</a></div></div>`;
      $('#again').onclick = picQuizView;
      return;
    }
    const v = rounds[idx];
    const opts = shuffle([v, ...shuffle(pool.filter(x => x.id !== v.id)).slice(0, 3)]);
    view.innerHTML = `<p class="muted small">Câu ${idx + 1}/${rounds.length} · Đúng ${score}</p>
      <h2>🎧 Nghe và chọn hình đúng</h2>
      <button class="btn secondary block" data-say="${esc(v.word)}">🔊 Nghe lại</button>
      <div class="vgrid" style="grid-template-columns:1fr 1fr;margin-top:12px">${opts.map(o => `<button class="vcard" data-pick="${o.id}">
        ${imgBox(o.img || o.word, o.emoji || '🔤')}<div class="t muted small lbl" hidden>${esc(o.word)}</div></button>`).join('')}</div>
      <div id="fb"></div>`;
    Img.hydrate(view);
    Speech.speak(v.word);
    $$('[data-pick]').forEach(b => b.onclick = () => {
      if ($('#fb').innerHTML) return;
      const ok = b.dataset.pick === v.id;
      if (ok) score++;
      $$('.lbl').forEach(l => l.hidden = false);
      $$('[data-pick]').forEach(x => x.style.outline = x.dataset.pick === v.id ? '4px solid var(--ok)' : (x === b ? '4px solid var(--bad)' : ''));
      $('#fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}">${ok ? '✅ Đúng!' : '❌ Chưa đúng.'} <b>${esc(v.word)}</b> ${esc(v.ipaUS)} – ${esc(v.vi)}</div>
        <button class="btn block" style="margin-top:10px" id="nx">Tiếp ▶</button>`;
      $('#nx').onclick = () => { idx++; render(); };
    });
  }
  render();
}

// ---------- Luyện nói ----------
let speakSource = 'survival';
async function speakView() {
  setTitle('Luyện nói');
  let items = [];
  if (speakSource === 'survival') items = await Data.survival();
  if (speakSource === 'saved') items = Object.values(Store.state.savedLines);
  if (speakSource === 'random') {
    const files = await Data.allTopicFiles();
    items = shuffle(files.flatMap(t => t.situations.flatMap(s => s.dialogue))).slice(0, 30);
  }
  let i = 0;
  view.innerHTML = `
    <div class="chips">
      <button class="chip ${speakSource === 'survival' ? 'on' : ''}" data-src="survival">🆘 Câu cứu nguy</button>
      <button class="chip ${speakSource === 'random' ? 'on' : ''}" data-src="random">🎲 Ngẫu nhiên từ bài học</button>
      <button class="chip ${speakSource === 'saved' ? 'on' : ''}" data-src="saved">⭐ Câu đã lưu</button>
    </div>
    ${!Speech.canRecognize() ? NOT_SUPPORTED : ''}
    <div id="sp"></div>
    <p class="center"><a href="#/notes">⭐ Mở sổ tay</a></p>`;
  $$('[data-src]', view).forEach(b => b.onclick = () => { speakSource = b.dataset.src; speakView(); });

  function draw() {
    const box = $('#sp');
    if (!items.length) { box.innerHTML = '<div class="empty">Chưa có câu nào. Bấm ⭐ ở các câu hội thoại để lưu vào đây.</div>'; return; }
    box.innerHTML = `<div class="card"><p class="muted small">Câu ${i + 1}/${items.length}</p><div class="pp"></div>
      <div class="row" style="margin-top:14px"><button class="btn ghost" id="prev">◀ Trước</button><button class="btn" id="nextS">Câu tiếp ▶</button></div></div>`;
    practicePanel($('.pp', box), items[i]);
    $('#prev').onclick = () => { i = (i - 1 + items.length) % items.length; draw(); };
    $('#nextS').onclick = () => { i = (i + 1) % items.length; draw(); };
  }
  draw();
}

async function notesView() {
  setTitle('Sổ tay');
  const st = Store.state;
  const vocab = await Data.vocab();
  const lines = Object.entries(st.savedLines);
  const words = vocab.filter(v => st.savedWords[v.id]);
  view.innerHTML = `<h2>💬 Câu đã lưu (${lines.length})</h2>
    ${lines.length ? lines.map(([id, l]) => `<div class="line" data-id="${esc(id)}"><div class="en">${esc(l.en)}</div><div class="ipa">${esc(l.ipa || '')}</div><div class="vi">${esc(l.vi)}</div>
      ${st.settings.showGrammar !== false ? Grammar.html(l.en) : ''}
      <div class="acts"><button data-say="${esc(l.en)}">🔊</button><button data-practice="${esc(l.en)}" data-ipa="${esc(l.ipa || '')}" data-vi="${esc(l.vi)}">🎙️</button>
      <a class="btn ghost" style="min-height:42px;padding:6px 12px" href="${esc(l.ref)}">Mở bài</a><button data-del="${esc(id)}">🗑️</button></div></div>`).join('')
      : '<div class="empty">Bấm ⭐ ở câu hội thoại để lưu.</div>'}
    <h2>🔤 Từ đã lưu (${words.length})</h2>
    ${words.length ? `<div class="vgrid">${words.map(v => `<button class="vcard" data-word="${v.id}">${imgBox(v.img || v.word, v.emoji || '🔤')}
      <div class="t"><b>${esc(v.word)}</b><div class="muted small">${esc(v.vi)}</div></div></button>`).join('')}</div>`
      : '<div class="empty">Mở một từ vựng và bấm “Lưu từ”.</div>'}`;
  Img.hydrate(view);
  $$('[data-del]', view).forEach(b => b.onclick = () => { delete st.savedLines[b.dataset.del]; Store.save(); notesView(); });
}

async function survivalView() {
  setTitle('Câu cứu nguy');
  const items = await Data.survival();
  const cats = [...new Set(items.map(x => x.cat))];
  view.innerHTML = `<p class="muted">Bấm 📢 để hiện câu thật to cho người bản xứ đọc, hoặc 🔊 để điện thoại đọc giúp bạn.</p>
    ${cats.map(c => `<h2>${esc(c)}</h2>` + items.filter(x => x.cat === c).map(x => `
      <div class="line"><div class="en">${esc(x.en)}</div><div class="ipa">${esc(x.ipa)}</div><div class="vi">${esc(x.vi)}</div>
      ${Store.state.settings.showGrammar !== false ? Grammar.html(x.en) : ''}
      <div class="acts"><button data-say="${esc(x.en)}">🔊</button><button data-say="${esc(x.en)}" data-rate="0.6">🐢</button>
      <button data-practice="${esc(x.en)}" data-ipa="${esc(x.ipa)}" data-vi="${esc(x.vi)}">🎙️</button>
      <button data-show="${esc(x.en)}" data-vi="${esc(x.vi)}">📢 Cho người khác xem</button></div></div>`).join('')).join('')}`;
}

// ---------- Cá nhân & cài đặt ----------
async function meView() {
  setTitle('Cá nhân & Cài đặt');
  const st = Store.state, s = st.settings;
  const vocab = await Data.vocab().catch(() => []);
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, label]) => `<button data-set="${key}" data-v="${v}" class="${String(s[key]) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
  view.innerHTML = `
    <div class="card"><h3 style="margin-top:0">📊 Thống kê</h3>
      <div class="set-row"><span>🔥 Chuỗi ngày học</span><b>${Store.streak()} ngày</b></div>
      <div class="set-row"><span>🎙️ Lượt chấm phát âm</span><b>${st.stats.spoken}</b></div>
      <div class="set-row"><span>⭐ Điểm phát âm trung bình</span><b>${Store.avgScore() || '–'}</b></div>
      <div class="set-row"><span>🔤 Từ đã thuộc</span><b>${vocab.filter(v => SRS.isLearned(v.id)).length}/${vocab.length}</b></div>
      <div class="set-row"><span>✅ Tình huống đã làm bài tập</span><b>${Object.keys(st.done).length}</b></div>
    </div>
    <div class="card"><h3 style="margin-top:0">⚙️ Cài đặt</h3>
      <div class="set-row"><span>Giọng mặc định</span>${seg('accent', [['en-US', '🇺🇸 Mỹ'], ['en-GB', '🇬🇧 Anh']])}</div>
      <div class="set-row"><span>Giọng đọc Mỹ</span><select id="vUS"></select></div>
      <div class="set-row"><span>Giọng đọc Anh</span><select id="vUK"></select></div>
      <div class="set-row"><span>Tốc độ đọc</span>${seg('rate', [['0.7', 'Chậm'], ['0.9', 'Vừa'], ['1', 'Chuẩn']])}</div>
      <div class="set-row"><span>Hiện nghĩa tiếng Việt</span>${seg('showVi', [['true', 'Hiện'], ['false', 'Ẩn (bấm để xem)']])}</div>
      <div class="set-row"><span>Phân tích ngữ pháp dưới mỗi câu</span>${seg('showGrammar', [['true', 'Hiện'], ['false', 'Ẩn']])}</div>
      <div class="set-row"><span>Mục tiêu mỗi ngày</span>${seg('goal', [['10', '10'], ['20', '20'], ['40', '40']])}</div>
      <div class="set-row"><span>Giao diện</span>${seg('theme', [['auto', 'Tự động'], ['light', 'Sáng'], ['dark', 'Tối']])}</div>
      <div class="set-row"><span>Cỡ chữ</span>${seg('size', [['normal', 'Vừa'], ['large', 'Lớn']])}</div>
      <button class="btn secondary block" style="margin-top:10px" id="testVoice">🔊 Nghe thử giọng</button>
    </div>
    <div class="card"><h3 style="margin-top:0">📲 Cài đặt & Offline</h3>
      ${isStandalone() ? '<p>✅ App đã được cài trên màn hình chính.</p>' : '<button class="btn block" data-install>📲 Cài lên màn hình chính</button>'}
      <button class="btn secondary block" style="margin-top:8px" id="offline">⬇️ Tải toàn bộ bài học để dùng offline</button>
      <button class="btn ghost block" style="margin-top:8px" id="offlineImg">🖼️ Tải cả ảnh từ vựng (cần Wi-Fi)</button>
      <p class="small muted" id="offMsg"></p></div>
    <div class="card"><h3 style="margin-top:0">💾 Sao lưu tiến độ</h3>
      <p class="small muted">Tiến độ được lưu trên máy này. Hãy xuất file sao lưu nếu muốn chuyển sang máy khác.</p>
      <div class="row"><button class="btn secondary" id="exp">⬆️ Xuất file</button>
      <label class="btn secondary" style="cursor:pointer">⬇️ Nhập file<input type="file" id="imp" accept="application/json,.json" hidden></label></div>
      <button class="btn ghost block" style="margin-top:8px;color:var(--bad)" id="reset">🗑️ Xóa toàn bộ tiến độ</button></div>
    <p class="center small muted">TravelTalk · Ảnh: Wikimedia Commons · Giọng đọc: giọng có sẵn trên thiết bị</p>`;

  const fillVoices = () => {
    [['vUS', 'en-US', 'voiceUS'], ['vUK', 'en-GB', 'voiceUK']].forEach(([el, lang, key]) => {
      const sel = $('#' + el);
      if (!sel) return;
      const vs = Speech.englishVoices(lang);
      sel.innerHTML = '<option value="">Tự chọn tốt nhất</option>' + vs.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === s[key] ? 'selected' : ''}>${esc(v.name)}</option>`).join('');
      sel.onchange = () => { s[key] = sel.value; Store.save(); Speech.speak('Welcome to London. Enjoy your trip!', { lang }); };
    });
  };
  fillVoices();
  if (Speech.hasTTS) speechSynthesis.addEventListener('voiceschanged', fillVoices, { once: true });

  $$('[data-set]', view).forEach(b => b.onclick = () => {
    const k = b.dataset.set, v = b.dataset.v;
    s[k] = k === 'rate' ? parseFloat(v) : k === 'goal' ? parseInt(v, 10) : (k === 'showVi' || k === 'showGrammar') ? v === 'true' : v;
    Store.save(); applyTheme(); meView();
  });
  $('#testVoice').onclick = () => Speech.speak('Hello! Could I have a window seat, please?');
  $('#exp').onclick = () => Store.exportFile();
  $('#imp').onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try { Store.importText(await f.text()); applyTheme(); toast('✅ Đã nhập dữ liệu'); meView(); }
    catch (err) { toast('❌ File không hợp lệ'); }
  };
  $('#reset').onclick = () => {
    if (confirm('Xóa toàn bộ tiến độ, điểm và sổ tay? Không thể hoàn tác.')) { Store.reset(); applyTheme(); toast('Đã xóa tiến độ'); meView(); }
  };
  $('#offline').onclick = async () => {
    const msg = $('#offMsg');
    msg.textContent = 'Đang tải…';
    try {
      const files = await Data.allTopicFiles();
      await Promise.all([Data.vocab(), Data.survival()]);
      msg.textContent = `✅ Đã tải ${files.length} chủ đề, từ vựng và câu cứu nguy. Có thể học khi không có mạng (trừ chấm điểm giọng nói).`;
    } catch (e) { msg.textContent = '❌ Lỗi tải: ' + e.message; }
  };
  $('#offlineImg').onclick = async () => {
    const msg = $('#offMsg');
    let n = 0;
    for (const v of vocab) {
      const info = await Img.find(v.img || v.word);
      if (info) { try { await fetch(info.src, { mode: 'no-cors' }); } catch (e) {} }
      msg.textContent = `Đang tải ảnh ${++n}/${vocab.length}…`;
    }
    msg.textContent = '✅ Đã tải ảnh từ vựng để dùng offline.';
  };
}

// ================= Điều hướng =================
const routes = [
  [/^#\/?$/, homeView, 'home'],
  [/^#\/learn$/, learnView, 'learn'],
  [/^#\/topic\/([\w-]+)$/, topicView, 'learn'],
  [/^#\/sit\/([\w-]+)\/([\w-]+)$/, situationView, 'learn'],
  [/^#\/ex\/([\w-]+)\/([\w-]+)$/, exerciseView, 'learn'],
  [/^#\/read\/([\w-]+)\/(\d+)$/, readingView, 'learn'],
  [/^#\/write\/([\w-]+)\/(\d+)$/, writingView, 'learn'],
  [/^#\/vocab(?:\/([\w-]+))?$/, vocabView, 'vocab'],
  [/^#\/flash$/, flashView, 'vocab'],
  [/^#\/picquiz$/, picQuizView, 'vocab'],
  [/^#\/speak$/, speakView, 'speak'],
  [/^#\/notes$/, notesView, 'speak'],
  [/^#\/survival$/, survivalView, 'home'],
  [/^#\/me$/, meView, 'me']
];
const ROOTS = ['#/', '#/learn', '#/vocab', '#/speak', '#/me'];

async function router() {
  run++;
  Speech.stopSpeaking();
  closeSheet(true);
  $('#showNative').hidden = true;
  const hash = location.hash || '#/';
  for (const [re, fn, tab] of routes) {
    const m = hash.match(re);
    if (!m) continue;
    $$('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    $('#backBtn').hidden = ROOTS.includes(hash);
    // Thay main bằng bản sao để gỡ mọi sự kiện cũ
    const fresh = view.cloneNode(false);
    view.replaceWith(fresh);
    view = fresh;
    fresh.innerHTML = '<div class="empty">Đang tải…</div>';
    try {
      await fn(...m.slice(1));
    } catch (e) {
      console.error(e);
      fresh.innerHTML = `<div class="empty">😕 Không tải được nội dung.${navigator.onLine ? '' : '<br>Bạn đang offline — hãy mở bài này một lần khi có mạng.'}<br><small>${esc(e.message)}</small></div>`;
    }
    window.scrollTo(0, 0);
    return;
  }
  location.hash = '#/';
}

function applyTheme() {
  const s = Store.state.settings, root = document.documentElement;
  if (s.theme === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = s.theme;
  root.dataset.size = s.size;
}

// Sự kiện dùng chung toàn app
document.addEventListener('click', e => {
  const say = e.target.closest('[data-say]');
  if (say) {
    e.preventDefault();
    run++;
    Speech.speak(say.dataset.say, { rate: say.dataset.rate ? parseFloat(say.dataset.rate) : undefined, lang: say.dataset.lang });
    return;
  }
  const pr = e.target.closest('[data-practice]');
  if (pr) { openPractice({ en: pr.dataset.practice, ipa: pr.dataset.ipa, vi: pr.dataset.vi }); return; }
  const show = e.target.closest('[data-show]');
  if (show) { showNative(show.dataset.show, show.dataset.vi); return; }
  const word = e.target.closest('[data-word]');
  if (word) { wordDetail(word.dataset.word); return; }
  if (e.target.closest('[data-install]')) { installHelp(); return; }
  if (e.target.closest('[data-close]')) closeSheet(false);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(false); });
$('#backBtn').onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/'; };

window.addEventListener('hashchange', router);
applyTheme();
router();

if ('serviceWorker' in navigator) {
  // Khi có phiên bản mới (đã tải lên GitHub), tự tải lại trang một lần để dùng bản mới ngay
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
}
