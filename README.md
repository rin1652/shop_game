# Tiếng Anh giao tiếp cho QA

App web cá nhân để học tiếng Anh giao tiếp **1 giờ mỗi ngày**. Mục tiêu: thực tập sinh QA (trình độ cơ bản) hiểu được requirement của mentor người Ấn Độ và phản biện được một cách lịch sự.

Dùng tốt trên điện thoại, cài được ra màn hình chính như một app. Chạy hoàn toàn trên trình duyệt; tiến độ lưu trên thiết bị của bạn.

## Buổi học 60 phút

| Phút | Bước | Phương pháp |
|---|---|---|
| 10 | Ôn flashcard | Ôn tập ngắt quãng + chủ động nhớ lại: nhìn tiếng Việt, nói ra tiếng Anh |
| 15 | Nghe & nhại giọng | Nghe hội thoại giọng mentor Ấn Độ, rồi shadowing từng câu |
| 15 | Học cụm câu mới | Học 8 cụm câu, nói vào micro, app chấm % từ đúng |
| 15 | Nhập vai với mentor | Trả lời mentor bằng lời của bạn rồi so với câu mẫu, hoặc nói chuyện với AI mentor |
| 5 | Viết tổng kết | 3 câu kiểu báo cáo standup (AI sửa lỗi nếu có API key) |

## Nội dung

- **20 bài, mỗi ngày 1 bài**, chia 6 chặng. Chặng 1–5: xin nhắc lại, giới thiệu bản thân, standup, hỏi làm rõ requirement, diễn giải lại để xác nhận, edge case, báo bug, severity vs priority, phản biện lịch sự, deadline/ước lượng, “not a bug”/“cannot reproduce”, nhờ giúp & báo cáo cuối ngày, review test case, nghe tiếng Anh kiểu Ấn.
- **Chặng 6: nền tảng AI testing Chunk → RAG → Self-healing** (trọng tâm self-healing): giải thích self-healing bằng lời đơn giản, báo cáo kết quả healing, false heal, ngưỡng tin cậy & bước duyệt, chunking & RAG, demo cả pipeline.
- **Hai lộ trình:** *Dự án AI testing · 2 tuần* (mặc định, 14 bài ưu tiên dự án) hoặc *Chuẩn · 20 bài*. Đổi ở trang Hôm nay.
- **Bài kiểm tra cuối lộ trình:** 20 câu mentor hỏi về nền tảng (12 câu về self-healing), có chấm điểm.
- **Từ điển:** 33 thuật ngữ AI testing, 50 từ vựng QA, 30 cách nói phổ biến của người Ấn trong IT (do the needful, revert, prepone, I have a doubt…), mẹo nghe giọng Ấn.
- **Kết quả giả lập học viên 2 tuần** và đánh giá mức sẵn sàng: [docs/LEARNER_SIMULATION.md](docs/LEARNER_SIMULATION.md).
- **AI Mentor (không bắt buộc):** “Rahul”, QA Lead người Ấn do AI đóng vai. Rahul giao requirement mơ hồ, phản bác bạn, và sau mỗi câu góp ý bằng tiếng Việt. Có thêm tính năng AI sửa bài viết tổng kết.
  - Nhà cung cấp: **Anthropic (Claude)**, **OpenAI (ChatGPT)**, **Google Gemini** (có gói miễn phí), **OpenRouter**, hoặc **tuỳ chỉnh** (bất kỳ API tương thích OpenAI, nhập Base URL).
  - Mỗi nhà cung cấp lưu key và model riêng. Có nút “Tải danh sách model” để lấy model mới nhất, và nút “Kiểm tra kết nối”.
  - Chỉ gọi AI khi AI làm tốt hơn cách không dùng AI. Xem sơ đồ và thuật toán ở [docs/AI_POLICY.md](docs/AI_POLICY.md).
  - Key chỉ lưu trong trình duyệt trên thiết bị của bạn, không có trong file sao lưu.

## Dùng trên điện thoại

1. Mở link GitHub Pages của repo này bằng Chrome (Android) hoặc Safari (iPhone).
2. Cho phép dùng micro khi được hỏi.
3. Thêm ra màn hình chính: Chrome → menu ⋮ → “Thêm vào màn hình chính”; Safari → Chia sẻ → “Thêm vào MH chính”.
4. Để nghe giọng Ấn Độ, cài giọng “English (India)” trên máy. Hướng dẫn có trong phần Cài đặt của app.

## Giao diện

Làm theo [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) và bộ iOS UI Kit chính thức của Apple trên Figma Community: màu hệ thống, danh sách nhóm bo góc, tiêu đề lớn, thanh tab mờ, vòng tiến độ kiểu Activity, nút ≥ 44pt. Chữ đạt tương phản ≥ 4.5:1 ở cả giao diện sáng và tối (có test tự động). Có chỉnh cỡ chữ và tôn trọng tuỳ chọn giảm chuyển động của máy.

## Kiến trúc (Clean Architecture)

```
src/
  domain/          Quy tắc thuần, không phụ thuộc gì: lịch ôn (SM-2), chấm câu, lộ trình, chính sách dùng AI, ngày & chuỗi ngày
  data/            Nội dung học: bài học, từ điển, lộ trình, tình huống AI, bài kiểm tra
  application/     Use case: tiến độ, ôn tập, AI coach, thống kê AI, cài đặt — chỉ nói chuyện với thế giới ngoài qua ports.js
  infrastructure/  Adapter: localStorage, giọng nói trình duyệt, nhà cung cấp AI (Claude SDK, OpenAI-compatible, Gemini)
  ui/              Giao diện: components, views, styles; main.js là composition root gắn adapter thật vào ports
```

Phụ thuộc chỉ đi vào trong: `ui → application → domain`. `infrastructure` được gắn vào `application` qua `ports.js`, nên unit test thay bằng bộ nhớ trong RAM, đồng hồ cố định và AI giả.

## Phát triển

```bash
npm install
npm run dev     # chạy thử
npm run build   # build ra thư mục dist/
npm test          # unit test domain + application (ports giả, không cần trình duyệt)
npm run test:e2e  # test trên trình duyệt thật với AI giả lập (cần Playwright, chạy sau build)
npm run coverage  # đo lộ trình bao phủ bao nhiêu phần bài kiểm tra nền tảng
npm run simulate  # giả lập học viên học 14 ngày rồi làm bài kiểm tra (SIM_HARD=1 cho bản khắt khe)
```

Mỗi lần push, workflow `.github/workflows/deploy.yml` chạy unit test, build và deploy lên GitHub Pages (test hỏng thì không deploy). Việc cần làm một lần: vào repo trên GitHub → **Settings → Pages → Source: GitHub Actions**.
