// ============================================================================
// Embedded C Learning Platform — Main Application JavaScript
// Pure vanilla JS, no external dependencies
// ============================================================================

// ---------------------------------------------------------------------------
// VISUALIZATION INITIALIZER MAP & TRACKING
// ---------------------------------------------------------------------------
const vizInitializers = {};
const vizRedrawers = {};
/** Stop timers/animations when the user leaves a section */
const vizCleanups = {};
const initializedSections = new Set();

function initVisualization(sectionId) {
    // Small delay to ensure DOM is visible (canvas needs dimensions)
    setTimeout(() => {
        if (vizInitializers[sectionId] && !initializedSections.has(sectionId)) {
            vizInitializers[sectionId]();
            initializedSections.add(sectionId);
        } else if (vizRedrawers[sectionId]) {
            // Already wired — just redraw (e.g. after resize while staying on section)
            vizRedrawers[sectionId]();
        }
    }, 100);
}

function redrawActiveCanvases() {
    // Theme/resize: redraw only — never re-attach listeners
    const activeSection = document.querySelector('.content-section.active');
    if (activeSection && vizRedrawers[activeSection.id]) {
        vizRedrawers[activeSection.id]();
    }
}

// ---------------------------------------------------------------------------
// SIZEOF EXPLORER  (datatypes section)
// ---------------------------------------------------------------------------
function initSizeofExplorer() {
    const explorer = document.getElementById('sizeof-explorer');
    if (!explorer) return;

    const buttons = explorer.querySelectorAll('.sizeof-buttons .btn');
    const display = document.getElementById('sizeof-display');
    if (!display) return;
    const label  = display.querySelector('.sizeof-label');
    const blocks = document.getElementById('byte-blocks');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const size = parseInt(btn.dataset.size);

            if (label) {
                label.textContent = `sizeof(${type}) = ${size} byte${size > 1 ? 's' : ''}`;
            }
            if (blocks) {
                blocks.innerHTML = '';

                const colors = [
                    '#FF6B35', '#00F5D4', '#FFE66D', '#7B2FBE',
                    '#FF006E', '#3B82F6', '#22C55E', '#ADFF2F'
                ];
                for (let i = 0; i < size; i++) {
                    const block = document.createElement('div');
                    block.className = 'byte-block';
                    block.style.background = colors[i % colors.length];
                    block.style.animationDelay = (i * 0.1) + 's';
                    block.textContent = `B${i}`;
                    blocks.appendChild(block);
                }
            }

            // Highlight active button
            buttons.forEach(b => {
                b.style.background = '';
                b.style.color = '';
            });
            btn.style.background = 'var(--accent-orange)';
            btn.style.color = 'white';
        });
    });
}

// ---------------------------------------------------------------------------
// BITWISE CALCULATOR  (bitwise section)
// ---------------------------------------------------------------------------
function initBitwiseCalculator() {
    const inputA     = document.getElementById('bitwise-input-a');
    const inputB     = document.getElementById('bitwise-input-b');
    const result     = document.getElementById('bitwise-result');
    const opSelector = document.getElementById('bitwise-op-selector');
    const valA       = document.getElementById('val-a');
    const valB       = document.getElementById('val-b');
    const valResult  = document.getElementById('val-result');
    const codeOutput = document.getElementById('bit-code-output');

    if (!inputA) return;

    let currentOp = 'and';
    let valueA = 0;
    let valueB = 0;

    function getBitCells(container) {
        return container ? container.querySelectorAll('.bit-cell') : [];
    }

    function getValue(container) {
        let val = 0;
        getBitCells(container).forEach(cell => {
            const bit = parseInt(cell.dataset.bit);
            if (cell.classList.contains('active')) {
                val |= (1 << bit);
            }
        });
        return val;
    }

    function displayValue(val) {
        return `0x${val.toString(16).toUpperCase().padStart(2, '0')} (${val})`;
    }

    function calculate() {
        valueA = getValue(inputA);
        valueB = getValue(inputB);
        let res = 0;
        let codeStr = '';

        switch (currentOp) {
            case 'and':
                res = valueA & valueB;
                codeStr = `result = A & B;  // ${displayValue(res)}`;
                break;
            case 'or':
                res = valueA | valueB;
                codeStr = `result = A | B;  // ${displayValue(res)}`;
                break;
            case 'xor':
                res = valueA ^ valueB;
                codeStr = `result = A ^ B;  // ${displayValue(res)}`;
                break;
            case 'not':
                res = (~valueA) & 0xFF;
                codeStr = `result = (uint8_t)~A;       // ${displayValue(res)}`;
                break;
            case 'lshift':
                res = (valueA << 1) & 0xFF;
                codeStr = `result = (uint8_t)(A << 1); // ${displayValue(res)}`;
                break;
            case 'rshift':
                res = valueA >> 1;
                codeStr = `result = A >> 1; // ${displayValue(res)}`;
                break;
        }

        // Update result display
        getBitCells(result).forEach(cell => {
            const bit = parseInt(cell.dataset.bit);
            const isSet = (res >> bit) & 1;
            cell.textContent = isSet;
            cell.classList.toggle('active', isSet === 1);
        });

        if (valA)      valA.textContent      = displayValue(valueA);
        if (valB)      valB.textContent      = displayValue(valueB);
        if (valResult) valResult.textContent  = displayValue(res);
        if (codeOutput) {
            const codeEl = codeOutput.querySelector('code');
            if (codeEl) codeEl.textContent = codeStr;
        }
    }

    // Click handlers for input bits
    [inputA, inputB].forEach(container => {
        if (!container) return;
        getBitCells(container).forEach(cell => {
            cell.addEventListener('click', () => {
                const isActive = cell.classList.toggle('active');
                cell.textContent = isActive ? '1' : '0';
                calculate();
            });
        });
    });

    // Operation selector
    if (opSelector) {
        opSelector.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', () => {
                opSelector.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentOp = btn.dataset.op;
                calculate();
            });
        });
    }

    calculate(); // Initial calculation
}

// ---------------------------------------------------------------------------
// REGISTER EXPLORER  (registers section)
// ---------------------------------------------------------------------------
function initRegisterExplorer() {
    const display = document.getElementById('register-display');
    const hexVal  = document.getElementById('reg-hex-value');
    const binVal  = document.getElementById('reg-bin-value');
    const codeEl  = document.getElementById('register-code');

    if (!display) return;

    // STM32F4 GPIOA->MODER reset value: PA13/PA14/PA15 = AF (SWD/JTAG debug pins)
    const RESET_BITS = new Set([31, 29, 27]);
    const MODE_NAMES = ['Input', 'Output', 'Alt Function', 'Analog'];

    display.querySelectorAll('.reg-bit').forEach(cell => {
        const on = RESET_BITS.has(parseInt(cell.dataset.bit));
        cell.classList.toggle('active', on);
        cell.textContent = on ? '1' : '0';
        cell.addEventListener('click', () => {
            const isActive = cell.classList.toggle('active');
            cell.textContent = isActive ? '1' : '0';
            updateRegisterValue();
        });
    });

    function updateRegisterValue() {
        let val = 0n; // BigInt for 32-bit
        display.querySelectorAll('.reg-bit').forEach(cell => {
            const bit = parseInt(cell.dataset.bit);
            if (cell.classList.contains('active')) {
                val |= (1n << BigInt(bit));
            }
        });

        const hexStr = '0x' + val.toString(16).toUpperCase().padStart(8, '0');
        const binStr = '0b' + val.toString(2).padStart(32, '0');

        if (hexVal) hexVal.textContent = hexStr;
        if (binVal) binVal.textContent = binStr;
        if (codeEl) {
            const code = codeEl.querySelector('code');
            if (code) {
                const lines = [];
                for (let p = 15; p >= 0; p--) {
                    const m = Number((val >> BigInt(p * 2)) & 3n);
                    if (m) lines.push(`// PA${p}: ${MODE_NAMES[m]}${p >= 13 && p <= 15 && m === 2 ? ' (SWD/JTAG, reset default)' : ''}`);
                }
                if (lines.length === 0) lines.push('// All pins Input — ⚠ PA13/PA14 lose SWD: debugger disconnects!');
                code.textContent = `GPIOA->MODER = ${hexStr};\n${lines.join('\n')}`;
            }
        }
    }

    updateRegisterValue();
}

// ---------------------------------------------------------------------------
// GPIO LAB  (registers section)
// ---------------------------------------------------------------------------
function initGpioLab() {
    const leds = [];
    for (let i = 0; i < 8; i++) {
        const led = document.getElementById(`led-${i}`);
        if (led) leds[i] = led;
    }

    const odrValue = document.getElementById('gpio-odr-value');
    if (!odrValue) return;

    let gpioState = 0;
    let animationInterval = null;

    function updateLEDs() {
        for (let i = 0; i < 8; i++) {
            if (leds[i]) {
                leds[i].classList.toggle('on', !!((gpioState >> i) & 1));
            }
        }
        odrValue.textContent = '0x' + gpioState.toString(16).toUpperCase().padStart(2, '0');
    }

    // Click individual LEDs
    leds.forEach((led, i) => {
        if (led) {
            led.addEventListener('click', () => {
                gpioState ^= (1 << i);
                updateLEDs();
            });
        }
    });

    function stopAnimation() {
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
    }

    // Chase pattern
    document.getElementById('gpio-pattern-chase')?.addEventListener('click', () => {
        stopAnimation();
        let pos = 0;
        animationInterval = setInterval(() => {
            gpioState = 1 << (pos % 8);
            updateLEDs();
            pos++;
        }, 150);
    });

    // Blink all
    document.getElementById('gpio-pattern-blink')?.addEventListener('click', () => {
        stopAnimation();
        animationInterval = setInterval(() => {
            gpioState = gpioState === 0xFF ? 0x00 : 0xFF;
            updateLEDs();
        }, 500);
    });

    // Binary counter
    document.getElementById('gpio-pattern-binary')?.addEventListener('click', () => {
        stopAnimation();
        gpioState = 0;
        animationInterval = setInterval(() => {
            gpioState = (gpioState + 1) & 0xFF;
            updateLEDs();
        }, 200);
    });

    // Stop
    document.getElementById('gpio-stop')?.addEventListener('click', stopAnimation);
    vizCleanups['registers'] = stopAnimation;

    // Clear
    document.getElementById('gpio-clear')?.addEventListener('click', () => {
        stopAnimation();
        gpioState = 0;
        updateLEDs();
    });

    updateLEDs();
}

// ---------------------------------------------------------------------------
// MEMORY VISUALIZER  (Canvas — memory section)
// ---------------------------------------------------------------------------
function syncCanvasSize(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    // Without a fixed CSS height the canvas takes its height from the bitmap
    // aspect ratio, so resizing the bitmap would change the layout every frame.
    if (!canvas.dataset.sized) {
        canvas.dataset.sized = '1';
        if (!canvas.classList.contains('proto-scope')) {
            canvas.style.height = (parseInt(canvas.getAttribute('height'), 10) || 200) + 'px';
        }
    }
    // client* excludes the CSS border, matching the drawable area
    const cssW = Math.max(1, canvas.clientWidth);
    const cssH = Math.max(1, canvas.clientHeight);
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, W: cssW, H: cssH };
}

