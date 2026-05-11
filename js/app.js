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
    setPuzzleLastTheme(t) { localStorage.setItem('puzzle_lastTheme', t); }
    getPuzzleLastTheme() { return localStorage.getItem('puzzle_lastTheme'); }
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
        this.themes = {
            rainbow: { name: '彩虹', icon: '🌈', drawer: (ctx, w, h) => this.drawRainbow(ctx, w, h) },
            sunflower: { name: '太阳花', icon: '🌻', drawer: (ctx, w, h) => this.drawSunflower(ctx, w, h) },
            fish: { name: '小鱼', icon: '🐟', drawer: (ctx, w, h) => this.drawFish(ctx, w, h) },
            house: { name: '小房子', icon: '🏠', drawer: (ctx, w, h) => this.drawHouse(ctx, w, h) },
            star: { name: '星星', icon: '⭐', drawer: (ctx, w, h) => this.drawStar(ctx, w, h) },
            balloon: { name: '气球', icon: '🎈', drawer: (ctx, w, h) => this.drawBalloon(ctx, w, h) },
            moon: { name: '月亮', icon: '🌙', drawer: (ctx, w, h) => this.drawMoon(ctx, w, h) },
            cake: { name: '蛋糕', icon: '🍰', drawer: (ctx, w, h) => this.drawCake(ctx, w, h) },
            car: { name: '小汽车', icon: '🚗', drawer: (ctx, w, h) => this.drawCar(ctx, w, h) },
            flower: { name: '花朵', icon: '🌺', drawer: (ctx, w, h) => this.drawFlower(ctx, w, h) },
            elephant: { name: '大象', icon: '🐘', drawer: (ctx, w, h) => this.drawElephant(ctx, w, h) },
            tree: { name: '圣诞树', icon: '🎄', drawer: (ctx, w, h) => this.drawTree(ctx, w, h) },
        };
    }

    init() {
        this.bindEvents();
        this.initDefaults();
    }

    initDefaults() {
        if (!this.lobby.storage.getPuzzleLastTheme()) this.selectTheme('rainbow');
        if (!this.lobby.storage.getPuzzleLastSize()) this.selectSize(3, 20);
    }

    bindEvents() {
        document.querySelectorAll('#puzzle-config-screen .mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectTheme(btn.dataset.theme));
        });
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

    selectTheme(theme) {
        this.state.theme = theme;
        document.querySelectorAll('#puzzle-config-screen .mode-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.theme === theme);
        });
        this.checkStartReady();
        this.lobby.storage.setPuzzleLastTheme(theme);
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
        const ready = this.state.theme && this.state.size;
        document.getElementById('puzzle-start-btn').disabled = !ready;
    }

    startGame() {
        this.hideComplete();
        this.state.pieces = this.generatePieces(this.state.theme, this.state.size);
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

    generatePieces(theme, size) {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        this.themes[theme].drawer(ctx, 400, 400);

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
        this.themes[this.state.theme].drawer(ctx, 400, 400);
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
            const theme = this.themes[this.state.theme];
            this.lobby.speech.speak(`拼对啦！${theme.name}越来越完整了！`, 'zh-CN');
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
        const theme = this.themes[this.state.theme];
        this.lobby.speech.speak(`太棒了！${theme.name}拼图完成啦！获得${this.state.score}分！`, 'zh-CN');
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
        theme.drawer(ctx, 400, 400);
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
        const theme = this.themes[this.state.theme];
        const diffMap = { 2: '入门', 3: '简单', 4: '中等', 5: '困难' };
        document.getElementById('puzzle-theme-display').textContent = `${theme.icon} ${theme.name}`;
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

    // ========== Canvas 图案绘制 ==========
    drawRainbow(ctx, w, h) {
        // 天空背景
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#87CEEB');
        grad.addColorStop(1, '#E0F7FA');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
        const cx = w / 2, cy = h * 0.75, maxR = Math.min(w, h) * 0.48, band = maxR / colors.length;
        colors.forEach((color, i) => {
            ctx.beginPath();
            ctx.arc(cx, cy, maxR - i * band, Math.PI, 0);
            ctx.lineWidth = band;
            ctx.strokeStyle = color;
            ctx.stroke();
        });
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(cx - maxR * 0.3, cy, maxR * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + maxR * 0.3, cy, maxR * 0.12, 0, Math.PI * 2); ctx.fill();
    }

    drawSunflower(ctx, w, h) {
        // 绿色草地背景
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        // 茎
        ctx.fillStyle = '#228B22';
        ctx.fillRect(cx - 4, cy + h * 0.15, 8, h * 0.25);
        // 叶子
        ctx.beginPath(); ctx.ellipse(cx + w * 0.12, cy + h * 0.25, w * 0.08, h * 0.04, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#228B22'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx - w * 0.12, cy + h * 0.3, w * 0.08, h * 0.04, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#228B22'; ctx.fill();
        // 花瓣
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.ellipse(0, -h * 0.18, w * 0.08, h * 0.16, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.restore();
        }
        ctx.beginPath(); ctx.arc(cx, cy, w * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#8B4513'; ctx.fill();
        for (let i = 0; i < 20; i++) {
            const a = Math.random() * Math.PI * 2, r = Math.random() * w * 0.08;
            ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#654321'; ctx.fill();
        }
    }

    drawFish(ctx, w, h) {
        // 海洋背景
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#00BFFF');
        grad.addColorStop(1, '#1E90FF');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 水泡
        for (let i = 0; i < 8; i++) {
            const bx = Math.random() * w, by = Math.random() * h * 0.4, br = Math.random() * 6 + 3;
            ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
        }
        const cx = w / 2, cy = h / 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.25, h * 0.15, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FF8C00'; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.25, cy);
        ctx.lineTo(cx - w * 0.4, cy - h * 0.1);
        ctx.lineTo(cx - w * 0.4, cy + h * 0.1);
        ctx.closePath(); ctx.fillStyle = '#FF8C00'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + w * 0.15, cy - h * 0.05, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'white'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + w * 0.16, cy - h * 0.05, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'black'; ctx.fill();
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                ctx.beginPath();
                ctx.arc(cx - w * 0.05 + i * 15, cy - h * 0.02 + j * 12, 5, 0, Math.PI, true);
                ctx.strokeStyle = '#E6732E'; ctx.lineWidth = 2; ctx.stroke();
            }
        }
    }

    drawHouse(ctx, w, h) {
        // 天空背景
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#87CEEB');
        grad.addColorStop(1, '#B0E0E6');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 太阳
        ctx.beginPath(); ctx.arc(w * 0.85, h * 0.12, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700'; ctx.fill();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(w * 0.85 + Math.cos(a) * 32, h * 0.12 + Math.sin(a) * 32);
            ctx.lineTo(w * 0.85 + Math.cos(a) * 42, h * 0.12 + Math.sin(a) * 42);
            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3; ctx.stroke();
        }
        // 云朵
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(w * 0.15, h * 0.12, 18, 0, Math.PI * 2);
        ctx.arc(w * 0.22, h * 0.1, 22, 0, Math.PI * 2);
        ctx.arc(w * 0.28, h * 0.12, 16, 0, Math.PI * 2);
        ctx.fill();
        const cx = w / 2, cy = h * 0.55;
        // 草地
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(0, cy + h * 0.15, w, h * 0.25);
        // 房子主体
        ctx.fillStyle = '#FFE4B5';
        ctx.fillRect(cx - w * 0.2, cy - h * 0.15, w * 0.4, h * 0.3);
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.25, cy - h * 0.15);
        ctx.lineTo(cx, cy - h * 0.38);
        ctx.lineTo(cx + w * 0.25, cy - h * 0.15);
        ctx.closePath(); ctx.fillStyle = '#FF6347'; ctx.fill();
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(cx - w * 0.05, cy + h * 0.05, w * 0.1, h * 0.1);
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(cx - w * 0.15, cy - h * 0.05, w * 0.08, h * 0.08);
        ctx.fillRect(cx + w * 0.07, cy - h * 0.05, w * 0.08, h * 0.08);
    }

    drawStar(ctx, w, h) {
        ctx.fillStyle = '#1a237e';
        ctx.fillRect(0, 0, w, h);
        this.drawSingleStar(ctx, w / 2, h / 2, 5, w * 0.25, w * 0.1);
        ctx.fillStyle = '#FFD700'; ctx.fill();
        const smallStars = [[w * 0.2, h * 0.2], [w * 0.8, h * 0.25], [w * 0.15, h * 0.75], [w * 0.85, h * 0.7], [w * 0.5, h * 0.15], [w * 0.5, h * 0.85], [w * 0.3, h * 0.5], [w * 0.7, h * 0.5]];
        smallStars.forEach(([x, y]) => {
            ctx.beginPath(); ctx.arc(x, y, Math.random() * 3 + 2, 0, Math.PI * 2);
            ctx.fillStyle = 'white'; ctx.fill();
        });
    }

    drawBalloon(ctx, w, h) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F7FA');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
        const positions = [[w * 0.25, h * 0.3], [w * 0.5, h * 0.25], [w * 0.75, h * 0.35], [w * 0.35, h * 0.6], [w * 0.65, h * 0.55]];
        positions.forEach(([x, y], i) => {
            const color = colors[i % colors.length], r = Math.min(w, h) * 0.1;
            ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
            ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.3, r * 0.2, r * 0.3, -0.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x, y + r * 1.2);
            ctx.quadraticCurveTo(x + 5, y + r * 1.5, x, y + r * 1.8);
            ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.stroke();
        });
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(w * 0.15, h * 0.15, 20, 0, Math.PI * 2);
        ctx.arc(w * 0.22, h * 0.12, 25, 0, Math.PI * 2);
        ctx.arc(w * 0.28, h * 0.15, 18, 0, Math.PI * 2);
        ctx.fill();
    }

    drawMoon(ctx, w, h) {
        // 夜空背景
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0D1B2A');
        grad.addColorStop(1, '#1B263B');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 星星
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * w, y = Math.random() * h * 0.6, r = Math.random() * 2 + 1;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.5 + 0.5) + ')';
            ctx.fill();
        }
        // 弯月
        ctx.beginPath();
        ctx.arc(w * 0.65, h * 0.3, w * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFACD';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w * 0.72, h * 0.25, w * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#1B263B';
        ctx.fill();
        // 山
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(w * 0.2, h * 0.7);
        ctx.lineTo(w * 0.4, h * 0.85);
        ctx.lineTo(w * 0.6, h * 0.65);
        ctx.lineTo(w * 0.8, h * 0.8);
        ctx.lineTo(w, h * 0.7);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = '#2C3E50';
        ctx.fill();
    }

    drawCake(ctx, w, h) {
        // 粉色背景
        ctx.fillStyle = '#FFF0F5';
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h * 0.55;
        // 盘子
        ctx.beginPath();
        ctx.ellipse(cx, cy + h * 0.22, w * 0.35, h * 0.06, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#E0E0E0'; ctx.fill();
        // 底层
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(cx - w * 0.25, cy + h * 0.05, w * 0.5, h * 0.12);
        ctx.beginPath();
        ctx.ellipse(cx, cy + h * 0.05, w * 0.25, h * 0.04, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFB6C1'; ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx, cy + h * 0.17, w * 0.25, h * 0.04, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FF69B4'; ctx.fill();
        // 中层
        ctx.fillStyle = '#FFDAB9';
        ctx.fillRect(cx - w * 0.18, cy - h * 0.05, w * 0.36, h * 0.1);
        ctx.beginPath();
        ctx.ellipse(cx, cy - h * 0.05, w * 0.18, h * 0.03, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFDAB9'; ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx, cy + h * 0.05, w * 0.18, h * 0.03, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFA07A'; ctx.fill();
        // 顶层
        ctx.fillStyle = '#E6E6FA';
        ctx.fillRect(cx - w * 0.12, cy - h * 0.15, w * 0.24, h * 0.1);
        ctx.beginPath();
        ctx.ellipse(cx, cy - h * 0.15, w * 0.12, h * 0.03, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#E6E6FA'; ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx, cy - h * 0.05, w * 0.12, h * 0.03, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#DDA0DD'; ctx.fill();
        // 蜡烛
        ctx.fillStyle = '#FFF';
        ctx.fillRect(cx - 2, cy - h * 0.22, 4, h * 0.07);
        ctx.beginPath(); ctx.arc(cx, cy - h * 0.22, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FF4500'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - h * 0.26, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,200,0,0.4)'; ctx.fill();
        // 樱桃装饰
        const cherries = [[cx - w * 0.2, cy + h * 0.08], [cx + w * 0.2, cy + h * 0.08], [cx - w * 0.1, cy - h * 0.02], [cx + w * 0.1, cy - h * 0.02]];
        cherries.forEach(([x, y]) => {
            ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#DC143C'; ctx.fill();
            ctx.beginPath(); ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
        });
    }

    drawCar(ctx, w, h) {
        // 天空背景
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#87CEEB');
        grad.addColorStop(1, '#B0E0E6');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 马路
        ctx.fillStyle = '#696969';
        ctx.fillRect(0, h * 0.7, w, h * 0.3);
        // 马路标线
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(i * (w / 5) + w * 0.05, h * 0.82, w * 0.1, 4);
        }
        const cx = w / 2, cy = h * 0.6;
        // 车身
        ctx.fillStyle = '#FF4444';
        ctx.fillRect(cx - w * 0.22, cy - h * 0.08, w * 0.44, h * 0.16);
        // 车顶
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.15, cy - h * 0.08);
        ctx.lineTo(cx - w * 0.1, cy - h * 0.18);
        ctx.lineTo(cx + w * 0.1, cy - h * 0.18);
        ctx.lineTo(cx + w * 0.15, cy - h * 0.08);
        ctx.closePath();
        ctx.fillStyle = '#FF4444'; ctx.fill();
        // 车窗
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(cx - w * 0.08, cy - h * 0.16, w * 0.16, h * 0.08);
        // 轮子
        ctx.beginPath(); ctx.arc(cx - w * 0.12, cy + h * 0.08, w * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = '#333'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + w * 0.12, cy + h * 0.08, w * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = '#333'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx - w * 0.12, cy + h * 0.08, w * 0.03, 0, Math.PI * 2);
        ctx.fillStyle = '#AAA'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + w * 0.12, cy + h * 0.08, w * 0.03, 0, Math.PI * 2);
        ctx.fillStyle = '#AAA'; ctx.fill();
        // 车灯
        ctx.beginPath(); ctx.arc(cx + w * 0.22, cy - h * 0.02, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFF00'; ctx.fill();
    }

    drawFlower(ctx, w, h) {
        // 天空背景
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#87CEEB');
        grad.addColorStop(1, '#E0F7FA');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 草地
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(0, h * 0.55, w, h * 0.45);
        const flowers = [
            { x: w * 0.15, y: h * 0.5, color: '#FF69B4', size: 0.08 },
            { x: w * 0.35, y: h * 0.45, color: '#FFD700', size: 0.1 },
            { x: w * 0.55, y: h * 0.52, color: '#FF6347', size: 0.07 },
            { x: w * 0.75, y: h * 0.48, color: '#9370DB', size: 0.09 },
            { x: w * 0.9, y: h * 0.55, color: '#FF1493', size: 0.08 },
            { x: w * 0.25, y: h * 0.65, color: '#FFA500', size: 0.06 },
            { x: w * 0.5, y: h * 0.7, color: '#20B2AA', size: 0.07 },
            { x: w * 0.7, y: h * 0.68, color: '#FF69B4', size: 0.08 },
        ];
        flowers.forEach(f => {
            // 茎
            ctx.beginPath();
            ctx.moveTo(f.x, f.y + h * 0.05);
            ctx.quadraticCurveTo(f.x + 5, f.y + h * 0.15, f.x, f.y + h * 0.25);
            ctx.strokeStyle = '#228B22'; ctx.lineWidth = 3; ctx.stroke();
            // 花瓣
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.ellipse(f.x + Math.cos(a) * w * f.size * 0.6, f.y + Math.sin(a) * h * f.size * 0.6, w * f.size * 0.4, h * f.size * 0.4, 0, 0, Math.PI * 2);
                ctx.fillStyle = f.color; ctx.fill();
            }
            // 花心
            ctx.beginPath(); ctx.arc(f.x, f.y, w * f.size * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = '#8B4513'; ctx.fill();
        });
    }

    drawElephant(ctx, w, h) {
        // 草原背景
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#87CEEB');
        grad.addColorStop(0.6, '#90EE90');
        grad.addColorStop(1, '#228B22');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h * 0.5;
        // 身体
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.22, h * 0.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#A9A9A9'; ctx.fill();
        // 头
        ctx.beginPath();
        ctx.arc(cx + w * 0.15, cy - h * 0.12, w * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = '#A9A9A9'; ctx.fill();
        // 耳朵
        ctx.beginPath();
        ctx.ellipse(cx + w * 0.05, cy - h * 0.18, w * 0.1, h * 0.14, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#B0B0B0'; ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + w * 0.28, cy - h * 0.15, w * 0.08, h * 0.12, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#B0B0B0'; ctx.fill();
        // 鼻子
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.28, cy - h * 0.05);
        ctx.quadraticCurveTo(cx + w * 0.4, cy + h * 0.05, cx + w * 0.32, cy + h * 0.15);
        ctx.strokeStyle = '#A9A9A9'; ctx.lineWidth = 12; ctx.stroke();
        // 眼睛
        ctx.beginPath(); ctx.arc(cx + w * 0.18, cy - h * 0.15, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'white'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + w * 0.19, cy - h * 0.15, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'black'; ctx.fill();
        // 腿
        ctx.fillStyle = '#A9A9A9';
        ctx.fillRect(cx - w * 0.15, cy + h * 0.12, w * 0.06, h * 0.18);
        ctx.fillRect(cx - w * 0.02, cy + h * 0.12, w * 0.06, h * 0.18);
        ctx.fillRect(cx + w * 0.08, cy + h * 0.12, w * 0.06, h * 0.18);
        // 尾巴
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.22, cy);
        ctx.quadraticCurveTo(cx - w * 0.3, cy + h * 0.05, cx - w * 0.28, cy - h * 0.05);
        ctx.strokeStyle = '#A9A9A9'; ctx.lineWidth = 4; ctx.stroke();
    }

    drawTree(ctx, w, h) {
        // 雪地背景
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#B0C4DE');
        grad.addColorStop(0.5, '#E6F3FF');
        grad.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 飘雪
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * w, y = Math.random() * h, r = Math.random() * 3 + 1;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
        }
        const cx = w / 2, cy = h * 0.55;
        // 树干
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(cx - w * 0.04, cy + h * 0.05, w * 0.08, h * 0.25);
        // 树冠三层
        const layers = [
            { y: cy - h * 0.25, r: w * 0.22 },
            { y: cy - h * 0.12, r: w * 0.28 },
            { y: cy + h * 0.02, r: w * 0.32 },
        ];
        layers.forEach(layer => {
            ctx.beginPath();
            ctx.moveTo(cx, layer.y - layer.r * 0.8);
            ctx.lineTo(cx + layer.r, layer.y + layer.r * 0.3);
            ctx.lineTo(cx - layer.r, layer.y + layer.r * 0.3);
            ctx.closePath();
            ctx.fillStyle = '#228B22'; ctx.fill();
        });
        // 装饰球
        const ornaments = [
            [cx - w * 0.08, cy - h * 0.08, '#FF0000'],
            [cx + w * 0.1, cy - h * 0.02, '#FFD700'],
            [cx - w * 0.12, cy + h * 0.05, '#0000FF'],
            [cx + w * 0.06, cy + h * 0.1, '#FF69B4'],
            [cx, cy + h * 0.15, '#FFA500'],
            [cx - w * 0.05, cy - h * 0.18, '#00CED1'],
            [cx + w * 0.15, cy - h * 0.12, '#FF4500'],
        ];
        ornaments.forEach(([x, y, color]) => {
            ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
            ctx.beginPath(); ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
        });
        // 星星顶
        this.drawSingleStar(ctx, cx, cy - h * 0.32, 5, w * 0.08, w * 0.03);
        ctx.fillStyle = '#FFD700'; ctx.fill();
    }

    drawSingleStar(ctx, cx, cy, spikes, outerR, innerR) {
        let rot = Math.PI / 2 * 3, x = cx, y = cy, step = Math.PI / spikes;
        ctx.beginPath(); ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerR; y = cy + Math.sin(rot) * outerR;
            ctx.lineTo(x, y); rot += step;
            x = cx + Math.cos(rot) * innerR; y = cy + Math.sin(rot) * innerR;
            ctx.lineTo(x, y); rot += step;
        }
        ctx.lineTo(cx, cy - outerR); ctx.closePath();
    }
}
