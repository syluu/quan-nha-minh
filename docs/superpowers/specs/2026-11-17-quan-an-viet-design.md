# Thiết kế: Game quản lý quán ăn Việt (tên tạm: "Quán Nhà Mình")

Ngày: 2026-11-17 · Trạng thái: **ĐÃ DUYỆT** (2026-11-17), kể cả các mục [Đề xuất]; bổ sung bán online + đánh giá sao theo yêu cầu khi duyệt.

Ký hiệu: **[Đã chốt]** = người chơi/chủ dự án đã quyết. **[Đề xuất]** = người viết tài liệu tự đề xuất, có thể sửa.

---

## 1. Ý tưởng và lý do

Một game quản lý quán ăn **3D low-poly chạy trên trình duyệt máy tính**, lối chơi kiểu "My Mini Mart" (nhân vật đi lại, bê đồ từ máy ra quầy, khách tự lấy rồi trả tiền, mở rộng dần bằng các ô trả tiền) nhưng **toàn món ăn Việt** và **kinh tế mô phỏng gần thực tế**: tiền nguyên liệu, lương nhân viên, thuê mặt bằng, quảng cáo, vay ngân hàng.

**Vì sao làm:** để **2–3 người trong gia đình cùng chơi chung một quán** (ví dụ hai vợ chồng cùng quản lý), mỗi người một máy tính. Không phát hành công khai. [Đã chốt]

**Thành công là:** cả nhà mở trình duyệt, vào cùng một quán, cùng làm và cùng lo tiền; tắt máy hôm nay mai vào chơi tiếp đúng chỗ cũ.

Đây là game **nguyên bản** theo thể loại — không dùng tên, hình ảnh, nhân vật hay bố cục của My Mini Mart.

## 2. Mục tiêu / Không làm / Điều phải tránh

**Mục tiêu bản đầu (v1):**
- Chơi chung online 2–3 người ngay từ v1. [Đã chốt]
- 3 loại hình kinh doanh: **Xe bánh mì** (luôn là quán đầu), **Quán cơm tấm**, **Quán phở & cà phê**. [Đã chốt số lượng 2–3; danh sách món là Đề xuất]
- Trang trại tuỳ chọn. [Đã chốt]
- Đủ 16 yêu cầu gốc (xem mục 12 — bảng đối chiếu).
- Nội dung (món, máy, giá, quán) khai báo bằng **dữ liệu**, để sau thêm quán mới không phải sửa logic. [Đề xuất]

**Không làm ở v1:**
- Điện thoại/máy tính bảng, điều khiển cảm ứng.
- Tài khoản/mật khẩu, chơi với người lạ, bảng xếp hạng.
- App giao đồ ăn, sự kiện thời tiết, nhân viên nghỉ ốm… (để bản sau).
- Chống gian lận (chơi trong gia đình).

**Điều phải tránh (làm đúng kỹ thuật mà vẫn là thất bại):**
- Bị **trừ tiền oan**: lỡ đi ngang ô trả tiền, hoặc bị phá sản trong lúc không ai online.
- Game thành **bảng tính**: quản lý tiền phải phục vụ phần chơi tay (đi, bê, bán), không thay thế nó.
- **Giật/lag** khiến chơi chung khó chịu.
- **Mất file lưu**.

## 3. Các phương án đã cân nhắc

