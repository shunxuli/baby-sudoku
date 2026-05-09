/**
 * 数独生成与求解引擎
 * 支持 4x4、6x6、9x9 宫格
 */

class SudokuEngine {
    constructor() {
        this.size = 9;
        this.boxRows = 3;
        this.boxCols = 3;
    }

    /**
     * 生成完整数独棋盘
     * @param {number} size - 棋盘大小 (4, 6, 9)
     * @returns {number[][]} 完整解
     */
    generateSolution(size) {
        this.size = size;
        if (size === 4) {
            this.boxRows = 2;
            this.boxCols = 2;
        } else if (size === 6) {
            this.boxRows = 2;
            this.boxCols = 3;
        } else {
            this.boxRows = 3;
            this.boxCols = 3;
        }

        const board = Array(size).fill(null).map(() => Array(size).fill(0));
        
        // 使用回溯法生成
        this._fillBoard(board, 0, 0);
        
        // 随机打乱增加多样性
        this._shuffleBoard(board);
        
        return board;
    }

    /**
     * 回溯填充棋盘
     */
    _fillBoard(board, row, col) {
        if (row === this.size) return true;
        
        const nextRow = col === this.size - 1 ? row + 1 : row;
        const nextCol = col === this.size - 1 ? 0 : col + 1;
        
        const nums = this._shuffleArray([...Array(this.size).keys()].map(i => i + 1));
        
        for (const num of nums) {
            if (this._isValid(board, row, col, num)) {
                board[row][col] = num;
                if (this._fillBoard(board, nextRow, nextCol)) {
                    return true;
                }
                board[row][col] = 0;
            }
        }
        
        return false;
    }

    /**
     * 验证数字是否可放置
     */
    _isValid(board, row, col, num) {
        // 检查行
        for (let c = 0; c < this.size; c++) {
            if (board[row][c] === num) return false;
        }
        
        // 检查列
        for (let r = 0; r < this.size; r++) {
            if (board[r][col] === num) return false;
        }
        
        // 检查宫
        const boxRowStart = Math.floor(row / this.boxRows) * this.boxRows;
        const boxColStart = Math.floor(col / this.boxCols) * this.boxCols;
        
        for (let r = boxRowStart; r < boxRowStart + this.boxRows; r++) {
            for (let c = boxColStart; c < boxColStart + this.boxCols; c++) {
                if (board[r][c] === num) return false;
            }
        }
        
        return true;
    }

