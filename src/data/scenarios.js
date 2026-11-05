// Tình huống luyện với AI mentor.
export const SCENARIOS = [
  {
    id: 'selfheal',
    title: 'Dự án: self-healing (trọng tâm)',
    brief: 'Mentor hỏi về module self-healing: giải thích cách hoạt động, báo cáo số liệu heal, false heal, ngưỡng tin cậy, bước duyệt. Đôi khi mentor đưa ý kiến rủi ro để bạn phản biện.',
    prompt:
      'You and the intern work on an automation testing platform with three modules: chunking documents and DOM snapshots, RAG retrieval of relevant chunks, and self-healing of broken locators. The intern owns the self-healing module and already understands the concept. Ask about one topic at a time: how healing chooses an element, last night\'s healing results (numbers), a wrong heal, the confidence threshold, review before committing healed locators, healing logs. Now and then propose something risky (lower the threshold, auto-commit all heals, add more retries) and only accept when the intern explains the risk and suggests a safer option.',
  },
  {
    id: 'rag',
    title: 'Dự án: chunking & RAG',
    brief: 'Mentor hỏi về chunk size, overlap, top-k, chunk không liên quan, hallucination, và vì sao healing cần RAG.',
    prompt:
      'You and the intern work on an automation testing platform: documents and DOM snapshots are split into chunks, RAG retrieves the most relevant chunks, and a self-healing module uses them to fix broken locators. Ask practical questions about chunk size and overlap, top-k, irrelevant chunks, reranking, grounded answers and why healing needs RAG. Once, suggest indexing everything into the vector store and accept a reasoned objection.',
  },
  {
    id: 'requirement',
    title: 'Mentor giao requirement mơ hồ',
    brief: 'Mentor giao một tính năng cần test nhưng cố tình nói thiếu thông tin. Bạn phải hỏi làm rõ, diễn giải lại để xác nhận.',
    prompt:
      'Give the intern a new feature to test (pick a realistic e-commerce or banking feature). Describe it vaguely and leave out key details (limits, error handling, platforms, deadline). Only reveal a detail when the intern asks a good clarifying question. When the intern paraphrases correctly, confirm it.',
  },
  {
    id: 'standup',
    title: 'Daily standup',
    brief: 'Bạn báo cáo standup: hôm qua, hôm nay, vướng mắc. Mentor sẽ hỏi thêm chi tiết.',
    prompt:
      'Run a short daily standup. Ask the intern for their update (yesterday, today, blockers), then ask one or two follow-up questions about details such as bug IDs, percent complete or ETA.',
  },
  {
    id: 'bug',
    title: 'Báo bug & tranh luận severity',
    brief: 'Bạn báo một bug. Mentor cho rằng bug nhỏ và muốn dời sang sprint sau. Bạn phải bảo vệ quan điểm bằng tác động lên người dùng.',
    prompt:
      'The intern will report a bug. Ask for steps to reproduce, expected vs actual result and environment. Then politely push back, saying it looks minor and could move to the next sprint. Only agree when the intern gives a clear reason based on user or business impact.',
  },
  {
    id: 'pushback',
    title: 'Mentor đưa yêu cầu không hợp lý',
    brief: 'Mentor bảo bỏ qua regression, hoặc đánh dấu pass khi chưa test, hoặc ôm thêm việc. Bạn phản biện lịch sự và đề xuất phương án.',
    prompt:
      'Make one questionable request under time pressure, for example skipping regression, marking untested cases as passed, or adding more scope with the same deadline. Insist a little. Accept a polite alternative proposal if the intern explains the risk clearly.',
  },
  {
    id: 'deadline',
    title: 'Ước lượng & deadline',
    brief: 'Mentor hỏi ETA và muốn xong sớm hơn. Bạn đưa ước lượng có lý do và thương lượng ưu tiên.',
    prompt:
      'Ask the intern for an estimate (ETA) for testing a feature, then say the client needs it sooner. Expect the intern to explain the estimate and negotiate priorities or scope.',
  },
  {
    id: 'free',
    title: 'Nói chuyện tự do',
    brief: 'Trò chuyện tự do với mentor về công việc, dự án, học QA.',
    prompt: 'Have a friendly, work-related chat. Ask the intern about their QA learning, what they found difficult this week and give simple advice.',
  },
];
