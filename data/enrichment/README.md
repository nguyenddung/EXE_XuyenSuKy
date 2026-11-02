# Dữ liệu làm giàu (enrichment)

Dữ liệu do nhóm tự biên soạn để bổ sung cho dataset SGK trong `data/history`, **không chép văn bản SGK**. Mọi mục đều
gắn với mã bài SGK (`LS7_B17`…) và được kiểm thử tự động đối chiếu với chính văn bản của bài đó.

| File | Nội dung | Dùng ở đâu |
|---|---|---|
| `events.json` | 80 mốc sự kiện (Việt Nam và thế giới), có năm, năm kết thúc, tóm tắt tự viết, nhân vật, địa danh và bài SGK liên quan | `GET /api/events` |
| `aliases.json` | 77 nhóm tên gọi tương đương: tên khác của nhân vật (Quang Trung / Nguyễn Huệ), phiên âm gốc (Columbus / Cô-lôm-bô), tên cũ của địa danh (Phú Xuân / Huế), viết tắt (CMT8, LHQ, CTTG2) | Mở rộng truy vấn của `GET /api/search` |
| `timeline.json` | Người, triều đại, sự kiện, tổ chức, địa danh, phát minh kèm năm xuất hiện và nhân vật nên hỏi; năm sinh của 12 nhân vật | Nhân vật AI không nói về điều sau thời mình ([docs/characters.md](../../docs/characters.md)) |
| `schema/*.schema.json` | JSON Schema 2020-12 cho các file trên | Backend kiểm tra khi nạp |

## Quy tắc biên soạn

- **Sự kiện:** chỉ ghi dữ kiện lịch sử (năm, tên, nhân vật, địa danh); câu tóm tắt tự viết, tối đa 300 ký tự. Năm âm là
  trước Công nguyên. `date` chỉ ghi khi chắc chắn ngày cụ thể.
- **Gắn bài:** chỉ gắn một bài khi bài đó thật sự nhắc tới sự kiện. Kiểm thử yêu cầu năm bắt đầu và ít nhất một nhân vật
  hoặc địa danh xuất hiện trong **từng** bài được gắn, năm kết thúc xuất hiện trong ít nhất một bài.
- **Tên gọi:** phần tử đầu của `terms` là cách viết chuẩn trong SGK và phải có trong văn bản SGK. Một cách viết (sau khi
  bỏ dấu, chữ thường) chỉ thuộc một nhóm. Chỉ gom các tên **cùng chỉ một đối tượng**; không gom các khái niệm gần nghĩa.

## Cách tìm kiếm dùng tên gọi

Truy vấn được chuẩn hoá (bỏ dấu, chữ thường). Mỗi tên trong truy vấn khớp một nhóm (ưu tiên tên dài nhất, không chồng
lấn) sẽ sinh thêm biến thể thay bằng các tên còn lại của nhóm, tối đa 12 biến thể. Ở biến thể thay tên, tên mới phải
xuất hiện **nguyên cụm** trong đoạn SGK, nên "Quang Trung" → "Nguyễn Huệ" không khớp nhầm đoạn chỉ có chữ "Huế".
Mỗi đoạn lấy điểm cao nhất trong các biến thể.

Ví dụ trước và sau khi thêm tên gọi (số đoạn SGK tìm được):

| Truy vấn | Trước | Sau |
|---|---:|---:|
| `CMT8` | 0 | 95 |
| `Bác Hồ ra đi tìm đường cứu nước` | 0 | 4 |
| `Hưng Đạo Vương Bạch Đằng` | 0 | 6 |
| `Columbus` | 1 | 7 |
| `Magellan` | 3 | 12 |

## API sự kiện

`GET /api/events` trả `{ items, total }`, sắp theo năm. Tham số tuỳ chọn:

- `lesson=LS7_B17`: sự kiện gắn với bài
- `grade=6..12`: sự kiện có ít nhất một bài thuộc khối
- `scope=vn|world`
- `q=...`: tìm trong tên, tóm tắt, nhân vật, địa danh, năm (không phân biệt dấu)

Mỗi mục: `id, year, endYear?, date?, title, summary, category, scope, people, places, lessons[{ id, grade, title }]`.

## Thêm dữ liệu

1. Sửa `events.json` hoặc `aliases.json` theo schema.
2. Chạy `npm run test:backend`. Kiểm thử báo cụ thể sự kiện nào thiếu năm hoặc tên trong bài được gắn, nhóm tên nào
   không có trong SGK, hay cách viết nào bị trùng giữa hai nhóm.
