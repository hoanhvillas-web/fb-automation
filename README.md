# FB AI Automation - Chrome Extension

Dự án này là một Chrome Extension giúp tự động hóa các tác vụ trên Facebook sử dụng Gemini AI.

## Cấu trúc thư mục quan trọng:
- `public/manifest.json`: Cấu hình Extension.
- `src/background.ts`: Xử lý chạy ngầm, quản lý Login và Alarms.
- `src/content.ts`: Tương tác trực tiếp với giao diện Facebook.
- `src/popup.tsx`: Giao diện điều khiển người dùng.
- `vite.config.ts`: Cấu hình đóng gói dự án.
- `package.json`: Các thư viện phụ thuộc.

## Hướng dẫn cài đặt trên máy tính:
1. Giải nén file ZIP.
2. Mở Terminal tại thư mục đã giải nén.
3. Chạy lệnh: `npm install`
4. Chạy lệnh: `npm run build`
5. Mở Chrome, vào `chrome://extensions/`, bật "Developer mode".
6. Chọn "Load unpacked" và trỏ đến thư mục `dist` vừa được tạo ra.

## Lưu ý:
Đảm bảo bạn đã tạo file `.env` với `VITE_GEMINI_API_KEY` của mình trước khi build.
