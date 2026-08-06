# Bot chấm công tổ công đoàn (Telegram + Discord)

Bot hỗ trợ ghi nhận phát sinh chấm công (nghỉ, tăng ca, về sớm, đến muộn) và xem thống kê giờ làm theo ca A/B/C.

Mỗi tài khoản Telegram **hoặc** Discord quản lý **tổ riêng** — dữ liệu không dùng chung giữa các user / nền tảng.

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
| `TELEGRAM_BOT_TOKEN` | Token từ BotFather (bắt buộc) |
| `DISCORD_BOT_TOKEN` | Token bot Discord (tuỳ chọn — bỏ trống thì chỉ chạy Telegram) |
| `MONGODB_URI` | Connection string MongoDB |
| `SHIFT_EPOCH` | Ngày mốc lịch ca, mặc định `2026-08-01` |

## Chạy

```bash
# Local (dev)
npm run dev

# Docker (giống production)
docker compose up -d --build
```

## Setup Discord

1. Vào [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Tab **Bot** → **Reset Token** → copy vào `.env` (`DISCORD_BOT_TOKEN`).
3. Cùng tab Bot → **Privileged Gateway Intents** → bật **Message Content Intent** → Save.
4. Tab **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands` (Use Application Commands)
5. Mở link invite, thêm bot vào **một server bất kỳ** (cần để user mở được DM với bot).
6. Restart app (`npm run dev` hoặc Docker). Log sẽ có dòng `Discord bot @... is ready` và `/start registered`.

### Cách dùng Discord

- Chỉ hỗ trợ **DM** (tin nhắn riêng với bot). Trong server channel bot sẽ từ chối và hướng dẫn sang DM.
- Trong DM: gõ `/start` (hoặc gửi `/start`) → đọc hướng dẫn + panel nút.
- Bấm nút trên panel để thao tác (cùng luồng Telegram: máy → người → phát sinh → thống kê).
- Khi bot hỏi nhập text (tên, năm sinh, phút…), trả lời bằng tin nhắn; bấm **Hủy** để thoát wizard.

## Deploy free (Oracle Cloud Always Free)

Xem hướng dẫn chi tiết: [deploy/oracle-cloud.md](deploy/oracle-cloud.md)

Tóm tắt: tạo VM Ubuntu Always Free → cài Docker → clone repo → tạo `.env` → `docker compose up -d --build`. MongoDB vẫn dùng Atlas free.

## CI/CD Contabo VPS

Đã có Docker trên Contabo? Setup auto-deploy khi push `main`:

→ [deploy/contabo-cicd.md](deploy/contabo-cicd.md)

Cần thêm GitHub Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_APP_DIR`.

## Kiểm tra lịch ca

```bash
npm test
```

Ngày mốc `01/08/2026`: Ca A đêm cuối, Ca B nghỉ, Ca C sáng đầu. Chu kỳ 6 ngày: 2 đêm → 1 nghỉ → 2 sáng → 1 nghỉ.

## Luồng dùng gợi ý

**Telegram:** reply keyboard (nút dưới khung chat). Gõ `/start` để mở lại menu.

**Discord:** panel nút trong DM. Gõ `/start` để mở hướng dẫn + menu.

1. **Thêm máy** — thêm máy của tổ
2. **Thêm người vào tổ** — tên → năm sinh → ca → **chọn máy**
3. **Thêm phát sinh** — ghi phát sinh khi có
4. **Thống kê tháng** — xem bảng công

## Menu

| Nút | Mô tả |
|---|---|
| Thêm người vào tổ | Thêm người vào tổ |
| Hiện danh sách tổ | Hiện danh sách tổ |
| Sửa người trong tổ | Sửa người trong tổ |
| Ngưng công nhân | Ngưng công nhân |
| Thêm phát sinh | Thêm phát sinh |
| Xóa phát sinh | Xóa phát sinh |
| Thống kê tháng | Thống kê tháng |
| Thêm máy | Thêm máy |
| Danh sách máy | Danh sách máy |
| Sửa máy | Sửa tên máy |
| Xóa máy | Xóa máy (chỉ khi không còn người gán) |
| Hủy | Hủy thao tác đang làm |

Nếu không có phát sinh, ngày làm theo ca = **12 giờ**; ngày nghỉ theo ca = **0 giờ**.
