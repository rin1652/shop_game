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
  { week: 1, focus: 'Sống sót trong cuộc gọi', detail: 'Xin nhắc lại, giới thiệu bản thân, báo cáo standup.' },
  { week: 2, focus: 'Hiểu requirement của mentor', detail: 'Hỏi làm rõ, diễn giải lại để xác nhận, hỏi edge case.' },
  { week: 3, focus: 'Báo bug & bảo vệ quan điểm', detail: 'Mô tả bug, severity vs priority, phản biện lịch sự.' },
  { week: 4, focus: 'Đàm phán công việc', detail: 'Deadline, ước lượng, "not a bug", nhờ giúp đỡ, báo cáo cuối ngày.' },
  { week: 5, focus: 'Làm việc thật', detail: 'Review test case, nghe tiếng Anh kiểu Ấn. Sau đó lặp lại các bài và tăng thời gian nhập vai với AI.' },
];
