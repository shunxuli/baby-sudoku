/**
 * 果果乐园 - 主应用
 * 大厅架构：数独 + 数学 + 未来扩展
 */

// ========== 语音管理 ==========
class SpeechManager {
    constructor() {
        this.enabled = true;
        this.synth = window.speechSynthesis;
        this.queue = [];
        this.speaking = false;
        const saved = localStorage.getItem('sudoku_voiceEnabled');
        if (saved !== null) this.enabled = saved === 'true';
    }
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) this.synth.cancel();
    }
    speak(text, lang = 'zh-CN') {
        if (!this.enabled || !this.synth) return;
        this.queue.push({ text, lang });
        if (!this.speaking) this._processQueue();
    }
    _processQueue() {
        if (this.queue.length === 0) {
            this.speaking = false;
            return;
        }
        this.speaking = true;
        const { text, lang } = this.queue.shift();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang;
        utter.rate = lang === 'zh-CN' ? 0.9 : 0.85;
        utter.pitch = 1.1;
        utter.volume = 1;
        utter.onend = () => setTimeout(() => this._processQueue(), 150);
        utter.onerror = () => this._processQueue();
        this.synth.speak(utter);
    }
}

// ========== 音效管理 ==========
class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioCtx = null;
        const saved = localStorage.getItem('sudoku_soundEnabled');
        if (saved !== null) this.enabled = saved === 'true';
    }
    setEnabled(enabled) { this.enabled = enabled; }
    _getCtx() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioCtx;
    }
    playTone(frequency, duration, type = 'sine') {
        if (!this.enabled) return;
        try {
            const ctx = this._getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = frequency;
            osc.type = type;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch (e) {}
    }
    playSuccess() {
        this.playTone(523, 0.1);
        setTimeout(() => this.playTone(659, 0.1), 100);
        setTimeout(() => this.playTone(784, 0.15), 200);
    }
    playError() {
        this.playTone(200, 0.15, 'square');
        setTimeout(() => this.playTone(150, 0.2, 'square'), 150);
    }
    playWin() {
        const notes = [523, 587, 659, 784, 880, 1047];
        notes.forEach((freq, i) => setTimeout(() => this.playTone(freq, 0.2), i * 120));
    }
}

// ========== 本地存储 ==========
class GameStorage {
    getTotalScore() { return parseInt(localStorage.getItem('lobby_totalScore') || '0'); }
    setTotalScore(score) { localStorage.setItem('lobby_totalScore', score.toString()); }
    getVoiceEnabled() { const s = localStorage.getItem('sudoku_voiceEnabled'); return s !== null ? s === 'true' : true; }
    setVoiceEnabled(v) { localStorage.setItem('sudoku_voiceEnabled', v ? 'true' : 'false'); }
    getSoundEnabled() { const s = localStorage.getItem('sudoku_soundEnabled'); return s !== null ? s === 'true' : true; }
    setSoundEnabled(v) { localStorage.setItem('sudoku_soundEnabled', v ? 'true' : 'false'); }

    // 数独存储
    saveSudoku(state) { localStorage.setItem('sudoku_savedGame', JSON.stringify(state)); }
    getSudoku() { try { return JSON.parse(localStorage.getItem('sudoku_savedGame') || 'null'); } catch { return null; } }
    clearSudoku() { localStorage.removeItem('sudoku_savedGame'); }
    setLastMode(m) { localStorage.setItem('sudoku_lastMode', m); }
    getLastMode() { return localStorage.getItem('sudoku_lastMode'); }
    setLastSize(s) { localStorage.setItem('sudoku_lastSize', s.toString()); }
    getLastSize() { const s = localStorage.getItem('sudoku_lastSize'); return s ? parseInt(s) : null; }
    getShownModes() { try { return JSON.parse(localStorage.getItem('sudoku_shownModes') || '[]'); } catch { return []; } }
    addShownMode(m) { const modes = this.getShownModes(); if (!modes.includes(m)) { modes.push(m); localStorage.setItem('sudoku_shownModes', JSON.stringify(modes)); } }

    // 数学存储
    saveMath(state) { localStorage.setItem('math_savedGame', JSON.stringify(state)); }
    getMath() { try { return JSON.parse(localStorage.getItem('math_savedGame') || 'null'); } catch { return null; } }
    clearMath() { localStorage.removeItem('math_savedGame'); }
    setLastOp(o) { localStorage.setItem('math_lastOp', o); }
    getLastOp() { return localStorage.getItem('math_lastOp'); }
    setLastRange(r) { localStorage.setItem('math_lastRange', r.toString()); }
    getLastRange() { const r = localStorage.getItem('math_lastRange'); return r ? parseInt(r) : null; }
}

