// Bài kiểm tra cuối lộ trình: những câu mentor có thể nói về nền tảng automation testing
// 3 bước Chunk → RAG → Self-healing (trọng tâm self-healing). Mỗi câu kèm việc bạn cần làm và câu mẫu.
// Dùng cho trang "Kiểm tra" và để đo độ bao phủ của lộ trình (tests/coverage).

export const PLATFORM_EXAM = [
  // ---- Self-healing (trọng tâm) ----
  { topic: 'healing', fn: 'explain', mentor: 'So tell me, how does your self-healing module actually work? Explain in simple words.', task: 'Giải thích self-healing trong 2–3 câu.', sample: 'When a locator breaks, the module looks for the same element using other attributes, like the text, the ID or the position. It gives each candidate a confidence score and picks the best one.' },
  { topic: 'healing', fn: 'report', mentor: 'Last night the regression run had many healed steps. Give me the update.', task: 'Báo cáo: 12 bước được heal, 10 đúng, 2 sai.', sample: 'Last night, twelve steps were healed. Ten heals were correct, but two healed to the wrong element. I have logged both cases.' },
  { topic: 'healing', fn: 'clarify', mentor: 'Kindly check why the locator is breaking on the checkout page and do the needful.', task: 'Hỏi lại: anh muốn sửa locator hay muốn tìm nguyên nhân?', sample: 'Sure. Just to confirm, do you want me to fix the locator, or first find out why it is breaking?' },
  { topic: 'healing', fn: 'pushback', mentor: 'Healing is working, so we can auto-commit all healed locators to the main branch, no?', task: 'Phản biện: không nên tự commit, cần người duyệt.', sample: 'I see your point, but I have a concern. If a heal is wrong, the test may pass when the feature is broken. Could we add a review step before we commit the healed locators?' },
  { topic: 'healing', fn: 'explain', mentor: 'What is a false heal? I have a doubt.', task: 'Giải thích false heal.', sample: 'A false heal is when the module finds the wrong element and the test continues. For example, it clicks Cancel instead of Submit, so the result is not correct.' },
  { topic: 'healing', fn: 'propose', mentor: 'The confidence threshold is 0.6 now. Is it okay or should we change?', task: 'Đề xuất tăng lên 0.8 cho các bước quan trọng như thanh toán.', sample: 'I think 0.6 is too low for critical steps. May I suggest 0.8 for payment and login, and keep 0.6 for other pages?' },
  { topic: 'healing', fn: 'clarify', mentor: 'Healing should not hide real bugs. Make sure of the same.', task: 'Hỏi tiêu chí: khi nào thì coi là bug thật thay vì heal?', sample: 'Understood. How should we decide if it is a real bug? For example, if the button text changes, should we heal it or report it?' },
  { topic: 'healing', fn: 'report', mentor: 'What is the healing success rate this week?', task: 'Báo cáo: tỉ lệ heal đúng 85%, tăng từ 78%.', sample: 'This week the healing success rate is eighty-five percent. Last week it was seventy-eight percent.' },
  { topic: 'healing', fn: 'pushback', mentor: 'Just increase the retries to five, then flaky tests will pass only.', task: 'Phản biện: tăng retry che giấu vấn đề; đề xuất tìm nguyên nhân.', sample: 'I am not sure that is a good idea, because more retries can hide the real problem. Could we check the root cause of the flaky tests first?' },
  { topic: 'healing', fn: 'explain', mentor: 'Which attributes are you using to find the element when the XPath fails?', task: 'Nêu các thuộc tính: id, text, class, vị trí, thuộc tính gần đó.', sample: 'We use the ID, the visible text, the class name, the position on the page and nearby labels. Each one has a weight in the score.' },
  { topic: 'healing', fn: 'estimate', mentor: 'Can you add the healing report to the dashboard by Friday?', task: 'Ước lượng: cần 3 ngày, làm phần bảng trước.', sample: 'I think it will take about three days. I can finish the table by Thursday and the charts on Friday. Is that okay?' },
  { topic: 'healing', fn: 'clarify', mentor: 'Healing logs are not proper. Fix it and share.', task: '"Not proper" mơ hồ. Hỏi cụ thể thiếu gì.', sample: 'Sorry, could you tell me what is missing in the logs? Do you need the old locator, the new locator and the confidence score?' },
  // ---- RAG ----
  { topic: 'rag', fn: 'explain', mentor: 'Why do we need RAG here? The model can directly fix the test, no?', task: 'Giải thích: RAG lấy tài liệu liên quan để model không đoán bừa.', sample: 'RAG gives the model the related test cases and documents first. With this context, the model makes fewer guesses and the fix is more accurate.' },
  { topic: 'rag', fn: 'report', mentor: 'Retrieval is pulling irrelevant chunks. What is the top-k you are using?', task: 'Trả lời top-k = 5, đề xuất thêm bước rerank.', sample: 'We are using top-k five. Some chunks are not relevant, so I suggest adding a reranking step.' },
  { topic: 'rag', fn: 'clarify', mentor: 'Make the RAG answers grounded. Hallucination should not be there.', task: 'Hỏi: có cần hiển thị nguồn (citation) không?', sample: 'Sure. Should the answer also show which document it came from, so we can check it?' },
  { topic: 'rag', fn: 'pushback', mentor: 'Let us index all the logs also into the vector store, more data is better.', task: 'Phản biện: thêm dữ liệu nhiễu làm giảm độ chính xác và tăng chi phí.', sample: 'I have a concern. If we add all the logs, retrieval may find more noise, and the cost will go up. Could we index only the error logs first?' },
  // ---- Chunking & pipeline ----
  { topic: 'chunk', fn: 'clarify', mentor: 'What chunk size you are using for the DOM snapshot? Overlap is there or not?', task: 'Trả lời: 500 token, overlap 50.', sample: 'We use five hundred tokens per chunk, with an overlap of fifty tokens.' },
  { topic: 'chunk', fn: 'explain', mentor: 'Why are we splitting the requirement documents into chunks?', task: 'Giải thích lý do chia nhỏ tài liệu.', sample: 'The documents are too long for one prompt. Small chunks are easier to search, so we can send only the relevant parts to the model.' },
  { topic: 'chunk', fn: 'explain', mentor: 'Explain the full pipeline to the client in the demo, okay?', task: 'Trình bày 3 bước của nền tảng.', sample: 'First, we split the documents and DOM into chunks. Second, RAG finds the most relevant chunks. Third, the self-healing module uses them to fix broken locators.' },
  { topic: 'chunk', fn: 'report', mentor: 'Any blockers on your side for the healing integration?', task: 'Báo vướng mắc: chưa có quyền truy cập vector store ở staging.', sample: 'Yes, one blocker. I do not have access to the vector store on staging. Could you help me get it?' },
];

// Thuật ngữ cốt lõi người học phải hiểu và dùng được.
export const PLATFORM_TERMS = [
  'self-healing', 'heal', 'healed', 'locator', 'element', 'attribute', 'xpath', 'selector', 'dom',
  'confidence score', 'threshold', 'false heal', 'false positive', 'candidate', 'weight',
  'flaky', 'retry', 'root cause', 'review step', 'commit', 'success rate', 'healing report', 'logs',
  'rag', 'retrieval', 'top-k', 'relevant', 'rerank', 'grounded', 'hallucination', 'context', 'vector store', 'index', 'embedding',
  'chunk', 'chunk size', 'overlap', 'token', 'snapshot', 'pipeline', 'integration',
];

// Chức năng giao tiếp cần có để "đối đáp được".
export const FUNCTIONS = {
  explain: 'Giải thích kỹ thuật bằng lời đơn giản',
  report: 'Báo cáo trạng thái, con số',
  clarify: 'Hỏi lại cho rõ yêu cầu',
  pushback: 'Phản biện lịch sự',
  propose: 'Đề xuất phương án',
  estimate: 'Ước lượng thời gian',
};
