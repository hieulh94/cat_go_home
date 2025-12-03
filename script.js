const gridElement = document.getElementById("grid");
const statusElement = document.getElementById("status");
const instructionList = document.getElementById("instructionList");
const resetButton = document.getElementById("reset");
const controlButtons = document.querySelectorAll(".controls button");
const winOverlay = document.getElementById("winOverlay");
const winClose = document.getElementById("winClose");
const winPlayAgain = document.getElementById("winPlayAgain");
const showPathToggle = document.getElementById("showPathToggle");
const showInstructionsToggle = document.getElementById("showInstructionsToggle");
const obstacleToggle = document.getElementById("obstacleToggle");

const GRID_SIZE = 6;

const startPosition = {
  row: GRID_SIZE - 1,
  col: 1,
};

let catPosition = { ...startPosition };
let homePosition = { row: 0, col: GRID_SIZE - 2 };
let instructions = [];
let currentStep = 0;
let pathPositions = [];
let gameFinished = false;
let obstaclePositions = [];

const directionMap = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const offsetMap = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

function createGrid() {
  gridElement.innerHTML = "";
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      gridElement.appendChild(cell);
    }
  }
}

function updateGrid() {
  const showPath = showPathToggle ? showPathToggle.checked : true;
  if (gridElement) {
    if (showPath) {
      gridElement.classList.remove("hide-path");
    } else {
      gridElement.classList.add("hide-path");
    }
  }

  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove(
      "cat",
      "home",
      "path",
      "path-done",
      "path-next",
      "obstacle",
      "cat-next-up",
      "cat-next-down",
      "cat-next-left",
      "cat-next-right",
      "cat-dir-up",
      "cat-dir-down",
      "cat-dir-left",
      "cat-dir-right",
    );
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    const pathIndex = pathPositions.findIndex(
      (pos) => pos.row === row && pos.col === col,
    );
    if (pathIndex >= 0) {
      cell.classList.add("path");
      if (pathIndex <= currentStep) {
        cell.classList.add("path-done");
      } else if (pathIndex === currentStep + 1) {
        cell.classList.add("path-next");
      }
    }

    const isObstacle = obstaclePositions.some(
      (pos) => pos.row === row && pos.col === col,
    );
    if (isObstacle) {
      cell.classList.add("obstacle");
    }

    if (row === catPosition.row && col === catPosition.col) {
      cell.classList.add("cat");

      // Mèo quay mặt theo hướng vừa đi (nếu có), không phải hướng sắp đi
      const prevDir = currentStep > 0 && !gameFinished
        ? instructions[currentStep - 1]
        : null;

      if (prevDir) {
        cell.classList.add(`cat-dir-${prevDir}`);
      } else {
        // Bước đầu tiên, mèo quay mặt theo hướng đầu tiên (up)
        cell.classList.add("cat-dir-up");
      }
    }
    if (row === homePosition.row && col === homePosition.col) {
      cell.classList.add("home");
    }
  });
}

