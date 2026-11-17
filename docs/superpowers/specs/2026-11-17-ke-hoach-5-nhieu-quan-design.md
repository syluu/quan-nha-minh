# Thiết kế bổ sung: Kế hoạch 5 — Thuê mặt bằng mới, quán cơm tấm, quán phở & cà phê, bàn ghế

Ngày: 2026-11-17 · Trạng thái: **ĐÃ DUYỆT** (spec gốc §5, §7.3, §7.4, §9 đã duyệt; chủ dự án yêu cầu làm tiếp KH 5–7 không cần hỏi lại)

## Quyết định [Đã chốt — từ spec gốc]
- Khi đã mở hết mọi thứ của quán hiện tại → được **thuê mặt bằng mới** và **chọn loại hình** (cơm tấm hoặc phở & cà phê); mỗi loại mở 1 lần ở v1.
- Thuê mặt bằng: **tiền cọc** + **tiền thuê định kỳ** (vào kết toán cuối tháng).
- **Quán cơm tấm**: nồi cơm (gạo → cơm), lò nướng sườn (thịt lợn → sườn), chảo chả trứng (trứng + thịt lợn → chả), bàn cơm tấm sườn (cơm + sườn + rau → 35K), bàn cơm tấm sườn chả (cơm + sườn + chả + rau → 45K), trà đá. **Có bàn ghế** từ đây.
- **Quán phở & cà phê**: nồi nước dùng (xương bò → nước dùng), máy bánh phở (gạo → bánh phở), thớt thái bò (thịt bò → bò tái), bàn phở (nước dùng + bánh phở + bò tái + rau → phở bò 50K), máy pha phin (cà phê → cà phê phin), quầy cà phê (cà phê phin + sữa đặc → cà phê sữa đá 25K). Có bàn ghế.
- **Bàn ghế**: bàn bẩn không cho khách ngồi; người chơi tự dọn hoặc thuê **nhân viên dọn bàn**.
- Mỗi người chơi đứng ở một địa điểm; đi giữa các quán bằng **bản đồ** (trong menu); mọi quán vẫn chạy khi không ai ở đó (nhân viên làm thay). Ví tiền chung.

## Quyết định của người viết [Đề xuất, chỉnh được]
- **Điều kiện thuê**: mọi máy và kệ (producer/assembler/display) ở **mọi quán đang có** đã mở (bàn ghế, điểm giao không bắt buộc).
- **Cơm tấm**: cọc **8.000K**, thuê **4.000K/tháng**. **Phở & cà phê**: cọc **12.000K**, thuê **6.000K/tháng**. Tiền thuê vào kết toán cuối tháng (dòng "Thuê mặt bằng").
- Mặt bằng mới có sẵn bộ khởi đầu (theo cọc): cơm tấm — nồi cơm, lò sườn, bàn cơm tấm sườn, kệ cơm tấm sườn, quầy thu ngân, thùng rác; phở — nồi nước dùng, máy bánh phở, thớt bò, bàn phở, kệ phở, quầy thu ngân, thùng rác. Phần còn lại mở bằng ô trả tiền.
- Nguyên liệu mới (giá chợ): gạo 3K, xương bò 8K, thịt bò 15K, cà phê 4K, sữa đặc 2K.
- **Bàn**: 4 bàn mỗi quán có bàn (ô trả tiền 500K/bàn), mỗi bàn 2 chỗ. Khách trả tiền xong có 60% muốn ăn tại chỗ: có chỗ sạch thì ngồi ăn 20 giây rồi về, chỗ đó thành bẩn; không có chỗ sạch thì mang về và đánh giá tối đa 4 sao.
- **Dọn bàn**: người chơi đứng yên cạnh bàn bẩn, 0,5 giây/chỗ; nhân viên dọn bàn (tối đa 1/quán có bàn) tự đi dọn.
- **Bản đồ**: menu → "🗺️ Bản đồ": các quán đang có (nút "Đi tới"), mặt bằng còn trống (chọn loại hình + nút "Thuê"). Đi tới là xuất hiện ở lối vào quán đó, đồ đang cầm mang theo.
- **Trả mặt bằng** (khi kết toán thiếu tiền): có trong danh sách bán, thu 50% cọc + 50% giá trị máy; nhân viên ở đó nghỉ, lương còn nợ của họ vẫn vào kết toán.
- Sao hiển thị và tính khách theo từng quán; sao trong tổng kết ngày = trung bình các quán đang có.
- File lưu v5.
