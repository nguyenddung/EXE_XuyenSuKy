# Hành trình game hoá

Tài liệu chi tiết cho mục **Hành trình** ở `/home`. Tổng quan dự án xem [README](../README.md).

Hành trình do `course_builder` (repo pipeline OCR) biên soạn: **hành trình = 1 chương**, **chặng = 1 bài**, **nhiệm vụ = 1 mục tiêu học**. Học sinh chọn chương ở thanh "Chọn chương"; app nhớ chương đã chọn theo lớp.

## Nội dung hiện có (lớp 6)

| Hành trình | Chặng (bài) | Nhiệm vụ |
|---|---|---|
| Chương 1 · Thám tử thời gian | Bài 1–3 | 7 |
| Chương 2 · Buổi bình minh của loài người | Bài 4–6 | 8 |
| Chương 3 · Những nền văn minh cổ đại | Bài 7–10 | 14 |
| Chương 4 · Đông Nam Á: ngã tư đường của thế giới | Bài 11–13 | 7 |
| Chương 5 · Hành trình giữ nước | Bài 14, 16, 18 (Bài 15, 17, 19, 20 đang biên soạn) | 13 |

File nguồn: `data/journeys/lop6_chuong1.json` … `lop6_chuong5.json`. Bài chưa biên soạn hiện trên bản đồ với nhãn "đang được biên soạn". Học sinh lớp khác thấy ghi chú và vẫn đi thử được. Tên Chương 3 trong dataset còn lỗi OCR ("XÃ HỘI CỔ ĐẠI KẾT"); hành trình dùng `chapter_title` để hiển thị đúng.

## Luật chơi

- **Nhiệm vụ 5 bước**: nhận nhiệm vụ → kiến thức (video nếu có, rồi thẻ kiến thức kèm trang SGK) → khám phá (tư liệu, dòng thời gian, phỏng vấn nhân vật) → thử thách → kết quả.
- **Sai không mất lượt**: gợi ý 3 bậc mở dần; sai lần 2 đổi sang câu tương đương cùng mục tiêu.
- XP, mốc ôn tập (1, 3, 7, 14 ngày), điều kiện nắm vững và tỉ lệ qua chặng (80%) lấy từ trường `rules` của file hành trình.
- **Mảnh Sử Ký và huy hiệu** chỉ trao khi nắm vững: đúng ngay lần đầu ở 2 câu khác nhau vào 2 ngày khác nhau. XP thưởng công sức và cộng vào tổng XP ở dashboard.
- Chặng mở khi qua chặng trước; chặng đã có tiến độ không bị khoá lại khi biên soạn thêm bài phía trước.
- Tiến độ lưu ở `localStorage` khoá `xuyen-su-ky-journey-v1`. "Công cụ học thử" có nút sang ngày hôm sau, mở khoá mọi chặng và xoá tiến độ hành trình.

## Video nhiệm vụ

Video là animation SVG trong `src/components/JourneyVideo.tsx`. Mỗi cảnh dùng một mẫu có sẵn (`tieu_de`, `bieu_tuong`, `song_nuoc` và các mẫu tiền sử `tien_hoa`, `moc_thoi_gian`, `phat_hien`); phụ đề là lời thuyết minh kèm trang SGK; có tua và chọn cảnh. Biểu tượng, hiện vật và người nguyên thuỷ vẽ trong `videoPrehistory.tsx`, người Việt cổ trong `videoPeople.tsx`. Khung hình là hàm thuần theo thời gian nên có thể xuất MP4 sau này (Remotion).

Hiện có video "Nhà nước Văn Lang ra đời" (Chương 5) và cả 8 nhiệm vụ của Chương 2 (Bài 4–6). Lời từng cảnh bám câu trích SGK của chính cảnh đó và được `course_builder` kiểm.

**Thuyết minh thu sẵn**: `npm run build:narration` (cần `ELEVENLABS_API_KEY`, giọng ở `ELEVENLABS_NARRATOR_VOICE_ID`) ghi MP3 vào `public/audio/journeys/<hành trình>/` và dấu băm từng câu vào `data/journeys/narration/`. Chỉ cảnh mới hoặc đổi lời mới được thu lại; server chỉ gắn âm thanh khi câu còn khớp, cảnh lệch tự dùng giọng trình duyệt. Học sinh nghe file tĩnh nên không tốn lượt gọi dịch vụ. Gói ElevenLabs Free chỉ dùng được giọng premade. Mỗi cảnh dài bằng câu đọc + 0,6 giây (đo từ file MP3 bằng `scripts/mp3-duration.mjs`).

## API và kiểm tra dữ liệu

- `GET /api/journeys?grade=6`: danh sách hành trình.
- `GET /api/journeys/<id>`: nội dung, chỉ kèm `chunk_id` và trang, không gửi câu trích SGK.

Khi server đọc file, mọi câu trích phải có nguyên văn trong chunk được dẫn, đúng lớp và đúng trang; sai một chỗ thì cả hành trình không được phục vụ. `npm run check:dataset` kiểm tra cả hành trình.

## Cập nhật nội dung

```bash
# Ở repo pipeline
python -m course_builder.build
# Ở repo này
npm run import:journey -- <đường dẫn>/course/<id>.json
node --test tests/journey.test.mjs
npx playwright test tests/journey.spec.ts tests/lesson-journey.spec.ts
```