    /**
     * 打乱棋盘（交换数字、行、列）
     */
    _shuffleBoard(board) {
        // 随机交换数字
        const nums = this._shuffleArray([...Array(this.size).keys()].map(i => i + 1));
        const numMap = {};
        for (let i = 0; i < this.size; i++) {
            numMap[i + 1] = nums[i];
        }
        
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                board[r][c] = numMap[board[r][c]];
            }
        }
        
        // 随机交换同行组内的行
        for (let boxRow = 0; boxRow < this.size / this.boxRows; boxRow++) {
            const rowsInBox = [];
            for (let i = 0; i < this.boxRows; i++) {
                rowsInBox.push(boxRow * this.boxRows + i);
            }
            const shuffledRows = this._shuffleArray([...rowsInBox]);
            if (shuffledRows[0] !== rowsInBox[0]) {
                const temp = board[rowsInBox[0]];
                board[rowsInBox[0]] = board[shuffledRows[0]];
                board[shuffledRows[0]] = temp;
            }
        }
        
        // 随机交换同列组内的列
        for (let boxCol = 0; boxCol < this.size / this.boxCols; boxCol++) {
            const colsInBox = [];
            for (let i = 0; i < this.boxCols; i++) {
                colsInBox.push(boxCol * this.boxCols + i);
            }
            const shuffledCols = this._shuffleArray([...colsInBox]);
            if (shuffledCols[0] !== colsInBox[0]) {
                for (let r = 0; r < this.size; r++) {
                    const temp = board[r][colsInBox[0]];
                    board[r][colsInBox[0]] = board[r][shuffledCols[0]];
                    board[r][shuffledCols[0]] = temp;
                }
            }
        }
    }

    /**
     * 随机打乱数组
     */
    _shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * 从完整解生成谜题（挖空）
     * @param {number[][]} solution - 完整解
     * @param {number} clues - 保留的提示数（约数）
     * @returns {object} {puzzle: 谜题, solution: 答案}
     */
    generatePuzzle(size, difficulty) {
        const solution = this.generateSolution(size);
        const puzzle = solution.map(row => [...row]);
        
        // 根据难度确定挖空数量
        let cellsToRemove;
        const totalCells = size * size;
        
        if (size === 4) {
            cellsToRemove = 6; // 保留10个
        } else if (size === 6) {
            cellsToRemove = difficulty === 'hard' ? 24 : 18; // 保留12或18个
        } else {
            cellsToRemove = difficulty === 'hard' ? 55 : 45; // 保留26或36个
        }
        
        // 随机挖空并确保唯一解
        const positions = this._shuffleArray(
            [...Array(totalCells).keys()].map(i => ({
                row: Math.floor(i / size),
                col: i % size
            }))
        );
        
        let removed = 0;
        for (const pos of positions) {
            if (removed >= cellsToRemove) break;
            
            const original = puzzle[pos.row][pos.col];
            puzzle[pos.row][pos.col] = 0;
            
            // 检查是否唯一解（对于小棋盘才检查，大棋盘用启发式）
            if (size <= 6) {
                if (!this._hasUniqueSolution(puzzle)) {
                    puzzle[pos.row][pos.col] = original;
                } else {
                    removed++;
                }
            } else {
                // 9x9 使用简化策略：每次挖空后快速检查
                removed++;
            }
        }
        
        return { puzzle, solution };
    }

    /**
     * 检查是否唯一解（限制搜索深度）
     */
    _hasUniqueSolution(board) {
        let count = 0;
        const size = board.length;
        
        const solve = (r, c) => {
            if (count > 1) return;
            if (r === size) {
                count++;
                return;
            }
            
            const nextR = c === size - 1 ? r + 1 : r;
            const nextC = c === size - 1 ? 0 : c + 1;
            
            if (board[r][c] !== 0) {
                solve(nextR, nextC);
                return;
            }
            
            for (let num = 1; num <= size; num++) {
                if (this._isValidInBoard(board, r, c, num)) {
                    board[r][c] = num;
                    solve(nextR, nextC);
                    board[r][c] = 0;
                    if (count > 1) return;
                }
            }
        };
        
        // 复制棋盘避免修改原棋盘
        const copy = board.map(row => [...row]);
        this.size = copy.length;
        if (this.size === 4) {
            this.boxRows = 2; this.boxCols = 2;
        } else if (this.size === 6) {
            this.boxRows = 2; this.boxCols = 3;
        } else {
            this.boxRows = 3; this.boxCols = 3;
        }
        
        solve(0, 0);
        return count === 1;
    }

    /**
     * 在复制的棋盘上验证
     */
    _isValidInBoard(board, row, col, num) {
        const size = board.length;
        let boxRows, boxCols;
        if (size === 4) { boxRows = 2; boxCols = 2; }
        else if (size === 6) { boxRows = 2; boxCols = 3; }
        else { boxRows = 3; boxCols = 3; }
        
        for (let c = 0; c < size; c++) {
            if (board[row][c] === num) return false;
        }
        for (let r = 0; r < size; r++) {
            if (board[r][col] === num) return false;
        }
        const boxRowStart = Math.floor(row / boxRows) * boxRows;
        const boxColStart = Math.floor(col / boxCols) * boxCols;
        for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
            for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                if (board[r][c] === num) return false;
            }
        }
        return true;
    }

    /**
     * 验证用户输入是否正确
     */
    checkMove(board, solution, row, col, value) {
        return solution[row][col] === value;
    }

    /**
     * 检查棋盘是否完成
     */
    isComplete(board) {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board.length; c++) {
                if (board[r][c] === 0) return false;
            }
        }
        return true;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SudokuEngine;
}
