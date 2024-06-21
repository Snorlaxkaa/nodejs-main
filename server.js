const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

let rooms = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('使用者已連線');

  socket.on('createRoom', ({ room }) => {
    rooms[room] = { options: [], positions: [], admin: socket.id };
    socket.join(room);
    console.log(`房間 ${room} 已創建`);
    socket.emit('roomCreated', { room });
    io.to(room).emit('updateOptions', { options: rooms[room].options, positions: rooms[room].positions });
  });

  socket.on('joinRoom', ({ room }) => {
    if (rooms[room]) {
      socket.join(room);
      console.log(`玩家加入了房間 ${room}`);
      socket.emit('roomJoined', { room, options: rooms[room].options, positions: rooms[room].positions });
    } else {
      socket.emit('error', { message: '房間不存在' });
    }
  });

  socket.on('addOption', ({ room, option }) => {
    if (rooms[room] && rooms[room].admin === socket.id) {
      rooms[room].options.push(option);
      io.to(room).emit('updateOptions', { options: rooms[room].options, positions: rooms[room].positions });
    }
  });

  socket.on('removeOption', ({ room }) => {
    if (rooms[room] && rooms[room].admin === socket.id && rooms[room].options.length > 1) {
      rooms[room].options.pop();
      io.to(room).emit('updateOptions', { options: rooms[room].options, positions: rooms[room].positions });
    }
  });

  socket.on('editOption', ({ room, option }) => {
    if (rooms[room] && rooms[room].admin === socket.id) {
      rooms[room].options[option.index] = option.text;
      io.to(room).emit('updateOptions', { options: rooms[room].options, positions: rooms[room].positions });
    }
  });

  socket.on('scatterPositions', ({ room, positions }) => {
    if (rooms[room] && rooms[room].admin === socket.id) {
      rooms[room].positions = positions;
      io.to(room).emit('updatePositions', { positions });
    }
  });

  socket.on('startDraw', ({ room }) => {
    console.log('開始抽獎');
    if (rooms[room] && rooms[room].admin === socket.id) {
      const options = rooms[room].options;
      let runTimes = 0;
      const stopPlay = Math.floor(Math.random() * (20 - 0) + 20);
      let no = 0;

      const play = () => {
        no++;
        runTimes++;
        if (no >= options.length) {
          no = 0;
        }
        io.to(room).emit('drawStep', { no });

        if (runTimes > stopPlay) {
          const result = options[no];
          io.to(room).emit('drawResult', { result });
        } else {
          setTimeout(play, runTimes + 10 > stopPlay ? 50 * 1.4 : 50);
        }
      };

      play();
    } else {
      socket.emit('error', { message: '只有管理員可以發起抽獎' });
    }
  });

  socket.on('disconnect', () => {
    console.log('使用者已斷線');
    // 處理斷線邏輯
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
