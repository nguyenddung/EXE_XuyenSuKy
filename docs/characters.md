# Nhân vật AI: trò chuyện, RAG và giọng nói

Tài liệu chi tiết cho tính năng trò chuyện với 12 nhân vật lịch sử. Tổng quan dự án xem [README](../README.md).

## Danh mục nhân vật

Trần Hưng Đạo, Lý Thường Kiệt, Quang Trung, Hai Bà Trưng, Ngô Quyền, Lý Công Uẩn, Lê Lợi, Nguyễn Trãi, Hồ Chí Minh, Võ Nguyên Giáp, Trần Nhân Tông và Bà Triệu.

Mỗi hồ sơ chỉ hiển thị khi dataset có tư liệu nhắc đến tên hoặc bí danh. Danh mục hỗ trợ tìm không dấu, tên gọi khác, lọc theo thời kỳ và lớp, kèm số bài liên quan.

| Thành phần | Vị trí |
|---|---|
| Hồ sơ, chủ đề, câu gợi ý | `shared/characters.json` |
| Giọng đọc từng nhân vật | `shared/character-voices.json` |
| ID agent giọng nói trực tiếp | `shared/character-agents.json` |
| Chọn đoạn nguồn | `server/characters.mjs`, `server/character-evidence.mjs` |
| Pipeline RAG | `server/rag/` |
| Giao diện | `CharacterSection`, `CharacterChatModal`, `CharacterVoicePanel`, `CharacterLiveVoice`, `CharacterStage` |
| Prompt và đường dẫn ảnh minh hoạ | [character-image-prompts.md](character-image-prompts.md) |

Trò chuyện chỉ dành cho tài khoản đã đăng nhập. Khách bấm vào nhân vật sẽ được mời đăng nhập, sau đó cuộc trò chuyện tự mở.

## Cách trả lời

Đây là **trò chuyện mô phỏng dựa trên SGK**. Backend chọn đoạn SGK theo nhân vật, chủ đề và câu hỏi, dùng ngữ cảnh câu trước cho câu hỏi nối tiếp ngắn.

- Có `OPENAI_API_KEY`: model viết lời giải thích ngắn từ các đoạn đã chọn, dẫn nguồn `[n]`. Phản hồi có `mode: rag`.
- Không có key, AI bị tắt (`AI_DISABLED=1`) hoặc OpenAI lỗi: trả trích đoạn SGK nguyên văn, `mode: textbook`.
- Câu hỏi không có đoạn nguồn phù hợp không được gửi tới OpenAI; giao diện trả thông báo và câu hỏi gợi ý.

Mọi câu trả lời có nút mở bài và nguồn sách, bộ sách, NXB, trang PDF. Dataset OCR có thể giữ lỗi chính tả của bản gốc.

### Pipeline (`server/rag/`)

Các bước rẻ chạy trước nên phần lớn câu hỏi không tốn token:

1. **Giới hạn lượt** (`limits.mjs`): vượt `CHAT_RATE_PER_MINUTE` (mặc định 12) mỗi IP → `429` kèm `Retry-After`.
2. **Guardrail đầu vào** (`guardrails.mjs`): xoá ký tự ẩn (zero-width, bidi), chặn prompt injection tiếng Việt/Anh trong câu hỏi và lịch sử chat (`mode: guardrail`, `kind: blocked`).
3. **Câu mẫu không gọi AI**: chào hỏi, cảm ơn, "bạn là ai / hỏi gì được" (`kind: smalltalk`).
4. **Truy xuất từ khoá** như chế độ trích SGK.
5. **Tra cứu đơn giản**: câu hỏi về năm có đoạn trích ngắn chứa năm đó → trả trích SGK, không gọi AI.
6. **Cache** câu trả lời AI (6 giờ, 500 câu) cho câu hỏi lặp lại.
7. **Hạn mức AI**: `AI_ANSWERS_PER_DAY` mỗi IP và `AI_GLOBAL_ANSWERS_PER_DAY` toàn hệ thống; vượt thì trả trích SGK kèm `notice`.
8. **Moderation** (miễn phí) chạy song song với **embedding** câu hỏi. Chỉ chặn nhóm không phù hợp học sinh (tình dục, tự hại, đe doạ…); không chặn "bạo lực" vì bài sử có chiến tranh.
9. **Truy xuất lai**: gộp thứ hạng từ khoá và cosine embedding bằng RRF trong phạm vi chunk của nhân vật, lấy tối đa 3 đoạn. Ngưỡng hiệu chỉnh trên dữ liệu thật: dưới 0,40 coi là lạc đề và không gọi AI.
10. **Sinh câu trả lời**: câu hỏi và tư liệu gửi dưới dạng dữ liệu JSON, kèm chỉ dẫn không làm theo lệnh nằm trong dữ liệu.
11. **Kiểm tra đầu ra**: bắt buộc trích dẫn `[n]` hợp lệ, không có link, mọi số 3–4 chữ số (năm) phải có trong tư liệu, không có tên riêng lạ; sai thì trả trích SGK.

