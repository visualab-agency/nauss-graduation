/* Shared helpers for viewer + admin */

const PINS_URL = 'data/pins.json';

/* ---------- Direct-to-disk saving (Chrome/Edge only) ----------
   If the person connects their project folder once, files are written
   straight into its images/ and data/ subfolders instead of going through
   the browser's Downloads folder. The connection is remembered across
   reloads via IndexedDB, but each new browser session needs a one-click
   reconfirm — that's a browser security requirement, not something a page
   can skip. Falls back to the old download-and-move flow everywhere else. */

const FS_DB_NAME = 'admin-fs-handles';
const FS_STORE_NAME = 'handles';

let fsRoot = null;
let fsImagesDir = null;
let fsDataDir = null;

function fsSupported(){
  return typeof window.showDirectoryPicker === 'function';
}

function isProjectFolderConnected(){
  return !!(fsImagesDir && fsDataDir);
}

function openHandleDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(FS_DB_NAME, 1);
    req.onupgradeneeded = ()=> req.result.createObjectStore(FS_STORE_NAME);
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

async function saveHandleToDB(handle){
  const db = await openHandleDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(FS_STORE_NAME, 'readwrite');
    tx.objectStore(FS_STORE_NAME).put(handle, 'projectRoot');
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}

async function loadHandleFromDB(){
  const db = await openHandleDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(FS_STORE_NAME, 'readonly');
    const req = tx.objectStore(FS_STORE_NAME).get('projectRoot');
    req.onsuccess = ()=> resolve(req.result || null);
    req.onerror = ()=> reject(req.error);
  });
}

async function setupProjectDirs(){
  fsImagesDir = await fsRoot.getDirectoryHandle('images', { create:true });
  fsDataDir = await fsRoot.getDirectoryHandle('data', { create:true });
}

// Opens the folder picker, remembers the choice, and derives images/ + data/.
async function connectProjectFolder(){
  if(!fsSupported()) throw new Error('File System Access API not supported in this browser.');
  fsRoot = await window.showDirectoryPicker({ mode: 'readwrite' });
  await setupProjectDirs();
  await saveHandleToDB(fsRoot);
}

// Tries to reuse a previously granted handle. If permission needs
// reconfirming, this must be called from inside a user click (it prompts).
async function reconnectProjectFolder(){
  if(!fsSupported()) return false;
  const stored = await loadHandleFromDB();
  if(!stored) return false;
  const perm = await stored.requestPermission({ mode:'readwrite' });
  if(perm !== 'granted') return false;
  fsRoot = stored;
  await setupProjectDirs();
  return true;
}

// Checks (without prompting) whether a stored handle is already permitted —
// safe to call on page load.
async function silentRestoreProjectFolder(){
  if(!fsSupported()) return false;
  try{
    const stored = await loadHandleFromDB();
    if(!stored) return false;
    const perm = await stored.queryPermission({ mode:'readwrite' });
    if(perm !== 'granted') return false;
    fsRoot = stored;
    await setupProjectDirs();
    return true;
  }catch(err){
    console.warn('Could not silently restore project folder', err);
    return false;
  }
}