function initMemoryViz() {
    const canvas = document.getElementById('memory-viz-canvas');
    if (!canvas) return;

    let stackItems = [];
    let heapItems  = [];

    function drawSegment(ctx, x, y, w, h, color, label, animPct) {
        const alpha = Math.min(1, animPct !== undefined ? animPct : 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w * alpha, h);
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E6EDF3' : '#CDD6F4';
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = textColor;
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 8, y + h / 2 + 4);
        ctx.globalAlpha = 1;
    }

    function draw() {
        const { ctx, W, H } = syncCanvasSize(canvas);
        const regions = {
            text:     { y: H - 60,  h: 50, color: '#7B2FBE', label: 'TEXT (Code)' },
            data:     { y: H - 110, h: 40, color: '#3B82F6', label: 'DATA' },
            bss:      { y: H - 150, h: 30, color: '#F59E0B', label: 'BSS' },
            heapBase: H - 160,
            stackTop: 20,
        };

        const isDark    = document.body.getAttribute('data-theme') === 'dark';
        const bgColor   = isDark ? '#0D1117' : '#1E1E2E';
        const textColor = isDark ? '#E6EDF3' : '#CDD6F4';

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, W, H);

        ctx.font = '12px "JetBrains Mono", monospace';

        // Draw fixed segments
        const segWidth = W * 0.6;
        const segX     = (W - segWidth) / 2;

        // Text segment
        drawSegment(ctx, segX, regions.text.y, segWidth, regions.text.h, regions.text.color, regions.text.label);
        // Data segment
        drawSegment(ctx, segX, regions.data.y, segWidth, regions.data.h, regions.data.color, regions.data.label);
        // BSS segment
        drawSegment(ctx, segX, regions.bss.y, segWidth, regions.bss.h, regions.bss.color, regions.bss.label);

        // Draw heap items (growing up from BSS)
        let heapY = regions.heapBase;
        heapItems.forEach((item) => {
            heapY -= 25;
            drawSegment(ctx, segX, heapY, segWidth, 22, '#22C55E', item.label, item.anim);
        });

        // Heap arrow
        if (heapItems.length > 0) {
            ctx.fillStyle = '#22C55E';
            ctx.font = '14px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText('↑ Heap grows up', segX + segWidth + 10, heapY + 10);
        }

        // Draw stack items (growing down from top)
        let stackY = regions.stackTop;
        stackItems.forEach((item) => {
            drawSegment(ctx, segX, stackY, segWidth, 22, '#EF4444', item.label, item.anim);
            stackY += 25;
        });

        // Stack arrow
        if (stackItems.length > 0) {
            ctx.fillStyle = '#EF4444';
            ctx.font = '14px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText('↓ Stack grows down', segX + segWidth + 10, stackY - 10);
        }

        // Free memory indicator
        const freeTop    = stackY + 5;
        const freeBottom = heapY - 5;
        if (freeBottom - freeTop > 20) {
            ctx.strokeStyle = '#6E7681';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(segX, freeTop, segWidth, freeBottom - freeTop);
            ctx.setLineDash([]);
            ctx.fillStyle   = '#6E7681';
            ctx.textAlign   = 'center';
            ctx.fillText('Free Memory', segX + segWidth / 2, (freeTop + freeBottom) / 2 + 4);
            ctx.textAlign = 'left';
        }

        if ((stackItems.length || heapItems.length) && !hasRoom()) {
            ctx.fillStyle = '#EF4444';
            ctx.font      = 'bold 12px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚠ Out of RAM — stack would hit heap!', W / 2, (heapY + stackY) / 2 + 4);
            ctx.textAlign = 'left';
        }

        // Flash and SRAM are separate memories — show the gap
        const gapY = regions.text.y - 6;
        ctx.strokeStyle = '#6E7681';
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(segX - 4, gapY);
        ctx.lineTo(segX + segWidth + 4, gapY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Address labels (STM32F407: 128 KB SRAM, Flash at 0x08000000)
        ctx.fillStyle = '#9AA4B2';
        ctx.font      = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('0x20020000', segX - 8, regions.stackTop + 12);
        ctx.fillText('SRAM top', segX - 8, regions.stackTop + 24);
        ctx.fillText('0x20000000', segX - 8, regions.data.y + regions.data.h - 2);
        ctx.fillText('SRAM base', segX - 8, regions.data.y + regions.data.h + 10);
        ctx.fillText('0x08000000', segX - 8, regions.text.y + 18);
        ctx.fillText('Flash', segX - 8, regions.text.y + 30);
        ctx.textAlign = 'left';
    }

    function hasRoom() {
        const H = canvas.clientHeight || 380;
        const nextHeapTop     = (H - 160) - (heapItems.length + 1) * 25;
        const nextStackBottom = 20 + (stackItems.length + 1) * 25;
        return nextHeapTop >= nextStackBottom;
    }

    // Variable name pools
    const stackVarNames = ['local_a', 'buffer[32]', 'counter', 'temp', 'result', 'flags'];
    const heapVarNames  = ['malloc(64)', 'malloc(128)', 'malloc(256)', 'calloc(16,4)', 'malloc(512)'];

    document.getElementById('mem-alloc-stack')?.addEventListener('click', () => {
        if (stackItems.length < 6 && hasRoom()) {
            const name = stackVarNames[stackItems.length % stackVarNames.length];
            stackItems.push({ label: name, anim: 1 });
        }
        draw();
    });

    document.getElementById('mem-alloc-heap')?.addEventListener('click', () => {
        if (heapItems.length < 5 && hasRoom()) {
            const name = heapVarNames[heapItems.length % heapVarNames.length];
            heapItems.push({ label: name, anim: 1 });
        }
        draw();
    });

    // free() only releases heap blocks; stack frames vanish on function return
    document.getElementById('mem-free')?.addEventListener('click', () => {
        if (heapItems.length > 0) heapItems.pop();
        draw();
    });

    document.getElementById('mem-return')?.addEventListener('click', () => {
        if (stackItems.length > 0) stackItems.pop();
        draw();
    });

    document.getElementById('mem-reset')?.addEventListener('click', () => {
        stackItems = [];
        heapItems  = [];
        draw();
    });

    vizRedrawers['memory'] = draw;
    draw();
}

// ---------------------------------------------------------------------------
// POINTER VISUALIZER  (Canvas — pointers section)
// ---------------------------------------------------------------------------
function initPointerViz() {
    const canvas = document.getElementById('pointer-viz-canvas');
    if (!canvas) return;

    let variables = [];
    let pointers  = [];

    const varNames = ['x', 'y', 'z', 'w', 'v'];
    const ptrNames = ['ptr1', 'ptr2', 'ptr3'];

    function draw() {
        const { ctx, W, H } = syncCanvasSize(canvas);
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDark ? '#0D1117' : '#1E1E2E';
        ctx.fillRect(0, 0, W, H);

        const cellW  = Math.max(52, Math.min(80, (W - 40) / 5 - 20));
        const cellH  = 50;
        const startX = 20;
        const startY = 40;

        ctx.fillStyle = '#9AA4B2';
        ctx.font      = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        if (variables.length) ctx.fillText('int32_t variables', startX, 14);
        if (pointers.length)  ctx.fillText('int32_t * pointers (also variables, 4 bytes each)', startX, startY + cellH + 52);

        // Draw variables
        variables.forEach((v, i) => {
            const x = startX + i * (cellW + 20);
            const y = startY;

            // Address label
            ctx.fillStyle = '#6E7681';
            ctx.font      = '9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
                `0x${(0x20000000 + i * 4).toString(16).toUpperCase()}`,
                x + cellW / 2, y - 8
            );

            // Cell
            ctx.fillStyle = v.highlight ? '#FF6B35' : '#3B82F6';
            ctx.fillRect(x, y, cellW, cellH);
            ctx.strokeStyle = '#E6EDF3';
            ctx.lineWidth   = 2;
            ctx.strokeRect(x, y, cellW, cellH);

            // Value
            ctx.fillStyle = '#FFFFFF';
            ctx.font      = 'bold 16px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(v.value.toString(), x + cellW / 2, y + cellH / 2 + 6);

            // Variable name
            ctx.fillStyle = '#A6E3A1';
            ctx.font      = '11px "JetBrains Mono", monospace';
            ctx.fillText(v.name, x + cellW / 2, y + cellH + 18);
        });

        // Draw pointers
        pointers.forEach((p, i) => {
            const ptrX = startX + i * (cellW + 20);
            const ptrY = startY + cellH + 80;

            ctx.fillStyle = '#6E7681';
            ctx.font      = '9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
                `0x${(0x20000100 + i * 4).toString(16).toUpperCase()}`,
                ptrX + cellW / 2, ptrY + cellH + 30
            );

            // Pointer box
            ctx.fillStyle = '#7B2FBE';
            ctx.fillRect(ptrX, ptrY, cellW, cellH);
            ctx.strokeStyle = '#E6EDF3';
            ctx.lineWidth   = 2;
            ctx.strokeRect(ptrX, ptrY, cellW, cellH);

            // Address value
            ctx.fillStyle = '#FFFFFF';
            ctx.font      = '10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
                `0x${(0x20000000 + p.targetIdx * 4).toString(16).toUpperCase()}`,
                ptrX + cellW / 2, ptrY + cellH / 2 + 4
            );

            // Pointer name
            ctx.fillStyle = '#CBA6F7';
            ctx.font      = '11px "JetBrains Mono", monospace';
            ctx.fillText(p.name, ptrX + cellW / 2, ptrY + cellH + 18);

            // Arrow from pointer to target
            ctx.beginPath();
            ctx.strokeStyle = '#FF6B35';
            ctx.lineWidth   = 2;
            const fromX = ptrX + cellW / 2;
            const fromY = ptrY;
            const toX   = startX + p.targetIdx * (cellW + 20) + cellW / 2;
            const toY   = startY + cellH;
            ctx.moveTo(fromX, fromY);
            ctx.quadraticCurveTo(fromX, fromY - 30, toX, toY + 5);
            ctx.stroke();

            // Arrowhead
            ctx.fillStyle = '#FF6B35';
            ctx.beginPath();
            ctx.moveTo(toX,     toY + 5);
            ctx.lineTo(toX - 5, toY + 15);
            ctx.lineTo(toX + 5, toY + 15);
            ctx.fill();
        });

        ctx.textAlign = 'left';
    }

    document.getElementById('ptr-create-var')?.addEventListener('click', () => {
        if (variables.length < 5) {
            variables.push({
                name:      varNames[variables.length],
                value:     Math.floor(Math.random() * 255),
                highlight: false,
            });
            draw();
        }
    });

    document.getElementById('ptr-create-ptr')?.addEventListener('click', () => {
        if (variables.length > 0 && pointers.length < 3) {
            pointers.push({
                name:      ptrNames[pointers.length],
                targetIdx: variables.length - 1,
            });
            draw();
        }
    });

    document.getElementById('ptr-deref')?.addEventListener('click', () => {
        if (pointers.length > 0) {
            const ptr = pointers[pointers.length - 1];
            if (variables[ptr.targetIdx]) {
                variables[ptr.targetIdx].value     = Math.floor(Math.random() * 255);
                variables[ptr.targetIdx].highlight = true;
                draw();
                setTimeout(() => {
                    if (variables[ptr.targetIdx]) {
                        variables[ptr.targetIdx].highlight = false;
                    }
                    draw();
                }, 800);
            }
        }
    });

    document.getElementById('ptr-reset')?.addEventListener('click', () => {
        variables = [];
        pointers  = [];
        draw();
    });

    vizRedrawers['pointers'] = draw;
    draw();
}

