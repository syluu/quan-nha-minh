# Thiết kế bổ sung: Kế hoạch 4 — Bán online qua app giao đồ ăn

Ngày: 2026-11-17 · Trạng thái: **ĐÃ DUYỆT** (spec gốc §8.1 đã duyệt; chủ dự án yêu cầu "làm luôn kế hoạch 4") · Bổ sung cho `2026-11-17-quan-an-viet-design.md` §8.1

## Quyết định [Đã chốt — từ spec gốc §8.1]
- Đăng ký bán online cho từng quán: phí một lần ~2.000K. Không dùng tên app có thật ("app giao đồ ăn").
- Đơn online là **thêm** ngoài khách tại quán; app thu **hoa hồng 20%** mỗi đơn. Giá món online = giá bán tại quán.
- **Shipper không vào quầy thu ngân**: đứng ở **điểm giao hàng ngay cửa quán**; người chơi hoặc nhân viên **bê món ra đưa**. Giao đủ đơn → tiền (đã trừ hoa hồng) vào ví.
- Quán nhỏ: **xe máy**, mỗi lần 1 đơn. Quán lớn: nâng cấp **điểm đón ô tô** → ô tô gom nhiều đơn một lúc, chờ lâu hơn.
- Shipper chờ quá lâu → bỏ đi, huỷ đơn, **giảm sao**. Đơn online nhạy với sao hơn (bình phương hệ số khách).
- Nhân sự thêm vai **nhân viên giao đơn** (tối đa 1 / điểm giao).
- Có nút **tạm ngưng nhận đơn online** (không mất phí đăng ký).

## Quyết định của người viết [Đề xuất, chỉnh được]
- **Đăng ký = mở ô trả tiền "Điểm giao hàng" 2.000K** (giống mở máy), đặt ở **cuối lối bếp bên phải** (cạnh cửa hông); mở được ngay khi có kệ bánh mì. Shipper đi từ đường bên phải tới, đứng ngay ngoài mép phải quán. (Ban đầu định đặt góc trước-trái nhưng như vậy nhân viên phải đi xuyên kệ.)
- Đơn: 1–3 món (giống khách tại quán, có lọc theo giá), tối đa **6 đơn chờ**; nhịp đơn trung bình **20 giây/đơn** ở 3 sao, nhân theo giờ trong ngày, (hệ số sao)² và quảng cáo; chỉ nhận đơn khi quán đang mở (trước 21:30) và không tạm ngưng.
- **Xe máy**: chờ **60 giây**, nhận 1 đơn. **Ô tô** (nâng cấp 5.000K): tới khi có ≥ 2 đơn (hoặc đơn cũ nhất đã chờ 30 giây), gom tối đa **5 đơn**, chờ **90 giây**.
- Điểm giao nhận món khi shipper đang đứng chờ và còn đơn cần món đó. Người chơi nhặt từ máy (như cũ); **nhân viên giao đơn** lấy từ đầu ra của máy hoặc từ kệ.
- Hoàn thành đơn: sao theo thời gian chờ (≤ 20 s → 5, ≤ 40 s → 4, còn lại 3). Huỷ: mỗi đơn huỷ chấm 1 sao; món đã đưa cho đơn bị huỷ tính "hàng bỏ đi".
- Báo cáo/tổng kết thêm: **đơn online**, **đơn bị huỷ**, **hoa hồng app**; lãi hoạt động trừ hoa hồng.
- File lưu nâng lên v4.
