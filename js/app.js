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

    // 拼图存储
    savePuzzle(state) { localStorage.setItem('puzzle_savedGame', JSON.stringify(state)); }
    getPuzzle() { try { return JSON.parse(localStorage.getItem('puzzle_savedGame') || 'null'); } catch { return null; } }
    clearPuzzle() { localStorage.removeItem('puzzle_savedGame'); }
    setPuzzleLastPatternIndex(i) { localStorage.setItem('puzzle_lastPatternIndex', i.toString()); }
    getPuzzleLastPatternIndex() { const s = localStorage.getItem('puzzle_lastPatternIndex'); return s ? parseInt(s) : null; }
    setPuzzleLastSize(s) { localStorage.setItem('puzzle_lastSize', s.toString()); }
    getPuzzleLastSize() { const s = localStorage.getItem('puzzle_lastSize'); return s ? parseInt(s) : null; }
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

    onInputMouseMove(e) {
        if (!this.dragState.isDragging) return;
        e.preventDefault();
        const point = { clientX: e.clientX, clientY: e.clientY };
        this.onInputTouchMove({ touches: [point], preventDefault: () => {} });
    }

    onInputMouseUp(e) {
        if (!this.dragState.draggedValue) return;
        e.preventDefault();
        const point = { clientX: e.clientX, clientY: e.clientY };
        this.onInputTouchEnd({ changedTouches: [point], preventDefault: () => {}, stopPropagation: () => {} });
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
        this.hideComplete();
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
        this.puzzleGame = new PuzzleGame(this);
    }

    init() {
        this.bindLobbyEvents();
        this.updateLobbyScore();
        this.sudokuGame.init();
        this.mathGame.init();
        this.puzzleGame.init();
    }

    bindLobbyEvents() {
        // 全局鼠标拖拽跟踪（桌面端）
        document.addEventListener('mousemove', (e) => {
            this.sudokuGame.onInputMouseMove(e);
            this.puzzleGame.onPieceMouseMove(e);
        });
        document.addEventListener('mouseup', (e) => {
            this.sudokuGame.onInputMouseUp(e);
            this.puzzleGame.onPieceMouseUp(e);
        });

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
                } else if (game === 'puzzle') {
                    this.showScreen('puzzle-config-screen');
                    this.puzzleGame.checkStartReady();
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
        const puzzle = this.storage.getPuzzle ? this.storage.getPuzzle() : null;
        const sudokuProgress = document.getElementById('sudoku-progress');
        const mathProgress = document.getElementById('math-progress');
        const puzzleProgress = document.getElementById('puzzle-progress');
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
        if (puzzle && puzzle.pieces && puzzle.pieces.length > 0) {
            const theme = puzzle.theme || '拼图';
            puzzleProgress.textContent = `🟢 上次: ${theme}`;
        } else {
            puzzleProgress.textContent = '🟢 点击开始';
        }
    }
}

// ========== 启动 ==========
document.addEventListener('DOMContentLoaded', () => {
    window.lobby = new GameLobby();
    window.lobby.init();
});

// ========== 拼图游戏 ==========
class PuzzleGame {
    constructor(lobby) {
        this.lobby = lobby;
        this.state = {
            theme: null, size: null, baseScore: 0,
            pieces: [], selectedPiece: null, showNumbers: true,
            score: 0, isComplete: false,
        };
        this.dragState = {
            isDragging: false, dragElement: null, sourcePiece: null,
            startX: 0, startY: 0, longPressTimer: null,
            hasMoved: false, preventClick: false,
        };
        this.patterns = [
            { id: 0, name: '彩虹条纹', type: 'stripes', dir: 'diagonal', colors: ['#FF0000','#FF7F00','#FFFF00','#00FF00','#0000FF','#4B0082','#9400D3'] },
            { id: 1, name: '蓝天白云', type: 'gradient', bg: ['#87CEEB','#E0F7FA'], elements: 'clouds' },
            { id: 2, name: '小猫', type: 'custom', shape: 'cat' },
            { id: 3, name: '星空', type: 'gradient', bg: '#0D1B2A', elements: 'stars2' },
            { id: 4, name: '小鸟', type: 'custom', shape: 'bird' },
            { id: 5, name: '小狗', type: 'custom', shape: 'dog' },
            { id: 6, name: '小房子', type: 'custom', shape: 'house' },
            { id: 7, name: '螺旋迷宫', type: 'radial', style: 'spiral', colors: ['#6C5CE7','#A29BFE'] },
            { id: 8, name: '锯齿山脉', type: 'waves', style: 'zigzag', colors: ['#228B22','#8B4513','#87CEEB'] },
            { id: 9, name: '放射光芒', type: 'radial', style: 'rays', colors: ['#FFD700','#FF8C00'] },
            { id: 10, name: '小雨伞', type: 'custom', shape: 'umbrella' },
            { id: 11, name: '礼物盒', type: 'custom', shape: 'gift' },
            { id: 12, name: '小蜡烛', type: 'custom', shape: 'candle' },
            { id: 13, name: '小雪人', type: 'custom', shape: 'snowman' },
            { id: 14, name: '苹果树', type: 'custom', shape: 'appletree' },
            { id: 15, name: '西瓜切片', type: 'custom', shape: 'watermelon' },
            { id: 16, name: '橙子切片', type: 'custom', shape: 'orange' },
            { id: 17, name: '柠檬切片', type: 'custom', shape: 'lemon' },
            { id: 18, name: '大草莓', type: 'custom', shape: 'strawberry' },
            { id: 19, name: '小鱼', type: 'custom', shape: 'fish' },
            { id: 20, name: '蝴蝶', type: 'custom', shape: 'butterfly' },
            { id: 21, name: '金鱼', type: 'custom', shape: 'goldfish' },
            { id: 22, name: '蜜蜂', type: 'custom', shape: 'bee' },
            { id: 23, name: '城堡', type: 'custom', shape: 'castle' },
            { id: 24, name: '斑马', type: 'custom', shape: 'zebra' },
            { id: 25, name: '豹子', type: 'custom', shape: 'leopard' },
            { id: 26, name: '奶牛', type: 'custom', shape: 'cow' },
            { id: 27, name: '孔雀', type: 'custom', shape: 'peacock' },
            { id: 28, name: '彩虹漩涡', type: 'radial', style: 'swirl', colors: ['#FF0000','#FF7F00','#FFFF00','#00FF00','#0000FF','#4B0082','#9400D3'] },
            { id: 29, name: '紫色梦境', type: 'gradient', bg: ['#E6E6FA','#DDA0DD'], elements: 'stars' },
        ];
        this.currentPatternIndex = 0;
    }

    init() {
        this.bindEvents();
        this.initDefaults();
    }

    initDefaults() {
        const savedIndex = this.lobby.storage.getPuzzleLastPatternIndex();
        if (savedIndex === null) {
            this.currentPatternIndex = Math.floor(Math.random() * this.patterns.length);
        } else {
            this.currentPatternIndex = parseInt(savedIndex);
        }
        if (!this.lobby.storage.getPuzzleLastSize()) this.selectSize(3, 20);
        this.renderPatternPreview();
    }