// ========== 数独游戏 ==========
class SudokuGame {
    constructor(lobby) {
        this.lobby = lobby;
        this.engine = new SudokuEngine();
        this.modes = {
            fruit: {
                name: '水果乐园', icon: '🍎',
                items: ['🍎', '🍊', '🍌', '🥝', '🫐', '🍇', '🍋', '🍓', '🍑'],
                names: {
                    zh: ['苹果', '橘子', '香蕉', '猕猴桃', '蓝莓', '葡萄', '柠檬', '草莓', '桃子'],
                    en: ['Apple', 'Orange', 'Banana', 'Kiwi', 'Blueberry', 'Grape', 'Lemon', 'Strawberry', 'Peach']
                }
            },
            animal: {
                name: '动物世界', icon: '🐼',
                items: ['🐼', '🦁', '🐸', '🦀', '🐥', '🐳', '🐙', '🐞', '🦋'],
                names: {
                    zh: ['熊猫', '狮子', '青蛙', '螃蟹', '小鸡', '鲸鱼', '章鱼', '瓢虫', '蝴蝶'],
                    en: ['Panda', 'Lion', 'Frog', 'Crab', 'Chick', 'Whale', 'Octopus', 'Ladybug', 'Butterfly']
                }
            },
            number: {
                name: '数字王国', icon: '🔢',
                items: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
                names: {
                    zh: ['一', '二', '三', '四', '五', '六', '七', '八', '九'],
                    en: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
                }
            }
        };
        this.difficulties = {
            4: { name: '入门', score: 10 },
            6: { name: '简单', score: 20 },
            9: { name: '困难', score: 50 }
        };
        this.state = {
            mode: null, size: null, baseScore: 0,
            puzzle: null, solution: null, userBoard: null,
            selectedCell: null, selectedValue: null,
            hintsUsed: 0, isComplete: false, history: [],
        };
        this.dragState = {
            isDragging: false, draggedValue: null, dragElement: null,
            sourceBtn: null, startX: 0, startY: 0,
            longPressTimer: null, hasMoved: false, preventClick: false,
        };
    }

    init() {
        this.bindEvents();
        this.initDefaults();
        this.loadSavedGame();
    }

    initDefaults() {
        if (localStorage.getItem('sudoku_voiceEnabled') === null) {
            this.lobby.storage.setVoiceEnabled(true);
            this.lobby.speech.setEnabled(true);
        }
        if (localStorage.getItem('sudoku_soundEnabled') === null) {
            this.lobby.storage.setSoundEnabled(true);
            this.lobby.sound.setEnabled(true);
        }
        if (!this.lobby.storage.getLastMode()) this.selectMode('number');
        if (!this.lobby.storage.getLastSize()) this.selectDifficulty(4, 10);
    }

