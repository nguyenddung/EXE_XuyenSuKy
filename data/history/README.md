# XuyenSuKi - Lịch sử Việt Nam lớp 6-12

**Phiên bản 1.0.0** · tạo ngày 2026-10-03 · kiểm định **PASSED**

Văn bản phần Lịch sử của 7 sách giáo khoa lớp 6-12 (chương trình GDPT 2018), đã tách theo chương / bài / mục và chia
chunk, dùng làm kho tri thức cho chatbot RAG giáo dục Lịch sử. Mỗi chunk có đủ thông tin trích dẫn nguồn
(sách, bộ sách, NXB, bài, trang).

## Bắt đầu nhanh

```bash
python examples/load_dataset.py        # chỉ cần Python 3.8+, không cài thêm gì
```

```python
import json
chunks = [json.loads(l) for l in open("chunks/chunks_all.jsonl", encoding="utf-8")]
knowledge = [c for c in chunks if c["content_type"] in ("body", "source", "did_you_know", "caption")]
```

- Nạp vector DB: dùng `chunks/chunks_all.jsonl` (mỗi dòng 1 chunk). Nên đưa vào embedding cả lớp / tên bài / tên mục
  (xem `text_for_embedding` trong `examples/load_dataset.py`).
- Kiểm tra file không hỏng sau khi tải: `sha256sum -c SHA256SUMS.txt` (Linux / macOS / Git Bash).
- Kiểm tra cấu trúc dữ liệu: JSON Schema trong `schema/`.

## Bản quyền và phạm vi sử dụng

Nội dung là văn bản sách giáo khoa do **NXB Giáo dục Việt Nam** giữ bản quyền. Dataset chỉ dùng **nội bộ nhóm** cho mục
đích học tập / nghiên cứu; không công bố công khai, không dùng thương mại khi chưa được phép. Khi chatbot trả lời,
hãy trích dẫn nguồn sách (`book`, `book_series`, `publisher`, trang).

## Cấu trúc

```text
dataset/
├── README.md
├── CHANGELOG.md                   # lịch sử phiên bản
├── SHA256SUMS.txt                 # mã băm kiểm tra toàn vẹn file
├── manifest.json                  # phiên bản, thống kê, tham số chunking, sách nguồn, chất lượng
├── lessons/
│   ├── lessons_all.json           # mảng JSON toàn bộ bài học (có nội dung từng mục)
│   └── grade<N>.json              # bài học theo lớp
├── chunks/
│   ├── chunks_all.jsonl           # JSON Lines, mỗi dòng 1 chunk (nạp vector DB)
│   └── grade<N>.jsonl             # chunk theo lớp
├── schema/
│   ├── lesson.schema.json         # JSON Schema của bài học
│   └── chunk.schema.json          # JSON Schema của chunk
├── examples/
│   └── load_dataset.py            # ví dụ đọc, lọc, tạo văn bản embedding, trích dẫn nguồn
└── reports/
    ├── verification_report.json   # kiểm định: bài trùng, chunk rỗng, trang nhận dạng kém
    └── qa_summary.json            # kiểm soát chất lượng chữ theo sách + kiểm tra toàn vẹn
```

Thư mục này sinh tự động bởi pipeline XuyenSuKi (`python run_pipeline.py --steps 4-8` rồi
`python -m scripts.export_dataset`). Đừng sửa tay: báo lỗi nội dung cho người giữ pipeline để sửa tận gốc.

## Thống kê

7 sách, 130 bài, 752 mục, 2708 chunk
(~800 ký tự, overlap 150, ngắt theo câu;
trung bình 431, dài nhất 867 ký tự).

| Lớp | Chương / Chủ đề | Bài | Chunk |
|---|---|---|---|
| 6 | 6 | 21 | 288 |
| 7 | 6 | 23 | 383 |
| 8 | 8 | 21 | 411 |
| 9 | 7 | 22 | 505 |
| 10 | 7 | 13 | 358 |
| 11 | 6 | 13 | 324 |
| 12 | 6 | 17 | 439 |

| Lớp | Sách | Bộ sách | File nguồn |
|---|---|---|---|
| 6 | Lịch sử và Địa lí 6 (Phần Lịch sử) | Kết nối tri thức với cuộc sống | `lich-su-va-dia-li-6.pdf` |
| 7 | Lịch sử và Địa lí 7 (Phần Lịch sử) | Chân trời sáng tạo | `lich-su-va-dia-li-7.pdf` |
| 8 | Lịch sử và Địa lí 8 (Phần Lịch sử) | Kết nối tri thức với cuộc sống | `lich-su-va-dia-li-8.pdf` |
| 9 | Lịch sử và Địa lí 9 (Phần Lịch sử) | Kết nối tri thức với cuộc sống | `lich-su-va-dia-li-9.pdf` |
| 10 | Lịch sử 10 | Kết nối tri thức với cuộc sống | `lich-su-10.pdf` |
| 11 | Lịch sử 11 | Kết nối tri thức với cuộc sống | `lich-su-11.pdf` |
| 12 | Lịch sử 12 | Kết nối tri thức với cuộc sống | `lich-su-12.pdf` |

## Schema