Chỉ mục embedding ở `data/embeddings/` (`text-embedding-3-small`, 512 chiều, lượng tử int8, khoảng 1 MB). Khi dataset đổi, chạy lại `npm run build:embeddings`; nếu chỉ mục không khớp phiên bản dataset, chat tự dùng truy xuất từ khoá.

Giới hạn API: câu hỏi tối đa 1.000 ký tự, tối đa 8 lượt ngữ cảnh (2.000 ký tự/lượt), payload 16 KB, phản hồi chat không cache ở HTTP. Yêu cầu OpenAI đặt `store: false` và giới hạn token đầu ra. Backend không ghi lịch sử hội thoại và không sửa dataset.

Bộ đếm giới hạn mặc định nằm trong bộ nhớ từng instance; đặt `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` để dùng chung cho mọi instance Vercel.

## Mốc thời gian: nhân vật không biết chuyện sau thời mình

Mỗi nhân vật có năm mất (`died` trong `shared/characters.json`). `data/enrichment/timeline.json` liệt kê người, triều đại, sự kiện, tổ chức, địa danh đổi tên và phát minh kèm năm xuất hiện, và nhân vật nên được hỏi (`ask`). 12 nhân vật đều có một mục `person` ghi năm sinh.

Trước mọi bước tìm tư liệu (và trước khi gọi OpenAI), `server/time-horizon.mjs` tìm trong câu hỏi:

- tên trong `timeline.json`, ưu tiên cụm dài nhất ("Thành phố Hồ Chí Minh" là địa danh có từ năm 1976, không phải nhắc tới Bác Hồ);
- `năm X` (bỏ qua `năm X TCN`) và `thế kỷ X` / `thế kỉ 20`.

Nếu có điều xuất hiện sau năm mất, nhân vật trả lời đúng vai, không trích nguồn (`kind: anachronism`):

> Ta sống vào thế kỷ XIII và đã mất năm 1300, nên ta không thể biết Bác Hồ là ai: người ấy sinh năm 1890, 590 năm sau thời của ta. Con hãy trò chuyện trực tiếp với Hồ Chí Minh nhé.

Phản hồi kèm `redirect: { characterId, name }`: nhân vật trong `ask`, hoặc một nhân vật còn sống vào năm đó. Giao diện hiện nút **Trò chuyện với …** mở ngay cuộc trò chuyện ấy; nút được lưu cùng lịch sử. Phát minh (điện thoại, máy bay, internet…) không có ai để chuyển tới: nhân vật hỏi lại học sinh "đó là gì".

Agent trò chuyện giọng nói trực tiếp nhận cùng quy tắc trong prompt (mục *Thời đại*). Sau khi đổi prompt, chạy `npm run sync:voice-agents` để cập nhật agent trên ElevenLabs.

Thêm mục mới: sửa `timeline.json` rồi chạy `npm run test:backend`. Kiểm thử hỏi chéo 12 nhân vật với nhau, thử năm và thế kỷ sau năm mất, và bảo đảm mọi câu gợi ý, chủ đề của từng nhân vật không bị chặn nhầm. Backend từ chối nạp nếu một tên nằm ở hai mục, `ask` trỏ tới nhân vật không tồn tại hoặc nhân vật thiếu năm sinh, năm mất.

## Hai chế độ: Nhắn tin và Nói chuyện

Mỗi thẻ nhân vật có hai lối vào:

- **Nhắn tin**: lịch sử hội thoại, nguồn SGK và ô nhập văn bản. Không tự phát âm thanh.
- **Nói chuyện**: sân khấu nhân vật, lời đang nói và nút mic lớn. Nhấn **Nói câu hỏi**, kiểm tra bản nhận dạng rồi **Gửi câu hỏi**; câu trả lời tự đọc khi bật **Tự đọc câu trả lời**. **Chỉnh nội dung** chuyển sang ô nhập và giữ bản nhận dạng.

Chuyển chế độ trong cùng cửa sổ không mất lịch sử hay câu đang soạn; chuyển chế độ dừng mic và giọng đọc. Nhập giọng nói dùng Web Speech API (cần quyền micro, HTTPS hoặc localhost); trình duyệt không hỗ trợ vẫn nhập văn bản được.

### Hoạt hình nhân vật

