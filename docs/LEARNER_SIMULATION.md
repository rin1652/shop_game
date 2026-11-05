# Giả lập học viên: 2 tuần với lộ trình nhanh

**Câu hỏi:** một học viên tiếng Anh "bập bẹ", đã nắm cơ bản self-healing bằng tiếng Việt, học theo lộ trình 1 giờ mỗi ngày trong 1–2 tuần. Sau đó họ có đối đáp **tốt** được với mentor người Ấn về nền tảng automation testing 3 bước Chunk → RAG → Self-healing không?

**Trả lời ngắn:** **đủ dùng** cho những tình huống đã luyện (giải thích module, báo số liệu, hỏi lại, phản biện theo công thức). **Chưa đến mức "tốt"** để đối đáp tự do, nhiều lượt, với câu hỏi bất ngờ. Muốn đạt mức "tốt" cần khoảng 6–8 tuần, có luyện nói phản xạ hằng ngày.

## 1. Đo nội dung lộ trình

Chạy: `node tests/coverage.mjs`. Bài thi gồm 20 câu mentor hay hỏi (12 câu về self-healing, 4 về RAG, 4 về chunking/pipeline), nằm ở `src/data/exam.js`.

| Chỉ số | Lộ trình cũ (14 bài QA chung) | Lộ trình nhanh mới (14 bài, có chặng 6) |
|---|---|---|
| Thuật ngữ nền tảng có trong bài học | 10% (4/41) | **98%** (40/41) |
| Từ trong bài thi đã gặp khi học (không tính từ cơ bản) | 46% | **91%** |
| Câu trả lời mẫu nói được hoàn toàn bằng từ đã học | 0/20 | **12/20** |
| Chức năng "giải thích kỹ thuật bằng lời đơn giản" | ✗ | ✓ |

Từ còn thiếu chủ yếu là từ thông dụng (*irrelevant, noise, cost, proper, decide, accurate*), không phải thuật ngữ. Học viên vẫn diễn đạt vòng được bằng từ đơn giản hơn: *not relevant, more data, money*.

## 2. Giả lập học 14 ngày trên app thật

Chạy: `npm run build && npm run simulate` (bản khắt khe: `SIM_HARD=1 npm run simulate`). Học viên dùng app thật trên Chromium, đồng hồ trình duyệt được tua qua từng ngày. Mỗi ngày học viên làm đủ 5 bước: ôn thẻ, nghe chép, cụm câu, nhập vai (app chấm điểm), viết tổng kết. Ngày 15 làm bài kiểm tra trên trang `#/exam`.

| | Bản thường (thuộc từ sau 3 lần gặp) | Bản khắt khe (5 lần gặp, quên 25% khi trả lời) |
|---|---|---|
| Bài kiểm tra trước khi học | 4/20 | 4/20 |
| **Bài kiểm tra sau 14 ngày** | **19/20** (self-healing 11/12) | **18/20** (self-healing 11/12) |
| Nghe chép lời mentor | ~50–68% → ~80% | ~50–68% → ~77% |
| Thuật ngữ đã thuộc | 30/41 | 29/41 |
| Nhập vai đạt | 2–3/3 mỗi ngày | 1–3/3 mỗi ngày |
| Hoàn thành 5/5 bước, chuỗi ngày | 14/14 ngày | 14/14 ngày |
| Lỗi JS | 0 | 0 |

## 3. Vì sao chưa thể kết luận "tốt"

Kết quả giả lập là **cận trên**, vì mô hình bỏ qua những điều khó nhất của cuộc gọi thật:

1. **Cấu trúc câu được cho sẵn.** Học viên giả lập trả lời bằng cách giữ lại các từ đã thuộc trong câu mẫu. Người thật phải tự ghép câu, và đây là phần khó nhất với trình độ A2.
2. **Tốc độ và áp lực.** Mentor nói nhanh, chen ngang, đổi chủ đề. Giả lập không có thời gian chờ.
3. **Giọng Ấn thật.** Giọng đọc của máy (TTS) chậm, rõ và đều hơn người thật rất nhiều.
4. **Câu hỏi ngoài kịch bản.** Bài thi bám sát nội dung bài học. Mentor thật sẽ hỏi cả những điều không có trong lộ trình.
5. **AI chấm điểm là giả lập.** Câu được tính "Đạt" khi giữ được ≥ 55% ý của câu mẫu và có thuật ngữ chính. AI thật có thể chấm khắt khe hơn.

## 4. Mức sẵn sàng thực tế sau 2 tuần (ước lượng)

| Việc với mentor | Mức sẵn sàng |
|---|---|
| Báo cáo standup, số liệu healing | ✅ Tốt, vì có khung câu cố định |
| Giải thích self-healing trong 30 giây | ✅ Tốt nếu đã tập nói to nhiều lần |
| Hỏi lại khi không hiểu, xác nhận yêu cầu | ✅ Tốt |
| Hiểu yêu cầu mơ hồ kiểu Ấn (*do the needful, revert, prepone*) | ✅ Khá |
| Phản biện về false heal, ngưỡng, auto-commit | ⚠️ Khá nếu theo công thức 4 bước; yếu nếu bị hỏi vặn nhiều lượt |
| Trả lời về chunk size, top-k, rerank | ⚠️ Khá với câu đã luyện; yếu khi bị hỏi sâu "vì sao" |
| Tranh luận tự do, câu hỏi bất ngờ trong demo | ❌ Chưa. Dùng câu "Let me check and get back to you" |

## 5. Khuyến nghị để lên mức "tốt"

1. Từ ngày 8, **mỗi ngày 15–20 phút AI Mentor** với tình huống "Dự án: self-healing" và "Dự án: chunking & RAG". Đây là cách gần nhất với nói phản xạ thật.
2. **Làm bài kiểm tra bằng giọng nói**, không gõ, và đạt ≥ 16/20 trước khi họp thật.
3. Nghe 10 phút mỗi ngày các bài nói kỹ thuật của kỹ sư Ấn Độ (YouTube, tốc độ 0.75×) để quen giọng thật.
4. Sau mỗi cuộc họp thật, gửi tin nhắn tóm tắt bằng chữ (*"Just to confirm…"*), vì viết dễ hơn nói.
5. Ước lượng: **6–8 tuần** theo cách trên để đối đáp tốt trong phạm vi dự án.
