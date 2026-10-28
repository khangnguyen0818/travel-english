# ✈️ TravelTalk – Tiếng Anh Du Lịch cho Người Lớn

Ứng dụng web (PWA) học tiếng Anh du lịch: **giao tiếp → đọc → viết**.
Chạy trên mọi điện thoại, **cài được lên màn hình chính**, **dùng offline**, không cần máy chủ, không quảng cáo.

## Tính năng

| | |
|---|---|
| 💬 **Hội thoại theo tình huống** | Mỗi câu có IPA, nghĩa Việt, nút 🔊 nghe (thường/chậm, giọng Mỹ/Anh), 🎙️ chấm điểm, 🔍 phân tích, ⭐ lưu, 📢 đưa người bản xứ xem |
| 🔍 **Phân tích từng câu** | Từ vựng, cụm từ, ngữ pháp (công thức + ví dụ), cách nói khác, phát âm, văn hóa, lỗi người Việt hay mắc |
| 🎙️ **Chấm điểm phát âm** | Nhận dạng giọng nói, tô màu từng từ 🟢🟡🔴, điểm 0–100, lịch sử tiến bộ |
| ⏺ **Ghi âm & nghe lại** | So sánh giọng mình với giọng mẫu |
| 🎭 **Nhập vai** | Bạn đóng một vai, app đóng vai còn lại |
| 🗣️ **Nói đuổi (shadowing)** | App đọc từng câu, dừng để bạn nhại lại |
| 📝 **Bài tập tự sinh** | Nghe chọn nghĩa, điền từ, sắp xếp câu, dịch Việt → Anh (xáo trộn mỗi lần làm) |
| 📖 **Đọc hiểu** | Vé máy bay, bảng thông báo, thực đơn, email khách sạn… bấm từ khó để xem nghĩa |
| ✍️ **Viết** | Email, tin nhắn, review, điền tờ khai nhập cảnh — có mẫu câu gợi ý, bài mẫu, tự chấm |
| 🖼️ **Từ vựng có ảnh thật** | IPA Mỹ & Anh, ảnh từ Wikimedia Commons, thẻ ghi nhớ ôn tập ngắt quãng (SM-2), trò chơi nghe chọn ảnh |
| 🆘 **Câu cứu nguy** | 50 câu khẩn cấp, chữ to, dùng offline |
| 📊 **Theo dõi tiến độ** | Chuỗi ngày học, mục tiêu ngày, điểm phát âm, số từ đã thuộc, sao lưu/khôi phục |

## 1. Chạy thử trên máy tính

Cần một máy chủ web đơn giản (vì trình duyệt không cho tải file JSON khi mở trực tiếp `index.html`):

```bash
cd traveltalk
python -m http.server 8080
```

Rồi mở `http://localhost:8080`. (Hoặc dùng tiện ích **Live Server** trong VS Code.)

## 2. Đưa lên GitHub (lưu trữ miễn phí)