// ---------------------------------------------------------------------------
// INTERRUPT TIMELINE  (Canvas — interrupts section)
// ---------------------------------------------------------------------------
function initInterruptViz() {
    const canvas = document.getElementById('interrupt-viz-canvas');
    if (!canvas) return;

    let timeline   = [];
    let running    = false;
    let time       = 0;
    let irqPending = false;
    let inISR      = false;
    let nestedIRQ  = false;
    let animFrame  = null;

    const MAIN_Y   = 60;
    const ISR_Y    = 140;
    const NESTED_Y = 200;

    function draw() {
        const { ctx, W, H } = syncCanvasSize(canvas);
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDark ? '#0D1117' : '#1E1E2E';
        ctx.fillRect(0, 0, W, H);

        // Labels
        ctx.font      = '12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#6E7681';
        ctx.textAlign = 'left';
        ctx.fillText('Main()',  5, MAIN_Y   - 10);
        ctx.fillText('ISR()',   5, ISR_Y    - 10);
        ctx.fillText('Nested',  5, NESTED_Y - 10);

        // Baselines
        ctx.strokeStyle = '#30363D';
        ctx.lineWidth   = 1;
        [MAIN_Y, ISR_Y, NESTED_Y].forEach(y => {
            ctx.beginPath();
            ctx.moveTo(60,     y + 15);
            ctx.lineTo(W - 10, y + 15);
            ctx.stroke();
        });

        // Draw timeline events
        const scale = (W - 80) / Math.max(time, 100);

        timeline.forEach(event => {
            const x = 60 + event.start * scale;
            const w = Math.max(2, (event.end - event.start) * scale);
            const y = event.type === 'main' ? MAIN_Y
                    : (event.type === 'isr'  ? ISR_Y : NESTED_Y);

            ctx.fillStyle = event.type === 'main' ? '#3B82F6'
                          : (event.type === 'isr'  ? '#FF6B35' : '#FF006E');
            ctx.fillRect(x, y, w, 25);
            ctx.strokeStyle = '#E6EDF3';
            ctx.lineWidth   = 1;
            ctx.strokeRect(x, y, w, 25);
        });

        // IRQ flash
        if (irqPending) {
            ctx.fillStyle = '#FFE66D';
            ctx.font      = 'bold 14px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ IRQ!', W / 2, 30);
        }
        if (tailPending) {
            ctx.fillStyle = '#FFE66D';
            ctx.font      = '11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('IRQ pending → will tail-chain after this ISR', W / 2, H - 22);
        }

        // Time indicator
        const timeX = 60 + time * scale;
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth   = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(timeX, 10);
        ctx.lineTo(timeX, H - 10);
        ctx.stroke();
        ctx.setLineDash([]);

        // Legend
        ctx.font      = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#6E7681';
        ctx.fillText(`t = ${time}`, W - 10, H - 8);
        ctx.textAlign = 'left';
    }

    const ISR_TICKS    = 12;
    const NESTED_TICKS = 6;
    let isrLeft     = 0;
    let nestLeft    = 0;
    let tailPending = false;
    let loopTimer   = null;

    function stopLoop() {
        if (animFrame) cancelAnimationFrame(animFrame);
        clearTimeout(loopTimer);
        animFrame = loopTimer = null;
    }

    function queueTick() {
        stopLoop();
        animFrame = requestAnimationFrame(() => { loopTimer = setTimeout(tick, 50); });
    }

    function tick() {
        if (!running) return;

        time++;

        // Active segments
        if (!inISR) {
            // Add or extend main execution block
            const lastMain = timeline.filter(e => e.type === 'main').pop();
            if (lastMain && lastMain.end === time - 1) {
                lastMain.end = time;
            } else {
                timeline.push({ type: 'main', start: time - 1, end: time });
            }
        } else {
            // In ISR
            if (nestedIRQ) {
                const lastNested = timeline.filter(e => e.type === 'nested').pop();
                if (lastNested && lastNested.end === time - 1) {
                    lastNested.end = time;
                } else {
                    timeline.push({ type: 'nested', start: time - 1, end: time });
                }
                if (--nestLeft <= 0) nestedIRQ = false;
            } else {
                const lastISR = timeline.filter(e => e.type === 'isr').pop();
                if (lastISR && lastISR.end === time - 1) {
                    lastISR.end = time;
                } else {
                    timeline.push({ type: 'isr', start: time - 1, end: time });
                }
                if (--isrLeft <= 0) {
                    if (tailPending) {
                        // Tail-chaining: next ISR starts without restoring main context
                        tailPending = false;
                        isrLeft = ISR_TICKS;
                        timeline.push({ type: 'isr', start: time, end: time });
                    } else {
                        inISR = false;
                    }
                }
            }
        }

        if (irqPending) {
            irqPending = false;
            if (!inISR) {
                inISR = true;
                isrLeft = ISR_TICKS;
            } else {
                // Same priority cannot preempt itself: it waits as pending
                tailPending = true;
            }
        }

        draw();
        queueTick();
    }

    function startIfIdle() {
        if (!running) {
            running = true;
            tick();
        }
    }

    document.getElementById('int-run')?.addEventListener('click', startIfIdle);

    document.getElementById('int-trigger')?.addEventListener('click', () => {
        irqPending = true;
        startIfIdle();
    });

    // Higher-priority IRQ: preempts a running ISR (nesting)
    document.getElementById('int-trigger-nested')?.addEventListener('click', () => {
        if (inISR && !nestedIRQ) { nestedIRQ = true; nestLeft = NESTED_TICKS; }
        else if (!inISR) irqPending = true;
        startIfIdle();
    });

    function resetAll() {
        running = false;
        stopLoop();
        timeline    = [];
        time        = 0;
        inISR       = false;
        nestedIRQ   = false;
        irqPending  = false;
        tailPending = false;
        isrLeft = nestLeft = 0;
        draw();
    }

    document.getElementById('int-reset')?.addEventListener('click', resetAll);

    vizCleanups['interrupts'] = () => { running = false; stopLoop(); };
    vizRedrawers['interrupts'] = draw;
    draw();
}

// ---------------------------------------------------------------------------
// PROTOCOL LABS  (UART / SPI / I2C — circuit + breadboard + timing)
// ---------------------------------------------------------------------------
function parseHexByte(str, max = 255) {
    if (str == null) return NaN;
    const s = String(str).trim();
    if (!s) return NaN;
    const val = (s.startsWith('0x') || s.startsWith('0X')) ? parseInt(s, 16) : parseInt(s, 10);
    if (isNaN(val) || val < 0 || val > max) return NaN;
    return val;
}

function flashInputError(el) {
    if (!el) return;
    el.classList.add('input-error');
    setTimeout(() => el.classList.remove('input-error'), 400);
}

function hexByte(v) {
    return '0x' + (v & 0xFF).toString(16).toUpperCase().padStart(2, '0');
}

function bitsMsbFirst(byteVal) {
    const bits = [];
    for (let i = 7; i >= 0; i--) bits.push((byteVal >> i) & 1);
    return bits;
}

function bitsLsbFirst(byteVal) {
    const bits = [];
    for (let i = 0; i < 8; i++) bits.push((byteVal >> i) & 1);
    return bits;
}

function makeExplain(title, what, why, notice, signals) {
    return { title, what, why, notice, signals: signals || null };
}

function levelWord(v) {
    return v ? 'HIGH (1)' : 'LOW (0)';
}

function formatBitTime(baud) {
    const us = 1e6 / baud;
    return us >= 100 ? `${us.toFixed(0)} µs` : `${us.toFixed(2)} µs`;
}

function buildUartFrames(byteVal, baud = 115200) {
    const labels = ['IDLE', 'START'];
    const tx = [1, 0];
    const bits = bitsLsbFirst(byteVal);
    bits.forEach((b, i) => {
        labels.push(`D${i}`);
        tx.push(b);
    });
    labels.push('STOP', 'IDLE');
    tx.push(1, 1);

    const ch = (byteVal >= 32 && byteVal <= 126) ? String.fromCharCode(byteVal) : '·';
    const bin = bits.join('');
    const explain = [];
    const status = [];

    status.push('Idle (line high)');
    explain.push(makeExplain(
        'IDLE — bus waiting',
        `TX is held HIGH (logic 1). No clock wire exists in UART — both sides only agree on a baud rate. At ${baud} baud each bit lasts 1/${baud} s = ${formatBitTime(baud)}.`,
        `Idle-high lets the receiver detect the start of a frame as a sudden drop to LOW. Until that edge, nothing is interpreted as data.`,
        `Watch the orange TX lane stay high. Baud on MCU and USB-UART must match (within ~2–3%) or bits get sampled at the wrong moment.`
    ));

    status.push('START bit');
    explain.push(makeExplain(
        'START bit — frame begins',
        `TX drives LOW for exactly one bit-time. This bit is always 0 and is not part of your payload ${hexByte(byteVal)} ('${ch}').`,
        `The falling edge is the only sync event. The receiver starts an internal timer and will sample each following bit near the middle of its bit-time.`,
        `On the scope: look for the first falling edge. If START is missing, the receiver never “unlocks” the frame.`
    ));

    bits.forEach((b, i) => {
        const soFar = bits.slice(0, i + 1).join('');
        const weight = 1 << i;
        status.push(`Data D${i}=${b}`);
        explain.push(makeExplain(
            `Data bit D${i} = ${b} (LSB-first)`,
            `UART sends least-significant bit first. D${i} contributes ${b} × ${weight} toward the value ${hexByte(byteVal)} ('${ch}'). Bits received so far D0…D${i}: ${soFar}.`,
            `Because there is no shared clock, timing comes only from baud. Sampling in the middle of the bit rejects edge noise.`,
            `Full byte binary (D0→D7) will be ${bin} → ${hexByte(byteVal)}. Compare this step’s TX level with bit ${b} on the waveform.`
        ));
    });

    status.push('STOP bit');
    explain.push(makeExplain(
        'STOP bit — frame ends',
        `TX returns HIGH for at least one bit-time so the line is idle-high again before any next START.`,
        `STOP separates frames. A missing or early LOW here is a framing error — the receiver knows the byte boundary was wrong.`,
        `After STOP, the terminal has ${hexByte(byteVal)} ('${ch}'). Next START can begin immediately after this HIGH period.`
    ));

    status.push('Idle again');
    explain.push(makeExplain(
        'IDLE — transfer complete',
        `Frame finished: START + 8 data bits + STOP = 10 bit-times = ${formatBitTime(baud / 10)} at ${baud} baud (max ≈ ${Math.floor(baud / 10)} bytes/s). Payload was ${hexByte(byteVal)} ('${ch}'), binary ${bin} (LSB first on the wire).`,
        `Asynchronous links need correct baud, 8N1 framing (8 data, no parity, 1 stop), and TX/RX crossed between boards.`,
        `Scroll the scope: one clean LOW start, eight data levels, then HIGH stop. That pattern is one UART byte.`
    ));

    explain.forEach((ex, i) => {
        const prev = i > 0 ? tx[i - 1] : null;
        const lab = labels[i];
        let txNote;
        if (lab === 'START') txNote = `Falls HIGH→LOW — this one edge synchronizes the receiver. Held LOW for ${formatBitTime(baud)}.`;
        else if (lab === 'STOP') txNote = `${prev === 1 ? 'Stays' : 'Rises to'} HIGH for one bit-time — marks the end of the frame.`;
        else if (lab === 'IDLE') txNote = `HIGH — idle line, no frame in progress.`;
        else {
            const change = prev === null || prev === tx[i] ? 'Holds' : (tx[i] ? 'Rises to' : 'Falls to');
            txNote = `${change} ${levelWord(tx[i])} for ${formatBitTime(baud)} — this is ${lab}. Receiver samples it mid-bit.`;
        }
        ex.signals = {
            TX: txNote,
            RX: `Idle HIGH — this lab only transmits from the MCU.`,
        };
    });

    const phaseColors = labels.map(l => l === 'START' ? '#FF6B35' : l === 'STOP' ? '#7B2FBE' : l === 'IDLE' ? '#888888' : '#00F5D4');

    return {
        labels,
        phaseColors,
        lanes: [{ name: 'TX', color: '#FF6B35', samples: tx }],
        activeWiresBySample: tx.map((_, i) => (i === 0 || i === tx.length - 1 ? [] : ['tx'])),
        statusBySample: status,
        explainBySample: explain,
    };
}

