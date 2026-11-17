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

- **Điều khiển bằng chuột**: giữ **chuột trái** rồi kéo như cần điều khiển (kéo xa đi nhanh hơn); giữ **chuột phải** rồi kéo để xem quanh quán (nhân vật đi là khung nhìn tự quay về); lăn chuột để phóng to/nhỏ.
- Shipper tới: bảng **bên trái màn hình** ghi giờ tới, số giây còn chờ và món cần (đỏ khi còn ≤ 15 giây).

- **Nhặt món**: đứng cạnh máy, cứ 0,45 giây được 1 món (vòng xanh quanh chân chạy dần); đủ thì bước đi. Nhãn **"3/4"** trên đầu = đang cầm 3, tối đa 4.
- **Đặt món**: đứng cạnh kệ hoặc bàn ghép, món tự đặt xuống (nhanh).
- **Thùng rác** (góc trái lối bếp): đứng yên cạnh thùng để bỏ món trên tay — mất tiền nguyên liệu của món đó.
- **Menu**: phím **M** hoặc nút ☰ (Esc để đóng). Khi menu mở nhân vật đứng yên.
  - **Báo cáo**: biểu đồ 14 ngày, bảng từng ngày (doanh thu, nguyên liệu, lương, hàng bỏ đi, lãi), món bán được hôm nay.
  - **Nhân sự**: thuê/cho nghỉ thu ngân và phụ bếp (mỗi món đang bán 1 người). Lương khởi điểm 120K/ngày, trả cuối ngày; không đủ tiền thì người chưa được trả nghỉ việc.
  - **Giá bán**: chỉnh giá từng món 50–200% giá thị trường; khách thường chấp nhận 80–130%.
  - **Cài đặt**: âm lượng nhạc/hiệu ứng, tắt tiếng, đổi tên, ẩn dòng hướng dẫn.
- **Âm thanh** bật sau lần bấm chuột/gõ phím đầu tiên (trình duyệt bắt buộc vậy).

### Nâng cấp, quảng cáo, ngân hàng (Kế hoạch 3)

- **Lương** cộng dồn mỗi ngày, **trả cuối tháng** (1 tháng = 7 ngày ≈ 42 phút chơi). Cho nghỉ thì trả ngay số ngày đã làm.
- **Kết toán cuối tháng**: hiện bảng doanh thu, nguyên liệu, quảng cáo, lương, mặt bằng, góp nợ. Thiếu tiền thì **cả quán tạm dừng** tới khi ai đó vay ngân hàng hoặc bán máy ngay trong bảng. Hết cách → **phá sản**: quán về xe bánh mì ban đầu, giữ tên nhân vật và mã quán.
- **Menu → Nhân sự**: nâng cấp **từng nhân viên** (cấp 1–4: đi nhanh hơn, mang nhiều hơn, lương 120K → 210K/ngày).
- **Menu → Nâng cấp**: sức mang và tốc độ của chính bạn; từng máy (nhanh hơn 15%, chứa thêm 50% mỗi cấp).
- **Menu → Quảng cáo**: tờ rơi, mạng xã hội, mời người review — tăng lượng khách trong vài ngày.
- **Menu → Ngân hàng**: vay 1/2/4 tháng (lãi 5/9/15%), góp cuối tháng, trả sớm không phạt.

### Bán online (Kế hoạch 4)

- Mở ô **"Điểm giao hàng"** (2.000K) ở cuối lối bếp bên phải để đăng ký bán qua app giao đồ ăn. App thu **hoa hồng 20%** mỗi đơn.
- **Shipper xe máy** chạy tới đứng ngay ngoài mép phải quán, bong bóng trên đầu ghi món còn thiếu và số giây còn chờ. Bê đúng món tới điểm giao là món tự chuyển cho shipper; đủ đơn thì tiền vào ví.
- Chờ quá lâu (60 giây) shipper bỏ đi: đơn huỷ, quán bị trừ sao.
- **Menu → Nâng cấp → Điểm giao hàng** (5.000K): đổi sang **ô tô**, gom 2–5 đơn một lần, chờ 90 giây.
- **Menu → Nhân sự → Giao đơn**: thuê người tự lấy món (ở máy hoặc trên kệ) mang ra cho shipper.
- **Menu → Quảng cáo → Bán online**: xem đơn hôm nay, tạm ngưng / nhận đơn lại.

