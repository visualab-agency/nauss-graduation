(function(){
  const stage = document.getElementById('stage');
  const mapImg = document.getElementById('mapImg');
  const mapPlane = document.getElementById('mapPlane');
  const toast = document.getElementById('toast');
  const pinCountEl = document.getElementById('pinCount');
  const pinListItems = document.getElementById('pinListItems');
  const folderStatusEl = document.getElementById('folderStatus');
  const connectFolderBtn = document.getElementById('connectFolderBtn');
  const toggle3DBtn = document.getElementById('toggle3DBtn');
  const perspectivePanel = document.getElementById('perspectivePanel');

  // Global sliders (shared by the whole map, regardless of pin category)
  const tiltXSlider = document.getElementById('tiltXSlider');
  const tiltZSlider = document.getElementById('tiltZSlider');
  const perspSlider = document.getElementById('perspSlider');
  const tiltXVal = document.getElementById('tiltXVal');
  const tiltZVal = document.getElementById('tiltZVal');
  const perspVal = document.getElementById('perspVal');

  // Per-category sliders — same DOM elements are reused for whichever
  // category is currently selected via the tab buttons.
  const pinTiltXSlider = document.getElementById('pinTiltXSlider');
  const pinTiltZSlider = document.getElementById('pinTiltZSlider');
  const pinScaleXSlider = document.getElementById('pinScaleXSlider');
  const pinScaleYSlider = document.getElementById('pinScaleYSlider');
  const pinScaleZSlider = document.getElementById('pinScaleZSlider');
  const pinSkewSlider = document.getElementById('pinSkewSlider');
  const elevateSlider = document.getElementById('elevateSlider');
  const labelLiftSlider = document.getElementById('labelLiftSlider');
  const labelOffsetXSlider = document.getElementById('labelOffsetXSlider');
  const pinTiltXVal = document.getElementById('pinTiltXVal');
  const pinTiltZVal = document.getElementById('pinTiltZVal');
  const pinScaleXVal = document.getElementById('pinScaleXVal');
  const pinScaleYVal = document.getElementById('pinScaleYVal');
  const pinScaleZVal = document.getElementById('pinScaleZVal');
  const pinSkewVal = document.getElementById('pinSkewVal');
  const elevateVal = document.getElementById('elevateVal');
  const labelLiftVal = document.getElementById('labelLiftVal');
  const labelOffsetXVal = document.getElementById('labelOffsetXVal');
  const savePerspectiveBtn = document.getElementById('savePerspectiveBtn');
  const editCat1Btn = document.getElementById('editCat1Btn');
  const editCat2Btn = document.getElementById('editCat2Btn');

  let viewSettings = normalizeViewSettings({});
  let editingCategory = 1; // which category's sliders are currently shown/edited

  function currentCategorySettings(){
    return viewSettings.categories[editingCategory];
  }

  function updateSliderLabels(){
    const cat = currentCategorySettings();
    tiltXVal.textContent = viewSettings.tiltX + '°';
    tiltZVal.textContent = viewSettings.tiltZ + '°';
    perspVal.textContent = viewSettings.perspective + 'px';
    pinTiltXVal.textContent = cat.pinTiltX + '°';
    pinTiltZVal.textContent = cat.pinTiltZ + '°';
    pinScaleXVal.textContent = Number(cat.pinScaleX).toFixed(2);
    pinScaleYVal.textContent = Number(cat.pinScaleY).toFixed(2);
    pinScaleZVal.textContent = Number(cat.pinScaleZ).toFixed(2);
    pinSkewVal.textContent = cat.pinSkew + '°';
    elevateVal.textContent = cat.elevate + 'px';
    labelLiftVal.textContent = cat.labelLift + 'px';
    labelOffsetXVal.textContent = cat.labelOffsetX + 'px';
  }

  // Pushes the currently-selected category's stored values onto the
  // sliders (called on load and whenever the tab switches).
  function applySlidersFromSettings(){
    const cat = currentCategorySettings();
    tiltXSlider.value = viewSettings.tiltX;
    tiltZSlider.value = viewSettings.tiltZ;
    perspSlider.value = viewSettings.perspective;
    pinTiltXSlider.value = cat.pinTiltX;
    pinTiltZSlider.value = cat.pinTiltZ;
    pinScaleXSlider.value = cat.pinScaleX;
    pinScaleYSlider.value = cat.pinScaleY;
    pinScaleZSlider.value = cat.pinScaleZ;
    pinSkewSlider.value = cat.pinSkew;
    elevateSlider.value = cat.elevate;
    labelLiftSlider.value = cat.labelLift;
    labelOffsetXSlider.value = cat.labelOffsetX;
    updateSliderLabels();
    applyViewSettingsToStage(stage, viewSettings);
    refreshPinVisuals();
  }

  function setEditingCategory(num){
    editingCategory = num;
    editCat1Btn.classList.toggle('active', num === 1);
    editCat2Btn.classList.toggle('active', num === 2);
    applySlidersFromSettings();
  }
  editCat1Btn.addEventListener('click', ()=> setEditingCategory(1));
  editCat2Btn.addEventListener('click', ()=> setEditingCategory(2));

  // Re-applies each on-screen pin's own category vars from the current
  // viewSettings, without rebuilding the DOM (keeps things snappy while
  // dragging a slider).
  function refreshPinVisuals(){
    mapPlane.querySelectorAll('.pin[data-pin-id]').forEach(el=>{
      const pin = pins.find(p=> p.id === el.dataset.pinId);
      if(pin) applyPinVisuals(el, pin, viewSettings);
    });
  }

  // Global sliders update the shared stage vars directly.
  tiltXSlider.addEventListener('input', ()=>{ viewSettings.tiltX = +tiltXSlider.value; updateSliderLabels(); applyViewSettingsToStage(stage, viewSettings); });
  tiltZSlider.addEventListener('input', ()=>{ viewSettings.tiltZ = +tiltZSlider.value; updateSliderLabels(); applyViewSettingsToStage(stage, viewSettings); });
  perspSlider.addEventListener('input', ()=>{ viewSettings.perspective = +perspSlider.value; updateSliderLabels(); applyViewSettingsToStage(stage, viewSettings); });

  // Category sliders update only the currently-selected category's block,
  // then refresh every pin that belongs to that category on screen.
  function bindCategorySlider(sliderEl, key, isFloat){
    sliderEl.addEventListener('input', ()=>{
      currentCategorySettings()[key] = isFloat ? +sliderEl.value : +sliderEl.value;
      updateSliderLabels();
      refreshPinVisuals();
    });
  }
  bindCategorySlider(pinTiltXSlider, 'pinTiltX');
  bindCategorySlider(pinTiltZSlider, 'pinTiltZ');
  bindCategorySlider(pinScaleXSlider, 'pinScaleX', true);
  bindCategorySlider(pinScaleYSlider, 'pinScaleY', true);
  bindCategorySlider(pinScaleZSlider, 'pinScaleZ', true);
  bindCategorySlider(pinSkewSlider, 'pinSkew');
  bindCategorySlider(elevateSlider, 'elevate');
  bindCategorySlider(labelLiftSlider, 'labelLift');
  bindCategorySlider(labelOffsetXSlider, 'labelOffsetX');

  toggle3DBtn.addEventListener('click', ()=>{
    const isOn = stage.classList.toggle('is-3d');
    perspectivePanel.style.display = isOn ? 'block' : 'none';
    toggle3DBtn.textContent = isOn ? 'Exit 3D preview' : '3D Preview';
  });

  savePerspectiveBtn.addEventListener('click', async ()=>{
    const savedDirectly = await downloadJSON('view-settings.json', viewSettings);
    if(savedDirectly){
      showToast(toast, 'Perspective settings saved to data/view-settings.json.', 3400);
    } else {
      showToast(toast, 'view-settings.json downloaded — replace data/view-settings.json with this file.', 4600);
    }
  });

  function updateFolderStatus(){
    folderStatusEl.textContent = isProjectFolderConnected() ? '📁 Connected' : '📁 Not connected';
  }

  const formArea = document.getElementById('formArea');
  const formHeading = document.getElementById('formHeading');
  const fTitle = document.getElementById('fTitle');
  const fCategory = document.getElementById('fCategory');
  const fDesc = document.getElementById('fDesc');
  const fOrientationRadios = document.querySelectorAll('input[name="fOrientation"]');
  const savePinBtn = document.getElementById('savePinBtn');
  const cancelPinBtn = document.getElementById('cancelPinBtn');
  const filenameHint = document.getElementById('filenameHint');

  // Four independent upload slots: 2 main images (shown together), 2 extra images (shown in the strip).
  const slotConfig = [
    { key:'main1',  fileInput:'fFileMain1',  captionInput:'fCaptionMain1',  preview:'previewMain1',  suffix:'main1'  },
    { key:'main2',  fileInput:'fFileMain2',  captionInput:'fCaptionMain2',  preview:'previewMain2',  suffix:'main2'  },
    { key:'extra1', fileInput:'fFileExtra1', captionInput:'fCaptionExtra1', preview:'previewExtra1', suffix:'extra1' },
    { key:'extra2', fileInput:'fFileExtra2', captionInput:'fCaptionExtra2', preview:'previewExtra2', suffix:'extra2' }
  ];

  let pins = [];
  let draft = null;      // {x,y} pending new pin, or null
  let editingId = null;  // id of pin being edited, or null
  let nextNum = 1;
  let selectedFiles = { main1:null, main2:null, extra1:null, extra2:null };
  let existingSlotsRef = {}; // filled in openForm when editing, used as fallback if a slot isn't re-uploaded

  function uid(){ return 'p' + Math.random().toString(36).slice(2,9); }

  async function init(){
    pins = await loadPins();
    nextNum = pins.length + 1;
    await silentRestoreProjectFolder();
    updateFolderStatus();
    viewSettings = await loadViewSettings();
    applySlidersFromSettings();
    renderAll();
  }

  connectFolderBtn.addEventListener('click', async ()=>{
    if(!fsSupported()){
      showToast(toast, "This browser doesn't support direct folder saving — use Chrome or Edge. Falling back to normal downloads.", 4200);
      return;
    }
    try{
      if(await reconnectProjectFolder()){
        updateFolderStatus();
        showToast(toast, 'Reconnected — saves go straight into your project folder.');
        return;
      }
      await connectProjectFolder();
      updateFolderStatus();
      showToast(toast, 'Connected — saves now go straight into your project folder.');
    }catch(err){
      console.warn('Folder connect failed', err);
      showToast(toast, 'Could not connect the folder.');
    }
  });

  function renderAll(){
    renderDots();
    renderList();
    pinCountEl.textContent = `● ${pins.length} pin${pins.length===1?'':'s'}`;
  }

  function renderDots(){
    mapPlane.querySelectorAll('.pin').forEach(p=>p.remove());
    pins.forEach((pin)=>{
      const el = document.createElement('div');
      el.className = 'pin pin-photo admin-pin';
      el.dataset.pinId = pin.id;
      const pos = pinToStagePx(pin, mapImg);
      el.style.left = pos.left + 'px';
      el.style.top = pos.top + 'px';
      const thumbFile = firstThumb(pin);
      const safeTitle = escapeHtml(pin.title || 'Untitled');
      el.innerHTML = `
        <span class="glow"></span>
        <span class="ring"></span>
        <span class="pin-stalk"></span>
        <span class="thumb-dot"><img src="images/${thumbFile}" alt="" onerror="this.style.opacity=0"></span>
        <span class="pin-card-label">${safeTitle}</span>
        <span class="label">${safeTitle}</span>
      `;
      applyPinVisuals(el, pin, viewSettings);
      bindPinDrag(el, pin);
      mapPlane.appendChild(el);
    });
    if(draft){
      const el = document.createElement('div');
      el.className = 'pin';
      const pos = pinToStagePx(draft, mapImg);
      el.style.left = pos.left + 'px';
      el.style.top = pos.top + 'px';
      el.innerHTML = `<span class="glow"></span><span class="ring"></span><span class="dot"></span>`;
      mapPlane.appendChild(el);
    }
  }

  // Converts a pointer's client coords into %-of-photo coords (same space pins are stored in).
  function clientToPinPercent(clientX, clientY){
    const rect = mapImg.getBoundingClientRect();
    const box = getRenderedImageBox(mapImg);
    let relX = (clientX - rect.left) - box.left;
    let relY = (clientY - rect.top) - box.top;
    relX = Math.max(0, Math.min(box.width, relX));
    relY = Math.max(0, Math.min(box.height, relY));
    return { x: (relX / box.width) * 100, y: (relY / box.height) * 100 };
  }

  const DRAG_THRESHOLD = 4; // px of pointer movement before a press counts as a drag, not a click

  // A placed pin can be clicked (opens the edit form, old behavior) or
  // click-dragged to reposition it in place. Which one happens is only known
  // once the pointer moves (or doesn't), so both live in one pointer flow.
  function bindPinDrag(el, pin){
    let dragState = null; // {startX, startY, moved}

    el.addEventListener('pointerdown', (e)=>{
      if(stage.classList.contains('is-3d')) return; // 3D preview isn't the placement coordinate space
      e.stopPropagation();
      dragState = { startX: e.clientX, startY: e.clientY, moved: false };
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e)=>{
      if(!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if(!dragState.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD){
        dragState.moved = true;
        el.classList.add('dragging');
      }
      if(dragState.moved){
        const pct = clientToPinPercent(e.clientX, e.clientY);
        dragState.pct = pct;
        const pos = pinToStagePx(pct, mapImg);
        el.style.left = pos.left + 'px';
        el.style.top = pos.top + 'px';
      }
    });

    function endDrag(e){
      if(!dragState) return;
      el.releasePointerCapture(e.pointerId);
      el.classList.remove('dragging');
      if(dragState.moved){
        if(dragState.pct){
          const live = pins.find(p => p.id === pin.id);
          if(live){
            live.x = Math.round(dragState.pct.x * 100) / 100;
            live.y = Math.round(dragState.pct.y * 100) / 100;
          }
          showToast(toast, 'Pin moved — click Export pins.json to save the new position.', 3800);
        }
        dragState = null;
        renderDots(); // rebuilds from the updated pins array (also re-attaches drag handlers)
      } else {
        dragState = null;
        startEdit(pin.id);
      }
    }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  window.addEventListener('resize', renderDots);

  // Returns the first thumbnail-able image filename for a pin, new or legacy schema.
  function firstThumb(pin){
    if(pin.mainImages && pin.mainImages[0]) return pin.mainImages[0].file;
    if(pin.images && pin.images[0]) return pin.images[0];
    return pin.image || '';
  }

  function renderList(){
    if(pins.length === 0){
      pinListItems.innerHTML = '<p class="empty-state">No pins yet — click the map to add your first one.</p>';
      return;
    }
    pinListItems.innerHTML = '';
    pins.forEach((pin, i)=>{
      const row = document.createElement('div');
      row.className = 'pin-row';
      row.innerHTML = `
        <span class="num">${i+1}</span>
        <img class="thumb" src="images/${firstThumb(pin)}" onerror="this.style.opacity=0.15" alt="">
        <span class="name">${escapeHtml(pin.title || 'Untitled')}</span>
        <button class="del" title="Delete pin" data-id="${pin.id}">✕</button>
      `;
      row.addEventListener('click', (e)=>{
        if(e.target.classList.contains('del')) return;
        startEdit(pin.id);
      });
      row.querySelector('.del').addEventListener('click', (e)=>{
        e.stopPropagation();
        if(confirm('Remove this pin? (Its image files on disk are not deleted, just the reference.)')){
          pins = pins.filter(p=>p.id !== pin.id);
          renderAll();
          showToast(toast, 'Pin removed. Remember to export pins.json again.');
        }
      });
      pinListItems.appendChild(row);
    });
  }

  function escapeHtml(str){
    const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
  }

  // Click on map = start a new pin
  stage.addEventListener('click', (e)=>{
    if(stage.classList.contains('is-3d')) return;
    if(e.target.closest('.pin')) return;
    const rect = mapImg.getBoundingClientRect();
    const box = getRenderedImageBox(mapImg);
    const relX = (e.clientX - rect.left) - box.left;
    const relY = (e.clientY - rect.top) - box.top;
    if(relX < 0 || relY < 0 || relX > box.width || relY > box.height) return; // clicked in the letterbox margin, not the photo
    const x = (relX / box.width) * 100;
    const y = (relY / box.height) * 100;
    draft = { x: Math.max(0,Math.min(100,x)), y: Math.max(0,Math.min(100,y)) };
    editingId = null;
    openForm();
    renderDots();
  });

  // Maps a pin (new or legacy schema) into slot data: {main1:{file,caption}|null, main2:..., extra1:..., extra2:...}
  function getExistingSlotData(pin){
    if(!pin) return { main1:null, main2:null, extra1:null, extra2:null };
    if(pin.mainImages || pin.extraImages){
      const mains = pin.mainImages || [];
      const extras = pin.extraImages || [];
      return {
        main1: mains[0] || null,
        main2: mains[1] || null,
        extra1: extras[0] || null,
        extra2: extras[1] || null
      };
    }
    // Legacy schema: images[0] was the single main image, images[1..] were extras.
    const imgs = (pin.images && pin.images.length) ? pin.images : (pin.image ? [pin.image] : []);
    return {
      main1: imgs[0] ? { file: imgs[0], caption:'' } : null,
      main2: null,
      extra1: imgs[1] ? { file: imgs[1], caption:'' } : null,
      extra2: imgs[2] ? { file: imgs[2], caption:'' } : null
    };
  }

  function openForm(existingPin){
    formArea.style.display = 'block';
    selectedFiles = { main1:null, main2:null, extra1:null, extra2:null };
    existingSlotsRef = getExistingSlotData(existingPin);

    slotConfig.forEach(cfg=>{
      const fileEl = document.getElementById(cfg.fileInput);
      const captionEl = document.getElementById(cfg.captionInput);
      const previewEl = document.getElementById(cfg.preview);
      fileEl.value = '';
      const existing = existingSlotsRef[cfg.key];
      captionEl.value = existing ? (existing.caption || '') : '';
      previewEl.innerHTML = existing
        ? `<img src="images/${existing.file}" alt=""><span class="slot-filename">${existing.file}</span>`
        : '';
    });

    if(existingPin){
      formHeading.textContent = 'Edit location';
      fTitle.value = existingPin.title || '';
      fCategory.value = existingPin.category || '';
      fDesc.value = existingPin.description || '';
      const orient = existingPin.orientation === 2 ? '2' : '1';
      fOrientationRadios.forEach(r=>{ r.checked = (r.value === orient); });
      filenameHint.textContent = 'Choosing a new file in a slot replaces that image (it downloads — move it into images/, and delete the old file if it had a different name).';
    } else {
      formHeading.textContent = 'Add a location';
      fTitle.value = ''; fCategory.value = ''; fDesc.value = '';
      fOrientationRadios.forEach(r=>{ r.checked = (r.value === '1'); });
      filenameHint.textContent = '';
    }
    fTitle.focus();
  }

  function closeForm(){
    formArea.style.display = 'none';
    draft = null;
    editingId = null;
    renderDots();
  }

  function startEdit(id){
    const pin = pins.find(p=>p.id === id);
    if(!pin) return;
    editingId = id;
    draft = { x: pin.x, y: pin.y };
    openForm(pin);
    renderDots();
  }

  cancelPinBtn.addEventListener('click', closeForm);

  // Wire up the 4 file slots: choosing a file previews it immediately.
  slotConfig.forEach(cfg=>{
    const fileEl = document.getElementById(cfg.fileInput);
    const previewEl = document.getElementById(cfg.preview);
    fileEl.addEventListener('change', ()=>{
      const file = fileEl.files[0];
      if(!file) return;
      selectedFiles[cfg.key] = file;
      const url = URL.createObjectURL(file);
      previewEl.innerHTML = `<img src="${url}" alt="preview">`;
    });
  });

  savePinBtn.addEventListener('click', async ()=>{
    if(!draft){ showToast(toast, 'Click the map first to set a point.'); return; }
    const title = fTitle.value.trim();
    if(!title){ showToast(toast, 'Give this location a title.'); fTitle.focus(); return; }

    const hasNewFiles = Object.values(selectedFiles).some(f => !!f);
    if(hasNewFiles && fsSupported() && !isProjectFolderConnected()){
      showToast(toast, 'Not connected to your project folder. Click "Connect project folder" above, then hit Save pin again.', 5200);
      return;
    }

    const isEdit = !!editingId;
    const existing = isEdit ? pins.find(p=>p.id === editingId) : null;
    const num = isEdit ? (pins.findIndex(p=>p.id===editingId)+1) : nextNum;
    const paddedNum = String(num).padStart(2,'0');
    const savedNames = [];    // written directly into images/
    const fallbackNames = []; // fell back to a browser download

    async function resolveSlot(cfg){
      const newFile = selectedFiles[cfg.key];
      const captionEl = document.getElementById(cfg.captionInput);
      const caption = captionEl.value.trim();
      if(newFile){
        const ext = (newFile.name.split('.').pop() || 'jpg').toLowerCase();
        const filename = `pin-${paddedNum}-${slugify(title)}-${cfg.suffix}.${ext}`;
        const savedDirectly = await downloadBlob(filename, newFile);
        (savedDirectly ? savedNames : fallbackNames).push(filename);
        return { file: filename, caption };
      }
      const existingSlot = existingSlotsRef[cfg.key];
      if(existingSlot){
        return { file: existingSlot.file, caption: caption || existingSlot.caption || '' };
      }
      return null;
    }

    const main1  = await resolveSlot(slotConfig[0]);
    const main2  = await resolveSlot(slotConfig[1]);
    const extra1 = await resolveSlot(slotConfig[2]);
    const extra2 = await resolveSlot(slotConfig[3]);

    if(!main1 && !main2){
      showToast(toast, 'Add at least one main image.');
      return;
    }

    if(savedNames.length && !fallbackNames.length){
      showToast(toast, `Saved ${savedNames.join(', ')} to images/.`, 3400);
    } else if(fallbackNames.length){
      showToast(toast, `Downloaded ${fallbackNames.join(', ')} — move into images/.`, 4600);
    }

    const mainImages = [main1, main2].filter(Boolean);
    const extraImages = [extra1, extra2].filter(Boolean);
    const selectedOrientation = document.querySelector('input[name="fOrientation"]:checked');
    const orientation = selectedOrientation && selectedOrientation.value === '2' ? 2 : 1;

    const pinData = {
      id: existing ? existing.id : uid(),
      x: Math.round(draft.x * 100)/100,
      y: Math.round(draft.y * 100)/100,
      title,
      category: fCategory.value.trim(),
      orientation,
      description: fDesc.value.trim(),
      mainImages,
      extraImages
    };

    if(isEdit){
      pins = pins.map(p => p.id === editingId ? pinData : p);
    } else {
      pins.push(pinData);
      nextNum++;
    }

    closeForm();
    renderAll();
  });

  document.getElementById('exportBtn').addEventListener('click', async ()=>{
    const savedDirectly = await downloadJSON('pins.json', pins);
    if(savedDirectly){
      showToast(toast, 'pins.json saved to data/pins.json.', 3400);
    } else {
      showToast(toast, 'pins.json downloaded — replace data/pins.json with this file.', 4200);
    }
  });

  document.getElementById('loadExistingBtn').addEventListener('click', async ()=>{
    pins = await loadPins();
    nextNum = pins.length + 1;
    closeForm();
    renderAll();
    showToast(toast, 'Reloaded pins from data/pins.json.');
  });

  if(mapImg.complete){ init(); } else { mapImg.addEventListener('load', init); }
})();
