# XuyenSuKi - Lịch sử Việt Nam lớp 6-12

**Phiên bản 2.0.0** · tạo ngày 2026-11-06 · sinh tự động bởi `npm run build:dataset` (đừng sửa tay)

Văn bản phần Lịch sử của 7 sách giáo khoa (SGK) và 7 sách giáo viên (SGV) lớp 6-12, bộ *Kết nối tri thức với cuộc
sống* (chương trình GDPT 2018), tách theo chương / bài / mục và chia chunk, làm kho tri thức cho chatbot RAG và thư viện
SGK. Mỗi chunk đủ thông tin trích dẫn nguồn (sách, bộ sách, NXB, bài, trang).

## Bản quyền và phạm vi sử dụng

Nội dung SGK, SGV do **NXB Giáo dục Việt Nam** giữ bản quyền. Dataset chỉ dùng **nội bộ nhóm** cho học tập / nghiên cứu;
không công bố công khai, không dùng thương mại khi chưa được phép. Khi trả lời, trích dẫn nguồn sách (`book`,
`book_series`, `publisher`, trang).

## Nguồn và cách tạo

1. `ocr_lich_su.py` (thư mục OCR, mặc định `D:\Ocr`) OCR phần Lịch sử của từng PDF bằng **Mistral OCR**, sửa lỗi theo
   `sua_loi_ocr.json`, ra `output/<loại sách>/<sách>.md` (mỗi trang mở đầu bằng `<!-- Trang PDF N -->`) và cắt các hình.
2. `ocr_chu_trong_hinh.py` OCR chữ nằm trong hình SGK (sơ đồ, trục thời gian, bảng dạng ảnh) vào `images/<sách>/figures.json`.
3. `npm run build:dataset -- <thư mục output>` (`scripts/build-dataset-from-ocr.mjs`) dựng thư mục này:
   - SGK tách bài theo mục lục trong `source/books.json` (trang PDF), tách mục theo tiêu đề "1. ...", "Luyện tập – Vận dụng";
     `section_fixes` trong file đó bổ sung tiêu đề mục mà OCR làm mất số thứ tự.
   - SGV tách theo tiêu đề "BÀI N." và các phần I. Mục tiêu, II. Chuẩn bị, ..., V. Tài liệu tham khảo; phần trước Bài 1 là
     "Hướng dẫn chung" (bài 0). Bài SGV được nối với bài SGK cùng lớp có tên trùng khớp (`linked_lesson_id`).
4. Sau khi build: `npm run remap:journeys` (trỏ lại trích dẫn của hành trình), `npm run check:dataset`,
   `npm run build:embeddings`.

## Cấu trúc

```text
data/history/
├── README.md, manifest.json, SHA256SUMS.txt
├── source/books.json               # mục lục nguồn: sách, bài, trang PDF, sửa tiêu đề mục
├── lessons/lessons_all.json        # bài SGK (mảng JSON, có nội dung từng mục)
├── lessons/teacher_guides.json     # phần hướng dẫn của SGV, cùng schema bài học
├── chunks/chunks_all.jsonl         # chunk SGK, mỗi dòng 1 chunk (nạp vector DB)
├── chunks/teacher_chunks.jsonl     # chunk SGV
└── schema/lesson.schema.json, schema/chunk.schema.json
```

## Thống kê

SGK: 7 sách, 127 bài, 716 mục, 2611 chunk (~800 ký tự, overlap 150, ngắt theo câu;
trung bình 445, dài nhất 800 ký tự). SGV: 7 sách, 130 phần, 5422 chunk.

| Lớp | Chương / Chủ đề | Bài SGK | Chunk SGK | Phần SGV | Chunk SGV |
|---|---|---|---|---|---|
| 6 | 6 | 21 | 294 | 21 | 639 |
| 7 | 8 | 20 | 390 | 19 | 697 |
| 8 | 8 | 21 | 430 | 20 | 702 |
| 9 | 7 | 22 | 516 | 23 | 905 |
| 10 | 7 | 13 | 335 | 15 | 829 |
| 11 | 6 | 13 | 282 | 14 | 696 |
| 12 | 6 | 17 | 364 | 18 | 954 |

