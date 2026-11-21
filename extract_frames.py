#!/usr/bin/env python3
"""
Build clean sprite assets from the supplied artwork with all hair and fur intact.

Inputs:
    assets/monkey_source.png - 4 x 8 walking sheet, transparent with natural hair
    assets/react_source.png  - 3 reaction poses (in-and-out celebration)

Outputs:
    assets/frames/           - 32 transparent walking frames with full hair
    assets/monkey_atlas.png  - clean 4 x 8 walking atlas with full hair
    assets/frames.json       - walking frame metadata
    assets/poses/            - 35 master frames on uniform 260x270 canvas:
                               32 walking + 3 reaction poses (react_1, react_2, react_3)
    assets/poses.json        - master frame size, anchors and extents
    assets/frames_preview.png- walking frames on a checkerboard
    assets/poses_preview.png - master frames on a checkerboard
"""

from pathlib import Path
import json

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "monkey_source.png"
REACT_SOURCE = ASSETS / "react_source.png"
FRAME_DIR = ASSETS / "frames"
POSE_DIR = ASSETS / "poses"
ATLAS_PATH = ASSETS / "monkey_atlas.png"
META_PATH = ASSETS / "frames.json"
POSE_META_PATH = ASSETS / "poses.json"

ROWS, COLS = 8, 4
NOISE_ALPHA = 6

# Uniform master canvas shared by every pose
MASTER_W = 260
MASTER_H = 270
BODY_REF_H = 243
BODY_CX = 130
FOOT_Y = 253
BODY_CY = 140.5

ROW_NAMES = {
    1: "front (down)", 2: "front-right", 3: "right", 4: "back (up)",
    5: "back (up)", 6: "left", 7: "front-left", 8: "front-left (alternate)",
}
DIRECTION_MAP = {
    "E": {"row": 3, "mirror": False}, "SE": {"row": 2, "mirror": False},
    "S": {"row": 1, "mirror": False}, "SW": {"row": 2, "mirror": True},
    "W": {"row": 3, "mirror": True},  "NW": {"row": 5, "mirror": True},
    "N": {"row": 4, "mirror": False}, "NE": {"row": 5, "mirror": False},
}


def find_sprites(alpha):
    mask = alpha >= 195
    labels, _ = ndimage.label(mask, structure=np.ones((3, 3)))
    boxes = []
    for index, box in enumerate(ndimage.find_objects(labels), start=1):
        if box is None or int((labels[box] == index).sum()) < 1500:
            continue
        y0, y1 = box[0].start, box[0].stop
        x0, x1 = box[1].start, box[1].stop
        boxes.append(dict(x0=x0, y0=y0, x1=x1, y1=y1,
                          cx=(x0 + x1) / 2, cy=(y0 + y1) / 2))
    if len(boxes) != ROWS * COLS:
        raise SystemExit(f"Expected {ROWS * COLS} walking sprites, found {len(boxes)}")
    boxes.sort(key=lambda b: b["cy"])
    return [sorted(boxes[i * COLS:(i + 1) * COLS], key=lambda b: b["cx"])
            for i in range(ROWS)]


