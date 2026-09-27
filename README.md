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

Mỗi lần push lên `main`, [GitHub Actions](.github/workflows/deploy-vercel.yml) sẽ build và deploy production lên Vercel. Có thể chạy lại thủ công bằng **Actions → Deploy to Vercel → Run workflow**.

Workflow dùng GitHub secret `VERCEL_TOKEN` và hai repository variables `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Framework là Vite, lệnh build là `npm run build`, thư mục đầu ra là `dist`. `vercel.json` cấu hình fallback về `index.html` cho React Router.

Tạo token tại [vercel.com/account/tokens](https://vercel.com/account/tokens) (scope là team chứa project `xuyen-su-ky`), rồi lưu vào GitHub:

```bash
gh secret set VERCEL_TOKEN -R nguyenddung/EXE_XuyenSuKy
```

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
- Bài học yêu cầu đăng nhập; hoạt động đang chọn tự mở sau đăng nhập. Bốn minigame chơi ngay không cần tài khoản, hoàn thành nhận XP một lần mỗi trò.
- Tiến độ, XP, huy hiệu và điểm của Minh trên bảng xếp hạng cập nhật ngay. XP chỉ nhận một lần cho mỗi hoạt động, kể cả khi chơi lại.
- Trạng thái demo được lưu trong `localStorage`; có thể đăng xuất, đăng nhập lại hoặc dùng **Đặt lại dữ liệu demo** trong hồ sơ.
- Nhấn “Trò chuyện” để mở hộp thoại nhân vật. Mọi câu hỏi nhận cùng một phản hồi mẫu; không gửi dữ liệu ra ngoài.
- Streak, nhân vật, thống kê và nội dung câu hỏi vẫn là mock data.

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