function buildSpiFrames(mosiByte, misoByte = 0xA5) {
    const labels = ['IDLE'];
    const cs = [1];
    const sck = [0];
    const mosi = [0];
    const miso = [0];
    const explain = [];
    const status = [];
    const mosiBits = bitsMsbFirst(mosiByte);
    const misoBits = bitsMsbFirst(misoByte);

    status.push('Idle (CS high)');
    explain.push(makeExplain(
        'IDLE — slave not selected',
        `CS is HIGH (inactive). SCK idles LOW because this lab uses SPI Mode 0 (CPOL=0, CPHA=0). Flash ignores MOSI/MISO while deselected.`,
        `SPI is synchronous: the master owns the clock. Full-duplex means every SCK edge can move one bit out (MOSI) and one bit in (MISO) together.`,
        `You will send ${hexByte(mosiByte)} (MSB first ${mosiBits.join('')}). This teaching flash always returns canned ${hexByte(misoByte)} (${misoBits.join('')}) so you can see both directions.`,
        {
            CS: `Graph stays HIGH — flash is deselected and ignores the bus.`,
            SCK: `Graph stays LOW — Mode 0 idle clock (CPOL=0). No edges → no shifting.`,
            MOSI: `Graph is idle/don't-care — master is not clocking a transfer yet.`,
            MISO: `Graph is idle/high-Z from the slave’s point of view — flash is not selected.`,
        }
    ));

    labels.push('CS↓');
    cs.push(0); sck.push(0); mosi.push(mosiBits[0]); miso.push(misoBits[0]);
    status.push('CS asserted');
    explain.push(makeExplain(
        'CS↓ — select the flash',
        `Chip Select goes LOW. Only this slave should drive MISO now. Other SPI devices keep their MISO in high-Z.`,
        `Without CS, several chips could fight the MISO line. Asserting CS is “hey flash, the next clocks are for you.”`,
        `Mode 0 often presents the first data bit on MOSI before the first rising SCK. Here MOSI already shows bit7=${mosiBits[0]}.`,
        {
            CS: `Graph falls HIGH→LOW — this edge selects the flash for the coming clocks.`,
            SCK: `Still LOW — no sample yet; we are only selecting the slave.`,
            MOSI: `Driven to ${levelWord(mosiBits[0])} — master pre-stages bit7 of ${hexByte(mosiByte)} before the first clock.`,
            MISO: `Slave may already present bit7=${misoBits[0]} (${levelWord(misoBits[0])}) of canned ${hexByte(misoByte)}, ready for the first SCK↑.`,
        }
    ));

    for (let i = 0; i < 8; i++) {
        const bitNo = 7 - i;
        labels.push(`D${bitNo}`);
        cs.push(0); sck.push(0); mosi.push(mosiBits[i]); miso.push(misoBits[i]);
        status.push(`Setup bit${bitNo}`);
        explain.push(makeExplain(
            `Setup bit${bitNo} — hold data while SCK is LOW`,
            `SCK is still LOW. Master sets MOSI=${mosiBits[i]} (bit${bitNo} of ${hexByte(mosiByte)}). Slave sets MISO=${misoBits[i]} (bit${bitNo} of ${hexByte(misoByte)}).`,
            `In Mode 0 (CPHA=0), data must be valid before the rising edge so both sides can sample cleanly on SCK↑.`,
            `MSB-first: bit7 is sent first. MOSI so far ${mosiBits.slice(0, i + 1).join('')}${'.'.repeat(7 - i)}; MISO so far ${misoBits.slice(0, i + 1).join('')}${'.'.repeat(7 - i)}.`,
            {
                CS: `Stays LOW — flash remains selected for this bit.`,
                SCK: `Stays LOW — setup half-period; do not sample yet.`,
                MOSI: `Level is ${levelWord(mosiBits[i])} — master is outputting bit${bitNo} of ${hexByte(mosiByte)}.`,
                MISO: `Level is ${levelWord(misoBits[i])} — flash is outputting bit${bitNo} of ${hexByte(misoByte)}.`,
            }
        ));

        labels.push(`↑${bitNo}`);
        cs.push(0); sck.push(1); mosi.push(mosiBits[i]); miso.push(misoBits[i]);
        status.push(`Sample bit${bitNo} MOSI=${mosiBits[i]} MISO=${misoBits[i]}`);
        explain.push(makeExplain(
            `Sample bit${bitNo} — rising SCK captures both sides`,
            `SCK rises (↑). Master latches MISO=${misoBits[i]} into its RX shift register; slave latches MOSI=${mosiBits[i]}.`,
            `That is full-duplex: one clock edge, two bits exchanged. No START/STOP bytes — the clock alone paces the shift.`,
            `After this edge, MOSI bits ${mosiBits.slice(0, i + 1).join('')}, MISO bits ${misoBits.slice(0, i + 1).join('')}. ${i === 7 ? `Complete bytes: MOSI ${hexByte(mosiByte)}, MISO ${hexByte(misoByte)}.` : 'More bits remain.'}`,
            {
                CS: `Still LOW — selection holds through the sample edge.`,
                SCK: `Rises LOW→HIGH — this edge is the Mode 0 sample moment for bit${bitNo}.`,
                MOSI: `Held at ${levelWord(mosiBits[i])} during the edge — slave samples this bit now.`,
                MISO: `Held at ${levelWord(misoBits[i])} during the edge — master samples this bit now.`,
            }
        ));
    }

    labels.push('CS↑', 'IDLE');
    cs.push(1, 1); sck.push(0, 0); mosi.push(0, 0); miso.push(0, 0);
    status.push('CS released');
    explain.push(makeExplain(
        'CS↑ — deselect slave',
        `CS returns HIGH. The flash stops driving MISO. The 8-bit exchange is officially over.`,
        `Many flash commands need CS to rise between operations. Leaving CS low can make the next clocks look like more bits of the same transaction.`,
        `Result this lab: master transmitted ${hexByte(mosiByte)}, received ${hexByte(misoByte)} (canned demo value, not a real JEDEC reply).`,
        {
            CS: `Rises LOW→HIGH — transfer boundary; flash is deselected.`,
            SCK: `Returns LOW — back to Mode 0 idle clock.`,
            MOSI: `Returns idle — master stops shifting ${hexByte(mosiByte)}.`,
            MISO: `Slave releases — no more valid data from this transfer (${hexByte(misoByte)} already captured).`,
        }
    ));
    status.push('Idle');
    explain.push(makeExplain(
        'IDLE — ready for next transfer',
        `Bus is quiet: CS high, SCK low. To talk again, assert CS↓ and clock another byte.`,
        `Remember Mode 0: idle clock low, sample on rising edge, MSB first — a very common embedded default.`,
        `Compare purple CS, yellow SCK pulses, orange MOSI and cyan MISO on the scope — that four-lane picture is SPI.`,
        {
            CS: `HIGH again — no slave selected.`,
            SCK: `LOW idle — waiting for the next CS↓ + clocks.`,
            MOSI: `Idle — last outbound byte was ${hexByte(mosiByte)}.`,
            MISO: `Idle — last inbound byte was ${hexByte(misoByte)}.`,
        }
    ));

    return {
        labels,
        lanes: [
            { name: 'CS',   color: '#7B2FBE', samples: cs },
            { name: 'SCK',  color: '#FFE66D', samples: sck },
            { name: 'MOSI', color: '#FF6B35', samples: mosi },
            { name: 'MISO', color: '#00F5D4', samples: miso },
        ],
        activeWiresBySample: cs.map((c, i) => {
            if (c === 1) return [];
            const wires = ['cs'];
            if (sck[i]) wires.push('sck');
            wires.push('mosi', 'miso');
            return wires;
        }),
        statusBySample: status,
        explainBySample: explain,
    };
}

function buildI2cFrames(addr, reg, data) {
    const labels = [];
    const scl = [];
    const sda = [];
    const explain = [];
    const status = [];

    function pushBit(label, sclVal, sdaVal, shortStatus, longExplain) {
        labels.push(label);
        scl.push(sclVal);
        sda.push(sdaVal);
        status.push(shortStatus);
        explain.push(longExplain);
    }

    const addrW = ((addr & 0x7F) << 1) | 0; // write
    const addrBits = bitsMsbFirst(addrW);
    const regBits = bitsMsbFirst(reg & 0xFF);
    const dataBits = bitsMsbFirst(data & 0xFF);

    pushBit(
        'IDLE', 1, 1,
        'Bus idle',
        makeExplain(
            'IDLE — open-drain bus at rest',
            `SDA and SCL are not driven by chips; 4.7kΩ pull-ups to 3V3 hold both HIGH. Target device address in this lab is ${hexByte(addr)}.`,
            `I2C is a shared bus: many devices, two wires. Open-drain + pull-ups let any device pull a line LOW without fighting a push-pull driver.`,
            `If pull-ups are missing, SDA/SCL float and the bus looks stuck or noisy. Green “4k7↑” on the schematic is essential, not optional.`
        )
    );
    pushBit(
        'START', 1, 0,
        'START condition',
        makeExplain(
            'START — claim the bus',
            `While SCL stays HIGH, master pulls SDA from HIGH→LOW. That edge is illegal during normal data bits, so everyone recognizes START. On the scope, notice every other SDA change happens a little after SCL falls (while SCL is LOW) — only START/STOP move SDA while SCL is HIGH.`,
            `After START, the master will send one address byte: ${hexByte(addrW)} = (${hexByte(addr)} << 1) | 0. The low bit 0 means Write (master → slave).`,
            `Read would use ${hexByte(addrW | 1)} instead. People often confuse 7-bit ${hexByte(addr)} with the on-wire byte ${hexByte(addrW)} — they are different.`
        )
    );

    function pushByte(byteVal, bitsArr, prefix, phaseTitle, byteMeaning, afterAckDev) {
        bitsArr.forEach((b, i) => {
            const bitNo = 7 - i;
            const soFar = bitsArr.slice(0, i + 1).join('');
            pushBit(
                `${prefix}${bitNo}`, 0, b,
                `${phaseTitle} bit${bitNo}=${b} setup`,
                makeExplain(
                    `${phaseTitle}: setup bit${bitNo}=${b}`,
                    `SCL is LOW so SDA may change safely. Master drives SDA=${b}. ${byteMeaning}`,
                    `I2C rule: only change SDA when SCL is LOW (except START/STOP). Bits are MSB first — opposite of UART’s LSB-first habit.`,
                    `Byte ${hexByte(byteVal)} on the wire (MSB→LSB): ${bitsArr.join('')}. Captured so far: ${soFar}${'.'.repeat(7 - i)}.`
                )
            );
            pushBit(
                `${prefix}${bitNo}↑`, 1, b,
                `${phaseTitle} bit${bitNo}=${b} sample`,
                makeExplain(
                    `${phaseTitle}: sample bit${bitNo}=${b}`,
                    `SCL rises. All listeners sample SDA now. SDA must stay stable the whole time SCL is HIGH.`,
                    `The clock edge is the “now!” moment — similar spirit to SPI’s sample edge, but here slaves also ACK later on the 9th clock.`,
                    `Yellow SCL↑ with orange SDA level ${b} is this bit. Continue until 8 bits + ACK complete the byte.`
                )
            );
        });
        pushBit(
            'ACK', 0, 0,
            `${phaseTitle} ACK setup`,
            makeExplain(
                `${phaseTitle}: ACK bit — slave answers`,
                `After 8 bits, master releases SDA (stop driving). The addressed slave should pull SDA LOW to ACK.`,
                `ACK=0 means “I am here and I accepted the byte.” NACK=1 (SDA left high by pull-up) means no device answered or the slave wants to stop.`,
                `This lab always ACKs. On real hardware, wrong address → NACK and you should STOP.`
            )
        );
        pushBit(
            'ACK↑', 1, 0,
            `${phaseTitle} ACK sampled`,
            makeExplain(
                `${phaseTitle}: ACK sampled on SCL↑`,
                `SCL goes HIGH while SDA is LOW → master sees ACK. ${afterAckDev}`,
                `The 9th clock pulse is reserved for ACK/NACK — it is not a data bit of your payload.`,
                `If SDA were HIGH here, that would be NACK: typically abort with STOP and check wiring/address.`
            )
        );
    }

    pushByte(
        addrW, addrBits, 'A', 'Address+W',
        `This is address byte ${hexByte(addrW)}: bits7..1 = ${hexByte(addr)}, bit0 = Write(0).`,
        `Next the master will send a register address ${hexByte(reg)}.`
    );
    pushByte(
        reg & 0xFF, regBits, 'R', 'Register',
        `Register pointer ${hexByte(reg)} selects which internal sensor register the following data byte will update.`,
        `Next comes the data payload ${hexByte(data)}.`
    );
    pushByte(
        data & 0xFF, dataBits, 'D', 'Data',
        `Data byte ${hexByte(data)} is the value written into register ${hexByte(reg)}.`,
        `After this ACK, master will generate STOP to end the write.`
    );

    pushBit(
        'P↓', 0, 0,
        'Prepare STOP',
        makeExplain(
            'Prepare STOP',
            `SCL goes LOW and SDA is driven LOW so the master can create a rising SDA edge while SCL is HIGH next.`,
            `STOP is the mirror of START: SDA rising with SCL high frees the bus for others.`,
            `You are one edge away from releasing the shared I2C lines.`
        )
    );
    pushBit(
        'STOP', 1, 1,
        'STOP condition',
        makeExplain(
            'STOP — release the bus',
            `SCL rises first, then — while SCL is HIGH — SDA rises LOW→HIGH. Transaction ends. Sensor ${hexByte(addr)} should now hold register ${hexByte(reg)} = ${hexByte(data)}.`,
            `Without STOP, the bus can stay “busy” and other masters/devices wait. Always end writes cleanly.`,
            `Timeline was: START → ${hexByte(addrW)}+ACK → ${hexByte(reg)}+ACK → ${hexByte(data)}+ACK → STOP.`
        )
    );
    pushBit(
        'IDLE', 1, 1,
        'Bus idle',
        makeExplain(
            'IDLE — write finished',
            `Pull-ups restore SDA/SCL HIGH. A new START may begin later.`,
            `Mental model: 7-bit address ${hexByte(addr)} appears on the wire as ${hexByte(addrW)} when writing.`,
            `Re-step the address bits if ${hexByte(addrW)} still feels mysterious — that byte is the #1 I2C beginner confusion.`
        )
    );

    explain.forEach((ex, i) => {
        const lab = labels[i];
        const pScl = i > 0 ? scl[i - 1] : null;
        const pSda = i > 0 ? sda[i - 1] : null;
        let sclNote;
        if (pScl === null || pScl === scl[i]) {
            sclNote = scl[i] ? 'Stays HIGH — released, the pull-up holds it up.' : 'Stays LOW — master holds the clock down.';
        } else if (scl[i]) {
            sclNote = 'Rises LOW→HIGH — master releases SCL, pull-up lifts it. Everyone samples SDA now.';
        } else {
            sclNote = 'Falls HIGH→LOW — master pulls SCL down. SDA is now allowed to change.';
        }

        let sdaNote;
        const changed = pSda !== null && pSda !== sda[i];
        if (lab === 'IDLE') sdaNote = 'HIGH — nobody pulls it down; pull-up resistor wins.';
        else if (lab === 'START') sdaNote = 'Falls HIGH→LOW while SCL is HIGH → START condition.';
        else if (lab === 'STOP') sdaNote = 'Rises LOW→HIGH while SCL is HIGH → STOP condition. Bus free.';
        else if (lab === 'P↓') sdaNote = 'Master holds SDA LOW (after SCL fell) so it can rise during STOP.';
        else if (lab === 'ACK') sdaNote = 'Master lets go; the slave pulls SDA LOW = ACK.';
        else if (lab === 'ACK↑') sdaNote = 'Held LOW by the slave while SCL is HIGH → master reads ACK (0).';
        else if (lab.endsWith('↑')) sdaNote = `Held ${levelWord(sda[i])} — must not change while SCL is HIGH.`;
        else sdaNote = `${changed ? (sda[i] ? 'Rises to' : 'Falls to') : 'Stays'} ${levelWord(sda[i])} — master sets the bit while SCL is LOW (just after the falling edge).`;

        ex.signals = { SCL: sclNote, SDA: sdaNote };
    });

    return {
        labels,
        lanes: [
            { name: 'SCL', color: '#FFE66D', samples: scl },
            { name: 'SDA', color: '#FF6B35', samples: sda, edgeDelay: 0.3 },
        ],
        activeWiresBySample: labels.map((lab) => {
            if (lab === 'IDLE') return [];
            return ['sda', 'scl'];
        }),
        statusBySample: status,
        explainBySample: explain,
    };
}

