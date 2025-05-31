"use strict";

// Firebase 設定與初始化（此處使用 compat 版本）
const firebaseConfig = {
  apiKey: "AIzaSyA8s5FjiMRIC_1tHVGa7GNzXQaj-7-lCeQ",
  authDomain: "project-2412265335962931565.firebaseapp.com",
  databaseURL: "https://project-2412265335962931565-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "project-2412265335962931565",
  storageBucket: "project-2412265335962931565.firebasestorage.app",
  messagingSenderId: "356575024664",
  appId: "1:356575024664:web:6ee57940219ba4346c556d",
  measurementId: "G-E1CFMQ3HRE"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 遊戲參數
const rows = 10,
      cols = 10,
      minesCount = 10;

let board = [];         // 用來儲存每個格狀態的二維陣列
let elapsedTime = 0;    // 遊戲所用秒數
let timer = null;       // 記錄計時器 ID
let gameActive = true;  // 遊戲是否進行中
let firstClick = true;  // 判斷是否為第一次點擊

// 建立初始版圖（不先放置炸彈）
function initBoard() {
  board = [];
  for (let i = 0; i < rows; i++) {
    board.push([]);
    for (let j = 0; j < cols; j++) {
      board[i].push({
        mine: false,    // 初始時不放炸彈
        revealed: false,
        flagged: false,
        count: 0
      });
    }
  }
}

// 第一次點擊時放置炸彈，並避開玩家點擊的位置與其周邊 8 格（保證第一點為空白區）
function placeMinesSafe(safeRow, safeCol) {
  let placed = 0;
  while (placed < minesCount) {
    let r = Math.floor(Math.random() * rows);
    let c = Math.floor(Math.random() * cols);
    // 若該位置屬於第一點點擊的安全區，跳過
    if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
    if (!board[r][c].mine) {
      board[r][c].mine = true;
      placed++;
    }
  }
}

// 計算每個格子周邊的炸彈數量（用來顯示數字提示）
function calculateCounts() {
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (board[i][j].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          let rr = i + dr, cc = j + dc;
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && board[rr][cc].mine) {
            count++;
          }
        }
      }
      board[i][j].count = count;
    }
  }
}

// 建立整個遊戲版面（以 HTML 表格的方式）
function drawBoard() {
  const gameDiv = document.getElementById("game");
  gameDiv.innerHTML = "";
  const table = document.createElement("table");
  
  for (let i = 0; i < rows; i++) {
    const tr = document.createElement("tr");
    for (let j = 0; j < cols; j++) {
      const td = document.createElement("td");
      td.classList.add("cell");
      td.setAttribute("data-r", i);
      td.setAttribute("data-c", j);

      // 加入左鍵點擊監聽事件（揭示格子）
      td.addEventListener("click", () => {
        handleCellClick(i, j);
      });
      
      // 加入右鍵點擊監聽事件（標記旗幟）
      td.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        handleCellRightClick(i, j);
      });
      
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  
  gameDiv.appendChild(table);
}

// 左鍵點擊：揭示格子
function handleCellClick(r, c) {
  if (!gameActive) return;
  const cell = board[r][c];
  
  // 如果該格已被標記或已揭示則忽略
  if (cell.flagged || cell.revealed) return;
  
  // 第一次點擊時，先放置炸彈於除安全區（包含周邊 8 格）外的其他位置，再計算數值
  if (firstClick) {
    placeMinesSafe(r, c);
    calculateCounts();
    firstClick = false;
  }
  
  cell.revealed = true;
  const td = document.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  td.classList.add("revealed");
  
  if (cell.mine) {  
    // 理論上第一次點擊不可能觸及炸彈，但後續點擊可能踩到
    td.textContent = "💣";
    td.classList.add("mine");
    gameOver();
  } else {
    td.textContent = cell.count > 0 ? cell.count : "";
    // 若 count 為 0，代表該格為空白區，並展開鄰近空白區
    if (cell.count === 0) {
      td.classList.add("empty");
      revealAdjacent(r, c);
    }
    if (checkWin()) {
      gameWin();
    }
  }
}