Trần Hưng Đạo, Ngô Quyền, Hồ Chí Minh và Võ Nguyên Giáp có khung hoạt hình 2D lớn trong chế độ Nói chuyện, dùng trực tiếp tranh chân dung của thư viện. Điểm điều khiển trong `src/data/characterPortraits.ts` được căn theo từng ảnh: nhân vật chớp mắt, thở nhẹ khi chờ, gật đầu khi bật mic, suy nghĩ khi đang tra cứu, cử động miệng khi âm thanh thực sự phát. Đây là hoạt hình theo trạng thái phát âm thanh, chưa đồng bộ khẩu hình theo âm vị. Các nhân vật còn lại hiển thị chân dung tĩnh. Cài đặt giảm chuyển động của hệ điều hành tắt vòng lặp hoạt hình nhưng vẫn hiển thị trạng thái bằng chữ.

## Giọng đọc (text-to-speech)

`POST /api/characters/:id/speech` nhận `{ "text": "..." }` và trả MP3. Backend chọn giọng theo nhân vật, bỏ dấu trích dẫn `[n]` khi đọc; nội dung trên màn hình giữ nguyên. Khoá API chỉ nằm ở backend, không bao giờ dùng tiền tố `VITE_`.

**ElevenLabs** (`SPEECH_PROVIDER=elevenlabs`):

```dotenv
SPEECH_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=<secret API key, không phải Key ID>
ELEVENLABS_MODEL=eleven_flash_v2_5
```

**Mỗi nhân vật một giọng.** `shared/character-voices.json` gán cho mỗi nhân vật một giọng mặc định khác nhau của ElevenLabs (dùng được cả với gói Free), chọn theo tuổi, giới tính và tính cách, kèm độ ổn định (`stability`), độ biểu cảm (`style`) và tốc độ (`rate`) riêng:

| Nhân vật | Giọng | Nhân vật | Giọng |
|---|---|---|---|
| Hồ Chí Minh | Bill: nam lớn tuổi, ấm, chậm rãi | Lý Thường Kiệt | Charlie: tự tin, dứt khoát |
| Võ Nguyên Giáp | Brian: trầm, mạch lạc | Lý Công Uẩn | Eric: êm, ân cần |
| Trần Hưng Đạo | George: ấm, điềm tĩnh | Lê Lợi | Chris: mộc mạc, chân thành |
| Ngô Quyền | Daniel: chắc, trầm tĩnh | Nguyễn Trãi | Liam: rõ ràng, có chất văn |
| Quang Trung | Callum: mạnh, nhiều khí thế | Trần Nhân Tông | Will: nhẹ nhàng, thư thái |
| Hai Bà Trưng | Jessica: nữ trẻ, truyền lửa | Bà Triệu | Alice: nữ, khảng khái |

Thứ tự chọn giọng: `ELEVENLABS_VOICE_<ID_NHAN_VAT>` (ví dụ `ELEVENLABS_VOICE_TRAN_HUNG_DAO`), rồi giọng Việt đã thiết kế (`designedVoiceId`), rồi giọng mặc định của nhân vật. `ELEVENLABS_VOICE_ID` chỉ còn dùng cho thuyết minh video.

