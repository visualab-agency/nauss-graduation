(async function(){
  const stage = document.getElementById('stage');
  const mapImg = document.getElementById('mapImg');
  const mapPlane = document.getElementById('mapPlane');
  const toggle3DBtn = document.getElementById('toggle3DBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomLevel = document.getElementById('zoomLevel');
  const overlay = document.getElementById('overlay');
  const mainPair = document.getElementById('mainPair');
  const vwTitle = document.getElementById('vwTitle');
  const vwCat = document.getElementById('vwCat');
  const vwDesc = document.getElementById('vwDesc');
  const closeBtn = document.getElementById('closeBtn');
  const backBtn = document.getElementById('backBtn');
  const pinCount = document.getElementById('pinCount');
  const thumbStrip = document.getElementById('thumbStrip');
  const extraOverlay = document.getElementById('extraOverlay');
  const extraImg = document.getElementById('extraImg');
  const extraCaption = document.getElementById('extraCaption');
  const extraCloseBtn = document.getElementById('extraCloseBtn');
  const fullscreenOverlay = document.getElementById('fullscreenOverlay');
  const fullscreenImg = document.getElementById('fullscreenImg');
  const fullscreenCloseBtn = document.getElementById('fullscreenCloseBtn');

  const pins = await loadPins();
  pinCount.textContent = `● ${pins.length} view${pins.length===1?'':'s'} loaded`;

  const viewSettings = await loadViewSettings();
  applyViewSettingsToStage(stage, viewSettings);

  toggle3DBtn.addEventListener('click', ()=>{
    const isOn = stage.classList.toggle('is-3d');
    toggle3DBtn.textContent = isOn ? '2D View' : '3D View';
    zoomPan.reset(); // pan/zoom + tilt together gets disorienting, so start clean on toggle
  });

  /* ---------- Zoom / pan controller ---------- */
  const zoomPan = (function(){
    const MIN_SCALE = 1;
    const MAX_SCALE = 4;
    const DOUBLE_CLICK_SCALE = 2.5;
    const DRAG_THRESHOLD = 4; // px of movement before a pointerdown counts as a drag, not a click

    let scale = 1, panX = 0, panY = 0;
    let dragging = false, dragMoved = false;
    let dragStartX = 0, dragStartY = 0, dragStartPanX = 0, dragStartPanY = 0;
    let pinchStartDist = 0, pinchStartScale = 1;
    let activeTouches = 0;

    function clamp(v, lo, hi){ return Math.min(hi, Math.max(lo, v)); }

    function clampPan(){
      const rect = stage.getBoundingClientRect();
      const maxX = (rect.width * (scale - 1)) / 2;
      const maxY = (rect.height * (scale - 1)) / 2;
      panX = clamp(panX, -maxX, maxX);
      panY = clamp(panY, -maxY, maxY);
    }

    function apply(animate){
      clampPan();
      mapPlane.classList.toggle('no-anim', !animate);
      stage.style.setProperty('--zoom', scale);
      stage.style.setProperty('--pan-x', panX + 'px');
      stage.style.setProperty('--pan-y', panY + 'px');
      stage.classList.toggle('zoomable', scale > 1);
      zoomLevel.textContent = Math.round(scale * 100) + '%';
      zoomInBtn.disabled = scale >= MAX_SCALE - 0.001;
      zoomOutBtn.disabled = scale <= MIN_SCALE + 0.001;
    }

    // Zooms to newScale while keeping the point under (clientX, clientY) visually fixed.
    function zoomAt(newScale, clientX, clientY, animate){
      newScale = clamp(newScale, MIN_SCALE, MAX_SCALE);
      const rect = stage.getBoundingClientRect();
      const originX = clientX - rect.left - rect.width / 2;
      const originY = clientY - rect.top - rect.height / 2;
      const ratio = newScale / scale;
      panX = originX - (originX - panX) * ratio;
      panY = originY - (originY - panY) * ratio;
      scale = newScale;
      apply(animate);
    }

    function reset(){
      scale = 1; panX = 0; panY = 0;
      apply(true);
    }

    // Mouse wheel: zoom in/out centered on the cursor.
    stage.addEventListener('wheel', (e)=>{
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(scale * factor, e.clientX, e.clientY, false);
    }, { passive:false });

    // Drag to pan once zoomed in. Ignored if it starts on a pin so pin clicks keep working.
    stage.addEventListener('pointerdown', (e)=>{
      if(scale <= 1) return;
      if(e.target.closest('.pin')) return;
      if(activeTouches >= 2) return;
      dragging = true; dragMoved = false;
      dragStartX = e.clientX; dragStartY = e.clientY;
      dragStartPanX = panX; dragStartPanY = panY;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e)=>{
      if(!dragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if(!dragMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD){
        dragMoved = true;
        stage.classList.add('is-panning');
      }
      if(dragMoved){
        panX = dragStartPanX + dx;
        panY = dragStartPanY + dy;
        apply(false);
      }
    });
    function endDrag(e){
      if(!dragging) return;
      dragging = false;
      stage.classList.remove('is-panning');
      if(dragMoved){ clampPan(); apply(false); }
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    // Double-click: zoom in on the clicked spot, or back out to 1x if already zoomed.
    stage.addEventListener('dblclick', (e)=>{
      if(e.target.closest('.pin')) return;
      if(scale > 1){ reset(); }
      else { zoomAt(DOUBLE_CLICK_SCALE, e.clientX, e.clientY, true); }
    });

    // Pinch-to-zoom on touch devices.
    stage.addEventListener('touchstart', (e)=>{
      activeTouches = e.touches.length;
      if(e.touches.length === 2){
        dragging = false; // hand off from any single-finger drag in progress
        stage.classList.remove('is-panning');
        const [a, b] = e.touches;
        pinchStartDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        pinchStartScale = scale;
      }
    }, { passive:true });
    stage.addEventListener('touchmove', (e)=>{
      if(e.touches.length === 2){
        e.preventDefault();
        const [a, b] = e.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const cx = (a.clientX + b.clientX) / 2;
        const cy = (a.clientY + b.clientY) / 2;
        const ratio = pinchStartDist ? dist / pinchStartDist : 1;
        zoomAt(pinchStartScale * ratio, cx, cy, false);
      }
    }, { passive:false });
    stage.addEventListener('touchend', (e)=>{ activeTouches = e.touches.length; });
    stage.addEventListener('touchcancel', (e)=>{ activeTouches = e.touches.length; });

    zoomInBtn.addEventListener('click', ()=>{
      const rect = stage.getBoundingClientRect();
      zoomAt(scale * 1.5, rect.left + rect.width / 2, rect.top + rect.height / 2, true);
    });
    zoomOutBtn.addEventListener('click', ()=>{
      const rect = stage.getBoundingClientRect();
      zoomAt(scale / 1.5, rect.left + rect.width / 2, rect.top + rect.height / 2, true);
    });
    zoomResetBtn.addEventListener('click', reset);

    apply(false);
    return { reset };
  })();

  function buildPins(){
    mapPlane.querySelectorAll('.pin').forEach(p=>p.remove());
    pins.forEach((pin, i)=>{
      const el = document.createElement('button');
      el.className = 'pin pin-photo';
      el.dataset.pinIndex = i;
      el.setAttribute('aria-label', pin.title || `Location ${i+1}`);
      const mains = getMainImages(pin);
      const thumbFile = mains[0] ? mains[0].file : '';
      const safeTitle = escapeHtml(pin.title || 'View');
      el.innerHTML = `
        <span class="glow"></span>
        <span class="ring"></span>
        <span class="pin-stalk"></span>
        <span class="thumb-dot"><img src="images/${thumbFile}" alt="" onerror="this.style.opacity=0"></span>
        <span class="pin-card-label">${safeTitle}</span>
        <span class="label">${safeTitle}</span>
      `;
      applyPinVisuals(el, pin, viewSettings);
      el.addEventListener('click', ()=> openPin(pin));
      mapPlane.appendChild(el);
    });
    repositionPins();
  }

  // Cheap update: just moves existing pins and refreshes the responsive
  // standee scale, without touching the DOM nodes themselves (no image
  // reloads, no restarted CSS transitions/animations). Safe to call on
  // every resize/orientation change.
  function repositionPins(){
    stage.style.setProperty('--standee-scale', getMapStandeeScale(mapImg));
    mapPlane.querySelectorAll('.pin').forEach(el=>{
      const pin = pins[Number(el.dataset.pinIndex)];
      if(!pin) return;
      const pos = pinToStagePx(pin, mapImg);
      el.style.left = pos.left + 'px';
      el.style.top = pos.top + 'px';
    });
  }

  // Mobile browsers fire 'resize' for things that have nothing to do with
  // the map's actual size — most commonly the address bar collapsing on
  // scroll/tap, which changes innerHeight but not innerWidth. Rebuilding
  // or even repositioning on every one of those causes visible flicker,
  // so only react when the width actually changed (debounced a touch so
  // rapid-fire events collapse into one update).
  let lastResizeWidth = window.innerWidth;
  let resizeRAF = null;
  window.addEventListener('resize', ()=>{
    if(window.innerWidth === lastResizeWidth) return;
    lastResizeWidth = window.innerWidth;
    if(resizeRAF) cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(repositionPins);
  });

  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Normalizes a pin's main images, new schema first, falling back to the old single `images`/`image` field.
  function getMainImages(pin){
    if(Array.isArray(pin.mainImages) && pin.mainImages.length) return pin.mainImages;
    if(Array.isArray(pin.images) && pin.images.length) return [{ file: pin.images[0], caption:'' }];
    if(pin.image) return [{ file: pin.image, caption:'' }];
    return [];
  }

  // Normalizes a pin's extra images, new schema first, falling back to images[1..] from the old schema.
  function getExtraImages(pin){
    if(Array.isArray(pin.extraImages) && pin.extraImages.length) return pin.extraImages;
    if(Array.isArray(pin.images) && pin.images.length > 1){
      return pin.images.slice(1).map(f=>({ file:f, caption:'' }));
    }
    return [];
  }

  function openPin(pin){
    vwTitle.textContent = pin.title || 'Untitled location';
    vwCat.textContent = pin.category || 'Location';
    vwDesc.textContent = pin.description || '';

    const mains = getMainImages(pin);
    const extras = getExtraImages(pin);

    renderMainPair(mains);
    renderThumbs(mains, extras);
    closeExtraOverlay();

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function renderMainPair(mains){
    mainPair.classList.toggle('single', mains.length < 2);
    mainPair.innerHTML = mains.map(m => `
      <div class="main-item">
        <img src="images/${m.file}" alt="${escapeHtml(m.caption || '')}">
        ${m.caption ? `<p class="main-caption">${escapeHtml(m.caption)}</p>` : ''}
      </div>
    `).join('');
    mainPair.querySelectorAll('img').forEach(img=>{
      img.addEventListener('click', ()=> openFullscreen(img.src, img.alt));
    });
  }

  function renderThumbs(mains, extras){
    thumbStrip.innerHTML = '';
    if(!mains.length && !extras.length) return;

    if(mains.length){
      const group = document.createElement('div');
      group.className = 'mockups-group';
      group.innerHTML = `<p class="mockups-label">Mockups</p>`;
      const row = document.createElement('div');
      row.className = 'mockups-row';
      mains.forEach((m)=>{
        const btn = document.createElement('button');
        btn.className = 'thumb-item';
        btn.title = m.caption || '';
        btn.innerHTML = `<img src="images/${m.file}" alt="${escapeHtml(m.caption || '')}">`;
        // Clicking a mockup thumb just returns to the main pair view.
        btn.addEventListener('click', ()=> closeExtraOverlay());
        row.appendChild(btn);
      });
      group.appendChild(row);
      thumbStrip.appendChild(group);

      if(extras.length){
        const divider = document.createElement('span');
        divider.className = 'thumb-divider';
        thumbStrip.appendChild(divider);
      }
    }

    extras.forEach((ex)=>{
      const btn = document.createElement('button');
      btn.className = 'thumb-item';
      btn.title = ex.caption || '';
      btn.innerHTML = `<img src="images/${ex.file}" alt="${escapeHtml(ex.caption || '')}">${ex.caption ? `<span class="thumb-cap">${escapeHtml(ex.caption)}</span>` : ''}`;
      btn.addEventListener('click', ()=> openExtraOverlay(ex));
      thumbStrip.appendChild(btn);
    });
  }

  function openExtraOverlay(ex){
    extraImg.src = 'images/' + ex.file;
    extraImg.alt = ex.caption || '';
    extraCaption.textContent = ex.caption || '';
    extraOverlay.classList.add('open');
  }
  extraImg.addEventListener('click', ()=> openFullscreen(extraImg.src, extraImg.alt));

  function openFullscreen(src, alt){
    fullscreenImg.src = src;
    fullscreenImg.alt = alt || '';
    fullscreenOverlay.classList.add('open');
  }
  function closeFullscreen(){
    fullscreenOverlay.classList.remove('open');
    fullscreenImg.src = '';
  }
  fullscreenCloseBtn.addEventListener('click', closeFullscreen);
  fullscreenOverlay.addEventListener('click', closeFullscreen);

  function closeExtraOverlay(){
    extraOverlay.classList.remove('open');
    extraImg.src = '';
  }

  extraCloseBtn.addEventListener('click', closeExtraOverlay);
  extraOverlay.addEventListener('click', (e)=>{ if(e.target === extraOverlay) closeExtraOverlay(); });

  function closeViewer(){
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    closeExtraOverlay();
  }

  closeBtn.addEventListener('click', closeViewer);
  backBtn.addEventListener('click', closeViewer);
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeViewer(); });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape'){
      if(fullscreenOverlay.classList.contains('open')) closeFullscreen();
      else if(extraOverlay.classList.contains('open')) closeExtraOverlay();
      else closeViewer();
    }
  });

  if(mapImg.complete){ buildPins(); }
  else { mapImg.addEventListener('load', buildPins); }
})();