| Quyết định | Các lựa chọn | Đã chọn | Lý do |
|---|---|---|---|
| Kiểu hình | 2D nhìn từ trên xuống (Phaser) · **3D low-poly (Three.js)** | 3D [Đã chốt] | Chủ dự án xem mô phỏng chạy thật cả hai và chọn 3D: giống cảm giác mong muốn, chồng đồ trên tay nhìn rõ. Đổi lại làm lâu hơn ~1,5×. |
| Chơi chung | v1 chơi một người, thêm online sau · **online ngay từ v1** | Online từ v1 [Đã chốt] | Mục đích chính là cả nhà cùng chơi. |
| Nơi chạy máy chủ | Vercel (hàm serverless, kết nối bị cắt theo giới hạn thời gian, không có trạng thái chung) · Cloudflare Durable Objects (hợp mô hình "phòng", nhưng code đặc thù và chưa chắc gói free chịu được vòng lặp game chạy liên tục) · **Render.com + Colyseus + Neon Postgres** | Render, gói miễn phí trước [Đã chốt] | Máy chủ Node bình thường giữ được kết nối liên tục; Colyseus là thư viện chuyên game nhiều người theo phòng. Chấp nhận: máy chủ ngủ sau 15 phút không ai chơi, lần vào đầu chờ ~1 phút; có thể bị khởi động lại bất kỳ lúc nào → phải lưu game ra Neon. |
| Trang trại | Bắt buộc (game thành nông trại + quán) · **Tuỳ chọn** | Tuỳ chọn [Đã chốt] | Đầu game mua chợ cho nhanh; trang trại mở sau để giảm chi phí và dùng chung cho mọi quán. |

## 4. Kiến trúc kỹ thuật

**[Đã chốt]:** trình duyệt máy tính, Three.js, Colyseus, Render (free), Neon Postgres (free).
**[Đề xuất]** phần còn lại:

- **Ngôn ngữ:** TypeScript cho cả client và server.
- **Cấu trúc thư mục (một repo):**
  - `shared/` — kiểu dữ liệu, **dữ liệu nội dung** (món, công thức, máy, giá, quán, trang phục, chiến dịch), hằng số cân bằng.
  - `server/` — phòng Colyseus, **mô phỏng game** (thuần logic, không phụ thuộc mạng → test được), lưu/tải Neon.
  - `client/` — Vite + Three.js; giao diện menu (giá, nhân viên, ngân hàng, marketing…) là HTML/CSS chồng lên canvas.
- **Máy chủ quyết định mọi thứ (server-authoritative):** mô phỏng chạy trên server ~20 lần/giây; client chỉ gửi thao tác (hướng di chuyển, bấm menu) và vẽ lại trạng thái nhận được, có nội suy cho mượt và dự đoán chuyển động nhân vật của chính mình.
- **Một dịch vụ Render duy nhất:** Node server vừa phục vụ file client đã build vừa chạy WebSocket.
- **Lưu game:** bảng `worlds(id, room_code, schema_version, state jsonb, updated_at)` trên Neon. Lưu tự động **mỗi 30 giây**, **cuối mỗi ngày trong game**, và **khi người cuối cùng thoát**. `schema_version` để nâng cấp file lưu cũ khi game cập nhật.
- **Test:** unit test cho mô phỏng kinh tế (giá–nhu cầu, chi phí sản xuất, vay/trả nợ, bán tài sản bắt buộc, ô trả tiền 2 giây).

## 5. Chơi chung (multiplayer)

Các điểm dưới đây được đề xuất khi chọn Render và chủ dự án đã đồng ý cùng phương án đó; coi là đã chốt trừ khi có ý kiến khác.

- **Một "thế giới" = một file lưu chung của gia đình**, gồm mọi địa điểm: các quán + trang trại.
- Người tạo thế giới nhận **mã phòng** (ví dụ `BM-4821`); người khác nhập mã để vào. Không có tài khoản: người chơi nhập tên, trình duyệt nhớ một mã định danh (localStorage) để lần sau nhận lại đúng nhân vật. [Đề xuất]
- **Dùng chung ví tiền**; mỗi người có **nhân vật, nâng cấp nhân vật và trang phục riêng**. Ai cũng được đổi giá, thuê/sa thải, vay, chạy quảng cáo. [Đề xuất]
- Mỗi người đứng ở một địa điểm (quán 1, quán 2, trang trại…). Đi giữa các địa điểm bằng **xe máy ở cửa** → chọn nơi đến. Mọi địa điểm vẫn chạy khi không có người chơi ở đó (nhân viên làm thay). [Đề xuất]
- **Khi không ai online, thời gian dừng hẳn**: không lương, không lãi, không tiền thuê. [Đề xuất — để tránh "phá sản lúc ngủ"]
- Bảng sự kiện góc màn hình: "Mẹ vừa vay 10.000K", "Bố tăng giá bánh mì thịt lên 27K" — để mọi người biết ai làm gì với ví chung. [Đề xuất]

