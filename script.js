const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const grid = 32;
const tetrominoSequence = [];

// Initialize game state
let score = 0;
let highScore = localStorage.getItem('tetrisHighScore') || 0;
let count = 0;
let tetromino = null;
let rAF = null;
let gameOver = false;
let isPaused = false;

// Playfield
const playfield = Array.from({ length: 20 }, () => Array(10).fill(0));

// Tetromino shapes and colors
const tetrominos = {
    'I': [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    'J': [[1,0,0], [1,1,1], [0,0,0]],
    'L': [[0,0,1], [1,1,1], [0,0,0]],
    'O': [[1,1], [1,1]],
    'S': [[0,1,1], [1,1,0], [0,0,0]],
    'T': [[0,1,0], [1,1,1], [0,0,0]],
    'Z': [[1,1,0], [0,1,1], [0,0,0]]
};

const colors = {
    'I': 'cyan',
    'J': 'blue',
    'L': 'orange',
    'O': 'yellow',
    'S': 'green',
    'T': 'purple',
    'Z': 'red'
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSequence() {
    const sequence = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    while (sequence.length) {
        const rand = getRandomInt(0, sequence.length - 1);
        const name = sequence.splice(rand, 1)[0];
        tetrominoSequence.push(name);
    }
}

function getNextTetromino() {
    if (tetrominoSequence.length === 0) {
        generateSequence();
    }
    const name = tetrominoSequence.pop();
    const matrix = tetrominos[name];
    const col = playfield[0].length / 2 - Math.ceil(matrix[0].length / 2);
    const row = name === 'I' ? -1 : -2;

    return {
        name: name,
        matrix: matrix,
        row: row,
        col: col
    };
}

function rotate(matrix) {
    const N = matrix.length;
    return matrix.map((row, i) => row.map((val, j) => matrix[N - 1 - j][i]));
}

function isValidMove(matrix, cellRow, cellCol) {
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            if (matrix[row][col] && (
                cellCol + col < 0 ||
                cellCol + col >= playfield[0].length ||
                cellRow + row >= playfield.length ||
                (cellRow + row >= 0 && playfield[cellRow + row][cellCol + col])
            )) {
                return false;
            }
        }
    }
    return true;
}

function placeTetromino() {
    for (let row = 0; row < tetromino.matrix.length; row++) {
        for (let col = 0; col < tetromino.matrix[row].length; col++) {
            if (tetromino.matrix[row][col]) {
                // Check if any part of the piece is above or at the death line (grid * 2)
                if (tetromino.row + row < 2) {
                    return showGameOver();
                }
                playfield[tetromino.row + row][tetromino.col + col] = tetromino.name;
            }
        }
    }

    // Check for line clears
    let linesCleared = 0;
    for (let row = playfield.length - 1; row >= 0; ) {
        if (playfield[row].every(cell => !!cell)) {
            playfield.splice(row, 1);
            playfield.unshift(Array(10).fill(0));
            linesCleared++;
        } else {
            row--;
        }
    }

    // Update score
    if (linesCleared > 0) {
        score += linesCleared * 100;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('tetrisHighScore', highScore);
        }
    }

    tetromino = getNextTetromino();
}

function showGameOver() {
    cancelAnimationFrame(rAF);
    gameOver = true;

    context.fillStyle = 'black';
    context.globalAlpha = 0.75;
    context.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
    context.globalAlpha = 1;
    context.fillStyle = 'white';
    context.font = '36px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2);
}

// Key state management
let keyState = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowDown: false,
    ArrowUp: false
};

// Move tetromino with key states
function moveTetromino() {
    if (gameOver || isPaused) return;

    if (keyState['ArrowLeft']) {
        if (isValidMove(tetromino.matrix, tetromino.row, tetromino.col - 1)) {
            tetromino.col--;
        }
    }
    if (keyState['ArrowRight']) {
        if (isValidMove(tetromino.matrix, tetromino.row, tetromino.col + 1)) {
            tetromino.col++;
        }
    }
    if (keyState['ArrowDown']) {
        if (isValidMove(tetromino.matrix, tetromino.row + 1, tetromino.col)) {
            tetromino.row++;
            score++;
        }
    }
    if (keyState['ArrowUp']) {
        const rotated = rotate(tetromino.matrix);
        if (isValidMove(rotated, tetromino.row, tetromino.col)) {
            tetromino.matrix = rotated;
        }
    }
}

// Game loop
function gameLoop() {
    if (gameOver || isPaused) return;

    rAF = requestAnimationFrame(gameLoop);
    context.clearRect(0, 0, canvas.width, canvas.height);

    moveTetromino();  // Handle movement here

    // Draw playfield
    for (let row = 0; row < 20; row++) {
        for (let col = 0; col < 10; col++) {
            if (playfield[row][col]) {
                const name = playfield[row][col];
                context.fillStyle = colors[name];
                context.fillRect(col * grid, row * grid, grid, grid);
            }
        }
    }

    // Draw score
    context.fillStyle = 'white';
    context.font = '18px monospace';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText(`Score: ${score}`, 10, 10);
    context.fillText(`High Score: ${highScore}`, 10, 30);
    
    // Draw death line
    context.strokeStyle = 'red';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, grid * 2);
    context.lineTo(canvas.width, grid * 2);
    context.stroke();

    if (tetromino) {
        if (++count > 50) {
            tetromino.row++;
            count = 0;
            if (!isValidMove(tetromino.matrix, tetromino.row, tetromino.col)) {
                tetromino.row--;
                placeTetromino();
            }
        }

        context.fillStyle = colors[tetromino.name];
        for (let row = 0; row < tetromino.matrix.length; row++) {
            for (let col = 0; col < tetromino.matrix[row].length; col++) {
                if (tetromino.matrix[row][col]) {
                    context.fillRect((tetromino.col + col) * grid,
                        (tetromino.row + row) * grid,
                        grid,
                        grid);
                }
            }
        }
    }
}

// Handle keydown events to set key state
document.addEventListener('keydown', function(e) {
    if (gameOver) {
        return;
    }

    if (e.key === 'ArrowLeft') {
        keyState['ArrowLeft'] = true;
    } else if (e.key === 'ArrowRight') {
        keyState['ArrowRight'] = true;
    } else if (e.key === 'ArrowDown') {
        keyState['ArrowDown'] = true;
    } else if (e.key === 'ArrowUp') {
        keyState['ArrowUp'] = true;
    }

    if (e.key === 'p') {
        isPaused = !isPaused;
        if (!isPaused) {
            rAF = requestAnimationFrame(gameLoop);
        } else {
            // Draw pause screen
            context.fillStyle = 'black';
            context.globalAlpha = 0.75;
            context.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
            context.globalAlpha = 1;
            context.fillStyle = 'white';
            context.font = '36px monospace';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        }
    }
});

// Handle keyup events to stop key movement
document.addEventListener('keyup', function(e) {
    if (e.key === 'ArrowLeft') {
        keyState['ArrowLeft'] = false;
    } else if (e.key === 'ArrowRight') {
        keyState['ArrowRight'] = false;
    } else if (e.key === 'ArrowDown') {
        keyState['ArrowDown'] = false;
    } else if (e.key === 'ArrowUp') {
        keyState['ArrowUp'] = false;
    }
});

// Start the game
tetromino = getNextTetromino();
rAF = requestAnimationFrame(gameLoop);