| Lớp | Sách | File nguồn | Trang PDF |
|---|---|---|---|
| 6 | Lịch sử và Địa lí 6 (Phần Lịch sử) | `lich-su-va-dia-li-6.pdf` | 8-95 |
| 7 | Lịch sử và Địa lí 7 (Phần Lịch sử) | `lich-su-va-dia-li-7.pdf` | 10-95, 167-175 |
| 8 | Lịch sử và Địa lí 8 (Phần Lịch sử) | `lich-su-va-dia-li-8.pdf` | 10-94, 157-173 |
| 9 | Lịch sử và Địa lí 9 (Phần Lịch sử) | `lich-su-va-dia-li-9.pdf` | 7-114 |
| 10 | Lịch sử 10 | `lich-su-10.pdf` | 8-108 |
| 11 | Lịch sử 11 | `lich-su-11.pdf` | 7-91 |
| 12 | Lịch sử 12 | `lich-su-12.pdf` | 7-110 |
| 6 | Lịch sử và Địa lí 6 (Phần Lịch sử) – Sách giáo viên | `SGV-Lich-Su-Va-Dia-Li-6.pdf` | 8-170 |
| 7 | Lịch sử và Địa lí 7 (Phần Lịch sử) – Sách giáo viên | `SGV-Lich-Su-Va-Dia-Li-7.pdf` | 8-182 |
| 8 | Lịch sử và Địa lí 8 (Phần Lịch sử) – Sách giáo viên | `SGV-Lich-Su-Va-Dia-Li-8.pdf` | 8-186 |
| 9 | Lịch sử và Địa lí 9 (Phần Lịch sử) – Sách giáo viên | `SGV-Lich-Su-Va-Dia-Li-9.pdf` | 8-221 |
| 10 | Lịch sử 10 – Sách giáo viên | `SGV-Lich-Su-Va-Dia-Li-10.pdf` | 6-205 |
| 11 | Lịch sử 11 – Sách giáo viên | `SGV-Lich-Su-Va-Dia-Li-11.pdf` | 6-176 |
| 12 | Lịch sử 12 – Sách giáo viên | `SGV-Lich-Su-Va-Dia-Li-12.pdf` | 6-228 |

## Schema

### Bài học (`lessons/*.json`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `grade` | int | Lớp (6-12) |
| `subject` | str | Luôn `"history"` |
| `book`, `book_type` | str | Tên sách; `sgk` hoặc `sgv` |
| `chapter` | str | "Chương N: ..." (lớp 6-9), "Chủ đề N: ..." (lớp 10-12), "Chủ đề chung", "Mở đầu" |
| `lesson_number` | int | Số bài; `0` = phần mở đầu (SGK) hoặc hướng dẫn chung (SGV) |
| `lesson_title` | str | Tên bài |
| `page_start`, `page_end` | int | Trang **trong file PDF** (không phải số in trên trang) |
| `source_pdf` | str | Tên file PDF nguồn |
| `title_source` | str | `toc` (mục lục SGK) hoặc `heading` (tiêu đề bài trong SGV) |
| `linked_lesson_id` | str/null | (SGV) bài SGK tương ứng, vd `LS7_B11` |
| `sections` | list | `[{"title", "content", "page_start", "page_end", "page_marks"}]`; đoạn cách nhau bằng `\n`; `page_marks` = `[[vị trí ký tự, trang], ...]` tại chỗ nội dung sang trang |

Mã bài: SGK `LS<lớp>_B<số bài 2 chữ số>` (vd `LS7_B11`), SGV `GV<lớp>_B<số bài>` (vd `GV7_B11`, `GV7_B00` = hướng dẫn chung).
Số bài SGV theo sách giáo viên; lớp 10 có bài SGV không có bài SGK tương ứng (`linked_lesson_id = null`).

