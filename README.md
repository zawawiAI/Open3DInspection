# Open3DInspection
<img src ="https://github.com/zawawiAI/Open3DInspection/blob/main/docs/Open3DInspection.png">



https://github.com/user-attachments/assets/438f8f9a-eddc-4d53-af09-983af8c4fa64



A browser-based viewer for leaving **comments anchored in 3D (or 2D) space** on a
wide range of assets. Drop in a model, switch to Annotate mode, click to drop a
pin, and write a comment. Annotations are saved automatically and can be
exported/imported as JSON.

## Supported formats

| Category        | Extensions                  | Notes                                              |
| --------------- | --------------------------- | -------------------------------------------------- |
| Meshes          | `.obj`, `.fbx`, `.ply`      | Materials/colors honored when present              |
| Point clouds    | `.las`, `.laz`, `.ply`      | Per-point RGB used when available                  |
| Gaussian Splats | `.splat`, `.ksplat`, `.ply` | For `.ply` splats, tick **“PLY as Splat”**         |
| Images          | `.jpg`, `.jpeg`, `.png`     | 2D pin annotations placed directly on the image    |

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (defaults to http://localhost:5173).

To build for production:

```bash
npm run build
npm run preview
```

## How to use

1. **Open a file** from the toolbar, or drag-and-drop it onto the window.
2. Use **Navigate** mode to orbit / pan / zoom (mouse drag, right-drag, scroll).
3. Switch to **Annotate** mode and **click on the model** (or image) to drop a pin.
4. Edit the comment’s title, body, and color in the right sidebar. Mark it
   **Resolved** when handled.
5. Click any comment in the list to fly the camera to it (3D) or highlight it (2D).
6. **Export JSON** to share annotations; **Import JSON** to load them back.

Annotations are also cached in `localStorage` per filename, so reopening the same
file restores your comments.

## Tech stack

- [Vite](https://vitejs.dev/) + React + TypeScript
- [three.js](https://threejs.org/) via [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) and [drei](https://github.com/pmndrs/drei)
- [@loaders.gl/las](https://loaders.gl/) for LAS/LAZ point clouds
- [zustand](https://github.com/pmndrs/zustand) for state

## Notes & limitations

- **Gaussian `.ply` splats**: drei’s `<Splat>` expects the `.splat`/`.ksplat`
  format. If a `.ply` is actually a Gaussian splat, enable **“PLY as Splat”**;
  for best results convert to `.splat` first (e.g. with the `antimatter15`
  or `gsplat` conversion tools).
- Splat assets are not click-annotatable on their surface (they have no mesh to
  raycast against); place pins on meshes/point clouds/images.
- Everything runs locally in the browser — no files are uploaded to a server.

## Project structure

```
src/
  components/
    Toolbar.tsx        toolbar: open file, mode, options, import/export
    Sidebar.tsx        comment list + editor
    Dropzone.tsx       drag-and-drop overlay
    Viewer3D.tsx       Canvas + OrbitControls + gizmo
    Scene.tsx          lights, grid, click-to-annotate, camera focus
    Model.tsx          format dispatcher (obj/fbx/ply/splat/las)
    Annotations3D.tsx  3D pins + labels
    ImageViewer.tsx    2D image viewer + pins
  loaders/
    lasLoader.ts       LAS/LAZ -> THREE.Points
    normalize.ts       center/scale objects, PLY mesh-vs-points
  store/useStore.ts    zustand store + localStorage persistence
  types.ts             shared types
```