    bindEvents() {
        // 数独配置页
        document.querySelectorAll('#sudoku-config-screen .mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectMode(btn.dataset.mode));
        });
        document.querySelectorAll('#sudoku-config-screen .diff-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectDifficulty(parseInt(btn.dataset.size), parseInt(btn.dataset.score)));
        });
        document.getElementById('sudoku-start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('sudoku-config-back').addEventListener('click', () => {
            this.lobby.showScreen('lobby-screen');
        });

        // 数独游戏页
        document.getElementById('back-btn').addEventListener('click', () => {
            this.lobby.showConfirm('确认返回', '返回后进度会保存，确定要返回吗？', () => {
                this.saveGame();
                this.lobby.showScreen('lobby-screen');
            });
        });
        document.getElementById('hint-btn').addEventListener('click', () => this.showHint());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('newgame-btn').addEventListener('click', () => {
            this.lobby.showConfirm('新开一局', '确定要开始新的一局吗？', () => this.startGame());
        });
        document.getElementById('help-btn-game').addEventListener('click', () => this.showTutorial());
    }

    selectMode(mode) {
        this.state.mode = mode;
        document.querySelectorAll('#sudoku-config-screen .mode-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.mode === mode);
        });
        this.checkStartReady();
        this.lobby.storage.setLastMode(mode);
    }

    selectDifficulty(size, score) {
        this.state.size = size;
        this.state.baseScore = score;
        document.querySelectorAll('#sudoku-config-screen .diff-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.size) === size);
        });
        this.checkStartReady();
        this.lobby.storage.setLastSize(size);
    }

    checkStartReady() {
        const ready = this.state.mode && this.state.size;
        document.getElementById('sudoku-start-btn').disabled = !ready;
    }

    startGame() {
        const { puzzle, solution } = this.engine.generatePuzzle(this.state.size);
        this.state.puzzle = puzzle;
        this.state.solution = solution;
        this.state.userBoard = puzzle.map(row => [...row]);
        this.state.selectedCell = null;
        this.state.selectedValue = null;
        this.state.hintsUsed = 0;
        this.state.score = this.state.baseScore;
        this.state.isComplete = false;
        this.state.history = [];
        this.renderBoard();
        this.renderInputPad();
        this.updateHeader();
        this.lobby.showScreen('game-screen');
        const shownModes = this.lobby.storage.getShownModes();
        if (!shownModes.includes(this.state.mode)) {
            setTimeout(() => this.showTutorial(), 500);
            this.lobby.storage.addShownMode(this.state.mode);
        }
    }

    renderBoard() {
        const board = document.getElementById('game-board');
        const size = this.state.size;
        const mode = this.modes[this.state.mode];
        board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        board.innerHTML = '';
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                const value = this.state.userBoard[r][c];
                const isFixed = this.state.puzzle[r][c] !== 0;
                if (value !== 0) {
                    cell.textContent = mode.items[value - 1];
                    cell.classList.add(isFixed ? 'fixed' : 'user-filled');
                } else {
                    cell.classList.add('empty');
                }
                const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
                const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
                if ((c + 1) % boxCols === 0 && c !== size - 1) cell.classList.add('border-right');
                if ((r + 1) % boxRows === 0 && r !== size - 1) cell.classList.add('border-bottom');
                if (this.state.puzzle[r][c] === 0 && this.state.selectedCell &&
                    this.state.selectedCell.row === r && this.state.selectedCell.col === c) {
                    cell.classList.add('selected');
                }
                cell.addEventListener('click', () => this.onCellClick(r, c));
                board.appendChild(cell);
            }
        }
        if (this.state.selectedCell) this.highlightRelated(this.state.selectedCell.row, this.state.selectedCell.col);
    }

    renderInputPad() {
        const pad = document.getElementById('input-pad');
        const size = this.state.size;
        const mode = this.modes[this.state.mode];
        pad.innerHTML = '';
        for (let i = 0; i < size; i++) {
            const btn = document.createElement('button');
            btn.className = 'input-btn';
            btn.textContent = mode.items[i];
            btn.dataset.value = i + 1;
            if (this.state.selectedValue === i + 1) btn.classList.add('selected');
            btn.addEventListener('click', (e) => {
                if (this.dragState.preventClick) { this.dragState.preventClick = false; return; }
                this.onInputClick(i + 1);
            });
            btn.addEventListener('touchstart', (e) => this.onInputTouchStart(e, i + 1), { passive: false });
            btn.addEventListener('touchmove', (e) => this.onInputTouchMove(e), { passive: false });
            btn.addEventListener('touchend', (e) => this.onInputTouchEnd(e), { passive: false });
            btn.addEventListener('touchcancel', () => this.onInputTouchCancel());
            btn.addEventListener('mousedown', (e) => this.onInputMouseDown(e, i + 1));
            pad.appendChild(btn);
        }
    }

    updateHeader() {
        const mode = this.modes[this.state.mode];
        const diff = this.difficulties[this.state.size];
        document.getElementById('mode-display').textContent = `${mode.icon} ${mode.name}`;
        document.getElementById('diff-display').textContent = `${this.state.size}×${this.state.size} ${diff.name}`;
    }

    onCellClick(row, col) {
        if (this.state.puzzle[row][col] !== 0) {
            this.speakCell(m => `${m.names.zh[this.state.puzzle[row][col] - 1]}`);
            return;
        }
        this.state.selectedCell = { row, col };
        if (this.state.selectedValue !== null) {
            this.state.selectedValue = null;
            this.renderInputPad();
        }
        this.renderBoard();
        this.highlightRelated(row, col);
    }

    onInputClick(value) {
        this.state.selectedValue = value;
        this.renderInputPad();
        if (this.state.selectedCell) {
            const { row, col } = this.state.selectedCell;
            if (this.state.puzzle[row][col] === 0) this.fillCell(row, col, value);
        }
    }

    highlightRelated(row, col) {
        document.querySelectorAll('.cell').forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            const isRelated = r === row || c === col;
            cell.classList.toggle('highlighted', isRelated && !(r === row && c === col));
        });
    }

    fillCell(row, col, value) {
        if (this.state.isComplete) return;
        const mode = this.modes[this.state.mode];
        const isCorrect = this.engine.checkMove(this.state.userBoard, this.state.solution, row, col, value);
        if (isCorrect) {
            this.state.history.push({ row, col, oldValue: this.state.userBoard[row][col], newValue: value });
            this.state.userBoard[row][col] = value;
            this.renderBoard();
            this.lobby.sound.playSuccess();
            const cells = document.querySelectorAll('.cell');
            cells[row * this.state.size + col]?.classList.add('success-pop');
            const itemName = mode.names.zh[value - 1];
            this.lobby.speech.speak(`对了！${itemName}`, 'zh-CN');
            this.lobby.speech.speak(mode.names.en[value - 1], 'en-US');
            if (this.engine.isComplete(this.state.userBoard)) setTimeout(() => this.onWin(), 500);
        } else {
            this.lobby.sound.playError();
            const cells = document.querySelectorAll('.cell');
            const cell = cells[row * this.state.size + col];
            cell.classList.add('error-shake');
            setTimeout(() => cell.classList.remove('error-shake'), 500);
            const itemName = mode.names.zh[value - 1];
            document.getElementById('error-message').textContent = `这里不能放${itemName}哦！再想一想吧！`;
            this.lobby.showOverlay('error-overlay');
            this.lobby.speech.speak(`不对，这里不能放${itemName}`, 'zh-CN');
            this.lobby.speech.speak('Try again!', 'en-US');
        }
        this.saveGame();
    }

    showHint() {
        if (this.state.isComplete) return;
        const emptyCells = [];
        for (let r = 0; r < this.state.size; r++) {
            for (let c = 0; c < this.state.size; c++) {
                if (this.state.userBoard[r][c] === 0) emptyCells.push({ row: r, col: c });
            }
        }
        if (emptyCells.length === 0) return;
        let target;
        if (this.state.selectedCell && this.state.userBoard[this.state.selectedCell.row][this.state.selectedCell.col] === 0) {
            target = this.state.selectedCell;
        } else {
            target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }
        const correctValue = this.state.solution[target.row][target.col];
        const mode = this.modes[this.state.mode];
        const itemName = mode.names.zh[correctValue - 1];
        const itemEn = mode.names.en[correctValue - 1];
        this.state.hintsUsed++;
        this.state.score = Math.max(0, this.state.baseScore - this.state.hintsUsed * 2);
        document.getElementById('hint-message').textContent = '这个格子应该放...';
        document.getElementById('hint-display').textContent = mode.items[correctValue - 1];
        this.lobby.showOverlay('hint-overlay');
        this.lobby.speech.speak(`这里应该放${itemName}`, 'zh-CN');
        this.lobby.speech.speak(itemEn, 'en-US');
        this.state.selectedCell = target;
        this.renderBoard();
        const cells = document.querySelectorAll('.cell');
        cells[target.row * this.state.size + target.col]?.classList.add('hint-target');
    }

    undo() {
        if (this.state.history.length === 0) return;
        const last = this.state.history.pop();
        this.state.userBoard[last.row][last.col] = last.oldValue;
        this.renderBoard();
        this.saveGame();
    }

    onWin() {
        this.state.isComplete = true;
        this.lobby.addScore(this.state.score);
        this.lobby.storage.clearSudoku();
        document.getElementById('win-message').textContent = '你完成啦！';
        document.getElementById('win-score').textContent = this.state.score;
        this.lobby.showOverlay('win-overlay');
        this.lobby.sound.playWin();
        this.lobby.speech.speak(`太棒了！你完成了！获得${this.state.score}分！`, 'zh-CN');
        this.lobby.speech.speak('Congratulations! You did it!', 'en-US');
        document.getElementById('win-close').onclick = () => {
            this.lobby.hideOverlay('win-overlay');
            this.lobby.showScreen('lobby-screen');
        };
    }

    showTutorial() {
        this.lobby.showOverlay('tutorial-overlay');
        this.lobby.speech.speak('每一行每一列都不能有重复的图案哦！', 'zh-CN');
        this.lobby.speech.speak('No repeating patterns in any row or column!', 'en-US');
    }

    speakCell(speakFn) {
        if (!this.state.mode) return;
        const mode = this.modes[this.state.mode];
        const text = speakFn(mode);
        if (text) this.lobby.speech.speak(text, 'zh-CN');
    }

    saveGame() {
        if (this.state.puzzle) {
            this.lobby.storage.saveSudoku({
                mode: this.state.mode, size: this.state.size,
                score: this.state.score, baseScore: this.state.baseScore,
                puzzle: this.state.puzzle, solution: this.state.solution,
                userBoard: this.state.userBoard, hintsUsed: this.state.hintsUsed,
                history: this.state.history,
            });
        }
    }

    loadSavedGame() {
        const saved = this.lobby.storage.getSudoku();
        const lastMode = this.lobby.storage.getLastMode();
        const lastSize = this.lobby.storage.getLastSize();
        if (lastMode) this.selectMode(lastMode);
        if (lastSize) {
            const diffBtn = document.querySelector(`#sudoku-config-screen .diff-btn[data-size="${lastSize}"]`);
            if (diffBtn) this.selectDifficulty(lastSize, parseInt(diffBtn.dataset.score));
        }
    }

    continueGame() {
        const saved = this.lobby.storage.getSudoku();
        if (saved && saved.puzzle) {
            Object.assign(this.state, saved);
            this.renderBoard();
            this.renderInputPad();
            this.updateHeader();
            this.lobby.showScreen('game-screen');
        }
    }

    // ========== 拖拽 ==========
    onInputTouchStart(e, value) {
        const touch = e.touches[0];
        this.dragState.startX = touch.clientX;
        this.dragState.startY = touch.clientY;
        this.dragState.draggedValue = value;
        this.dragState.hasMoved = false;
        this.dragState.preventClick = false;
        this.dragState.sourceBtn = e.currentTarget;
        this.dragState.longPressTimer = setTimeout(() => {
            if (!this.dragState.isDragging) this.startDrag(e, value);
        }, 180);
    }

    onInputTouchMove(e) {
        if (!this.dragState.draggedValue) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - this.dragState.startX);
        const dy = Math.abs(touch.clientY - this.dragState.startY);
        if (!this.dragState.isDragging && (dx > 8 || dy > 8)) {
            clearTimeout(this.dragState.longPressTimer);
            this.startDrag(e, this.dragState.draggedValue);
        }
        if (this.dragState.isDragging) {
            e.preventDefault();
            this.dragState.hasMoved = true;
            this.updateDragPosition(touch.clientX, touch.clientY);
            this.highlightHoverCell(touch.clientX, touch.clientY);
        }
    }

    onInputTouchEnd(e) {
        clearTimeout(this.dragState.longPressTimer);
        if (this.dragState.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            this.dragState.preventClick = true;
            this.endDrag(e.changedTouches[0]);
            this.resetDragState();
        } else {
            this.dragState.preventClick = true;
            if (!this.dragState.hasMoved && this.dragState.draggedValue) {
                this.onInputClick(this.dragState.draggedValue);
            }
            this.resetDragState();
        }
    }

    onInputTouchCancel() {
        clearTimeout(this.dragState.longPressTimer);
        if (this.dragState.isDragging) this.fadeOutDrag();
        this.resetDragState();
    }

    onInputMouseDown(e, value) {
        e.preventDefault();
        const point = { clientX: e.clientX, clientY: e.clientY };
        this.onInputTouchStart({ touches: [point], currentTarget: e.currentTarget }, value);
        clearTimeout(this.dragState.longPressTimer);
        this.startDrag({ touches: [point] }, value);
    }

    startDrag(e, value) {
        this.dragState.isDragging = true;
        this.state.selectedValue = value;
        const touch = e.touches[0];
        const mode = this.modes[this.state.mode];
        const el = document.createElement('div');
        el.className = 'drag-item';
        el.textContent = mode.items[value - 1];
        document.body.appendChild(el);
        this.dragState.dragElement = el;
        this.updateDragPosition(touch.clientX, touch.clientY);
        if (this.dragState.sourceBtn) this.dragState.sourceBtn.classList.add('dragging-source');
        this.renderInputPad();
    }

    updateDragPosition(x, y) {
        const el = this.dragState.dragElement;
        if (!el) return;
        el.style.left = `${x - el.offsetWidth / 2}px`;
        el.style.top = `${y - el.offsetHeight / 2}px`;
    }

    highlightHoverCell(x, y) {
        document.querySelectorAll('.cell.hover-target').forEach(c => c.classList.remove('hover-target'));
        document.querySelectorAll('.cell.hover-invalid').forEach(c => c.classList.remove('hover-invalid'));
        const elem = document.elementFromPoint(x, y);
        if (!elem) return;
        const cell = elem.closest('.cell');
        if (!cell) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        if (isNaN(row) || isNaN(col)) return;
        if (this.state.puzzle[row][col] === 0 && this.state.userBoard[row][col] === 0) {
            cell.classList.add('hover-target');
        } else {
            cell.classList.add('hover-invalid');
        }
    }

    endDrag(touch) {
        document.querySelectorAll('.cell.hover-target').forEach(c => c.classList.remove('hover-target'));
        document.querySelectorAll('.cell.hover-invalid').forEach(c => c.classList.remove('hover-invalid'));
        const x = touch.clientX;
        const y = touch.clientY;
        const elem = document.elementFromPoint(x, y);
        if (!elem) { this.fadeOutDrag(); return; }
        const cell = elem.closest('.cell');
        if (!cell) { this.fadeOutDrag(); return; }
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        if (isNaN(row) || isNaN(col)) { this.fadeOutDrag(); return; }
        if (this.state.puzzle[row][col] !== 0 || this.state.userBoard[row][col] !== 0) {
            this.fadeOutDrag();
            return;
        }
        const value = this.dragState.draggedValue;
        const isCorrect = this.engine.checkMove(this.state.userBoard, this.state.solution, row, col, value);
        if (isCorrect) {
            this.state.selectedCell = { row, col };
            this.fadeOutDrag();
            this.fillCell(row, col, value);
        } else {
            this.state.selectedCell = { row, col };
            this.renderBoard();
            const cells = document.querySelectorAll('.cell');
            const index = row * this.state.size + col;
            const targetCell = cells[index];
            if (targetCell) {
                targetCell.classList.add('error-shake');
                setTimeout(() => targetCell.classList.remove('error-shake'), 500);
            }
            this.lobby.sound.playError();
            const mode = this.modes[this.state.mode];
            const itemName = mode.names.zh[value - 1];
            this.lobby.speech.speak(`不对，这里不能放${itemName}`, 'zh-CN');
            this.lobby.speech.speak('Try again!', 'en-US');
            this.fadeOutDrag();
            setTimeout(() => {
                document.getElementById('error-message').textContent = `这里不能放${itemName}哦！再想一想吧！`;
                this.lobby.showOverlay('error-overlay');
            }, 300);
        }
    }

    fadeOutDrag() {
        if (!this.dragState.dragElement) { this.removeDragElement(); return; }
        const el = this.dragState.dragElement;
        el.classList.add('dragging-fadeout');
        setTimeout(() => this.removeDragElement(), 500);
    }

    removeDragElement() {
        if (this.dragState.dragElement) {
            this.dragState.dragElement.remove();
            this.dragState.dragElement = null;
        }
        if (this.dragState.sourceBtn) {
            this.dragState.sourceBtn.classList.remove('dragging-source');
            this.dragState.sourceBtn = null;
        }
    }

    resetDragState() {
        this.dragState.isDragging = false;
        this.dragState.draggedValue = null;
        this.dragState.startX = 0;
        this.dragState.startY = 0;
        this.dragState.longPressTimer = null;
        this.dragState.hasMoved = false;
    }
}

