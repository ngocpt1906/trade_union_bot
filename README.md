# Bot Telegram chấm công tổ công đoàn

Bot hỗ trợ ghi nhận phát sinh chấm công (nghỉ, tăng ca, về sớm, đến muộn) và xem thống kê giờ làm theo ca A/B/C.

Mỗi tài khoản Telegram quản lý **tổ riêng** — dữ liệu máy / công nhân / phát sinh không dùng chung giữa các user.

## Yêu cầu

- Node.js 20+
- MongoDB đang chạy (local hoặc [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) miễn phí)

## Cài đặt

```bash
npm install
cp .env.example .env
```

| Biến | Mô tả |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token từ BotFather |
| `MONGODB_URI` | Connection string MongoDB |
| `SHIFT_EPOCH` | Ngày mốc lịch ca, mặc định `2026-08-01` |

## Chạy

```bash
# Local (dev)
npm run dev

# Docker (giống production)
docker compose up -d --build
```

## Deploy free (Oracle Cloud Always Free)

Xem hướng dẫn chi tiết: [deploy/oracle-cloud.md](deploy/oracle-cloud.md)

Tóm tắt: tạo VM Ubuntu Always Free → cài Docker → clone repo → tạo `.env` → `docker compose up -d --build`. MongoDB vẫn dùng Atlas free.

## Kiểm tra lịch ca

```bash
npm test
```

Ngày mốc `01/08/2026`: Ca A đêm cuối, Ca B nghỉ, Ca C sáng đầu. Chu kỳ 6 ngày: 2 đêm → 1 nghỉ → 2 sáng → 1 nghỉ.

## Luồng dùng gợi ý

1. `/addmachine` — thêm máy của tổ
2. `/addmember` — thêm người (tên → năm sinh → ca → **chọn máy**)
3. `/newcase` — ghi phát sinh khi có
4. `/monthreport` — xem bảng công

## Lệnh Telegram

| Lệnh | Mô tả |
|---|---|
| `/addmember` | Thêm người vào tổ |
| `/listmember` | Hiện danh sách tổ |
| `/editmember` | Sửa người trong tổ |
| `/newcase` | Thêm phát sinh |
| `/removecase` | Xóa phát sinh |
| `/monthreport` | Thống kê tháng |
| `/reportrange` | Thống kê khoảng |
| `/addmachine` | Thêm máy |
| `/listmachine` | Danh sách máy |
| `/editmachine` | Sửa tên máy |
| `/deletemachine` | Xóa máy (chỉ khi không còn người gán) |
| `/start` | Mở menu |
| `/huy` | Hủy thao tác đang làm |

Nếu không có phát sinh, ngày làm theo ca = **12 giờ**; ngày nghỉ theo ca = **0 giờ**.
