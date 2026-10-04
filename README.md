# THỬ THÁCH TÌM KIẾM 🔍
> **Hệ thống web tương tác học tập Tin học 11: Tìm kiếm tuần tự và Tìm kiếm nhị phân (C++)**

---

## 🎯 1. Bối cảnh Sư phạm và Mục tiêu Dạy học

Ứng dụng phục vụ trực tiếp cho **Hoạt động Luyện tập** trong Kế hoạch bài dạy (KHBD) 2 tiết Tin học 11 (Chủ đề Thuật toán tìm kiếm):
* **Thời lượng tổ chức lớp học (17 phút mặc định)**:
  * Giao nhiệm vụ, quét QR vào phòng: 2 phút.
  * Làm bài theo nhóm: 9 phút.
  * Công bố kết quả, thảo luận, sửa sai: 4 phút.
  * Kết luận: 2 phút.
* **Mục tiêu nhận thức & năng lực**:
  * Phân biệt điều kiện áp dụng thuật toán tìm kiếm tuần tự và nhị phân.
  * Phân biệt rõ giá trị phần tử, chỉ số mảng (0-indexed) và số lượt kiểm tra.
  * Mô phỏng chạy tay thuật toán nhị phân trên dãy 8 phần tử với $K = 38$.
  * Giải thích cơ sở loại bỏ nửa phạm vi và khắc phục lỗi nhận thức.

---

## 🏗️ 2. Kiến trúc & Công nghệ

* **Frontend**: Next.js 15 (React 19), TypeScript, Tailwind CSS, Lucide Icons.
* **Mã thuật toán hiển thị**: Ngôn ngữ C++ chuẩn bài học (không dùng Python).
* **Thời gian thực (Real-time)**: Kiến trúc PubSub Server-Sent Events (SSE) kết hợp auto-sync bản nháp hai chiều.
* **Quét mã QR**: Thư viện `qrcode` tích hợp tự động dò IP mạng LAN nội bộ (VD: `http://192.168.x.x:3000`) giúp điện thoại học sinh quét và kết nối ngay trong phòng thực hành Tin học.
* **Chấm điểm Rubric**: Bộ máy chấm quy tắc (deterministic rule-based engine) độc lập từng tiêu chí, phát hiện ngữ cảnh phủ định và cho phép giáo viên duyệt giải thích tự do.
* **Cơ sở dữ liệu**:
  * Chạy cục bộ tức thì với bộ lưu trữ JSON an toàn đa luồng (`data/db.json`).
  * Tương thích hoàn toàn với **Supabase PostgreSQL** có sẵn file Migration & RLS policies (`supabase/migrations/20261004_init_schema.sql`).

---

## 🚀 3. Hướng dẫn Chạy ứng dụng

### Bước 1: Cài đặt thư viện
```bash
npm install
```

### Bước 2: Chạy kiểm thử tự động
```bash
npm test
```
*(Chạy 15 test kiểm thử độc lập cho bộ chấm điểm Rubric, phân tích cú pháp và phân quyền luồng)*

### Bước 3: Khởi chạy môi trường phát triển
```bash
npm run dev
```
Mở trình duyệt tại: `http://localhost:3000`

### Bước 4: Đóng gói và chạy Production
```bash
npm run build
npm start
```

---

## 📱 4. Cách cấu hình Mã QR cho Điện thoại học sinh

1. Đảm bảo máy tính của giáo viên và điện thoại học sinh kết nối **cùng một mạng Wi-Fi** phòng học.
2. Hệ thống sẽ **tự động phát hiện địa chỉ IP nội bộ** của máy (ví dụ `http://192.168.1.15:3000`).
3. Khi chiếu mã QR trong Bảng điều khiển hoặc Màn hình máy chiếu (`/projector`), học sinh chỉ cần bật camera quét là vào thẳng phòng thi.
4. Giáo viên cũng có thể tùy chỉnh URL thủ công bằng nút "Đổi IP / Host" hoặc cấu hình biến môi trường `NEXT_PUBLIC_APP_URL` trong file `.env.local` khi đưa lên Vercel/Render.

---

## 🔑 5. Tài khoản & Dữ liệu Thử nghiệm có sẵn

Hệ thống đã được nạp sẵn dữ liệu thực hành để kiểm tra và đứng lớp ngay:

| Vai trò | Tên đăng nhập | Mật khẩu / Mã đăng nhập | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Giáo viên** | `giaovien` | `123456` | Thầy Phong (Tin học 11) |
| **Học sinh 1** | `hs1` | `HS001` | Nguyễn Văn An (Nhóm 1 - Điều khiển) |
| **Học sinh 2** | `hs2` | `HS002` | Trần Thị Bình (Nhóm 1) |
| **Học sinh 3** | `hs3` | `HS003` | Lê Hoàng Cường (Nhóm 1) |
| **Học sinh 4** | `hs4` | `HS004` | Phạm Diệu Dung (Nhóm 1) |
| **Học sinh 5..12** | `hs5`..`hs12` | `HS005`..`HS012` | Thuộc Nhóm 2 và Nhóm 3 |
| **Mã phòng mẫu** | `TIMKIEM` | - | Đang ở trạng thái sẵn sàng mở |

---

## 📊 6. Thang điểm Rubric Chi tiết (10 điểm)

* **Phần 1: Trắc nghiệm (5 điểm)**:
  * 5 câu $\times$ 1.00 điểm = 5.00 điểm.
  * Giáo viên chọn đúng 5 trong 6 câu của ngân hàng trước khi mở phòng.
* **Phần 2: Chạy tay Nhị phân (5 điểm)**:
  * Cho dãy $A = [2, 5, 8, 12, 16, 23, 38, 56]$, $K = 38$.
  * Mỗi bước tối đa 1.25 điểm $\times$ 3 bước = **3.75 điểm**:
    * $left, right$ ban đầu: 0.25 đ
    * $mid$ và $A[mid]$: 0.50 đ (0.25 đ mỗi thành phần)
    * So sánh với $K$: 0.25 đ
    * Hành động / cập nhật phạm vi: 0.25 đ
  * Kết luận: **1.25 điểm**:
    * Chỉ số trả về 6: 0.50 đ
    * Số lần kiểm tra 3: 0.25 đ
    * Giải thích loại nửa trái: 0.50 đ (nếu chưa chắc chắn $\rightarrow$ chuyển trạng thái **Chờ giáo viên duyệt**).

---

## 🛠️ 7. Tính năng nổi bật cho Giáo viên

1. **Bảng điều khiển một màn hình (All-in-One Dashboard)**:
   * Xem tiến độ từng nhóm trong thời gian thực.
   * Nút điều khiển: Bắt đầu, Tạm dừng, Tiếp tục, Gia hạn +3 phút, Khóa thêm người mới, Đóng phòng, Công bố đáp án, Mở lượt sửa.
   * Chuyển quyền Người điều khiển (Driver) giữa các học sinh trong nhóm.
   * Duyệt giải thích tự do và điều chỉnh điểm kèm lý do lưu vào nhật ký.
2. **Màn hình Trình chiếu (Projector View)**:
   * Chữ lớn, độ tương phản cao, tối ưu hiển thị máy chiếu.
   * Hiển thị mã QR cỡ lớn và Bảng xếp hạng thi đua đồng hạng khi bằng điểm.
3. **Xuất bảng điểm Excel (CSV UTF-8 BOM)**:
   * Xuất danh sách nhóm, điểm thành phần và tổng kết quả mở tiếng Việt chuẩn trên Microsoft Excel.
