"use strict";

/* Airplane Shooter — vanilla HTML5 Canvas game.
 * Player auto-fires upward; drag / arrow keys move left-right; enemies fall
 * from the top and drift toward you. No dependencies, no build step. */

(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const hintEl = document.getElementById("hint");

  const BEST_KEY = "airplaneShooterBest";
  function loadBest() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  }
  function saveBest(v) {
    try {
      localStorage.setItem(BEST_KEY, String(v));
    } catch (e) {
      /* storage may be unavailable (private mode); ignore */
    }
  }

  // ----- Tunables (CSS pixels / seconds), mirrored from the iOS version -----
  const CFG = {
    bulletInterval: 0.22, // seconds between shots
    bulletSpeed: 620, // px/s upward
    enemyInterval: 0.9, // seconds between spawns
    enemySpeed: 190, // px/s downward
    enemyDrift: 0.18, // fraction of dx steered toward the player
    keySpeed: 520, // px/s when using the keyboard
    player: { w: 46, h: 46 },
    enemy: { w: 44, h: 44 },
    bullet: { w: 6, h: 16 },
  };

  // ----- View state ---------------------------------------------------------
  let W = 0,
    H = 0,
    dpr = 1;
  let stars = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars();
    clampPlayer();
  }

  function makeStars() {
    const count = Math.round((W * H) / 9000);
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.5 + Math.random() * 1.3,
        a: 0.2 + Math.random() * 0.6,
        v: 8 + Math.random() * 26, // gentle downward parallax
      });
    }
  }

  // ----- Game state ---------------------------------------------------------
  const player = { x: 0, y: 0, w: CFG.player.w, h: CFG.player.h };
  let bullets = [];
  let enemies = [];
  let particles = [];
  let score = 0;
  let best = loadBest();
  let flash = 0; // seconds of red "you were hit" overlay remaining

  let fireTimer = 0;
  let spawnTimer = 0;

  // Input
  let pointerActive = false;
  let pointerX = 0;
  let leftPressed = false;
  let rightPressed = false;

  function playerBottom() {
    return H - Math.min(110, H * 0.16);
  }

  function clampPlayer() {
    const half = CFG.player.w / 2;
    player.y = playerBottom();
    player.x = Math.max(half, Math.min(W - half, player.x || W / 2));
  }

  function resetGame() {
    bullets = [];
    enemies = [];
    score = 0;
    player.x = W / 2;
    clampPlayer();
    updateScore();
  }

  function updateScore() {
    scoreEl.textContent = String(score);
    if (bestEl) bestEl.textContent = "Best " + best;
  }

  // ----- Spawning / firing --------------------------------------------------
  function fireBullet() {
    bullets.push({
      x: player.x,
      y: player.y - CFG.player.h / 2,
      w: CFG.bullet.w,
      h: CFG.bullet.h,
    });
  }

  function spawnEnemy() {
    const w = CFG.enemy.w;
    const margin = w / 2 + 8;
    const startX = margin + Math.random() * (W - margin * 2);
    const startY = -CFG.enemy.h;
    const endY = H + CFG.enemy.h;
    const duration = (endY - startY) / CFG.enemySpeed;
    const half = w / 2;
    let targetX = startX + (player.x - startX) * CFG.enemyDrift;
    targetX = Math.max(half, Math.min(W - half, targetX));
    enemies.push({
      x: startX,
      y: startY,
      w: w,
      h: CFG.enemy.h,
      vx: (targetX - startX) / duration,
      vy: CFG.enemySpeed,
    });
  }

  function burst(x, y, color) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const sp = 60 + Math.random() * 140;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0,
        max: 0.35 + Math.random() * 0.2,
        r: 2 + Math.random() * 2.5,
        color: color,
      });
    }
  }

  // ----- Collision (AABB) ---------------------------------------------------
  function hit(a, b) {
    return (
      Math.abs(a.x - b.x) * 2 < a.w + b.w &&
      Math.abs(a.y - b.y) * 2 < a.h + b.h
    );
  }

  // ----- Update -------------------------------------------------------------
  function update(dt) {
    if (flash > 0) flash = Math.max(0, flash - dt);

    // Player movement
    const half = CFG.player.w / 2;
    if (pointerActive) {
      player.x = pointerX;
    } else {
      let dir = 0;
      if (leftPressed) dir -= 1;
      if (rightPressed) dir += 1;
      player.x += dir * CFG.keySpeed * dt;
    }
    player.x = Math.max(half, Math.min(W - half, player.x));

    // Auto-fire
    fireTimer += dt;
    while (fireTimer >= CFG.bulletInterval) {
      fireTimer -= CFG.bulletInterval;
      fireBullet();
    }

    // Spawn enemies
    spawnTimer += dt;
    while (spawnTimer >= CFG.enemyInterval) {
      spawnTimer -= CFG.enemyInterval;
      spawnEnemy();
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y -= CFG.bulletSpeed * dt;
      if (b.y + b.h < 0) bullets.splice(i, 1);
    }

    // Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.y - e.h > H) {
        enemies.splice(i, 1);
        continue;
      }
      // Enemy vs player → reset round
      if (hit(e, player)) {
        burst(player.x, player.y, "#ff7b54");
        flash = 0.5;
        resetGame();
        return;
      }
    }

    // Bullet vs enemy
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        if (hit(e, bullets[j])) {
          burst(e.x, e.y, "#ffb74d");
          enemies.splice(i, 1);
          bullets.splice(j, 1);
          score += 1;
          if (score > best) {
            best = score;
            saveBest(best);
          }
          updateScore();
          break;
        }
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.max) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Stars parallax
    for (const s of stars) {
      s.y += s.v * dt;
      if (s.y > H) {
        s.y = 0;
        s.x = Math.random() * W;
      }
    }
  }

  // ----- Render -------------------------------------------------------------
  function drawPlane(x, y, w, h, color, pointingUp) {
    const hw = w / 2,
      hh = h / 2;
    ctx.beginPath();
    if (pointingUp) {
      ctx.moveTo(x, y - hh);
      ctx.lineTo(x - hw, y + hh);
      ctx.lineTo(x + hw, y + hh);
    } else {
      ctx.moveTo(x, y + hh);
      ctx.lineTo(x - hw, y - hh);
      ctx.lineTo(x + hw, y - hh);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function render() {
    ctx.fillStyle = "#121a2e";
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Bullets
    ctx.fillStyle = "#ffe04d";
    for (const b of bullets) {
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    }

    // Enemies
    for (const e of enemies) {
      drawPlane(e.x, e.y, e.w, e.h, "#ff4d4d", false);
    }

    // Player
    drawPlane(player.x, player.y, CFG.player.w, CFG.player.h, "#39d3c3", true);

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // "You were hit" red flash (fades out over ~0.5s)
    if (flash > 0) {
      ctx.globalAlpha = Math.min(0.6, flash * 1.2);
      ctx.fillStyle = "#ff3b3b";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  // ----- Main loop ----------------------------------------------------------
  let last = 0;
  function frame(now) {
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // clamp after tab switches
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ----- Input wiring -------------------------------------------------------
  function dismissHint() {
    if (hintEl) hintEl.classList.add("hidden");
  }

  function onPointerDown(e) {
    pointerActive = true;
    pointerX = e.clientX;
    dismissHint();
    e.preventDefault();
  }
  function onPointerMove(e) {
    if (!pointerActive) return;
    pointerX = e.clientX;
    e.preventDefault();
  }
  function onPointerUp(e) {
    pointerActive = false;
    e.preventDefault();
  }

  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp, { passive: false });
  canvas.addEventListener("pointercancel", onPointerUp, { passive: false });

  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      leftPressed = true;
      dismissHint();
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      rightPressed = true;
      dismissHint();
    }
  });
  window.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      leftPressed = false;
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      rightPressed = false;
    }
  });

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);

  // Auto-dismiss the hint after a few seconds even without input.
  setTimeout(dismissHint, 5000);

  // ----- Boot ---------------------------------------------------------------
  resize();
  resetGame();
  requestAnimationFrame(frame);
})();
