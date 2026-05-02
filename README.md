# Hướng Dẫn Vận Hành Hệ Sinh Thái Cá Nhân

Ứng dụng của bạn đã được nâng cấp hoàn chỉnh về mặt giao diện (UI) và trải nghiệm (UX) 5.0, dark mode mặc định, đáp ứng đa nền tảng PWA và hoạt động chính thức trên **Firebase thực tế**.

## 1. Hệ thống Firebase
Do bạn đã cấu hình Firebase với dự án `profile-d1214.firebaseapp.com`, dữ liệu sẽ được đọc ghi trực tiếp lên chính project của bạn. Hệ sinh thái này không dùng bất kỳ dữ liệu ảo nào!
- **Firestore Schema:**
  - `users`: Thông tin người dùng, auth id, gmail, display name, avatar, role (`user` / `admin` / `superadmin`), status (`active` / `banned`), thời gian hoạt động.
  - `tasks`: Chứa dữ liệu của Tiện ích **Quản lý công việc**.
  - `settings`: (Document `system`) Bật/Tắt **Bảo trì**.
  - `notifications`: Nơi đăng tải các thông báo đẩy.

## 2. Bảo Mật Firebase Data
File `firestore.rules` đã sinh ra trong thư mục gốc. 
Bạn hãy vào trang [Firebase Console](https://console.firebase.google.com/project/profile-d1214/firestore/rules) và sao chép nội dung file đó vào Rule của dự án để đảm bảo an toàn tuyệt đối.

## 3. Account Master 
Hệ thống nhận diện Super Admin dành riêng cho email: `sonlyhongduc@gmail.com`.
Khi bạn đăng nhập bằng Email này, bạn có toàn quyền:
- Hiện tab "Admin Panel" ở Menu.
- Ban / Khóa IP (hiển thị UI).
- Bật tắt hệ thống bảo trì.

## 4. Bảo Trì (Maintenance)
Nếu Admin vào "Admin Panel" thay đổi trạng thái "**Kiểm soát ứng dụng**", giá trị sẽ ghi thẳng lên Firebase (`settings/system/maintenanceMode = true`). 
- **Người dùng thường:** Sẽ thấy trang màn hình khoá ngay lập tức.
- **Admin**: Sẽ vẫn truy cập bình thường.
- Không có internet (`offline`) sẽ hiện cảnh báo Toast/UI đỏ cho User (OfflineIndicator tooltip).

## 5. Deployment Github 
Đem code này lên Github (cấu hình trong repository của bạn) để auto build lên Vercel hoặc Firebase Hosting tuỳ ý.
- Chạy: `npm install` 
- Build: `npm run build`
- Firebase tools deploy: `firebase deploy`
