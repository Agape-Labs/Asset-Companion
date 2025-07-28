// sidebar.js – Asset Companion side-panel controller

import { sendToContentScript } from './utils/messaging.js';

const resultsEl = document.getElementById('results');
let pickedColors = [];
let imageData = [];

/* ──────────────────────────────────
   init: dynamic year in footer
*/
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('current-year');
  if (y) y.textContent = new Date().getFullYear();
});

/* ──────────────────────────────────
   toolbox wiring
*/
document.getElementById('btn-images')?.addEventListener('click', handleImages);
document.getElementById('btn-fonts')?.addEventListener('click', handleFonts);
document.getElementById('btn-colours')?.addEventListener('click', handleColors);
document.getElementById('btn-pick')?.addEventListener('click', handlePickColor);
document.getElementById('btn-shot')?.addEventListener('click', handleScreenshot);
document.getElementById('btn-refresh')?.addEventListener('click', refreshPanel);
document.getElementById('btn-toggle-rc')?.addEventListener('click', handleRightClick);

/* ╔════════════════════════════════╗
   ║ 1. IMAGES (folder download)    ║
   ╚════════════════════════════════╝ */
async function handleImages() {
  clear(); msg('🔍 Scanning images…');
  try {
    const { images } = await send('get-images-enhanced');
    if (!images?.length) return msg('No images found');
    imageData = images; 
    renderImageUI(images);
  } catch (e) { err(e.message); }
}

function renderImageUI(imgs) {
  const wrap = t('image-grid-template');
  if (!wrap) return err('Template not found');
  
  const grid = wrap.getElementById('image-grid');
  const item = document.getElementById('image-item-template')?.content;
  if (!item) return err('Item template not found');

  const size = wrap.getElementById('size-filter');
  const aspect = wrap.getElementById('aspect-filter');
  const type = wrap.getElementById('type-filter');
  const dlAll = wrap.getElementById('download-all-btn');
  
  if (size) size.onchange = filter;
  if (aspect) aspect.onchange = filter;
  if (type) type.onchange = filter;
  
  // Download all images into domain folder
  if (dlAll) {
    dlAll.onclick = async () => {
      const current = [...grid.querySelectorAll('.image-thumbnail')].map(i => i.src);
      if (current.length) {
        dlAll.disabled = true;
        dlAll.textContent = 'Downloading…';
        await downloadAllImages(current);
        dlAll.disabled = false;
        dlAll.innerHTML = '<img src="icons/download.png" alt="" class="download-icon">Download All';
      }
    };
  }

  resultsEl.appendChild(wrap); 
  filter();

  function filter() {
    const S = size?.value || '';
    const A = aspect?.value || '';
    const T = type?.value || '';
    grid.innerHTML = '';
    
    imgs.filter(i => {
      const m = Math.max(i.width, i.height), r = i.width / i.height;
      if (S === 'small' && m >= 200) return false;
      if (S === 'medium' && (m < 200 || m > 800)) return false;
      if (S === 'large' && m <= 800) return false;
      if (A === 'square' && Math.abs(r - 1) > .1) return false;
      if (A === 'landscape' && r <= 1.1) return false;
      if (A === 'portrait' && r >= .9) return false;
      if (T && !i.src.toLowerCase().includes('.' + T)) return false;
      return true;
    }).forEach(i => {
      const n = item.cloneNode(true);
      const thumb = n.querySelector('.image-thumbnail');
      const sizeSpan = n.querySelector('.image-size');
      const typeSpan = n.querySelector('.image-type');
      const btn = n.querySelector('.download-btn');
      
      if (thumb) thumb.src = i.src;
      if (sizeSpan) sizeSpan.textContent = `${i.width}×${i.height}`;
      if (typeSpan) typeSpan.textContent = i.src.split('.').pop().split('?')[0].toUpperCase();
      if (btn) btn.onclick = () => downloadSingle(i.src);
      
      grid.appendChild(n);
    });
  }
}