1. Đăng nhập [github.com](https://github.com) → bấm **New repository**.
2. Đặt tên, ví dụ `traveltalk`, chọn **Public** → **Create repository**.
3. Bấm **uploading an existing file** → kéo thả **toàn bộ nội dung bên trong** thư mục `traveltalk` (gồm `index.html`, `manifest.json`, `service-worker.js` và các thư mục `css`, `js`, `data`, `icons`).
   > Lưu ý: `index.html` phải nằm ở **thư mục gốc** của repo, không nằm trong thư mục con.
4. Bấm **Commit changes**.

Hoặc dùng dòng lệnh:

```bash
cd traveltalk
git init
git add .
git commit -m "TravelTalk phiên bản đầu tiên"
git branch -M main
git remote add origin https://github.com/TEN-CUA-BAN/traveltalk.git
git push -u origin main
```

## 3. Bật GitHub Pages để có đường link

1. Trong repo → **Settings** → **Pages**.
2. Mục **Branch** chọn `main` và thư mục `/ (root)` → **Save**.
3. Chờ 1–2 phút, link sẽ có dạng: `https://TEN-CUA-BAN.github.io/traveltalk/`

## 4. Cài lên màn hình chính điện thoại

**iPhone / iPad (Safari):** mở link → nút **Chia sẻ** (ô vuông có mũi tên ↑) → **Thêm vào MH chính** → **Thêm**.

**Android (Chrome):** mở link → nút **⋮** → **Cài đặt ứng dụng** / **Thêm vào màn hình chính** → **Cài đặt**.
(Trong app cũng có nút **📲 Cài app lên màn hình chính** ở trang chủ.)

Sau khi cài, mở app một lần khi có mạng, vào **Cá nhân → Tải toàn bộ bài học để dùng offline**.

## 5. Lưu ý về phát âm & chấm điểm

- **Giọng đọc** dùng giọng có sẵn trên thiết bị. iPhone: *Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Anh* để tải giọng chất lượng cao (Enhanced/Premium). Android: cài **Google Speech Services**.
- **Chấm điểm giọng nói** cần Internet và chạy tốt nhất trên **Chrome** (Android, máy tính) và **Safari** (iOS 14.5+). Nếu trình duyệt không hỗ trợ, app vẫn cho **ghi âm và nghe lại** để tự so sánh.
- Lần đầu dùng micro, trình duyệt sẽ hỏi quyền → chọn **Cho phép**.

## 6. Thêm nội dung mới (không cần sửa code)

### Thêm chủ đề
1. Tạo file `data/topics/<id>.json` theo đúng cấu trúc của `data/topics/airport.json`.
2. Trong `data/topics.json`, đổi `"ready": false` thành `true` cho chủ đề đó (hoặc thêm mục mới).
3. Thêm đường dẫn file vào danh sách `CORE` trong `service-worker.js` và **tăng `VERSION`** (ví dụ `traveltalk-v2`) để điện thoại tải bản mới.

### Cấu trúc 1 câu hội thoại
```json
{
  "speaker": "Agent",
  "en": "May I see your passport, please?",
  "ipa": "/meɪ aɪ siː jɔːr ˈpæspɔːrt pliːz/",
  "vi": "Cho tôi xem hộ chiếu được không?",
  "variants": { "polite": "…", "casual": "…" },
  "analysis": {
    "vocab": [{ "word": "passport", "ipa": "/ˈpæspɔːrt/", "pos": "noun", "vi": "hộ chiếu", "example": "…" }],
    "phrases": [{ "phrase": "May I…?", "vi": "Tôi có thể… không?" }],
    "grammar": { "pattern": "May I + V?", "explainVi": "…", "examples": ["…"] },
    "pronunciation": "…",
    "culture": "…",
    "commonMistake": { "wrong": "…", "right": "…" }
  }
}
```
Mọi trường trong `variants` và `analysis` đều không bắt buộc. Bài tập được **tự sinh** từ hội thoại.

### Thêm từ vựng
Thêm vào `data/vocab.json`:
```json
{ "id": "v0201", "word": "souvenir shop", "ipaUS": "/ˌsuːvəˈnɪr ʃɑːp/", "ipaUK": "/ˌsuːvəˈnɪə ʃɒp/",
  "pos": "noun", "vi": "cửa hàng lưu niệm", "topic": "shopping", "level": "A2",
  "emoji": "🎁", "img": "souvenir shop", "example": "…", "exampleVi": "…" }
```
- `img`: từ khóa tìm ảnh trên Wikimedia Commons (để trống thì dùng chính `word`).
- Muốn dùng ảnh cố định: thêm `"image": "https://…"` cho tình huống (situation).

### Tạo hàng ngàn nội dung bằng AI
Dùng các **Prompt bổ sung theo giai đoạn** trong file `PROMPT-travel-english-app.md`, dán kèm file mẫu `airport.json` để AI giữ đúng định dạng. Kiểm tra JSON hợp lệ tại [jsonlint.com](https://jsonlint.com) trước khi tải lên.

## Cấu trúc thư mục
```
traveltalk/
├── index.html            giao diện chính
├── manifest.json         thông tin cài đặt PWA
├── service-worker.js     chạy offline
├── css/style.css
├── js/app.js             màn hình & điều hướng
├── js/speech.js          phát âm, ghi âm, chấm điểm
├── js/srs.js             ôn tập ngắt quãng SM-2
├── js/storage.js         lưu tiến độ, sao lưu
├── data/topics.json      danh sách 27 chủ đề
├── data/topics/*.json    hội thoại, đọc, viết từng chủ đề
├── data/vocab.json       kho từ vựng
├── data/survival.json    50 câu cứu nguy
└── icons/                biểu tượng app
```

## Bản quyền ảnh
Ảnh minh họa được tải trực tiếp từ **Wikimedia Commons** (giấy phép tự do); tên tác giả và giấy phép hiển thị trên ảnh ở màn hình chi tiết từ vựng và tình huống.
