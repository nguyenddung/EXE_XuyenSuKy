# Xuyên Sử Kí — MVP Homepage

Trang chủ demo cho nền tảng học Lịch sử Việt Nam dành cho học sinh THCS lớp 6–9. Dự án dùng React, TypeScript, Vite, Tailwind CSS, React Router và Lucide React. Toàn bộ nội dung hiện là dữ liệu mẫu, không có backend hay API AI.

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

Import repository vào Vercel hoặc chạy `vercel --prod` từ thư mục gốc sau khi đăng nhập Vercel CLI. Framework là Vite, lệnh build là `npm run build`, thư mục đầu ra là `dist`. `vercel.json` cấu hình fallback về `index.html` cho React Router.

## Cấu trúc

```text
src/
  components/  Các section và thành phần giao diện
  data/        Dữ liệu mẫu cho lớp học, nhân vật, timeline, thử thách, bảng xếp hạng
  hooks/       Trạng thái demo và lưu trữ trên trình duyệt
  pages/       HomePage và điều phối các tương tác
  types/       Các kiểu dữ liệu chung
  App.tsx      React Router
  main.tsx     Điểm vào ứng dụng
  index.css    Tailwind và style giao diện
  demo.css     Style cho đăng nhập, bài học và thử thách
```

## Tương tác demo

- Menu điều hướng cuộn đến các section; menu mobile có nút mở/đóng.
- Chọn một trong bốn lớp sẽ đổi bài học tương ứng và cuộn đến hành trình học.
- Đăng nhập bằng `minh@xuyensuki.vn` / `demo123`, hoặc dùng nút **Điền tài khoản mẫu**. Đây chỉ là kiểm tra dữ liệu trên frontend.
- Mở bài học hoặc một trong ba thử thách, chọn đáp án và nhận XP khi trả lời đúng. Đăng nhập được yêu cầu khi mở hoạt động; sau khi đăng nhập, hoạt động đang chọn sẽ tự mở.
- Tiến độ, XP, huy hiệu và điểm của Minh trên bảng xếp hạng cập nhật ngay. XP chỉ nhận một lần cho mỗi hoạt động, kể cả khi chơi lại.
- Trạng thái demo được lưu trong `localStorage`; có thể đăng xuất, đăng nhập lại hoặc dùng **Đặt lại dữ liệu demo** trong hồ sơ.
- Nhấn “Trò chuyện” để mở hộp thoại nhân vật. Mọi câu hỏi nhận cùng một phản hồi mẫu; không gửi dữ liệu ra ngoài.
- Streak, nhân vật, thống kê và nội dung câu hỏi vẫn là mock data.

## Hướng mở rộng

Phase 2 có thể bổ sung tài khoản thật, đồng bộ tiến độ qua backend, bài học dài hơn, trò chơi đầy đủ, nội dung nhân vật được kiểm duyệt và tích hợp AI khi có backend phù hợp.
