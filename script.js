const gridElement = document.getElementById("grid");
const statusElement = document.getElementById("status");
const instructionList = document.getElementById("instructionList");
const resetButton = document.getElementById("reset");
const controlButtons = document.querySelectorAll(".controls button");
const winOverlay = document.getElementById("winOverlay");
const winClose = document.getElementById("winClose");
const winPlayAgain = document.getElementById("winPlayAgain");

const GRID_SIZE = 6;

const startPosition = {
  row: GRID_SIZE - 2,
  col: 0,
};

let catPosition = { ...startPosition };
let homePosition = { row: 0, col: GRID_SIZE - 2 };
let instructions = [];
let currentStep = 0;
let pathPositions = [];
let gameFinished = false;

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
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove(
      "cat",
      "home",
      "path",
      "path-done",
      "path-next",
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

    if (row === catPosition.row && col === catPosition.col) {
      cell.classList.add("cat");

      const nextDir = !gameFinished && currentStep < instructions.length
        ? instructions[currentStep]
        : null;

      if (nextDir) {
        cell.classList.add(`cat-next-${nextDir}`);
        cell.classList.add(`cat-dir-${nextDir}`);
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
  if (winOverlay) {
    winOverlay.classList.remove("show");
    winOverlay.setAttribute("aria-hidden", "true");
  }

  homePosition = { row: 0, col: GRID_SIZE - 2 };

  // Khoảng cách Manhattan từ điểm bắt đầu tới nhà
  const startDist =
    Math.abs(cursor.row - homePosition.row) + Math.abs(cursor.col - homePosition.col);

  let steps = 0;
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
  renderInstructions();
  updateGrid();
  updateStatus("Thực hiện các bước theo thứ tự mũi tên.", "info");
}

function renderInstructions() {
  instructionList.innerHTML = "";
  instructions.forEach((dir, idx) => {
    const item = document.createElement("li");
    const arrow =
      dir === "up" ? "↑" : dir === "down" ? "↓" : dir === "left" ? "←" : "→";
    item.innerHTML = `<span class="instr-arrow">${arrow}</span><span class="instr-text">${formatDirection(
      dir,
    )}</span>`;
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

function moveCat(dir) {
  if (gameFinished) return;
  if (currentStep >= instructions.length) return;

  if (dir !== instructions[currentStep]) {
    updateStatus("Sai hướng! Hãy làm lại bước này.", "error");
    return;
  }

  const offset = offsetMap[dir];
  catPosition = {
    row: catPosition.row + offset.row,
    col: catPosition.col + offset.col,
  };

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
}

init();