## 6. Thời gian và tiền

- **Đơn vị tiền: K = 1.000đ**, hiển thị kiểu `5K`, `2.987,5K`. [Đã chốt; lưu ý "5K = 5.000đ"]
- **1 ngày trong game ≈ 6 phút chơi thật**, quán mở 06:00–22:00. Hết ngày hiện **bảng tổng kết**: doanh thu, tiền nguyên liệu, lương, thuê, quảng cáo, lãi vay, lãi/lỗ. 1 tuần = 7 ngày. [Đề xuất]
- **Vốn ban đầu ~5.000K** + xe bánh mì cơ bản (lò bánh, quầy bày bánh, quầy thu ngân). [Đề xuất]
- Mọi con số (giá, lương, thuê, lãi) nằm trong file cân bằng ở `shared/`, sẽ chỉnh sau khi chơi thử.

## 7. Sản xuất và nguyên liệu

### 7.1 Nguồn nguyên liệu [Đã chốt hướng, số liệu Đề xuất]
- **Chợ:** có ngay, giá cao hơn. Khi máy cần nguyên liệu mà kho không có, máy **tự mua chợ** và trừ tiền ngay lúc làm ra món (đáp ứng yêu cầu "làm ra sản phẩm phải tốn tiền"). Hết tiền → máy dừng.
- **Kho tổng (từ trang trại):** rẻ hơn. Máy ưu tiên lấy kho trước, thiếu mới mua chợ.
- Nguyên liệu v1: bột mì, trứng, thịt lợn, thịt bò, xương bò, rau, gạo, cà phê, sữa đặc, trà. (Cà phê, sữa đặc, trà chỉ có ở chợ.)

### 7.2 Dòng chảy trong quán (kiểu My Mini Mart)
Máy làm ra món → người (người chơi/nhân viên) **bê** món: (a) sang máy ghép nếu là nguyên liệu trung gian, hoặc (b) ra **quầy bày** → khách tự lấy → ra **quầy thu ngân** trả tiền (phải có người đứng thu ngân) → về, hoặc ngồi ăn nếu quán có bàn.

Món ghép cần đủ nguyên liệu đầu vào được bê tới máy ghép (ví dụ bàn bánh mì thịt cần bánh mì + thịt nướng; rau tự lấy từ kho/chợ như 7.1).

**Máy tự chạy, không cần người đứng máy** [Đã chốt]: máy tự làm ra món vào ô đầu ra (có sức chứa giới hạn, đầy thì dừng); người chơi/nhân viên chỉ **bê**. Máy ghép tự làm khi đủ đầu vào.

**Công tắc bật/tắt từng máy** [Đã chốt 2026-11-17 — làm ở Kế hoạch 5]: mỗi máy làm món (cả máy ghép như bàn bánh mì trứng/thịt) có công tắc bật/tắt tự làm.
- Tắt khi đang làm dở → **làm xong mẻ đó rồi mới dừng** (tiền nguyên liệu mẻ đó đã trừ).
- Nút bật/tắt nằm trong **danh sách "Máy" ở tab Nâng cấp** của menu.
- Máy ghép đang tắt → **nhân viên ngừng bê nguyên liệu vào máy đó**.
- [Đề xuất] Máy mặc định bật (file lưu cũ cũng vậy); trên máy hiện dấu "TẮT" cho cả nhà thấy; bảng sự kiện ghi ai bật/tắt máy nào. Phụ bếp phụ trách máy đang tắt bê nốt món còn trong ô đầu ra rồi đứng chờ.

**Tự động hoá hoàn toàn được phép** [Đã chốt — giống My Mini Mart]: thuê đủ người thì quán tự chạy. Để người chơi vẫn có việc, [Đề xuất]: nhân viên **yếu hơn người chơi đã nâng cấp** (tốc độ gốc ~70% người chơi, sức mang thấp hơn, trần nâng cấp thấp hơn), và **giờ cao điểm** (sáng/trưa tuỳ quán) khách dồn tới vượt sức nhân viên → người chơi nhảy vào chỗ đang ùn là lợi nhuận tăng rõ.