function drawProtocolLanes(canvas, frame, progress, uptoIndex) {
    const { ctx, W, H } = syncCanvasSize(canvas);
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = isDark ? '#0D1117' : '#1E1E2E';
    ctx.fillRect(0, 0, W, H);

    if (!frame || !frame.lanes || !frame.lanes.length) return;

    const labelW = 48;
    const marginR = 16;
    const marginT = 18;
    const marginB = 28;
    const n = frame.labels.length;
    // Prefer explicit step index so explanation and waveform stay aligned
    // (old formula floor(p*n)+1 was one sample ahead of stepIndex).
    let samplesToShow;
    if (typeof uptoIndex === 'number' && uptoIndex >= 0) {
        samplesToShow = Math.max(1, Math.min(n, uptoIndex + 1));
    } else {
        samplesToShow = Math.max(1, Math.min(n, Math.floor(progress * n) + 1));
    }
    const laneH = (H - marginT - marginB) / frame.lanes.length;
    const plotW = W - labelW - marginR;
    const step = plotW / Math.max(1, n);

    // Phase bands (e.g. UART idle/start/data/stop) behind the traces
    if (frame.phaseColors) {
        for (let i = 0; i < samplesToShow; i++) {
            if (!frame.phaseColors[i]) continue;
            ctx.globalAlpha = 0.16;
            ctx.fillStyle = frame.phaseColors[i];
            ctx.fillRect(labelW + i * step, marginT - 6, step, H - marginT - marginB + 6);
        }
        ctx.globalAlpha = 1;
    }

    // Current step column
    if (typeof uptoIndex === 'number' && uptoIndex >= 0 && uptoIndex < n) {
        const cx = labelW + uptoIndex * step;
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(cx, marginT - 6, step, H - marginT - marginB + 6);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 0.5, marginT - 5.5, step - 1, H - marginT - marginB + 5);
    }

    frame.lanes.forEach((lane, li) => {
        const mid = marginT + laneH * li + laneH / 2;
        const high = mid - laneH * 0.28;
        const low = mid + laneH * 0.28;

        ctx.fillStyle = '#6E7681';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(lane.name, labelW - 8, mid + 4);

        ctx.strokeStyle = '#30363D';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(labelW, high);
        ctx.lineTo(W - marginR, high);
        ctx.moveTo(labelW, low);
        ctx.lineTo(W - marginR, low);
        ctx.stroke();
        ctx.setLineDash([]);

        // edgeDelay shifts this lane's transitions later within a sample
        // (I2C SDA changes after SCL falls — hold time)
        const delay = (lane.edgeDelay || 0) * step;
        ctx.strokeStyle = lane.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < samplesToShow; i++) {
            const x0 = labelW + i * step;
            const x1 = labelW + (i + 1) * step;
            const y = lane.samples[i] ? high : low;
            if (i === 0) ctx.moveTo(x0, y);
            else {
                const prevY = lane.samples[i - 1] ? high : low;
                ctx.lineTo(x0 + delay, prevY);
                if (prevY !== y) ctx.lineTo(x0 + delay, y);
            }
            ctx.lineTo(x1, y);
        }
        ctx.stroke();
    });

    // Bottom labels (sparse)
    ctx.textAlign = 'center';
    ctx.font = '9px "JetBrains Mono", monospace';
    const labelStep = Math.max(1, Math.ceil(n / 16));
    for (let i = 0; i < samplesToShow; i += labelStep) {
        ctx.fillStyle = '#8B949E';
        ctx.fillText(frame.labels[i], labelW + i * step + step / 2, H - 10);
    }
}

const WIRE_HELP = {
    uart: {
        tx: 'TX (PA9 → RXD): MCU transmits UART frames LSB-first',
        rx: 'RX (PA10 ← TXD): MCU receives (idle high in this lab)',
        gnd: 'GND: common ground reference',
    },
    spi: {
        cs: 'CS (PA4): chip-select — active LOW selects the flash',
        sck: 'SCK (PA5): SPI clock (Mode 0: idle low, sample on rising edge)',
        mosi: 'MOSI (PA7 → DI): master-out data to the flash',
        miso: 'MISO (PA6 ← DO): master-in data from the flash',
    },
    i2c: {
        scl: 'SCL (PB6): I2C clock — open-drain with pull-up',
        sda: 'SDA (PB7): I2C data — open-drain with pull-up',
        pup: '4.7kΩ pull-ups to 3V3 keep the bus idle HIGH',
        gnd: 'GND: common ground reference',
    },
};

function setLabWireActive(labRoot, wireNames) {
    const set = new Set(wireNames || []);
    labRoot.querySelectorAll('[data-wire]').forEach((el) => {
        const w = el.getAttribute('data-wire');
        el.classList.toggle('active', set.has(w));
    });
}

function byteLabel(v) {
    const h = hexByte(v);
    const ch = (v >= 32 && v <= 126) ? String.fromCharCode(v) : '·';
    return `${h} '${ch}'`;
}

function setSvgPacket(el, visible, x, y, label) {
    if (!el) return;
    el.setAttribute('visibility', visible ? 'visible' : 'hidden');
    if (!visible) return;
    el.setAttribute('transform', `translate(${x}, ${y})`);
    const text = el.querySelector('text');
    if (text && label != null) text.textContent = label;
}

function setHtmlPacket(el, state, posPct, label) {
    if (!el) return;
    el.textContent = label || '···';
    el.classList.toggle('is-moving', state === 'moving');
    el.classList.toggle('is-done', state === 'done');
    if (posPct != null) el.style.left = `${posPct}%`;
    el.style.opacity = state === 'idle' ? '0' : '1';
}

function resetTransferVisuals(protocol) {
    if (protocol === 'uart') {
        const mcu = document.getElementById('uart-xfer-mcu');
        const dev = document.getElementById('uart-xfer-dev');
        if (mcu) mcu.textContent = '—';
        if (dev) dev.textContent = 'waiting…';
        setHtmlPacket(document.getElementById('uart-xfer-packet'), 'idle', 8, '···');
        setSvgPacket(document.getElementById('uart-svg-packet'), false);
    } else if (protocol === 'spi') {
        const ids = {
            'spi-xfer-mosi-mcu': '—',
            'spi-xfer-mosi-dev': 'waiting…',
            'spi-xfer-miso-dev': '—',
            'spi-xfer-miso-mcu': 'waiting…',
        };
        Object.entries(ids).forEach(([id, text]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        });
        setHtmlPacket(document.getElementById('spi-xfer-mosi-pkt'), 'idle', 8, '···');
        setHtmlPacket(document.getElementById('spi-xfer-miso-pkt'), 'idle', 92, '···');
        setSvgPacket(document.getElementById('spi-svg-mosi'), false);
        setSvgPacket(document.getElementById('spi-svg-miso'), false);
    } else if (protocol === 'i2c') {
        const mcu = document.getElementById('i2c-xfer-mcu');
        const dev = document.getElementById('i2c-xfer-dev');
        if (mcu) mcu.textContent = '—';
        if (dev) dev.textContent = 'waiting…';
        setHtmlPacket(document.getElementById('i2c-xfer-packet'), 'idle', 8, '···');
        setSvgPacket(document.getElementById('i2c-svg-packet'), false);
    }
}

