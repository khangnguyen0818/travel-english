// Phân tích cấu trúc ngữ pháp tự động cho từng câu tiếng Anh, giải thích bằng tiếng Việt
// (loại câu, thì, động từ khuyết thiếu, bị động, các mẫu câu hay gặp) và lý do dùng cấu trúc đó.
const Grammar = (() => {
  // Động từ bất quy tắc: nguyên mẫu – quá khứ (V2) – quá khứ phân từ (V3)
  const IRREGULAR = `be was/were been|have had had|do did done|go went gone|get got got/gotten|take took taken|make made made|
come came come|see saw seen|give gave given|know knew known|think thought thought|tell told told|say said said|
find found found|leave left left|buy bought bought|bring brought brought|pay paid paid|put put put|lose lost lost|
steal stole stolen|break broke broken|eat ate eaten|drink drank drunk|fall fell fallen|feel felt felt|forget forgot forgotten|
begin began begun|send sent sent|spend spent spent|sleep slept slept|keep kept kept|meet met met|ride rode ridden|
run ran run|sit sat sat|stand stood stood|speak spoke spoken|write wrote written|wear wore worn|throw threw thrown|
choose chose chosen|drive drove driven|fly flew flown|grow grew grown|hear heard heard|hold held held|hurt hurt hurt|
let let let|read read read|sell sold sold|build built built|catch caught caught|teach taught taught|win won won|
understand understood understood|freeze froze frozen|swim swam swum|set set set|cost cost cost|cut cut cut|
fit fit fit|lie lay lain|show showed shown|wake woke woken|hang hung hung|light lit lit|mean meant meant`
    .split('|').map(s => s.trim().split(' '));
  const PAST = new Set(), PART = new Set(), BASE = new Set(), FORMS = {};
  IRREGULAR.forEach(([b, p, pp]) => {
    BASE.add(b); FORMS[b] = `${b} – ${p} – ${pp}`;
    p.split('/').forEach(x => PAST.add(x)); pp.split('/').forEach(x => PART.add(x));
  });
  // Từ tận cùng -ed nhưng không phải động từ quá khứ / là tính từ chỉ cảm xúc, trạng thái
  const NOT_ED = new Set(('need red bed speed feed seed hundred shed wed bread head ahead instead used tired interested ' +
    'worried excited bored surprised married scared pleased relaxed crowded complicated limited unlimited detailed ' +
    'experienced talented advanced air-conditioned certified swollen supervised delighted naked wicked sacred ' +
    'hard-shell salted grilled fried mashed iced unleaded').split(' '));
  // Tính từ tận cùng -ing (không phải thì tiếp diễn): The view was amazing.
  const ING_ADJ = new Set(('amazing interesting boring exciting relaxing charming stunning disappointing surprising refreshing ' +
    'annoying confusing tiring promising welcoming outstanding shocking frightening worrying embarrassing').split(' '));
  // Từ đứng sau chủ ngữ nhưng không phải động từ (you for…, you sir, you too…)
  const NOT_AFTER_PRON = new Set(['for', 'to', 'at', 'in', 'on', 'so', 'too', 'very', 'sir', 'madam', 'and', 'or', 'the', 'a', 'an', 'all', 'both', 'guys', 'there', 'here', 'again', 'anyway', 'much']);
  const verbAfterPron = (t, k) => PRON.has(t[k]) && t[k + 1] && !BE.has(t[k + 1]) && t[k + 1] !== 'not' && !NOT_AFTER_PRON.has(t[k + 1]);
  const BE = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
  const MODALS = new Set(['can', 'could', 'will', 'would', 'may', 'might', 'should', 'must', 'shall']);
  const SUBJ = new Set(['i', 'you', 'we', 'they', 'he', 'she', 'it', 'there', 'this', 'that', 'someone', 'everyone', 'nobody', 'everything']);
  const ADVERBS = new Set(['just', 'already', 'never', 'ever', 'always', 'also', 'still', 'really', 'not', 'usually', 'often', 'only',
    'probably', 'definitely', 'actually', 'recently', 'finally', 'best', 'well', 'normally', 'sometimes', 'fully', 'all']);
  const IMPERATIVE = new Set(('go take turn put keep come try use show call wait follow press enter fill check tell give look walk ' +
    'cross get bring sit stay leave ask remember enjoy make pay wear read write open close choose move swim avoid insert select ' +
    'buy return contact send scan stand hold drink eat meet fasten switch lie stop drop wake mix speak repeat hurry relax sign ' +
    'book tap remove collect grab draw help say cover separate pass add bring dial raise sleep visit taste download consult ' +
    'keep learn note find put serve say smile mind order rent share fold strip wrap swap tick place be').split(' '));
  const FIXED = {
    'here you go': 'Cụm cố định khi đưa đồ cho ai: “Của bạn đây”.',
    'here you are': 'Cụm cố định khi đưa đồ cho ai: “Của bạn đây”.',
    'no problem': 'Cụm cố định đáp lại lời cảm ơn/nhờ vả: “Không vấn đề gì”.',
    'of course': 'Cụm cố định đồng ý lịch sự: “Dĩ nhiên rồi”.',
    'got it': 'Viết tắt của “I’ve got it” – văn nói thân mật: “Hiểu rồi”.',
    'no worries': 'Cụm cố định thân mật (Úc, Anh): “Không sao đâu”.',
    'thank you': 'Cụm cố định cảm ơn. Muốn nói cảm ơn vì điều gì: Thank you for + N / V-ing.',
    'thanks': 'Cách cảm ơn thân mật, ngắn gọn.',
    'excuse me': 'Mở đầu để gây chú ý lịch sự trước khi hỏi/nhờ người lạ.',
    'nice to meet you': 'Câu chào khi gặp lần đầu (rút gọn của “It’s nice to meet you”).',
    'take care': 'Câu chào tạm biệt thân thiện (dạng mệnh lệnh mang nghĩa chúc).',
    'you too': 'Đáp lại lời chúc: “Bạn cũng vậy”.',
    'not at all': 'Đáp lại “Would you mind…?/Do you mind…?” khi đồng ý: “Không phiền gì”.',
    'my mistake': 'Cụm rút gọn nhận lỗi: “(Đó là) lỗi của tôi”.',
    'deal': 'Một từ thay cho cả câu “It’s a deal” – chốt thỏa thuận.',
    'cheers': 'Cụm thân mật (Anh/Úc): “Cạn ly” hoặc “Cảm ơn”.',
    'sure': 'Một từ thay cho câu đồng ý: “Được chứ”.',
    'i see': 'Cụm cố định: “Tôi hiểu rồi” (see ở đây = hiểu).',
    'good for you': 'Cụm cố định khen ngợi, chúc mừng: “Hay quá / Tốt cho bạn”.',
    'good idea': 'Rút gọn của “That’s a good idea” – đồng ý với đề xuất.',
    'oh no': 'Câu cảm thán khi gặp chuyện không may: “Ôi không!”.',
    'oh dear': 'Câu cảm thán nhẹ khi gặp chuyện không may: “Ôi trời”.',
    'great': 'Một tính từ đứng một mình thay cho câu “That’s great”.',
    'perfect': 'Một tính từ đứng một mình thay cho câu “That’s perfect”.'
  };
  const CONTR = {
    "i'm": ['i', 'am'], "you're": ['you', 'are'], "we're": ['we', 'are'], "they're": ['they', 'are'],
    "i've": ['i', 'have'], "you've": ['you', 'have'], "we've": ['we', 'have'], "they've": ['they', 'have'],
    "i'll": ['i', 'will'], "you'll": ['you', 'will'], "we'll": ['we', 'will'], "they'll": ['they', 'will'],
    "he'll": ['he', 'will'], "she'll": ['she', 'will'], "it'll": ['it', 'will'], "that'll": ['that', 'will'],
    "i'd": ['i', 'would'], "you'd": ['you', 'would'], "we'd": ['we', 'would'], "they'd": ['they', 'would'],
    "he'd": ['he', 'would'], "she'd": ['she', 'would'],
    "don't": ['do', 'not'], "doesn't": ['does', 'not'], "didn't": ['did', 'not'], "can't": ['can', 'not'], "cannot": ['can', 'not'],
    "won't": ['will', 'not'], "isn't": ['is', 'not'], "aren't": ['are', 'not'], "wasn't": ['was', 'not'], "weren't": ['were', 'not'],
    "couldn't": ['could', 'not'], "wouldn't": ['would', 'not'], "shouldn't": ['should', 'not'], "haven't": ['have', 'not'],
    "hasn't": ['has', 'not'], "mustn't": ['must', 'not'], "let's": ['let', 'us']
  };
  // Động từ thường gặp (để nhận ra động từ chia -s như looks, includes, costs…)
  const VERBS = new Set([...IMPERATIVE, ...BASE, ...('include depend arrive start need work open close leave cost mean seem sound ' +
    'feel look like love want know live happen serve offer accept change run stop sell contain fit cover require expect plan ' +
    'prefer recommend suggest understand hope think believe matter belong apply allow sound taste smell stay run cause ' +
    'happen remain become agree look come go last depart begin end finish work hurt apply matter').split(' ')]);
  const isVerbS = w => w.length > 3 && /s$/.test(w) && !/ss$/.test(w) && w !== 'has' && w !== 'does' && w !== 'is' &&
    (VERBS.has(w.replace(/es$/, '')) || VERBS.has(w.replace(/s$/, '')) || VERBS.has(w.replace(/ies$/, 'y')));
  const PRON = new Set(['i', 'you', 'we', 'they', 'he', 'she', 'it', 'someone', 'everyone', 'nobody', 'everything', 'nothing']);
  const isV3 = w => PART.has(w) || (w.length > 4 && w.endsWith('ed') && !NOT_ED.has(w));
  // let/put/cut/cost… quá khứ giống nguyên mẫu: chỉ coi là quá khứ khi có dấu hiệu thời gian quá khứ
  const SAME_FORM = new Set([...PAST].filter(w => BASE.has(w)));
  const isV2 = (w, low = '') => (PAST.has(w) && (!SAME_FORM.has(w) || /\b(yesterday|ago|last)\b/.test(low))) ||
    (w.length > 4 && w.endsWith('ed') && !NOT_ED.has(w));
  const isIng = w => w.length > 4 && w.endsWith('ing');

  function tokenize(s) {
    const raw = s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\- ]/g, ' ').split(/\s+/).filter(Boolean);
    const out = [];
    raw.forEach(w => {
      w = w.replace(/^'+|'+$/g, '');
      if (!w) return;
      if (CONTR[w]) out.push(...CONTR[w]);
      else if (/^(it|that|there|here|what|where|who|how|he|she|name|when|everything|nothing)'s$/.test(w)) out.push(w.slice(0, -2), 'is');
      else if (/^(how long|what)'s$/.test(w)) out.push(w.slice(0, -2), 'is');
      else if (/'s$/.test(w)) out.push(w.slice(0, -2)); // sở hữu cách
      else out.push(w);
    });
    for (let i = 0; i < out.length; i++) {
      // “a can of Coke”: can là danh từ (cái lon), không phải động từ khuyết thiếu
      if (out[i] === 'can' && ['a', 'the', 'two', 'three'].includes(out[i - 1])) out[i] = 'can-noun';
    }
    for (let i = 0; i < out.length - 1; i++) {
      // it's been / he's gone → has; I'd booked / I'd better → had
      if (out[i] === 'is' && (out[i + 1] === 'been' || out[i + 1] === 'got')) out[i] = 'has';
      if (out[i] === 'would' && (out[i + 1] === 'better' || (isV3(out[i + 1]) && !BASE.has(out[i + 1])))) out[i] = 'had';
    }
    return out;
  }

  // Bỏ các từ mở đầu xã giao để tìm phần chính của câu
  const LEAD = new Set(['so', 'and', 'but', 'oh', 'ok', 'okay', 'well', 'hi', 'hello', 'yes', 'no', 'sorry', 'great', 'thanks',
    'please', 'just', 'then', 'now', 'first', 'also', 'sure', 'right', 'good', 'morning', 'afternoon', 'evening',
    'perfect', 'wonderful', 'hmm', 'ah', 'ha', 'dear', 'madam', 'sir', 'everyone', 'actually', 'luckily', 'unfortunately', 'meanwhile', 'otherwise']);

  // Bỏ các từ chào/đệm ở đầu (Hi, Excuse me, Thank you, Just…) để thấy phần chính
  function stripLead(t) {
    const r = [...t];
    for (;;) {
      if ((r[0] === 'thank' && r[1] === 'you') || (r[0] === 'excuse' && r[1] === 'me') || (r[0] === 'at' && r[1] === 'least')) { r.splice(0, 2); continue; }
      if (r.length > 1 && r[0] === 'again') { r.shift(); continue; }
      if (r.length > 1 && LEAD.has(r[0])) { r.shift(); continue; }
      return r;
    }
  }

  function mainClause(sentence) {
    const segs = sentence.split(/[,;–—:]/).map(x => x.trim()).filter(Boolean);
    for (const seg of segs) {
      const t = stripLead(tokenize(seg));
      if (!t.length) continue;
      if (t.every(w => LEAD.has(w) || w === 'thank' || w === 'you' || w === 'excuse' || w === 'me')) continue;
      return { seg, t };
    }
    return { seg: sentence, t: stripLead(tokenize(sentence)) };
  }

  const item = (tag, formula, why) => ({ tag, formula, why });

  const AUXQ = new Set(['do', 'does', 'did', 'have', 'has', ...BE, ...MODALS]);
  const WHW = new Set(['what', 'where', 'when', 'why', 'who', 'which', 'how', 'whose']);

  function sentenceType(sentence, all) {
    const isQ = /\?\s*$/.test(sentence);
    let { seg, t } = mainClause(sentence);
    if (isQ) {
      // câu hỏi nằm ở vế sau: “I'll have the salad, and could I get…?”
      for (const s2 of sentence.split(/[,;–—]/)) {
        const t2 = stripLead(tokenize(s2).filter(w => w !== 'and' && w !== 'but' && w !== 'or'));
        if (t2.length > 1 && (AUXQ.has(t2[0]) || WHW.has(t2[0]))) { t = t2; seg = s2; break; }
      }
    } else {
      let k = 0;
      while (ADVERBS.has(t[k]) && k < t.length - 1) k++; // “always tap in…”
      t = t.slice(k);
    }
    const segWords = tokenize(seg).length;
    const first = t[0] || '', second = t[1] || '';
    const joined = all.join(' ');
    if (isQ) {
      if (/\b(do you know|could you tell me|can you tell me|could you show me|can you show me|i wonder)\b.*\b(where|what|when|how|why|who|which|if|whether)\b/.test(joined)) {
        return item('Câu hỏi gián tiếp', '… + từ để hỏi + S + V (không đảo)', 'Hỏi lịch sự hơn bằng cách lồng câu hỏi vào “Do you know…/Could you tell me…”. Phần sau giữ trật tự câu khẳng định: “where the station is”, không nói “where is the station”.');
      }
      const WH = { what: 'cái gì', where: 'ở đâu', when: 'khi nào', why: 'tại sao', who: 'ai', which: 'cái nào', how: 'như thế nào', whose: 'của ai' };
      if (WH[first]) {
        const HOW = { much: 'How much = bao nhiêu (giá tiền, danh từ không đếm được)', many: 'How many = bao nhiêu (danh từ đếm được)', long: 'How long = bao lâu', far: 'How far = bao xa', old: 'How old = bao nhiêu tuổi', often: 'How often = bao lâu một lần' };
        const extra = first === 'how' && HOW[second] ? ` ${HOW[second]}.` : '';
        const about = first === 'what' && second === 'about' ? ' “What about…?” = Còn… thì sao? (gợi ý, hỏi tiếp).' : '';
        const subjQ = (first === 'who' || first === 'what') && t[1] && !BE.has(t[1]) && !MODALS.has(t[1]) && !['do', 'does', 'did'].includes(t[1]) && isV2(t[1])
          ? ' Ở đây “' + first + '” làm chủ ngữ nên không cần trợ động từ.' : '';
        return item(`Câu hỏi Wh- (${first[0].toUpperCase() + first.slice(1)} = ${WH[first]})`, 'Từ để hỏi + trợ động từ / be + S + V…?',
          'Dùng để hỏi thông tin cụ thể. Trợ động từ (do/does/did, can, will…) hoặc to be phải đứng TRƯỚC chủ ngữ.' + extra + about + subjQ);
      }
      const W = joined;
      if (first === 'could' || first === 'can') {
        const polite = first === 'could' ? 'Lịch sự hơn “Can” – nên dùng khi nhờ hoặc xin phép người lạ, nhân viên.' : 'Hỏi khả năng hoặc xin phép một cách thân mật (lịch sự hơn thì dùng Could).';
        const who = second === 'i' || second === 'we' ? 'xin phép / xin một thứ' : 'nhờ người khác làm giúp';
        return item(`Câu hỏi với “${first[0].toUpperCase() + first.slice(1)}” (${who})`, `${first[0].toUpperCase() + first.slice(1)} + S + V nguyên mẫu…?`, polite + ' Sau Can/Could động từ luôn ở dạng nguyên mẫu.');
      }
      if (first === 'would') {
        if (/^would you like/.test(t.join(' '))) return item('Lời mời “Would you like…?”', 'Would you like + N / to + V?', 'Cách mời hoặc hỏi ý muốn lịch sự nhất (thay cho “Do you want…?”). Trả lời: “Yes, please” / “No, thank you”.');
        if (/^would you mind/.test(t.join(' '))) return item('Nhờ vả “Would you mind…?”', 'Would you mind + V-ing?', 'Cách nhờ rất lịch sự (nghĩa đen: bạn có phiền…?). Đồng ý thì trả lời “Not at all / Of course not”.');
        return item('Câu hỏi với “Would”', 'Would + S + V…?', 'Hỏi một cách lịch sự, mang tính giả định (nếu… thì có…?).');
      }
      if (first === 'may') return item('Xin phép với “May”', 'May I/we + V…?', 'Cách xin phép trang trọng nhất, thường dùng bởi nhân viên phục vụ hoặc trong tình huống lịch sự.');
      if (first === 'shall') return item('Đề nghị với “Shall”', 'Shall we/I + V…?', 'Đưa ra lời đề nghị: “Chúng ta… nhé?”, “Tôi… nhé?”.');
      if (first === 'should') return item('Hỏi lời khuyên với “Should”', 'Should I/we + V…?', 'Hỏi xem mình có nên làm gì không – xin ý kiến người khác.');
      if (first === 'will') return item('Câu hỏi với “Will”', 'Will + S + V…?', 'Hỏi về một việc trong tương lai hoặc nhờ ai làm gì.');
      if (['do', 'does', 'did'].includes(first)) {
        const when = first === 'did' ? 'quá khứ (did)' : first === 'does' ? 'hiện tại, chủ ngữ số ít ngôi 3 (does)' : 'hiện tại (do)';
        const mind = /^do you mind if/.test(t.join(' ')) ? ' “Do you mind if I…?” = Bạn có phiền nếu tôi…? (xin phép lịch sự).' : '';
        return item('Câu hỏi Có/Không với trợ động từ', `${first[0].toUpperCase() + first.slice(1)} + S + V nguyên mẫu…?`, `Động từ thường không tự đảo lên được nên phải mượn trợ động từ – ở đây là ${when}. Động từ chính trở về nguyên mẫu.${mind}`);
      }
      if (BE.has(first)) {
        const there = second === 'there' ? ' “Is/Are there…?” = Có… không?' : '';
        return item('Câu hỏi Có/Không với “to be”', `${first[0].toUpperCase() + first.slice(1)} + S + …?`, 'Với động từ to be, chỉ cần đưa am/is/are/was/were lên trước chủ ngữ.' + there);
      }
      if (first === 'have' || first === 'has') return item('Câu hỏi thì hiện tại hoàn thành', 'Have/Has + S + V3…?', 'Hỏi đã từng/đã làm việc gì chưa (kinh nghiệm hoặc kết quả đến hiện tại).');
      return item('Câu hỏi rút gọn', 'Cụm từ + lên giọng?', 'Trong văn nói, có thể hỏi chỉ bằng một cụm từ và lên giọng ở cuối, không cần câu đầy đủ.');
    }
    const lc = t.join(' ');
    if (first === 'let' && second === 'us') return item('Rủ rê với “Let’s”', "Let's + V nguyên mẫu", 'Đề nghị cả hai/cả nhóm cùng làm: “Chúng ta hãy…”.');
    if (first === 'let' && second === 'me') return item('Đề nghị với “Let me”', 'Let me + V nguyên mẫu', 'Đề nghị TỰ MÌNH làm gì cho người kia: “Để tôi…”.');
    if (first === 'do' && second === 'not' && !/\?$/.test(sentence)) return item('Câu mệnh lệnh phủ định', "Don't + V nguyên mẫu", 'Khuyên hoặc yêu cầu ai ĐỪNG làm gì. Không có chủ ngữ.');
    if (/^(have a|enjoy)\b/.test(lc)) return item('Câu chúc', 'Have a + (adj) + N! / Enjoy + N!', 'Dùng dạng mệnh lệnh để chúc: “Have a nice day!”, “Enjoy your meal!”.');
    if (IMPERATIVE.has(first) && !SUBJ.has(first) && segWords > 1) {
      const please = /\bplease\b/.test(all.join(' ')) ? ' Có “please” nên là yêu cầu lịch sự.' : '';
      return item('Câu mệnh lệnh / hướng dẫn', 'V nguyên mẫu + …', 'Bỏ chủ ngữ, bắt đầu bằng động từ nguyên mẫu – dùng khi chỉ đường, hướng dẫn, yêu cầu.' + please);
    }
    return null;
  }

  function hasFiniteVerb(t) {
    if (t.some(w => BE.has(w) || MODALS.has(w) || ['do', 'does', 'did', 'have', 'has', 'had'].includes(w) || PAST.has(w) || isVerbS(w))) return true;
    for (let i = 0; i < t.length - 1; i++) if (verbAfterPron(t, i)) return true;
    return t.some(w => w.length > 4 && w.endsWith('ed') && !NOT_ED.has(w));
  }

  function tense(t, low) {
    const futureWords = /\b(tomorrow|tonight|next|later|this (afternoon|evening|weekend|morning)|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in \w+ (days|hours|minutes))\b/.test(low);
    const skipAdv = i => { let j = i; while (ADVERBS.has(t[j])) j++; return j; };
    for (let i = 0; i < t.length; i++) {
      const w = t[i];
      if (w === 'will' || w === 'shall') {
        let j = skipAdv(i + 1);
        if (PRON.has(t[j]) && t[j + 1] === 'be') j++; // Where will you be staying?
        if (t[j] === 'be' && isIng(t[j + 1] || '')) return item('Tương lai tiếp diễn', 'will be + V-ing', 'Nói hoặc hỏi lịch sự về một kế hoạch sẽ đang diễn ra trong tương lai.');
        if (t[j] === 'be' && isV3(t[j + 1] || '')) return null; // để phần bị động giải thích
        const neg = t[i + 1] === 'not' ? ' Phủ định: will not = won’t.' : '';
        return item('Tương lai đơn', "will ('ll) + V nguyên mẫu", 'Dùng cho quyết định ngay lúc nói, lời hứa, lời đề nghị giúp đỡ, hoặc dự đoán.' + neg);
      }
      if (BE.has(w) && t[i + 1] === 'going' && t[i + 2] === 'to') return item('Tương lai gần', 'am/is/are going to + V', 'Nói về dự định đã có từ trước, hoặc dự đoán dựa trên dấu hiệu nhìn thấy ngay bây giờ.');
      if ((w === 'have' || w === 'has') && !(t[i + 1] === 'to')) {
        let j = skipAdv(i + 1);
        if (PRON.has(t[j]) && (isV3(t[j + 1] || '') || t[j + 1] === 'been' || ADVERBS.has(t[j + 1]))) j = skipAdv(j + 1); // How long have you felt…?
        if (t[j] === 'been' && isIng(t[j + 1] || '')) return item('Hiện tại hoàn thành tiếp diễn', 'have/has been + V-ing', 'Việc bắt đầu trong quá khứ và vẫn đang tiếp tục đến bây giờ.');
        if (t[j] === 'been' || (isV3(t[j] || '') && t[j] !== 'had') || t[j] === 'had' && t[j + 1] !== 'to') {
          const why = [];
          if (/\bfor\b/.test(low)) why.push('“for + khoảng thời gian” = được bao lâu rồi');
          if (/\bsince\b/.test(low)) why.push('“since + mốc thời gian” = từ khi');
          if (/\bjust\b/.test(low)) why.push('“just” = vừa mới');
          if (/\balready\b/.test(low)) why.push('“already” = đã… rồi');
          if (/\b(ever|never)\b/.test(low)) why.push('“ever/never” nói về kinh nghiệm');
          if (/\b(always)\b/.test(low)) why.push('“always” = luôn luôn (từ trước đến nay)');
          return item('Hiện tại hoàn thành', 'have/has + V3', 'Việc đã xảy ra nhưng kết quả còn liên quan đến hiện tại, kinh nghiệm, hoặc kéo dài đến bây giờ. Không dùng với mốc quá khứ cụ thể (yesterday, last year).' + (why.length ? ' Dấu hiệu: ' + why.join('; ') + '.' : ''));
        }
      }
      if (w === 'had' && isV3(t[i + 1] || '') && t[i + 1] !== 'to') return item('Quá khứ hoàn thành', 'had + V3', 'Việc xảy ra TRƯỚC một việc khác trong quá khứ.');
      if (BE.has(w) && w !== 'be' && w !== 'been') {
        let j = skipAdv(i + 1);
        // câu hỏi: be + chủ ngữ + V-ing (What are you having? Are we running on time?)
        if (!isIng(t[j] || '') && PRON.has(t[j]) && isIng(t[j + 1] || '')) j++;
        if (isIng(t[j] || '') && !ING_ADJ.has(t[j]) && !['morning', 'evening', 'something', 'anything', 'nothing', 'everything', 'thing', 'during', 'building'].includes(t[j])) {
          if (w === 'was' || w === 'were') return item('Quá khứ tiếp diễn', 'was/were + V-ing', 'Hành động đang diễn ra tại một thời điểm trong quá khứ – thường làm bối cảnh cho một hành động khác chen vào (quá khứ đơn).');
          return item('Hiện tại tiếp diễn', 'am/is/are + V-ing', futureWords
            ? 'Ở đây nói về KẾ HOẠCH TƯƠNG LAI đã sắp xếp chắc chắn (có thời gian tương lai đi kèm).'
            : 'Việc đang diễn ra ngay lúc nói, hoặc việc tạm thời trong giai đoạn này.');
        }
      }
    }
    if (t.includes('did')) return item('Quá khứ đơn', 'did (not) + V nguyên mẫu', 'Việc đã xảy ra và kết thúc trong quá khứ. Câu hỏi/phủ định mượn “did”, động từ chính về nguyên mẫu.');
    for (let i = 0; i < t.length; i++) {
      const w = t[i];
      if (w === 'was' || w === 'were') {
        if (isV3(t[i + 1] || '')) return item('Quá khứ đơn', 'was/were …', 'Việc/tình trạng trong quá khứ.');
        return item('Quá khứ đơn của “to be”', 'was / were + N / adj / nơi chốn', 'Mô tả trạng thái, tính chất trong quá khứ. was đi với I/he/she/it; were đi với you/we/they.');
      }
      let k = i - 1;
      while (k > 0 && ADVERBS.has(t[k])) k--; // bỏ qua not/just/already… để thấy từ đứng trước thật sự
      const prev = t[k] || '';
      if (isV2(w, low) && !BE.has(prev) && !['have', 'has', 'had', 'the', 'a', 'an', 'to', 'very', 'get', 'got'].includes(prev) && !MODALS.has(prev) && i > 0) {
        const marker = (low.match(/\b(yesterday|ago|last \w+|this morning|in \d{4})\b/) || [])[0];
        const irr = PAST.has(w) ? ` “${w}” là quá khứ bất quy tắc.` : ' Động từ có quy tắc thêm -ed.';
        return item('Quá khứ đơn', 'S + V2 / V-ed', 'Việc đã xảy ra và kết thúc trong quá khứ.' + irr + (marker ? ` Dấu hiệu thời gian: “${marker}”.` : ''));
      }
    }
    const beP = t.find(w => w === 'am' || w === 'is' || w === 'are');
    const dn = t.findIndex((w, k) => (w === 'do' || w === 'does') && t[k + 1] === 'not');
    if (dn >= 0) {
      let p = dn - 1;
      while (p >= 0 && ADVERBS.has(t[p])) p--;
      const before = t[p] || '';
      // “…, but don't worry” – không có chủ ngữ trước don't nên là mệnh lệnh phủ định
      // (does not / “why don't we” không bao giờ là mệnh lệnh)
      if (t[dn] === 'do' && !PRON.has(t[dn + 2]) && before !== 'why' && (p < 0 || !(PRON.has(before) || /s$/.test(before) || before === 'people'))) {
        return item('Mệnh lệnh phủ định', "Don't + V nguyên mẫu", 'Khuyên/bảo ai ĐỪNG làm gì; không có chủ ngữ đứng trước.');
      }
      if (before === 'why') return null; // “Why don't we…?” đã có mục gợi ý riêng
      return item('Hiện tại đơn (phủ định)', "S + don't / doesn't + V nguyên mẫu", 'Phủ định ở hiện tại mượn do/does + not; động từ chính giữ nguyên mẫu.');
    }
    if (beP && !t.some(w => MODALS.has(w))) {
      const there = /\bthere (is|are)\b/.test(t.join(' ')) ? null : item('Hiện tại đơn của “to be”', 'S + am / is / are + N / adj / nơi chốn', 'Giới thiệu, mô tả, cho biết vị trí hoặc tình trạng hiện tại. am đi với I; is với he/she/it/danh từ số ít; are với you/we/they/số nhiều.');
      return there;
    }
    if (!t.some(w => MODALS.has(w))) {
      const third = t.find((w, k) => k > 0 && isVerbS(w) && !['this', 'these', 'those', 'a', 'the', 'my', 'your', 'our', 'his', 'her'].includes(t[k - 1]));
      if (third || t.some((w, k) => verbAfterPron(t, k))) {
        const note = third ? ` Ở đây chủ ngữ số ít ngôi thứ 3 nên động từ thêm -s: “${third}”.` : '';
        return item('Hiện tại đơn', 'S + V / V(s/es)', 'Sự thật, thói quen, lịch trình hoặc cảm nghĩ hiện tại. Chủ ngữ he/she/it (số ít) thì động từ thêm -s/-es.' + note);
      }
    }
    return null;
  }

  function modals(t, low, typeTag) {
    const out = [];
    const q = typeTag || '';
    const has = w => t.includes(w);
    if (/\bwould like to\b/.test(low)) out.push(item('Mẫu “would like to”', "I'd (would) like to + V", 'Diễn đạt mong muốn một cách LỊCH SỰ – thay cho “I want to”, nghe cộc lốc khi nói với người lạ.'));
    else if (/\bwould like\b/.test(low) && !/would you like/.test(low)) out.push(item('Mẫu “would like + N”', "I'd like + danh từ", 'Gọi món, xin đồ lịch sự – thay cho “I want…”.'));
    if (/\b(have|has|had) to\b/.test(low)) out.push(item('Bắt buộc với “have to”', 'have/has to + V', 'Phải làm gì do quy định hoặc hoàn cảnh bên ngoài (luật, nội quy, lịch trình).'));
    if (/\bneed to\b/.test(low)) out.push(item('“need to”', 'need to + V', 'Cần phải làm gì.'));
    if (/\bused to\b/.test(low)) out.push(item('“used to”', 'used to + V', 'Thói quen/trạng thái trong quá khứ nay không còn.'));
    if (!q.includes('Could') && !q.includes('Can') && /\bcould\b/.test(low) && !/\bcould you\b|\bcould i\b|\bcould we\b/.test(low)) out.push(item('“could” (gợi ý / khả năng)', 'S + could + V', 'Đưa ra gợi ý nhẹ nhàng (“bạn có thể…”), hoặc khả năng trong quá khứ.'));
    const canNeg = /\bcan not\b/.test(low);
    if (canNeg) out.push(item('“can’t” (không thể)', "S + can't + V", 'Không thể / không được phép.'));
    else if (!q.includes('Can') && /\b\w+ can \w+/.test(low) && !/^can\b/.test(low)) out.push(item('“can” (có thể)', 'S + can + V nguyên mẫu', 'Nói về khả năng hoặc sự cho phép. Sau can động từ luôn ở dạng nguyên mẫu.'));
    if (!q.includes('Should') && has('should')) out.push(item('Lời khuyên với “should”', 'S + should + V', 'Đưa ra lời khuyên hoặc điều nên làm (nhẹ hơn “must”).'));
    if (has('must')) out.push(item('“must”', 'S + must + V', /\bmust be\b/.test(low) && !/\bmust be \w+ed\b/.test(low) ? 'Ở đây “must” là SUY ĐOÁN chắc chắn: “chắc hẳn là…”.' : 'Bắt buộc, quy định nghiêm ngặt.'));
    if (has('might') || /\b(it|you|they|he|she) may\b/.test(low)) out.push(item('Khả năng với “may/might”', 'S + may/might + V', 'Có thể xảy ra nhưng không chắc chắn.'));
    if (!q.includes('Would') && /\b(would be|would you|i would|that would)\b/.test(low) && !/would like/.test(low)) out.push(item('“would” (giả định, lịch sự)', 'S + would + V', 'Làm câu nói mềm mỏng hơn, hoặc nói về điều giả định: “That would be great” = như vậy thì tuyệt.'));
    return out;
  }

  function passive(t) {
    for (let i = 0; i < t.length - 1; i++) {
      if (BE.has(t[i])) {
        let j = i + 1;
        while (ADVERBS.has(t[j])) j++;
        const v = t[j] || '';
        if (isV3(v) && !['been'].includes(v)) {
          const by = t.includes('by') ? ' Người thực hiện (nếu cần) đứng sau “by”.' : '';
          const b = t[i], prev = t[i - 1] || '';
          const when = (b === 'was' || b === 'were') ? 'quá khứ' : b === 'been' ? 'hoàn thành' : (b === 'be' && MODALS.has(prev)) ? `với “${prev}”` : b === 'be' ? 'nguyên mẫu' : 'hiện tại';
          return item(`Câu bị động (${when})`, `be + V3: ${MODALS.has(prev) ? prev + ' ' : ''}${b} ${v}`, `Nhấn mạnh sự việc hoặc đồ vật chịu tác động; người làm không quan trọng hoặc ai cũng biết.${by}`);
        }
      }
    }
    return null;
  }

  function patterns(t, low, sentence) {
    const out = [];
    if (/\bthere (is|are|was|were)\b/.test(low)) out.push(item('Cấu trúc “There is/are”', 'There is + N số ít / There are + N số nhiều', 'Giới thiệu sự tồn tại của cái gì đó: “Có…”. Động từ chia theo danh từ đứng sau.'));
    if (/\bif\b/.test(low)) {
      const raw = sentence.toLowerCase().replace(/[’']/g, "'").replace(/\b(\w+)'ll\b/g, '$1 will').replace(/\b(\w+)'d\b/g, '$1 would');
      const parts = raw.split(/\bif\b/);
      const after = parts[1] || '', other = parts[0] + ' ' + (after.split(',').slice(1).join(' ') || '');
      let type = 'Câu điều kiện', why = 'Nêu điều kiện (if…) và kết quả.';
      if (/\bwould\b/.test(other) && /\b(\w+ed|was|were|had|did)\b/.test(after)) { type = 'Câu điều kiện loại 2'; why = 'If + quá khứ, would + V: giả định điều không có thật/khó xảy ra ở hiện tại.'; }
      else if (/\b(will|can|could|should|may|might)\b/.test(other) || /(^|[,.]|\band\b)\s*(please|call|take|ask|tell|come|let|go|send|contact|see|try|use)\b/.test(other.trim())) { type = 'Câu điều kiện loại 1'; why = 'If + hiện tại đơn, will/can/mệnh lệnh: điều có thể xảy ra trong tương lai. Sau “if” KHÔNG dùng will.'; }
      else if (/\b(whether)\b|\bask if\b|\bcheck if\b|\bknow if\b|\bsee if\b/.test(low)) { type = '“if” = liệu… có… không'; why = 'Sau ask/check/know/see, “if” mang nghĩa “liệu có… không”, không phải câu điều kiện.'; }
      else if (/\bif possible\b/.test(low)) { type = 'Cụm “if possible”'; why = '“Nếu có thể” – làm lời đề nghị nhẹ nhàng hơn.'; }
      else { type = 'Câu điều kiện loại 0'; why = 'If + hiện tại, hiện tại: điều luôn đúng, quy định chung.'; }
      out.push(item(type, 'If + mệnh đề điều kiện, + mệnh đề kết quả', why));
    }
    if (/\bit takes\b|\bdoes it take\b|\bwill it take\b|\bmay take\b|\btakes about\b|\bto take\b.*\b(minutes|hours|days)\b/.test(low)) out.push(item('Hỏi/nói thời gian cần', 'It takes + thời gian + to V', 'Dùng “take” để nói việc gì MẤT bao nhiêu thời gian.'));
    if (/\btoo \w+ (to|for)\b|\btoo (big|small|heavy|far|hot|cold|expensive|tight|loose|sweet|spicy|strong|late|early)\b/.test(low)) out.push(item('“too + tính từ”', 'too + adj (+ to V)', '“Quá…” – mức độ vượt quá mong muốn, mang nghĩa tiêu cực.'));
    if (/\benough\b/.test(low)) out.push(item('“enough”', 'enough + N / adj + enough', '“Đủ” – enough đứng TRƯỚC danh từ nhưng SAU tính từ (big enough).'));
    if (/\b(\w+er|more \w+|less \w+|better|worse) than\b/.test(low) && !/\b(other|rather) than\b/.test(low)) out.push(item('So sánh hơn', 'adj-er / more + adj + than', 'So sánh hai đối tượng. Tính từ ngắn thêm -er, tính từ dài dùng more.'));
    else if (/\b(much|a bit|a little) (\w+er|more \w+|cheaper|faster|better)\b/.test(low)) out.push(item('So sánh hơn có nhấn mạnh', 'much / a bit + adj-er', '“much” = hơn nhiều; “a bit/a little” = hơn một chút.'));
    if (/\bthe (most \w+|\w+est|best|worst)\b/.test(low) && !/\bthe (rest|west|test|guest|request|chest|interest)\b/.test(low)) out.push(item('So sánh nhất', 'the + adj-est / the most + adj', 'Cao nhất trong một nhóm: “nhất”.'));
    if (/\bbecause of\b/.test(low)) out.push(item('“because of”', 'because of + danh từ', 'Nêu nguyên nhân bằng một danh từ/cụm danh từ.'));
    else if (/\bbecause\b/.test(low)) out.push(item('Liên từ “because”', 'because + S + V', 'Nối mệnh đề chỉ LÝ DO: “bởi vì”.'));
    if (/\bdue to\b/.test(low)) out.push(item('“due to”', 'due to + danh từ', '“Do, vì” – trang trọng hơn because of, hay gặp trong thông báo.'));
    if (/, so\b/.test(sentence.toLowerCase()) || /\b\w+ so (i|we|you|it|she|he|they|please|there)\b/.test(low)) out.push(item('Liên từ “so”', 'mệnh đề nguyên nhân, so + mệnh đề kết quả', 'Nối KẾT QUẢ với nguyên nhân: “nên, vì vậy”.'));
    if (/\bwhile\b/.test(low)) out.push(item('Liên từ “while”', 'while + S + V', '“Trong khi” – hai việc diễn ra cùng lúc.'));
    if (/\buntil\b/.test(low)) out.push(item('“until”', 'until + mốc / S + V', '“Cho đến khi”. Nói về tương lai thì sau until dùng thì hiện tại.'));
    if (/\b(when|before|after|as soon as) (i|you|we|they|he|she|it)\b/.test(low) && !/^\s*when\b/.test(low) && /\b(will|please|can|could|should)\b|^[a-z]+\b/.test(low)) out.push(item('Mệnh đề thời gian', 'when/before/after + S + V(hiện tại)', 'Nói về tương lai nhưng sau when/before/after dùng thì HIỆN TẠI (không dùng will).'));
    const ger = low.match(/\b(for|before|after|without|about|of|by|instead of|thank you for|thanks for) (\w+ing)\b/);
    if (ger && !['morning', 'evening', 'something', 'anything', 'nothing', 'everything', 'building', 'booking', 'parking', 'meeting', 'clothing', 'boarding', 'shopping', 'sightseeing', 'swimming', 'snorkelling', 'gardening', 'cleaning', 'dressing', 'stitching', 'walking', 'ending', 'crossing', 'information'].includes(ger[2])) {
      out.push(item('Giới từ + V-ing', `${ger[1]} + ${ger[2]}`, 'Sau giới từ (for, before, after, without, about…) động từ phải ở dạng V-ing.'));
    }
    if (/\b(look|looks|looked|sound|sounds|seem|seems|feel|feels|felt)\b (like|so|very|a bit|\w+)/.test(low) && !/\blook (at|for|after|around)\b/.test(low)) {
      const like = /\b(looks|sounds|seems|feels) like\b/.test(low);
      out.push(item('Động từ nối (look/sound/feel)', like ? 'look/sound/feel + like + N' : 'look/sound/feel + tính từ', like ? '“Trông/nghe có vẻ như…” + danh từ hoặc mệnh đề.' : 'Các động từ chỉ cảm nhận đi với TÍNH TỪ (không phải trạng từ): “It looks lovely”, “I feel dizzy”.'));
    }
    if (/\bi('m| am) afraid\b/.test(low)) out.push(item('Mở đầu “I’m afraid…”', "I'm afraid + (that) + mệnh đề", 'Báo tin không vui hoặc từ chối một cách lịch sự – “Tôi e là…”.'));
    if (/\b(i|we) (do not|don't) think\b/.test(low)) out.push(item('“I don’t think…”', "I don't think + S + V", 'Người Anh đặt phủ định ở “think” thay vì ở vế sau – nghe mềm mỏng, ít khẳng định hơn.'));
    else if (/\b(i|we) think\b/.test(low)) out.push(item('“I think…”', 'I think + (that) + S + V', 'Làm câu nói nhẹ nhàng, thể hiện ý kiến cá nhân, tránh nói quá chắc chắn.'));
    if (/\bthank(s| you) for\b/.test(low)) out.push(item('Cảm ơn vì điều gì', 'Thank you for + N / V-ing', 'Sau “for” dùng danh từ hoặc V-ing.'));
    if (/\bis it possible to\b/.test(low)) out.push(item('“Is it possible to…?”', 'Is it possible to + V?', 'Hỏi khả năng một cách mềm mỏng, rất lịch sự.'));
    if (/\b(i|we) (would|'d) recommend\b|\brecommend \w+ing\b/.test(low)) out.push(item('Khuyên với “recommend”', 'I’d recommend + V-ing', 'Đưa lời khuyên lịch sự; sau recommend dùng V-ing.'));
    if (/\bwhy (don't|do not) we\b/.test(low)) out.push(item('Gợi ý “Why don’t we…?”', "Why don't we + V?", 'Không phải hỏi lý do – đây là lời GỢI Ý: “Hay là chúng ta…”.'));
    if (/\bhow about\b|\bwhat about\b/.test(low)) out.push(item('“How about / What about…?”', 'How about + N / V-ing?', 'Đưa ra đề xuất hoặc hỏi tiếp: “… thì sao?”.'));
    const rel = /\?\s*$/.test(sentence) ? -1 : t.findIndex((w, i) => i > 1 && (w === 'who' || w === 'which'));
    if (rel > 1) out.push(item('Mệnh đề quan hệ', `N + ${t[rel]} + V…`, `“${t[rel]}” thay cho danh từ đứng trước và bổ sung thông tin cho nó (who: người; which: vật).`));
    if (/\b(a|an) \w+-(\w+-)?(year|day|week|hour|minute|dollar|euro|star|kilo|night|storey)\b/.test(sentence.toLowerCase())) out.push(item('Tính từ ghép có số', 'a + số-danh từ (số ít) + N', 'Khi số + đơn vị đứng trước danh từ như một tính từ, đơn vị giữ SỐ ÍT và có gạch nối: a two-week holiday.'));
    if (/\bplease\b/.test(low) && out.length < 2) out.push(item('Từ lịch sự “please”', 'please đầu hoặc cuối câu', 'Thêm “please” biến lời yêu cầu thành lời nhờ lịch sự. Ở cuối câu nghe tự nhiên nhất.'));
    return out;
  }

  function analyzeSentence(sentence) {
    const s = sentence.trim();
    const low = tokenize(s).join(' ');
    const bare = low.replace(/\b(please|and|oh|well|ok|okay)\b/g, '').replace(/\s+/g, ' ').trim();
    if (FIXED[bare]) return [item('Cụm cố định', null, FIXED[bare])];
    if (/^(thank you|thanks)( so much| very much| a lot| again| anyway)?$/.test(bare)) {
      return [item('Cụm cố định', null, 'Cảm ơn. Thêm “so much / very much / a lot” để nhấn mạnh; “anyway” = dù sao cũng cảm ơn.')];
    }
    if (bare === 'thank goodness') return [item('Cụm cố định', null, 'Câu cảm thán khi nhẹ nhõm: “Ơn trời! / May quá!”.')];
    const thx = bare.match(/^(thank you|thanks)( so much| very much)? for (\w+)/);
    if (thx && !/\b(and|but)\b/.test(bare)) {
      const ing = /ing$/.test(thx[3]);
      return [item('Cảm ơn vì điều gì', 'Thank you for + N / V-ing', `Muốn nói cảm ơn VÌ điều gì thì thêm “for”. ${ing ? `Sau giới từ “for” động từ phải thêm -ing: “${thx[3]}”.` : 'Ở đây “for” đi với danh từ.'}`)];
    }
    const t = tokenize(s);
    // Câu chào/đáp quá ngắn (Yes. / Hi. / Certainly.) không cần phân tích
    if (t.length <= 2 && !/\?\s*$/.test(s) && !IMPERATIVE.has(t[0])) return [];
    const items = [];
    const type = sentenceType(s, t);
    if (type) items.push(type);
    const isQ = /\?\s*$/.test(s);
    const fragment = !type && !hasFiniteVerb(t);
    if (fragment) {
      items.push(item('Câu rút gọn', 'Danh từ / cụm từ (+ please)', 'Văn nói thường bỏ bớt chủ ngữ và động từ, chỉ giữ thông tin chính (món ăn, số lượng, địa điểm…). Vẫn lịch sự nhờ “please” và ngữ điệu.'));
    }
    const pas = passive(t);
    const ten = fragment || (type && type.tag === 'Câu hỏi rút gọn') ? null : tense(t, low);
    const isImperative = type && /mệnh lệnh|Rủ rê|Đề nghị với “Let|Câu chúc/.test(type.tag);
    if (ten && !isImperative && !(isQ && type && /Can|Could|Would|May|Shall|Should|Will|gián tiếp|Lời mời|Nhờ/.test(type.tag) && ten.tag === 'Tương lai đơn')) {
      // câu bị động đã nói rõ thì, không cần lặp lại “to be”
      const beOnly = /“to be”$/.test(ten.tag) || ten.formula === 'was/were …';
      const beQuestion = type && /“to be”/.test(type.tag) && beOnly;
      if (!(pas && beOnly) && !beQuestion) items.push(ten);
    }
    if (pas) items.push(pas);
    items.push(...modals(t, low, type ? type.tag : ''));
    items.push(...patterns(t, low, s));
    // bỏ trùng tiêu đề
    const seen = new Set();
    return items.filter(x => !seen.has(x.tag) && seen.add(x.tag)).slice(0, 5);
  }

  function splitSentences(text) {
    // Giữ nguyên dấu chấm trong a.m./p.m., Mr., số thập phân 5.80… để không cắt nhầm câu
    const D = '․';
    const safe = text.replace(/\b([ap])\.m\.(\s+[A-Z])/g, `$1${D}m${D}.$2`).replace(/\b([ap])\.m\./gi, `$1${D}m${D}`).replace(/\b(Mr|Mrs|Ms|Dr|St|approx|No|max|min)\./g, `$1${D}`)
      .replace(/(\d)\.(\d)/g, `$1${D}$2`);
    return (safe.match(/[^.?!…]+[.?!…]*/g) || [safe]).map(x => x.replace(new RegExp(D, 'g'), '.').replace(/\.\.$/, '.').trim()).filter(x => /[a-z]/i.test(x));
  }

  function analyze(text) {
    return splitSentences(text).map(s => ({ sentence: s, items: analyzeSentence(s) })).filter(x => x.items.length);
  }

  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function itemHTML(x) {
    return `<div class="g-item"><span class="g-tag">${escH(x.tag)}</span>${x.formula ? ` <code>${escH(x.formula)}</code>` : ''}<div class="g-why">→ ${escH(x.why)}</div></div>`;
  }

  // hand: phân tích viết tay {pattern, explainVi} (nếu có) – hiển thị trước tiên
  function html(text, hand) {
    const parts = analyze(text);
    if (!parts.length && !hand) return '';
    let h = '<div class="gram"><div class="g-head">📐 Ngữ pháp – vì sao nói như vậy?</div>';
    if (hand && hand.pattern) h += `<div class="g-item g-focus"><span class="g-tag">🎯 Trọng tâm</span> <code>${escH(hand.pattern)}</code><div class="g-why">→ ${escH(hand.explainVi || '')}</div></div>`;
    // Bỏ mục tự động trùng với phần viết tay (cùng từ khóa chính, ví dụ “would like to”)
    const key = s => (s || '').toLowerCase().replace(/[’']/g, "'").match(/[a-z']{3,}/g) || [];
    const handKeys = new Set(key(hand && hand.pattern).filter(w => !['nguyên', 'mẫu'].includes(w)));
    const dup = x => handKeys.size && key(x.formula).filter(w => handKeys.has(w)).length >= 2;
    const multi = parts.length > 1;
    parts.forEach((p, i) => {
      const items = p.items.filter(x => !dup(x));
      if (!items.length) return;
      if (multi) h += `<div class="g-sent">Câu ${i + 1}: “${escH(p.sentence)}”</div>`;
      h += items.map(itemHTML).join('');
    });
    return h + '</div>';
  }

  // Dạng quá khứ của động từ có quy tắc (chính tả Anh-Anh: cancel → cancelled)
  function regularPast(w) {
    if (/e$/.test(w)) return w + 'd';
    if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ied';
    if (/[aeiou]l$/.test(w) && !/[aeiou]{2}l$/.test(w)) return w + 'led';
    if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(w)) return w + w.slice(-1) + 'ed'; // stop → stopped
    return w + 'ed';
  }

  // Cách dùng của một từ vựng theo từ loại
  function wordUsage(v) {
    const pos = (v.pos || '').toLowerCase();
    const w = v.word.toLowerCase();
    const lines = [];
    if (/phrasal/.test(pos)) lines.push(item('Cụm động từ', 'động từ + giới từ/trạng từ', `Nghĩa của cả cụm thường khác nghĩa từng chữ. Khi chia thì chỉ đổi động từ chính${FORMS[w.split(' ')[0]] ? ` (${FORMS[w.split(' ')[0]]})` : ''}. Tân ngữ là đại từ thì đặt ở giữa: “pick me up”, “turn it off”.`));
    else if (/verb/.test(pos)) lines.push(item('Động từ', FORMS[w] || `${w} – ${regularPast(w)} – ${regularPast(w)}`, `Đứng sau chủ ngữ và chia theo thì. ${FORMS[w] ? 'Đây là động từ BẤT QUY TẮC – cần học thuộc 3 dạng.' : 'Động từ có quy tắc: quá khứ thêm -ed.'} Sau can/could/will/should/please… dùng nguyên mẫu.`));
    if (/noun/.test(pos)) {
      const uncount = ['luggage', 'baggage', 'information', 'advice', 'money', 'cash', 'water', 'furniture', 'traffic', 'data', 'rubbish', 'bread', 'coffee', 'sugar', 'ice', 'seafood', 'sunscreen', 'petrol', 'diesel', 'weather', 'insurance', 'room service', 'housekeeping', 'jet lag', 'turbulence', 'compensation', 'first aid', 'essentials'];
      const un = uncount.some(u => w === u || w.endsWith(' ' + u));
      lines.push(item(w.includes(' ') ? 'Cụm danh từ' : 'Danh từ', un ? 'some / the + N (không dùng a/an, không thêm -s)' : 'a/an/the/my + N; số nhiều thêm -s',
        (un ? 'Danh từ KHÔNG ĐẾM ĐƯỢC: không dùng a/an và không thêm -s; muốn đếm thì dùng “a piece of / a bottle of…”. ' : 'Danh từ đếm được: số ít cần a/an/the; số nhiều thêm -s/-es. ') +
        (w.includes(' ') ? 'Từ đứng trước bổ nghĩa cho từ đứng sau (như một tính từ), từ cuối là từ chính.' : 'Làm chủ ngữ hoặc tân ngữ trong câu.')));
    }
    if (/adjective/.test(pos)) lines.push(item('Tính từ', 'a/an + adj + N  |  be/look/feel + adj', 'Đứng TRƯỚC danh từ (a quiet room) hoặc SAU to be/look/feel/seem (The room is quiet). Tính từ không thêm -s ở số nhiều.'));
    if (/adverb/.test(pos)) lines.push(item('Trạng từ', 'V + adv  |  adv đầu câu', 'Bổ nghĩa cho động từ, tính từ hoặc cả câu; thường đứng cuối câu hoặc đầu câu kèm dấu phẩy.'));
    if (/preposition/.test(pos)) lines.push(item('Giới từ', 'giới từ + danh từ / đại từ', 'Đứng trước danh từ để chỉ vị trí, thời gian, hướng… Sau giới từ, động từ phải ở dạng V-ing.'));
    if (/phrase/.test(pos) && !/phrasal/.test(pos)) lines.push(item('Cụm từ cố định', null, 'Học thuộc và dùng nguyên cả cụm; không dịch từng chữ.'));
    if (/determiner|pronoun/.test(pos)) lines.push(item('Từ hạn định / đại từ', null, 'Đứng trước danh từ hoặc thay thế cho danh từ.'));
    let h = '<div class="gram"><div class="g-head">📐 Cách dùng trong câu</div>' + lines.map(itemHTML).join('');
    if (v.example) {
      const ex = analyze(v.example);
      if (ex.length) h += `<div class="g-sent">Phân tích câu ví dụ: “${escH(v.example)}”</div>` + ex.flatMap(p => p.items).slice(0, 4).map(itemHTML).join('');
    }
    return h + '</div>';
  }

  return { analyze, html, wordUsage };
})();