### 7.3 Danh sách món v1 [Đề xuất — giá gần thực tế 2026, sẽ cân bằng lại]

**Quán 1 — Xe bánh mì** (không có bàn, khách mua mang đi)

| Máy | Đầu vào | Đầu ra | Giá bán gợi ý | Chi phí NL (chợ) |
|---|---|---|---|---|
| Lò bánh mì | bột mì | Bánh mì không | 5K | 2K |
| Chảo ốp la | trứng | Trứng ốp (trung gian) | — | 3K |
| Lò than | thịt lợn | Thịt nướng (bán lẻ được) | 12K | 6K |
| Bàn bánh mì trứng | bánh mì + trứng ốp + rau | **Bánh mì trứng** | 15K | +1K rau |
| Bàn bánh mì thịt | bánh mì + thịt nướng + rau | **Bánh mì thịt** | 25K | +1K rau |
| Bình trà đá | trà | Trà đá | 3K | 0,5K |

**Quán 2 — Cơm tấm** (có bàn ghế từ đây)
Nồi cơm (gạo → cơm) · Lò nướng sườn (thịt lợn → sườn nướng) · Chả trứng (trứng + thịt lợn → chả) · Bàn cơm tấm: cơm + sườn + rau → **Cơm tấm sườn 35K**; cơm + sườn + chả + rau → **Cơm tấm sườn chả 45K** · Trà đá.

**Quán 3 — Phở & cà phê** (có bàn ghế)
Nồi nước dùng (xương bò → nước dùng) · Máy bánh phở (gạo → bánh phở) · Thớt thái bò (thịt bò → bò tái) · Bàn phở: nước dùng + bánh phở + bò + rau → **Phở bò 50K** · Máy pha phin (cà phê → cà phê) · Quầy cà phê: cà phê + sữa đặc → **Cà phê sữa đá 25K**.

### 7.4 Mở rộng [Đã chốt hướng]
- Trong quán: mua thêm máy/quầy/bàn bằng **ô trả tiền** đặt sẵn trên sàn.
- **Khi đã mở hết mọi thứ của quán hiện tại**, mở được lựa chọn **thuê mặt bằng mới** và **chọn loại hình kinh doanh** cho mặt bằng đó (cơm tấm hoặc phở & cà phê ở v1). [Đã chốt: yêu cầu 3]
- **v1: mỗi loại hình chỉ mở được 1 lần** → tối đa 3 quán + 1 trang trại trong một thế giới. Mở hết thì chơi tiếp để tối ưu lãi, nâng cấp, sưu tầm trang phục; chưa có "kết thúc game" ở v1, các bản sau thêm loại hình quán mới. [Đề xuất, phù hợp với "làm trước 2–3 quán, sau cập nhật thêm"]
- Thuê mặt bằng: **tiền cọc** (trả một lần qua ô trả tiền ở bản đồ thành phố/menu) + **tiền thuê theo tuần**. Ví dụ quán 2: cọc 8.000K, thuê 4.000K/tuần. [Đề xuất]

## 8. Khách hàng, giá và marketing

- **Lượng khách** = lưu lượng gốc của địa điểm × đường cong theo giờ (sáng đông bánh mì, trưa đông cơm tấm, sáng sớm đông phở/cà phê) × hệ số marketing × hệ số danh tiếng. [Đề xuất]
- **Đặt giá [Đã chốt: yêu cầu 5]:** mỗi món chỉnh được trong khoảng **50%–200% giá thị trường**, bước 0,5K. [Đề xuất khoảng]
- **Khách quyết định mua [Đề xuất]:** mỗi khách muốn 1–3 món; với mỗi món có "giá chấp nhận" ngẫu nhiên quanh giá thị trường (≈ 80%–130%). Giá bạn đặt cao hơn → khách bỏ món đó. Không mua được gì → khách bỏ về, danh tiếng giảm nhẹ. Chờ quá lâu (quầy trống, không ai thu ngân, hết bàn) → bỏ về, danh tiếng giảm.
- **Đánh giá sao (1–5 sao, theo từng quán)** [Đã chốt]:
  - Dựa trên **trải nghiệm của khách và shipper**: phục vụ nhanh → đánh giá tốt; **chờ lâu → bỏ đi → giảm sao**; **shipper chờ lâu → bỏ đi (huỷ đơn) → giảm sao**.
  - [Đề xuất] Sao = trung bình trượt của ~50 lượt gần nhất (khách tại quán + shipper). Mỗi lượt cho điểm theo thời gian chờ (nhanh 5 điểm → chậm 3 điểm); bỏ đi = 1 điểm. Giá đắt quá thì khách không mua (mục dưới) nhưng chỉ trừ nhẹ.
  - **Sao càng cao khách càng đông, đỡ tiền marketing** [Đã chốt]. [Đề xuất] hệ số lượng khách: 1★ ×0,5 · 2★ ×0,75 · 3★ ×1,0 · 4★ ×1,35 · 5★ ×1,8. Đơn online nhạy với sao hơn (bình phương hệ số), vì app hiển thị sao.
  - Hiển thị sao trên thanh trên cùng và trong bảng tổng kết ngày, kèm lý do bị trừ ("12 khách bỏ đi vì chờ thu ngân").