// Download all images into a folder named after the domain
async function downloadAllImages(urls) {
  try {
    clear();
    msg('📥 Downloading images into folder…');
    
    // Get the active tab to derive its domain
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) throw new Error('Cannot determine page URL');
    
    const urlObj = new URL(tab.url);
    const domain = urlObj.hostname.replace(/^www\./, ''); // Remove www. prefix
    
    // Download each image into the domain folder
    for (let i = 0; i < urls.length; i++) {
      const src = urls[i];
      let name = src.split('/').pop().split(/[?#]/)[0] || `image_${i + 1}`;
      
      // Sanitize filename
      name = name.replace(/[^a-z0-9.\-_]/gi, '_');
      
      // Add file extension if missing
      if (!name.includes('.')) {
        name += '.jpg'; // default extension
      }
      
      const filename = `${domain}/${name}`;
      
      chrome.runtime.sendMessage({
        action: 'download',
        url: src,
        filename: filename,
        saveAs: false // Don't show save dialog for each file
      });
      
      // Small delay to prevent overwhelming the browser
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    msg(`✅ Started downloading ${urls.length} images into "${domain}" folder`, 'status-success');
  } catch (error) {
    err('Download failed: ' + error.message);
  }
}

// Single image download
function downloadSingle(src) {
  let name = src.split('/').pop().split(/[?#]/)[0] || 'image';
  name = name.replace(/[^a-z0-9.\-_]/gi, '_');
  
  chrome.runtime.sendMessage({
    action: 'download',
    url: src,
    filename: name,
    saveAs: true // Show save dialog for single files
  });
}

/* ╔════════════════════════════════╗
   ║ 2. FONTS                      ║
   ╚════════════════════════════════╝ */
async function handleFonts() {
  clear(); msg('🔤 Detecting fonts…');
  try {
    const fonts = await send('get-fonts');
    if (!fonts?.length) return msg('No fonts detected');
    renderFontUI(fonts);
  } catch (e) { err(e.message); }
}

function renderFontUI(fonts) {
  const wrap = t('font-list-template');
  if (!wrap) return err('Font template not found');
  
  const list = wrap.getElementById('font-list');
  const row = document.getElementById('font-item-template')?.content;
  if (!row) return err('Font item template not found');
  
  fonts.forEach(f => {
    const n = row.cloneNode(true);
    const box = n.querySelector('.font-item');
    const name = n.querySelector('.font-name');
    
    if (name) {
      name.textContent = f; 
      name.style.fontFamily = f;
    }
    if (box) {
      box.onclick = () => copy(f).then(() => flash(box));
    }
    list.appendChild(n);
  });
  resultsEl.appendChild(wrap);
}

/* ╔════════════════════════════════╗
   ║ 3. GET COLOURS (20 swatches)   ║
   ╚════════════════════════════════╝ */
async function handleColors() {
  clear(); msg('🎨 Extracting colours…');
  try {
    const c = await send('get-dominant-colors');
    if (!c?.length) return msg('No colours found');
    renderColourGrid(c.slice(0, 20));
  } catch (e) { err(e.message); }
}

function renderColourGrid(cols) {
  const wrap = t('color-grid-template');
  if (!wrap) return err('Color template not found');
  
  const grid = wrap.getElementById('color-grid');
  if (grid) grid.style.gridTemplateColumns = 'repeat(4,1fr)';
  
  const sw = document.getElementById('color-swatch-template')?.content;
  if (!sw) return err('Swatch template not found');
  
  cols.forEach(h => {
    const n = sw.cloneNode(true);
    const item = n.querySelector('.color-swatch-item');
    const swatch = n.querySelector('.color-swatch');
    const hex = n.querySelector('.color-hex');
    
    if (swatch) swatch.style.background = h;
    if (hex) hex.textContent = h;
    if (item) item.onclick = () => copy(h).then(() => flash(item));
    
    grid.appendChild(n);
  });
  resultsEl.appendChild(wrap);
}

/* ╔════════════════════════════════╗
   ║ 4. PICK COLOUR (SIMPLIFIED)    ║
   ╚════════════════════════════════╝ */
async function handlePickColor() {
  clear(); 
  msg('🌈 Click anywhere on the page to pick a color...');
  
  try {
    let pickedColor;
    
    if ('EyeDropper' in window) {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      pickedColor = result.sRGBHex;
    } else {
      const result = await send('fallback-picker');
      if (result.error) throw new Error(result.error);
      pickedColor = result.pickedColor;
    }
    
    if (pickedColor) {
      await copy(pickedColor);
      showPickedColor(pickedColor);
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      err('Color picking failed: ' + error.message);
    } else {
      msg('Color picking cancelled');
    }
  }
}

function showPickedColor(hex) {
  clear();
  
  const container = document.createElement('div');
  container.className = 'content-wrapper';
  
  const colorDisplay = document.createElement('div');
  colorDisplay.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
  `;
  
  const swatch = document.createElement('div');
  swatch.style.cssText = `
    width: 100px;
    height: 100px;
    background: ${hex};
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  `;
  
  const hexText = document.createElement('div');
  hexText.textContent = hex;
  hexText.style.cssText = `
    font-family: 'Courier New', monospace;
    font-size: 1.2rem;
    color: var(--clr-white);
    text-align: center;
  `;
  
  const copyMessage = document.createElement('div');
  copyMessage.textContent = '✓ Copied to clipboard';
  copyMessage.style.cssText = `
    color: var(--clr-success);
    font-size: 0.9rem;
    text-align: center;
  `;
  
  const pickAgainBtn = document.createElement('button');
  pickAgainBtn.textContent = '🌈 Pick Another Color';
  pickAgainBtn.style.cssText = `
    padding: 0.75rem 1.5rem;
    background: var(--clr-cta-blue);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  `;
  pickAgainBtn.onclick = handlePickColor;
  
  colorDisplay.appendChild(swatch);
  colorDisplay.appendChild(hexText);
  colorDisplay.appendChild(copyMessage);
  colorDisplay.appendChild(pickAgainBtn);
  container.appendChild(colorDisplay);
  resultsEl.appendChild(container);
}

/* ╔════════════════════════════════╗
   ║ 5. SCREENSHOT                  ║
   ╚════════════════════════════════╝ */
function handleScreenshot() {
  clear();
  const o = t('screenshot-options-template');
  if (!o) return err('Screenshot template not found');
  
  const png = o.getElementById('save-png');
  const pdf = o.getElementById('save-pdf');
  const st = o.getElementById('screenshot-status');
  
  if (png) png.onclick = () => shot('png');
  if (pdf) pdf.onclick = () => shot('pdf');
  
  resultsEl.appendChild(o);
  
  async function shot(fmt) {
    if (st) {
      st.textContent = `📸 Capturing ${fmt.toUpperCase()}…`; 
      st.className = 'screenshot-status';
    }
    
    try {
      const r = await send(`screenshot-${fmt}`);
      if (r?.success) {
        if (st) {
          st.textContent = `✅ Saved as ${fmt.toUpperCase()}`;
          st.classList.add('status-success');
        }
      } else {
        throw new Error(r?.error || 'Screenshot failed');
      }
    } catch (e) {
      if (st) {
        st.textContent = '❌ ' + e.message;
        st.classList.add('status-error');
      }
    }
  }
}

/* ╔════════════════════════════════╗
   ║ 6. RIGHT-CLICK TOGGLE          ║
   ╚════════════════════════════════╝ */
async function handleRightClick() {
  clear(); msg('Toggling…');
  try {
    const r = await send('toggle-rightclick');
    msg(r?.status ? '✅ Unlocked' : '🔒 Restored');
  } catch (e) { err(e.message); }
}

/* ╔════════════════════════════════╗
   ║ 7. REFRESH PANEL               ║
   ╚════════════════════════════════╝ */
function refreshPanel() { 
  clear(); 
  msg('🔄 Cleared – choose a tool'); 
}

/* ──────────────────────────────────
   helper utilities
*/
async function send(type) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw Error('No active tab');
  return await sendToContentScript(tab.id, { type });
}

function msg(txt) { render(txt, ''); } 
function err(txt) { render('⚠ ' + txt, 'status-error'); }

function render(t, c) {
  clear();
  const d = document.createElement('div');
  d.className = 'status-message ' + c;
  d.textContent = t;
  resultsEl.appendChild(d);
}

function clear() { 
  if (resultsEl) resultsEl.innerHTML = ''; 
}

function copy(h) { 
  return navigator.clipboard.writeText(h).catch(() => {}); 
}

function flash(el) { 
  if (el) {
    el.style.background = '#10B981'; 
    setTimeout(() => el.style.background = '', 300); 
  }
}

const id = x => document.getElementById(x);
const t = x => {
  const element = id(x);
  return element ? element.content.cloneNode(true) : null;
};