    bindEvents() {
        document.getElementById('pattern-prev').addEventListener('click', () => this.prevPattern());
        document.getElementById('pattern-next').addEventListener('click', () => this.nextPattern());
        document.getElementById('pattern-random').addEventListener('click', () => this.randomPattern());
        document.querySelectorAll('#puzzle-config-screen .diff-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectSize(parseInt(btn.dataset.size), parseInt(btn.dataset.score)));
        });
        document.getElementById('puzzle-start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('puzzle-config-back').addEventListener('click', () => {
            this.lobby.showScreen('lobby-screen');
        });
        document.getElementById('puzzle-back-btn').addEventListener('click', () => {
            this.lobby.showConfirm('确认返回', '确定要返回大厅吗？', () => {
                this.lobby.showScreen('lobby-screen');
            });
        });
        document.getElementById('puzzle-newgame-btn').addEventListener('click', () => {
            this.lobby.showConfirm('新开一局', '确定要开始新拼图吗？', () => this.startGame());
        });
        document.getElementById('puzzle-help-btn').addEventListener('click', () => this.showTutorial());
        document.getElementById('puzzle-replay-btn').addEventListener('click', () => {
            this.hideComplete();
            this.lobby.showScreen('puzzle-config-screen');
            this.checkStartReady();
        });
        document.getElementById('puzzle-home-btn').addEventListener('click', () => {
            this.hideComplete();
            this.lobby.showScreen('lobby-screen');
        });
        document.getElementById('puzzle-number-toggle').addEventListener('change', (e) => {
            this.state.showNumbers = e.target.checked;
            this.renderBoard();
        });
    }

    selectPattern(index) {
        this.currentPatternIndex = ((index % this.patterns.length) + this.patterns.length) % this.patterns.length;
        this.renderPatternPreview();
        this.checkStartReady();
        this.lobby.storage.setPuzzleLastPatternIndex(this.currentPatternIndex);
    }

    prevPattern() {
        this.selectPattern(this.currentPatternIndex - 1);
    }

    nextPattern() {
        this.selectPattern(this.currentPatternIndex + 1);
    }

    randomPattern() {
        this.selectPattern(Math.floor(Math.random() * this.patterns.length));
    }

    renderPatternPreview() {
        const pattern = this.patterns[this.currentPatternIndex];
        const preview = document.getElementById('pattern-preview');
        const nameEl = document.getElementById('pattern-name');
        const numEl = document.getElementById('pattern-number');
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        this.drawPattern(ctx, 300, 300, pattern);
        preview.style.backgroundImage = `url(${canvas.toDataURL()})`;
        nameEl.textContent = pattern.name;
        numEl.textContent = `图案 #${pattern.id + 1} / ${this.patterns.length}`;
    }

    selectSize(size, score) {
        this.state.size = size;
        this.state.baseScore = score;
        document.querySelectorAll('#puzzle-config-screen .diff-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.size) === size);
        });
        this.checkStartReady();
        this.lobby.storage.setPuzzleLastSize(size);
    }

    checkStartReady() {
        const ready = this.currentPatternIndex !== null && this.state.size;
        document.getElementById('puzzle-start-btn').disabled = !ready;
    }

    startGame() {
        this.hideComplete();
        this.state.pieces = this.generatePieces(this.currentPatternIndex, this.state.size);
        this.state.selectedPiece = null;
        this.state.score = 0;
        this.state.isComplete = false;
        this.renderPreview();
        this.renderBoard();
        this.updateHeader();
        this.lobby.showScreen('puzzle-game-screen');
        const shown = localStorage.getItem('puzzle_tutorialShown');
        if (!shown) {
            setTimeout(() => this.showTutorial(), 500);
            localStorage.setItem('puzzle_tutorialShown', 'true');
        }
    }

    generatePieces(patternIndex, size) {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        this.drawPattern(ctx, 400, 400, this.patterns[patternIndex]);

        const pieceSize = 400 / size;
        const pieces = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const pCanvas = document.createElement('canvas');
                pCanvas.width = pieceSize;
                pCanvas.height = pieceSize;
                const pCtx = pCanvas.getContext('2d');
                pCtx.drawImage(canvas, c * pieceSize, r * pieceSize, pieceSize, pieceSize, 0, 0, pieceSize, pieceSize);
                pieces.push({
                    correctRow: r,
                    correctCol: c,
                    correctIndex: r * size + c,
                    currentIndex: pieces.length,
                    image: pCanvas.toDataURL(),
                    locked: false,
                });
            }
        }

        // 打乱，但要确保不是已经完全排好的
        do {
            for (let i = pieces.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
            }
        } while (this.isFullyCorrect(pieces));

        pieces.forEach((p, i) => { p.currentIndex = i; });
        return pieces;
    }

    isFullyCorrect(pieces) {
        return pieces.every((p, i) => p.correctIndex === i);
    }

    isPieceCorrect(piece, index) {
        return piece.correctIndex === index;
    }

    renderPreview() {
        const preview = document.getElementById('puzzle-preview');
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        this.drawPattern(ctx, 400, 400, this.patterns[this.currentPatternIndex]);
        preview.style.backgroundImage = `url(${canvas.toDataURL()})`;
    }

    renderBoard() {
        const board = document.getElementById('puzzle-board');
        const size = this.state.size;
        board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        board.innerHTML = '';

        this.state.pieces.forEach((piece, index) => {
            const div = document.createElement('div');
            div.className = 'puzzle-piece';
            div.style.backgroundImage = `url(${piece.image})`;
            div.dataset.index = index;

            if (piece.locked) {
                div.classList.add('locked');
            } else if (this.state.selectedPiece === index) {
                div.classList.add('selected');
            }

            // 数字提示
            if (this.state.showNumbers) {
                const num = document.createElement('span');
                num.className = 'puzzle-piece-number';
                num.textContent = piece.correctIndex + 1;
                div.appendChild(num);
            }

            // 事件
            div.addEventListener('click', (e) => {
                if (this.dragState.preventClick) { this.dragState.preventClick = false; return; }
                this.onPieceClick(index);
            });

            if (!piece.locked) {
                div.addEventListener('touchstart', (e) => this.onPieceTouchStart(e, index), { passive: false });
                div.addEventListener('touchmove', (e) => this.onPieceTouchMove(e), { passive: false });
                div.addEventListener('touchend', (e) => this.onPieceTouchEnd(e), { passive: false });
                div.addEventListener('touchcancel', () => this.onPieceTouchCancel());
                div.addEventListener('mousedown', (e) => this.onPieceMouseDown(e, index));
            }

            board.appendChild(div);
        });
    }

    onPieceClick(index) {
        const piece = this.state.pieces[index];
        if (piece.locked) return;

        if (this.state.selectedPiece === null) {
            this.state.selectedPiece = index;
            this.renderBoard();
        } else if (this.state.selectedPiece === index) {
            this.state.selectedPiece = null;
            this.renderBoard();
        } else {
            this.swapPieces(this.state.selectedPiece, index);
            this.state.selectedPiece = null;
            this.checkCompletion();
            this.renderBoard();
        }
    }

    swapPieces(idx1, idx2) {
        const p1 = this.state.pieces[idx1];
        const p2 = this.state.pieces[idx2];
        [this.state.pieces[idx1], this.state.pieces[idx2]] = [p2, p1];
        this.state.pieces[idx1].currentIndex = idx1;
        this.state.pieces[idx2].currentIndex = idx2;
    }

    checkCompletion() {
        let newLockCount = 0;
        this.state.pieces.forEach((piece, index) => {
            if (!piece.locked && this.isPieceCorrect(piece, index)) {
                piece.locked = true;
                newLockCount++;
            }
        });

        if (newLockCount > 0) {
            this.lobby.sound.playSuccess();
            const pattern = this.patterns[this.currentPatternIndex];
            this.lobby.speech.speak(`拼对啦！${pattern.name}越来越完整了！`, 'zh-CN');
        }

        if (this.isFullyCorrect(this.state.pieces)) {
            this.onWin();
        }
    }

    onWin() {
        this.state.isComplete = true;
        this.state.score = this.state.baseScore;
        this.lobby.addScore(this.state.score);
        this.lobby.sound.playWin();
        const pattern = this.patterns[this.currentPatternIndex];
        this.lobby.speech.speak(`太棒了！${pattern.name}拼图完成啦！获得${this.state.score}分！`, 'zh-CN');
        this.lobby.speech.speak('Congratulations! You completed the puzzle!', 'en-US');

        // 显示完成界面：大图展示
        const completeEl = document.getElementById('puzzle-complete');
        const completeImage = document.getElementById('puzzle-complete-image');
        const board = document.getElementById('puzzle-board');
        const controls = document.getElementById('puzzle-controls');
        const preview = document.querySelector('.puzzle-preview-wrapper');

        // 隐藏游戏元素
        board.style.display = 'none';
        controls.style.display = 'none';
        preview.style.display = 'none';

        // 显示完成大图（使用原图 canvas）
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        this.drawPattern(ctx, 400, 400, pattern);
        completeImage.style.backgroundImage = `url(${canvas.toDataURL()})`;

        // 先隐藏按钮
        document.querySelector('.puzzle-complete-buttons').style.display = 'none';
        completeEl.classList.add('active');

        // 3秒后显示按钮
        setTimeout(() => {
            document.querySelector('.puzzle-complete-buttons').style.display = 'flex';
        }, 3000);
    }

    hideComplete() {
        const completeEl = document.getElementById('puzzle-complete');
        const board = document.getElementById('puzzle-board');
        const controls = document.getElementById('puzzle-controls');
        const preview = document.querySelector('.puzzle-preview-wrapper');
        completeEl.classList.remove('active');
        board.style.display = 'grid';
        controls.style.display = 'flex';
        preview.style.display = 'flex';
    }

    updateHeader() {
        const pattern = this.patterns[this.currentPatternIndex];
        const diffMap = { 2: '入门', 3: '简单', 4: '中等', 5: '困难' };
        document.getElementById('puzzle-theme-display').textContent = `🎨 ${pattern.name}`;
        document.getElementById('puzzle-diff-display').textContent = `${this.state.size}×${this.state.size} ${diffMap[this.state.size]}`;
        document.getElementById('puzzle-score-display').textContent = this.lobby.storage.getTotalScore();
    }

    showTutorial() {
        const content = document.getElementById('tutorial-content');
        content.innerHTML = `
            <div class="tutorial-step">
                <span class="step-num">1</span>
                <p>看右上角的原图，记住图案的样子！</p>
            </div>
            <div class="tutorial-step">
                <span class="step-num">2</span>
                <p>点击两个拼图块，它们会交换位置</p>
            </div>
            <div class="tutorial-step">
                <span class="step-num">3</span>
                <p>把每个块都放到正确的地方</p>
            </div>
            <div class="tutorial-step">
                <span class="step-num">4</span>
                <p>拼对的块会锁定变绿色，不能再移动</p>
            </div>
        `;
        this.lobby.showOverlay('tutorial-overlay');
        this.lobby.speech.speak('看右上角的原图，点击两个拼图块交换位置，把图案拼完整！', 'zh-CN');
        this.lobby.speech.speak('Look at the picture and swap the pieces to complete it!', 'en-US');
    }

    // ========== 拖拽交换 ==========
    onPieceTouchStart(e, index) {
        const piece = this.state.pieces[index];
        if (piece.locked) return;
        const touch = e.touches[0];
        this.dragState.startX = touch.clientX;
        this.dragState.startY = touch.clientY;
        this.dragState.sourcePiece = index;
        this.dragState.hasMoved = false;
        this.dragState.preventClick = false;
        this.dragState.longPressTimer = setTimeout(() => {
            if (!this.dragState.isDragging) this.startPieceDrag(e, index);
        }, 200);
    }

    onPieceTouchMove(e) {
        if (!this.dragState.sourcePiece !== null && this.dragState.sourcePiece === undefined) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - this.dragState.startX);
        const dy = Math.abs(touch.clientY - this.dragState.startY);
        if (!this.dragState.isDragging && (dx > 8 || dy > 8)) {
            clearTimeout(this.dragState.longPressTimer);
            this.startPieceDrag(e, this.dragState.sourcePiece);
        }
        if (this.dragState.isDragging) {
            e.preventDefault();
            this.dragState.hasMoved = true;
            this.updateDragPosition(touch.clientX, touch.clientY);
            this.highlightHoverPiece(touch.clientX, touch.clientY);
        }
    }

    onPieceTouchEnd(e) {
        clearTimeout(this.dragState.longPressTimer);
        if (this.dragState.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            this.dragState.preventClick = true;
            this.endPieceDrag(e.changedTouches[0]);
            this.resetDragState();
        } else {
            this.dragState.preventClick = true;
            this.resetDragState();
        }
    }

    onPieceTouchCancel() {
        clearTimeout(this.dragState.longPressTimer);
        if (this.dragState.isDragging) this.fadeOutDrag();
        this.resetDragState();
    }

    onPieceMouseDown(e, index) {
        e.preventDefault();
        const piece = this.state.pieces[index];
        if (piece.locked) return;
        const point = { clientX: e.clientX, clientY: e.clientY };
        this.onPieceTouchStart({ touches: [point], currentTarget: e.currentTarget }, index);
        clearTimeout(this.dragState.longPressTimer);
        this.startPieceDrag({ touches: [point] }, index);
    }

    onPieceMouseMove(e) {
        if (!this.dragState.isDragging) return;
        e.preventDefault();
        const point = { clientX: e.clientX, clientY: e.clientY };
        this.onPieceTouchMove({ touches: [point], preventDefault: () => {} });
    }

    onPieceMouseUp(e) {
        if (this.dragState.sourcePiece === null) return;
        e.preventDefault();
        const point = { clientX: e.clientX, clientY: e.clientY };
        this.onPieceTouchEnd({ changedTouches: [point], preventDefault: () => {}, stopPropagation: () => {} });
    }

    startPieceDrag(e, index) {
        this.dragState.isDragging = true;
        const touch = e.touches[0];
        const piece = this.state.pieces[index];
        const el = document.createElement('div');
        el.className = 'puzzle-drag-item';
        el.style.backgroundImage = `url(${piece.image})`;
        document.body.appendChild(el);
        this.dragState.dragElement = el;
        this.updateDragPosition(touch.clientX, touch.clientY);
        const boardPieces = document.querySelectorAll('.puzzle-piece');
        if (boardPieces[index]) boardPieces[index].classList.add('dragging-source');
    }

    updateDragPosition(x, y) {
        const el = this.dragState.dragElement;
        if (!el) return;
        el.style.left = `${x - el.offsetWidth / 2}px`;
        el.style.top = `${y - el.offsetHeight / 2}px`;
    }

    highlightHoverPiece(x, y) {
        document.querySelectorAll('.puzzle-piece.hover-target').forEach(p => p.classList.remove('hover-target'));
        const elem = document.elementFromPoint(x, y);
        if (!elem) return;
        const piece = elem.closest('.puzzle-piece');
        if (!piece) return;
        const index = parseInt(piece.dataset.index);
        if (isNaN(index)) return;
        if (!this.state.pieces[index].locked) {
            piece.classList.add('hover-target');
        }
    }

    endPieceDrag(touch) {
        document.querySelectorAll('.puzzle-piece.hover-target').forEach(p => p.classList.remove('hover-target'));
        const x = touch.clientX;
        const y = touch.clientY;
        const elem = document.elementFromPoint(x, y);
        if (!elem) { this.fadeOutDrag(); return; }
        const pieceEl = elem.closest('.puzzle-piece');
        if (!pieceEl) { this.fadeOutDrag(); return; }
        const targetIndex = parseInt(pieceEl.dataset.index);
        if (isNaN(targetIndex)) { this.fadeOutDrag(); return; }
        if (this.state.pieces[targetIndex].locked) { this.fadeOutDrag(); return; }

        const sourceIndex = this.dragState.sourcePiece;
        if (sourceIndex !== null && sourceIndex !== targetIndex) {
            this.swapPieces(sourceIndex, targetIndex);
            this.checkCompletion();
        }
        this.fadeOutDrag();
        this.renderBoard();
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
        const boardPieces = document.querySelectorAll('.puzzle-piece');
        boardPieces.forEach(p => p.classList.remove('dragging-source'));
    }

    resetDragState() {
        this.dragState.isDragging = false;
        this.dragState.sourcePiece = null;
        this.dragState.startX = 0;
        this.dragState.startY = 0;
        this.dragState.longPressTimer = null;
        this.dragState.hasMoved = false;
    }


    // ========== Canvas 图案绘制系统 ==========
    drawPattern(ctx, w, h, pattern) {
        // 1. 画背景（确保100%覆盖）
        if (pattern.bg) {
            if (Array.isArray(pattern.bg)) {
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                pattern.bg.forEach((c, i) => grad.addColorStop(i / (pattern.bg.length - 1), c));
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = pattern.bg;
            }
            ctx.fillRect(0, 0, w, h);
        } else {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
        }

        // 2. 画前景（100%覆盖画布）
        switch(pattern.type) {
            case 'stripes': this.drawStripes(ctx, w, h, pattern); break;
            case 'dots': this.drawDots(ctx, w, h, pattern); break;
            case 'grid': this.drawGrid(ctx, w, h, pattern); break;
            case 'radial': this.drawRadial(ctx, w, h, pattern); break;
            case 'waves': this.drawWaves(ctx, w, h, pattern); break;
            case 'organic': this.drawOrganic(ctx, w, h, pattern); break;
            case 'gradient': this.drawGradientElements(ctx, w, h, pattern); break;
            case 'custom': this.drawCustom(ctx, w, h, pattern); break;
        }
    }

    drawStripes(ctx, w, h, pattern) {
        const colors = pattern.colors;
        const dir = pattern.dir || 'diagonal';
        const count = colors.length;
        
        if (dir === 'diagonal') {
            ctx.save();
            ctx.translate(w/2, h/2);
            ctx.rotate(Math.PI / 4);
            const diag = Math.sqrt(w*w + h*h);
            const stripeSize = diag * 2 / count;
            for (let i = -count; i < count * 2; i++) {
                ctx.fillStyle = colors[((i % count) + count) % count];
                ctx.fillRect(-diag, -diag + i * stripeSize, diag * 3, stripeSize);
            }
            ctx.restore();
        } else if (dir === 'vertical') {
            const stripeW = w / count;
            for (let i = 0; i < count; i++) {
                ctx.fillStyle = colors[i];
                ctx.fillRect(i * stripeW, 0, stripeW + 1, h);
            }
            for (let i = count; i * stripeW < w; i++) {
                ctx.fillStyle = colors[i % count];
                ctx.fillRect(i * stripeW, 0, stripeW + 1, h);
            }
        } else {
            const stripeH = h / count;
            for (let i = 0; i < count; i++) {
                ctx.fillStyle = colors[i];
                ctx.fillRect(0, i * stripeH, w, stripeH + 1);
            }
            for (let i = count; i * stripeH < h; i++) {
                ctx.fillStyle = colors[i % count];
                ctx.fillRect(0, i * stripeH, w, stripeH + 1);
            }
        }
    }

    drawDots(ctx, w, h, pattern) {
        const colors = pattern.colors;
        const density = pattern.density || 'medium';
        const spacing = density === 'dense' ? 35 : density === 'sparse' ? 70 : 50;
        const radius = density === 'dense' ? 12 : density === 'sparse' ? 10 : 14;
        
        for (let y = 0; y < h + spacing; y += spacing) {
            for (let x = 0; x < w + spacing; x += spacing) {
                const offsetX = (Math.floor(y / spacing) % 2) * (spacing / 2);
                const px = x + offsetX;
                const py = y;
                const colorIdx = (Math.floor(px / spacing) + Math.floor(py / spacing)) % colors.length;
                ctx.beginPath();
                ctx.arc(px, py, radius, 0, Math.PI * 2);
                ctx.fillStyle = colors[colorIdx];
                ctx.fill();
                // 边框让圆点更明显
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }

    drawGrid(ctx, w, h, pattern) {
        const colors = pattern.colors;
        const style = pattern.style || 'checker';
        
        if (style === 'checker') {
            const cols = 8, rows = 8;
            const cellW = w / cols, cellH = h / rows;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    ctx.fillStyle = colors[(r + c) % colors.length];
                    ctx.fillRect(c * cellW, r * cellH, cellW + 1, cellH + 1);
                }
            }
        } else if (style === 'bricks') {
            const rows = 10;
            const brickH = h / rows;
            const brickW = w / 5;
            for (let r = 0; r < rows; r++) {
                const offset = (r % 2) * (brickW / 2);
                for (let c = -1; c < 6; c++) {
                    ctx.fillStyle = colors[(r + c) % colors.length];
                    ctx.fillRect(c * brickW + offset, r * brickH, brickW - 2, brickH - 2);
                }
            }
        } else if (style === 'hex') {
            const hexSize = w / 7;
            const hexW = hexSize * 1.732;
            const hexH = hexSize * 1.5;
            for (let row = 0; row < h / hexH + 2; row++) {
                for (let col = 0; col < w / hexW + 2; col++) {
                    const x = col * hexW + (row % 2) * hexW / 2;
                    const y = row * hexH;
                    this.drawHexagon(ctx, x, y, hexSize, colors[(row + col) % colors.length]);
                }
            }
        } else if (style === 'scales') {
            const scaleR = w / 9;
            for (let row = 0; row < h / scaleR + 3; row++) {
                for (let col = 0; col < w / scaleR + 3; col++) {
                    const x = col * scaleR * 1.7 + (row % 2) * scaleR * 0.85;
                    const y = row * scaleR * 1.4;
                    ctx.beginPath();
                    ctx.arc(x, y, scaleR, Math.PI, 0);
                    ctx.fillStyle = colors[(row + col) % colors.length];
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(x, y, scaleR, Math.PI, 0);
                    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
    }

    drawRadial(ctx, w, h, pattern) {
        const colors = pattern.colors;
        const style = pattern.style || 'rays';
        const cx = w / 2, cy = h / 2;
        
        if (style === 'rays') {
            const rays = 24;
            for (let i = 0; i < rays; i++) {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                const angle = (i / rays) * Math.PI * 2;
                const nextAngle = ((i + 1) / rays) * Math.PI * 2;
                ctx.arc(cx, cy, Math.max(w, h) * 1.5, angle, nextAngle);
                ctx.closePath();
                ctx.fillStyle = colors[i % colors.length];
                ctx.fill();
            }
        } else if (style === 'spiral') {
            const maxR = Math.max(w, h) * 1.2;
            const bands = 30;
            const bandW = maxR / bands;
            for (let i = 0; i < bands; i++) {
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 10; a += 0.05) {
                    const r = (i * bandW) + (a / (Math.PI * 10)) * bandW;
                    const x = cx + Math.cos(a + i * 0.3) * r;
                    const y = cy + Math.sin(a + i * 0.3) * r;
                    if (a === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = colors[i % colors.length];
                ctx.lineWidth = bandW * 0.9;
                ctx.stroke();
            }
        } else if (style === 'swirl') {
            const maxR = Math.max(w, h);
            const steps = 150;
            for (let i = 0; i < steps; i++) {
                const r = (i / steps) * maxR;
                const angle = (i / steps) * Math.PI * 10;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, r * 0.12 + 4, 0, Math.PI * 2);
                ctx.fillStyle = colors[i % colors.length];
                ctx.fill();
            }
        } else if (style === 'eye') {
            const rings = 12;
            const maxR = Math.min(w, h) * 0.25;
            const spacing = maxR * 2.2;
            for (let row = 0; row < h / spacing + 2; row++) {
                for (let col = 0; col < w / spacing + 2; col++) {
                    const x = col * spacing + (row % 2) * spacing / 2;
                    const y = row * spacing * 0.866;
                    for (let i = rings; i >= 0; i--) {
                        ctx.beginPath();
                        ctx.arc(x, y, (i / rings) * maxR, 0, Math.PI * 2);
                        ctx.fillStyle = colors[i % colors.length];
                        ctx.fill();
                    }
                }
            }
        }
    }

    drawWaves(ctx, w, h, pattern) {
        const colors = pattern.colors;
        const style = pattern.style || 'wave';
        
        if (style === 'zigzag') {
            const bands = colors.length * 2;
            const bandH = h / bands;
            for (let b = 0; b < bands; b++) {
                ctx.beginPath();
                for (let x = 0; x <= w + 10; x += 8) {
                    const y = b * bandH + bandH / 2 + Math.sin(x / w * Math.PI * 6 + b) * bandH * 0.35;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.lineTo(w + 10, (b + 1) * bandH);
                ctx.lineTo(0, (b + 1) * bandH);
                ctx.closePath();
                ctx.fillStyle = colors[b % colors.length];
                ctx.fill();
            }
        } else if (style === 'flame') {
            const flames = 10;
            const fw = w / flames;
            for (let i = 0; i < flames; i++) {
                ctx.beginPath();
                ctx.moveTo(i * fw, h);
                const peakH = h * (0.3 + Math.random() * 0.3);
                ctx.quadraticCurveTo(i * fw + fw * 0.25, peakH, i * fw + fw * 0.5, h * 0.15);
                ctx.quadraticCurveTo(i * fw + fw * 0.75, peakH, (i + 1) * fw, h);
                ctx.closePath();
                ctx.fillStyle = colors[i % colors.length];
                ctx.fill();
            }
            // 再来一层确保覆盖
            for (let i = 0; i < flames; i++) {
                ctx.beginPath();
                ctx.moveTo(i * fw + fw * 0.5, h);
                ctx.quadraticCurveTo(i * fw + fw * 0.75, h * 0.5, i * fw + fw, h * 0.2);
                ctx.quadraticCurveTo(i * fw + fw * 1.25, h * 0.5, (i + 1) * fw + fw * 0.5, h);
                ctx.closePath();
                ctx.fillStyle = colors[(i + 1) % colors.length];
                ctx.fill();
            }
        }
    }

    drawOrganic(ctx, w, h, pattern) {
        const colors = pattern.colors;
        const shape = pattern.shape;
        
        if (shape === 'balloons') {
            const cols = 4, rows = 4;
            const cellW = w / cols, cellH = h / rows;
            let idx = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = c * cellW + cellW / 2;
                    const y = r * cellH + cellH / 2;
                    const radius = Math.min(cellW, cellH) * 0.35;
                    ctx.beginPath(); ctx.ellipse(x, y, radius, radius * 1.15, 0, 0, Math.PI * 2);
                    ctx.fillStyle = colors[idx % colors.length]; ctx.fill();
                    ctx.beginPath(); ctx.ellipse(x - radius * 0.25, y - radius * 0.25, radius * 0.2, radius * 0.3, -0.5, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(x, y + radius * 1.15);
                    ctx.quadraticCurveTo(x + 4, y + radius * 1.5, x, y + radius * 1.8);
                    ctx.strokeStyle = 'rgba(100,100,100,0.4)'; ctx.lineWidth = 2; ctx.stroke();
                    idx++;
                }
            }
        } else if (shape === 'raindrops') {
            const cols = 8;
            const spacing = w / cols;
            for (let row = 0; row < h / spacing + 2; row++) {
                for (let col = 0; col < cols + 1; col++) {
                    const x = col * spacing + (row % 2) * spacing / 2;
                    const y = row * spacing;
                    const len = spacing * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - 3, y + len);
                    ctx.lineTo(x + 3, y + len);
                    ctx.closePath();
                    ctx.fillStyle = colors[(row + col) % colors.length];
                    ctx.fill();
                }
            }
        } else if (shape === 'hearts') {
            const cols = 5, rows = 5;
            const cellW = w / cols, cellH = h / rows;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = c * cellW + cellW / 2;
                    const y = r * cellH + cellH / 2;
                    const size = Math.min(cellW, cellH) * 0.35;
                    ctx.fillStyle = colors[(r + c) % colors.length];
                    this.drawHeart(ctx, x, y, size);
                }
            }
        } else if (shape === 'snowflakes') {
            const cols = 5, rows = 5;
            const cellW = w / cols, cellH = h / rows;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = c * cellW + cellW / 2;
                    const y = r * cellH + cellH / 2;
                    const size = Math.min(cellW, cellH) * 0.3;
                    this.drawSnowflake(ctx, x, y, size, colors[(r + c) % colors.length]);
                }
            }
        } else if (shape === 'leaves') {
            const cols = 5, rows = 6;
            const cellW = w / cols, cellH = h / rows;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = c * cellW + cellW / 2 + (Math.random() - 0.5) * 10;
                    const y = r * cellH + cellH / 2 + (Math.random() - 0.5) * 10;
                    const size = Math.min(cellW, cellH) * 0.3;
                    const angle = (r + c) * 0.5;
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, size, size * 0.45, 0, 0, Math.PI * 2);
                    ctx.fillStyle = colors[(r + c) % colors.length];
                    ctx.fill();
                    ctx.restore();
                }
            }
        } else if (shape === 'watermelon') {
            const cols = 2, rows = 2;
            const cellW = w / cols, cellH = h / rows;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cx = c * cellW + cellW / 2;
                    const cy = r * cellH + cellH * 0.55;
                    const rw = cellW * 0.4, rh = cellH * 0.35;
                    // 外皮
                    ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, Math.PI, 0);
                    ctx.fillStyle = colors[1]; ctx.fill();
                    // 瓜肉
                    ctx.beginPath(); ctx.ellipse(cx, cy, rw - 8, rh - 6, 0, Math.PI, 0);
                    ctx.fillStyle = colors[0]; ctx.fill();
                    // 瓜籽
                    for (let i = 0; i < 6; i++) {
                        const a = Math.PI + (i / 6) * Math.PI;
                        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rw * 0.3, cy + Math.sin(a) * rh * 0.25, 2.5, 0, Math.PI * 2);
                        ctx.fillStyle = colors[2]; ctx.fill();
                    }
                }
            }
        } else if (shape === 'orange' || shape === 'lemon') {
            const cols = 3, rows = 3;
            const cellW = w / cols, cellH = h / rows;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cx = c * cellW + cellW / 2;
                    const cy = r * cellH + cellH / 2;
                    const radius = Math.min(cellW, cellH) * 0.35;
                    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.fillStyle = colors[0]; ctx.fill();
                    for (let i = 0; i < 12; i++) {
                        const a = (i / 12) * Math.PI * 2;
                        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
                        ctx.strokeStyle = colors[1] || colors[0]; ctx.lineWidth = 1; ctx.stroke();
                    }
                }
            }
        } else if (shape === 'strawberry') {
            const cols = 4, rows = 4;
            const cellW = w / cols, cellH = h / rows;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cx = c * cellW + cellW / 2;
                    const cy = r * cellH + cellH / 2;
                    const size = Math.min(cellW, cellH) * 0.3;
                    ctx.beginPath(); ctx.ellipse(cx, cy, size, size * 1.2, 0, 0, Math.PI * 2);
                    ctx.fillStyle = colors[0]; ctx.fill();
                    ctx.beginPath(); ctx.ellipse(cx, cy - size, size * 0.5, size * 0.25, 0, 0, Math.PI * 2);
                    ctx.fillStyle = colors[1]; ctx.fill();
                    for (let j = 0; j < 5; j++) {
                        ctx.beginPath(); ctx.arc(cx + Math.cos(j * 1.2) * size * 0.35, cy + Math.sin(j * 1.2) * size * 0.45, 1.5, 0, Math.PI * 2);
                        ctx.fillStyle = '#FFD700'; ctx.fill();
                    }
                }
            }
        } else if (shape === 'butterfly') {
            const cols = 3, rows = 3;
            const cellW = w / cols, cellH = h / rows;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = c * cellW + cellW / 2;
                    const y = r * cellH + cellH / 2;
                    const s = Math.min(cellW, cellH) * 0.35;
                    this.drawButterfly(ctx, x, y, s, colors);
                }
            }
        } else if (shape === 'spots') {
            const cols = 5, rows = 6;
            const cellW = w / cols, cellH = h / rows;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cx = c * cellW + cellW / 2 + (Math.random() - 0.5) * 15;
                    const cy = r * cellH + cellH / 2 + (Math.random() - 0.5) * 15;
                    const rx = cellW * 0.25 + Math.random() * 10;
                    const ry = cellH * 0.2 + Math.random() * 8;
                    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
                    ctx.fillStyle = colors[(r + c) % colors.length]; ctx.fill();
                }
            }
        }
    }

    drawGradientElements(ctx, w, h, pattern) {
        const colors = pattern.colors;
        const elements = pattern.elements;
        
        if (elements === 'clouds') {
            const cloudData = [
                {x: 0.15, y: 0.15, r: 0.06}, {x: 0.4, y: 0.1, r: 0.08},
                {x: 0.7, y: 0.18, r: 0.07}, {x: 0.9, y: 0.12, r: 0.05},
                {x: 0.25, y: 0.4, r: 0.09}, {x: 0.6, y: 0.35, r: 0.07},
                {x: 0.85, y: 0.42, r: 0.08}, {x: 0.1, y: 0.55, r: 0.07},
                {x: 0.5, y: 0.55, r: 0.1}, {x: 0.75, y: 0.6, r: 0.06},
                {x: 0.3, y: 0.75, r: 0.08}, {x: 0.65, y: 0.78, r: 0.07},
                {x: 0.15, y: 0.9, r: 0.09}, {x: 0.45, y: 0.88, r: 0.06},
                {x: 0.8, y: 0.9, r: 0.08}
            ];
            cloudData.forEach(c => {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.beginPath();
                ctx.arc(c.x * w, c.y * h, c.r * w, 0, Math.PI * 2);
                ctx.arc(c.x * w + c.r * w * 0.5, c.y * h - c.r * w * 0.2, c.r * w * 1.1, 0, Math.PI * 2);
                ctx.arc(c.x * w - c.r * w * 0.4, c.y * h - c.r * w * 0.15, c.r * w * 0.85, 0, Math.PI * 2);
                ctx.fill();
            });
        } else if (elements === 'stars') {
            for (let i = 0; i < 80; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const s = Math.random() * 3 + 1.5;
                ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2);
                ctx.fillStyle = colors[i % colors.length];
                ctx.fill();
            }
        } else if (elements === 'stars2') {
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const s = Math.random() * 2.5 + 1;
                ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2);
                ctx.fillStyle = Math.random() > 0.7 ? '#FFD700' : '#FFFFFF';
                ctx.fill();
                if (Math.random() > 0.6) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(x - s * 3, y); ctx.lineTo(x + s * 3, y); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x, y - s * 3); ctx.lineTo(x, y + s * 3); ctx.stroke();
                }
            }
            ctx.beginPath(); ctx.arc(w * 0.75, h * 0.2, w * 0.08, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFACD'; ctx.fill();
            ctx.beginPath(); ctx.arc(w * 0.78, h * 0.17, w * 0.06, 0, Math.PI * 2);
            ctx.fillStyle = '#0D1B2A'; ctx.fill();
        }
    }

    // ========== 辅助绘制函数 ==========
    drawHeart(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y + size / 4);
        ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
        ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75, x, y + size);
        ctx.bezierCurveTo(x, y + size * 0.75, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
        ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
        ctx.fill();
    }

    drawSnowflake(ctx, x, y, size, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(0, -size);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -size * 0.5); ctx.lineTo(-size * 0.25, -size * 0.7);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -size * 0.5); ctx.lineTo(size * 0.25, -size * 0.7);
            ctx.stroke();
            ctx.rotate(Math.PI / 3);
        }
        ctx.restore();
    }

    drawButterfly(ctx, x, y, size, colors) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = colors[0];
        ctx.beginPath(); ctx.ellipse(-size * 0.5, -size * 0.25, size * 0.55, size * 0.4, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-size * 0.5, size * 0.2, size * 0.35, size * 0.25, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = colors[1] || colors[0];
        ctx.beginPath(); ctx.ellipse(size * 0.5, -size * 0.25, size * 0.55, size * 0.4, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(size * 0.5, size * 0.2, size * 0.35, size * 0.25, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = colors[2] || colors[0];
        ctx.beginPath(); ctx.ellipse(0, 0, size * 0.08, size * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    drawHexagon(ctx, x, y, size, color) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const hx = x + size * Math.cos(a);
            const hy = y + size * Math.sin(a);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    drawCustom(ctx, w, h, pattern) {
        switch(pattern.shape) {
            case 'cat': this.drawCustomCat(ctx, w, h); break;
            case 'bird': this.drawCustomBird(ctx, w, h); break;
            case 'dog': this.drawCustomDog(ctx, w, h); break;
            case 'house': this.drawCustomHouse(ctx, w, h); break;
            case 'umbrella': this.drawCustomUmbrella(ctx, w, h); break;
            case 'gift': this.drawCustomGift(ctx, w, h); break;
            case 'candle': this.drawCustomCandle(ctx, w, h); break;
            case 'snowman': this.drawCustomSnowman(ctx, w, h); break;
            case 'appletree': this.drawCustomAppleTree(ctx, w, h); break;
            case 'watermelon': this.drawCustomWatermelon(ctx, w, h); break;
            case 'orange': this.drawCustomOrange(ctx, w, h); break;
            case 'lemon': this.drawCustomLemon(ctx, w, h); break;
            case 'strawberry': this.drawCustomStrawberry(ctx, w, h); break;
            case 'fish': this.drawCustomFish(ctx, w, h); break;
            case 'butterfly': this.drawCustomButterfly(ctx, w, h); break;
            case 'goldfish': this.drawCustomGoldfish(ctx, w, h); break;
            case 'bee': this.drawCustomBee(ctx, w, h); break;
            case 'castle': this.drawCustomCastle(ctx, w, h); break;
            case 'zebra': this.drawCustomZebra(ctx, w, h); break;
            case 'leopard': this.drawCustomLeopard(ctx, w, h); break;
            case 'cow': this.drawCustomCow(ctx, w, h); break;
            case 'peacock': this.drawCustomPeacock(ctx, w, h); break;
        }
    }

    drawCustomCat(ctx, w, h) {
        ctx.fillStyle = '#FFF8DC';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.55;
        // 身体
        ctx.beginPath(); ctx.ellipse(cx, cy + 15, 45, 55, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFA500'; ctx.fill();
        // 头
        ctx.beginPath(); ctx.arc(cx, cy - 45, 38, 0, Math.PI * 2);
        ctx.fillStyle = '#FFA500'; ctx.fill();
        // 耳朵
        ctx.beginPath(); ctx.moveTo(cx - 28, cy - 70); ctx.lineTo(cx - 38, cy - 95); ctx.lineTo(cx - 12, cy - 78); ctx.closePath();
        ctx.fillStyle = '#FFA500'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 28, cy - 70); ctx.lineTo(cx + 38, cy - 95); ctx.lineTo(cx + 12, cy - 78); ctx.closePath();
        ctx.fillStyle = '#FFA500'; ctx.fill();
        // 内耳
        ctx.beginPath(); ctx.moveTo(cx - 26, cy - 72); ctx.lineTo(cx - 33, cy - 88); ctx.lineTo(cx - 16, cy - 78); ctx.closePath();
        ctx.fillStyle = '#FFB6C1'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 26, cy - 72); ctx.lineTo(cx + 33, cy - 88); ctx.lineTo(cx + 16, cy - 78); ctx.closePath();
        ctx.fillStyle = '#FFB6C1'; ctx.fill();
        // 眼睛
        ctx.beginPath(); ctx.arc(cx - 12, cy - 50, 6, 0, Math.PI * 2); ctx.fillStyle = '#228B22'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 12, cy - 50, 6, 0, Math.PI * 2); ctx.fillStyle = '#228B22'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 12, cy - 52, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 12, cy - 52, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 鼻子
        ctx.beginPath(); ctx.moveTo(cx, cy - 42); ctx.lineTo(cx - 4, cy - 36); ctx.lineTo(cx + 4, cy - 36); ctx.closePath();
        ctx.fillStyle = '#FF69B4'; ctx.fill();
        // 嘴巴
        ctx.beginPath(); ctx.moveTo(cx, cy - 36); ctx.quadraticCurveTo(cx - 6, cy - 28, cx - 10, cy - 32); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 36); ctx.quadraticCurveTo(cx + 6, cy - 28, cx + 10, cy - 32); ctx.stroke();
        // 胡须
        ctx.beginPath(); ctx.moveTo(cx - 30, cy - 40); ctx.lineTo(cx - 50, cy - 42); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 30, cy - 35); ctx.lineTo(cx - 50, cy - 32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 30, cy - 40); ctx.lineTo(cx + 50, cy - 42); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 30, cy - 35); ctx.lineTo(cx + 50, cy - 32); ctx.stroke();
        // 花纹
        ctx.beginPath(); ctx.moveTo(cx, cy - 75); ctx.lineTo(cx - 5, cy - 55); ctx.lineTo(cx + 5, cy - 55); ctx.closePath();
        ctx.fillStyle = '#FF8C00'; ctx.fill();
        // 尾巴
        ctx.beginPath(); ctx.moveTo(cx + 40, cy + 20); ctx.quadraticCurveTo(cx + 70, cy - 10, cx + 55, cy - 40);
        ctx.strokeStyle = '#FFA500'; ctx.lineWidth = 10; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 55, cy - 40, 6, 0, Math.PI * 2); ctx.fillStyle = '#FFA500'; ctx.fill();
        // 腿
        ctx.fillStyle = '#FFA500'; ctx.fillRect(cx - 30, cy + 55, 12, 30); ctx.fillRect(cx - 8, cy + 55, 12, 30);
        ctx.fillRect(cx + 8, cy + 55, 12, 30); ctx.fillRect(cx + 30, cy + 55, 12, 30);
        // 爪子
        ctx.fillStyle = '#FFB6C1'; ctx.beginPath(); ctx.arc(cx - 24, cy + 88, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 36, cy + 88, 8, 0, Math.PI * 2); ctx.fill();
    }

    drawCustomBird(ctx, w, h) {
        ctx.fillStyle = '#E0F7FA';
        ctx.fillRect(0, 0, w, h);
        // 云朵
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(w * 0.2, h * 0.2, 18, 0, Math.PI * 2); ctx.arc(w * 0.27, h * 0.17, 22, 0, Math.PI * 2); ctx.arc(w * 0.33, h * 0.2, 15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.75, h * 0.15, 15, 0, Math.PI * 2); ctx.arc(w * 0.8, h * 0.13, 18, 0, Math.PI * 2); ctx.arc(w * 0.85, h * 0.15, 14, 0, Math.PI * 2); ctx.fill();
        // 太阳
        ctx.beginPath(); ctx.arc(w * 0.12, h * 0.15, 22, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        const cx = w * 0.5, cy = h * 0.45;
        // 身体
        ctx.beginPath(); ctx.ellipse(cx, cy, 50, 35, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#87CEEB'; ctx.fill();
        // 肚子
        ctx.beginPath(); ctx.ellipse(cx, cy + 8, 30, 22, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#E0F7FA'; ctx.fill();
        // 头
        ctx.beginPath(); ctx.arc(cx + 35, cy - 20, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#87CEEB'; ctx.fill();
        // 眼睛
        ctx.beginPath(); ctx.arc(cx + 42, cy - 25, 5, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 44, cy - 25, 3, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 嘴巴
        ctx.beginPath(); ctx.moveTo(cx + 58, cy - 18); ctx.lineTo(cx + 68, cy - 14); ctx.lineTo(cx + 58, cy - 10); ctx.closePath();
        ctx.fillStyle = '#FF8C00'; ctx.fill();
        // 翅膀
        ctx.beginPath(); ctx.ellipse(cx - 10, cy - 5, 35, 18, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#4682B4'; ctx.fill();
        // 尾巴
        ctx.beginPath(); ctx.moveTo(cx - 45, cy + 5); ctx.lineTo(cx - 75, cy - 15); ctx.lineTo(cx - 70, cy + 10); ctx.closePath();
        ctx.fillStyle = '#4682B4'; ctx.fill();
        // 脚
        ctx.beginPath(); ctx.moveTo(cx - 8, cy + 30); ctx.lineTo(cx - 12, cy + 48); ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 8, cy + 30); ctx.lineTo(cx + 12, cy + 48); ctx.stroke();
    }

    drawCustomDog(ctx, w, h) {
        ctx.fillStyle = '#F5F5DC';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.55;
        // 身体
        ctx.beginPath(); ctx.ellipse(cx, cy + 10, 50, 45, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#D2691E'; ctx.fill();
        // 头
        ctx.beginPath(); ctx.ellipse(cx, cy - 40, 38, 42, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#D2691E'; ctx.fill();
        // 耳朵（下垂）
        ctx.beginPath(); ctx.ellipse(cx - 32, cy - 40, 12, 22, -0.4, 0, Math.PI * 2); ctx.fillStyle = '#8B4513'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 32, cy - 40, 12, 22, 0.4, 0, Math.PI * 2); ctx.fillStyle = '#8B4513'; ctx.fill();
        // 眼睛
        ctx.beginPath(); ctx.ellipse(cx - 14, cy - 48, 7, 9, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 14, cy - 48, 7, 9, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 12, cy - 48, 4, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 16, cy - 48, 4, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 鼻子
        ctx.beginPath(); ctx.ellipse(cx, cy - 32, 9, 7, 0, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 嘴巴
        ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.quadraticCurveTo(cx - 8, cy - 15, cx - 12, cy - 18); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.quadraticCurveTo(cx + 8, cy - 15, cx + 12, cy - 18); ctx.stroke();
        // 舌头
        ctx.beginPath(); ctx.arc(cx, cy - 15, 6, 0, Math.PI); ctx.fillStyle = '#FF69B4'; ctx.fill();
        // 项圈
        ctx.beginPath(); ctx.ellipse(cx, cy - 5, 38, 6, 0, 0, Math.PI * 2); ctx.fillStyle = '#FF0000'; ctx.fill();
        // 铃铛
        ctx.beginPath(); ctx.arc(cx, cy + 5, 7, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        // 腿
        ctx.fillStyle = '#D2691E'; ctx.fillRect(cx - 35, cy + 40, 14, 35); ctx.fillRect(cx - 8, cy + 40, 14, 35);
        ctx.fillRect(cx + 8, cy + 40, 14, 35); ctx.fillRect(cx + 35, cy + 40, 14, 35);
        // 尾巴（翘起）
        ctx.beginPath(); ctx.moveTo(cx + 45, cy + 10); ctx.quadraticCurveTo(cx + 75, cy - 20, cx + 65, cy - 45); ctx.strokeStyle = '#D2691E'; ctx.lineWidth = 10; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 65, cy - 45, 6, 0, Math.PI * 2); ctx.fillStyle = '#D2691E'; ctx.fill();
        // 草地
        ctx.fillStyle = '#90EE90'; ctx.fillRect(0, h * 0.88, w, h * 0.12);
    }

    drawCustomHouse(ctx, w, h) {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, w, h);
        // 太阳
        ctx.beginPath(); ctx.arc(w * 0.85, h * 0.12, 25, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(w * 0.85 + Math.cos(a) * 30, h * 0.12 + Math.sin(a) * 30); ctx.lineTo(w * 0.85 + Math.cos(a) * 40, h * 0.12 + Math.sin(a) * 40); ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3; ctx.stroke();
        }
        // 云
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(w * 0.15, h * 0.15, 18, 0, Math.PI * 2); ctx.arc(w * 0.22, h * 0.12, 22, 0, Math.PI * 2); ctx.arc(w * 0.28, h * 0.15, 16, 0, Math.PI * 2); ctx.fill();
        const cx = w * 0.5, cy = h * 0.55;
        // 草地
        ctx.fillStyle = '#90EE90'; ctx.fillRect(0, cy + 50, w, h * 0.3);
        // 房子主体
        ctx.fillStyle = '#FFE4B5'; ctx.fillRect(cx - 60, cy - 30, 120, 80);
        // 屋顶
        ctx.beginPath(); ctx.moveTo(cx - 75, cy - 30); ctx.lineTo(cx, cy - 90); ctx.lineTo(cx + 75, cy - 30); ctx.closePath();
        ctx.fillStyle = '#FF6347'; ctx.fill();
        // 门
        ctx.fillStyle = '#8B4513'; ctx.fillRect(cx - 15, cy + 10, 30, 40);
        // 窗户
        ctx.fillStyle = '#87CEEB'; ctx.fillRect(cx - 45, cy - 15, 25, 25); ctx.fillRect(cx + 20, cy - 15, 25, 25);
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 32.5, cy - 15); ctx.lineTo(cx - 32.5, cy + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 45, cy - 2.5); ctx.lineTo(cx - 20, cy - 2.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 32.5, cy - 15); ctx.lineTo(cx + 32.5, cy + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 20, cy - 2.5); ctx.lineTo(cx + 45, cy - 2.5); ctx.stroke();
        // 烟囱
        ctx.fillStyle = '#8B4513'; ctx.fillRect(cx + 35, cy - 75, 15, 30);
        ctx.fillStyle = 'rgba(200,200,200,0.5)';
        ctx.beginPath(); ctx.arc(cx + 42, cy - 85, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 50, cy - 95, 10, 0, Math.PI * 2); ctx.fill();
    }

    drawCustomUmbrella(ctx, w, h) {
        ctx.fillStyle = '#E0F7FA';
        ctx.fillRect(0, 0, w, h);
        // 雨滴
        ctx.strokeStyle = 'rgba(100,150,200,0.35)'; ctx.lineWidth = 2;
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * w, y = Math.random() * h, len = 12 + Math.random() * 15;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + len); ctx.stroke();
        }
        const cx = w * 0.5, cy = h * 0.45;
        // 伞面
        const uColors = ['#FF4444','#FF6666','#FF4444','#FF6666','#FF4444','#FF6666'];
        for (let i = 0; i < 6; i++) {
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 70, Math.PI + (i / 6) * Math.PI, Math.PI + ((i + 1) / 6) * Math.PI); ctx.closePath();
            ctx.fillStyle = uColors[i]; ctx.fill();
        }
        // 伞柄
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 90); ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy + 90, 10, 0, Math.PI); ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.stroke();
        // 水坑
        ctx.beginPath(); ctx.ellipse(cx, h * 0.85, 50, 12, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(100,150,200,0.25)'; ctx.fill();
    }

    drawCustomGift(ctx, w, h) {
        ctx.fillStyle = '#FFF8F0';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.55;
        const boxW = 100, boxH = 80;
        // 盒子
        ctx.fillStyle = '#FF69B4'; ctx.fillRect(cx - boxW/2, cy - boxH/2, boxW, boxH);
        ctx.fillStyle = '#FF1493'; ctx.fillRect(cx - 8, cy - boxH/2, 16, boxH); ctx.fillRect(cx - boxW/2, cy - 8, boxW, 16);
        // 蝴蝶结
        ctx.beginPath(); ctx.ellipse(cx - 20, cy - boxH/2 - 5, 20, 12, -0.3, 0, Math.PI * 2); ctx.fillStyle = '#FF1493'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 20, cy - boxH/2 - 5, 20, 12, 0.3, 0, Math.PI * 2); ctx.fillStyle = '#FF1493'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - boxH/2 - 5, 10, 0, Math.PI * 2); ctx.fillStyle = '#DC143C'; ctx.fill();
        // 丝带尾巴
        ctx.beginPath(); ctx.moveTo(cx - 5, cy - boxH/2 + 5); ctx.quadraticCurveTo(cx - 20, cy + 10, cx - 10, cy + 30); ctx.strokeStyle = '#FF1493'; ctx.lineWidth = 6; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 5, cy - boxH/2 + 5); ctx.quadraticCurveTo(cx + 20, cy + 10, cx + 15, cy + 25); ctx.strokeStyle = '#FF1493'; ctx.lineWidth = 6; ctx.stroke();
        // 小爱心
        ctx.fillStyle = '#FFD700'; this.drawHeart(ctx, cx - 35, cy - 5, 12); this.drawHeart(ctx, cx + 35, cy + 5, 10);
    }

    drawCustomCandle(ctx, w, h) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.5;
        // 蜡烛主体
        ctx.fillStyle = '#FFF8DC'; ctx.fillRect(cx - 15, cy - 20, 30, 70);
        ctx.strokeStyle = '#FF69B4'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - 15, cy + i * 15); ctx.lineTo(cx + 15, cy + i * 15); ctx.stroke(); }
        // 烛芯
        ctx.beginPath(); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy - 30); ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
        // 火焰
        ctx.beginPath(); ctx.moveTo(cx, cy - 30); ctx.quadraticCurveTo(cx - 10, cy - 45, cx, cy - 55); ctx.quadraticCurveTo(cx + 10, cy - 45, cx, cy - 30); ctx.closePath();
        ctx.fillStyle = '#FF4500'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx, cy - 38, 5, 8, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        // 光晕
        ctx.beginPath(); ctx.arc(cx, cy - 35, 45, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,200,0,0.06)'; ctx.fill();
        // 星星背景
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * w, y = Math.random() * h;
            ctx.beginPath(); ctx.arc(x, y, Math.random() * 2 + 1, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
        }
    }

    drawCustomSnowman(ctx, w, h) {
        ctx.fillStyle = '#B0C4DE';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 12; i++) {
            const x = Math.random() * w, y = Math.random() * h;
            ctx.beginPath(); ctx.arc(x, y, Math.random() * 3 + 1, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
        }
        const cx = w * 0.5, cy = h * 0.55;
        // 身体下
        ctx.beginPath(); ctx.arc(cx, cy + 30, 45, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        // 身体上
        ctx.beginPath(); ctx.arc(cx, cy - 20, 32, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        // 头
        ctx.beginPath(); ctx.arc(cx, cy - 60, 22, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        // 眼睛
        ctx.beginPath(); ctx.arc(cx - 8, cy - 65, 3, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 8, cy - 65, 3, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 鼻子
        ctx.beginPath(); ctx.moveTo(cx, cy - 60); ctx.lineTo(cx + 15, cy - 58); ctx.lineTo(cx, cy - 56); ctx.closePath(); ctx.fillStyle = '#FF8C00'; ctx.fill();
        // 嘴巴
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx - 8 + i * 4, cy - 52, 1.5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill(); }
        // 帽子
        ctx.fillStyle = '#333'; ctx.fillRect(cx - 25, cy - 88, 50, 8); ctx.fillRect(cx - 15, cy - 110, 30, 25);
        // 围巾
        ctx.fillStyle = '#FF4444'; ctx.fillRect(cx - 25, cy - 35, 50, 10);
        ctx.beginPath(); ctx.moveTo(cx + 15, cy - 30); ctx.lineTo(cx + 25, cy - 10); ctx.lineTo(cx + 15, cy - 10); ctx.closePath(); ctx.fill();
        // 手臂
        ctx.beginPath(); ctx.moveTo(cx - 32, cy - 20); ctx.lineTo(cx - 55, cy - 35); ctx.lineTo(cx - 58, cy - 32); ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 32, cy - 20); ctx.lineTo(cx + 55, cy - 10); ctx.lineTo(cx + 58, cy - 13); ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 3; ctx.stroke();
        // 纽扣
        ctx.beginPath(); ctx.arc(cx, cy - 5, 4, 0, Math.PI * 2); ctx.fillStyle = '#333'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy + 10, 4, 0, Math.PI * 2); ctx.fillStyle = '#333'; ctx.fill();
        // 地
        ctx.fillStyle = '#FFF'; ctx.fillRect(0, h * 0.88, w, h * 0.12);
    }

    drawCustomAppleTree(ctx, w, h) {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#90EE90'; ctx.fillRect(0, h * 0.75, w, h * 0.25);
        const cx = w * 0.5, cy = h * 0.55;
        // 树干
        ctx.fillStyle = '#8B4513'; ctx.fillRect(cx - 10, cy, 20, h * 0.25);
        // 树冠（几个重叠的圆）
        const circles = [{x: cx - 35, y: cy - 40, r: 35}, {x: cx + 35, y: cy - 35, r: 32}, {x: cx, y: cy - 60, r: 40}, {x: cx - 20, y: cy - 25, r: 30}, {x: cx + 20, y: cy - 20, r: 28}];
        circles.forEach(c => { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fillStyle = '#228B22'; ctx.fill(); });
        // 苹果
        const apples = [[cx - 30, cy - 30], [cx + 25, cy - 45], [cx - 10, cy - 70], [cx + 40, cy - 25], [cx - 45, cy - 50], [cx + 10, cy - 35], [cx, cy - 15]];
        apples.forEach(([x, y]) => {
            ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fillStyle = '#FF0000'; ctx.fill();
            ctx.beginPath(); ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
        });
        // 太阳
        ctx.beginPath(); ctx.arc(w * 0.85, h * 0.15, 25, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        // 云
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(w * 0.15, h * 0.2, 18, 0, Math.PI * 2); ctx.arc(w * 0.22, h * 0.17, 22, 0, Math.PI * 2); ctx.arc(w * 0.28, h * 0.2, 16, 0, Math.PI * 2); ctx.fill();
    }

    drawCustomWatermelon(ctx, w, h) {
        ctx.fillStyle = '#E8F5E9';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.5;
        const rw = w * 0.35, rh = h * 0.3;
        // 外皮
        ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, Math.PI, 0); ctx.fillStyle = '#228B22'; ctx.fill();
        // 瓜肉
        ctx.beginPath(); ctx.ellipse(cx, cy, rw - 12, rh - 10, 0, Math.PI, 0); ctx.fillStyle = '#FF6347'; ctx.fill();
        // 瓜籽（不对称）
        const seeds = [[cx - rw * 0.2, cy - rh * 0.1], [cx + rw * 0.15, cy - rh * 0.15], [cx, cy + rh * 0.05], [cx - rw * 0.1, cy + rh * 0.15], [cx + rw * 0.25, cy + rh * 0.05], [cx - rw * 0.3, cy + rh * 0.1], [cx + rw * 0.05, cy - rh * 0.2]];
        seeds.forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 4, 6, 0, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill(); });
        // 盘子
        ctx.beginPath(); ctx.ellipse(cx, cy + rh + 15, rw * 0.8, 12, 0, 0, Math.PI * 2); ctx.fillStyle = '#DDD'; ctx.fill();
        // 小刀
        ctx.fillStyle = '#AAA'; ctx.fillRect(cx + rw + 10, cy - 20, 8, 60); ctx.fillStyle = '#DDD'; ctx.fillRect(cx + rw + 8, cy - 25, 12, 10);
    }

    drawCustomOrange(ctx, w, h) {
        ctx.fillStyle = '#FFF8E1';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.5;
        const r = Math.min(w, h) * 0.3;
        // 外皮
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#FF8C00'; ctx.fill();
        // 白瓤
        ctx.beginPath(); ctx.arc(cx, cy, r - 8, 0, Math.PI * 2); ctx.fillStyle = '#FFF5E0'; ctx.fill();
        // 果肉楔形
        for (let i = 0; i < 10; i++) {
            const a1 = (i / 10) * Math.PI * 2, a2 = ((i + 1) / 10) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 12, a1, a2); ctx.closePath();
            ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FFA500'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a1) * (r - 12), cy + Math.sin(a1) * (r - 12));
            ctx.strokeStyle = '#FFF5E0'; ctx.lineWidth = 2; ctx.stroke();
        }
        // 叶子
        ctx.beginPath(); ctx.ellipse(cx + r * 0.3, cy - r * 0.6, 15, 8, 0.5, 0, Math.PI * 2); ctx.fillStyle = '#228B22'; ctx.fill();
        // 籽
        ctx.beginPath(); ctx.arc(cx + 5, cy + 5, 2, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 8, cy - 5, 2, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
    }

    drawCustomLemon(ctx, w, h) {
        ctx.fillStyle = '#FFFFE0';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.5;
        const r = Math.min(w, h) * 0.3;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, r - 8, 0, Math.PI * 2); ctx.fillStyle = '#FFFFE0'; ctx.fill();
        for (let i = 0; i < 8; i++) {
            const a1 = (i / 8) * Math.PI * 2, a2 = ((i + 1) / 8) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 12, a1, a2); ctx.closePath();
            ctx.fillStyle = i % 2 === 0 ? '#FFFF00' : '#FFFACD'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a1) * (r - 12), cy + Math.sin(a1) * (r - 12));
            ctx.strokeStyle = '#FFFFE0'; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(cx + r * 0.4, cy - r * 0.5, 12, 6, 0.3, 0, Math.PI * 2); ctx.fillStyle = '#228B22'; ctx.fill();
    }

    drawCustomStrawberry(ctx, w, h) {
        ctx.fillStyle = '#FFF0F5';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.5;
        // 草莓主体（心形）
        ctx.beginPath();
        ctx.moveTo(cx, cy - 70);
        ctx.bezierCurveTo(cx + 50, cy - 40, cx + 55, cy + 20, cx + 30, cy + 50);
        ctx.bezierCurveTo(cx + 10, cy + 70, cx - 10, cy + 70, cx - 30, cy + 50);
        ctx.bezierCurveTo(cx - 55, cy + 20, cx - 50, cy - 40, cx, cy - 70);
        ctx.closePath(); ctx.fillStyle = '#DC143C'; ctx.fill();
        // 高光
        ctx.beginPath(); ctx.ellipse(cx - 15, cy - 30, 8, 15, -0.3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
        // 叶子
        ctx.fillStyle = '#228B22';
        ctx.beginPath(); ctx.ellipse(cx - 15, cy - 72, 12, 6, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 10, cy - 75, 10, 5, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx, cy - 78, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
        // 籽
        const seeds = [[cx - 15, cy - 40], [cx + 10, cy - 35], [cx - 5, cy - 15], [cx + 20, cy - 10], [cx - 25, cy - 5], [cx + 5, cy + 5], [cx - 15, cy + 15], [cx + 18, cy + 20], [cx, cy + 30], [cx - 20, cy + 35], [cx + 12, cy + 40], [cx - 8, cy + 48]];
        seeds.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill(); });
        // 盘子
        ctx.beginPath(); ctx.ellipse(cx, cy + 65, 50, 10, 0, 0, Math.PI * 2); ctx.fillStyle = '#DDD'; ctx.fill();
    }

    drawCustomFish(ctx, w, h) {
        ctx.fillStyle = '#00BFFF';
        ctx.fillRect(0, 0, w, h);
        // 水泡
        for (let i = 0; i < 6; i++) {
            const x = Math.random() * w, y = Math.random() * h * 0.4, br = Math.random() * 5 + 3;
            ctx.beginPath(); ctx.arc(x, y, br, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
        }
        // 海草
        ctx.strokeStyle = '#228B22'; ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
            const x = w * 0.15 + i * w * 0.25;
            ctx.beginPath(); ctx.moveTo(x, h); ctx.quadraticCurveTo(x + 10, h * 0.7, x - 5, h * 0.5); ctx.stroke();
        }
        const cx = w * 0.5, cy = h * 0.5;
        // 鱼身
        ctx.beginPath(); ctx.ellipse(cx, cy, 55, 30, 0, 0, Math.PI * 2); ctx.fillStyle = '#FF8C00'; ctx.fill();
        // 鱼鳞纹理
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                ctx.beginPath(); ctx.arc(cx - 15 + i * 18, cy - 8 + j * 16, 8, 0, Math.PI, true);
                ctx.strokeStyle = '#E6732E'; ctx.lineWidth = 2; ctx.stroke();
            }
        }
        // 尾巴
        ctx.beginPath(); ctx.moveTo(cx - 50, cy); ctx.lineTo(cx - 80, cy - 20); ctx.lineTo(cx - 80, cy + 20); ctx.closePath();
        ctx.fillStyle = '#FF8C00'; ctx.fill();
        // 鳍
        ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.lineTo(cx - 15, cy - 45); ctx.lineTo(cx + 10, cy - 35); ctx.closePath();
        ctx.fillStyle = '#FFA500'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx, cy + 25); ctx.lineTo(cx - 10, cy + 40); ctx.lineTo(cx + 10, cy + 35); ctx.closePath();
        ctx.fillStyle = '#FFA500'; ctx.fill();
        // 眼睛
        ctx.beginPath(); ctx.arc(cx + 35, cy - 8, 7, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 37, cy - 8, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 嘴巴
        ctx.beginPath(); ctx.arc(cx + 50, cy + 3, 4, 0, Math.PI); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    drawCustomButterfly(ctx, w, h) {
        ctx.fillStyle = '#E6F3FF';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.5;
        // 上左翅膀
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.bezierCurveTo(cx - 20, cy - 60, cx - 70, cy - 70, cx - 60, cy - 20); ctx.bezierCurveTo(cx - 55, cy + 5, cx - 30, cy + 5, cx, cy); ctx.closePath();
        ctx.fillStyle = '#FF69B4'; ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
        // 上右翅膀
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.bezierCurveTo(cx + 20, cy - 60, cx + 70, cy - 70, cx + 60, cy - 20); ctx.bezierCurveTo(cx + 55, cy + 5, cx + 30, cy + 5, cx, cy); ctx.closePath();
        ctx.fillStyle = '#9370DB'; ctx.fill(); ctx.stroke();
        // 下左翅膀
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.bezierCurveTo(cx - 15, cy + 40, cx - 50, cy + 50, cx - 40, cy + 15); ctx.bezierCurveTo(cx - 35, cy + 5, cx - 20, cy + 5, cx, cy); ctx.closePath();
        ctx.fillStyle = '#FF1493'; ctx.fill(); ctx.stroke();
        // 下右翅膀
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.bezierCurveTo(cx + 15, cy + 40, cx + 50, cy + 50, cx + 40, cy + 15); ctx.bezierCurveTo(cx + 35, cy + 5, cx + 20, cy + 5, cx, cy); ctx.closePath();
        ctx.fillStyle = '#8A2BE2'; ctx.fill(); ctx.stroke();
        // 翅膀花纹
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(cx - 40, cy - 35, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 40, cy - 35, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 25, cy + 20, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 25, cy + 20, 3, 0, Math.PI * 2); ctx.fill();
        // 身体
        ctx.beginPath(); ctx.ellipse(cx, cy, 5, 30, 0, 0, Math.PI * 2); ctx.fillStyle = '#333'; ctx.fill();
        // 头
        ctx.beginPath(); ctx.arc(cx, cy - 32, 8, 0, Math.PI * 2); ctx.fillStyle = '#333'; ctx.fill();
        // 触角
        ctx.beginPath(); ctx.moveTo(cx - 3, cy - 38); ctx.quadraticCurveTo(cx - 12, cy - 50, cx - 8, cy - 58); ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 3, cy - 38); ctx.quadraticCurveTo(cx + 12, cy - 50, cx + 8, cy - 58); ctx.stroke();
        // 触角球
        ctx.beginPath(); ctx.arc(cx - 8, cy - 58, 3, 0, Math.PI * 2); ctx.fillStyle = '#333'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 8, cy - 58, 3, 0, Math.PI * 2); ctx.fillStyle = '#333'; ctx.fill();
    }

    drawCustomGoldfish(ctx, w, h) {
        ctx.fillStyle = '#1E3A5F';
        ctx.fillRect(0, 0, w, h);
        // 水泡
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * w, y = Math.random() * h;
            ctx.beginPath(); ctx.arc(x, y, Math.random() * 5 + 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
        }
        const cx = w * 0.5, cy = h * 0.5;
        // 鱼身
        ctx.beginPath(); ctx.ellipse(cx, cy, 50, 30, 0, 0, Math.PI * 2); ctx.fillStyle = '#FF4500'; ctx.fill();
        // 鱼鳞
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 2; j++) {
                ctx.beginPath(); ctx.arc(cx - 20 + i * 16, cy - 10 + j * 20, 7, 0, Math.PI, true);
                ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5; ctx.stroke();
            }
        }
        // 尾巴（飘逸）
        ctx.beginPath(); ctx.moveTo(cx - 45, cy); ctx.quadraticCurveTo(cx - 80, cy - 30, cx - 75, cy); ctx.quadraticCurveTo(cx - 80, cy + 30, cx - 45, cy);
        ctx.fillStyle = '#FF6347'; ctx.fill();
        // 背鳍
        ctx.beginPath(); ctx.moveTo(cx - 10, cy - 28); ctx.quadraticCurveTo(cx + 10, cy - 55, cx + 30, cy - 25); ctx.closePath();
        ctx.fillStyle = '#FF6347'; ctx.fill();
        // 腹鳍
        ctx.beginPath(); ctx.moveTo(cx - 5, cy + 25); ctx.quadraticCurveTo(cx + 5, cy + 45, cx + 20, cy + 28); ctx.closePath();
        ctx.fillStyle = '#FF6347'; ctx.fill();
        // 眼睛（突出）
        ctx.beginPath(); ctx.arc(cx + 35, cy - 8, 9, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 37, cy - 8, 5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 嘴巴
        ctx.beginPath(); ctx.arc(cx + 48, cy + 3, 4, 0, Math.PI); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    drawCustomBee(ctx, w, h) {
        ctx.fillStyle = '#E8F5E9';
        ctx.fillRect(0, 0, w, h);
        // 花朵背景
        for (let i = 0; i < 5; i++) {
            const x = w * 0.15 + i * w * 0.18, y = h * (0.75 + Math.random() * 0.15);
            ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fillStyle = '#FF69B4'; ctx.fill();
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
            ctx.strokeStyle = '#228B22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 25); ctx.stroke();
        }
        const cx = w * 0.5, cy = h * 0.4;
        // 身体
        ctx.beginPath(); ctx.ellipse(cx, cy, 28, 20, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
        // 条纹
        ctx.fillStyle = '#333'; ctx.fillRect(cx - 20, cy - 15, 6, 30); ctx.fillRect(cx - 5, cy - 18, 6, 36); ctx.fillRect(cx + 10, cy - 15, 6, 30);
        // 头
        ctx.beginPath(); ctx.arc(cx + 25, cy, 14, 0, Math.PI * 2); ctx.fillStyle = '#333'; ctx.fill();
        // 眼睛
        ctx.beginPath(); ctx.arc(cx + 28, cy - 4, 4, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 29, cy - 4, 2, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 翅膀（透明）
        ctx.beginPath(); ctx.ellipse(cx - 5, cy - 18, 18, 10, -0.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200,230,255,0.6)'; ctx.fill(); ctx.strokeStyle = 'rgba(100,150,200,0.4)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx + 5, cy - 18, 18, 10, 0.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200,230,255,0.6)'; ctx.fill(); ctx.stroke();
        // 触角
        ctx.beginPath(); ctx.moveTo(cx + 32, cy - 8); ctx.quadraticCurveTo(cx + 42, cy - 18, cx + 38, cy - 25); ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 32, cy + 2); ctx.quadraticCurveTo(cx + 42, cy + 8, cx + 38, cy + 15); ctx.stroke();
        // 尾刺
        ctx.beginPath(); ctx.moveTo(cx - 28, cy); ctx.lineTo(cx - 40, cy - 5); ctx.lineTo(cx - 40, cy + 5); ctx.closePath(); ctx.fillStyle = '#333'; ctx.fill();
    }

    drawCustomCastle(ctx, w, h) {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, w, h);
        // 太阳
        ctx.beginPath(); ctx.arc(w * 0.88, h * 0.12, 20, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        // 云
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(w * 0.18, h * 0.18, 15, 0, Math.PI * 2); ctx.arc(w * 0.24, h * 0.15, 18, 0, Math.PI * 2); ctx.arc(w * 0.29, h * 0.18, 13, 0, Math.PI * 2); ctx.fill();
        const cx = w * 0.5, cy = h * 0.6;
        // 主塔楼
        ctx.fillStyle = '#D3D3D3'; ctx.fillRect(cx - 30, cy - 60, 60, 90);
        // 屋顶
        ctx.beginPath(); ctx.moveTo(cx - 38, cy - 60); ctx.lineTo(cx, cy - 105); ctx.lineTo(cx + 38, cy - 60); ctx.closePath();
        ctx.fillStyle = '#4169E1'; ctx.fill();
        // 旗帜
        ctx.beginPath(); ctx.moveTo(cx, cy - 105); ctx.lineTo(cx + 25, cy - 95); ctx.lineTo(cx, cy - 90); ctx.closePath();
        ctx.fillStyle = '#FF0000'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx, cy - 105); ctx.lineTo(cx, cy - 115); ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
        // 左塔
        ctx.fillStyle = '#C0C0C0'; ctx.fillRect(cx - 65, cy - 20, 35, 50);
        ctx.beginPath(); ctx.moveTo(cx - 72, cy - 20); ctx.lineTo(cx - 47.5, cy - 55); ctx.lineTo(cx - 23, cy - 20); ctx.closePath();
        ctx.fillStyle = '#4169E1'; ctx.fill();
        // 右塔
        ctx.fillStyle = '#C0C0C0'; ctx.fillRect(cx + 30, cy - 20, 35, 50);
        ctx.beginPath(); ctx.moveTo(cx + 23, cy - 20); ctx.lineTo(cx + 47.5, cy - 55); ctx.lineTo(cx + 72, cy - 20); ctx.closePath();
        ctx.fillStyle = '#4169E1'; ctx.fill();
        // 大门
        ctx.beginPath(); ctx.arc(cx, cy + 30, 18, Math.PI, 0); ctx.fillStyle = '#8B4513'; ctx.fill();
        ctx.fillStyle = '#8B4513'; ctx.fillRect(cx - 18, cy + 30, 36, 25);
        // 窗户
        ctx.fillStyle = '#87CEEB'; ctx.beginPath(); ctx.arc(cx, cy - 30, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 47, cy - 5, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 47, cy - 5, 7, 0, Math.PI * 2); ctx.fill();
        // 城墙
        ctx.fillStyle = '#D3D3D3'; ctx.fillRect(cx - 80, cy + 30, 160, 15);
        // 护城河
        ctx.fillStyle = '#4682B4'; ctx.fillRect(0, h * 0.88, w, h * 0.12);
    }

    drawCustomZebra(ctx, w, h) {
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#228B22'; ctx.fillRect(0, h * 0.82, w, h * 0.18);
        const cx = w * 0.5, cy = h * 0.5;
        // 身体
        ctx.beginPath(); ctx.ellipse(cx, cy + 10, 55, 40, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        // 条纹
        ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
        for (let i = 0; i < 6; i++) {
            const y = cy - 25 + i * 12;
            ctx.beginPath(); ctx.moveTo(cx - 50, y); ctx.lineTo(cx + 50, y + (i % 2 === 0 ? 8 : -8)); ctx.stroke();
        }
        // 头
        ctx.beginPath(); ctx.ellipse(cx + 50, cy - 25, 28, 22, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        // 头条纹
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx + 35, cy - 40); ctx.lineTo(cx + 40, cy - 15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 45, cy - 42); ctx.lineTo(cx + 50, cy - 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 55, cy - 40); ctx.lineTo(cx + 60, cy - 15); ctx.stroke();
        // 眼睛
        ctx.beginPath(); ctx.arc(cx + 58, cy - 28, 4, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 60, cy - 29, 1.5, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        // 鼻子
        ctx.beginPath(); ctx.ellipse(cx + 75, cy - 22, 5, 4, 0, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 耳朵
        ctx.beginPath(); ctx.ellipse(cx + 38, cy - 42, 6, 12, -0.4, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx + 58, cy - 40, 6, 12, 0.3, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.stroke();
        // 鬃毛
        ctx.fillStyle = '#000';
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx + 30 + i * 8, cy - 50 - i * 2, 4, 0, Math.PI * 2); ctx.fill(); }
        // 腿
        ctx.fillStyle = '#FFF'; ctx.fillRect(cx - 30, cy + 45, 10, 35); ctx.fillRect(cx - 5, cy + 45, 10, 35);
        ctx.fillRect(cx + 15, cy + 45, 10, 35); ctx.fillRect(cx + 35, cy + 45, 10, 35);
        // 腿条纹
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const lx = cx - 30 + i * 22;
            ctx.beginPath(); ctx.moveTo(lx, cy + 50); ctx.lineTo(lx + 10, cy + 58); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lx, cy + 62); ctx.lineTo(lx + 10, cy + 70); ctx.stroke();
        }
        // 尾巴
        ctx.beginPath(); ctx.moveTo(cx - 50, cy); ctx.quadraticCurveTo(cx - 75, cy - 20, cx - 70, cy - 45); ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - 70, cy - 45, 6, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
    }

    drawCustomLeopard(ctx, w, h) {
        ctx.fillStyle = '#D2B48C';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#228B22'; ctx.fillRect(0, h * 0.82, w, h * 0.18);
        const cx = w * 0.5, cy = h * 0.5;
        // 身体
        ctx.beginPath(); ctx.ellipse(cx, cy + 10, 50, 40, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        // 斑点
        const spots = [[cx - 25, cy - 10], [cx + 15, cy - 15], [cx - 10, cy + 10], [cx + 30, cy + 5], [cx - 30, cy + 25], [cx + 5, cy + 25], [cx - 15, cy + 35], [cx + 25, cy + 30], [cx - 5, cy - 5], [cx + 20, cy - 25]];
        spots.forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 8, 5, Math.random(), 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill(); });
        // 头
        ctx.beginPath(); ctx.ellipse(cx + 48, cy - 25, 28, 24, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        // 头斑点
        ctx.beginPath(); ctx.ellipse(cx + 40, cy - 32, 4, 3, 0, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 55, cy - 28, 4, 3, 0.5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 50, cy - 18, 4, 3, -0.3, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 眼睛
        ctx.beginPath(); ctx.ellipse(cx + 55, cy - 32, 5, 6, 0, 0, Math.PI * 2); ctx.fillStyle = '#228B22'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 57, cy - 33, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 鼻子
        ctx.beginPath(); ctx.ellipse(cx + 72, cy - 22, 4, 3, 0, 0, Math.PI * 2); ctx.fillStyle = '#FF69B4'; ctx.fill();
        // 耳朵
        ctx.beginPath(); ctx.ellipse(cx + 32, cy - 42, 7, 12, -0.5, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 58, cy - 40, 7, 12, 0.3, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
        // 腿
        ctx.fillStyle = '#FFD700'; ctx.fillRect(cx - 28, cy + 45, 10, 32); ctx.fillRect(cx - 5, cy + 45, 10, 32);
        ctx.fillRect(cx + 15, cy + 45, 10, 32); ctx.fillRect(cx + 35, cy + 45, 10, 32);
        // 尾巴
        ctx.beginPath(); ctx.moveTo(cx - 48, cy + 5); ctx.quadraticCurveTo(cx - 75, cy - 15, cx - 68, cy - 40); ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 8; ctx.stroke();
    }

    drawCustomCow(ctx, w, h) {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#90EE90'; ctx.fillRect(0, h * 0.82, w, h * 0.18);
        // 远山
        ctx.fillStyle = '#228B22';
        ctx.beginPath(); ctx.moveTo(0, h * 0.82); ctx.lineTo(w * 0.2, h * 0.65); ctx.lineTo(w * 0.4, h * 0.72); ctx.lineTo(w * 0.6, h * 0.6); ctx.lineTo(w * 0.8, h * 0.7); ctx.lineTo(w, h * 0.62); ctx.lineTo(w, h * 0.82); ctx.closePath(); ctx.fill();
        const cx = w * 0.5, cy = h * 0.5;
        // 身体
        ctx.beginPath(); ctx.ellipse(cx, cy + 5, 55, 42, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        // 斑点
        const cSpots = [[cx - 25, cy - 10], [cx + 20, cy - 15], [cx - 10, cy + 15], [cx + 35, cy + 10], [cx - 35, cy + 20], [cx + 5, cy - 25]];
        cSpots.forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 10, 7, Math.random(), 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill(); });
        // 头
        ctx.beginPath(); ctx.ellipse(cx + 50, cy - 20, 26, 30, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        // 头斑点
        ctx.beginPath(); ctx.ellipse(cx + 42, cy - 32, 6, 4, 0, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 58, cy - 10, 5, 4, 0.5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 眼睛
        ctx.beginPath(); ctx.arc(cx + 58, cy - 28, 4, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 59, cy - 28, 2, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 鼻子
        ctx.beginPath(); ctx.ellipse(cx + 72, cy - 18, 5, 4, 0, 0, Math.PI * 2); ctx.fillStyle = '#FF69B4'; ctx.fill();
        // 鼻孔
        ctx.beginPath(); ctx.arc(cx + 70, cy - 18, 1.5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 74, cy - 18, 1.5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 耳朵
        ctx.beginPath(); ctx.ellipse(cx + 32, cy - 38, 8, 14, -0.5, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 60, cy - 36, 8, 14, 0.3, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        // 角
        ctx.beginPath(); ctx.moveTo(cx + 35, cy - 48); ctx.lineTo(cx + 30, cy - 62); ctx.strokeStyle = '#D2B48C'; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 60, cy - 46); ctx.lineTo(cx + 65, cy - 60); ctx.strokeStyle = '#D2B48C'; ctx.lineWidth = 4; ctx.stroke();
        // 腿
        ctx.fillStyle = '#FFF'; ctx.fillRect(cx - 30, cy + 42, 12, 32); ctx.fillRect(cx - 5, cy + 42, 12, 32);
        ctx.fillRect(cx + 15, cy + 42, 12, 32); ctx.fillRect(cx + 38, cy + 42, 12, 32);
        // 腿斑点
        ctx.beginPath(); ctx.ellipse(cx - 24, cy + 48, 4, 3, 0, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 42, cy + 52, 4, 3, 0, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 尾巴
        ctx.beginPath(); ctx.moveTo(cx - 52, cy); ctx.quadraticCurveTo(cx - 80, cy - 15, cx - 72, cy - 35); ctx.strokeStyle = '#FFF'; ctx.lineWidth = 8; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - 72, cy - 35, 5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 铃铛
        ctx.beginPath(); ctx.arc(cx + 48, cy + 8, 6, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
    }

    drawCustomPeacock(ctx, w, h) {
        ctx.fillStyle = '#E0F7FA';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.55;
        // 身体
        ctx.beginPath(); ctx.ellipse(cx, cy, 22, 35, 0, 0, Math.PI * 2); ctx.fillStyle = '#4169E1'; ctx.fill();
        // 脖子
        ctx.beginPath(); ctx.ellipse(cx, cy - 38, 10, 20, 0, 0, Math.PI * 2); ctx.fillStyle = '#4169E1'; ctx.fill();
        // 头
        ctx.beginPath(); ctx.ellipse(cx + 5, cy - 60, 14, 10, 0.3, 0, Math.PI * 2); ctx.fillStyle = '#4169E1'; ctx.fill();
        // 冠羽
        ctx.fillStyle = '#4169E1';
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(cx - 5 + i * 5, cy - 72, 2, 8, (i - 2) * 0.3, 0, Math.PI * 2); ctx.fill(); }
        // 眼睛
        ctx.beginPath(); ctx.arc(cx + 10, cy - 62, 3, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 11, cy - 62, 1.5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        // 嘴巴
        ctx.beginPath(); ctx.moveTo(cx + 18, cy - 60); ctx.lineTo(cx + 28, cy - 58); ctx.lineTo(cx + 18, cy - 56); ctx.closePath();
        ctx.fillStyle = '#FF8C00'; ctx.fill();
        // 尾巴（扇形展开）
        const tailColors = ['#4169E1','#00CED1','#FFD700','#FF69B4','#9370DB'];
        for (let i = 0; i < 7; i++) {
            const a = -Math.PI * 0.6 + (i / 6) * Math.PI * 1.2;
            const tx = cx + Math.cos(a) * 70, ty = cy - 50 + Math.sin(a) * 30;
            ctx.beginPath(); ctx.ellipse(tx, ty, 12, 35, a - Math.PI / 2, 0, Math.PI * 2);
            ctx.fillStyle = tailColors[i % tailColors.length]; ctx.fill();
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke();
            // 眼斑
            ctx.beginPath(); ctx.arc(tx, ty + 10, 5, 0, Math.PI * 2); ctx.fillStyle = '#FFD700'; ctx.fill();
            ctx.beginPath(); ctx.arc(tx, ty + 10, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#4169E1'; ctx.fill();
        }
        // 翅膀
        ctx.beginPath(); ctx.ellipse(cx - 25, cy - 5, 28, 18, -0.3, 0, Math.PI * 2); ctx.fillStyle = '#00CED1'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 25, cy - 5, 28, 18, 0.3, 0, Math.PI * 2); ctx.fillStyle = '#00CED1'; ctx.fill();
        // 腿
        ctx.beginPath(); ctx.moveTo(cx - 8, cy + 30); ctx.lineTo(cx - 10, cy + 55); ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 8, cy + 30); ctx.lineTo(cx + 10, cy + 55); ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 3; ctx.stroke();
        // 草地
        ctx.fillStyle = '#90EE90'; ctx.fillRect(0, h * 0.88, w, h * 0.12);
    }

}
