# NAUSS Graduation — Interactive Site Map

A two-page static site:

- **`index.html`** — what your clients see. The master plan with glowing markers; click a marker to see the render for that spot, then go back to the plan.
- **`admin.html`** — your editor. Click the plan to drop a marker, attach the matching render, repeat for all your locations, then export the data file.

Nothing here needs a server or database — it's plain HTML/CSS/JS, so it hosts for free on GitHub Pages.

---

## 1. Preparing your ~20 render images

For a consistent, fast-loading gallery:

- **Format:** JPG (PNG only if you need transparency, which you won't for renders).
- **Size:** 1920px wide is plenty for a full-screen preview. Renders straight out of your 3D software are often much larger — resize them down; it makes the site load faster with no visible quality loss on screen.
- **Orientation:** landscape works best in the preview panel, but portrait is handled fine too.
- **Naming:** you don't need to pre-name anything — the admin tool below names files for you when you save each pin (e.g. `pin-01-reception-tent.jpg`). Just have your 20 renders ready in one folder, named however you like today.
- **Weight:** aim for under ~1.5MB per image. If your renders are heavier, batch-compress them first (e.g. with Squoosh, TinyPNG, or "Export for web" in Photoshop).

## 2. Placing pins and attaching images (first run)

1. Open a terminal in this project folder and start a local server (needed because browsers block some file access when opening HTML directly):
   ```
   npx serve .
   ```
   or, if you have Python:
   ```
   python3 -m http.server 8080
   ```
2. Open the printed local address in your browser (e.g. `http://localhost:8080/admin.html`).
3. **Click anywhere on the map** where you want a marker (e.g. the reception tent, an entrance gate, the photo wall).
4. In the panel on the right:
   - Type a **Title** — this is what the client sees above the image (e.g. "Reception Tent — Arrival Side").
   - Optionally add a **Category** (e.g. "VVIP Arrival") and a short **Description**.
   - Click the **main image** box and choose the overall render of that location.
   - Optionally click the **extra images** box and choose up to 2 more renders — close-ups of an isolated design element (an arch, a banner, a tent finish, etc). Clients will see these as small thumbnails they can click to swap into the main view.
5. Click **Save pin**. Two things happen:
   - The marker appears permanently on the map.
   - Your browser **downloads renamed copies** of each image chosen (e.g. `pin-01-reception-tent.jpg`, `pin-01-reception-tent-detail1.jpg`) into your Downloads folder.
6. **Move those downloaded images** into this project's `images/` folder.
7. Repeat steps 3–6 for all ~20 locations. You can click any existing marker (or its row in the list) at any time to edit its title/description or swap its image.
8. When you're done, click **Export pins.json** at the top. This downloads a `pins.json` file.
9. **Replace** `data/pins.json` in this project with that downloaded file (overwrite it).

Your `images/` folder should now contain one file per pin, and `data/pins.json` should reference all of them by filename.

### Adding more pins later
Just reopen `admin.html` the same way — it automatically loads whatever is currently in `data/pins.json`, so you can add, edit, or delete pins and export an updated file without losing earlier work.

## 3. Checking it locally

With your local server still running, open:
```
http://localhost:8080/index.html
```
You should see the master plan with gold pulsing markers wherever you placed pins. Click one — the render opens in a preview panel with your title/description. Click **Back to master plan** (or the ✕, or press Escape, or click outside the image) to return and pick another spot.

## 4. Publishing to GitHub Pages

1. Create a new repository on GitHub (public, or private if your GitHub plan supports Pages on private repos).
2. From this project folder:
   ```
   git init
   git add .
   git commit -m "Interactive event site map"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```
3. On GitHub: go to the repository's **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to "Deploy from a branch", pick branch **main** and folder **/ (root)**, then **Save**.
5. Wait a minute or two, then your site will be live at:
   ```
   https://YOUR-USERNAME.github.io/YOUR-REPO/
   ```
   That's the link to send clients. `admin.html` will technically also be reachable at `.../admin.html` — it's not linked from the client page, but if you'd rather keep it fully private, do your editing locally and only push `index.html` plus the finished `data/` and `images/` folders (delete or `.gitignore` `admin.html` and the `js/admin.js` file before pushing).

## 5. Updating later
Anytime you want to add, remove, or swap renders: repeat the admin workflow locally, replace `data/pins.json`, add/replace files in `images/`, then:
```
git add .
git commit -m "Update site renders"
git push
```
GitHub Pages redeploys automatically within a minute or two.

---

## Project structure
```
index.html          ← client-facing viewer
admin.html          ← your pin/image editor (local use)
css/style.css        ← shared styling
js/common.js         ← shared helpers
js/viewer.js         ← client viewer logic
js/admin.js           ← admin editor logic
assets/masterplan.jpg ← the site map image
data/pins.json        ← all marker + image + text data
images/               ← your ~20 render files live here
```