// ========== 数学游戏 ==========
class MathGame {
    constructor(lobby) {
        this.lobby = lobby;
        this.state = {
            op: null, range: null, baseScore: 0,
            num1: 0, num2: 0, answer: 0, operator: '+',
            userAnswer: '', streak: 0, correctCount: 0, totalCount: 0,
            score: 0, hintsUsed: 0,
        };
    }

    init() {
        this.bindEvents();
        this.initDefaults();
    }

    initDefaults() {
        if (!this.lobby.storage.getLastOp()) this.selectOp('add');
        if (!this.lobby.storage.getLastRange()) this.selectRange(10, 5);
    }

    bindEvents() {
        document.querySelectorAll('#math-config-screen .mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectOp(btn.dataset.op));
        });
        document.querySelectorAll('#math-config-screen .diff-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectRange(parseInt(btn.dataset.range), parseInt(btn.dataset.score)));
        });
        document.getElementById('math-start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('math-config-back').addEventListener('click', () => {
            this.lobby.showScreen('lobby-screen');
        });
        document.getElementById('math-back-btn').addEventListener('click', () => {
            this.lobby.showConfirm('确认返回', '确定要返回大厅吗？', () => {
                this.saveGame();
                this.lobby.showScreen('lobby-screen');
            });
        });
        document.getElementById('math-hint-btn').addEventListener('click', () => this.showHint());
        document.getElementById('math-skip-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('math-help-btn').addEventListener('click', () => this.showTutorial());
        document.getElementById('error-close').addEventListener('click', () => {
            this.lobby.hideOverlay('error-overlay');
            this.nextQuestion();
        });
    }

    selectOp(op) {
        this.state.op = op;
        document.querySelectorAll('#math-config-screen .mode-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.op === op);
        });
        this.checkStartReady();
        this.lobby.storage.setLastOp(op);
    }

    selectRange(range, score) {
        this.state.range = range;
        this.state.baseScore = score;
        document.querySelectorAll('#math-config-screen .diff-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.range) === range);
        });
        this.checkStartReady();
        this.lobby.storage.setLastRange(range);
    }

    checkStartReady() {
        const ready = this.state.op && this.state.range;
        document.getElementById('math-start-btn').disabled = !ready;
    }

    startGame() {
        this.state.streak = 0;
        this.state.correctCount = 0;
        this.state.totalCount = 0;
        this.state.score = 0;
        this.state.hintsUsed = 0;
        this.nextQuestion();
        this.updateHeader();
        this.lobby.showScreen('math-game-screen');
        const shown = localStorage.getItem('math_tutorialShown');
        if (!shown) {
            setTimeout(() => this.showTutorial(), 500);
            localStorage.setItem('math_tutorialShown', 'true');
        }
    }

    generateQuestion() {
        const range = this.state.range;
        const op = this.state.op;
        let num1, num2, answer, operator;

        if (op === 'add' || (op === 'mix' && Math.random() < 0.5)) {
            operator = '+';
            answer = Math.floor(Math.random() * (range + 1));
            num1 = Math.floor(Math.random() * (answer + 1));
            num2 = answer - num1;
            if (num2 < 0) { num2 = 0; num1 = answer; }
        } else {
            operator = '-';
            num1 = Math.floor(Math.random() * (range + 1));
            num2 = Math.floor(Math.random() * (num1 + 1));
            answer = num1 - num2;
        }

        // 避免太简单的题（如 0+0, 1+0）
        if (num1 === 0 && num2 === 0) return this.generateQuestion();

        this.state.num1 = num1;
        this.state.num2 = num2;
        this.state.answer = answer;
        this.state.operator = operator;
        this.state.userAnswer = '';
    }

    renderQuestion() {
        document.getElementById('math-num1').textContent = this.state.num1;
        document.getElementById('math-op').textContent = this.state.operator;
        document.getElementById('math-num2').textContent = this.state.num2;
        const ansEl = document.getElementById('math-answer');
        ansEl.textContent = this.state.userAnswer || '?';
        ansEl.className = 'math-answer';
        document.getElementById('math-correct').textContent = this.state.correctCount;
        document.getElementById('math-streak').textContent = this.state.streak;
        this.renderNumpad();
    }

    renderNumpad() {
        const pad = document.getElementById('math-numpad');
        pad.innerHTML = '';
        const maxDigit = this.state.range >= 100 ? 9 : (this.state.range >= 20 ? 9 : this.state.range);
        for (let i = 0; i <= maxDigit; i++) {
            const btn = document.createElement('button');
            btn.className = 'math-num-btn';
            btn.textContent = i;
            btn.addEventListener('click', () => this.onNumClick(i));
            pad.appendChild(btn);
        }
        // 清除按钮
        const clearBtn = document.createElement('button');
        clearBtn.className = 'math-num-btn';
        clearBtn.textContent = '⌫';
        clearBtn.style.fontSize = '1.2rem';
        clearBtn.addEventListener('click', () => this.onClearClick());
        pad.appendChild(clearBtn);
    }

    onNumClick(num) {
        if (this.state.userAnswer.length >= 3) return;
        this.state.userAnswer += num.toString();
        this.renderQuestion();
        this.checkAnswer();
    }

    onClearClick() {
        this.state.userAnswer = this.state.userAnswer.slice(0, -1);
        this.renderQuestion();
    }

    checkAnswer() {
        const userVal = parseInt(this.state.userAnswer);
        if (isNaN(userVal)) return;
        if (userVal === this.state.answer) {
            // 答对
            this.state.correctCount++;
            this.state.streak++;
            this.state.totalCount++;
            const bonus = Math.min(this.state.streak, 5);
            const points = this.state.baseScore + bonus;
            this.state.score += points;
            this.lobby.addScore(points);
            this.lobby.sound.playSuccess();

            const ansEl = document.getElementById('math-answer');
            ansEl.classList.add('filled');

            const opText = this.state.operator === '+' ? '加' : '减';
            this.lobby.speech.speak(`对了！${this.state.num1}${opText}${this.state.num2}等于${this.state.answer}`, 'zh-CN');
            if (this.state.streak >= 3) {
                this.lobby.speech.speak(`太棒了！连续答对${this.state.streak}题！`, 'zh-CN');
            }

            setTimeout(() => this.nextQuestion(), 800);
        } else if (this.state.userAnswer.length >= this.state.answer.toString().length) {
            // 答错（位数够了但答案不对）
            this.state.streak = 0;
            this.state.totalCount++;
            this.lobby.sound.playError();

            const ansEl = document.getElementById('math-answer');
            ansEl.classList.add('error');
            setTimeout(() => ansEl.classList.remove('error'), 500);

            const opText = this.state.operator === '+' ? '加' : '减';
            document.getElementById('error-message').textContent =
                `不对哦！${this.state.num1} ${this.state.operator} ${this.state.num2} = ${this.state.answer}，再试一次吧！`;
            this.lobby.showOverlay('error-overlay');
            this.lobby.speech.speak(`不对，${this.state.num1}${opText}${this.state.num2}应该等于${this.state.answer}`, 'zh-CN');
            this.lobby.speech.speak('Try again!', 'en-US');

            // 重置答案输入
            this.state.userAnswer = '';
            setTimeout(() => this.renderQuestion(), 1000);
        }
    }

    nextQuestion() {
        this.generateQuestion();
        this.renderQuestion();
        this.saveGame();
    }

    showHint() {
        if (this.state.hintsUsed >= 3) {
            this.lobby.speech.speak('提示次数用完了，再想一想吧！', 'zh-CN');
            return;
        }
        this.state.hintsUsed++;
        this.state.score = Math.max(0, this.state.score - 1);
        document.getElementById('hint-message').textContent = '答案是...';
        document.getElementById('hint-display').textContent = this.state.answer;
        this.lobby.showOverlay('hint-overlay');
        const opText = this.state.operator === '+' ? '加' : '减';
        this.lobby.speech.speak(`答案是${this.state.answer}，${this.state.num1}${opText}${this.state.num2}等于${this.state.answer}`, 'zh-CN');
    }

    showTutorial() {
        const content = document.getElementById('tutorial-content');
        content.innerHTML = `
            <div class="tutorial-step">
                <span class="step-num">1</span>
                <p>看题目，算出答案！</p>
            </div>
            <div class="tutorial-step">
                <span class="step-num">2</span>
                <p>点击下方数字键盘输入答案</p>
            </div>
            <div class="tutorial-step">
                <span class="step-num">3</span>
                <p>答对了会自动进入下一题！</p>
            </div>
            <div class="tutorial-step">
                <span class="step-num">4</span>
                <p>连续答对有额外加分哦！</p>
            </div>
        `;
        this.lobby.showOverlay('tutorial-overlay');
        this.lobby.speech.speak('看题目算出答案，点击下方数字就可以啦！', 'zh-CN');
        this.lobby.speech.speak('Look at the question and tap the answer!', 'en-US');
    }

    updateHeader() {
        const opMap = { add: '➕ 加法', sub: '➖ 减法', mix: '± 加减混合' };
        document.getElementById('math-mode-display').textContent = opMap[this.state.op] || '➕ 数学';
        document.getElementById('math-diff-display').textContent = `${this.state.range}以内`;
        document.getElementById('math-score-display').textContent = this.lobby.storage.getTotalScore();
    }

    saveGame() {
        this.lobby.storage.saveMath({
            op: this.state.op, range: this.state.range,
            baseScore: this.state.baseScore, score: this.state.score,
            streak: this.state.streak, correctCount: this.state.correctCount,
            totalCount: this.state.totalCount, hintsUsed: this.state.hintsUsed,
        });
    }
}

