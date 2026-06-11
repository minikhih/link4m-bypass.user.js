// ==UserScript==
// @name         Vio.edu.vn Tools V6.3 (Optimized Snapshot)
// @namespace    http://tampermonkey.net/
// @version      6.3
// @description  Tối ưu chụp ảnh (Siêu nhanh & Nét), UI Dark Tech, Auto.
// @author       VioUser
// @match        *://*.vio.edu.vn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vio.edu.vn
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ================= CONFIG & STATE =================
    const UI_ID = 'vio-ui-root';
    const BTN_ID = 'vio-btn';

    // Config
    const defaultConfig = { showButton: true, silentAuto: false, shortcut: 'Control+k' };
    let config = JSON.parse(localStorage.getItem('vio_config')) || defaultConfig;
    const saveConfig = () => { localStorage.setItem('vio_config', JSON.stringify(config)); applyConfig(); };

    let data = [], autoOn = false, autoInt = null, lastHash = '';

    // Screenshot State
    let screenshotMode = false;
    let isSelecting = false;
    let startX = 0, startY = 0;
    let fullScreenCanvas = null; // Lưu ảnh chụp toàn màn hình tạm thời
    let capturedImageData = null; // Lưu ảnh kết quả sau khi cắt

    // ================= CSS (DARK TECH THEME) =================
    const css = `
        :root { --vio-bg: #121212; --vio-panel-bg: #1e1e1e; --vio-border: #333; --vio-accent: #00bcd4; --vio-text: #e0e0e0; }

        /* BUTTON */
        #${BTN_ID} {
            position: fixed !important; top: 15%; right: 15px;
            width: 44px !important; height: 44px !important;
            background: var(--vio-panel-bg); color: var(--vio-accent) !important;
            border: 2px solid var(--vio-accent) !important; border-radius: 12px !important;
            cursor: move !important; z-index: 2147483647 !important;
            font-size: 18px !important; font-weight: bold !important;
            display: flex !important; align-items: center !important; justify-content: center !important;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important;
            user-select: none; touch-action: none; transition: transform 0.1s;
        }
        #${BTN_ID}:active { transform: scale(0.9); }
        #${BTN_ID}.hidden { display: none !important; }

        /* PANEL */
        #vio-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 2147483640 !important; opacity: 0; visibility: hidden; transition: 0.2s; }
        #vio-overlay.show { opacity: 1; visibility: visible; }

        #vio-panel {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.95);
            width: 400px; max-width: 95vw; height: 600px; max-height: 95vh;
            background: var(--vio-bg); border: 1px solid var(--vio-border);
            border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);
            z-index: 2147483641 !important; display: flex; flex-direction: column;
            opacity: 0; visibility: hidden; transition: 0.2s;
            font-family: 'Segoe UI', sans-serif !important; color: var(--vio-text) !important;
        }
        #vio-panel.show { opacity: 1; visibility: visible; transform: translate(-50%, -50%) scale(1); }

        /* COMPONENTS */
        .vio-header { padding: 12px 15px; background: var(--vio-panel-bg); border-bottom: 1px solid var(--vio-border); display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0; }
        .vio-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #fff; }
        #vio-x { cursor: pointer; font-size: 20px; color: #888; }

        .vio-tabs { display: flex; background: var(--vio-panel-bg); border-bottom: 1px solid var(--vio-border); }
        .vio-tab { flex: 1; text-align: center; padding: 10px; cursor: pointer; font-size: 13px; font-weight: 600; color: #777; }
        .vio-tab.active { color: var(--vio-accent); border-bottom: 2px solid var(--vio-accent); background: #252525; }

        .vio-content { flex: 1; overflow-y: auto; padding: 15px; display: none; }
        .vio-content.active { display: block; }

        .vq { margin-bottom: 10px; border: 1px solid var(--vio-border); padding: 10px; border-radius: 6px; background: #1a1a1a; }
        .vq-t { font-weight: 600; display: block; margin-bottom: 6px; font-size: 14px; color: #fff; }
        .vopt { display: block; font-size: 13px; color: #aaa; margin-top: 2px; }
        .vopt.ok { color: var(--vio-accent); font-weight: bold; }

        .st-group { margin-bottom: 15px; border: 1px solid var(--vio-border); padding: 10px; border-radius: 6px; background: #1a1a1a; }
        .st-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
        .toggle-switch { position: relative; width: 36px; height: 20px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; inset: 0; background-color: #333; transition: .2s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: #888; transition: .2s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--vio-accent); }
        input:checked + .slider:before { transform: translateX(16px); background-color: #fff; }
        #shortcut-input { width: 100%; padding: 8px; background: #000; border: 1px solid #444; color: var(--vio-accent); text-align: center; margin-top: 5px; font-weight: bold; }

        .vio-controls { padding: 10px; border-top: 1px solid var(--vio-border); background: var(--vio-panel-bg); border-radius: 0 0 8px 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .vio-btn { padding: 10px; border: 1px solid var(--vio-border); border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; color: #ccc; background: #2a2a2a; display: flex; align-items: center; justify-content: center; }
        .vio-btn:hover { background: #333; color: #fff; }
        .btn-full { grid-column: span 2; background: var(--vio-accent); color: #000; border: none; }
        .btn-auto.on { background: #e74c3c; color: #fff; animation: pulse 1s infinite alternate; }
        @keyframes pulse { from { opacity: 1; } to { opacity: 0.7; } }

        #vio-toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #222; color: #fff; border: 1px solid #444; padding: 10px 20px; font-size: 13px; font-weight: 600; border-radius: 4px; z-index: 2147483645 !important; opacity: 0; visibility: hidden; transition: 0.2s; }
        #vio-toast.show { opacity: 1; visibility: visible; bottom: 90px; }

        /* OPTIMIZED SCREENSHOT UI */
        #screenshot-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 2147483646; cursor: crosshair; display: none; }
        #screenshot-overlay.active { display: block; }
        #screenshot-selection { position: fixed; border: 2px dashed #00bcd4; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); z-index: 2147483647; display: none; pointer-events: none; }

        #screenshot-toolbar {
            position: fixed; z-index: 2147483648; background: #111; border: 1px solid #555;
            padding: 8px; display: none; gap: 10px; border-radius: 6px; box-shadow: 0 5px 20px rgba(0,0,0,0.7);
        }
        #screenshot-toolbar.show { display: flex; }
        #screenshot-toolbar button {
            border: none; padding: 8px 15px; cursor: pointer; font-size: 12px; font-weight: bold; border-radius: 4px; color: #fff;
        }
        .st-save { background: #0984e3; }
        .st-copy { background: #00b894; }
        .st-close { background: #d63031; }
        #screenshot-toolbar button:hover { opacity: 0.9; transform: translateY(-1px); }
    `;

    // ================= UI GENERATION =================
    GM_addStyle(css);

    function createUI() {
        if (document.getElementById(BTN_ID)) return;

        const div = document.createElement('div');
        div.id = UI_ID;
        div.innerHTML = `
            <div id="${BTN_ID}" title="Tools V6.3">⚡</div>
            <div id="vio-overlay"></div>
            <div id="vio-panel">
                <div class="vio-header">
                    <h3>Vio Tools V6.3</h3>
                    <div id="vio-x">✕</div>
                </div>
                <div class="vio-tabs">
                    <div class="vio-tab active" data-tab="main">HOME</div>
                    <div class="vio-tab" data-tab="settings">SETUP</div>
                </div>

                <div class="vio-content active" id="tab-main">
                    <div style="display:flex; justify-content:space-between; font-size:11px; color:#888; margin-bottom:10px;">
                        <span id="vio-st">READY (Press '1')</span>
                        <span>Saved: <b id="vio-total" style="color:#fff">0</b></span>
                    </div>
                    <div id="vio-list">
                        <div style="text-align:center;color:#444;margin-top:50px;font-size:13px;">[ NO DATA ]</div>
                    </div>
                </div>

                <div class="vio-content" id="tab-settings">
                    <div class="st-group"><div class="st-row"><span>Show Button</span> <label class="toggle-switch"><input type="checkbox" id="cfg-showBtn"><span class="slider"></span></label></div></div>
                    <div class="st-group"><div class="st-row"><span>Silent Auto</span> <label class="toggle-switch"><input type="checkbox" id="cfg-silent"><span class="slider"></span></label></div></div>
                    <div class="st-group">
                        <div style="font-size:12px; margin-bottom:5px; color:#888;">SHORTCUT (Default: Ctrl+K)</div>
                        <input type="text" id="shortcut-input" readonly value="${config.shortcut}">
                    </div>
                </div>

                <div class="vio-controls">
                    <button class="vio-btn btn-full" id="vio-get">GET QUESTION</button>
                    <button class="vio-btn btn-auto" id="vio-auto">AUTO RUN</button>
                    <button class="vio-btn" id="vio-copy">COPY ALL</button>
                    <button class="vio-btn" id="vio-screenshot">SCREENSHOT</button>
                    <button class="vio-btn" id="vio-clr">CLEAR</button>
                </div>
            </div>
            <div id="vio-toast"></div>

            <!-- SCREENSHOT UI -->
            <canvas id="screenshot-canvas" style="display:none"></canvas>
            <div id="screenshot-overlay"></div>
            <div id="screenshot-selection"></div>
            <div id="screenshot-toolbar">
                <button class="st-save">💾 SAVE</button>
                <button class="st-copy">📋 COPY</button>
                <button class="st-close">✕ CLOSE</button>
            </div>
        `;
        document.body.appendChild(div);

        $('#cfg-showBtn').checked = config.showButton;
        $('#cfg-silent').checked = config.silentAuto;
        applyConfig();
        makeDraggable($('#' + BTN_ID));
        attachEvents();
    }

    const $ = s => document.querySelector(s);
    const $$ = s => [...document.querySelectorAll(s)];

    // ================= EVENTS & LOGIC =================
    function attachEvents() {
        $$('.vio-tab').forEach(t => t.onclick = () => {
            $$('.vio-tab').forEach(x => x.classList.remove('active')); t.classList.add('active');
            $$('.vio-content').forEach(c => c.classList.remove('active')); $('#tab-'+t.dataset.tab).classList.add('active');
        });

        $('#cfg-showBtn').onchange = e => { config.showButton = e.target.checked; saveConfig(); };
        $('#cfg-silent').onchange = e => { config.silentAuto = e.target.checked; saveConfig(); };

        $('#shortcut-input').onkeydown = e => {
            e.preventDefault();
            const keys = [];
            if(e.ctrlKey) keys.push('Control'); if(e.altKey) keys.push('Alt'); if(e.shiftKey) keys.push('Shift');
            if(!['Control','Alt','Shift'].includes(e.key)) keys.push(e.key.length===1?e.key.toLowerCase():e.key);
            if(keys.length){ config.shortcut=keys.join('+'); e.target.value=config.shortcut; saveConfig(); toast('Shortcut Set: ' + config.shortcut); }
        };

        $('#vio-x').onclick = hide;
        $('#vio-overlay').onclick = hide;
        $('#vio-get').onclick = doGet;
        $('#vio-auto').onclick = toggleAuto;
        $('#vio-copy').onclick = () => copyAll(false);
        $('#vio-clr').onclick = () => { data = []; render(); toast('Data Cleared'); };
        $('#vio-screenshot').onclick = startScreenshot;

        // --- OPTIMIZED SCREENSHOT HANDLERS ---
        const overlay = $('#screenshot-overlay');

        overlay.onmousedown = e => {
            if(!screenshotMode || !fullScreenCanvas) return;
            isSelecting=true; startX=e.clientX; startY=e.clientY;
            const sel = $('#screenshot-selection');
            sel.style.display='block';
            sel.style.left = startX + 'px'; sel.style.top = startY + 'px';
            sel.style.width = '0px'; sel.style.height = '0px';
            $('#screenshot-toolbar').classList.remove('show');
        };

        overlay.onmousemove = e => {
            if(screenshotMode&&isSelecting){
                const sel = $('#screenshot-selection');
                const w = Math.abs(e.clientX - startX);
                const h = Math.abs(e.clientY - startY);
                const l = Math.min(e.clientX, startX);
                const t = Math.min(e.clientY, startY);
                sel.style.left = l + 'px'; sel.style.top = t + 'px';
                sel.style.width = w + 'px'; sel.style.height = h + 'px';
            }
        };

        overlay.onmouseup = () => {
            if(screenshotMode&&isSelecting){
                isSelecting=false;
                const sel = $('#screenshot-selection');
                const rect = sel.getBoundingClientRect();

                if(rect.width>10 && rect.height > 10 && fullScreenCanvas){
                    // Cắt ảnh từ Canvas đã chụp sẵn (Siêu nhanh)
                    // Lưu ý: Canvas gốc được chụp với tỉ lệ DevicePixelRatio
                    const scale = window.devicePixelRatio || 1;
                    const cropCanvas = document.createElement('canvas');
                    cropCanvas.width = rect.width * scale;
                    cropCanvas.height = rect.height * scale;
                    const ctx = cropCanvas.getContext('2d');

                    // Vẽ phần cắt
                    // Source X/Y cần nhân với scale vì fullScreenCanvas lớn gấp 'scale' lần màn hình
                    // Nhưng rect.left/top lấy từ viewport nên phải nhân scale để khớp với canvas gốc
                    ctx.drawImage(
                        fullScreenCanvas,
                        rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale,
                        0, 0, rect.width * scale, rect.height * scale
                    );

                    capturedImageData = cropCanvas.toDataURL('image/png');

                    const toolbar=$('#screenshot-toolbar');
                    let topPos = rect.bottom + 10;
                    if (topPos + 50 > window.innerHeight) topPos = rect.top - 50;
                    toolbar.style.top = topPos + 'px';
                    toolbar.style.left = Math.max(10, rect.left) + 'px';
                    toolbar.classList.add('show');
                }
            }
        };

        $('#screenshot-toolbar .st-save').onclick = () => { const a=document.createElement('a'); a.download='vio-shot-'+Date.now()+'.png'; a.href=capturedImageData; a.click(); endScreen(); };
        $('#screenshot-toolbar .st-copy').onclick = async () => { try{await navigator.clipboard.write([new ClipboardItem({'image/png':await(await fetch(capturedImageData)).blob()})]);toast('✅ Ảnh đã Copy!');}catch(e){toast('❌ Lỗi Copy');} endScreen(); };
        $('#screenshot-toolbar .st-close').onclick = endScreen;
    }

    // ================= FUNCTIONS =================
    function startScreenshot() {
        if (typeof html2canvas !== 'function') return toast('Loading Library...');
        hide(); // Ẩn UI tool ngay lập tức
        toast('📷 Đang chụp màn hình...');

        // Tối ưu: Chụp Viewport (Phần đang nhìn thấy) thay vì toàn bộ trang scroll
        // Điều này giúp chụp nhanh hơn rất nhiều và tránh lag
        const scale = window.devicePixelRatio || 1;

        setTimeout(() => {
            html2canvas(document.body, {
                x: window.scrollX, // Chỉ lấy từ vị trí scroll hiện tại
                y: window.scrollY,
                width: window.innerWidth, // Chỉ lấy chiều rộng màn hình
                height: window.innerHeight, // Chỉ lấy chiều cao màn hình
                scale: scale, // Giữ độ nét HD
                useCORS: true,
                ignoreElements: el => el.id === UI_ID // Bỏ qua UI tool
            }).then(canvas => {
                fullScreenCanvas = canvas; // Lưu canvas vào RAM
                screenshotMode = true;
                $('#screenshot-overlay').classList.add('active');
                toast('✂️ Kéo chuột để chọn vùng');
            }).catch(e => {
                console.error(e);
                toast('❌ Lỗi chụp ảnh');
                show();
            });
        }, 100); // Delay nhỏ để UI kịp ẩn
    }

    function makeDraggable(el) {
        let isDrag = false, hasMoved = false, sx, sy, ix, iy;
        const down = e => { isDrag=true; hasMoved=false; sx=e.clientX||e.touches[0].clientX; sy=e.clientY||e.touches[0].clientY; const r=el.getBoundingClientRect(); ix=r.left; iy=r.top; el.style.transition='none';
            document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); document.addEventListener('touchmove',move,{passive:false}); document.addEventListener('touchend',up); };
        const move = e => { if(!isDrag)return; const cx=e.clientX||e.touches[0].clientX; const cy=e.clientY||e.touches[0].clientY; if(Math.abs(cx-sx)>5||Math.abs(cy-sy)>5) hasMoved=true; el.style.left=(ix+cx-sx)+'px'; el.style.top=(iy+cy-sy)+'px'; el.style.right='auto'; if(e.preventDefault)e.preventDefault(); };
        const up = () => { isDrag=false; el.style.transition='transform 0.1s'; document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); document.removeEventListener('touchmove',move); document.removeEventListener('touchend',up); };
        el.addEventListener('mousedown', down); el.addEventListener('touchstart', down, {passive:false});
        el.onclick = e => { if(hasMoved){e.stopImmediatePropagation(); return;} if($('#vio-panel').classList.contains('show')) hide(); else show(); };
    }

    function applyConfig() { const b=$('#'+BTN_ID); if(b) config.showButton ? b.classList.remove('hidden') : b.classList.add('hidden'); }
    function show() { $('#vio-panel').classList.add('show'); $('#vio-overlay').classList.add('show'); }
    function hide() { $('#vio-panel').classList.remove('show'); $('#vio-overlay').classList.remove('show'); }
    function toast(m) { const t=$('#vio-toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 2000); }
    function endScreen() {
        screenshotMode=false; isSelecting=false; fullScreenCanvas=null;
        $('#screenshot-overlay').classList.remove('active');
        $('#screenshot-selection').style.display='none';
        $('#screenshot-toolbar').classList.remove('show');
        show();
    }

    const hash = s => s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    function getQuestion() {
        let qT = '', opts = [];
        const qEl = $('.box--practice__content .row') || $('.practice-question-text') || $('[class*="question-text"]');
        if (qEl) {
            if (qEl.classList && qEl.classList.contains('row')) { qT = qEl.innerText.trim(); $$('.specialAnswert').forEach((el, i) => opts.push({ label: String.fromCharCode(65+i), text: el.innerText.trim(), isCorrect: false })); }
            else { qT = qEl.innerText.trim(); }
        }
        if(!qT) { const m = document.body.innerText.match(/(?:Câu hỏi|Question)[:\.]?\s*([\s\S]{10,500}?)(?=\n[A-D])/i); if(m) qT=m[1].trim(); }
        if (opts.length === 0) {
            $$('.box-choice-stype-one, .box-text-stype-one, .control-answer-ckeditor').forEach((el, i) => {
                let text = el.innerText.trim(); if (!text) return;
                let isCorrect = false; const s = window.getComputedStyle(el);
                if (el.className.includes('correct') || (s.color && s.color.includes('0, 128'))) isCorrect = true;
                opts.push({ label: String(i+1), text, isCorrect });
            });
        }
        if (!qT || opts.length < 2) return null;
        qT = qT.replace(/^Bạn hãy chọn đáp án đúng\.?/i, '').trim();
        return { question: qT, options: opts, hash: hash(qT) };
    }

    function render() {
        const lst = $('#vio-list');
        if (data.length === 0) lst.innerHTML = `<div style="text-align:center;color:#444;margin-top:50px;font-size:13px;">[ NO DATA ]</div>`;
        else {
            lst.innerHTML = data.map((q, i) => `
                <div class="vq">
                    <span class="vq-t">[Q${i+1}] ${q.question}</span>
                    ${q.options.map(o => `<span class="vopt ${o.isCorrect?'ok':''}">${o.isCorrect?'+':'-'} ${o.text}</span>`).join('')}
                </div>
            `).join('');
            lst.scrollTop = lst.scrollHeight;
        }
        $('#vio-total').textContent = data.length;
    }

    function doGet() {
        const q = getQuestion();
        if(!q) return toast('No Question Found');
        if(data.find(d => d.hash === q.hash)) return toast('Already Saved');
        data.push(q); render(); lastHash = q.hash; toast('Saved');
    }

    function toggleAuto() {
        autoOn = !autoOn; const btn = $('#vio-auto');
        if(autoOn) {
            btn.classList.add('on'); toast('Auto ON');
            autoInt = setInterval(() => {
                const q = getQuestion();
                if(q && q.hash !== lastHash && !data.find(d => d.hash === q.hash)) {
                    data.push(q); render(); lastHash = q.hash; copyAll(true);
                    if (!config.silentAuto) toast('Auto: Saved & Copied');
                }
            }, 1000); doGet();
        } else {
            btn.classList.remove('on'); clearInterval(autoInt); toast('Auto OFF');
        }
    }

    function copyAll(isAuto) {
        if(!data.length && !isAuto) return toast('List Empty');
        if(!data.length && isAuto) return;
        let t = data.map((q,i) => `Q${i+1}: ${q.question}\n${q.options.map(o => (o.isCorrect?'+ ':'- ') + o.text).join('\n')}`).join('\n\n');
        GM_setClipboard(t); data = []; render();
        if (!isAuto) toast('Copied & Cleared');
    }

    // ================= MAIN =================
    createUI(); setInterval(createUI, 2000);

    document.addEventListener('keydown', e => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        const keys=[]; if(e.ctrlKey)keys.push('Control'); if(e.altKey)keys.push('Alt'); if(e.shiftKey)keys.push('Shift');
        if(!['Control','Alt','Shift'].includes(e.key)) keys.push(e.key.length===1?e.key.toLowerCase():e.key);
        const currentCombo = keys.join('+').toLowerCase();

        if (e.key === '1' || currentCombo === config.shortcut.toLowerCase()) {
            e.preventDefault();
            $('#vio-panel').classList.contains('show') ? hide() : show();
        }
        if(e.key==='Escape') { if(screenshotMode) endScreen(); else hide(); }
    });
})();