def checker_preview(frames, cols, cell_w, cell_h):
    scale = 2
    out = Image.new("RGB", (cols * cell_w * scale, ((len(frames) + cols - 1) // cols) * cell_h * scale), (255, 255, 255))
    draw = ImageDraw.Draw(out)
    for yy in range(0, out.height, 24):
        for xx in range(0, out.width, 24):
            if ((xx // 24) + (yy // 24)) % 2 == 0:
                draw.rectangle([xx, yy, xx + 23, yy + 23], fill=(203, 203, 213))
    for i, frame in enumerate(frames):
        cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
        cell.alpha_composite(frame, ((cell_w - frame.width) // 2,
                                     (cell_h - frame.height) // 2))
        cell = cell.resize((cell_w * scale, cell_h * scale), Image.Resampling.LANCZOS)
        out.paste(cell, ((i % cols) * cell_w * scale,
                         (i // cols) * cell_h * scale), cell)
    return out


def main():
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    POSE_DIR.mkdir(parents=True, exist_ok=True)

    source = Image.open(SOURCE).convert("RGBA")
    pixels = np.array(source)
    alpha = pixels[:, :, 3]

    rows = find_sprites(alpha)
    row_divs = [0]
    for i in range(len(rows) - 1):
        mid = (max(b["y1"] for b in rows[i]) + min(b["y0"] for b in rows[i + 1])) // 2
        row_divs.append(mid)
    row_divs.append(pixels.shape[0])

    sprite_data = []
    max_w = 0
    max_h = 0

    for r_idx, r in enumerate(rows):
        y_min, y_max = row_divs[r_idx], row_divs[r_idx + 1]
        col_divs = [0]
        for c in range(len(r) - 1):
            col_divs.append((r[c]["x1"] + r[c + 1]["x0"]) // 2)
        col_divs.append(pixels.shape[1])

        r_crops = []
        grounds = []
        for c_idx in range(len(r)):
            cell = pixels[y_min:y_max, col_divs[c_idx]:col_divs[c_idx + 1]].copy()
            # Drop only faint compression background noise (< 6), keep ALL hair
            cell[cell[:, :, 3] < NOISE_ALPHA, 3] = 0
            vy, vx = np.where(cell[:, :, 3] >= NOISE_ALPHA)
            crop = cell[vy.min():vy.max() + 1, vx.min():vx.max() + 1]
            abs_y0 = y_min + vy.min()
            abs_y1 = y_min + vy.max()
            grounds.append(abs_y1)
            w, h = crop.shape[1], crop.shape[0]
            if w > max_w: max_w = w
            if h > max_h: max_h = h
            r_crops.append((crop, abs_y0, abs_y1))

        row_ground = max(grounds)
        for c_idx, (crop, abs_y0, abs_y1) in enumerate(r_crops):
            sprite_data.append((r_idx + 1, c_idx + 1, Image.fromarray(crop, "RGBA"), abs_y0, abs_y1, row_ground))

    frame_w = max_w + 10
    frame_h = max_h + 10
    bottom_margin = 8

    atlas = Image.new("RGBA", (frame_w * COLS, frame_h * ROWS), (0, 0, 0, 0))
    master_walking = []
    frame_rows = []

    for r, c, sprite, abs_y0, abs_y1, row_ground in sprite_data:
        frame = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
        fx = (frame_w - sprite.width) // 2
        fy = frame_h - bottom_margin - sprite.height - (row_ground - abs_y1)
        frame.alpha_composite(sprite, (fx, fy))
        frame.save(FRAME_DIR / f"r{r}c{c}.png")

        atlas.alpha_composite(frame, ((c - 1) * frame_w, (r - 1) * frame_h))

        master = Image.new("RGBA", (MASTER_W, MASTER_H), (0, 0, 0, 0))
        mx = round(BODY_CX - sprite.width / 2)
        my = FOOT_Y - sprite.height - (row_ground - abs_y1) + 2
        master.alpha_composite(sprite, (mx, my))
        master.save(POSE_DIR / f"walk_r{r}c{c}.png")
        master_walking.append(master)

    atlas.save(ATLAS_PATH)

    # 3 Reaction poses
    react_frames = []
    if REACT_SOURCE.exists():
        im_react = Image.open(REACT_SOURCE).convert("RGBA")
        cuts = [("react_1", 150), ("react_2", 483), ("react_3", 816)]
        scale = 0.68
        for name, cx in cuts:
            x0 = max(0, cx - 160)
            x1 = min(im_react.width, cx + 160)
            crop = im_react.crop((x0, 0, x1, im_react.height))
            crop_cx = cx - x0
            crop_foot_y = 426

            w = round(crop.width * scale)
            h = round(crop.height * scale)
            scaled = crop.resize((w, h), Image.Resampling.LANCZOS)
            scaled_cx = crop_cx * scale
            scaled_foot_y = crop_foot_y * scale

            master = Image.new("RGBA", (MASTER_W, MASTER_H), (0, 0, 0, 0))
            paste_x = round(BODY_CX - scaled_cx)
            paste_y = round(FOOT_Y - scaled_foot_y) + 3
            master.alpha_composite(scaled, (paste_x, paste_y))
            master.save(POSE_DIR / f"{name}.png")
            react_frames.append(master)

    # Previews
    checker_preview(master_walking, COLS, frame_w, frame_h).save(ASSETS / "frames_preview.png")
    checker_preview(master_walking + react_frames, COLS, MASTER_W, MASTER_H).save(ASSETS / "poses_preview.png")

    # Metadata
    frames_meta = {
        "frameWidth": frame_w, "frameHeight": frame_h, "columns": COLS, "rows": ROWS,
        "frameCount": ROWS * COLS,
        "original": "assets/monkey_source.png (unaltered)",
        "atlas": "assets/monkey_atlas.png", "frames": "assets/frames/r{row}c{col}.png",
        "alignment": "centered horizontally, feet on common baseline",
        "alphaCleanup": f"alpha below {NOISE_ALPHA} removed, hair fully preserved from original",
        "sourceRows": {str(k): v for k, v in ROW_NAMES.items()},
        "directionMap": DIRECTION_MAP,
        "note": "All hair and fur details preserved directly from monkey_source.png.",
    }
    META_PATH.write_text(json.dumps(frames_meta, indent=2), encoding="utf-8")

    poses_meta = {
        "frameWidth": MASTER_W, "frameHeight": MASTER_H,
        "bodyRefHeight": BODY_REF_H,
        "bodyCenter": {"x": BODY_CX, "y": BODY_CY},
        "footBaseline": FOOT_Y,
        "walkExtents": {"left": 83, "right": 83, "top": 123, "bottom": 123},
        "walking": "assets/poses/walk_r{row}c{col}.png",
        "reactions": {
            "1": "assets/poses/react_1.png",
            "2": "assets/poses/react_2.png",
            "3": "assets/poses/react_3.png"
        },
        "directions": DIRECTION_MAP,
        "note": "Walking poses come from uploaded sheet with hair intact; reaction poses from reaction source.",
    }
    POSE_META_PATH.write_text(json.dumps(poses_meta, indent=2), encoding="utf-8")

    print(f"Generated {ROWS * COLS} walking frames with hair to {FRAME_DIR}")
    print(f"Generated {ATLAS_PATH} ({atlas.size}) with hair intact!")
    print(f"Generated {len(master_walking)} master walking poses + {len(react_frames)} reaction poses to {POSE_DIR}")


if __name__ == "__main__":
    main()
