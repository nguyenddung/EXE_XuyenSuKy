# Xuyên Sử Kí — MVP Homepage

Trang chủ demo cho nền tảng học Lịch sử Việt Nam dành cho học sinh THCS lớp 6–9. Dự án dùng React, TypeScript, Vite, Tailwind CSS, React Router và Lucide React. Toàn bộ nội dung hiện là dữ liệu mẫu, không có backend hay API AI.

**Bản demo:** [xuyen-su-ky.vercel.app](https://xuyen-su-ky.vercel.app)

## Chạy dự án

Yêu cầu Node.js 18 trở lên và npm.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in ra trong terminal (thường là `http://localhost:5173`).

Kiểm tra bản production:

```bash
npm run build
npm run preview
```

## Triển khai Vercel

Production: [xuyen-su-ky.vercel.app](https://xuyen-su-ky.vercel.app).

[GitHub Actions](.github/workflows/deploy-vercel.yml) tự chạy khi push lên `main` hoặc mở/cập nhật pull request vào `main`:

1. Cài dependencies từ lockfile bằng `npm ci`.
2. Cài Chromium và chạy toàn bộ kiểm thử Playwright cho minigame, thư viện và sổ tay.
3. Kiểm tra TypeScript và build Vite bằng `npm run build`.
4. Chỉ với `main` và sau khi mọi kiểm tra thành công: gọi Vercel Deploy Hook, chờ trạng thái deployment thành công từ Vercel trên đúng commit. Pull request chỉ kiểm thử/build.

Có thể chạy lại bằng **Actions → CI/CD to Vercel → Run workflow**, chọn nhánh `main`. Nếu commit đã có bản mới hơn trên `main`, workflow bỏ qua deploy bản cũ để bản mới nhất được triển khai.

Project `xuyen-su-ky` đã liên kết repository `nguyenddung/EXE_XuyenSuKy`, production branch là `main`. GitHub secret `VERCEL_DEPLOY_HOOK` chứa hook riêng `github-actions-production` cho project này. URL hook là thông tin bí mật, không đưa vào source code hoặc log. CI không cần token truy cập toàn tài khoản Vercel.

`git.deploymentEnabled: false` trong `vercel.json` tắt deploy trực tiếp khi push Git, để chỉ workflow đã vượt qua kiểm thử kích hoạt hook. Framework là Vite, lệnh build là `npm run build`, đầu ra là `dist`; fallback về `index.html` hỗ trợ React Router.

Khi cần thay hook: vào Vercel → Project Settings → Git → Deploy Hooks, tạo hook cho `main`, rồi nhập URL qua lệnh sau (không truyền URL trên command line):

```bash
gh secret set VERCEL_DEPLOY_HOOK -R nguyenddung/EXE_XuyenSuKy
```

Thu hồi hook cũ trong Vercel sau khi thay secret. Các variables `VERCEL_ORG_ID` và `VERCEL_PROJECT_ID` có thể giữ để sử dụng CLI thủ công, workflow hiện tại không cần chúng.


## Cấu trúc

```text
src/
  components/  Các section và thành phần giao diện
  data/        Dữ liệu mẫu cho lớp học, nhân vật, timeline, thử thách, bảng xếp hạng
  hooks/       Trạng thái demo và lưu trữ trên trình duyệt
  pages/       HomePage (landing ở `/`, trang học ở `/home`)
  types/       Các kiểu dữ liệu chung
  App.tsx      React Router
  main.tsx     Điểm vào ứng dụng
  index.css    Tailwind và style giao diện
  demo.css     Style cho đăng nhập, bài học và thử thách
  heritage.css Bộ nhận diện "di sản": hero, ảnh nhân vật, trang học
public/
  images/characters/  Minh họa nhân vật (WebP)
```

## Tương tác demo

- Menu điều hướng cuộn đến các section; menu mobile có nút mở/đóng.
- Chọn một trong bốn lớp sẽ đổi bài học tương ứng và cuộn đến hành trình học.
- Đăng nhập bằng `minh@xuyensuki.vn` / `demo123`, hoặc dùng nút **Điền tài khoản mẫu**. Đây chỉ là kiểm tra dữ liệu trên frontend.
- Câu hỏi kiểm tra bài học yêu cầu đăng nhập; phần đọc, ghi chú và thẻ ôn tập dùng ngay không cần tài khoản; hoạt động đang chọn tự mở sau đăng nhập. Bốn minigame chơi ngay không cần tài khoản, hoàn thành nhận XP một lần mỗi trò.
- Tiến độ, XP, huy hiệu và điểm của Minh trên bảng xếp hạng cập nhật ngay. XP chỉ nhận một lần cho mỗi hoạt động, kể cả khi chơi lại.
- Trạng thái demo được lưu trong `localStorage`; có thể đăng xuất, đăng nhập lại hoặc dùng **Đặt lại dữ liệu demo** trong hồ sơ.
- Nhấn “Trò chuyện” để mở hộp thoại nhân vật. Mọi câu hỏi nhận cùng một phản hồi mẫu; không gửi dữ liệu ra ngoài.
- Streak và lịch học được tính từ hoạt động thực trên trình duyệt. Hồ sơ Minh, bảng xếp hạng, thống kê tổng và nội dung mẫu vẫn phục vụ bản demo.

## Hướng mở rộng

Phase 2 có thể bổ sung tài khoản thật, đồng bộ tiến độ qua backend, bài học dài hơn, thêm màn chơi và nội dung theo lớp, nội dung nhân vật được kiểm duyệt và tích hợp AI khi có backend phù hợp.


## Phòng minigame

- **Xếp dòng sử**: sắp xếp 5 sự kiện bằng nút lên/xuống; có gợi ý năm, phản hồi vị trí đúng (+60 XP).
- **Lật thẻ ký ức**: 8 thẻ, ghép 4 cặp nhân vật và dấu ấn; giải thích từng cặp (+60 XP).
- **Thám tử nhân vật**: giải 3 hồ sơ bằng manh mối, loại trừ đáp án, điểm suy luận (+80 XP).
- **Mật lệnh Bạch Đằng**: 3 chặng quyết định về địa hình và thủy triều; giải thích từ tài liệu Bảo tàng Lịch sử Quốc gia (+80 XP).

Không giới hạn thời gian hoặc lượt thử. Sao phản ánh hiệu quả của lượt chơi; gợi ý và sai đáp án không làm mất phần thưởng hoàn thành. Chơi lại không cộng trùng XP. Dữ liệu lưu cục bộ cùng phiên demo; không có đồng bộ tài khoản hoặc chống sửa điểm từ phía máy chủ. Đóng giữa chừng sẽ bắt đầu ván mới, không mất XP đã nhận.

Dữ liệu và luật chơi: `src/data/minigames.ts`, `src/components/MiniGameModal.tsx`; giao diện: `src/minigames.css`.

### Kiểm thử minigame

```bash
npm ci
npx playwright install chromium
npm run test:games
```

Máy Windows có Edge có thể dùng PowerShell: `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run test:games`.

Bộ kiểm thử bao gồm bốn game, đáp án sai, gợi ý, hoàn thành, chống cộng XP trùng, lưu sau reload, mobile, focus bàn phím và Escape. Chạy `npm run build` trước deploy.


## Thư viện và sổ tay học tập

- 12 bài đọc gợi ý cho lớp 6–9, mỗi bài có một thẻ ôn tập và câu hỏi nhận XP. Nội dung mock ngắn gọn, nhãn lớp không cam kết khớp một bộ sách giáo khoa cụ thể.
- Tìm kiếm tiếng Việt có/không dấu trong tiêu đề, giai đoạn và nội dung; lọc lớp, đã lưu, chưa đọc, cần ôn hoặc có ghi chú; tải thêm bài.
- Màn đọc hỗ trợ chữ lớn, đánh dấu đã đọc, lưu yêu thích, tự đánh giá thẻ ôn tập và ghi chú tối đa 2.000 ký tự mỗi bài.
- Mục tiêu 1/3/5 hoạt động mỗi ngày, lịch 7 ngày, gợi ý bài theo lớp và lịch sử gần đây. Ngày tính theo múi giờ Việt Nam. Mỗi tổ hợp nội dung/loại hoạt động tính một lượt mỗi ngày. Chơi lại và ôn lại có thể duy trì chuỗi ngày nhưng không cộng thêm XP đã nhận.
- Sổ tay lưu tại `xuyen-su-ky-journal-v1`, độc lập với khóa phiên cũ để giữ nguyên XP. Nhật ký giữ 1.000 hoạt động gần nhất. Không suy diễn ngày học cho thành tích từ trước khi nhật ký được bổ sung.
- Có thông báo nếu trình duyệt chặn hoặc hết dung lượng lưu trữ. Đặt lại dữ liệu demo cần xác nhận và xóa cả phiên học, sổ tay, yêu thích, ghi chú.

`npm run test:games` chạy cả kiểm thử minigame lẫn thư viện: lưu dữ liệu, bộ lọc, ghi chú, XP, mốc nửa đêm theo giờ Việt Nam, bàn phím, mobile và lỗi lưu trữ.
