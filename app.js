const ROWS = 4;
const COLS = 8;

const PIECE_TYPES = [
  { type: "general", rank: 7, label: { red: "帥", black: "將" }, count: 1 },
  { type: "advisor", rank: 6, label: { red: "仕", black: "士" }, count: 2 },
  { type: "elephant", rank: 5, label: { red: "相", black: "象" }, count: 2 },
  { type: "chariot", rank: 4, label: { red: "俥", black: "車" }, count: 2 },
  { type: "horse", rank: 3, label: { red: "傌", black: "馬" }, count: 2 },
  { type: "cannon", rank: 2, label: { red: "炮", black: "砲" }, count: 2 },
  { type: "soldier", rank: 1, label: { red: "兵", black: "卒" }, count: 5 },
];

const boardEl = document.getElementById("board");
const turnEl = document.getElementById("current-turn");
const messageEl = document.getElementById("message");
const redCapturesEl = document.getElementById("red-captures");
const blackCapturesEl = document.getElementById("black-captures");
const newGameBtn = document.getElementById("new-game");
const passTurnBtn = document.getElementById("pass-turn");

let board = [];
let turn = "red";
let selected = null;
let captures = { red: 0, black: 0 };

function createDeck() {
  const deck = [];
  ["red", "black"].forEach((color) => {
    PIECE_TYPES.forEach((piece) => {
      for (let i = 0; i < piece.count; i += 1) {
        deck.push({
          color,
          type: piece.type,
          rank: piece.rank,
          label: piece.label[color],
          faceDown: true,
        });
      }
    });
  });
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function initGame() {
  const deck = createDeck();
  board = Array.from({ length: ROWS * COLS }, (_, idx) => deck[idx]);
  turn = "red";
  selected = null;
  captures = { red: 0, black: 0 };
  setMessage("Flip any facedown piece to begin.");
  updateStatus();
  renderBoard();
}

function setMessage(msg) {
  messageEl.textContent = msg;
}

function updateStatus() {
  turnEl.textContent = turn === "red" ? "Red" : "Black";
  redCapturesEl.textContent = String(captures.red);
  blackCapturesEl.textContent = String(captures.black);
}

function getCellClasses(piece, idx) {
  const classes = ["cell"];
  if (!piece) {
    classes.push("empty");
  } else if (piece.faceDown) {
    classes.push("facedown");
  } else {
    classes.push(piece.color);
  }
  if (selected === idx) {
    classes.push("selected");
  }
  return classes.join(" ");
}

function renderBoard() {
  boardEl.innerHTML = "";
  board.forEach((piece, idx) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = getCellClasses(piece, idx);
    cell.textContent = piece ? (piece.faceDown ? "暗" : piece.label) : "";
    cell.setAttribute("aria-label", `row ${Math.floor(idx / COLS) + 1}, col ${(idx % COLS) + 1}`);
    cell.addEventListener("click", () => onCellClick(idx));
    boardEl.appendChild(cell);
  });
}

function coords(index) {
  return { row: Math.floor(index / COLS), col: index % COLS };
}

function isAdjacent(from, to) {
  const a = coords(from);
  const b = coords(to);
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr + dc === 1;
}

function canCapture(attacker, defender, from, to) {
  if (attacker.color === defender.color || defender.faceDown) {
    return false;
  }

  if (attacker.type === "cannon") {
    return cannonCaptureValid(from, to);
  }

  if (!isAdjacent(from, to)) {
    return false;
  }

  if (attacker.type === "soldier" && defender.type === "general") {
    return true;
  }
  if (attacker.type === "general" && defender.type === "soldier") {
    return false;
  }

  return attacker.rank >= defender.rank;
}

function cannonCaptureValid(from, to) {
  const a = coords(from);
  const b = coords(to);
  if (a.row !== b.row && a.col !== b.col) {
    return false;
  }

  let screens = 0;
  if (a.row === b.row) {
    const [start, end] = [a.col, b.col].sort((x, y) => x - y);
    for (let c = start + 1; c < end; c += 1) {
      const midPiece = board[a.row * COLS + c];
      if (midPiece) {
        screens += 1;
      }
    }
  } else {
    const [start, end] = [a.row, b.row].sort((x, y) => x - y);
    for (let r = start + 1; r < end; r += 1) {
      const midPiece = board[r * COLS + a.col];
      if (midPiece) {
        screens += 1;
      }
    }
  }
  return screens === 1;
}

function canMove(piece, from, to) {
  const target = board[to];
  if (target) {
    return canCapture(piece, target, from, to);
  }

  if (piece.type === "cannon") {
    return isAdjacent(from, to);
  }

  return isAdjacent(from, to);
}

function switchTurn() {
  turn = turn === "red" ? "black" : "red";
  selected = null;
  updateStatus();
}

function checkWin() {
  const revealed = board.filter((piece) => !piece.faceDown);
  const redLeft = revealed.some((p) => p.color === "red");
  const blackLeft = revealed.some((p) => p.color === "black");
  if (!redLeft || !blackLeft) {
    const winner = redLeft ? "Red" : "Black";
    setMessage(`${winner} wins! Press New Game for another round.`);
    return true;
  }
  return false;
}

function onCellClick(idx) {
  const piece = board[idx];

  if (!piece) {
    if (selected === null) {
      return;
    }
  }

  if (piece && piece.faceDown) {
    piece.faceDown = false;
    setMessage(`${turn === "red" ? "Red" : "Black"} flipped ${piece.label}.`);
    renderBoard();
    if (!checkWin()) {
      switchTurn();
    }
    return;
  }

  if (selected === null) {
    if (!piece || piece.color !== turn) {
      setMessage("You can only select your own revealed piece.");
      return;
    }
    selected = idx;
    setMessage("Piece selected. Click destination.");
    renderBoard();
    return;
  }

  if (selected === idx) {
    selected = null;
    setMessage("Selection cleared.");
    renderBoard();
    return;
  }

  const activePiece = board[selected];
  if (!activePiece || activePiece.color !== turn) {
    selected = null;
    setMessage("Invalid state. Select again.");
    renderBoard();
    return;
  }

  if (!canMove(activePiece, selected, idx)) {
    setMessage("Illegal move.");
    return;
  }

  if (board[idx]) {
    captures[turn] += 1;
    setMessage(`${turn === "red" ? "Red" : "Black"} captured ${board[idx].label}.`);
  } else {
    setMessage("Moved.");
  }

  board[idx] = activePiece;
  board[selected] = null;
  renderBoard();

  if (!checkWin()) {
    switchTurn();
  }
}

newGameBtn.addEventListener("click", initGame);
passTurnBtn.addEventListener("click", () => {
  selected = null;
  switchTurn();
  setMessage(`${turn === "red" ? "Red" : "Black"} to move after pass.`);
  renderBoard();
});

initGame();