// 右鍵點擊：標記或取消標記該格
function handleCellRightClick(r, c) {
  if (!gameActive) return;
  const cell = board[r][c];
  if (cell.revealed) return;
  
  cell.flagged = !cell.flagged;
  const td = document.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  
  if (cell.flagged) {
    td.textContent = "🚩";
    td.classList.add("flagged");
  } else {
    td.textContent = "";
    td.classList.remove("flagged");
  }
}

// 展開周邊空白區域（類似廣度優先搜尋）
function revealAdjacent(r, c) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      let rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && !board[rr][cc].revealed) {
        // 取消該格任何標記
        board[rr][cc].flagged = false;
        const td = document.querySelector(`[data-r="${rr}"][data-c="${cc}"]`);
        td.classList.remove("flagged");
        td.textContent = "";
        board[rr][cc].revealed = true;
        td.classList.add("revealed");
        td.textContent = board[rr][cc].count > 0 ? board[rr][cc].count : "";
        if (board[rr][cc].count === 0) {
          td.classList.add("empty");
          revealAdjacent(rr, cc);
        }
      }
    }
  }
}

// 檢查是否所有非炸彈格子皆已揭示
function checkWin() {
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!board[i][j].mine && !board[i][j].revealed) {
        return false;
      }
    }
  }
  return true;
}

// 遊戲失敗：顯示所有炸彈並停止計時
function gameOver() {
  gameActive = false;
  clearInterval(timer);
  alert("遊戲結束！");
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (board[i][j].mine) {
        const td = document.querySelector(`[data-r="${i}"][data-c="${j}"]`);
        td.textContent = "💣";
        td.classList.add("mine");
      }
    }
  }
}

// 遊戲勝利：停止計時、提示玩家並將分數存入 Firebase
function gameWin() {
  gameActive = false;
  clearInterval(timer);
  alert("恭喜過關！總用時：" + elapsedTime + " 秒");
  saveScore(elapsedTime);
}

// 將用時分數與當下時間存入 Firebase
function saveScore(time) {
  const leaderboardRef = firebase.database().ref("leaderboard");
  const scoreData = {
    seconds: time,
    timestamp: new Date().toISOString()
  };
  leaderboardRef.push(scoreData);
}

// 從 Firebase 讀取排行榜資料並更新畫面
function updateLeaderboard() {
  const leaderboardRef = firebase.database().ref("leaderboard");
  leaderboardRef.orderByChild("seconds").limitToFirst(10).on("value", snapshot => {
    const leaderboardBody = document.querySelector("#leaderboard tbody");
    leaderboardBody.innerHTML = "";
    snapshot.forEach(childSnapshot => {
      const data = childSnapshot.val();
      const row = document.createElement("tr");
      const timeCell = document.createElement("td");
      timeCell.textContent = data.seconds;
      row.appendChild(timeCell);
      const dateCell = document.createElement("td");
      dateCell.textContent = new Date(data.timestamp).toLocaleString();
      row.appendChild(dateCell);
      leaderboardBody.appendChild(row);
    });
  });
}

// 啟動計時器
function startTimer() {
  elapsedTime = 0;
  timer = setInterval(() => {
    elapsedTime++;
  }, 1000);
}

// 初始化遊戲，重置狀態、清空版圖並啟動計時器
function initGame() {
  gameActive = true;
  firstClick = true;  // 重置第一次點擊旗標
  initBoard();
  drawBoard();
  startTimer();
}

// 當 DOM 載入完成後，啟動遊戲並設置重新開始按鈕
document.addEventListener("DOMContentLoaded", () => {
  initGame();
  updateLeaderboard();
  document.getElementById("restartBtn").addEventListener("click", () => {
    clearInterval(timer);
    initGame();
  });
});