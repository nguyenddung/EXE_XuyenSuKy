# Xuyên Sử Ký

[![CI/CD to Vercel](https://github.com/nguyenddung/EXE_XuyenSuKy/actions/workflows/deploy-vercel.yml/badge.svg?branch=main)](https://github.com/nguyenddung/EXE_XuyenSuKy/actions/workflows/deploy-vercel.yml)

Nền tảng học Lịch sử Việt Nam và thế giới cho học sinh lớp 6–12 (chương trình GDPT 2018). Học sinh đọc bài SGK có trích nguồn, đi hành trình game hoá theo chương, chơi minigame và trò chuyện với 12 nhân vật lịch sử bằng chữ hoặc giọng nói. Giáo viên tạo lớp, giao bài và theo dõi tiến độ; quản trị viên quản lý tài khoản.

**Bản demo:** [xuyen-su-ky.vercel.app](https://xuyen-su-ky.vercel.app) · Dự án khởi nghiệp môn EXE101, FPT University.

## Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ](#công-nghệ)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Cấu hình](#cấu-hình)
- [Lệnh npm](#lệnh-npm)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Dữ liệu](#dữ-liệu)
- [API](#api)
- [Lưu trữ trên trình duyệt](#lưu-trữ-trên-trình-duyệt)
- [Kiểm thử](#kiểm-thử)
- [Triển khai](#triển-khai)
- [Giới hạn hiện tại và lộ trình](#giới-hạn-hiện-tại-và-lộ-trình)
- [Đóng góp](#đóng-góp)
- [Bản quyền nội dung](#bản-quyền-nội-dung)

## Tính năng

### Học sinh (`/home`)

- **Thư viện SGK**: 7 sách, 130 bài, 752 mục, 2.708 đoạn tư liệu. Mọi trích dẫn ghi rõ sách, bộ sách, NXB và trang. Màn đọc lưu mục đang xem, có chữ lớn, chế độ tập trung, đánh dấu đã đọc, lưu bài, ghi chú và tải sổ tay TXT.
- **Tìm kiếm** không dấu, hiểu tên gọi khác và viết tắt (`CMT8`, `Bác Hồ`, `Columbus`, `Hưng Đạo Vương`), phím tắt Ctrl/Cmd + K.
- **Dashboard**: kế hoạch học hôm nay (mục tiêu 1/3/5 hoạt động), chuỗi ngày học, bài đề xuất theo lớp, tiến độ, bảng xếp hạng.
- **Hành trình game hoá** theo chương, có video nhiệm vụ, gợi ý ba bậc, mảnh Sử Ký và huy hiệu. Chi tiết: [docs/journeys.md](docs/journeys.md).
- **Nhân vật AI**: 12 nhân vật trả lời dựa trên đoạn SGK (RAG), có nguồn; chế độ **Nhắn tin** và **Nói chuyện**, giọng đọc và trò chuyện giọng nói trực tiếp. Chi tiết: [docs/characters.md](docs/characters.md).
- **Bốn minigame**: Xếp dòng sử, Lật thẻ ký ức, Thám tử nhân vật, Mật lệnh Bạch Đằng. XP chỉ nhận một lần mỗi trò, kỷ lục 1–3 sao.
- **Lớp của em**: nhập mã lớp của giáo viên, xem bài được giao và hạn hoàn thành.
- **Học thử** không cần tài khoản; quiz, trò chuyện với nhân vật và hồ sơ cần đăng nhập.

### Giáo viên (`/giao-vien`)

Tạo lớp theo khối với mã tham gia 6 ký tự; xem từng học sinh (bài giao đã xong, bài đã đọc, XP, quiz, hoạt động gần nhất); giao bài SGK kèm hạn; xoá học sinh khỏi lớp; lưu trữ lớp; xuất CSV tiến độ. Tài khoản giáo viên mới đăng ký phải được quản trị viên duyệt.

### Quản trị viên (`/admin`)

Duyệt hoặc từ chối giáo viên; tìm, lọc người dùng; đổi vai trò; khoá và mở khoá tài khoản (không thể tự khoá, hệ thống luôn còn ít nhất một quản trị viên); xem mọi lớp, phiên bản dataset, số liệu từ API và nhật ký thao tác.

> Tài khoản, lớp học và tiến độ hiện là **bản demo lưu trên trình duyệt**; quyền chỉ được kiểm tra ở giao diện. Thiết kế bản chính thức (FastAPI, PostgreSQL, Docker, phân quyền ở máy chủ) nằm trong [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6, lucide-react |
| Backend | Node.js 24, một handler HTTP dùng chung cho dev server và Vercel Functions |
| Kiểm tra dữ liệu | Ajv (JSON Schema 2020-12), SHA-256 checksum |
| AI | OpenAI (sinh câu trả lời, embedding `text-embedding-3-small`, moderation) |
| Giọng nói | ElevenLabs (TTS, Conversational AI), Azure Speech, Web Speech API |
| Giới hạn lượt | Bộ nhớ instance hoặc Upstash Redis |
| Kiểm thử | `node:test`, Playwright (Chromium) |
| Hạ tầng | Vercel, GitHub Actions |

## Bắt đầu nhanh

Yêu cầu: **Node.js 24** và npm.

```bash
git clone https://github.com/nguyenddung/EXE_XuyenSuKy.git
cd EXE_XuyenSuKy
npm ci
npm run dev
```

Mở địa chỉ Vite in ra (thường là `http://localhost:5173`). Dev server phục vụ cả frontend và API `/api/*` trên cùng origin. App chạy được ngay không cần khoá API: trò chuyện trả trích đoạn SGK và giọng đọc dùng giọng của trình duyệt.

Tài khoản mẫu (mật khẩu đều là `demo123`; trang đăng nhập có nút điền nhanh):

| Vai trò | Email | Trang |
|---|---|---|
| Học sinh | `dung@xuyensuki.vn` | `/home` |
| Giáo viên | `dung.gv@xuyensuki.vn` | `/giao-vien` |
| Quản trị viên | `admin@xuyensuki.vn` | `/admin` |

Chạy bản production ở máy:

```bash
npm run build
npm run preview
```

## Cấu hình

Sao chép `.env.example` thành `.env.local` (đã được Git bỏ qua) rồi khởi động lại server. Mọi khoá chỉ nằm ở backend: **không** dùng tiền tố `VITE_` và không đưa vào mã frontend. Trên Vercel, đặt các biến trong **Project Settings → Environment Variables** rồi redeploy.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `OPENAI_API_KEY` | — | Bật câu trả lời RAG; thiếu thì trả trích đoạn SGK |
| `OPENAI_MODEL` | `gpt-5-mini,gpt-5` | Các model sinh câu trả lời theo thứ tự ưu tiên, cách nhau bằng dấu phẩy; model nào key không dùng được (OpenAI trả 404) thì chuyển sang model sau |
| `OPENAI_FALLBACK_MODEL` | `gpt-4.1-mini` | Model cuối cùng khi không model nào ở trên dùng được. Không xếp `gpt-5-nano` trước model này: thử trên câu hỏi thật, nano trả lời kém hơn |
| `AI_DISABLED` | — | `1` để tắt AI ngay mà không xoá khoá |
| `CHAT_RATE_PER_MINUTE` | `12` | Số câu hỏi mỗi phút mỗi IP (vượt → HTTP 429) |
| `AI_ANSWERS_PER_DAY` / `AI_GLOBAL_ANSWERS_PER_DAY` | `40` / `500` | Hạn mức câu trả lời AI mỗi IP / toàn hệ thống |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | — | Dùng chung bộ đếm giới hạn giữa các instance |
| `SPEECH_PROVIDER` | — | `elevenlabs` hoặc `azure` |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_MODEL` | — | Giọng đọc, trò chuyện trực tiếp và thuyết minh video; mỗi nhân vật một giọng riêng trong `shared/character-voices.json` |
| `ELEVENLABS_VOICE_<ID_NHAN_VAT>` | — | Thay giọng của một nhân vật (ví dụ `ELEVENLABS_VOICE_TRAN_HUNG_DAO`) |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | — | Giọng đọc bằng Azure |
| `SPEECH_DISABLED`, `LIVE_VOICE_DISABLED` | — | `1` để tắt giọng máy chủ / trò chuyện giọng nói trực tiếp |
| `SPEECH_RATE_PER_MINUTE`, `SPEECH_REQUESTS_PER_DAY`, `SPEECH_GLOBAL_REQUESTS_PER_DAY` | `12`, `40`, `500` | Hạn mức tạo âm thanh |
| `DATASET_PATH` | `data/history` | Đọc dataset từ thư mục khác (chỉ dùng ở máy local) |
| `HOST`, `PORT` | `127.0.0.1`, `3001` | Địa chỉ của `npm run dev:backend` |

Chi tiết từng dịch vụ giọng nói và pipeline RAG: [docs/characters.md](docs/characters.md).

## Lệnh npm

| Lệnh | Việc làm |
|---|---|
| `npm run dev` | Dev server (frontend + API) |
| `npm run dev:backend` | Chỉ chạy API tại `http://127.0.0.1:3001/api/health` |
| `npm run build` / `npm run preview` | Kiểm tra TypeScript, build và xem bản production |
| `npm run test:backend` | Kiểm thử API, RAG, giọng nói, lịch sử chat, hành trình |
| `npm run test:games` | Toàn bộ kiểm thử Playwright |
| `npm run check:dataset` | Xác minh checksum, schema, số lượng và hành trình |
| `npm run import:dataset -- <thư mục>` | Nhập snapshot dataset SGK mới |
| `npm run import:journey -- <file.json>` | Nhập hành trình từ `course_builder` |
| `npm run build:embeddings` | Tạo lại chỉ mục embedding (cần `OPENAI_API_KEY`) |
| `npm run build:narration` | Thu thuyết minh video bằng ElevenLabs |
| `npm run sync:voice-agents` | Tạo/cập nhật agent giọng nói của các nhân vật |
| `npm run voices:design` / `voices:create` / `voices:reset` | Thiết kế giọng Việt riêng cho từng nhân vật bằng ElevenLabs Voice Design ([chi tiết](docs/characters.md)) |

## Cấu trúc thư mục

```text
.
├── api/dataset.js          # Điểm vào Vercel Function, gọi server/handler.mjs
├── server/                 # Backend: định tuyến API, dataset, nhân vật, giọng nói, hành trình
│   ├── handler.mjs         # Router /api/* dùng chung cho dev server và Vercel
│   ├── dataset.mjs         # Nạp, kiểm tra và tìm kiếm dataset SGK
│   ├── enrichment.mjs      # Mốc sự kiện và tên gọi khác
│   └── rag/                # Guardrail, embedding, giới hạn lượt, pipeline trả lời
├── src/                    # Frontend React
│   ├── pages/              # HomePage (/ và /home), LoginPage, TeacherPage, AdminPage
│   ├── components/         # Dashboard, thư viện, hành trình, nhân vật, minigame, khu quản lý
│   ├── hooks/              # Phiên đăng nhập, sổ tay học, hành trình, lớp học
│   ├── lib/                # Gọi API, tài khoản demo, lớp học (school.ts), lịch sử chat
│   └── data/               # Nội dung minh hoạ: giai đoạn, minigame, bảng xếp hạng
├── shared/                 # Hồ sơ, giọng và agent của nhân vật (dùng chung client/server)
├── data/
│   ├── history/            # Dataset SGK (manifest, lessons, chunks, schema, checksum)
│   ├── enrichment/         # Dữ liệu nhóm tự biên soạn
│   ├── embeddings/         # Chỉ mục vector cho RAG
│   └── journeys/           # Hành trình game hoá và dấu băm thuyết minh
├── public/                 # Ảnh nhân vật, minh hoạ dashboard, âm thanh thuyết minh
├── scripts/                # Nhập dữ liệu, kiểm tra, tạo embedding, thu âm, đồng bộ agent
├── tests/                  # node:test (*.test.mjs) và Playwright (*.spec.ts)
└── docs/                   # Kiến trúc, lộ trình và tài liệu chi tiết
```

## Dữ liệu

| Nguồn | Nội dung | Tài liệu |
|---|---|---|
| `data/history` | Văn bản phần Lịch sử của 7 SGK lớp 6–12, tách theo chương, bài, mục, chia chunk; phiên bản 1.0.0 | [data/history/README.md](data/history/README.md) |
| `data/enrichment` | 80 mốc sự kiện gắn với bài và 77 nhóm tên gọi khác, nhóm tự viết, không chép SGK | [data/enrichment/README.md](data/enrichment/README.md) |
| `data/embeddings` | `text-embedding-3-small`, 512 chiều, int8 | [docs/characters.md](docs/characters.md) |
| `data/journeys` | 5 hành trình lớp 6 | [docs/journeys.md](docs/journeys.md) |

Backend nạp dataset một lần mỗi tiến trình và kiểm tra checksum, JSON Schema, số lượng, ID duy nhất và mọi tham chiếu giữa chunk, bài, sự kiện. Dữ liệu lỗi thì API trả `503 DATASET_UNAVAILABLE` và giao diện cho phép thử lại hoặc dùng **Bài học thử**. API không bao giờ sửa dataset.

Cập nhật snapshot dataset:

```bash
npm run import:dataset -- "<thư mục dataset>"
npm run check:dataset
npm run test:backend
npm run build:embeddings   # khi nội dung chunk thay đổi
```

Dataset không có đáp án trắc nghiệm, vì vậy bài SGK dùng đánh dấu đã đọc, tự đánh giá và ghi chú thay vì chấm điểm tự động.

## API

Mọi endpoint nằm dưới `/api`, trả JSON, lỗi có dạng `{ "error": { "code", "message" } }`.

| Phương thức và đường dẫn | Chức năng |
|---|---|
| `GET /health` | Trạng thái và thống kê dataset |
| `GET /metadata` | Phiên bản, lớp, chương, số bài, bài gợi ý |
| `GET /lessons?grade=7&q=bach%20dang&chapter=&ids=&excludeIds=&page=1&limit=12` | Danh sách bài: tìm không dấu, lọc, phân trang |
| `GET /lessons/{id}` | Nội dung các mục và nguồn của bài (ví dụ `LS7_B01`) |
| `GET /lessons/{id}/chunks?type=body` | Chunk của bài theo loại nội dung |
| `GET /search?q=CMT8&grade=9` | Đoạn tư liệu phù hợp kèm trang; mở rộng theo tên gọi khác |
| `GET /chunks/{id}` | Một chunk theo ID |
| `GET /events?lesson=LS7_B17&grade=&scope=vn\|world&q=` | Mốc sự kiện gắn với bài, sắp theo năm |
| `GET /characters?grade=7&q=` | Danh mục nhân vật đối chiếu với dataset |
| `GET /characters/{id}` | Hồ sơ nhân vật và bài liên quan |
| `POST /characters/{id}/chat` | `{ "message": "...", "history": [] }` → câu trả lời, nguồn, bài học |
| `POST /characters/{id}/speech` | `{ "text": "..." }` → MP3 |
| `POST /characters/{id}/voice-session` | Mở phiên trò chuyện giọng nói trực tiếp |
| `GET /journeys?grade=6`, `GET /journeys/{id}` | Hành trình game hoá |

Ràng buộc chung: `page ≥ 1`, `limit` 1–50, `grade` 6–12, `q` tối đa 200 ký tự (tìm kiếm cần ít nhất 2 ký tự). Tìm kiếm chỉ trả các loại `body`, `source`, `did_you_know`, `caption`, không coi câu hỏi hay bài tập là câu trả lời.

## Lưu trữ trên trình duyệt

Bản demo chưa có cơ sở dữ liệu người dùng; mọi dữ liệu cá nhân nằm trong `localStorage`/`sessionStorage` của trình duyệt, không đồng bộ giữa thiết bị.

| Khoá | Nội dung |
|---|---|
| `xuyen-su-ky-demo-v1`, `xuyen-su-ky-auth-v1` | Phiên đăng nhập, lớp đã chọn, XP, minigame |
| `xuyen-su-ky-local-account-v1` | Tài khoản đăng ký trên trình duyệt (email, mật khẩu băm có salt) |
| `xuyen-su-ky-school-v1` | Danh bạ người dùng, vai trò, lớp học, bài giao, nhật ký quản trị |
| `xuyen-su-ky-journal-v1` | Sổ tay: bài đã đọc, đã lưu, ghi chú, lịch học |
| `xuyen-su-ky-reader-v1` | Tuỳ chọn màn đọc |
| `xuyen-su-ky-journey-v1`, `xuyen-su-ky-journey-selected-v1` | Tiến độ và chương đang chọn của hành trình |
| `xuyen-su-ky-chat-v1:<chủ sở hữu>:<nhân vật>` | Lịch sử trò chuyện |

Đăng nhập không ghi nhớ chỉ kéo dài trong phiên trình duyệt; chọn **Ghi nhớ đăng nhập** để giữ 30 ngày. Không dùng mật khẩu thật cho tài khoản demo.

## Kiểm thử

```bash
npm run check:dataset     # toàn vẹn dữ liệu
npm run test:backend      # API, RAG, guardrail, giọng nói, hành trình, dữ liệu làm giàu
npx playwright install chromium
npm run test:games        # toàn bộ kiểm thử trình duyệt
```

Chạy một nhóm: `npx playwright test tests/roles.spec.ts`. Playwright tự khởi động dev server với `AI_DISABLED=1` và `SPEECH_DISABLED=1`, nên không gọi dịch vụ trả phí. Trên Windows có Edge: `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run test:games`.

| Nhóm | Tệp |
|---|---|
| Đăng nhập, học thử, chọn lớp | `auth`, `onboarding` |
| Vai trò giáo viên, quản trị, lớp học | `roles` |
| Dashboard, thư viện, sổ tay | `dashboard`, `dataset`, `learning`, `study-experience` |
| Hành trình | `journey`, `lesson-journey`, `journey.test.mjs` |
| Nhân vật, giọng nói, lịch sử chat | `characters`, `character-*`, `live-voice`, `chat-history` |
| Minigame | `minigames` |

## Triển khai

Production: [xuyen-su-ky.vercel.app](https://xuyen-su-ky.vercel.app), project Vercel `xuyen-su-ky`, nhánh production `main`.

Workflow [CI/CD to Vercel](.github/workflows/deploy-vercel.yml) chạy khi push lên `main` và khi mở hoặc cập nhật pull request vào `main`:

1. `npm ci`
2. `npm run check:dataset` và `npm run test:backend`
3. Cài Chromium, chạy `npm run test:games`
4. `npm run build`
5. Chỉ với `main` và khi mọi bước trên thành công: gọi Vercel Deploy Hook rồi chờ deployment của đúng commit báo thành công. Nếu `main` đã có commit mới hơn, bản cũ bỏ qua bước deploy.

Pull request chỉ kiểm thử và build. Có thể chạy lại thủ công ở **Actions → CI/CD to Vercel → Run workflow**.

`vercel.json` đặt `git.deploymentEnabled: false` để chỉ workflow đã qua kiểm thử mới kích hoạt deploy; mọi đường dẫn `/api/*` được chuyển tới một function, các đường dẫn khác về `index.html` cho React Router.

Deploy hook lưu trong GitHub secret `VERCEL_DEPLOY_HOOK` và là thông tin bí mật. Khi cần thay: tạo hook mới cho `main` ở **Vercel → Project Settings → Git → Deploy Hooks**, cập nhật secret bằng lệnh sau (dán URL khi được hỏi, không truyền trên dòng lệnh), rồi thu hồi hook cũ:

```bash
gh secret set VERCEL_DEPLOY_HOOK -R nguyenddung/EXE_XuyenSuKy
```

## Giới hạn hiện tại và lộ trình

- Tài khoản, vai trò, lớp học, tiến độ và lịch sử chat chỉ lưu trên trình duyệt; phân quyền chỉ ở giao diện.
- Bảng xếp hạng, hồ sơ mẫu của Dũng, một số bài học thử và thống kê tổng là nội dung minh hoạ.
- Hành trình mới có lớp 6; video nhiệm vụ mới có Chương 2 và một nhiệm vụ của Chương 5.
- Hoạt hình nói chưa đồng bộ khẩu hình theo âm vị.

Định hướng phát triển đầy đủ nằm trong **[docs/ROADMAP.md](docs/ROADMAP.md)**: tầm nhìn, 5 giai đoạn, chỉ số theo dõi, rủi ro và các việc nhóm cần quyết định. Tóm tắt:

| Giai đoạn | Thời gian (đề xuất) | Trọng tâm |
|---|---|---|
| 1 · MVP cho EXE101 | 11 – 12/2026 | Hoàn thiện hành trình lớp 6, giọng Việt riêng, dùng thử với học sinh và giáo viên |
| 2 · Nền tảng thật | 01 – 04/2027 | FastAPI + PostgreSQL + Docker ([docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)), đăng nhập thật, đồng bộ tiến độ |
| 3 · Nội dung THCS | 03 – 06/2027 | Hành trình lớp 7 – 9, ngân hàng câu hỏi có nguồn |
| 4 · Thí điểm nhà trường | 07 – 10/2027 | Lớp học thật, báo cáo cho giáo viên, khảo sát trước – sau |
| 5 · Bền vững | từ 09/2027 | Bản quyền nội dung, mô hình kinh doanh, PWA, lớp 10 – 12 |

## Đóng góp

Quy trình đầy đủ trong [CONTRIBUTING.md](CONTRIBUTING.md). Tóm tắt:

1. Tạo nhánh từ `main` theo loại việc: `feature/…`, `fix/…`, `docs/…`, `refactor/…`, `chore/…`. Không commit thẳng lên `main`.
2. Commit theo [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <mô tả>`, ví dụ `feat(library): show only lessons of the student's grade`, `fix(auth): keep the registration grade`. Hook `.githooks/commit-msg` (bật tự động khi `npm ci`) và workflow **Commit messages** trên mỗi PR kiểm tra định dạng.
3. Trước khi mở PR: `npm run check:dataset`, `npm run test:backend`, `npm run test:games`, `npm run build`.
4. Mở PR vào `main` với tiêu đề cùng định dạng, điền mẫu PR, chờ CI xanh và review, gộp bằng **Squash and merge**. Gộp vào `main` sẽ deploy production.
5. Không commit `.env*`, khoá API, `dist/` hay kết quả kiểm thử.

## Bản quyền nội dung

Văn bản SGK trong `data/history` thuộc bản quyền **NXB Giáo dục Việt Nam**, chỉ dùng cho mục đích học tập và nghiên cứu của nhóm, không dùng thương mại khi chưa được phép. Người cung cấp dataset đã xác nhận quyền công bố ngày 03/10/2026; PDF gốc không nằm trong repo nên trang trích dẫn là trang trong file PDF, không kèm link tải. Khi trả lời, ứng dụng luôn trích dẫn sách, bộ sách, NXB và trang. Dữ liệu trong `data/enrichment` do nhóm tự biên soạn. Minh hoạ trong `public/images/dashboard` và một phần ảnh nhân vật là tranh do AI tạo theo trí tưởng tượng, không phải tư liệu lịch sử; xem [docs/character-image-prompts.md](docs/character-image-prompts.md).
