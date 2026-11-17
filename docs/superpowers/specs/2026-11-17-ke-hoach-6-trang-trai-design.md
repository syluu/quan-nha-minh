# Thiết kế bổ sung: Kế hoạch 6 — Trang trại

Ngày: 2026-11-17 · Trạng thái: **ĐÃ DUYỆT** (spec gốc §7.1, §13 đã duyệt; chủ dự án yêu cầu làm tiếp KH 5–7 không cần hỏi lại)

## Quyết định [Đã chốt — từ spec gốc]
- Trang trại **tuỳ chọn**, là **một địa điểm 3D đi lại được**, chơi giống trong quán; đi tới bằng Bản đồ.
- Mỗi ruộng/chuồng là **một cái máy**: trả tiền giống/thức ăn → tự lớn → ra sản phẩm ở đầu ra. Người chơi hoặc **người làm trang trại** bê sản phẩm lên **xe chở hàng** → vào **kho tổng**. Không gieo từng ô, không tưới nước.
- Thuê trang trại: cọc + tiền thuê định kỳ; thuê thêm từng **lô**, mỗi lô có tiền thuê.
- Lô: ruộng lúa mì → bột mì; ruộng lúa → gạo; ruộng rau → rau; chuồng gà → trứng; chuồng lợn → thịt lợn; chuồng bò → thịt bò + xương bò.
- Máy ở quán **lấy kho trước, thiếu mới mua chợ**. Kho **chở đến quán mỗi sáng** với phí nhỏ (~50K/quán/chuyến).
- Nguyên liệu tự làm rẻ hơn chợ rõ ràng (mục tiêu ~40–60% giá chợ sau khi tính thuê đất, giống, người làm). Cà phê, sữa đặc, trà chỉ có ở chợ.

## Quyết định của người viết [Đề xuất, chỉnh được]
- **Điều kiện thuê trang trại**: không cần mở hết quán (có thể thuê sớm, trước quán 2 như spec gốc); chỉ cần đủ tiền và không đang kết toán. **Cọc 5.000K, thuê 700K/tháng.** Thuê trang trại **không** chặn và **không** được tính vào điều kiện "mở hết" khi thuê quán mới.
- Trang trại có sẵn: **xe chở hàng**, **thùng rác**, **ruộng rau** (lô đầu tiên). Các lô còn lại mở bằng ô trả tiền; **mỗi lô đã mở thêm cộng 150K/tháng** vào tiền thuê trang trại.
- Mỗi mẻ (tiền giống/thức ăn trả lúc bắt đầu) ra **1 thùng hàng** = nhiều đơn vị nguyên liệu:

| Lô | Mở | Giống/thức ăn mỗi mẻ | Thời gian | Thùng hàng | Giá chợ tương đương |
|---|---|---|---|---|---|
| Ruộng rau | có sẵn | 4K | 40 s | 20 rau | 20K |
| Ruộng lúa mì | 1.500K | 10K | 60 s | 20 bột mì | 40K |
| Ruộng lúa | 1.500K | 14K | 60 s | 20 gạo | 60K |
| Chuồng gà | 2.500K | 12K | 50 s | 15 trứng | 45K |
| Chuồng lợn | 4.000K | 16K | 90 s | 10 thịt lợn | 60K |
| Chuồng bò | 6.000K | 45K | 120 s | 8 thịt bò + 8 xương bò | 184K |

(Sau review: giống ~20–30% giá chợ, cộng thuê đất + người làm + phí chở ≈ 45–65% khi mở đủ lô.)

- Mỗi lô chứa tối đa 3 thùng ở đầu ra (đầy thì dừng). Có công tắc bật/tắt như máy.
- **Xe chở hàng**: bê thùng tới là tự bốc lên (0,2 s/thùng), nguyên liệu vào **kho tổng** ngay.
- **Kho tổng** dùng chung mọi quán. Máy bắt đầu mẻ: phần nguyên liệu có trong kho lấy kho (không tốn tiền), phần thiếu mua chợ.
- **Phí chở hàng**: cuối mỗi ngày **50K cho mỗi quán hôm đó đã dùng hàng trong kho** (tính vào "nguyên liệu"); không đủ tiền thì bỏ qua.
- **Người làm trang trại**: tối đa 2 người/trang trại; tự bê thùng từ lô có hàng ra xe.
- Trả trang trại (trong danh sách bán khi kết toán thiếu tiền): thu 50% cọc + 50% giá trị lô; **kho vẫn giữ**.
- Trang trại không có khách, không có giá bán, quảng cáo, bán online; các tab đó ghi "Không áp dụng ở trang trại". Sao trung bình chỉ tính các quán.
- Menu Bản đồ có mục **Trang trại** (thuê / đi tới) và **Kho tổng** (số lượng từng nguyên liệu).
- File lưu v6.
