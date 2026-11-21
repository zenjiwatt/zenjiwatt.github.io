/*
 * Monkey companion
 * ----------------
 * Every pixel comes from the user's uploaded art:
 *   - 4 x 8 walking sheet  -> 32 walking poses with full hair
 *   - 3 reaction poses     -> 1 (in) -> 2 (in) -> 3 (peak) -> 2 (out) -> 1 (out)
 *
 * Behaviour:
 *   - Starts moving from the bottom-left corner of the screen.
 *   - Wanders to random points with natural pauses, speed variation, and
 *     the occasional idle glance.
 *   - 150px ceiling line: NEVER walks into the top 150px header area.
 *   - Smooth scroll frame recovery: when scrolling the page, the monkey senses
 *     the scroll and smoothly walks down using the physics engine so he gracefully
 *     lands into the lower visible frame without any jumping or jitter.
 *   - Switches to following when cursor enters vision radius (0.2 slower for smooth control);
 *     faces camera ("looks at you") when cursor is right on top.
 *   - Clicking on the monkey plays the excited reaction:
 *     arms up (1 -> 2 -> 3) and returns (3 -> 2 -> 1).
 */
(function () {
  "use strict";

  var FRAME_W = 260;
  var FRAME_H = 270;
  var BODY_CX = 130;
  var BODY_CY = 140.5;
  var BODY_REF_H = 243;

  var ROWS = 8;
  var COLS = 4;

  var WALK_EXTENTS = { left: 83, right: 83, top: 123, bottom: 123 };

  // Compass sectors, 0 = right, increasing clockwise (canvas Y points down).
  var DIRS = [
    { row: 3, flip: false, name: "E" },   // 0
    { row: 2, flip: false, name: "SE" },   // 1
    { row: 1, flip: false, name: "S" },    // 2
    { row: 2, flip: true, name: "SW" },   // 3
    { row: 3, flip: true, name: "W" },    // 4
    { row: 5, flip: true, name: "NW" },   // 5
    { row: 4, flip: false, name: "N" },    // 6
    { row: 5, flip: false, name: "NE" }    // 7
  ];

  var cfg = {
    bodyHeight: 82,        // 0.2 smaller (0.8× of 102)
    topCeiling: 150,       // invisible line: monkey never crosses above top 150px
    visionRadius: 431,     // vision distance (+50%)
    maxSpeed: 238,         // snappy original speed
    followSpeedScale: 0.8, // 0.2 slower when following mouse
    accel: 1500,
    decel: 1900,
    stopRadius: 54,
    slowRadius: 130,
    stride: 118,
    blendTime: 0.16,
    minSpeed: 18,
    wanderArrive: 26,
    wanderPauseMin: 0.6,
    wanderPauseMax: 2.3,
    followGrace: 0.65,
    dirHysteresis: 0.12,
    wanderCurve: 0.35,
    wanderMinDist: 120,
    wanderMaxDist: 380
  };

  // Reaction animation: 1 -> 2 -> 3 -> 2 -> 1
  var REACT_STEPS = [
    { frame: 0, duration: 0.10 }, // 1 (in)
    { frame: 1, duration: 0.10 }, // 2 (in)
    { frame: 2, duration: 0.20 }, // 3 (peak hold)
    { frame: 1, duration: 0.11 }, // 2 (out)
    { frame: 0, duration: 0.10 }  // 1 (out)
  ];
  var REACT_TOTAL = 0.61;

  var canvas = document.getElementById("stage");
  var ctx = canvas.getContext("2d", { alpha: true });

  var viewW = 0;
  var viewH = 0;
  var dpr = 1;
  var scale = 1;
  var ready = false;

  var frames = [];
  var reactFrames = [];

  var pointer = { x: 0, y: 0, seen: false };

  var pos = { x: 0, y: 0 };
  var vel = { x: 0, y: 0 };

  var mode = "wander";       // wander | follow
  var followGrace = 0;
  var wander = {
    state: "idle",
    point: null,
    timer: 0.9,
    lookTimer: 1.2,
    legTime: 0,
    speedScale: 0.68,
    lastAngle: null
  };

  var facing = 0;            // start facing right (East)
  var blendFrom = 0;
  var blendT = 1;
  var walkPhase = 0;
  var walking = false;
  var bobTime = 0;
  var paused = false;
  var lastTime = 0;

  var reacting = false;
  var reactTime = 0;

  // Smooth scroll frame recovery tracking
  var lastScrollY = window.scrollY || window.pageYOffset || 0;
  var scrollRecoverTarget = null;
  var scrollRecoverTimer = 0;

  /* ------------------------------------------------------------------ */
  /* Assets                                                             */
  /* ------------------------------------------------------------------ */

  function loadFrames() {
    var jobs = [];
    for (var r = 1; r <= ROWS; r++) {
      frames[r] = [];
      for (var c = 1; c <= COLS; c++) {
        jobs.push(loadImage("assets/poses/walk_r" + r + "c" + c + ".png", function (row, col, img) {
          frames[row][col - 1] = img;
        }, r, c));
      }
    }
    for (var i = 1; i <= 3; i++) {
      jobs.push(loadImage("assets/poses/react_" + i + ".png", function (idx, _unused, img) {
        reactFrames[idx - 1] = img;
      }, i));
    }
    return Promise.all(jobs);
  }

  function loadImage(src, done, a, b) {
    var img = new Image();
    img.decoding = "async";
    var p = new Promise(function (resolve) {
      img.onload = function () { done(a, b, img); resolve(); };
      img.onerror = function () {
        console.warn("Missing pose asset: " + src);
        resolve();
      };
    });
    img.src = src;
    return p;
  }

  /* ------------------------------------------------------------------ */
  /* Sizing / viewport & 150px boundary                                 */
  /* ------------------------------------------------------------------ */

  function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 3);

    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    canvas.style.width = viewW + "px";
    canvas.style.height = viewH + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    scale = cfg.bodyHeight / BODY_REF_H;
    clampPosition();
  }

  function getMinY() {
    var e = WALK_EXTENTS;
    return cfg.topCeiling + e.top * scale;
  }

  function getMaxY() {
    var e = WALK_EXTENTS;
    return viewH - e.bottom * scale;
  }

  function clampPosition() {
    var e = WALK_EXTENTS;
    var left = e.left * scale;
    var right = e.right * scale;
    var top = getMinY();
    var bottom = e.bottom * scale;

    if (viewW <= left + right) pos.x = viewW / 2;
    else pos.x = Math.min(Math.max(pos.x, left), viewW - right);

    var maxY = viewH - bottom;
    if (maxY <= top) pos.y = top;
    else pos.y = Math.min(Math.max(pos.y, top), maxY);
  }

  /* ------------------------------------------------------------------ */
  /* Input & Click detection                                            */
  /* ------------------------------------------------------------------ */

  function setPointer(x, y) {
    pointer.x = Math.min(Math.max(x, 0), viewW);
    pointer.y = Math.min(Math.max(y, 0), viewH);
    pointer.seen = true;
  }

  function isPointOnMonkey(x, y) {
    var s = scale;
    var rx = 85 * s;
    var ry = 120 * s;
    var dx = x - pos.x;
    var dy = y - pos.y;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0;
  }

  function triggerReaction() {
    reacting = true;
    reactTime = 0;
    vel.x = 0;
    vel.y = 0;
    walking = false;
    walkPhase = 0;
    facing = 2; // Face front (viewer)
    blendT = 1;
  }

  function onPointerMove(e) {
    setPointer(e.clientX, e.clientY);
    if (ready) {
      var over = isPointOnMonkey(e.clientX, e.clientY);
      document.body.style.cursor = over ? "pointer" : "default";
    }
  }

  function onPointerDown(e) {
    setPointer(e.clientX, e.clientY);
    if (isPointOnMonkey(e.clientX, e.clientY)) {
      triggerReaction();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Smooth scroll handling: smoothly walk down into frame               */
  /* ------------------------------------------------------------------ */

  function onScroll() {
    var curScrollY = window.scrollY || window.pageYOffset || 0;
    var dy = curScrollY - lastScrollY;
    lastScrollY = curScrollY;

    if (Math.abs(dy) < 0.5) return;

    var e = WALK_EXTENTS;
    var targetBottom = viewH - e.bottom * scale - 6;

    // When scrolling down, or if the monkey is high up above the bottom zone:
    // smoothly guide him down into the lower visible frame using the physics engine
    if (dy > 0 || pos.y < targetBottom - 70) {
      scrollRecoverTarget = {
        x: Math.min(Math.max(pos.x, e.left * scale + 24), viewW - e.right * scale - 24),
        y: targetBottom
      };
      scrollRecoverTimer = 3.5;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Facing                                                             */
  /* ------------------------------------------------------------------ */

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function aimAt(angle) {
    if (reacting) return;

    var step = Math.PI / 4;
    var candidate = ((Math.round(angle / step) % 8) + 8) % 8;
    if (candidate === facing) return;

    var currentCenter = facing * step;
    var diff = Math.abs(wrapAngle(angle - currentCenter));
    if (diff < step / 2 + cfg.dirHysteresis) return;

    blendFrom = facing;
    blendT = 0;
    facing = candidate;
  }

  /* ------------------------------------------------------------------ */
  /* Modes / wandering                                                  */
  /* ------------------------------------------------------------------ */

  function setMode(next) {
    if (mode === next) return;
    mode = next;

    if (next === "wander") {
      wander.state = "idle";
      wander.point = null;
      wander.timer = 0.45 + Math.random() * 0.8;
      wander.lookTimer = 0.6 + Math.random() * 1.2;
    } else if (next === "follow") {
      followGrace = cfg.followGrace;
    }
  }

  function pickWanderPoint() {
    var e = WALK_EXTENTS;
    var minX = e.left * scale;
    var maxX = viewW - e.right * scale;
    var minY = getMinY(); // stays strictly below the 150px ceiling line
    var maxY = getMaxY();

    if (maxX < minX) { minX = maxX = viewW / 2; }
    if (maxY < minY) { minY = maxY = viewH / 2; }

    var legDist = cfg.wanderMinDist + Math.random() * (cfg.wanderMaxDist - cfg.wanderMinDist);

    var baseAngle;
    if (wander.lastAngle !== null && Math.random() < cfg.wanderCurve) {
      baseAngle = wander.lastAngle + (Math.random() - 0.5) * Math.PI / 2;
    } else {
      baseAngle = Math.random() * Math.PI * 2;
    }

    for (var i = 0; i < 40; i++) {
      var angle = baseAngle + (Math.random() - 0.5) * (i < 15 ? Math.PI / 3 : Math.PI * 2);
      var dist = legDist * (0.7 + Math.random() * 0.6);
      var x = pos.x + Math.cos(angle) * dist;
      var y = pos.y + Math.sin(angle) * dist;

      x = Math.min(Math.max(x, minX), maxX);
      y = Math.min(Math.max(y, minY), maxY);

      if (Math.hypot(x - pos.x, y - pos.y) < 80) continue;

      wander.point = { x: x, y: y };
      wander.state = "walk";
      wander.legTime = 0;
      wander.speedScale = 0.45 + Math.random() * 0.35;
      wander.lastAngle = Math.atan2(y - pos.y, x - pos.x);
      return;
    }

    wander.point = {
      x: Math.min(Math.max(pos.x + (Math.random() * 200 - 100), minX), maxX),
      y: Math.min(Math.max(pos.y + (Math.random() * 200 - 100), minY), maxY)
    };
    wander.state = "walk";
    wander.legTime = 0;
    wander.speedScale = 0.55;
    wander.lastAngle = Math.atan2(wander.point.y - pos.y, wander.point.x - pos.x);
  }

  function finishWanderLeg() {
    wander.state = "idle";
    wander.point = null;
    wander.timer = cfg.wanderPauseMin + Math.random() * (cfg.wanderPauseMax - cfg.wanderPauseMin);
    wander.lookTimer = 0.5 + Math.random() * 1.1;
    wander.legTime = 0;
  }

  function getReactFrameIndex() {
    var t = reactTime;
    for (var i = 0; i < REACT_STEPS.length; i++) {
      if (t < REACT_STEPS[i].duration) {
        return REACT_STEPS[i].frame;
      }
      t -= REACT_STEPS[i].duration;
    }
    return REACT_STEPS[REACT_STEPS.length - 1].frame;
  }

  /* ------------------------------------------------------------------ */
  /* Simulation                                                         */
  /* ------------------------------------------------------------------ */

  function update(dt) {
    // If playing reaction animation, freeze in place and tick timer
    if (reacting) {
      reactTime += dt;
      if (reactTime >= REACT_TOTAL) {
        reacting = false;
        reactTime = 0;
      }
      vel.x = 0;
      vel.y = 0;
      walking = false;
      walkPhase = 0;
      bobTime += dt;
      return;
    }

    var pdx = pointer.x - pos.x;
    var pdy = pointer.y - pos.y;
    var pdist = Math.hypot(pdx, pdy);
    var seesCursor = pointer.seen && pdist <= cfg.visionRadius;

    // --- Mode selection ---
    if (seesCursor) {
      if (mode !== "follow") setMode("follow");
      followGrace = cfg.followGrace;
    } else if (mode === "follow") {
      followGrace -= dt;
      if (followGrace <= 0) setMode("wander");
    } else if (mode !== "wander") {
      setMode("wander");
    }

    var moveTarget = null;
    var moveSpeed = 0;

    // 1. Scroll recovery: smoothly walk down into frame
    if (scrollRecoverTarget) {
      scrollRecoverTimer -= dt;
      var sdx = scrollRecoverTarget.x - pos.x;
      var sdy = scrollRecoverTarget.y - pos.y;
      var sdist = Math.hypot(sdx, sdy);

      // If cursor is close and interacting, let follow take priority
      if (seesCursor && pdist <= cfg.slowRadius) {
        scrollRecoverTarget = null;
        scrollRecoverTimer = 0;
      } else if (sdist <= cfg.wanderArrive || scrollRecoverTimer <= 0) {
        scrollRecoverTarget = null;
        scrollRecoverTimer = 0;
        finishWanderLeg();
      } else {
        if (sdist > 6) aimAt(Math.atan2(sdy, sdx));
        moveTarget = scrollRecoverTarget;
        moveSpeed = cfg.maxSpeed;
      }
    }

    // 2. Follow cursor mode
    if (!moveTarget && mode === "follow") {
      var followTarget = {
        x: pointer.x,
        y: Math.max(pointer.y, getMinY())
      };
      if (pointer.seen) {
        if (pdist < cfg.bodyHeight * 0.25) {
          // Cursor is right ON the monkey — face the camera ("look at me")
          aimAt(Math.PI / 2);
        } else if (pdist > 3) {
          aimAt(Math.atan2(pdy, pdx));
        }
      }
      if (pdist > cfg.stopRadius) {
        moveTarget = followTarget;
        moveSpeed = cfg.maxSpeed * cfg.followSpeedScale;
      }
    }

    // 3. Wander mode
    if (!moveTarget && mode === "wander") {
      if (wander.state === "idle") {
        wander.timer -= dt;
        wander.lookTimer -= dt;
        if (wander.lookTimer <= 0) {
          aimAt(-Math.PI + Math.random() * Math.PI * 2);
          wander.lookTimer = 1.0 + Math.random() * 1.6;
        }
        if (wander.timer <= 0) pickWanderPoint();
      } else {
        wander.legTime += dt;
        var wdx = wander.point.x - pos.x;
        var wdy = wander.point.y - pos.y;
        var wdist = Math.hypot(wdx, wdy);

        if (wdist <= cfg.wanderArrive || wander.legTime > 9) {
          finishWanderLeg();
        } else {
          if (wdist > 6) aimAt(Math.atan2(wdy, wdx));
          moveTarget = wander.point;
          moveSpeed = cfg.maxSpeed * wander.speedScale;
        }
      }
    }

    // --- Physics ---
    var desiredX = 0;
    var desiredY = 0;
    if (moveTarget) {
      var dx = moveTarget.x - pos.x;
      var dy = moveTarget.y - pos.y;
      var dist = Math.hypot(dx, dy);
      var stop = mode === "wander" ? cfg.wanderArrive : cfg.stopRadius;

      if (dist > stop && dist > 0) {
        var t = Math.min(1, (dist - stop) / cfg.slowRadius);
        var speed = moveSpeed * (0.26 + 0.74 * t * t);
        desiredX = (dx / dist) * speed;
        desiredY = (dy / dist) * speed;
      }
    }

    var dvx = desiredX - vel.x;
    var dvy = desiredY - vel.y;
    var dv = Math.hypot(dvx, dvy);
    var rate = (moveTarget ? cfg.accel : cfg.decel) * dt;

    if (dv > rate && dv > 0) {
      vel.x += (dvx / dv) * rate;
      vel.y += (dvy / dv) * rate;
    } else {
      vel.x = desiredX;
      vel.y = desiredY;
    }

    pos.x += vel.x * dt;
    pos.y += vel.y * dt;

    var px = pos.x;
    var py = pos.y;
    clampPosition();
    if (pos.x !== px) vel.x = 0;
    if (pos.y !== py) vel.y = 0;

    var actualSpeed = Math.hypot(vel.x, vel.y);
    walking = actualSpeed > cfg.minSpeed;

    if (walking) {
      walkPhase += (actualSpeed * dt) / cfg.stride;
    } else {
      walkPhase *= 0.88;
      if (walkPhase < 0.01) walkPhase = 0;
    }

    bobTime += dt;

    if (blendT < 1) blendT = Math.min(1, blendT + dt / cfg.blendTime);
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                          */
  /* ------------------------------------------------------------------ */

  function easeInOut(t) {
    return t * t * (3 - 2 * t);
  }

  function drawFrame(img, flip, alpha, offsetY) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    if (alpha <= 0) return;

    var s = scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(pos.x, pos.y + offsetY);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -BODY_CX * s, -BODY_CY * s, FRAME_W * s, FRAME_H * s);
    ctx.restore();
  }

  function currentFrame() {
    if (!walking) return 0;
    return Math.floor(walkPhase * 4) % 4;
  }

  function render() {
    ctx.clearRect(0, 0, viewW, viewH);
    if (!ready) return;

    // Reaction animation (1 -> 2 -> 3 -> 2 -> 1)
    if (reacting && reactFrames.length >= 3) {
      var fIdx = getReactFrameIndex();
      var reactImg = reactFrames[fIdx];
      drawFrame(reactImg, false, 1, 0);
      return;
    }

    var frame = currentFrame();
    var bob = walking ? 0 : Math.sin(bobTime * 2.1) * 1.6;

    if (blendT < 1) {
      var e = easeInOut(blendT);
      var from = DIRS[blendFrom];
      var to = DIRS[facing];
      drawFrame(frames[from.row][frame], from.flip, 1 - e, bob);
      drawFrame(frames[to.row][frame], to.flip, e, bob);
    } else {
      var dir = DIRS[facing];
      drawFrame(frames[dir.row][frame], dir.flip, 1, bob);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Loop                                                               */
  /* ------------------------------------------------------------------ */

  function loop(now) {
    if (!lastTime) lastTime = now;
    var dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (!paused && ready) update(dt);
    render();

    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                         */
  /* ------------------------------------------------------------------ */

  window.MonkeyCompanion = {
    setPosition: function (x, y) {
      pos.x = x;
      pos.y = y;
      clampPosition();
    },
    getPosition: function () {
      return { x: pos.x, y: pos.y };
    },
    setHeight: function (h) {
      cfg.bodyHeight = h;
      resize();
    },
    react: triggerReaction,
    isReacting: function () {
      return reacting;
    },
    pause: function () { paused = true; },
    resume: function () {
      paused = false;
      lastTime = 0;
    },
    getState: function () {
      return {
        x: pos.x,
        y: pos.y,
        mode: mode,
        facing: DIRS[facing].name,
        frame: currentFrame(),
        walking: walking,
        reacting: reacting,
        reactFrame: reacting ? getReactFrameIndex() + 1 : 0,
        speed: Math.hypot(vel.x, vel.y),
        visionRadius: cfg.visionRadius,
        wanderState: wander.state,
        ready: ready,
        bodyHeight: cfg.bodyHeight
      };
    }
  };

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */

  function boot() {
    resize();

    // Start in the bottom-left corner (feet grounded at bottom-left edge)
    var e = WALK_EXTENTS;
    pos.x = e.left * scale + 24;
    pos.y = viewH - e.bottom * scale - 4;
    facing = 0; // Face right (East) into the page
    clampPosition();

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("click", onPointerDown, { passive: true });

    loadFrames().then(function () {
      ready = true;
      requestAnimationFrame(loop);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
