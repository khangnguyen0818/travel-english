// Ôn tập ngắt quãng theo thuật toán SM-2
const SRS = {
  card(id) { return Store.state.srs[id]; },

  // quality: 1 = Quên, 3 = Khó, 4 = Nhớ, 5 = Dễ
  review(id, quality) {
    const c = Store.state.srs[id] || { ef: 2.5, n: 0, int: 0, due: 0 };
    if (quality < 3) {
      c.n = 0;
      c.int = 0; // gặp lại ngay trong phiên / ngày hôm nay
    } else {
      c.n += 1;
      c.int = c.n === 1 ? 1 : c.n === 2 ? 6 : Math.round(c.int * c.ef);
      if (quality === 5) c.int = Math.max(c.int, c.n === 1 ? 3 : c.int);
    }
    c.ef = Math.max(1.3, c.ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    c.due = Date.now() + c.int * 864e5;
    Store.state.srs[id] = c;
    Store.activity();
  },

  isDue(id) {
    const c = Store.state.srs[id];
    return !!c && c.due <= Date.now();
  },

  isNew(id) { return !Store.state.srs[id]; },

  // Đã "thuộc" khi nhớ đúng ≥ 2 lần liên tiếp
  isLearned(id) {
    const c = Store.state.srs[id];
    return !!c && c.n >= 2;
  },

  dueIds(ids) { return ids.filter(id => SRS.isDue(id)); }
};