- **Chiến dịch marketing [Đã chốt: yêu cầu 4; số liệu Đề xuất]:**

| Chiến dịch | Giá | Hiệu quả | Thời gian |
|---|---|---|---|
| Phát tờ rơi | 200K | +20% khách | 1 ngày |
| Quảng cáo mạng xã hội | 1.000K | +50% khách | 3 ngày |
| Mời người review đồ ăn | 5.000K | +100% khách, +0,3 sao | 2 ngày |

Tính theo từng quán; chạy chồng nhiều chiến dịch thì hiệu quả giảm dần.

### 8.1 Bán online qua app giao đồ ăn [Đã chốt hướng; số liệu Đề xuất]
- **Đăng ký bán online** cho từng quán: phí đăng ký một lần (~2.000K). Không dùng tên app có thật.
- Có thêm **đơn online** ngoài khách tại quán → **bán được nhiều hơn**, nhưng app thu **hoa hồng ~20%** mỗi đơn → **lãi mỗi món ít hơn**. Giá món online dùng chung giá bán tại quán.
- **Shipper không vào quầy thu ngân**: shipper đứng ở **điểm đón ngay cửa quán** với đơn 1–3 món; **người chơi hoặc nhân viên phải bê món ra đưa**. Giao đủ đơn → tiền (đã trừ hoa hồng) vào ví.
- **Quán nhỏ:** shipper **xe máy**, mỗi lần một đơn, đứng ở cửa chờ.
- **Quán lớn:** mua nâng cấp **điểm đón ô tô** → ô tô gom **nhiều đơn một lúc** (~4–6 đơn), chờ lâu hơn xe máy nhưng phải bê nhiều.
- Shipper chờ quá lâu → bỏ đi, huỷ đơn, **giảm sao**.
- Nhân sự: thêm vai **nhân viên giao đơn** (bê món ra điểm đón), tối đa 1 người / điểm đón.
- Có nút **tạm ngưng nhận đơn online** (ví dụ khi quán đang quá tải), không mất phí đăng ký.

## 9. Nhân viên

- **Phụ bếp/đứng quầy** (quán 1 trở đi): gắn với **một dòng sản phẩm**, vừa vận hành máy vừa bê món ra quầy. **Tối đa = số dòng sản phẩm/quầy** của quán. [Đã chốt: yêu cầu 6]
- **Thu ngân:** 1 người / quầy thu ngân. [Đã chốt]
- **Dọn bàn:** từ quán có bàn ghế; bàn bẩn không cho khách ngồi, người chơi tự dọn hoặc thuê người dọn. [Đã chốt: yêu cầu 7]
- **Người làm trang trại:** tự gieo, cho ăn, thu hoạch. [Đề xuất]
- **Lương ~300K/ngày/người**, trả cuối ngày. Tuyển và **sa thải** bất kỳ lúc nào qua menu nhân sự (sa thải giữa ngày vẫn trả lương ngày đó). [Đề xuất]
- Không trả nổi lương cuối ngày → xử lý như nợ đến hạn (mục 11).