function updateTransferVisuals(protocol, inputs, progress, sampleIdx, labels) {
    const n = labels && labels.length ? labels.length : 1;
    const idx = Math.max(0, Math.min(n - 1, sampleIdx | 0));
    const lab = labels && labels[idx] ? labels[idx] : '';
    // Packet position locked to current step (0..1), not a separate phase clock
    const t = n <= 1 ? 1 : idx / (n - 1);

    if (protocol === 'uart') {
        const byte = inputs.byte;
        const mcu = document.getElementById('uart-xfer-mcu');
        const dev = document.getElementById('uart-xfer-dev');
        const pkt = document.getElementById('uart-xfer-packet');
        const svg = document.getElementById('uart-svg-packet');
        const label = byteLabel(byte);

        if (lab === 'IDLE' && idx === 0) {
            if (mcu) mcu.textContent = `queued ${label}`;
            if (dev) dev.textContent = 'waiting…';
            setHtmlPacket(pkt, 'idle', 8, label);
            setSvgPacket(svg, false);
            return null;
        }
        if (lab === 'IDLE' && idx > 0) {
            if (mcu) mcu.textContent = `sent ${label}`;
            if (dev) dev.textContent = `got ${label}`;
            setHtmlPacket(pkt, 'done', 92, label);
            setSvgPacket(svg, true, 440, 80, hexByte(byte));
            return null;
        }
        if (lab === 'STOP') {
            if (mcu) mcu.textContent = `sending ${label}`;
            if (dev) dev.textContent = 'framing…';
            setHtmlPacket(pkt, 'moving', 8 + t * 84, label);
            setSvgPacket(svg, true, 200 + t * 240, 80, hexByte(byte));
            return null;
        }
        // START + data bits
        if (mcu) mcu.textContent = `sending ${label}`;
        if (dev) dev.textContent = 'receiving…';
        setHtmlPacket(pkt, 'moving', 8 + t * 84, label);
        setSvgPacket(svg, true, 200 + t * 240, 80, hexByte(byte));
        return null;
    }

    if (protocol === 'spi') {
        const mosi = inputs.byte;
        const miso = 0xA5;
        const mosiLab = hexByte(mosi);
        const misoLab = hexByte(miso);
        const mosiMcu = document.getElementById('spi-xfer-mosi-mcu');
        const mosiDev = document.getElementById('spi-xfer-mosi-dev');
        const misoMcu = document.getElementById('spi-xfer-miso-mcu');
        const misoDev = document.getElementById('spi-xfer-miso-dev');
        const mosiPkt = document.getElementById('spi-xfer-mosi-pkt');
        const misoPkt = document.getElementById('spi-xfer-miso-pkt');
        const svgMosi = document.getElementById('spi-svg-mosi');
        const svgMiso = document.getElementById('spi-svg-miso');

        if (lab === 'IDLE' && idx === 0) {
            if (mosiMcu) mosiMcu.textContent = mosiLab;
            if (mosiDev) mosiDev.textContent = 'waiting…';
            if (misoDev) misoDev.textContent = misoLab;
            if (misoMcu) misoMcu.textContent = 'waiting…';
            setHtmlPacket(mosiPkt, 'idle', 8, mosiLab);
            setHtmlPacket(misoPkt, 'idle', 92, misoLab);
            setSvgPacket(svgMosi, false);
            setSvgPacket(svgMiso, false);
            return null;
        }
        if (lab === 'CS↓') {
            if (mosiMcu) mosiMcu.textContent = mosiLab;
            if (mosiDev) mosiDev.textContent = 'selected…';
            if (misoDev) misoDev.textContent = misoLab;
            if (misoMcu) misoMcu.textContent = 'waiting…';
            setHtmlPacket(mosiPkt, 'idle', 8, mosiLab);
            setHtmlPacket(misoPkt, 'idle', 92, misoLab);
            setSvgPacket(svgMosi, false);
            setSvgPacket(svgMiso, false);
            return null;
        }
        if (lab === 'CS↑' || (lab === 'IDLE' && idx > 0)) {
            if (mosiMcu) mosiMcu.textContent = `sent ${mosiLab}`;
            if (mosiDev) mosiDev.textContent = `got ${mosiLab}`;
            if (misoDev) misoDev.textContent = `sent ${misoLab}`;
            if (misoMcu) misoMcu.textContent = `got ${misoLab}`;
            setHtmlPacket(mosiPkt, 'done', 92, mosiLab);
            setHtmlPacket(misoPkt, 'done', 8, misoLab);
            setSvgPacket(svgMosi, true, 440, 190, mosiLab);
            setSvgPacket(svgMiso, true, 200, 150, misoLab);
            return null;
        }
        // Bit setup / sample steps
        if (mosiMcu) mosiMcu.textContent = `TX ${mosiLab}`;
        if (mosiDev) mosiDev.textContent = 'shifting in…';
        if (misoDev) misoDev.textContent = `TX ${misoLab}`;
        if (misoMcu) misoMcu.textContent = 'shifting in…';
        setHtmlPacket(mosiPkt, 'moving', 8 + t * 84, mosiLab);
        setHtmlPacket(misoPkt, 'moving', 92 - t * 84, misoLab);
        setSvgPacket(svgMosi, true, 200 + t * 240, 190, mosiLab);
        setSvgPacket(svgMiso, true, 440 - t * 240, 150, misoLab);
        return null;
    }

    if (protocol === 'i2c') {
        const { addr, reg, data } = inputs;
        const addrW = ((addr & 0x7F) << 1);
        const mcu = document.getElementById('i2c-xfer-mcu');
        const dev = document.getElementById('i2c-xfer-dev');
        const pkt = document.getElementById('i2c-xfer-packet');
        const svg = document.getElementById('i2c-svg-packet');

        let phase = 'idle';
        let packetText = '···';
        let mcuText = '—';
        let devText = 'waiting…';

        const isAddrBit = /^A\d/.test(lab);
        const isRegBit = /^R\d/.test(lab);
        const isDataBit = /^D\d/.test(lab);
        const isAck = lab === 'ACK' || lab === 'ACK↑';

        if (lab === 'IDLE' && idx === 0) {
            phase = 'idle';
        } else if (lab === 'START') {
            phase = 'start';
            packetText = 'START';
            mcuText = 'START on SDA';
            devText = 'listening…';
        } else if (isAddrBit) {
            phase = 'addr';
            packetText = hexByte(addrW) + 'W';
            mcuText = `addr ${hexByte(addr)}+W`;
            devText = 'decoding…';
        } else if (isRegBit) {
            phase = 'reg';
            packetText = `REG ${hexByte(reg)}`;
            mcuText = `reg ${hexByte(reg)}`;
            devText = 'latching reg…';
        } else if (isDataBit) {
            phase = 'data';
            packetText = `DATA ${hexByte(data)}`;
            mcuText = `data ${hexByte(data)}`;
            devText = 'writing…';
        } else if (isAck) {
            for (let i = idx - 1; i >= 0; i--) {
                const prev = labels[i];
                if (/^A\d/.test(prev)) {
                    phase = 'addr';
                    packetText = hexByte(addrW) + 'W';
                    mcuText = `addr ${hexByte(addr)}+W`;
                    devText = 'ACK addr…';
                    break;
                }
                if (/^R\d/.test(prev)) {
                    phase = 'reg';
                    packetText = `REG ${hexByte(reg)}`;
                    mcuText = `reg ${hexByte(reg)}`;
                    devText = 'ACK reg…';
                    break;
                }
                if (/^D\d/.test(prev)) {
                    phase = 'data';
                    packetText = `DATA ${hexByte(data)}`;
                    mcuText = `data ${hexByte(data)}`;
                    devText = 'ACK data…';
                    break;
                }
            }
        } else if (lab === 'P↓' || lab === 'STOP') {
            phase = 'done';
            packetText = 'STOP';
            mcuText = 'STOP';
            devText = `${hexByte(reg)}=${hexByte(data)}`;
        } else if (lab === 'IDLE' && idx > 0) {
            phase = 'done';
            packetText = hexByte(data);
            mcuText = 'done';
            devText = `${hexByte(reg)}=${hexByte(data)}`;
        }

        if (mcu) mcu.textContent = mcuText;
        if (dev) dev.textContent = devText;

        if (phase === 'idle') {
            setHtmlPacket(pkt, 'idle', 8, '···');
            setSvgPacket(svg, false);
        } else if (phase === 'done') {
            setHtmlPacket(pkt, 'done', 92, hexByte(data));
            setSvgPacket(svg, true, 440, 130, hexByte(data));
        } else {
            setHtmlPacket(pkt, 'moving', 8 + t * 84, packetText);
            setSvgPacket(svg, true, 200 + t * 240, 130, packetText.replace('REG ', '').replace('DATA ', ''));
        }
        return null;
    }

    return null;
}

function initProtocolLab(options) {
    const {
        labId,
        canvasId,
        statusId,
        stepMetaId,
        playBtnId,
        speedSliderId,
        speedLabelId,
        protocol,
        buildFrames,
        readInputs,
        onInput,
    } = options;

    const labRoot = document.getElementById(labId);
    const canvas = document.getElementById(canvasId);
    const statusEl = document.getElementById(statusId);
    const stepMeta = stepMetaId ? document.getElementById(stepMetaId) : labRoot?.querySelector('.proto-step-meta');
    const playBtn = playBtnId ? document.getElementById(playBtnId) : labRoot?.querySelector('[data-action="play"]');
    const speedSlider = speedSliderId ? document.getElementById(speedSliderId) : labRoot?.querySelector('.proto-speed');
    const speedLabel = speedLabelId ? document.getElementById(speedLabelId) : null;
    if (!labRoot || !canvas) {
        console.warn('[protocol-lab] missing DOM for', labId, canvasId);
        return () => {};
    }

    let frame = null;
    let inputs = null;
    let stepIndex = -1; // -1 = not loaded
    let playing = false;
    let playTimer = null;
    let probedWire = null;

    function getSpeedMultiplier() {
        const raw = parseFloat(speedSlider?.value || '1');
        if (isNaN(raw) || raw <= 0) return 1;
        return Math.min(4, Math.max(0.25, raw));
    }

    function updateSpeedLabel() {
        if (!speedLabel) return;
        const s = getSpeedMultiplier();
        speedLabel.textContent = (Number.isInteger(s) ? String(s) : s.toFixed(2).replace(/\.?0+$/, '')) + '×';
    }

    function setStatus(text, live) {
        if (!statusEl) return;
        statusEl.textContent = text;
        statusEl.classList.toggle('live', !!live);
    }

    function stopPlay() {
        playing = false;
        if (playTimer) {
            clearTimeout(playTimer);
            playTimer = null;
        }
        labRoot.classList.remove('is-running');
        if (playBtn) playBtn.textContent = '▶ Play';
    }

    function progressForStep(idx) {
        if (!frame || !frame.labels.length) return 0;
        const n = frame.labels.length;
        if (idx < 0) return 0;
        // 0..1 scrub position matching current step (not one ahead)
        if (n <= 1) return 1;
        return Math.min(1, idx / (n - 1));
    }

    function formatExplainText(ex) {
        if (!ex) return '';
        if (typeof ex === 'string') return ex;
        return [ex.title, ex.what, ex.why, ex.notice].filter(Boolean).join(' ');
    }

    function updateStepMeta() {
        if (!stepMeta) return;
        if (!frame || stepIndex < 0) {
            stepMeta.innerHTML =
                '<div class="proto-step-head">Step — / —</div>' +
                '<p class="proto-step-explain">Click a chip or <strong>Next Step</strong> to load a transfer. Each step shows what happens, why it matters, and what to notice on the wires/scope.</p>';
            return;
        }
        const n = frame.labels.length;
        const label = frame.labels[stepIndex] || '—';
        const short = (frame.statusBySample && frame.statusBySample[stepIndex]) || '';
        const ex = frame.explainBySample && frame.explainBySample[stepIndex];

        const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

        let body = '';
        if (ex && typeof ex === 'object') {
            body =
                `<div class="proto-explain-block"><span class="proto-explain-label">What</span><p>${esc(ex.what)}</p></div>` +
                `<div class="proto-explain-block"><span class="proto-explain-label">Why</span><p>${esc(ex.why)}</p></div>` +
                `<div class="proto-explain-block"><span class="proto-explain-label">Notice</span><p>${esc(ex.notice)}</p></div>`;
            if (ex.signals) {
                const order = ['CS', 'SCK', 'MOSI', 'MISO', 'TX', 'RX', 'SCL', 'SDA'];
                const keys = order.filter((k) => ex.signals[k]);
                Object.keys(ex.signals).forEach((k) => {
                    if (!keys.includes(k)) keys.push(k);
                });
                body += '<div class="proto-signal-grid">';
                keys.forEach((k) => {
                    const color = ({
                        CS: '#7B2FBE', SCK: '#FFE66D', MOSI: '#FF6B35', MISO: '#00F5D4',
                        TX: '#FF6B35', RX: '#00F5D4', SCL: '#FFE66D', SDA: '#FF6B35',
                    })[k] || 'var(--accent-orange)';
                    const textColor = color === '#7B2FBE' ? '#FFFFFF' : '#000000';
                    body +=
                        `<div class="proto-signal-card" style="--sig-color:${color};--sig-text:${textColor}">` +
                        `<span class="proto-signal-name">${esc(k)}</span>` +
                        `<p>${esc(ex.signals[k])}</p>` +
                        `</div>`;
                });
                body += '</div>';
            }
        } else {
            body = `<p class="proto-step-explain">${esc(ex || short)}</p>`;
        }

        const pct = n > 1 ? Math.round((stepIndex / (n - 1)) * 100) : 100;
        stepMeta.innerHTML =
            `<div class="proto-step-head"><span>Step ${stepIndex + 1} / ${n} · ${esc(label)}</span>` +
            `<span class="proto-step-progress" aria-hidden="true"><span style="width:${pct}%"></span></span></div>` +
            (short ? `<div class="proto-step-short">${esc(short)}</div>` : '') +
            (ex && ex.title ? `<div class="proto-step-title">${esc(ex.title)}</div>` : '') +
            body;
    }

    function applyStep(idx) {
        if (!frame || !inputs) return;
        const n = frame.labels.length;
        stepIndex = Math.max(0, Math.min(n - 1, idx));
        const p = progressForStep(stepIndex);
        setLabWireActive(labRoot, frame.activeWiresBySample[stepIndex] || []);
        updateTransferVisuals(protocol, inputs, p, stepIndex, frame.labels);
        const ex = frame.explainBySample && frame.explainBySample[stepIndex];
        const explainText = formatExplainText(ex)
            || (frame.statusBySample && frame.statusBySample[stepIndex])
            || `Step ${frame.labels[stepIndex]}`;
        setStatus(explainText, true);
        // Pass stepIndex so scope shows exactly this sample (not one ahead)
        drawProtocolLanes(canvas, frame, p, stepIndex);
        updateStepMeta();
        if (stepIndex >= n - 1) stopPlay();
    }

    function redraw() {
        if (!frame) frame = buildFrames(readInputs(true));
        const rect = canvas.getBoundingClientRect();
        const p = stepIndex < 0 ? 1 : progressForStep(stepIndex);
        const upto = stepIndex < 0 ? undefined : stepIndex;
        if (rect.width < 2) {
            requestAnimationFrame(() => drawProtocolLanes(canvas, frame, p, upto));
            return;
        }
        drawProtocolLanes(canvas, frame, p, upto);
    }

    function loadTransfer() {
        const nextInputs = readInputs(false);
        if (!nextInputs) return false;
        stopPlay();
        probedWire = null;
        inputs = nextInputs;
        frame = buildFrames(inputs);
        resetTransferVisuals(protocol);
        labRoot.classList.add('is-running');
        applyStep(0);
        return true;
    }

    function resetTransfer() {
        stopPlay();
        stepIndex = -1;
        inputs = null;
        frame = buildFrames(readInputs(true));
        resetTransferVisuals(protocol);
        setLabWireActive(labRoot, []);
        setStatus('Reset — click Next or a chip to load a transfer', false);
        updateStepMeta();
        drawProtocolLanes(canvas, frame, 1);
    }

    function nextStep() {
        if (stepIndex < 0) {
            loadTransfer();
            return;
        }
        if (!frame) return;
        if (stepIndex >= frame.labels.length - 1) {
            setStatus('Transfer complete — Reset or Play again', false);
            stopPlay();
            return;
        }
        applyStep(stepIndex + 1);
    }

    function prevStep() {
        stopPlay();
        if (stepIndex < 0) return;
        if (stepIndex <= 0) {
            applyStep(0);
            return;
        }
        applyStep(stepIndex - 1);
    }

    function playAll() {
        if (playing) {
            stopPlay();
            setStatus('Paused — press Next or Play to continue', false);
            return;
        }
        if (stepIndex < 0 && !loadTransfer()) return;
        if (stepIndex >= frame.labels.length - 1) {
            if (!loadTransfer()) return;
        }
        playing = true;
        labRoot.classList.add('is-running');
        if (playBtn) playBtn.textContent = '⏸ Pause';

        const tick = () => {
            if (!playing) return;
            if (stepIndex >= frame.labels.length - 1) {
                stopPlay();
                setStatus('Transfer complete', false);
                return;
            }
            applyStep(stepIndex + 1);
            if (stepIndex >= frame.labels.length - 1) {
                stopPlay();
                return;
            }
            // Faster speed → shorter delay between steps
            const delay = Math.max(80, 550 / getSpeedMultiplier());
            playTimer = setTimeout(tick, delay);
        };
        playTimer = setTimeout(tick, Math.max(80, 550 / getSpeedMultiplier()));
    }

    function probeWire(wire) {
        if (!wire) return;
        probedWire = wire;
        if (playing) return;
        setLabWireActive(labRoot, [wire]);
        const help = (WIRE_HELP[protocol] && WIRE_HELP[protocol][wire]) || `Net: ${wire.toUpperCase()}`;
        setStatus(`Probe ${wire.toUpperCase()} — ${help}`, true);
    }

    onInput?.();
    updateSpeedLabel();
    speedSlider?.addEventListener('input', updateSpeedLabel);

    labRoot.querySelector('[data-action="next"]')?.addEventListener('click', (e) => {
        e.preventDefault();
        stopPlay();
        nextStep();
    });
    labRoot.querySelector('[data-action="prev"]')?.addEventListener('click', (e) => {
        e.preventDefault();
        prevStep();
    });
    labRoot.querySelector('[data-action="reset"]')?.addEventListener('click', (e) => {
        e.preventDefault();
        resetTransfer();
    });
    playBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        playAll();
    });

    labRoot.addEventListener('click', (e) => {
        const wireEl = e.target.closest('[data-wire]');
        const loadEl = e.target.closest('[data-action="load"]');

        if (wireEl && (wireEl.classList.contains('sch-pad') || wireEl.classList.contains('sch-wire') || wireEl.tagName === 'path' || wireEl.tagName === 'line' || wireEl.tagName === 'circle')) {
            e.preventDefault();
            e.stopPropagation();
            probeWire(wireEl.getAttribute('data-wire'));
            return;
        }

        if (loadEl) {
            e.preventDefault();
            loadTransfer();
        }
    });

    labRoot.addEventListener('keydown', (e) => {
        if (e.target.closest('input, select, textarea')) return;
        if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-action="load"]')) {
            e.preventDefault();
            loadTransfer();
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            stopPlay();
            nextStep();
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevStep();
        }
    });

    frame = buildFrames(readInputs(true));
    resetTransferVisuals(protocol);
    setStatus('Select tab · Next Step advances one bit/phase at a time', false);
    updateStepMeta();
    redraw();
    setTimeout(redraw, 120);

    redraw.stop = stopPlay;
    return redraw;
}

