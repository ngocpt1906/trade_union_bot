# Deploy lên Oracle Cloud Always Free

Bot chạy long-polling nên cần VM bật 24/7. MongoDB dùng Atlas (free) — không cần cài Mongo trên VM.

## 1. Tạo VM Always Free

1. Đăng ký / đăng nhập [cloud.oracle.com](https://cloud.oracle.com)
2. **Compute → Instances → Create instance**
3. Chọn:
   - Image: **Canonical Ubuntu 22.04** (hoặc 24.04)
   - Shape: **VM.Standard.A1.Flex** (Ampere ARM) — Always Free  
     hoặc **VM.Standard.E2.1.Micro** (AMD) nếu A1 hết quota
4. Thêm SSH public key của bạn
5. Create → ghi lại **Public IP**

## 2. Mở outbound (thường đã đủ)

Bot chỉ gọi ra ngoài (Telegram + MongoDB Atlas), **không cần mở port inbound**.  
Trong Atlas → **Network Access**, thêm IP public của VM (hoặc tạm `0.0.0.0/0`).

## 3. SSH vào VM và cài Docker

```bash
ssh ubuntu@<PUBLIC_IP>

sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
# đăng xuất rồi SSH lại để group docker có hiệu lực
exit
ssh ubuntu@<PUBLIC_IP>
```

## 4. Clone code và tạo `.env`

```bash
git clone <URL_REPO_CUA_BAN> trade_union_bot
cd trade_union_bot

cp .env.example .env
nano .env
```

Điền tối thiểu:

```env
TELEGRAM_BOT_TOKEN=...
MONGODB_URI=mongodb://...   # URI Atlas (khuyên dùng dạng mongodb:// không srv nếu DNS lỗi)
SHIFT_EPOCH=2026-08-01
TZ=Asia/Ho_Chi_Minh
```

## 5. Build và chạy

```bash
docker compose up -d --build
docker compose logs -f
```

Thấy log dạng `Bot @... is running` là OK. Thử `/start` trên Telegram.

## 6. Thao tác thường dùng

```bash
# Xem log
docker compose logs -f --tail=100

# Restart sau khi sửa .env
docker compose up -d --force-recreate

# Cập nhật code mới
git pull
docker compose up -d --build
```

## Gợi ý ổn định

- Bật **Auto-renew** / giữ account Oracle active (tránh bị reclaim idle free tier).
- Đừng commit file `.env`.
- Nếu container thoát: `docker compose ps` và `docker compose logs`.
