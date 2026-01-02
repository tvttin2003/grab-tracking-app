const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e7 // Tăng giới hạn dữ liệu để cho phép gửi ảnh (10MB)
});

// Cấu hình phục vụ các file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Biến lưu trữ trạng thái đơn hàng tạm thời (Trong thực tế nên dùng Database)
let currentOrder = null;

io.on('connection', (socket) => {
    console.log('Thiết bị mới kết nối:', socket.id);

    // 1. NGƯỜI TẠO ĐƠN: Gửi đơn hàng mới
    socket.on('create-order', (orderData) => {
        currentOrder = { ...orderData, status: 'new', createdAt: new Date() };
        console.log('Đơn hàng mới được tạo:', currentOrder.id);
        
        // Thông báo cho tất cả Tài xế
        io.emit('new-order-alert', currentOrder);
    });

    // 2. TÀI XẾ: Cập nhật vị trí GPS liên tục
    socket.on('send-location', (data) => {
        // Chỉ gửi vị trí cho khách hàng nếu có đơn hàng đang diễn ra
        if (currentOrder) {
            io.emit('receive-location', data);
        }
    });

    // 3. TÀI XẾ: Cập nhật quy trình giao hàng (Quy trình 3 bước)
    // Bước 1: Đang lấy hàng | Bước 2: Đang giao hàng | Bước 3: Hoàn thành
    socket.on('update-order-status', (data) => {
        if (currentOrder) {
            currentOrder.status = data.status;
            
            // Nếu có ảnh xác nhận gửi kèm lúc hoàn thành
            const updatePayload = {
                status: data.status,
                photo: data.photo || null, // Chứa chuỗi base64 của ảnh
                message: getStatusMessage(data.status)
            };

            // Gửi cập nhật này tới cả Khách hàng và Người tạo đơn
            io.emit('order-status-changed', updatePayload);
            
            console.log(`Đơn hàng ${currentOrder.id} chuyển sang: ${data.status}`);
            
            // Nếu hoàn thành, xóa đơn hiện tại sau 5 giây để reset hệ thống
            if (data.status === 'finished') {
                setTimeout(() => { currentOrder = null; }, 5000);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Một thiết bị đã ngắt kết nối');
    });
});

// Hàm bổ trợ để tạo tin nhắn trạng thái
function getStatusMessage(status) {
    switch (status) {
        case 'picking': return "Tài xế đang đi lấy hàng";
        case 'delivering': return "Tài xế đang trên đường giao đến bạn";
        case 'finished': return "Giao hàng thành công!";
        default: return "Đang xử lý";
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`======= HỆ THỐNG ĐANG CHẠY =======`);
    console.log(`Link của bạn: http://localhost:${PORT}`);
    console.log(`==================================`);
});