function generatePath() {
  instructions = [];
  currentStep = 0;
  catPosition = { ...startPosition };
  let cursor = { ...startPosition };
  pathPositions = [{ ...startPosition }];
  gameFinished = false;
  obstaclePositions = [];
  if (winOverlay) {
    winOverlay.classList.remove("show");
    winOverlay.setAttribute("aria-hidden", "true");
  }

  homePosition = { row: 0, col: GRID_SIZE - 2 };

  // Bước đầu tiên luôn đi thẳng (lên)
  instructions.push("up");
  cursor = { row: cursor.row - 1, col: cursor.col };
  pathPositions.push({ ...cursor });

  // Khoảng cách Manhattan từ điểm bắt đầu tới nhà
  const startDist =
    Math.abs(startPosition.row - homePosition.row) + Math.abs(startPosition.col - homePosition.col);

  let steps = 1; // Đã có 1 bước đầu tiên
  while (steps < startDist) {
    const possible = Object.entries(offsetMap)
      .map(([dir, delta]) => ({
        dir,
        nextRow: cursor.row + delta.row,
        nextCol: cursor.col + delta.col,
      }))
      .filter(
        ({ nextRow, nextCol }) =>
          nextRow >= 0 && nextRow < GRID_SIZE && nextCol >= 0 && nextCol < GRID_SIZE,
      );

    const currentDist =
      Math.abs(cursor.row - homePosition.row) + Math.abs(cursor.col - homePosition.col);

    // Chỉ chọn những bước làm giảm khoảng cách đúng 1 đơn vị
    const strictlyCloser = possible.filter(({ nextRow, nextCol }) => {
      const dist =
        Math.abs(nextRow - homePosition.row) + Math.abs(nextCol - homePosition.col);
      return dist === currentDist - 1;
    });

    const pool = strictlyCloser.length > 0 ? strictlyCloser : possible;
    const choice = pool[Math.floor(Math.random() * pool.length)];

    instructions.push(choice.dir);
    cursor = { row: choice.nextRow, col: choice.nextCol };
    pathPositions.push({ ...cursor });
    steps += 1;
  }

  // Tạo chướng ngại vật nếu checkbox được tick
  if (obstacleToggle && obstacleToggle.checked) {
    const availablePositions = pathPositions.filter(
      (pos, idx) =>
        idx >= 3 && // Ít nhất sau 3 bước đi (index 0, 1, 2 là 3 bước đầu)
        idx < pathPositions.length - 1 &&
        !(pos.row === catPosition.row && pos.col === catPosition.col) &&
        !(pos.row === homePosition.row && pos.col === homePosition.col),
    );
    if (availablePositions.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePositions.length);
      obstaclePositions = [availablePositions[randomIndex]];
    }
  }

  renderInstructions();
  updateGrid();
  updateStatus("Thực hiện các bước theo thứ tự mũi tên.", "info");
}

function renderInstructions() {
  instructionList.innerHTML = "";
  instructions.forEach((dir, idx) => {
    const item = document.createElement("li");
    const prevDir = idx > 0 ? instructions[idx - 1] : null;
    const { displayText, arrow } = formatDirectionRelative(dir, prevDir);
    
    item.innerHTML = `<span class="instr-arrow">${arrow}</span><span class="instr-text">${displayText}</span>`;
    if (idx === currentStep) {
      item.classList.add("current");
    } else if (idx < currentStep) {
      item.classList.add("done");
    }
    instructionList.appendChild(item);
  });
}

function updateStatus(message, type) {
  statusElement.textContent = message;
  statusElement.classList.remove("error", "success");
  if (type === "error") statusElement.classList.add("error");
  if (type === "success") statusElement.classList.add("success");
}

function formatDirection(dir) {
  switch (dir) {
    case "up":
      return "Lên";
    case "down":
      return "Xuống";
    case "left":
      return "Trái";
    case "right":
      return "Phải";
    default:
      return dir;
  }
}

function formatDirectionRelative(dir, prevDir) {
  // Bước đầu tiên luôn là "Đi thẳng"
  if (!prevDir) {
    return {
      displayText: "Đi thẳng",
      arrow: "↑", // Mũi tên lên khi "Đi thẳng"
    };
  }

  // Nếu cùng hướng với bước trước → Đi thẳng
  if (prevDir === dir) {
    return {
      displayText: "Đi thẳng",
      arrow: "↑", // Mũi tên lên khi "Đi thẳng"
    };
  }

  // Xác định hướng quay: Rẽ phải hay Rẽ trái
  // Thứ tự theo chiều kim đồng hồ: up -> right -> down -> left -> up
  const directions = ["up", "right", "down", "left"];
  const prevIndex = directions.indexOf(prevDir);
  const currentIndex = directions.indexOf(dir);

  // Tính góc quay
  let turn = (currentIndex - prevIndex + 4) % 4;

  if (turn === 1) {
    // Quay 90 độ theo chiều kim đồng hồ → Rẽ phải
    return {
      displayText: "Rẽ phải",
      arrow: "→", // Mũi tên phải khi "Rẽ phải"
    };
  } else if (turn === 3) {
    // Quay 90 độ ngược chiều kim đồng hồ → Rẽ trái
    return {
      displayText: "Rẽ trái",
      arrow: "←", // Mũi tên trái khi "Rẽ trái"
    };
  } else {
    // Quay 180 độ (turn === 2) → Đi thẳng
    return {
      displayText: "Đi thẳng",
      arrow: "↑", // Mũi tên lên khi "Đi thẳng"
    };
  }
}