## 10. Nâng cấp, trang phục [Đã chốt danh mục; số liệu Đề xuất]

- **Nhân vật (mỗi người chơi riêng):** sức mang (4 → 6 → 8 → 10 → 12 món), tốc độ đi (5 cấp, +10%/cấp).
- **Nhân viên (theo từng quán):** sức mang, tốc độ đi.
- **Máy (từng máy):** tốc độ làm, sức chứa đầu ra.
- Giá mỗi cấp tăng ~×1,6.
- **Trang phục (mất tiền, từ ví chung):** áo, quần, mũ (nón lá, mũ bảo hiểm, mũ lưỡi trai…), tạp dề, nhiều màu; giá 200K–5.000K. Làm bằng cách ghép/đổi màu các khối của nhân vật low-poly.

## 11. Ngân hàng và nợ đến hạn [Đã chốt: yêu cầu 10; số liệu Đề xuất]

- **Vay:** chọn số tiền (tối đa ~50% tổng giá trị tài sản đang có, tối thiểu 1.000K) và kỳ hạn:

| Kỳ hạn | Tổng lãi |
|---|---|
| 1 tuần | 5% |
| 2 tuần | 9% |
| 4 tuần | 15% |

  Trả góp đều **mỗi cuối tuần** (gốc + lãi). Được vay nhiều khoản cùng lúc trong hạn mức. Trả sớm được, không phạt.
- **Đến hạn mà không đủ tiền** (áp dụng cho trả nợ, tiền thuê, lương): game **tạm dừng cho mọi người** và hiện bảng bắt buộc chọn **bán máy** (thu về 50% giá mua) hoặc **trả mặt bằng/trang trại** (thu về phần cọc còn lại, mọi thứ trong đó cũng bị bán) cho tới khi đủ tiền. Ai đang online cũng chọn được.
- **Không còn gì để bán → phá sản:** thế giới bắt đầu lại từ đầu, giữ trang phục đã mua. [Đề xuất]

## 12. Ô trả tiền mở rộng [Đã chốt: yêu cầu 8]

- Đứng yên trên ô **2 giây** mới bắt đầu trừ tiền; có vòng tròn đếm ngược để thấy.
- Sau đó tiền **chảy dần** vào ô (~1,5 giây để trả hết nếu đủ tiền). **Bước ra là dừng ngay**; số đã trả **được giữ lại** cho lần sau. [Đề xuất phần "chảy dần, giữ phần đã trả"]
- Đi ngang qua (chưa đủ 2 giây) → không mất đồng nào.
- Mỗi lúc chỉ một người trả cho một ô.

## 13. Trang trại [Đã chốt hướng; số liệu Đề xuất]

- **Trang trại là một địa điểm 3D đi lại được, chơi giống trong quán** [Đã chốt]. Mỗi ruộng/chuồng hoạt động như **một cái máy**: trả tiền giống/con giống (+ thức ăn) qua menu nhỏ khi đứng cạnh → tự lớn theo thời gian → ra sản phẩm ở ô đầu ra. Người chơi hoặc người làm trang trại **bê sản phẩm lên xe chở hàng** → vào kho tổng. Dùng lại đúng cơ chế máy + bê đồ của quán; **không** có gieo từng ô, tưới nước. 
- Mở sau quán 1 (trước khi đủ tiền thuê quán 2). Thuê trang trại: cọc + tiền thuê theo tuần.
- Thuê thêm từng **lô**, mỗi lô có tiền thuê theo tuần:
  - Ruộng lúa mì → **bột mì**; ruộng lúa → **gạo**; ruộng rau → **rau** (mua hạt giống, chờ lớn, thu hoạch).
  - Chuồng gà → **trứng** đều đặn (mua gà giống, mua thức ăn).
  - Chuồng lợn → **thịt lợn**; chuồng bò → **thịt bò + xương bò** (nuôi đến lớn → một mẻ thịt → mua con mới).
- Hàng thu hoạch vào **kho tổng**; **mỗi sáng tự chở đến các quán** với phí vận chuyển nhỏ (~50K/quán/chuyến).
- Nguyên liệu tự làm phải rẻ hơn chợ một cách rõ ràng (mục tiêu ~40–60% giá chợ, sau khi tính thuê đất, giống, thức ăn, người làm).

