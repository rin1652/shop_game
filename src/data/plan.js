// Phương pháp học & lịch 60 phút/ngày.

export const METHODS = [
  {
    name: 'Ôn tập ngắt quãng (Spaced Repetition)',
    why: 'Ôn đúng lúc sắp quên giúp nhớ lâu gấp nhiều lần so với học dồn. App tự tính ngày ôn lại cho từng câu.',
  },
  {
    name: 'Chủ động nhớ lại (Active Recall)',
    why: 'Nhìn tiếng Việt và tự NÓI ra tiếng Anh trước khi xem đáp án — luyện đúng kỹ năng cần khi nói chuyện thật.',
  },
  {
    name: 'Nhại giọng (Shadowing)',
    why: 'Nghe một câu rồi nói lại ngay, đúng nhịp và ngữ điệu. Cách nhanh nhất để nghe quen tai và nói trôi hơn.',
  },
  {
    name: 'Học theo cụm câu (Chunking)',
    why: 'Ở trình độ cơ bản, học nguyên cụm "Could you say that again?" hiệu quả hơn học ngữ pháp rời rạc.',
  },
  {
    name: 'Nhập vai tình huống thật (Role-play)',
    why: 'Luyện đúng các tình huống bạn sẽ gặp: standup, hỏi requirement, báo bug, phản biện.',
  },
  {
    name: 'Nghe giọng Ấn Độ hằng ngày',
    why: 'App đọc lời mentor bằng giọng tiếng Anh Ấn Độ (nếu máy có) để tai bạn quen trước khi gặp mentor thật.',
  },
];

// Một buổi 60 phút. key dùng để đánh dấu hoàn thành.
export const DAILY_STEPS = [
  { key: 'review', min: 10, title: 'Ôn flashcard', desc: 'Ôn các câu đến hạn. Nhìn tiếng Việt → nói to tiếng Anh → lật thẻ → tự chấm.', route: '#/review' },
  { key: 'listen', min: 15, title: 'Nghe & nhại giọng', desc: 'Nghe hội thoại của bài hôm nay 2 lần (lần 2 tốc độ chậm), rồi nhại từng câu.', route: 'lesson:dialogue' },
  { key: 'phrases', min: 15, title: 'Học cụm câu mới', desc: 'Học 8 cụm câu của bài. Bấm micro, nói từng câu đến khi đạt ≥ 80%.', route: 'lesson:phrases' },
  { key: 'roleplay', min: 15, title: 'Nhập vai với mentor', desc: 'Trả lời mentor bằng giọng nói. Có API key thì luyện với AI mentor, không thì dùng tình huống mẫu.', route: 'lesson:roleplay' },
  { key: 'reflect', min: 5, title: 'Viết tổng kết', desc: 'Viết 3 câu tiếng Anh về việc bạn đã/sẽ làm hôm nay, như một báo cáo standup.', route: '#/today/reflect' },
];

export const ROADMAP = [
  { week: 1, days: 'Ngày 1–3', focus: 'Sống sót trong cuộc gọi', detail: 'Xin nhắc lại, giới thiệu bản thân, báo cáo standup.' },
  { week: 2, days: 'Ngày 4–6', focus: 'Hiểu requirement của mentor', detail: 'Hỏi làm rõ, diễn giải lại để xác nhận, hỏi edge case.' },
  { week: 3, days: 'Ngày 7–9', focus: 'Báo bug & bảo vệ quan điểm', detail: 'Mô tả bug, severity vs priority, phản biện lịch sự.' },
  { week: 4, days: 'Ngày 10–12', focus: 'Đàm phán công việc', detail: 'Deadline, ước lượng, "not a bug", nhờ giúp đỡ, báo cáo cuối ngày.' },
  { week: 5, days: 'Ngày 13–14', focus: 'Làm việc thật', detail: 'Review test case, nghe tiếng Anh kiểu Ấn.' },
  { week: 6, days: 'Vòng 2 (từ ngày 15)', focus: 'Học lại, khó hơn', detail: 'App tự quay lại bài cũ nhất. Lần này bật "Nghe chép" (ẩn chữ), không xem nghĩa, và nhập vai với AI mentor nhiều hơn.' },
];

// Lộ trình: thứ tự bài học. "fast" dành cho mục tiêu dự án AI testing trong ~2 tuần.
export const ROUTES = {
  fast: {
    label: 'Dự án AI testing · 2 tuần',
    desc: 'Ưu tiên giao tiếp về Chunk → RAG → Self-healing với mentor. 14 bài trong 14 ngày, sau đó học tiếp các bài còn lại.',
    lessons: ['l01', 'l03', 'l15', 'l05', 'l16', 'l04', 'l17', 'l09', 'l18', 'l19', 'l08', 'l20', 'l10', 'l14'],
    roadmap: [
      { days: 'Ngày 1–2', focus: 'Sống sót trong cuộc gọi', detail: 'Xin nhắc lại, báo cáo standup.' },
      { days: 'Ngày 3–5', focus: 'Giải thích & báo cáo self-healing', detail: 'Giải thích module bằng lời đơn giản, diễn giải lại để xác nhận, báo cáo số liệu healing.' },
      { days: 'Ngày 6–9', focus: 'Hỏi rõ & phản biện', detail: 'Làm rõ requirement, false heal, phản biện lịch sự, đề xuất ngưỡng và bước duyệt.' },
      { days: 'Ngày 10–12', focus: 'RAG, mức độ bug, demo', detail: 'Chunk size, top-k, rerank; bảo vệ severity; demo cả pipeline.' },
      { days: 'Ngày 13–14', focus: 'Deadline & tiếng Anh kiểu Ấn', detail: 'Ước lượng, thương lượng; rồi làm Bài kiểm tra cuối lộ trình.' },
    ],
  },
  standard: {
    label: 'Chuẩn · 20 bài',
    desc: 'Đi lần lượt từ giao tiếp QA cơ bản tới nền tảng AI testing.',
    lessons: ['l01', 'l02', 'l03', 'l04', 'l05', 'l06', 'l07', 'l08', 'l09', 'l10', 'l11', 'l12', 'l13', 'l14', 'l15', 'l16', 'l17', 'l18', 'l19', 'l20'],
    roadmap: [
      { days: 'Ngày 1–3', focus: 'Sống sót trong cuộc gọi', detail: 'Xin nhắc lại, giới thiệu bản thân, báo cáo standup.' },
      { days: 'Ngày 4–6', focus: 'Hiểu requirement của mentor', detail: 'Hỏi làm rõ, diễn giải lại để xác nhận, hỏi edge case.' },
      { days: 'Ngày 7–9', focus: 'Báo bug & bảo vệ quan điểm', detail: 'Mô tả bug, severity vs priority, phản biện lịch sự.' },
      { days: 'Ngày 10–14', focus: 'Đàm phán & làm việc thật', detail: 'Deadline, "not a bug", nhờ giúp đỡ, review test case, nghe tiếng Anh kiểu Ấn.' },
      { days: 'Ngày 15–20', focus: 'Nền tảng AI testing', detail: 'Self-healing, false heal, ngưỡng & duyệt, chunking & RAG, demo pipeline.' },
    ],
  },
};