### Chunk (`chunks/*.jsonl`)

Mỗi chunk nằm gọn trong **một mục** và **một loại nội dung**.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `chunk_id` | str | `LS<lớp>_B<bài>_C<số chunk 3 chữ số>` (SGK) hoặc `GV...` (SGV); duy nhất |
| `grade`, `subject`, `chapter`, `lesson_number`, `lesson_title` | | Như bài học chứa chunk |
| `section_index`, `section_title` | int, str | Mục chứa chunk |
| `content_type` | str | SGK: `body` (lời giảng), `source` (tư liệu trích dẫn), `did_you_know` ("Em có biết?", "Kết nối với..."), `question` (câu hỏi / yêu cầu trong bài), `exercise` (Luyện tập – Vận dụng), `objectives` (mục tiêu bài học), `intro` (mở đầu bài, giới thiệu chương), `caption` (chú thích hình), `figure` (chữ trong hình (sơ đồ, trục thời gian, bảng dạng ảnh)). SGV: `objectives` (mục tiêu), `guide` (chuẩn bị, lưu ý nội dung và phương pháp, hướng dẫn chung), `activity` (gợi ý tổ chức hoạt động dạy học), `reference` (tài liệu tham khảo) |
| `content_types` | list | Các loại đoạn có trong chunk (vd `["body", "caption"]`) |
| `page_start`, `page_end` | int | Trang **của chính chunk** trong file PDF |
| `book`, `book_series`, `publisher`, `source_pdf`, `book_type` | str | Nguồn để trích dẫn |
| `text_source` | str | `ocr` |
| `open_flags` | int | `0` (pipeline Mistral không đánh dấu dòng nghi ngờ) |
| `text` | str | Nội dung (đoạn cách nhau bằng `\n`) |

Số chunk SGK theo loại: body 1284, source 129, did_you_know 283, question 324, exercise 135, objectives 121, intro 144, caption 70, figure 121.
Số chunk SGV theo loại: objectives 152, guide 1465, activity 3485, reference 320.

Gợi ý dùng cho RAG: trả lời câu hỏi sự kiện ưu tiên `body` / `source` / `did_you_know` / `figure`; bỏ `question`,
`exercise`, `objectives`, `intro` khỏi chỉ mục. Ứng dụng chỉ dùng chunk SGK cho tìm kiếm và nhân vật; SGV phục vụ giáo viên
qua `/api/teacher-guides`.

## Hạn chế đã biết

- Nhãn `content_type` sinh bằng quy tắc (tiêu đề "Em có biết?", "Kết nối với...", dòng "(Theo ...)", câu hỏi đánh số / "Hãy..."),
  có thể sai với đoạn không theo mẫu. Bảng biểu được làm phẳng thành hàng "ô | ô | ô".
- Chữ trong hình là OCR từng ảnh, giữ nguyên thứ tự Mistral đọc; nhãn lược đồ có thể rời rạc.
- Chỉ gồm phần Lịch sử; trang Địa lí, bìa, lời nói đầu, mục lục, bảng thuật ngữ bị loại. Trang mở đầu chương nằm ở cuối
  bài đứng trước nó, thành mục "Giới thiệu chương" (`intro`).
- Cảnh báo khi build:
  - SGV lớp 10 bài 3 "SỬ HỌC VỚI CÁC LĨNH VỰC KHOA HỌC" không có bài SGK tương ứng
  - SGV lớp 10 bài 4 "SỬ HỌC VỚI MỘT SỐ LĨNH VỰC, NGÀNH NGHỀ HIỆN ĐẠI" không có bài SGK tương ứng
  - SGV lớp 10 bài 9 "CƠ SỞ HÌNH THÀNH VĂN MINH ĐÔNG NAM Á THỜI KÌ CỔ – TRUNG ĐẠI" không có bài SGK tương ứng