// ========== 大厅主控制器 ==========
class GameLobby {
    constructor() {
        this.storage = new GameStorage();
        this.speech = new SpeechManager();
        this.sound = new SoundManager();
        this.sudokuGame = new SudokuGame(this);
        this.mathGame = new MathGame(this);
    }

    init() {
        this.bindLobbyEvents();
        this.updateLobbyScore();
        this.sudokuGame.init();
        this.mathGame.init();
    }

    bindLobbyEvents() {
        // 大厅卡片点击
        document.querySelectorAll('.game-card:not(.coming-soon)').forEach(card => {
            card.addEventListener('click', () => {
                const game = card.dataset.game;
                if (game === 'sudoku') {
                    this.showScreen('sudoku-config-screen');
                    this.sudokuGame.checkStartReady();
                } else if (game === 'math') {
                    this.showScreen('math-config-screen');
                    this.mathGame.checkStartReady();
                }
            });
        });

        // 设置按钮
        document.getElementById('lobby-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('settings-close').addEventListener('click', () => this.hideOverlay('settings-overlay'));

        // 设置开关
        document.getElementById('voice-toggle').addEventListener('click', (e) => {
            const btn = e.target;
            const enabled = !btn.classList.contains('active');
            btn.classList.toggle('active');
            btn.textContent = enabled ? '开' : '关';
            this.speech.setEnabled(enabled);
            this.storage.setVoiceEnabled(enabled);
        });
        document.getElementById('sound-toggle').addEventListener('click', (e) => {
            const btn = e.target;
            const enabled = !btn.classList.contains('active');
            btn.classList.toggle('active');
            btn.textContent = enabled ? '开' : '关';
            this.sound.setEnabled(enabled);
            this.storage.setSoundEnabled(enabled);
        });

        // 通用弹窗关闭
        document.getElementById('tutorial-close').addEventListener('click', () => this.hideOverlay('tutorial-overlay'));
        document.getElementById('hint-close').addEventListener('click', () => this.hideOverlay('hint-overlay'));
        document.getElementById('error-close').addEventListener('click', () => this.hideOverlay('error-overlay'));

        // 确认弹窗
        document.getElementById('confirm-yes').addEventListener('click', () => {
            if (this.confirmCallback) this.confirmCallback();
            this.hideOverlay('confirm-overlay');
        });
        document.getElementById('confirm-no').addEventListener('click', () => {
            this.hideOverlay('confirm-overlay');
        });

        // 点击遮罩关闭
        document.querySelectorAll('.overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    if (overlay.id === 'error-overlay' || overlay.id === 'hint-overlay') {
                        overlay.classList.remove('active');
                    }
                }
            });
        });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        if (screenId === 'lobby-screen') {
            this.updateLobbyScore();
            this.updateLobbyProgress();
        }
    }

    showOverlay(overlayId) {
        document.getElementById(overlayId).classList.add('active');
    }

    hideOverlay(overlayId) {
        document.getElementById(overlayId).classList.remove('active');
    }

    showConfirm(title, message, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        this.confirmCallback = callback;
        this.showOverlay('confirm-overlay');
    }

    showSettings() {
        const voiceEnabled = this.storage.getVoiceEnabled();
        const soundEnabled = this.storage.getSoundEnabled();
        const voiceBtn = document.getElementById('voice-toggle');
        voiceBtn.classList.toggle('active', voiceEnabled);
        voiceBtn.textContent = voiceEnabled ? '开' : '关';
        const soundBtn = document.getElementById('sound-toggle');
        soundBtn.classList.toggle('active', soundEnabled);
        soundBtn.textContent = soundEnabled ? '开' : '关';
        this.showOverlay('settings-overlay');
    }

    addScore(points) {
        const current = this.storage.getTotalScore();
        this.storage.setTotalScore(current + points);
        this.updateLobbyScore();
    }

    updateLobbyScore() {
        const score = this.storage.getTotalScore();
        document.getElementById('lobby-score').textContent = score;
        document.getElementById('score-display').textContent = score;
        document.getElementById('math-score-display').textContent = score;
    }

    updateLobbyProgress() {
        const sudoku = this.storage.getSudoku();
        const math = this.storage.getMath();
        const sudokuProgress = document.getElementById('sudoku-progress');
        const mathProgress = document.getElementById('math-progress');
        if (sudoku && sudoku.puzzle) {
            const diff = { 4: '入门', 6: '简单', 9: '困难' };
            sudokuProgress.textContent = `🟢 上次: ${diff[sudoku.size] || ''} ${sudoku.size}×${sudoku.size}`;
        } else {
            sudokuProgress.textContent = '🟢 点击开始';
        }
        if (math && math.totalCount > 0) {
            mathProgress.textContent = `🟢 上次: 答对${math.correctCount}题`;
        } else {
            mathProgress.textContent = '🟢 点击开始';
        }
    }
}

// ========== 启动 ==========
document.addEventListener('DOMContentLoaded', () => {
    window.lobby = new GameLobby();
    window.lobby.init();
});
