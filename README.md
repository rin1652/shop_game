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

- **14 bài, mỗi ngày 1 bài (vòng 2 từ ngày 15 khó hơn):** xin nhắc lại, giới thiệu bản thân, standup, hỏi làm rõ requirement, diễn giải lại để xác nhận, edge case, báo bug, severity vs priority, phản biện lịch sự, deadline/ước lượng, “not a bug”/“cannot reproduce”, nhờ giúp & báo cáo cuối ngày, review test case, nghe tiếng Anh kiểu Ấn.
- **Từ điển:** 50 từ vựng QA, 30 cách nói phổ biến của người Ấn trong IT (do the needful, revert, prepone, I have a doubt…), mẹo nghe giọng Ấn.
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

## Phát triển

```bash
npm install
npm run dev     # chạy thử
npm run build   # build ra thư mục dist/
```

Mỗi lần push, workflow `.github/workflows/deploy.yml` tự build và deploy lên GitHub Pages. Việc cần làm một lần: vào repo trên GitHub → **Settings → Pages → Source: GitHub Actions**.