### Bài học (`lessons/*.json`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `grade` | int | Lớp (6-12) |
| `subject` | str | Luôn `"history"` |
| `book` | str | Tên sách |
| `chapter` | str | "Chương N: ..." (lớp 6-9), "Chủ đề N: ..." (lớp 10-12), "Chủ đề chung", "Mở đầu" |
| `lesson_number` | int | Số bài; `0` = phần mở đầu trước Bài 1 |
| `lesson_title` | str | Tên bài |
| `page_start`, `page_end` | int | Trang **trong file PDF** (không phải số in trên trang) |
| `source_pdf` | str | Tên file PDF nguồn |
| `title_source` | str | Nguồn tên bài: `toc` (mục lục), `toc_by_number` (mục lục theo số bài), `page` (tiêu đề trên trang) |
| `sections` | list | `[{"title", "content", "page_start", "page_end", "page_marks"}]`: "Mục tiêu bài học", "Mở đầu", các mục "1. ...", "Luyện tập – Vận dụng"... Đoạn cách nhau bằng `\n`; `page_marks` = `[[vị trí ký tự, trang], ...]` tại chỗ nội dung sang trang |

### Chunk (`chunks/*.jsonl`)

Mỗi chunk nằm gọn trong **một mục** và **một loại nội dung**; không chunk nào trộn lời giảng với tư liệu trích dẫn
hay câu hỏi.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `chunk_id` | str | `LS<lớp>_B<số bài 2 chữ số>_C<số chunk 3 chữ số>`, vd `LS10_B03_C002`; duy nhất |
| `grade`, `subject`, `chapter`, `lesson_number`, `lesson_title` | | Như bài học chứa chunk |
| `section_index`, `section_title` | int, str | Mục chứa chunk (vị trí trong `sections` của bài, tên mục) |
| `content_type` | str | `body` (lời giảng), `source` (tư liệu trích dẫn), `did_you_know` ("Em có biết?"), `question` (câu hỏi / yêu cầu trong bài), `exercise` (Luyện tập – Vận dụng), `objectives` (mục tiêu bài học), `intro` (mở đầu), `caption` (chỉ có chú thích hình) |
| `content_types` | list | Các loại đoạn có trong chunk (vd `["body", "caption"]` khi chú thích hình nằm xen lời giảng) |
| `page_start`, `page_end` | int | Trang **của chính chunk** trong file PDF (không phải số in trên trang) |
| `book`, `book_series`, `publisher`, `source_pdf` | str | Nguồn để trích dẫn: tên sách, bộ sách, NXB, file PDF |
| `text_source` | str | `pdf_text_layer` (chữ gốc của PDF, không lỗi nhận dạng) hoặc `ocr` |
| `open_flags` | int | Số dòng OCR đáng ngờ **chưa được người duyệt** trên các trang của chunk; `0` = đã sạch / đã duyệt |
| `text` | str | Nội dung (đoạn cách nhau bằng `\n`) |

Gợi ý dùng cho RAG: trả lời câu hỏi sự kiện ưu tiên `body` / `source` / `did_you_know`; có thể bỏ `question`,
`exercise`, `objectives` khỏi chỉ mục tìm kiếm; ưu tiên chunk `open_flags == 0` khi có nhiều kết quả gần nhau.

## Chất lượng chữ

- Lớp 9 lấy chữ gốc của PDF (`text_source = "pdf_text_layer"`), không có lỗi nhận dạng.
- 6 sách còn lại là bản scan, nhận dạng bằng OCR (PaddleOCR + VietOCR), rồi:
  1. sửa tự động các lỗi OCR có quy luật (ngoặc kép bị đọc thành `?`, tên riêng viết thường, tên phiên âm lệch dấu...);
  2. mô hình ngôn ngữ XLM-RoBERTa + OCR thứ hai (EasyOCR) đánh dấu dòng đáng ngờ, chỉ tự sửa khi rất chắc chắn;
  3. toàn bộ 2813 dòng bị đánh dấu **đã được người duyệt hết** bằng cách đối chiếu ảnh trang gốc.
- Đo trên lớp 9 trước khi duyệt tay: tỉ lệ ký tự sai 0,82% (OCR) → 0,52% (sau sửa tự động). Lỗi còn lại chủ yếu là
  dấu câu và chữ hoa / thường; dòng không bị đánh dấu thì chưa được người đọc lại.
- Chi tiết từng sách: `reports/qa_summary.json`.

## Hạn chế đã biết

- Nhãn trên lược đồ / sơ đồ đôi khi còn lẫn thành mảnh chữ trong nội dung; bảng biểu bị làm phẳng thành chuỗi ô.
- Nhãn `content_type` sinh bằng quy tắc (từ khoá "Tư liệu", "Em có biết?", "Hình N.", câu hỏi "Hãy..."), có thể sai với
  đoạn không theo mẫu.
- Vài tên bài / chương lấy từ trang (`title_source = "page"`) còn viết IN HOA.
- Chỉ gồm phần Lịch sử; trang Địa lí, bìa, lời nói đầu, mục lục, bảng thuật ngữ đã bị loại.
- `page_start` / `page_end` là số trang trong file PDF nguồn, không phải số in trên trang sách.