function moveCat(dir) {
  if (gameFinished) return;
  if (currentStep >= instructions.length) return;

  // TRƯỚC TIÊN: Kiểm tra xem có chướng ngại vật ở ô kế tiếp (theo hướng sắp đi) không
  // Nếu có, CHỈ cho phép ấn nút Xuống (quay lại), tất cả các nút khác đều bị từ chối
  if (currentStep > 0 && currentStep < instructions.length) {
    const nextDir = instructions[currentStep];
    const nextOffset = offsetMap[nextDir];
    const nextPosForObstacle = {
      row: catPosition.row + nextOffset.row,
      col: catPosition.col + nextOffset.col,
    };

    const hasObstacleAhead = obstaclePositions.some(
      (pos) => pos.row === nextPosForObstacle.row && pos.col === nextPosForObstacle.col,
    );

    // Nếu có chướng ngại vật ở ô kế tiếp (theo hướng sắp đi)
    if (hasObstacleAhead) {
      // QUAN TRỌNG: Khi có chướng ngại vật ở phía trước:
      // - Không thể đi thẳng (up)
      // - Không thể sang trái (left)
      // - Không thể sang phải (right)
      // - CHỈ có thể ấn nút Xuống (down) để lùi lại
      
      // CHỈ khi ấn nút Xuống (down) → mới lùi lại và xóa chướng ngại vật
      if (dir === "down") {
        const prevPos = pathPositions[currentStep - 1];
        catPosition = { ...prevPos };
        currentStep -= 1;
        obstaclePositions = obstaclePositions.filter(
          (pos) => pos.row !== nextPosForObstacle.row || pos.col !== nextPosForObstacle.col,
        );
        renderInstructions();
        updateGrid();
        updateStatus("Chướng ngại vật đã biến mất, tiếp tục hành trình nhé!", "info");
        return;
      }
      
      // Nếu KHÔNG phải nút Xuống → KHÔNG cho phép làm gì cả
      // Không thể đi thẳng (up), không thể sang trái (left), không thể sang phải (right)
      // CHỈ có thể ấn nút Xuống (down) để lùi lại
      updateStatus("Mèo gặp chướng ngại vật, hãy ấn nút Xuống để lùi lại.", "error");
      return;
    }
  }

  // Kiểm tra hướng hiển thị để xử lý các trường hợp "Đi thẳng", "Rẽ phải", "Rẽ trái"
  const actualDir = instructions[currentStep];
  const prevDir = currentStep > 0 ? instructions[currentStep - 1] : null;
  const { displayText } = formatDirectionRelative(actualDir, prevDir);
  
  // Kiểm tra input dựa trên text hiển thị
  let isValidInput = false;
  let moveDir = actualDir; // Mặc định dùng hướng thực tế
  
  if (displayText === "Đi thẳng") {
    // Khi hiển thị "Đi thẳng", CHỈ chấp nhận input "up" (mũi tên đi thẳng)
    if (dir === "up") {
      isValidInput = true;
      moveDir = actualDir; // Dùng hướng thực tế để di chuyển
    }
  } else if (displayText === "Rẽ phải") {
    // Khi hiển thị "Rẽ phải", CHỈ chấp nhận input "right" (mũi tên rẽ phải)
    if (dir === "right") {
      isValidInput = true;
      moveDir = actualDir; // Dùng hướng thực tế để di chuyển
    }
  } else if (displayText === "Rẽ trái") {
    // Khi hiển thị "Rẽ trái", CHỈ chấp nhận input "left" (mũi tên rẽ trái)
    if (dir === "left") {
      isValidInput = true;
      moveDir = actualDir; // Dùng hướng thực tế để di chuyển
    }
  } else if (dir === actualDir) {
    // Nếu không có text tương đối (không phải "Đi thẳng", "Rẽ phải", "Rẽ trái"),
    // chấp nhận input khớp với hướng thực tế
    isValidInput = true;
    moveDir = actualDir;
  }
  
  if (!isValidInput) {
    updateStatus("Sai hướng! Hãy làm lại bước này.", "error");
    return;
  }

  // Tính vị trí sắp di chuyển đến
  const offset = offsetMap[moveDir];
  const nextPos = {
    row: catPosition.row + offset.row,
    col: catPosition.col + offset.col,
  };

  // Kiểm tra chướng ngại vật ở vị trí sắp di chuyển đến
  // QUAN TRỌNG: Kiểm tra này áp dụng cho TẤT CẢ các hướng (không chỉ phía trước)
  // Nếu có chướng ngại vật ở vị trí sắp di chuyển đến, KHÔNG cho phép di chuyển
  const hitObstacle = obstaclePositions.some(
    (pos) => pos.row === nextPos.row && pos.col === nextPos.col,
  );

  if (hitObstacle) {
    // KHÔNG cho mèo tiến vào ô chướng ngại vật
    // Nếu chướng ngại vật ở phía trước, đã xử lý ở phần đầu hàm rồi
    // Đây là chướng ngại vật ở hướng khác (trái, phải, sau)
    // Không cho phép di chuyển vào ô chướng ngại vật
    updateStatus("Mèo gặp chướng ngại vật ở hướng này, không thể đi tiếp.", "error");
    return;
  }

  // Nếu không có chướng ngại vật, tiếp tục di chuyển bình thường
  catPosition = nextPos;
  currentStep += 1;
  renderInstructions();
  updateGrid();

  if (catPosition.row === homePosition.row && catPosition.col === homePosition.col) {
    updateStatus("Tuyệt vời! Mèo đã về tới nhà.", "success");
    gameFinished = true;
    if (winOverlay) {
      setTimeout(() => {
        winOverlay.classList.add("show");
        winOverlay.setAttribute("aria-hidden", "false");
      }, 150);
    }
  } else {
    updateStatus("Chuẩn rồi, tiếp tục bước tiếp theo!", "info");
  }
}