function initProtocolTabs(onTabChange) {
    const tabs = document.querySelectorAll('.proto-tab');
    const panels = document.querySelectorAll('.proto-tab-panel');
    if (!tabs.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const id = tab.dataset.tab;
            tabs.forEach((t) => {
                const on = t.dataset.tab === id;
                t.classList.toggle('active', on);
                t.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            panels.forEach((panel) => {
                const on = panel.dataset.tabPanel === id;
                panel.classList.toggle('active', on);
                if (on) panel.removeAttribute('hidden');
                else panel.setAttribute('hidden', '');
            });
            onTabChange?.(id);
        });
    });
}

function initProtocolsSection() {
    const redrawUart = initProtocolLab({
        labId: 'uart-lab',
        canvasId: 'uart-lab-canvas',
        statusId: 'uart-bb-status',
        stepMetaId: 'uart-step-meta',
        playBtnId: 'uart-run',
        speedSliderId: 'uart-speed',
        speedLabelId: 'uart-speed-label',
        protocol: 'uart',
        readInputs(fallback) {
            const input = document.getElementById('uart-byte-input');
            const val = parseHexByte(input?.value || '0x41');
            const baud = parseInt(document.getElementById('uart-baud-select')?.value, 10) || 115200;
            if (isNaN(val)) {
                if (!fallback) flashInputError(input);
                return fallback ? { byte: 0x41, baud } : null;
            }
            return { byte: val, baud };
        },
        buildFrames(inputs) {
            return buildUartFrames(inputs.byte, inputs.baud);
        },
        onInput() {
            const input = document.getElementById('uart-byte-input');
            const charDisplay = document.getElementById('uart-char-display');
            input?.addEventListener('input', () => {
                const val = parseHexByte(input.value);
                if (!isNaN(val) && charDisplay) {
                    const ch = (val >= 32 && val <= 126) ? String.fromCharCode(val) : '·';
                    charDisplay.textContent = `'${ch}'`;
                }
            });
        },
    });

    const redrawSpi = initProtocolLab({
        labId: 'spi-lab',
        canvasId: 'spi-lab-canvas',
        statusId: 'spi-bb-status',
        stepMetaId: 'spi-step-meta',
        playBtnId: 'spi-run',
        speedSliderId: 'spi-speed',
        speedLabelId: 'spi-speed-label',
        protocol: 'spi',
        readInputs(fallback) {
            const input = document.getElementById('spi-byte-input');
            const val = parseHexByte(input?.value || '0x9F');
            if (isNaN(val)) {
                if (!fallback) flashInputError(input);
                return fallback ? { byte: 0x9F } : null;
            }
            return { byte: val };
        },
        buildFrames(inputs) {
            return buildSpiFrames(inputs.byte, 0xA5);
        },
    });

    const redrawI2c = initProtocolLab({
        labId: 'i2c-lab',
        canvasId: 'i2c-lab-canvas',
        statusId: 'i2c-bb-status',
        stepMetaId: 'i2c-step-meta',
        playBtnId: 'i2c-run',
        speedSliderId: 'i2c-speed',
        speedLabelId: 'i2c-speed-label',
        protocol: 'i2c',
        readInputs(fallback) {
            const addrEl = document.getElementById('i2c-addr-input');
            const regEl = document.getElementById('i2c-reg-input');
            const dataEl = document.getElementById('i2c-data-input');
            const addr = parseHexByte(addrEl?.value || '0x48', 0x7F);
            const reg = parseHexByte(regEl?.value || '0x00');
            const data = parseHexByte(dataEl?.value || '0x2A');
            if (isNaN(addr) || isNaN(reg) || isNaN(data)) {
                if (!fallback) {
                    if (isNaN(addr)) flashInputError(addrEl);
                    if (isNaN(reg)) flashInputError(regEl);
                    if (isNaN(data)) flashInputError(dataEl);
                }
                return fallback ? { addr: 0x48, reg: 0x00, data: 0x2A } : null;
            }
            return { addr, reg, data };
        },
        buildFrames(inputs) {
            return buildI2cFrames(inputs.addr, inputs.reg, inputs.data);
        },
    });

    const redrawByTab = { uart: redrawUart, spi: redrawSpi, i2c: redrawI2c };

    initProtocolTabs((tabId) => {
        [redrawUart, redrawSpi, redrawI2c].forEach((r) => r.stop?.());
        // Hidden canvases need a redraw when their tab becomes visible
        setTimeout(() => redrawByTab[tabId]?.(), 50);
    });

    vizRedrawers['protocols'] = () => {
        redrawUart();
        redrawSpi();
        redrawI2c();
    };
    vizCleanups['protocols'] = () => {
        [redrawUart, redrawSpi, redrawI2c].forEach((r) => r.stop?.());
    };
}

// ---------------------------------------------------------------------------
// PWM VISUALIZER  (Canvas — timers section)
// ---------------------------------------------------------------------------
function initPwmViz() {
    const canvas = document.getElementById('pwm-viz-canvas');
    if (!canvas) return;

    const freqSlider  = document.getElementById('pwm-freq-slider');
    const dutySlider  = document.getElementById('pwm-duty-slider');
    const freqDisplay = document.getElementById('pwm-freq-display');
    const dutyDisplay = document.getElementById('pwm-duty-display');
    const arrVal      = document.getElementById('pwm-arr-val');
    const ccrVal      = document.getElementById('pwm-ccr-val');
    const actualVal   = document.getElementById('pwm-actual-val');

    function drawPWM() {
        const { ctx, W, H } = syncCanvasSize(canvas);
        const freq = parseInt(freqSlider?.value || 1000);
        const duty = parseInt(dutySlider?.value || 50);

        if (freqDisplay) freqDisplay.textContent = freq;
        if (dutyDisplay) dutyDisplay.textContent = duty;

        // 84 MHz timer clock, PSC = 83 → 1 MHz tick. PWM mode 1: duty = CCR / (ARR + 1)
        const arrValue = Math.round(1000000 / freq) - 1;
        const ccrValue = Math.round((arrValue + 1) * duty / 100);
        if (arrVal) arrVal.textContent = arrValue;
        if (ccrVal) ccrVal.textContent = ccrValue;
        if (actualVal) {
            const actual = 1000000 / (arrValue + 1);
            actualVal.textContent = `${actual.toFixed(1)} Hz, ${(100 * ccrValue / (arrValue + 1)).toFixed(1)}% duty`;
        }

        const isDark = document.body.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDark ? '#0D1117' : '#1E1E2E';
        ctx.fillRect(0, 0, W, H);

        const margin = 40;
        const high   = margin;
        const low    = H - margin;
        const drawW  = W - 2 * margin;

        // Grid
        ctx.strokeStyle = '#30363D';
        ctx.lineWidth   = 0.5;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(margin,    high);
        ctx.lineTo(W - margin, high);
        ctx.moveTo(margin,    low);
        ctx.lineTo(W - margin, low);
        ctx.stroke();
        ctx.setLineDash([]);

        // Labels
        ctx.fillStyle = '#6E7681';
        ctx.font      = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('3.3V', margin - 5, high + 4);
        ctx.fillText('0V',   margin - 5, low  + 4);

        // Draw PWM signal (show 4 periods)
        const periods    = 4;
        const periodWidth = drawW / periods;
        const highWidth   = periodWidth * (duty / 100);

        ctx.strokeStyle = '#00F5D4';
        ctx.lineWidth   = 3;
        ctx.beginPath();
        let first = true;
        for (let p = 0; p < periods; p++) {
            const px = margin + p * periodWidth;
            const segs = duty >= 100 ? [[px, px + periodWidth, high]]
                       : duty <= 0   ? [[px, px + periodWidth, low]]
                       : [[px, px + highWidth, high], [px + highWidth, px + periodWidth, low]];
            for (const [x0, x1, y] of segs) {
                if (first) { ctx.moveTo(x0, y); first = false; }
                else ctx.lineTo(x0, y);
                ctx.lineTo(x1, y);
            }
        }
        ctx.stroke();

        // Period annotation
        if (periods > 0) {
            const px = margin;
            ctx.strokeStyle = '#FF6B35';
            ctx.lineWidth   = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(px,              low + 15);
            ctx.lineTo(px + periodWidth, low + 15);
            ctx.stroke();
            ctx.setLineDash([]);

            // Arrowheads
            ctx.fillStyle = '#FF6B35';
            ctx.beginPath();
            ctx.moveTo(px,     low + 15);
            ctx.lineTo(px + 6, low + 12);
            ctx.lineTo(px + 6, low + 18);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(px + periodWidth,     low + 15);
            ctx.lineTo(px + periodWidth - 6, low + 12);
            ctx.lineTo(px + periodWidth - 6, low + 18);
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.font      = '10px "JetBrains Mono", monospace';
            ctx.fillText(`T = ${(1000 / freq).toFixed(2)}ms`, px + periodWidth / 2, low + 28);
        }

        // Duty cycle shading
        if (duty > 0 && duty < 100) {
            ctx.fillStyle = 'rgba(0, 245, 212, 0.1)';
            for (let p = 0; p < periods; p++) {
                const px = margin + p * periodWidth;
                ctx.fillRect(px, high, highWidth, low - high);
            }
        }

        ctx.textAlign = 'left';
    }

    freqSlider?.addEventListener('input', drawPWM);
    dutySlider?.addEventListener('input', drawPWM);

    vizRedrawers['timers'] = drawPWM;
    drawPWM();
}

