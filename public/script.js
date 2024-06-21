let socket;
let roomNumber;
let isAdmin = false;
let stopPlay = 0;
let runTimes = 0;
let sec = 50;
let no = 0;

document.getElementById('createRoom').addEventListener('click', () => {
  socket = io();
  const roomId = Math.random().toString(36).substr(2, 9);
  roomNumber = roomId;
  isAdmin = true;
  socket.emit('createRoom', { room: roomId });
  document.getElementById('roomIdContainer').style.display = 'none';
  document.getElementById('roomIdDisplay').innerText = `房號: ${roomId}`;
  document.getElementById('roomIdDisplay').style.display = 'block';
  setupSocketListeners();
  enableAdminControls();
});

document.getElementById('joinRoom').addEventListener('click', () => {
  document.getElementById('roomIdContainer').style.display = 'block';
});

document.getElementById('joinRoomConfirm').addEventListener('click', () => {
  roomNumber = document.getElementById('roomId').value;
  if (roomNumber) {
    socket = io();
    socket.emit('joinRoom', { room: roomNumber });
    document.getElementById('roomIdContainer').style.display = 'none';
    document.getElementById('roomIdDisplay').innerText = `房號: ${roomNumber}`;
    document.getElementById('roomIdDisplay').style.display = 'block';
    setupSocketListeners();
    disableAdminControls();
  } else {
    alert("請輸入房間 ID");
  }
});

document.getElementById('start-draw').addEventListener('click', () => {
  if (runTimes > 0) return;
  if (socket && roomNumber && isAdmin) {
    stopPlay = Math.floor(Math.random() * (20 - 0) + 20);
    document.getElementById('start-draw').disabled = true;
    socket.emit('startDraw', { room: roomNumber });
  } else {
    alert("只有管理員可以發起抽獎");
  }
});

function setupSocketListeners() {
  socket.on('roomCreated', ({ room }) => {
    console.log(`房間 ${room} 已創建`);
  });

  socket.on('roomJoined', ({ room, options, positions }) => {
    console.log(`已加入房間 ${room}`);
    updateOptions(options);
    updatePositions(positions);
  });

  socket.on('updateOptions', ({ options, positions }) => {
    updateOptions(options);
    updatePositions(positions);
  });

  socket.on('updatePositions', ({ positions }) => {
    updatePositions(positions);
  });

  socket.on('drawStep', ({ no }) => {
    var options = $(".slotWrap .option");
    $(options[no])
      .addClass("active")
      .siblings()
      .removeClass("active");
  });

  socket.on('drawResult', ({ result }) => {
    console.log(`抽獎結果：${result}`);
    $("#winPrizes").text(result);
    $("#letmeopen").fadeIn(250);
    $(".popup-box").removeClass("transform-out").addClass("transform-in");
    init(); // 確保初始化，以便下次可以重新抽獎
  });

  socket.on('error', ({ message }) => {
    alert(message);
  });
}

function init() {
  runTimes = 0;
  sec = 50;
  no = no - 1;
  $("button#start-draw").attr("disabled", false);
}

function enableAdminControls() {
  $("#add-option").prop("disabled", false);
  $("#remove-option").prop("disabled", false);
  $("#start-draw").prop("disabled", false);
}

function disableAdminControls() {
  $("#add-option").prop("disabled", true);
  $("#remove-option").prop("disabled", true);
  $("#start-draw").prop("disabled", true);
}

function updateOptions(options) {
  $(".slotWrap").empty();
  options.forEach((option, index) => {
    let newOption = $("<div></div>")
      .addClass("option no" + (index + 1))
      .html("<span>" + option + "</span>")
      .click(editOption);
    $(".slotWrap").append(newOption);
  });
}

function updatePositions(positions) {
  var options = document.querySelectorAll('.slotWrap .option');
  positions.forEach((pos, index) => {
    options[index].style.left = pos.x + 'px';
    options[index].style.top = pos.y + 'px';
  });
}

function scatterPositions() {
  var options = document.querySelectorAll('.slotWrap .option');
  var slotWrap = document.querySelector('.slotWrap');
  var maxWidth = slotWrap.offsetWidth - 198; // 減去選項的寬度
  var maxHeight = slotWrap.offsetHeight - 92 - 100; // 減去選項的高度和按鈕區域高度
  var positions = [];

  options.forEach(option => {
    var attempts = 0;
    var maxAttempts = 100; // 最大嘗試次數以避免無限循環
    var randomX, randomY, collision;

    do {
      collision = false;
      randomX = Math.floor(Math.random() * maxWidth);
      randomY = Math.floor(Math.random() * maxHeight);

      for (var i = 0; i < positions.length; i++) {
        var pos = positions[i];
        if (
          randomX < pos.x + 198 &&
          randomX + 198 > pos.x &&
          randomY < pos.y + 92 &&
          randomY + 92 > pos.y
        ) {
          collision = true;
          break;
        }
      }

      attempts++;
      if (attempts >= maxAttempts) {
        console.warn("位置隨機化達到最大嘗試次數，可能存在重疊");
        break;
      }
    } while (collision);

    positions.push({ x: randomX, y: randomY });
    option.style.left = randomX + 'px';
    option.style.top = randomY + 'px';
  });

  if (socket && roomNumber && isAdmin) {
    socket.emit('scatterPositions', { room: roomNumber, positions });
  }
}

function addOption(option) {
  if (!isAdmin) {
    alert("只有管理員可以新增選項");
    return;
  }
  var newOptionNumber = $(".slotWrap .option").length + 1;
  var newOption = $("<div></div>")
    .addClass("option no" + newOptionNumber)
    .html("<span>" + option + "</span>")
    .click(editOption);
  $(".slotWrap").append(newOption);
  scatterPositions(); // 重新隨機分佈選項
  if (socket && roomNumber) {
    socket.emit('addOption', { room: roomNumber, option: option });
  }
}

$("#add-option").click(function() {
  addOption("新選項");
});

$("#remove-option").click(function() {
  if (!isAdmin) {
    alert("只有管理員可以刪除選項");
    return;
  }
  var options = $(".slotWrap .option");
  if (options.length > 1) {
    options.last().remove();
    scatterPositions(); // 重新隨機分佈選項
    if (socket && roomNumber) {
      socket.emit('removeOption', { room: roomNumber });
    }
  }
});

function editOption() {
  if (!isAdmin) {
    alert("只有管理員可以修改選項");
    return;
  }
  var newText = prompt("請輸入新的選項內容:", $(this).children("span").text());
  if (newText) {
    var index = $(".slotWrap .option").index(this);
    $(this).children("span").text(newText);
    if (socket && roomNumber) {
      socket.emit('editOption', { room: roomNumber, option: { index: index, text: newText } });
    }
  }
}

$(".slotWrap .option").click(editOption);

$(".popup-close").click(function() {
  init();
  $(".popup-wrap").fadeOut(200);
  $(".popup-box")
    .removeClass("transform-in")
    .addClass("transform-out");
  event.preventDefault();
});

window.onload = function() {
  scatterPositions();
};
