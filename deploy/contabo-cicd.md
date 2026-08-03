# CI/CD: GitHub → Contabo VPS (Docker)

Mỗi lần push lên `main`, GitHub Actions SSH vào VPS, kéo code mới và `docker compose up -d --build`.

## Điều kiện sẵn có

- VPS Contabo đã cài Docker + Docker Compose
- Repo đã clone trên VPS (ví dụ `/opt/trade_union_bot` hoặc `/home/ubuntu/trade_union_bot`)
- File `.env` đã có trên VPS (không nằm trong git)
- `git pull` trên VPS chạy được (repo public, hoặc đã thêm deploy key)

## 1. Tạo SSH key riêng cho CI (trên máy bạn hoặc trên VPS)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f contabo_deploy -N ""
```

- `contabo_deploy.pub` → thêm vào VPS: `~/.ssh/authorized_keys` của user deploy
- `contabo_deploy` (private) → sẽ đưa vào GitHub Secrets (xem bước 3)

Kiểm tra đăng nhập:

```bash
ssh -i contabo_deploy <USER>@<VPS_IP>
```

## 2. Chuẩn bị thư mục app trên VPS

```bash
cd /opt   # hoặc thư mục bạn đang dùng
# nếu chưa clone:
# git clone https://github.com/ngocpt1906/trade_union_bot.git
cd trade_union_bot
# đảm bảo .env đã có
ls -la .env
docker compose ps
```

Ghi lại **đường dẫn tuyệt đối**, ví dụ: `/opt/trade_union_bot`

## 3. Thêm GitHub Secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Ví dụ |
|---|---|
| `VPS_HOST` | `xxx.xxx.xxx.xxx` (IP Contabo) |
| `VPS_USER` | `root` hoặc `ubuntu` |
| `VPS_SSH_KEY` | Toàn bộ nội dung file private key `contabo_deploy` |
| `VPS_APP_DIR` | `/opt/trade_union_bot` |

`VPS_SSH_KEY` phải gồm cả dòng `-----BEGIN ... PRIVATE KEY-----` và `-----END ...-----`.

SSH port mặc định trong workflow là `22`. Nếu Contabo dùng port khác, sửa `port:` trong [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

## 4. Chạy thử

- Vào tab **Actions** → chọn workflow **Deploy to Contabo VPS** → **Run workflow**
- Hoặc push một commit lên `main`

Xem log job: phải thấy `docker compose up` thành công và container running.

## 5. Kiểm tra trên VPS

```bash
cd /opt/trade_union_bot   # đúng VPS_APP_DIR của bạn
docker compose logs -f --tail=50
```

## Lưu ý

- `.env` chỉ sửa trên VPS; không commit lên GitHub.
- `git reset --hard origin/main` sẽ ghi đè thay đổi local trên VPS (trừ `.env` vì không track).
- Nếu repo private: thêm Deploy Key (read-only) vào repo hoặc dùng HTTPS token trên VPS.
- Atlas Network Access: whitelist IP Contabo (hoặc `0.0.0.0/0`).