// ---------------------------------------------------------------------------
// RTOS SCHEDULER VISUALIZER  (Canvas — rtos section)
// ---------------------------------------------------------------------------
function initRtosViz() {
    const canvas = document.getElementById('rtos-viz-canvas');
    if (!canvas) return;

    const tasks = [
        { name: 'LED (P1)',    color: '#FF6B35', priority: 1, period: 20, duration: 5 },
        { name: 'Sensor (P2)', color: '#00F5D4', priority: 2, period: 15, duration: 4 },
        { name: 'UART (P3)',   color: '#FFE66D', priority: 3, period: 30, duration: 8 },
    ];

    let scheduleData = [];
    let running      = false;
    let time         = 0;
    let animFrame    = null;
    let paused       = false;

    function draw() {
        const { ctx, W, H } = syncCanvasSize(canvas);
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDark ? '#0D1117' : '#1E1E2E';
        ctx.fillRect(0, 0, W, H);

        const margin = { top: 20, left: 100, right: 20, bottom: 40 };
        const gap    = 10;
        const trackH = Math.max(24, Math.min(46, (H - 90) / tasks.length - gap));
        const drawW  = W - margin.left - margin.right;
        const scale  = drawW / Math.max(time, 100);

        // Draw task tracks
        tasks.forEach((task, i) => {
            const y = margin.top + i * (trackH + gap);

            // Track label
            ctx.fillStyle = task.color;
            ctx.font      = '11px "JetBrains Mono", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(task.name, margin.left - 10, y + trackH / 2 + 4);

            // Track background
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            ctx.fillRect(margin.left, y, drawW, trackH);
            ctx.strokeStyle = '#30363D';
            ctx.lineWidth   = 1;
            ctx.strokeRect(margin.left, y, drawW, trackH);

            // Task execution blocks
            scheduleData.filter(e => e.taskIdx === i).forEach(event => {
                const x = margin.left + event.start * scale;
                const w = Math.max(2, (event.end - event.start) * scale);
                if (event.wait) {
                    // Ready but preempted: thin faded bar
                    ctx.globalAlpha = 0.35;
                    ctx.fillStyle = task.color;
                    ctx.fillRect(x, y + trackH / 2 - 3, w, 6);
                    ctx.globalAlpha = 1;
                    return;
                }
                ctx.fillStyle = task.color;
                ctx.fillRect(x, y + 2, w, trackH - 4);
                // Add subtle border
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth   = 1;
                ctx.strokeRect(x, y + 2, w, trackH - 4);
            });
        });

        // Time axis
        const axisY = margin.top + tasks.length * (trackH + gap) + 10;
        ctx.strokeStyle = '#6E7681';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(margin.left,    axisY);
        ctx.lineTo(W - margin.right, axisY);
        ctx.stroke();

        // Time ticks
        ctx.fillStyle = '#6E7681';
        ctx.font      = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        const tickInterval = Math.max(1, Math.floor(time / 10));
        for (let t = 0; t <= time; t += tickInterval) {
            const x = margin.left + t * scale;
            ctx.beginPath();
            ctx.moveTo(x, axisY - 3);
            ctx.lineTo(x, axisY + 3);
            ctx.stroke();
            ctx.fillText(t.toString(), x, axisY + 15);
        }

        // Current time indicator
        const timeX = margin.left + time * scale;
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth   = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(timeX, margin.top - 5);
        ctx.lineTo(timeX, axisY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Status text
        ctx.fillStyle = running ? '#22C55E' : '#EF4444';
        ctx.font      = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
            running ? (paused ? '⏸ PAUSED' : '▶ RUNNING') : '⏹ STOPPED',
            margin.left, H - 8
        );
        ctx.textAlign = 'left';
    }

    let loopTimer = null;

    function stopLoop() {
        if (animFrame) cancelAnimationFrame(animFrame);
        clearTimeout(loopTimer);
        animFrame = loopTimer = null;
    }

    function queueSchedule() {
        stopLoop();
        animFrame = requestAnimationFrame(() => { loopTimer = setTimeout(schedule, 80); });
    }

    function extendBlock(taskIdx, wait) {
        const last = scheduleData.filter(e => e.taskIdx === taskIdx && !!e.wait === wait).pop();
        if (last && last.end === time - 1) last.end = time;
        else scheduleData.push({ taskIdx, start: time - 1, end: time, wait });
    }

    function schedule() {
        if (!running || paused) return;

        // Release periodic jobs at the start of each period
        tasks.forEach(t => {
            if (time % t.period === 0) t.remaining = (t.remaining || 0) + t.duration;
        });

        time++;

        // Preemptive priority scheduling: highest-priority READY task runs
        let activeTask = -1;
        tasks.forEach((t, i) => {
            if (t.remaining > 0 && (activeTask < 0 || t.priority > tasks[activeTask].priority)) activeTask = i;
        });

        tasks.forEach((t, i) => {
            if (i === activeTask) {
                t.remaining--;
                extendBlock(i, false);
            } else if (t.remaining > 0) {
                extendBlock(i, true);   // ready but preempted
            }
        });

        draw();
        queueSchedule();
    }

    document.getElementById('rtos-start')?.addEventListener('click', () => {
        if (!running) {
            running = true;
            paused  = false;
            updatePauseLabel();
            schedule();
        }
    });

    document.getElementById('rtos-add-task')?.addEventListener('click', () => {
        if (tasks.length < 5) {
            const colors = ['#FF006E', '#ADFF2F', '#3B82F6'];
            const prio = tasks.length + 1;
            tasks.push({
                name:     `Task ${prio} (P${prio})`,
                color:    colors[tasks.length % colors.length],
                priority: prio,
                period:   20 + Math.floor(Math.random() * 20),
                duration: 2  + Math.floor(Math.random() * 3),
                remaining: 0,
            });
            // Update task list display
            const taskList = document.getElementById('rtos-task-list');
            if (taskList) {
                const t = tasks[tasks.length - 1];
                const info = document.createElement('div');
                info.className = 'rtos-task-info';
                info.style.setProperty('--task-color', t.color);
                info.textContent = `Task ${prio}: New (Priority: ${prio}, runs ${t.duration} every ${t.period} ticks)`;
                taskList.appendChild(info);
            }
            draw();
        }
    });

    const pauseBtn = document.getElementById('rtos-pause');
    function updatePauseLabel() {
        if (pauseBtn) pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
    }

    pauseBtn?.addEventListener('click', () => {
        if (!running) return;
        paused = !paused;
        if (paused) stopLoop();
        else schedule();
        updatePauseLabel();
        draw();
    });

    document.getElementById('rtos-reset')?.addEventListener('click', () => {
        running = false;
        paused  = false;
        stopLoop();
        updatePauseLabel();
        scheduleData = [];
        time = 0;
        // Reset tasks to original 3
        tasks.length = 3;
        tasks.forEach(t => { t.remaining = 0; });
        const taskList = document.getElementById('rtos-task-list');
        if (taskList) {
            while (taskList.children.length > 3) taskList.removeChild(taskList.lastChild);
        }
        draw();
    });

    vizCleanups['rtos'] = () => {
        if (running && !paused) {
            paused = true;
            stopLoop();
            updatePauseLabel();
            draw();
        }
    };
    vizRedrawers['rtos'] = draw;
    draw();
}

// ---------------------------------------------------------------------------
// REGISTER THE INITIALIZERS IN THE MAP
// ---------------------------------------------------------------------------
vizInitializers['memory']     = initMemoryViz;
vizInitializers['datatypes']  = initSizeofExplorer;
vizInitializers['bitwise']    = initBitwiseCalculator;
vizInitializers['pointers']   = initPointerViz;
vizInitializers['registers']  = () => { initRegisterExplorer(); initGpioLab(); };
vizInitializers['interrupts'] = initInterruptViz;
vizInitializers['protocols']  = initProtocolsSection;
vizInitializers['timers']     = initPwmViz;
vizInitializers['rtos']       = initRtosViz;

// ===========================================================================
// DOM CONTENT LOADED — MAIN ENTRY POINT
// ===========================================================================
document.addEventListener('DOMContentLoaded', () => {

    // -----------------------------------------------------------------------
    // 1. NAVIGATION SYSTEM
    // -----------------------------------------------------------------------
    const navLinks        = document.querySelectorAll('.nav-link');
    const sections        = document.querySelectorAll('.content-section');
    const sidebar         = document.getElementById('sidebar');
    const overlay         = document.getElementById('sidebar-overlay');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

    function showSection(sectionId, { updateHash = true } = {}) {
        if (!document.getElementById(sectionId)) sectionId = 'hero';
        const prev = document.querySelector('.content-section.active');
        if (prev && prev.id !== sectionId && vizCleanups[prev.id]) vizCleanups[prev.id]();

        if (updateHash && location.hash.slice(1) !== sectionId) {
            history.replaceState(null, '', sectionId === 'hero' ? location.pathname : '#' + sectionId);
        }

        sections.forEach(s => s.classList.remove('active'));
        navLinks.forEach(l => l.classList.remove('active'));

        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.add('active');
            // Re-trigger card animations
            target.querySelectorAll('.bento-card').forEach((card, i) => {
                card.style.animation = 'none';
                card.offsetHeight; // force reflow
                card.style.animation = `cardSlideIn 0.5s ease ${i * 0.05}s backwards`;
            });
        }

        navLinks.forEach(l => {
            if (l.dataset.section === sectionId) l.classList.add('active');
        });

        // Close mobile sidebar
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');

        // Update progress
        updateProgress(sectionId);

        // Initialize visualizations for this section
        initVisualization(sectionId);

        window.scrollTo(0, 0);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(link.dataset.section);
        });
    });

    // Hero CTA buttons
    document.querySelectorAll('.btn[data-section]').forEach(btn => {
        btn.addEventListener('click', () => showSection(btn.dataset.section));
    });

    // Mobile menu
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            if (sidebar) sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('active');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // -----------------------------------------------------------------------
    // 2. THEME TOGGLE
    // -----------------------------------------------------------------------
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const themeIcon = themeToggle.querySelector('.theme-icon');
        const themeText = themeToggle.querySelector('.theme-text');

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeButton(savedTheme);

        themeToggle.addEventListener('click', () => {
            const current  = document.body.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeButton(newTheme);
            // Redraw any active canvas (do not re-bind listeners)
            redrawActiveCanvases();
        });

        function updateThemeButton(theme) {
            if (themeIcon) themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
            if (themeText) themeText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
        }
    }

    // -----------------------------------------------------------------------
    // 3. PROGRESS TRACKING
    // -----------------------------------------------------------------------
    const validIds = new Set([...sections].map(s => s.id));
    let storedVisited = [];
    try {
        const parsed = JSON.parse(localStorage.getItem('visitedSections') || '[]');
        if (Array.isArray(parsed)) storedVisited = parsed;
    } catch { /* corrupt storage: start fresh */ }
    const visitedSections = new Set(storedVisited.filter(id => validIds.has(id)));

    function updateProgress(sectionId) {
        visitedSections.add(sectionId);
        localStorage.setItem('visitedSections', JSON.stringify([...visitedSections]));

        const total   = sections.length;
        const visited = visitedSections.size;
        const pct     = (visited / total) * 100;

        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        if (progressFill) progressFill.style.width  = pct + '%';
        if (progressText) progressText.textContent   = `${visited} / ${total}`;
    }

    // -----------------------------------------------------------------------
    // 4. INITIALIZE HERO SECTION
    // -----------------------------------------------------------------------
    const initialSection = location.hash.slice(1);
    if (initialSection && validIds.has(initialSection) && initialSection !== 'hero') {
        showSection(initialSection, { updateHash: false });
    } else {
        updateProgress('hero');
    }
    window.addEventListener('hashchange', () => {
        showSection(location.hash.slice(1) || 'hero', { updateHash: false });
    });

    // -----------------------------------------------------------------------
    // 5. HANDLE WINDOW RESIZE FOR CANVASES
    // -----------------------------------------------------------------------
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Canvases keep listeners; only resize/redraw the active one
            redrawActiveCanvases();
        }, 300);
    });
});