**Giọng Việt thiết kế riêng (giống nhân vật hơn).** Giọng mặc định là giọng tiếng Anh đọc tiếng Việt, không có giọng vùng miền. Với [Voice Design](https://elevenlabs.io/docs/eleven-api/guides/how-to/voices/voice-design), mỗi nhân vật có một mô tả (`design`) về tuổi, giọng vùng miền và tính cách, ví dụ Hồ Chí Minh: người đàn ông Việt bảy mươi tuổi, giọng Nghệ An, nhẹ, ấm, nói chậm. Mô tả không nêu tên người thật và không dùng bản ghi âm của ai: đây là giọng mô phỏng, không sao chép giọng thật.

```bash
npm run voices:design                          # 3 bản thử cho mỗi nhân vật: voice-previews/<id>/1.mp3 … 3.mp3
npm run voices:design -- ho-chi-minh ba-trieu  # chỉ vài nhân vật
npm run voices:create -- ho-chi-minh=2 ba-trieu=1   # lưu bản thử đã chọn; ghi designedVoiceId vào shared/character-voices.json
npm run voices:reset -- ho-chi-minh            # quay về giọng mặc định
npm run sync:voice-agents                      # cập nhật agent trò chuyện trực tiếp
```

Mỗi giọng đã lưu chiếm một suất giọng tự tạo của tài khoản ElevenLabs: gói Free 3, Starter 10, Creator 30. Đủ 12 nhân vật cần gói Creator; với gói nhỏ hơn, nên thiết kế trước cho các nhân vật học sinh hay trò chuyện. Commit `shared/character-voices.json` sau khi lưu để bản deploy dùng giọng mới.

**Azure Speech** (`SPEECH_PROVIDER=azure`):

```dotenv
AZURE_SPEECH_KEY=<key của Azure Speech resource>
AZURE_SPEECH_REGION=southeastasia
```

Văn bản được escape thành SSML. Giọng, tốc độ (`rate`) và cao độ (`pitch`) của 12 nhân vật nằm trong `shared/character-voices.json` (nam `vi-VN-NamMinhNeural`, nữ `vi-VN-HoaiMyNeural`). Đây là giọng mô phỏng, không phải giọng thật của nhân vật lịch sử.

**Dự phòng**: khi chưa cấu hình dịch vụ, giao diện dùng giọng tiếng Việt cài trên trình duyệt/hệ điều hành; nếu máy không có giọng tiếng Việt, giao diện hướng dẫn cách cài và không tự chọn ngôn ngữ khác. Khi dịch vụ đã cấu hình nhưng lỗi hoặc hết hạn mức, giao diện báo lỗi và giữ câu trả lời văn bản. `SPEECH_DISABLED=1` tắt giọng máy chủ.

Giới hạn mặc định: 6.000 ký tự mỗi lần đọc, 12 lượt/phút, 40 lần/ngày mỗi khách, 500 lần/ngày toàn hệ thống (theo ngày Việt Nam); chỉnh bằng `SPEECH_RATE_PER_MINUTE`, `SPEECH_REQUESTS_PER_DAY`, `SPEECH_GLOBAL_REQUESTS_PER_DAY`. Âm thanh được cache một giờ trong cùng instance (tối đa 32 mục / 24 MB).

## Trò chuyện giọng nói trực tiếp

Mỗi nhân vật có một agent ElevenLabs Conversational AI (ID trong `shared/character-agents.json`, tạo/cập nhật bằng `npm run sync:voice-agents`). Agent gọi công cụ `tra_cuu_sach_giao_khoa` ở trình duyệt để tra dataset SGK. Agent yêu cầu signed URL nên chỉ server giữ `ELEVENLABS_API_KEY` mới mở được phiên qua `POST /api/characters/:id/voice-session`; trình duyệt không thấy khoá. Tắt bằng `LIVE_VOICE_DISABLED=1` hoặc `SPEECH_DISABLED=1`.

## Lịch sử trò chuyện

Hội thoại với từng nhân vật được lưu và khôi phục khi đóng/mở chat, đổi nhân vật, mở bài nguồn hoặc tải lại trang. Hai chế độ của cùng nhân vật dùng chung lịch sử.

- **Nơi lưu**: `localStorage`, khoá `xuyen-su-ky-chat-v1:<chủ sở hữu>:<id nhân vật>`. Chủ sở hữu là `userId` của phiên (email chuẩn hoá) hoặc `guest`; tên hiển thị không bao giờ dùng làm định danh.
- **Nội dung**: câu hỏi, câu trả lời, nguồn trích dẫn và thời gian, tối đa 40 lượt mỗi nhân vật. Không lưu audio, API key, câu chưa được trả lời, lỗi hay trạng thái tải. Ngữ cảnh gửi API là 3 lượt gần nhất.
- **Độ bền**: dữ liệu hỏng, sai phiên bản hoặc sai chủ sở hữu bị bỏ qua kèm thông báo. Hết dung lượng thì bỏ dần lượt cũ; vẫn không lưu được thì chat tiếp tục trong bộ nhớ và hiện cảnh báo.
- **Phản hồi muộn**: mỗi cập nhật gắn với token (chủ sở hữu + nhân vật + lần bắt đầu hội thoại); phản hồi đến sau khi đổi người dùng, nhân vật, đóng chat hoặc bắt đầu cuộc mới bị bỏ qua.
- **Giới hạn**: chỉ lưu trên trình duyệt này, không đồng bộ giữa thiết bị, đăng xuất không xoá. Khi có backend tài khoản thật, thay `src/lib/chatHistory.ts` bằng API có kiểm tra quyền.

## Kiểm thử

```bash
npm run test:backend
npx playwright test tests/characters.spec.ts tests/character-voice.spec.ts tests/live-voice.spec.ts tests/chat-history.spec.ts tests/character-access.spec.ts
```

Kiểm thử dùng OpenAI, dịch vụ giọng nói, audio và micro giả lập; Playwright luôn đặt `AI_DISABLED=1` và `SPEECH_DISABLED=1` để không dùng khoá và hạn mức thật.
