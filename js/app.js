/**
 * 果果数独 - 主应用逻辑
 * 支持 4x4、6x6、9x9，三种画面模式，语音教学
 */

class BabySudoku {
    constructor() {
        this.engine = new SudokuEngine();
        this.storage = new GameStorage();
        this.speech = new SpeechManager();
        this.sound = new SoundManager();
        
        // 拖拽状态
        this.dragState = {
            isDragging: false,
            draggedValue: null,
            dragElement: null,
            sourceBtn: null,
            startX: 0,
            startY: 0,
            longPressTimer: null,
            hasMoved: false,
            preventClick: false,
        };
        
        // 游戏状态
        this.state = {
            mode: null,        // 'fruit' | 'animal' | 'number'
            size: null,        // 4 | 6 | 9
            score: 0,          // 本局得分
            totalScore: this.storage.getTotalScore(),
            puzzle: null,      // 当前谜题
            solution: null,    // 答案
            userBoard: null,   // 用户填写的棋盘
            selectedCell: null,
            selectedValue: null,
            hintsUsed: 0,
            isComplete: false,
            history: [],       // 撤销历史
        };
        
        // 画面模式定义
        this.modes = {
            fruit: {
                name: '水果乐园',
                icon: '🍎',
                items: ['🍎', '🍊', '🍌', '🥝', '🫐', '🍇', '🍋', '🍓', '🍑'],
                names: {
                    'zh': ['苹果', '橘子', '香蕉', '猕猴桃', '蓝莓', '葡萄', '柠檬', '草莓', '桃子'],
                    'en': ['Apple', 'Orange', 'Banana', 'Kiwi', 'Blueberry', 'Grape', 'Lemon', 'Strawberry', 'Peach']
                }
            },
            animal: {
                name: '动物世界',
                icon: '🐼',
                items: ['🐼', '🦁', '🐸', '🦀', '🐥', '🐳', '🐙', '🐞', '🦋'],
                names: {
                    'zh': ['熊猫', '狮子', '青蛙', '螃蟹', '小鸡', '鲸鱼', '章鱼', '瓢虫', '蝴蝶'],
                    'en': ['Panda', 'Lion', 'Frog', 'Crab', 'Chick', 'Whale', 'Octopus', 'Ladybug', 'Butterfly']
                }
            },
            number: {
                name: '数字王国',
                icon: '🔢',
                items: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
                names: {
                    'zh': ['一', '二', '三', '四', '五', '六', '七', '八', '九'],
                    'en': ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
                }
            }
        };
        
        // 难度配置
        this.difficulties = {
            4: { name: '入门', score: 10 },
            6: { name: '简单', score: 20 },
            9: { name: '困难', score: 50 }
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.initDefaults();
        this.loadSavedGame();
        this.updateScoreDisplay();
    }
    
    initDefaults() {
        // 首次访问时，语音和音效默认开启
        if (localStorage.getItem('sudoku_voiceEnabled') === null) {
            this.storage.setVoiceEnabled(true);
            this.speech.setEnabled(true);
        }
        if (localStorage.getItem('sudoku_soundEnabled') === null) {
            this.storage.setSoundEnabled(true);
            this.sound.setEnabled(true);
        }
        // 首次访问时，默认选中数字王国 + 入门(4x4)
        if (!this.storage.getLastMode()) {
            this.selectMode('number');
        }
        if (!this.storage.getLastSize()) {
            this.selectDifficulty(4, 10);
        }
    }
    
    // ========== 事件绑定 ==========
    bindEvents() {
        // 桌面端：全局鼠标拖拽跟踪
        document.addEventListener('mousemove', (e) => this.onInputMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onInputMouseUp(e));
        
        // 模式选择
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = btn.dataset.mode;
                this.selectMode(mode);
                this.speakModeName(mode);
            });
        });
        
        // 难度选择
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const size = parseInt(btn.dataset.size);
                const score = parseInt(btn.dataset.score);
                this.selectDifficulty(size, score);
            });
        });
        
        // 开始游戏
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startGame();
        });
        
        // 返回按钮
        document.getElementById('back-btn').addEventListener('click', () => {
            this.showConfirm('确认返回', '返回后进度会保存，确定要返回吗？', () => {
                this.saveGame();
                this.showScreen('start-screen');
            });
        });
        
        // 提示按钮
        document.getElementById('hint-btn').addEventListener('click', () => {
            this.showHint();
        });
        
        // 撤销按钮
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undo();
        });
        
        // 新局按钮
        document.getElementById('newgame-btn').addEventListener('click', () => {
            this.showConfirm('新开一局', '确定要开始新的一局吗？', () => {
                this.startGame();
            });
        });
        
        // 帮助按钮
        document.getElementById('help-btn-start').addEventListener('click', () => {
            this.showTutorial();
        });
        document.getElementById('help-btn-game').addEventListener('click', () => {
            this.showTutorial();
        });
        
        // 设置按钮
        document.getElementById('settings-btn-start').addEventListener('click', () => {
            this.showSettings();
        });
        
        // 继续上局
        document.getElementById('continue-btn').addEventListener('click', () => {
            this.continueGame();
        });
        
        // 弹窗关闭
        document.getElementById('tutorial-close').addEventListener('click', () => {
            this.hideOverlay('tutorial-overlay');
            this.storage.setTutorialShown(true);
        });
        document.getElementById('settings-close').addEventListener('click', () => {
            this.hideOverlay('settings-overlay');
        });
        document.getElementById('error-close').addEventListener('click', () => {
            this.hideOverlay('error-overlay');
        });
        document.getElementById('hint-close').addEventListener('click', () => {
            this.hideOverlay('hint-overlay');
        });
        document.getElementById('win-close').addEventListener('click', () => {
            this.hideOverlay('win-overlay');
            this.showScreen('start-screen');
        });
        
        // 确认弹窗
        document.getElementById('confirm-yes').addEventListener('click', () => {
            if (this.confirmCallback) this.confirmCallback();
            this.hideOverlay('confirm-overlay');
        });
        document.getElementById('confirm-no').addEventListener('click', () => {
            this.hideOverlay('confirm-overlay');
        });
        
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
        
        // 点击遮罩关闭弹窗
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
    
    // ========== 模式与难度选择 ==========
    selectMode(mode) {
        this.state.mode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.mode === mode);
        });
        this.checkStartReady();
        this.storage.setLastMode(mode);
    }
    
    selectDifficulty(size, score) {
        this.state.size = size;
        this.state.baseScore = score;
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.size) === size);
        });
        this.checkStartReady();
        this.storage.setLastSize(size);
    }
    
    checkStartReady() {
        const ready = this.state.mode && this.state.size;
        document.getElementById('start-btn').disabled = !ready;
    }
    
    // ========== 游戏流程 ==========
    startGame() {
        // 生成谜题
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
        
        // 渲染游戏
        this.renderBoard();
        this.renderInputPad();
        this.updateHeader();
        this.updateScoreDisplay();
        this.showScreen('game-screen');
        
        // 检查是否首次切换该模式，是则显示教学
        const shownModes = this.storage.getShownModes();
        if (!shownModes.includes(this.state.mode)) {
            setTimeout(() => this.showTutorial(), 500);
            this.storage.addShownMode(this.state.mode);
        }
    }
    
    continueGame() {
        const saved = this.storage.getSavedGame();
        if (saved) {
            this.state = { ...this.state, ...saved };
            this.renderBoard();
            this.renderInputPad();
            this.updateHeader();
            this.updateScoreDisplay();
            this.showScreen('game-screen');
        }
    }
    
    // ========== 渲染 ==========
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
                
                // 宫格粗边框
                const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
                const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
                if ((c + 1) % boxCols === 0 && c !== size - 1) {
                    cell.classList.add('border-right');
                }
                if ((r + 1) % boxRows === 0 && r !== size - 1) {
                    cell.classList.add('border-bottom');
                }
                
                // 选中状态（仅空格可选中）
                if (this.state.puzzle[r][c] === 0 && this.state.selectedCell && 
                    this.state.selectedCell.row === r && 
                    this.state.selectedCell.col === c) {
                    cell.classList.add('selected');
                }
                
                cell.addEventListener('click', () => this.onCellClick(r, c));
                board.appendChild(cell);
            }
        }
        
        // 恢复高亮
        if (this.state.selectedCell) {
            this.highlightRelated(this.state.selectedCell.row, this.state.selectedCell.col);
        }
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
            
            if (this.state.selectedValue === i + 1) {
                btn.classList.add('selected');
            }
            
            // 桌面端：click 事件
            btn.addEventListener('click', (e) => {
                if (this.dragState && this.dragState.preventClick) {
                    this.dragState.preventClick = false;
                    return;
                }
                this.onInputClick(i + 1);
            });
            
            // 移动端：touch 拖拽事件
            btn.addEventListener('touchstart', (e) => this.onInputTouchStart(e, i + 1), { passive: false });
            btn.addEventListener('touchmove', (e) => this.onInputTouchMove(e), { passive: false });
            btn.addEventListener('touchend', (e) => this.onInputTouchEnd(e), { passive: false });
            btn.addEventListener('touchcancel', () => this.onInputTouchCancel());
            
            // 桌面端：mouse 拖拽事件
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
    
    updateScoreDisplay() {
        document.getElementById('score-display').textContent = this.state.totalScore;
    }
    
    // ========== 交互逻辑 ==========
    onCellClick(row, col) {
        // 固定格子不能选，播报语音
        if (this.state.puzzle[row][col] !== 0) {
            this.speakCell(mode => `${mode.names.zh[this.state.puzzle[row][col] - 1]}`);
            return;
        }
        
        this.state.selectedCell = { row, col };
        
        // 清空之前选中的输入值，避免点击新格子时误填入
        if (this.state.selectedValue !== null) {
            this.state.selectedValue = null;
            this.renderInputPad();
        }
        
        this.renderBoard();
        
        // 高亮同行同列
        this.highlightRelated(row, col);
    }
    
    onInputClick(value) {
        this.state.selectedValue = value;
        this.renderInputPad();
        
        // 如果有选中的空格，立即填入
        if (this.state.selectedCell) {
            const { row, col } = this.state.selectedCell;
            if (this.state.puzzle[row][col] === 0) {
                this.fillCell(row, col, value);
            }
        }
    }
    
    // ========== 拖拽交互 ==========
    onInputTouchStart(e, value) {
        const touch = e.touches[0];
        this.dragState.startX = touch.clientX;
        this.dragState.startY = touch.clientY;
        this.dragState.draggedValue = value;
        this.dragState.hasMoved = false;
        this.dragState.preventClick = false;
        this.dragState.sourceBtn = e.currentTarget;
        
        // 长按计时器，180ms后进入拖拽模式
        this.dragState.longPressTimer = setTimeout(() => {
            if (!this.dragState.isDragging) {
                this.startDrag(e, value);
            }
        }, 180);
    }
    
    onInputTouchMove(e) {
        if (!this.dragState.draggedValue) return;
        
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - this.dragState.startX);
        const dy = Math.abs(touch.clientY - this.dragState.startY);
        
        // 如果移动超过 8px，提前进入拖拽模式
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
            // 短按：阻止后续 click 事件，手动触发点击
            this.dragState.preventClick = true;
            if (!this.dragState.hasMoved && this.dragState.draggedValue) {
                this.onInputClick(this.dragState.draggedValue);
            }
            this.resetDragState();
        }
    }
    
    onInputTouchCancel() {
        clearTimeout(this.dragState.longPressTimer);
        if (this.dragState.isDragging) {
            this.fadeOutDrag();
        }
        this.resetDragState();
    }
    
    // ========== 桌面端鼠标拖拽 ==========
    onInputMouseDown(e, value) {
        e.preventDefault();
        const point = { clientX: e.clientX, clientY: e.clientY };
        this.onInputTouchStart({ touches: [point], currentTarget: e.currentTarget }, value);
        
        // 鼠标没有长按延迟，直接进入拖拽模式
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
        
        // 创建拖拽元素
        const el = document.createElement('div');
        el.className = 'drag-item';
        el.textContent = mode.items[value - 1];
        document.body.appendChild(el);
        this.dragState.dragElement = el;
        
        this.updateDragPosition(touch.clientX, touch.clientY);
        
        // 原按钮视觉反馈
        if (this.dragState.sourceBtn) {
            this.dragState.sourceBtn.classList.add('dragging-source');
        }
        
        // 隐藏选中值的高亮，避免干扰
        this.renderInputPad();
    }
    
    updateDragPosition(x, y) {
        const el = this.dragState.dragElement;
        if (!el) return;
        el.style.left = `${x - el.offsetWidth / 2}px`;
        el.style.top = `${y - el.offsetHeight / 2}px`;
    }
    
    highlightHoverCell(x, y) {
        // 清除之前的高亮
        document.querySelectorAll('.cell.hover-target').forEach(c => c.classList.remove('hover-target'));
        document.querySelectorAll('.cell.hover-invalid').forEach(c => c.classList.remove('hover-invalid'));
        
        const elem = document.elementFromPoint(x, y);
        if (!elem) return;
        
        const cell = elem.closest('.cell');
        if (!cell) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (isNaN(row) || isNaN(col)) return;
        
        // 空格且未填 → 绿色高亮
        if (this.state.puzzle[row][col] === 0 && this.state.userBoard[row][col] === 0) {
            cell.classList.add('hover-target');
        } else {
            // 固定格子或已填 → 红色高亮
            cell.classList.add('hover-invalid');
        }
    }
    
    endDrag(touch) {
        // 清除高亮
        document.querySelectorAll('.cell.hover-target').forEach(c => c.classList.remove('hover-target'));
        document.querySelectorAll('.cell.hover-invalid').forEach(c => c.classList.remove('hover-invalid'));
        
        const x = touch.clientX;
        const y = touch.clientY;
        
        const elem = document.elementFromPoint(x, y);
        if (!elem) {
            this.fadeOutDrag();
            return;
        }
        
        const cell = elem.closest('.cell');
        if (!cell) {
            this.fadeOutDrag();
            return;
        }
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (isNaN(row) || isNaN(col)) {
            this.fadeOutDrag();
            return;
        }
        
        // 只能填到空格
        if (this.state.puzzle[row][col] !== 0 || this.state.userBoard[row][col] !== 0) {
            this.fadeOutDrag();
            return;
        }
        
        const value = this.dragState.draggedValue;
        const isCorrect = this.engine.checkMove(this.state.userBoard, this.state.solution, row, col, value);
        
        if (isCorrect) {
            // 直接填入，原地虚化消失
            this.state.selectedCell = { row, col };
            this.fadeOutDrag();
            this.fillCell(row, col, value);
        } else {
            // 填错：先显示错误反馈，再原地虚化消失
            this.state.selectedCell = { row, col };
            this.renderBoard();
            const cells = document.querySelectorAll('.cell');
            const index = row * this.state.size + col;
            const targetCell = cells[index];
            if (targetCell) {
                targetCell.classList.add('error-shake');
                setTimeout(() => targetCell.classList.remove('error-shake'), 500);
            }
            this.sound.playError();
            
            const mode = this.modes[this.state.mode];
            const itemName = mode.names.zh[value - 1];
            this.speech.speak(`不对，这里不能放${itemName}`, 'zh-CN');
            this.speech.speak('Try again!', 'en-US');
            
            // 原地虚化消失
            this.fadeOutDrag();
            
            // 显示错误弹窗
            setTimeout(() => {
                document.getElementById('error-message').textContent = 
                    `这里不能放${itemName}哦！再想一想吧！`;
                this.showOverlay('error-overlay');
            }, 300);
        }
    }
    
    fadeOutDrag() {
        if (!this.dragState.dragElement) {
            this.removeDragElement();
            return;
        }
        
        const el = this.dragState.dragElement;
        el.classList.add('dragging-fadeout');
        
        setTimeout(() => {
            this.removeDragElement();
        }, 500);
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
    
    highlightRelated(row, col) {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
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
            // 保存历史用于撤销
            this.state.history.push({
                row, col,
                oldValue: this.state.userBoard[row][col],
                newValue: value
            });
            // 填对
            this.state.userBoard[row][col] = value;
            this.renderBoard();
            this.sound.playSuccess();
            
            // 成功动画
            const cells = document.querySelectorAll('.cell');
            const index = row * this.state.size + col;
            cells[index]?.classList.add('success-pop');
            
            // 语音
            const itemName = mode.names.zh[value - 1];
            const itemEn = mode.names.en[value - 1];
            this.speech.speak(`对了！${itemName}`, 'zh-CN');
            this.speech.speak(itemEn, 'en-US');
            
            // 检查是否完成
            if (this.engine.isComplete(this.state.userBoard)) {
                setTimeout(() => this.onWin(), 500);
            }
        } else {
            // 填错
            this.sound.playError();
            
            // 抖动动画
            const cells = document.querySelectorAll('.cell');
            const index = row * this.state.size + col;
            const cell = cells[index];
            cell.classList.add('error-shake');
            setTimeout(() => cell.classList.remove('error-shake'), 500);
            
            // 显示错误弹窗
            const itemName = mode.names.zh[value - 1];
            const correctName = mode.names.zh[this.state.solution[row][col] - 1];
            document.getElementById('error-message').textContent = 
                `这里不能放${itemName}哦！再想一想吧！`;
            this.showOverlay('error-overlay');
            
            // 语音
            this.speech.speak(`不对，这里不能放${itemName}`, 'zh-CN');
            this.speech.speak('Try again!', 'en-US');
        }
        
        this.saveGame();
    }
    
    // ========== 提示系统 ==========
    showHint() {
        if (this.state.isComplete) return;
        
        // 找到未填的格子
        const emptyCells = [];
        for (let r = 0; r < this.state.size; r++) {
            for (let c = 0; c < this.state.size; c++) {
                if (this.state.userBoard[r][c] === 0) {
                    emptyCells.push({ row: r, col: c });
                }
            }
        }
        
        if (emptyCells.length === 0) return;
        
        // 优先提示当前选中的格子
        let target;
        if (this.state.selectedCell && 
            this.state.userBoard[this.state.selectedCell.row][this.state.selectedCell.col] === 0) {
            target = this.state.selectedCell;
        } else {
            target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }
        
        const correctValue = this.state.solution[target.row][target.col];
        const mode = this.modes[this.state.mode];
        const itemName = mode.names.zh[correctValue - 1];
        const itemEn = mode.names.en[correctValue - 1];
        
        // 扣除分数
        this.state.hintsUsed++;
        this.state.score = Math.max(0, this.state.baseScore - this.state.hintsUsed * 2);
        
        // 显示提示
        document.getElementById('hint-message').textContent = 
            `这个格子应该放...`;
        document.getElementById('hint-display').textContent = mode.items[correctValue - 1];
        this.showOverlay('hint-overlay');
        
        // 语音
        this.speech.speak(`这里应该放${itemName}`, 'zh-CN');
        this.speech.speak(itemEn, 'en-US');
        
        // 高亮提示的格子
        this.state.selectedCell = target;
        this.renderBoard();
        const cells = document.querySelectorAll('.cell');
        const index = target.row * this.state.size + target.col;
        cells[index]?.classList.add('hint-target');
    }
    
    // ========== 撤销 ==========
    undo() {
        if (this.state.history.length === 0) return;
        
        const last = this.state.history.pop();
        this.state.userBoard[last.row][last.col] = last.oldValue;
        this.renderBoard();
        this.saveGame();
    }
    
    // ========== 完成 ==========
    onWin() {
        this.state.isComplete = true;
        this.state.totalScore += this.state.score;
        this.storage.setTotalScore(this.state.totalScore);
        this.storage.clearSavedGame();
        this.updateScoreDisplay();
        
        document.getElementById('win-score').textContent = this.state.score;
        this.showOverlay('win-overlay');
        this.sound.playWin();
        this.speech.speak(`太棒了！你完成了！获得${this.state.score}分！`, 'zh-CN');
        this.speech.speak('Congratulations! You did it!', 'en-US');
    }
    
    // ========== 语音 ==========
    speakModeName(mode) {
        const modeData = this.modes[mode];
        this.speech.speak(`${modeData.name}模式`);
    }
    
    speakCell(speakFn) {
        if (!this.state.mode) return;
        const mode = this.modes[this.state.mode];
        const text = speakFn(mode);
        if (text) this.speech.speak(text);
    }
    
    // ========== 弹窗管理 ==========
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        if (screenId === 'start-screen') {
            this.loadSavedGame();
            this.updateScoreDisplay();
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
    
    showTutorial() {
        this.showOverlay('tutorial-overlay');
        this.speech.speak('每一行每一列都不能有重复的图案哦！', 'zh-CN');
        this.speech.speak('No repeating patterns in any row or column!', 'en-US');
    }
    
    showSettings() {
        // 同步开关状态
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
    
    // ========== 存储 ==========
    saveGame() {
        if (this.state.puzzle) {
            this.storage.saveGame({
                mode: this.state.mode,
                size: this.state.size,
                score: this.state.score,
                baseScore: this.state.baseScore,
                puzzle: this.state.puzzle,
                solution: this.state.solution,
                userBoard: this.state.userBoard,
                hintsUsed: this.state.hintsUsed,
                history: this.state.history,
            });
        }
    }
    
    loadSavedGame() {
        const saved = this.storage.getSavedGame();
        const continueBtn = document.getElementById('continue-btn');
        if (saved && saved.puzzle) {
            continueBtn.style.display = 'inline-block';
        } else {
            continueBtn.style.display = 'none';
        }
        
        // 恢复上次的模式和难度选择
        const lastMode = this.storage.getLastMode();
        const lastSize = this.storage.getLastSize();
        if (lastMode) this.selectMode(lastMode);
        if (lastSize) {
            const diffBtn = document.querySelector(`.diff-btn[data-size="${lastSize}"]`);
            if (diffBtn) this.selectDifficulty(lastSize, parseInt(diffBtn.dataset.score));
        }
    }
}

// ========== 语音管理 ==========
class SpeechManager {
    constructor() {
        this.enabled = true;
        this.synth = window.speechSynthesis;
        this.queue = [];
        this.speaking = false;
        
        // 从存储恢复设置
        const saved = localStorage.getItem('sudoku_voiceEnabled');
        if (saved !== null) this.enabled = saved === 'true';
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.synth.cancel();
        }
    }
    
    speak(text, lang = 'zh-CN') {
        if (!this.enabled || !this.synth) return;
        
        this.queue.push({ text, lang });
        if (!this.speaking) {
            this._processQueue();
        }
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
        
        utter.onend = () => {
            setTimeout(() => this._processQueue(), 150);
        };
        
        utter.onerror = () => {
            this._processQueue();
        };
        
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
    
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
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
        } catch (e) {
            // 忽略音频错误
        }
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
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2), i * 120);
        });
    }
}

