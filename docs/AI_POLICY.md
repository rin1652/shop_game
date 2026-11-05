# Khi nào app gọi AI?

## Bài toán

- **Mục tiêu số 1:** người học tiến bộ nhanh nhất. Không giới hạn số lần gọi AI, không tự đổi sang model rẻ hơn.
- **Ràng buộc:** không trả tiền cho AI khi giá trị AI mang lại **≤** cách làm không dùng AI.

Quy tắc quyết định cho mỗi yêu cầu:

> Gọi AI ⇔ **Giá trị(AI) > Giá trị(không AI)**

Giá trị được so trên ba mặt: chất lượng phản hồi cho người học, tốc độ (chấm cục bộ cho kết quả ngay, AI phải chờ vài giây), và việc phản hồi có còn đúng hay không. Ví dụ: chấm phát âm theo câu mẫu bằng cách so từng từ vừa chính xác vừa tức thì, nên AI không thêm được gì.

## Sơ đồ quyết định

![Sơ đồ quyết định gọi AI](ai-policy.png)

Bản mermaid (GitHub tự vẽ):

```mermaid
flowchart TD
    A([Người học thao tác]) --> B{Loại việc?}

    B -->|Nghe, nhại giọng, nghe chép,<br/>cụm câu, flashcard| L1[Máy tự xử lý:<br/>đọc bằng giọng có sẵn + so từng từ]
    L1 --> Z0([Không gọi AI<br/>giá trị bằng hoặc hơn AI, tức thì, 0đ])

    B -->|Nhập vai có câu mẫu| R1{Có chữ tiếng Anh<br/>và ≥ 3 từ?}
    R1 -->|Không| R0[Nhắc nói lại câu đầy đủ] --> Z1([Không gọi AI<br/>AI không giúp được])
    R1 -->|Có| R2{Giống câu mẫu ≥ 80%?}
    R2 -->|Có| R3[Báo Đạt ngay] --> Z0
    R2 -->|Không: câu khác mẫu| R4{Đã chấm đúng câu này<br/>trước đó?}
    R4 -->|Có| C1[Dùng lại kết quả cũ] --> Z2([Không gọi AI<br/>kết quả y hệt])
    R4 -->|Chưa| R5{Có API key?}
    R5 -->|Không| R6[Hướng dẫn tự so với câu mẫu<br/>theo 3 tiêu chí]
    R5 -->|Có| AI1[[GỌI AI: chấm ý nghĩa,<br/>sửa lỗi, gợi ý câu tự nhiên]]

    B -->|Viết tổng kết| W1{Có chữ tiếng Anh?}
    W1 -->|Không| Z1
    W1 -->|Có| W2{Văn bản này đã được sửa?}
    W2 -->|Có| C1
    W2 -->|Chưa| AI2[[GỌI AI: sửa bài + giải thích]]

    B -->|Chat với AI mentor| H1{Có chữ tiếng Anh?}
    H1 -->|Không| Z1
    H1 -->|Có| H2{Trùng y câu vừa gửi?}
    H2 -->|Có| Z1
    H2 -->|Không| H3[Gửi phần mở đầu tình huống<br/>+ 24 lượt gần nhất]
    H3 --> AI3[[GỌI AI: mentor trả lời<br/>+ góp ý tiếng Việt]]

    AI1 --> K[(Lưu đệm kết quả<br/>+ thống kê)]
    AI2 --> K
    AI3 --> K2[(Thống kê)]

    classDef ai fill:#0f766e,color:#fff,stroke:#0f766e
    classDef free fill:#e7f6ee,stroke:#15803d,color:#14532d
    class AI1,AI2,AI3 ai
    class Z0,Z1,Z2 free
```

## Những gì **không** cắt giảm

| Lựa chọn | Lý do giữ |
|---|---|
| Tự đổi sang model rẻ hơn | Làm giảm chất lượng phản hồi, trái với mục tiêu số 1. Model do người học chọn. |
| Giới hạn số lượt chat mỗi ngày | Hội thoại tự do là việc chỉ AI làm được, càng luyện nhiều càng tốt. |
| Bỏ phần góp ý tiếng Việt sau mỗi câu | Đây là giá trị chính khi học. |
| Tắt AI chấm câu trả lời khác mẫu | Máy không tự đánh giá được ý nghĩa và ngữ pháp của câu khác mẫu. |

## Những gì tiết kiệm mà không mất chất lượng

| Kỹ thuật | Tiết kiệm |
|---|---|
| Chấm cục bộ phát âm, nghe chép, flashcard | 100% các lần đó |
| Câu nhập vai giống mẫu ≥ 80% thì báo Đạt ngay | Không cần gọi AI để nói "đúng rồi" |
| Lọc đầu vào rỗng, quá ngắn hoặc trùng | Không trả tiền cho câu trả lời vô ích |
| Lưu đệm kết quả (tối đa 300 kết quả) | Cùng câu hỏi thì dùng lại, không gọi lại |
| Gửi phần mở đầu + 24 lượt gần nhất | Chat càng dài thì mỗi lượt càng ít token; lượt cũ ở giữa hầu như không ảnh hưởng câu trả lời tiếp theo |
| Bộ nhớ đệm prompt (Claude), hoặc đệm tự động (OpenAI, Gemini) | Phần prompt lặp lại được tính giá thấp hơn |
| Mức suy nghĩ `low` cho chat ngắn (Claude 5.x) | Câu trả lời 1–3 câu không cần suy nghĩ sâu |

Thống kê trong ngày (số lần gọi, token ước tính, số lần tự xử lý, số lần dùng lại kết quả cũ) nằm ở **Cài đặt → AI hôm nay**. Code: quyết định nằm ở `src/domain/aiPolicy.js` (hàm thuần, có unit test), thực thi ở `src/application/coach.js`, thống kê và bộ nhớ đệm ở `src/application/usage.js`.
