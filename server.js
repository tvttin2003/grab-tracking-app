const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Cấu hình thư mục chứa file giao diện
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Người dùng mới kết nối:', socket.id);

    // Lắng nghe vị trí từ tài xế
    socket.on('send-location', (data) => {
        // Gửi vị trí này tới tất cả mọi người (khách hàng)
        io.emit('receive-location', { id: socket.id, ...data });
    });

    socket.on('disconnect', () => {
        console.log('Người dùng đã thoát');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});