# Monkey Companion

An interactive 2D monkey that follows the cursor. It uses **your original sprite
sheet** as the only art source — no character was redrawn or replaced.

The page is intentionally just a transparent canvas: no background, floor,
shadow, scenery, text, or fixed placement. The monkey is the only thing drawn.

## Run

Open `index.html` directly, or serve the folder:

```bash
python -m http.server 8765
```

Then visit <http://127.0.0.1:8765/>. Move the cursor and the monkey follows,
turns, walks, and settles when it reaches it.

## Behavior

- Smooth acceleration and braking (no teleporting).
- Stops within a short radius of the cursor and idles with a gentle bob.
- Faces the cursor even while standing still.
- Eight directions: E, SE, S, SW, W, NW, N, NE.
- Direction changes cross-fade instead of snapping.
- The walk cycle is driven by distance travelled, so the feet do not slide.
- Always clamped fully inside the window.
- `requestAnimationFrame` loop with delta time; one monkey, 32 small images.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Transparent canvas + script hookup |
| `styles.css` | Removes margins; no background of any kind |
| `monkey.js` | Sprite loading, physics, facing, animation, rendering |
| `assets/monkey_source.png` | Your uploaded sheet, byte-for-byte untouched |
| `assets/frames/r1c1.png` … `r8c4.png` | 32 extracted transparent frames |
| `assets/monkey_atlas.png` | Clean 4 × 8 uniform atlas |
| `assets/frames.json` | Frame size, source rows, direction map |
| `extract_frames.py` | Reproducible extraction script |
| `assets/frames_preview.png` | All extracted frames on a checkerboard |

## Direction mapping

The sheet contains these original four-frame sets:

| Source row | Facing |
| --- | --- |
| 1 | front (down) |
| 2 | front-right |
| 3 | right |
| 4 | back (up) |
| 5 | back (up) |
| 6 | left |
| 7 | front-left |
| 8 | front-left (alternate) |

They are mapped to the eight compass directions:

| Direction | Source | Mirrored? |
| --- | --- | --- |
| E | row 3 | no |
| SE | row 2 | no |
| S | row 1 | no |
| SW | row 7 | no |
| W | row 6 | no |
| NW | row 4 | yes |
| N | row 4 | no |
| NE | row 5 | no |

Only the up-left diagonal is mirrored, because the sheet has no back-left view.
Every other direction uses the original directional art. Row 8 is retained as
an alternate front-left set.

## Sprite extraction

`extract_frames.py`:

1. Finds the 32 sprites by alpha connected-components (the sheet's contents are
   not on an exact 512 px grid, so fixed slicing would clip them).
2. Discards the soft brown glow around each sprite (alpha < 195).
3. Normalises the remaining alpha so the character is fully opaque.
4. Centers each frame horizontally and puts the feet on a common baseline.
5. Writes uniform frames plus the atlas and metadata.

```bash
pip install pillow numpy scipy
python extract_frames.py
```

To use a different sheet with the same 4 × 8 layout, replace
`assets/monkey_source.png` and run the script.

## Placement API

The demo starts the monkey in the center of the viewport, but the component is
placement-independent:

```js
MonkeyCompanion.setPosition(320, 480); // center of the monkey, CSS px
MonkeyCompanion.setHeight(120);        // displayed height, aspect preserved
MonkeyCompanion.pause();
MonkeyCompanion.resume();
MonkeyCompanion.getState();            // position, facing, frame, speed, size
```

To drop the companion into another page, include `monkey.js`, add the
`<canvas id="stage">` element and its CSS, and load the `assets/` folder next to
the script. The canvas stays transparent, so it can sit over any background you
choose later.