function handleKeydown(event) {
  const dir = directionMap[event.key];
  if (!dir) return;
  event.preventDefault();
  moveCat(dir);
}

function handleButtonClick(event) {
  const dir = event.currentTarget.dataset.dir;
  if (!dir) return;
  moveCat(dir);
}

function init() {
  createGrid();
  generatePath();
  document.addEventListener("keydown", handleKeydown);
  controlButtons.forEach((button) => button.addEventListener("click", handleButtonClick));
  resetButton.addEventListener("click", generatePath);

  if (winClose && winOverlay) {
    winClose.addEventListener("click", () => {
      winOverlay.classList.remove("show");
      winOverlay.setAttribute("aria-hidden", "true");
    });
  }

  if (winPlayAgain) {
    winPlayAgain.addEventListener("click", () => {
      generatePath();
    });
  }

  if (showPathToggle) {
    showPathToggle.addEventListener("change", () => {
      updateGrid();
    });
  }

  if (showInstructionsToggle) {
    // Khởi tạo trạng thái ban đầu (mặc định uncheck)
    const sidebar = document.querySelector(".sidebar");
    const app = document.querySelector(".app");
    if (sidebar && app && !showInstructionsToggle.checked) {
      sidebar.classList.add("hidden");
      app.classList.add("sidebar-hidden");
    }
    
    showInstructionsToggle.addEventListener("change", () => {
      if (sidebar && app) {
        if (showInstructionsToggle.checked) {
          sidebar.classList.remove("hidden");
          app.classList.remove("sidebar-hidden");
        } else {
          sidebar.classList.add("hidden");
          app.classList.add("sidebar-hidden");
        }
      }
    });
  }
}

init();

