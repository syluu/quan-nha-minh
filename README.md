# Quán Nhà Mình 🥖

Game quản lý quán ăn Việt 3D chạy trên trình duyệt, cho 2–3 người trong nhà cùng chơi một quán.

- Thiết kế: `docs/superpowers/specs/2026-11-17-quan-an-viet-design.md`
- Kế hoạch: `docs/superpowers/plans/`

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `shared/` | Dữ liệu món/máy/giá (`src/content`) và toàn bộ logic game (`src/sim`) — TypeScript thuần, có test |
| `server/` | Máy chủ Colyseus chạy logic game, lưu thế giới vào Postgres (Neon) |
| `client/` | Vite + Three.js: sảnh vào game, cảnh 3D, HUD |

Muốn chỉnh giá, lương, tốc độ…: sửa `shared/src/content/balance.ts` và các file trong `shared/src/content/`.

## Chạy thử trên máy

Cần Node 22.

```bash
cp .env.example .env      # để trống DATABASE_URL = lưu tạm trong RAM (tắt server là mất)
npm install
npm run dev               # server :2567 + client http://localhost:5173
```

Mở `http://localhost:5173` ở 2 cửa sổ (hoặc 2 máy cùng wifi qua `http://<IP-máy>:5173`), một cửa sổ "Tạo quán mới", cửa sổ kia nhập mã quán.

Điều khiển: **WASD / phím mũi tên** để đi, **lăn chuột** để phóng to/nhỏ, đứng gần máy/kệ để tự nhặt/đặt, đứng **ô vàng sau quầy** để thu ngân, đứng **2 giây** trên ô trả tiền để mua máy mới.

### Cách chơi (Kế hoạch 2)

- **Nhặt món**: đứng cạnh máy, cứ 0,45 giây được 1 món (vòng xanh quanh chân chạy dần); đủ thì bước đi. Nhãn **"3/4"** trên đầu = đang cầm 3, tối đa 4.
- **Đặt món**: đứng cạnh kệ hoặc bàn ghép, món tự đặt xuống (nhanh).
- **Thùng rác** (góc trái lối bếp): đứng yên cạnh thùng để bỏ món trên tay — mất tiền nguyên liệu của món đó.
- **Menu**: phím **M** hoặc nút ☰ (Esc để đóng). Khi menu mở nhân vật đứng yên.
  - **Báo cáo**: biểu đồ 14 ngày, bảng từng ngày (doanh thu, nguyên liệu, lương, hàng bỏ đi, lãi), món bán được hôm nay.
  - **Nhân sự**: thuê/cho nghỉ thu ngân và phụ bếp (mỗi món đang bán 1 người). Lương khởi điểm 120K/ngày, trả cuối ngày; không đủ tiền thì người chưa được trả nghỉ việc.
  - **Giá bán**: chỉnh giá từng món 50–200% giá thị trường; khách thường chấp nhận 80–130%.
  - **Cài đặt**: âm lượng nhạc/hiệu ứng, tắt tiếng, đổi tên, ẩn dòng hướng dẫn.
- **Âm thanh** bật sau lần bấm chuột/gõ phím đầu tiên (trình duyệt bắt buộc vậy).

## Test

```bash
npm test                  # toàn bộ test
npm run typecheck
npm run check            # typecheck + test (chạy trước khi đẩy code)
# Test lưu Postgres thật (tuỳ chọn):
docker run -d --rm --name qnm-pg -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:16-alpine
TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm test
```

## Đưa lên Render (miễn phí)

1. **Neon** (neon.tech): tạo project vùng **AWS Asia Pacific (Singapore)**, sao chép *connection string*.
2. **Render** (render.com): **New + → Web Service** → chọn repo này:

   | Mục | Giá trị |
   |---|---|
   | Region | Singapore |
   | Branch | `main` |
   | Runtime | Node |
   | Build Command | `npm ci && npm run build` |
   | Start Command | `npm start` |
   | Instance Type | Free |
   | Health Check Path | `/health` |
   | Environment | `DATABASE_URL` = chuỗi Neon, `NODE_ENV` = `production` |

   (Hoặc dùng **New + → Blueprint** với file `render.yaml` có sẵn, rồi điền `DATABASE_URL`.)
3. Mỗi lần đẩy code lên `main`, Render tự build lại.

**Lưu ý khi cập nhật phiên bản:** bản mới tự nâng file lưu cũ lên định dạng mới khi mở quán. Sau đó **không quay lại bản cũ được** (bản cũ sẽ báo không đọc được quán). Muốn quay lại thì phải khôi phục cả dữ liệu Neon (Neon có tính năng *restore* theo thời điểm).

**Lưu ý gói Free:** máy chủ ngủ sau 15 phút không ai chơi, người vào đầu tiên chờ ~1 phút. Game tự lưu mỗi 30 giây, cuối mỗi ngày trong game và khi mọi người thoát; khi không ai online, thời gian trong quán dừng lại.
