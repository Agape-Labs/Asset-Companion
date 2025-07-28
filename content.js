// content.js – Asset Companion content script (FIXED image detection and screenshot)
/* eslint-env browser */
(() => {
  console.debug('AC content script ready');

  let unlocked = false, listeners = [];

  chrome.runtime.onMessage.addListener((msg, _s, send) => {
    try {
      switch (msg?.type) {
        case 'get-images-enhanced': return send({ images: getImages() });
        case 'get-fonts': return send(getFonts());
        case 'get-dominant-colors': return send(getColours());
        case 'fallback-picker': return pickFallback(send), true;
        case 'screenshot-png': return shoot('png', send), true;
        case 'screenshot-pdf': return shoot('pdf', send), true;
        case 'toggle-rightclick': unlocked = !unlocked, (unlocked ? unlock() : relock()), send({ status: unlocked });
      }
    } catch (e) { 
      console.error('Content script error:', e);
      send({ error: e.message }); 
    }
    return true;
  });

  /* ─ Images - FIXED the undefined 'src' bug ─ */
  function getImages() {
    const images = [];
    
    try {
      // Get all images from the document
      const allImages = document.querySelectorAll('img');
      console.debug(`Found ${allImages.length} img elements`);
      
      for (let i = 0; i < Math.min(allImages.length, 200); i++) {
        const img = allImages[i];
        
        // FIXED: Use img.src instead of undefined 'src' variable
        const src = img.currentSrc || img.src;
        
        if (!src || src === '' || src === 'data:') {
          continue; // Skip images without source
        }
        
        // Get dimensions
        const width = img.naturalWidth || img.width || img.offsetWidth || 0;
        const height = img.naturalHeight || img.height || img.offsetHeight || 0;
        
        // Skip tiny or invalid images
        if (width < 20 || height < 20) {
          continue;
        }
        
        // Set crossOrigin for better compatibility (don't throw errors)
        try {
          img.crossOrigin = 'anonymous';
        } catch (e) {
          // Ignore crossOrigin errors for existing images
        }
        
        images.push({
          src: src,
          width: width,
          height: height,
          alt: img.alt || ''
        });
      }
      
      console.debug(`Returning ${images.length} valid images`);
      return images;
      
    } catch (error) {
      console.error('Error in getImages:', error);
      return [];
    }
  }

  /* ─ Fonts ─ */
  const getFonts = () => [...new Set([...document.querySelectorAll('*')].map(e =>
    getComputedStyle(e).fontFamily.split(',')[0].replace(/['"]/g, '').trim()
  ).filter(f => f && f !== 'inherit'))].slice(0, 50);

  /* ─ Colours (top 20 by frequency) - FIXED canvas performance ─ */
  function getColours() {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d', { willReadFrequently: true });
    const map = new Map();
    const push = hex => map.set(hex, (map.get(hex) || 0) + 1);

    // Sample colors from images with better error handling
    document.querySelectorAll('img').forEach(el => {
      try {
        const w = el.naturalWidth || el.width;
        const h = el.naturalHeight || el.height;
        if (!w || !h || w < 10 || h < 10) return;
        
        cvs.width = Math.min(w, 200);
        cvs.height = Math.min(h, 200);
        
        ctx.drawImage(el, 0, 0, cvs.width, cvs.height);
        const d = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
        
        for (let i = 0; i < d.length; i += 64) { 
          const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
          if (a > 128) {
            push(rgb2hex(r, g, b));
          }
        }
      } catch (e) {
        // Skip images that cause CORS errors
      }
    });

    // Also get colors from CSS
    document.querySelectorAll('*').forEach(el => {
      try {
        const styles = getComputedStyle(el);
        [styles.color, styles.backgroundColor].forEach(color => {
          if (color.startsWith('rgb')) {
            const matches = color.match(/\d+/g);
            if (matches && matches.length >= 3) {
              const [r, g, b] = matches;
              push(rgb2hex(r, g, b));
            }
          }
        });
      } catch (e) {
        // Skip elements that can't be styled
      }
    });

    return [...map.entries()]
      .filter(([h]) => h !== '#000000' && h !== '#ffffff')
      .sort((a, b) => b[1] - a[1]).slice(0, 20).map(([h]) => h);
  }
  
  const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => (+v).toString(16).padStart(2, '0')).join('');

  /* ─ Fallback picker ─ */
  function pickFallback(done) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;cursor:crosshair;z-index:2147483647;background:rgba(0,0,0,0.1);';
    document.body.appendChild(overlay);
    
    overlay.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      overlay.remove();
      
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (element) {
        const styles = getComputedStyle(element);
        const color = styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && styles.backgroundColor !== 'transparent' 
          ? styles.backgroundColor : styles.color;
        
        const matches = color.match(/\d+/g);
        if (matches && matches.length >= 3) {
          const hex = rgb2hex(matches[0], matches[1], matches[2]);
          navigator.clipboard.writeText(hex).catch(() => {});
          done({ pickedColor: hex });
        } else {
          done({ error: 'Could not extract color' });
        }
      } else {
        done({ error: 'No element found' });
      }
    };
  }

  /* ─ Screenshot - FIXED to include more images ─ */
  async function shoot(fmt, send) {
    try {
      if (!window.html2canvas) throw new Error('html2canvas missing');

      console.debug('Starting screenshot capture...');

      const cv = await window.html2canvas(document.body, {
        useCORS: true,
        allowTaint: true, // Allow tainted canvas to include more images
        scale: 1,
        logging: false,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        // FIXED: Less aggressive image filtering - only skip obvious problem cases
        ignoreElements: (element) => {
          // Only skip elements that are definitely problematic
          if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
            return true;
          }
          
          // Skip images only if they're clearly broken or problematic
          if (element.tagName === 'IMG') {
            const src = element.src;
            // Only skip data URLs that are empty or clearly broken
            if (!src || src === '' || src === 'data:' || src.startsWith('data:image/svg+xml;base64,') && src.length < 100) {
              return true;
            }
          }
          
          return false;
        },
        // Add proxy for better CORS handling
        proxy: window.location.origin,
        // Handle CORS images better
        onclone: (clonedDoc) => {
          // Set crossOrigin for all images in the cloned document
          clonedDoc.querySelectorAll('img').forEach(img => {
            try {
              img.crossOrigin = 'anonymous';
            } catch (e) {
              // Ignore errors
            }
          });
        }
      });

      console.debug('Screenshot captured successfully');

      if (fmt === 'pdf') {
        if (!window.jspdf?.jsPDF) throw new Error('jsPDF missing');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ 
          orientation: cv.width > cv.height ? 'l' : 'p', 
          unit: 'px', 
          format: [cv.width, cv.height] 
        });
        pdf.addImage(cv.toDataURL('image/png'), 'PNG', 0, 0, cv.width, cv.height);
        blob(pdf.output('blob'), 'screenshot.pdf');
      } else {
        cv.toBlob(b => blob(b, 'screenshot.png'), 'image/png', 1);
      }
      send({ success: true });
    } catch (e) { 
      console.error('Screenshot error:', e);
      send({ error: e.message }); 
    }
  }
  
  const blob = (b, n) => chrome.runtime.sendMessage({ 
    action: 'download', 
    url: URL.createObjectURL(b), 
    filename: n 
  });

  /* ─ Right-click toggle ─ */
  const unlock = () => {
    ['contextmenu', 'copy', 'cut', 'paste', 'selectstart', 'dragstart'].forEach(t => {
      const h = e => e.stopPropagation(); 
      window.addEventListener(t, h, true); 
      listeners.push([t, h]);
    }); 
    document.querySelectorAll('[oncontextmenu]').forEach(el => { 
      el.dataset.ac = el.getAttribute('oncontextmenu') || '';
      el.removeAttribute('oncontextmenu');
    });
    const st = document.createElement('style'); 
    st.id = 'ac-u'; 
    st.textContent = '*{user-select:text!important;-webkit-user-select:text!important}'; 
    document.head.append(st);
  };
  
  const relock = () => {
    listeners.forEach(([t, h]) => window.removeEventListener(t, h, true)); 
    listeners = [];
    document.querySelectorAll('[data-ac]').forEach(el => { 
      el.setAttribute('oncontextmenu', el.dataset.ac);
      el.removeAttribute('data-ac');
    });
    document.getElementById('ac-u')?.remove();
  };
})();