// ========== 本地存储 ==========
class GameStorage {
    getTotalScore() {
        return parseInt(localStorage.getItem('sudoku_totalScore') || '0');
    }
    
    setTotalScore(score) {
        localStorage.setItem('sudoku_totalScore', score.toString());
    }
    
    saveGame(state) {
        localStorage.setItem('sudoku_savedGame', JSON.stringify(state));
    }
    
    getSavedGame() {
        try {
            return JSON.parse(localStorage.getItem('sudoku_savedGame') || 'null');
        } catch {
            return null;
        }
    }
    
    clearSavedGame() {
        localStorage.removeItem('sudoku_savedGame');
    }
    
    setLastMode(mode) {
        localStorage.setItem('sudoku_lastMode', mode);
    }
    
    getLastMode() {
        return localStorage.getItem('sudoku_lastMode');
    }
    
    setLastSize(size) {
        localStorage.setItem('sudoku_lastSize', size.toString());
    }
    
    getLastSize() {
        const s = localStorage.getItem('sudoku_lastSize');
        return s ? parseInt(s) : null;
    }
    
    setTutorialShown(shown) {
        localStorage.setItem('sudoku_tutorialShown', shown ? 'true' : 'false');
    }
    
    getShownModes() {
        try {
            return JSON.parse(localStorage.getItem('sudoku_shownModes') || '[]');
        } catch {
            return [];
        }
    }
    
    addShownMode(mode) {
        const modes = this.getShownModes();
        if (!modes.includes(mode)) {
            modes.push(mode);
            localStorage.setItem('sudoku_shownModes', JSON.stringify(modes));
        }
    }
    
    setVoiceEnabled(enabled) {
        localStorage.setItem('sudoku_voiceEnabled', enabled ? 'true' : 'false');
    }
    
    getVoiceEnabled() {
        const saved = localStorage.getItem('sudoku_voiceEnabled');
        return saved !== null ? saved === 'true' : true;
    }
    
    setSoundEnabled(enabled) {
        localStorage.setItem('sudoku_soundEnabled', enabled ? 'true' : 'false');
    }
    
    getSoundEnabled() {
        const saved = localStorage.getItem('sudoku_soundEnabled');
        return saved !== null ? saved === 'true' : true;
    }
}

// ========== 启动应用 ==========
document.addEventListener('DOMContentLoaded', () => {
    window.game = new BabySudoku();
});
