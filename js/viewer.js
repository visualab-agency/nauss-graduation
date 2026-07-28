(async function(){
  const stage = document.getElementById('stage');
  const mapImg = document.getElementById('mapImg');
  const mapPlane = document.getElementById('mapPlane');
  const toggle3DBtn = document.getElementById('toggle3DBtn');
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

  const pins = await loadPins();
  pinCount.textContent = `● ${pins.length} view${pins.length===1?'':'s'} loaded`;

  const viewSettings = await loadViewSettings();
  applyViewSettingsToStage(stage, viewSettings);

  toggle3DBtn.addEventListener('click', ()=>{
    const isOn = stage.classList.toggle('is-3d');
    toggle3DBtn.textContent = isOn ? '2D View' : '3D View';
  });

  function renderPins(){
    mapPlane.querySelectorAll('.pin').forEach(p=>p.remove());
    pins.forEach((pin, i)=>{
      const el = document.createElement('button');
      el.className = 'pin pin-photo';
      const pos = pinToStagePx(pin, mapImg);
      el.style.left = pos.left + 'px';
      el.style.top = pos.top + 'px';
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
  }

  window.addEventListener('resize', renderPins);

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
      if(extraOverlay.classList.contains('open')) closeExtraOverlay();
      else closeViewer();
    }
  });

  if(mapImg.complete){ renderPins(); }
  else { mapImg.addEventListener('load', renderPins); }
})();
