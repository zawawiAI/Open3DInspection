# Open3DInspection — Installation Guide

Browser-based 3D/2D inspection app: visual annotations, NDT data tagging, asset library, and inspection CRM. Everything runs locally in your browser — no server or `.env` file required.

---

## Requirements

| Tool | Version |
|------|---------|
| **Node.js** | 18 or newer (20 LTS recommended) |
| **npm** | 9+ (included with Node.js) |

Check your versions:

```bash
node -v
npm -v
```

### Install Node.js (if needed)

**macOS (Homebrew)**

```bash
brew install node@20
```

**Ubuntu / Debian**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**nvm (any OS)**

```bash
nvm install 20
nvm use 20
```

Or download from [https://nodejs.org/](https://nodejs.org/)

---

## Quick install (recommended)

Clone the repository, then run the install script:

```bash
git clone <your-repo-url>
cd threed
chmod +x install.sh
./install.sh
```

The script will:

1. Verify Node.js and npm
2. Install dependencies (`npm ci`)
3. Run a production build to confirm everything works

**Faster install (skip build check):**

```bash
./install.sh --dev
```

---

## Manual install

If you prefer not to use the script:

```bash
git clone <your-repo-url>
cd threed
npm ci
npm run build
```

If `package-lock.json` is missing, use `npm install` instead of `npm ci`.

---

## Run the app

**Development** (hot reload):

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**Production build:**

```bash
npm run build
```

Output is written to the `dist/` folder.

**Preview production build locally:**

```bash
npm run preview
```

---

## Supported file formats

| Type | Extensions |
|------|------------|
| Meshes | `.obj`, `.fbx`, `.glb`, `.gltf`, `.ply` |
| Point clouds | `.las`, `.laz`, `.ply` |
| Gaussian splats | `.splat`, `.ksplat`, `.ply` (Gaussian PLY) |
| Images | `.jpg`, `.jpeg`, `.png` |

---

## App tabs

| Tab | Purpose |
|-----|---------|
| **Visual** | 3D/2D comment pins on assets |
| **Data** | NDT monitoring points, thickness readings, trend graphs |
| **Assets** | Local asset library with folders |
| **Reports** | Inspection CRM and escalation |
| **Team** | Technicians and escalation order |

---

## Data storage

All data is stored **in your browser**:

- Annotations and NDT readings → `localStorage`
- Uploaded files and attachments → `IndexedDB`

Nothing is uploaded to a remote server by default.

---

## Troubleshooting

**`Node.js is not installed` or version too old**

Install or upgrade to Node.js 18+ (see above).

**`npm ci` fails**

Try:

```bash
rm -rf node_modules
npm install
```

**Port 5173 already in use**

Vite will suggest another port, or stop the other process using 5173.

**Build fails with TypeScript errors**

Ensure you are on a supported Node version and dependencies are fully installed:

```bash
rm -rf node_modules
./install.sh
```

---

## Tech stack

- [Vite](https://vitejs.dev/) + React + TypeScript
- [Three.js](https://threejs.org/) via [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) and [drei](https://github.com/pmndrs/drei)
- [@loaders.gl/las](https://loaders.gl/) for LAS/LAZ point clouds
- [Zustand](https://github.com/pmndrs/zustand) for state

---

## License

See repository license file (if provided).