async function writeToDir(dirHandle, filename, blob){
  const fileHandle = await dirHandle.getFileHandle(filename, { create:true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function loadPins(){
  try{
    const res = await fetch(PINS_URL + '?t=' + Date.now());
    if(!res.ok) throw new Error('no pins file');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }catch(err){
    console.warn('Could not load pins.json, starting empty.', err);
    return [];
  }
}

/* ---------- 3D bird's-eye view settings ---------- */

const VIEW_SETTINGS_URL = 'data/view-settings.json';

// Per-category pin settings: each pin picks category 1 or 2, and everything
// about how its standee looks/sits/labels comes from that category's block.
const DEFAULT_CATEGORY_SETTINGS = {
  pinTiltX:55,
  pinTiltZ:12,
  pinScaleX:1,
  pinScaleY:1,
  pinScaleZ:1,
  pinSkew:0,
  elevate:70,
  labelLift:0,
  labelOffsetX:0
};

// Global settings: shared by the whole map regardless of pin category.
const DEFAULT_VIEW_SETTINGS = {
  tiltX:55,
  tiltZ:12,
  perspective:1400,
  categories:{
    1:{ ...DEFAULT_CATEGORY_SETTINGS },
    2:{ ...DEFAULT_CATEGORY_SETTINGS }
  }
};

const CATEGORY_KEYS = ['pinTiltX','pinTiltZ','pinScaleX','pinScaleY','pinScaleZ','pinSkew','elevate','labelLift','labelOffsetX'];

// Normalizes whatever came out of view-settings.json into the current
// { tiltX, tiltZ, perspective, categories:{1:{...},2:{...}} } shape.
// Also migrates old flat files (pin settings at the top level, no
// `categories` key) by treating them as category 1's settings.
function normalizeViewSettings(data){
  data = data || {};
  const settings = {
    tiltX: data.tiltX != null ? data.tiltX : DEFAULT_VIEW_SETTINGS.tiltX,
    tiltZ: data.tiltZ != null ? data.tiltZ : DEFAULT_VIEW_SETTINGS.tiltZ,
    perspective: data.perspective != null ? data.perspective : DEFAULT_VIEW_SETTINGS.perspective,
    categories: {}
  };
  const legacyCategory1 = {};
  CATEGORY_KEYS.forEach(k=>{ if(data[k] != null) legacyCategory1[k] = data[k]; });
  const rawCategories = data.categories || {};
  [1,2].forEach(catNum=>{
    const base = { ...DEFAULT_CATEGORY_SETTINGS };
    if(catNum === 1) Object.assign(base, legacyCategory1);
    Object.assign(base, rawCategories[catNum] || rawCategories[String(catNum)] || {});
    settings.categories[catNum] = base;
  });
  return settings;
}

async function loadViewSettings(){
  try{
    const res = await fetch(VIEW_SETTINGS_URL + '?t=' + Date.now());
    if(!res.ok) throw new Error('no view-settings file');
    const data = await res.json();
    return normalizeViewSettings(data);
  }catch(err){
    console.warn('Could not load view-settings.json, using defaults.', err);
    return normalizeViewSettings({});
  }
}

// A pin's orientation is 1 or 2; anything missing/invalid falls back to 1.
function getPinCategoryNum(pin){
  return (pin && pin.orientation === 2) ? 2 : 1;
}

function getCategorySettings(viewSettings, catNum){
  return (viewSettings.categories && viewSettings.categories[catNum]) || DEFAULT_CATEGORY_SETTINGS;
}

// Pushes the global tilt/depth values onto the stage as CSS variables —
// these apply to the whole map-plane regardless of pin category.
function applyViewSettingsToStage(stageEl, settings){
  stageEl.style.setProperty('--tilt-x', settings.tiltX + 'deg');
  stageEl.style.setProperty('--tilt-z', settings.tiltZ + 'deg');
  stageEl.style.setProperty('--persp', settings.perspective + 'px');
}

// Pushes one category's pin-standee/label values onto a single pin element
// as CSS variables. Setting these directly on the pin (rather than the
// stage) lets each pin follow its own category's look while sharing the
// same CSS rules — a CSS var set on a closer element always wins.
function applyPinCategoryVars(pinEl, cat){
  const pinScaleY = Number(cat.pinScaleY) || 1;
  const pinScaleZ = Number(cat.pinScaleZ) || 1;
  const pinLift = (Number(cat.elevate) || 0) * pinScaleZ;
  const labelLiftExtra = Number(cat.labelLift) || 0;
  const labelOffsetX = Number(cat.labelOffsetX) || 0;
  const pinLabelLift = pinLift + (66 * pinScaleY) + labelLiftExtra;
  pinEl.style.setProperty('--pin-tilt-x', cat.pinTiltX + 'deg');
  pinEl.style.setProperty('--pin-tilt-z', cat.pinTiltZ + 'deg');
  pinEl.style.setProperty('--pin-scale-x', cat.pinScaleX);
  pinEl.style.setProperty('--pin-scale-y', cat.pinScaleY);
  pinEl.style.setProperty('--pin-scale-z', cat.pinScaleZ);
  pinEl.style.setProperty('--pin-skew', cat.pinSkew + 'deg');
  pinEl.style.setProperty('--pin-lift', pinLift + 'px');
  pinEl.style.setProperty('--pin-label-lift', pinLabelLift + 'px');
  pinEl.style.setProperty('--label-offset-x', labelOffsetX + 'px');
}

// Convenience: apply the correct category's vars to a pin element straight
// from the pin's own data + the loaded view settings.
function applyPinVisuals(pinEl, pin, viewSettings){
  applyPinCategoryVars(pinEl, getCategorySettings(viewSettings, getPinCategoryNum(pin)));
}

function slugify(str){
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'location';
}

function showToast(el, msg, ms=2600){
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.classList.remove('show'), ms);
}

// Saves pins.json. Writes directly into the connected data/ folder if
// available; otherwise falls back to a browser download.
// Returns true if it saved directly to disk, false if it fell back.
async function downloadJSON(filename, data){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  if(isProjectFolderConnected()){
    try{
      await writeToDir(fsDataDir, filename, blob);
      return true;
    }catch(err){
      console.warn('Direct write to data/ failed, falling back to download', err);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return false;
}

// Returns the rect of the *visible photo* inside an <img> that uses
// object-fit:contain, in px, relative to the img element's own box.
// If the img's box aspect ratio doesn't match the photo's natural aspect
// ratio, object-fit:contain letterboxes it (blank bars top/bottom or
// left/right) — this tells you where the real picture starts/ends so
// pin % coordinates line up no matter how the surrounding CSS sizes things.
function getRenderedImageBox(img){
  const cw = img.clientWidth;
  const ch = img.clientHeight;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if(!nw || !nh || !cw || !ch) return {left:0, top:0, width:cw||0, height:ch||0};
  const containerRatio = cw / ch;
  const imageRatio = nw / nh;
  let width, height, left, top;
  if(imageRatio > containerRatio){
    width = cw;
    height = cw / imageRatio;
    left = 0;
    top = (ch - height) / 2;
  } else {
    height = ch;
    width = ch * imageRatio;
    top = 0;
    left = (cw - width) / 2;
  }
  return {left, top, width, height};
}

// The 3D "standee" cards (90x60px) and their elevation/label-lift were
// tuned by eye against a desktop-sized render of the map. On a small
// screen the map image itself renders much smaller, so those same
// fixed-pixel cards + offsets end up proportionally huge next to each
// other and overlap. This returns a scale factor — based on how wide the
// map is currently rendering vs. the width it was tuned against — so
// callers can shrink the standees/elevation to match. Tune
// STANDEE_REFERENCE_WIDTH if the "designed at" desktop width changes.
const STANDEE_REFERENCE_WIDTH = 1400;
const STANDEE_MIN_SCALE = 0.32;
const STANDEE_MAX_SCALE = 1.15;

function getMapStandeeScale(img){
  const box = getRenderedImageBox(img);
  if(!box.width) return 1;
  const raw = box.width / STANDEE_REFERENCE_WIDTH;
  return Math.min(STANDEE_MAX_SCALE, Math.max(STANDEE_MIN_SCALE, raw));
}

// The flat 2D circular markers don't have the same overlap problem the 3D
// standees do (they're small dots, not wide cards), so they only need a
// gentle size reduction on small screens rather than the full proportional
// shrink — sqrt() eases the curve, and a higher floor keeps them tappable.
const BUBBLE_MIN_SCALE = 0.62;
const BUBBLE_MAX_SCALE = 1.08;

function getMapBubbleScale(img){
  const box = getRenderedImageBox(img);
  if(!box.width) return 1;
  const raw = box.width / STANDEE_REFERENCE_WIDTH;
  return Math.min(BUBBLE_MAX_SCALE, Math.max(BUBBLE_MIN_SCALE, Math.sqrt(raw)));
}

// Converts a pin's stored x/y (% of the photo) into px coordinates
// relative to img's offsetParent (i.e. the .stage element), so it can be
// used directly as CSS left/top on an absolutely-positioned pin inside stage.
function pinToStagePx(pin, img){
  const box = getRenderedImageBox(img);
  return {
    left: img.offsetLeft + box.left + (pin.x/100) * box.width,
    top: img.offsetTop + box.top + (pin.y/100) * box.height
  };
}

// Saves an uploaded image. Writes directly into the connected images/
// folder if available; otherwise falls back to a browser download.
// Returns true if it saved directly to disk, false if it fell back.
async function downloadBlob(filename, blob){
  if(isProjectFolderConnected()){
    try{
      await writeToDir(fsImagesDir, filename, blob);
      return true;
    }catch(err){
      console.warn('Direct write to images/ failed, falling back to download', err);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return false;
}