## 14. Điều khiển và giao diện [Đề xuất]

- WASD/phím mũi tên để đi; camera nghiêng kiểu isometric đi theo nhân vật, lăn chuột để zoom.
- Nhặt/đặt món **tự động khi đứng gần** máy/quầy (không cần bấm phím).
- Thanh trên cùng: ví tiền, ngày/giờ, danh tiếng, những ai đang online.
- Menu: Giá bán · Nhân sự · Nâng cấp · Marketing · Ngân hàng · Trang phục · Bản đồ (đi giữa các địa điểm).
- Hình ảnh v1 bằng khối đơn giản (như bản mô phỏng đã duyệt); có thể thay bằng bộ low-poly miễn phí (giấy phép CC0) sau.

### 14.1 Hiệu năng [Đã chốt hướng]
- Máy mục tiêu: **MacBook Air M1** và **Acer Nitro 5** (có card rời); phải chạy được cả laptop văn phòng không quá mới.
- **Ưu tiên mượt và lối chơi hơn hiệu ứng: không bóng đổ**, ánh sáng đơn giản (bóng tròn giả dưới chân nhân vật là đủ).
- [Đề xuất] Mục tiêu 60 khung hình/giây trên MacBook Air M1; giới hạn số khách cùng lúc mỗi quán (~20); dùng chung hình khối (instancing) cho món ăn/khách; client chỉ nhận trạng thái chi tiết của địa điểm mình đang đứng.

## 15. Bảng đối chiếu 16 yêu cầu gốc

| # | Yêu cầu | Ở mục |
|---|---|---|
| 1 | Đồ ăn Việt, bắt đầu từ bánh mì | 7.3 |
| 2 | Kinh doanh thật: tiền hàng, doanh thu, lương, thu ngân | 6, 7, 9 |
| 3 | Mở rộng từ sản phẩm → quán → thuê mặt bằng mới, chọn sản phẩm | 7.4 |
| 4 | Marketing trả tiền | 8 |
| 5 | Tăng/giảm giá | 8 |
| 6 | Món đơn + món ghép | 7.2, 7.3 |
| 6' | Thuê/sa thải nhân viên, tối đa theo số quầy | 9 |
| 7 | Bàn ghế, dọn bàn | 7.3, 9 |
| 8 | Ô trả tiền chờ 2 giây | 12 |
| 9 | Làm ra sản phẩm tốn chi phí | 7.1 |
| 10 | Vay ngân hàng, lãi, hạn, bán tài sản | 11 |
| 11 | Đơn vị K | 6 |
| 12 | Nâng cấp nhân vật, nhân viên, máy | 10 |
| 13 | Vốn và giá gần thực tế | 6, 7.3 |
| 14 | Trang phục mất tiền | 10 |
| 15 | Chơi online nhiều người | 4, 5 |
| 16 | Lưu game | 4 |
| + | Trang trại tuỳ chọn | 13 |
| + | Bán online qua app, shipper xe máy/ô tô | 8.1 |
| + | Đánh giá sao theo thời gian chờ, ảnh hưởng lượng khách | 8 |

## 17. Hạ tầng triển khai [Đã chốt]
- **Render.com, Web Service gói Free, vùng Singapore** (gần Việt Nam nhất → ít trễ).
- **Neon Postgres gói Free, vùng AWS Asia Pacific (Singapore)** — cùng vùng với Render.
- Code trên GitHub (repo private); Render tự deploy mỗi lần đẩy code lên nhánh `main`.
- Biến môi trường: `DATABASE_URL` (chuỗi kết nối Neon), `NODE_ENV=production`.

## 16. Để người làm tự quyết

- Bố cục bản đồ từng quán, vị trí ô trả tiền, thứ tự mở khoá trong quán.
- Toàn bộ con số cân bằng cuối cùng (chỉnh sau khi chơi thử).
- Thư viện giao diện cho menu, cách nội suy/dự đoán chuyển động.
- Nguồn hình 3D sau giai đoạn hình khối.
- Âm thanh (nếu có) ở v1.