### Nhiều quán, bàn ghế (Kế hoạch 5)

- Mở hết máy và kệ của các quán đang có → **Menu → 🗺️ Bản đồ** cho thuê mặt bằng mới và chọn loại hình:
  - **Quán cơm tấm** (cọc 8.000K, thuê 4.000K/tháng): cơm tấm sườn 35K, cơm tấm sườn chả 45K, trà đá.
  - **Quán phở & cà phê** (cọc 12.000K, thuê 6.000K/tháng): phở bò 50K, cà phê đen 15K, cà phê sữa đá 25K.
- Mỗi người đứng ở một quán; **Bản đồ → Đi tới** để sang quán khác (đồ đang cầm mang theo). Quán không có ai vẫn chạy nhờ nhân viên.
- Quán mới có **4 bàn ăn** (ô trả tiền 500K/bàn, 2 chỗ). Khách trả tiền xong có 60% muốn ngồi ăn 20 giây; ăn xong chỗ đó bẩn. Hết chỗ sạch thì khách mang về và chấm tối đa 4 sao.
- **Dọn bàn**: đứng yên cạnh bàn bẩn (0,5 giây/chỗ) hoặc thuê **nhân viên dọn bàn** trong Nhân sự.
- Tiền thuê mặt bằng vào **kết toán cuối tháng** (tháng đầu tính theo số ngày đã thuê). Thiếu tiền thì có thể **trả mặt bằng** (thu 50% cọc + 50% máy).
- **Menu → Nâng cấp → Máy**: nút **Tắt máy / Bật máy** — máy làm xong mẻ đang làm rồi dừng, nhân viên không bê thêm nguyên liệu vào.

### Trang trại (Kế hoạch 6)

- **Bản đồ → Trang trại**: thuê được bất cứ lúc nào (cọc 5.000K, thuê 700K/tháng + 150K/tháng cho mỗi lô mở thêm). Có sẵn ruộng rau và xe chở hàng.
- Mở thêm lô bằng ô trả tiền: ruộng lúa mì (bột mì), ruộng lúa (gạo), chuồng gà (trứng), chuồng lợn (thịt lợn), chuồng bò (thịt bò + xương bò). Mỗi lô chạy như một cái máy: trả tiền giống/thức ăn mỗi mẻ, ra **thùng hàng**.
- Bê thùng hàng tới **xe chở hàng** → nguyên liệu vào **kho tổng** (xem trong Bản đồ). Máy ở mọi quán lấy kho trước, thiếu mới mua chợ — rẻ hơn khoảng một nửa.
- Phí xe chở hàng: 50K cho mỗi quán đã dùng hàng trong kho hôm đó (tính cuối ngày).
- **Nhân sự** ở trang trại: tối đa 2 **người làm trang trại**, tự bê thùng hàng ra xe.

### Trang phục (Kế hoạch 7)

- **Menu → 👕 Trang phục**: thay **kiểu dáng** chứ không chỉ màu — giá 200K–5.000K, trả từ ví chung:
  - **Mũ**: nón lá, không đội mũ, lưỡi trai, mũ len có quả bông, mũ tai bèo, mũ cói rộng vành, mũ bảo hiểm, mũ đầu bếp, mũ phớt.
  - **Tóc**: ngắn, dài, đuôi ngựa, búi, tết hai bím, xoăn (nhiều màu).
  - **Áo & váy liền**: áo phông, áo ba lỗ, sơ mi, áo khoác có mũ, váy liền, áo dài (đỏ / xanh / trắng).
  - **Quần & chân váy**: quần dài, quần jean xắn gấu, quần short, chân váy.
  - **Tạp dề**: trơn hoặc kẻ caro.
- Nhân vật có tay chân, đi thì vung tay bước chân, bê đồ thì đưa hai tay ra trước; khách hàng cũng có nhiều kiểu tóc, áo, quần khác nhau.
- Đồ thuộc về người mua, mặc ngay; đồ đã có đổi mặc lại miễn phí. Người khác trong nhà thấy ngay.
- Quán phá sản vẫn **giữ trang phục** đã mua (cùng tên nhân vật và mã quán).

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
