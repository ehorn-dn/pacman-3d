// ============================================================
//  CONSTANTS
// ============================================================

const TILE = 20;
const COLS = 28;
const ROWS = 31;
const CANVAS_W = COLS * TILE;
const CANVAS_H = ROWS * TILE;

const DIR = {
    UP:    { x:  0, y: -1 },
    DOWN:  { x:  0, y:  1 },
    LEFT:  { x: -1, y:  0 },
    RIGHT: { x:  1, y:  0 },
    NONE:  { x:  0, y:  0 }
};

const CELL = {
    EMPTY:   0,
    WALL:    1,
    DOT:     2,
    POWER:   3,
    GHOST_HOUSE: 4,
    GATE:    5,
    TUNNEL:  6
};

const STATE = {
    START:    'start',
    READY:    'ready',
    PLAYING:  'playing',
    DEATH:    'death',
    GAMEOVER: 'gameover',
    LEVEL_COMPLETE: 'level_complete'
};

const GHOST_MODE = {
    CHASE:      'chase',
    SCATTER:    'scatter',
    FRIGHTENED: 'frightened',
    EATEN:      'eaten'
};

// ============================================================
//  MAZE DEFINITION  (28 x 31)
// ============================================================

const MAZE_TEMPLATE = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,5,5,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,4,4,4,4,4,4,1,0,1,1,2,1,1,1,1,1,1],
    [6,0,0,0,0,0,2,0,0,0,1,4,4,4,4,4,4,1,0,0,0,2,0,0,0,0,0,6],
    [1,1,1,1,1,1,2,1,1,0,1,4,4,4,4,4,4,1,0,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// ============================================================
//  UTILITY
// ============================================================

function distance(ax, ay, bx, by) {
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function oppositeDir(d) {
    if (d === DIR.UP) return DIR.DOWN;
    if (d === DIR.DOWN) return DIR.UP;
    if (d === DIR.LEFT) return DIR.RIGHT;
    if (d === DIR.RIGHT) return DIR.LEFT;
    return DIR.NONE;
}

function turnLeft(d) {
    if (d === DIR.UP) return DIR.LEFT;
    if (d === DIR.DOWN) return DIR.RIGHT;
    if (d === DIR.LEFT) return DIR.DOWN;
    if (d === DIR.RIGHT) return DIR.UP;
    return DIR.NONE;
}

function turnRight(d) {
    if (d === DIR.UP) return DIR.RIGHT;
    if (d === DIR.DOWN) return DIR.LEFT;
    if (d === DIR.LEFT) return DIR.UP;
    if (d === DIR.RIGHT) return DIR.DOWN;
    return DIR.NONE;
}

function copyMaze() {
    return MAZE_TEMPLATE.map(row => [...row]);
}

function toWorldX(pixelX) { return (pixelX / TILE) - COLS / 2; }
function toWorldZ(pixelY) { return (pixelY / TILE) - ROWS / 2; }

function dirToAngle(dir) {
    if (dir === DIR.RIGHT) return 0;
    if (dir === DIR.DOWN)  return -Math.PI / 2;
    if (dir === DIR.LEFT)  return Math.PI;
    if (dir === DIR.UP)    return Math.PI / 2;
    return 0;
}

// ============================================================
//  PACMAN
// ============================================================

class Pacman {
    constructor() { this.reset(); }

    reset() {
        this.tileX = 14;
        this.tileY = 23;
        this.pixelX = this.tileX * TILE + TILE / 2;
        this.pixelY = this.tileY * TILE + TILE / 2;
        this.dir = DIR.LEFT;
        this.nextDir = DIR.LEFT;
        this.speed = 2;
        this.mouthAngle = 0;
        this.mouthOpening = true;
        this.deathFrame = 0;
        this.dying = false;
    }

    update(maze) {
        if (this.dying) {
            this.deathFrame++;
            return;
        }

        this.animateMouth();

        const cx = this.tileX * TILE + TILE / 2;
        const cy = this.tileY * TILE + TILE / 2;
        const atCenter = Math.abs(this.pixelX - cx) < this.speed &&
                         Math.abs(this.pixelY - cy) < this.speed;

        if (atCenter) {
            this.pixelX = cx;
            this.pixelY = cy;

            if (this.canMove(this.nextDir, maze)) {
                this.dir = this.nextDir;
            }

            if (!this.canMove(this.dir, maze)) return;

            this.tileX += this.dir.x;
            this.tileY += this.dir.y;

            if (this.tileX < 0) { this.tileX = COLS - 1; this.pixelX = this.tileX * TILE + TILE / 2; }
            if (this.tileX >= COLS) { this.tileX = 0; this.pixelX = this.tileX * TILE + TILE / 2; }
        }

        const tx = this.tileX * TILE + TILE / 2;
        const ty = this.tileY * TILE + TILE / 2;
        const dx = tx - this.pixelX;
        const dy = ty - this.pixelY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > this.speed) {
            this.pixelX += (dx / d) * this.speed;
            this.pixelY += (dy / d) * this.speed;
        } else {
            this.pixelX = tx;
            this.pixelY = ty;
        }
    }

    canMove(dir, maze) {
        const nx = this.tileX + dir.x;
        const ny = this.tileY + dir.y;
        if (nx < 0 || nx >= COLS) return true;
        if (ny < 0 || ny >= ROWS) return false;
        const cell = maze[ny][nx];
        return cell !== CELL.WALL && cell !== CELL.GHOST_HOUSE && cell !== CELL.GATE;
    }

    animateMouth() {
        const speed = 0.12;
        if (this.mouthOpening) {
            this.mouthAngle += speed;
            if (this.mouthAngle >= 0.9) this.mouthOpening = false;
        } else {
            this.mouthAngle -= speed;
            if (this.mouthAngle <= 0.05) this.mouthOpening = true;
        }
    }
}

// ============================================================
//  GHOST
// ============================================================

const GHOST_TYPES = {
    blinky: { color: '#ff0000', scatter: { x: 25, y: -3 }, homeX: 14, homeY: 11, startX: 14, startY: 11 },
    pinky:  { color: '#ffb8ff', scatter: { x:  2, y: -3 }, homeX: 14, homeY: 14, startX: 14, startY: 14 },
    inky:   { color: '#00ffff', scatter: { x: 27, y: 34 }, homeX: 12, homeY: 14, startX: 12, startY: 14 },
    clyde:  { color: '#ffb852', scatter: { x:  0, y: 34 }, homeX: 16, homeY: 14, startX: 16, startY: 14 }
};

class Ghost {
    constructor(type) {
        this.type = type;
        this.config = GHOST_TYPES[type];
        this.reset();
    }

    reset() {
        this.tileX = this.config.startX;
        this.tileY = this.config.startY;
        this.pixelX = this.tileX * TILE + TILE / 2;
        this.pixelY = this.tileY * TILE + TILE / 2;
        this.dir = DIR.UP;
        this.mode = GHOST_MODE.SCATTER;
        this.baseSpeed = 1.6;
        this.speed = this.baseSpeed;
        this.frightTimer = 0;
        this.inHouse = this.type !== 'blinky';
        this.houseTimer = 0;
        this.releaseDelay = this.type === 'pinky' ? 120 : this.type === 'inky' ? 300 : this.type === 'clyde' ? 480 : 0;
    }

    getTargetTile(pacman, blinky) {
        if (this.mode === GHOST_MODE.SCATTER) {
            return this.config.scatter;
        }
        if (this.mode === GHOST_MODE.FRIGHTENED) {
            return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        }

        switch (this.type) {
            case 'blinky':
                return { x: pacman.tileX, y: pacman.tileY };
            case 'pinky':
                return { x: pacman.tileX + pacman.dir.x * 4, y: pacman.tileY + pacman.dir.y * 4 };
            case 'inky': {
                const ahead2X = pacman.tileX + pacman.dir.x * 2;
                const ahead2Y = pacman.tileY + pacman.dir.y * 2;
                return { x: ahead2X + (ahead2X - blinky.tileX), y: ahead2Y + (ahead2Y - blinky.tileY) };
            }
            case 'clyde': {
                const dist = distance(this.tileX, this.tileY, pacman.tileX, pacman.tileY);
                if (dist > 8) return { x: pacman.tileX, y: pacman.tileY };
                return this.config.scatter;
            }
        }
    }

    update(maze, pacman, blinky) {
        if (this.inHouse) {
            this.houseTimer++;
            if (this.houseTimer >= this.releaseDelay) {
                this.inHouse = false;
                this.tileX = 14;
                this.tileY = 11;
                this.pixelX = this.tileX * TILE + TILE / 2;
                this.pixelY = this.tileY * TILE + TILE / 2;
                this.dir = DIR.LEFT;
            } else {
                this.bobInHouse();
                return;
            }
        }

        if (this.mode === GHOST_MODE.EATEN) {
            this.speed = 4;
            const homeX = 14;
            const homeY = 11;
            if (this.tileX === homeX && this.tileY === homeY &&
                Math.abs(this.pixelX - (homeX * TILE + TILE / 2)) < 2 &&
                Math.abs(this.pixelY - (homeY * TILE + TILE / 2)) < 2) {
                this.mode = GHOST_MODE.SCATTER;
                this.speed = this.baseSpeed;
            }
        }

        if (this.mode === GHOST_MODE.FRIGHTENED) {
            this.speed = 1.0;
            this.frightTimer--;
            if (this.frightTimer <= 0) {
                this.mode = GHOST_MODE.SCATTER;
                this.speed = this.baseSpeed;
            }
        }

        const cx = this.tileX * TILE + TILE / 2;
        const cy = this.tileY * TILE + TILE / 2;
        const atCenter = Math.abs(this.pixelX - cx) < this.speed &&
                         Math.abs(this.pixelY - cy) < this.speed;

        if (atCenter) {
            this.pixelX = cx;
            this.pixelY = cy;

            const target = this.mode === GHOST_MODE.EATEN
                ? { x: 14, y: 11 }
                : this.getTargetTile(pacman, blinky);

            this.dir = this.chooseDirection(maze, target);

            this.tileX += this.dir.x;
            this.tileY += this.dir.y;

            if (this.tileX < 0) { this.tileX = COLS - 1; this.pixelX = this.tileX * TILE + TILE / 2; }
            if (this.tileX >= COLS) { this.tileX = 0; this.pixelX = this.tileX * TILE + TILE / 2; }
        }

        const tx = this.tileX * TILE + TILE / 2;
        const ty = this.tileY * TILE + TILE / 2;
        const dx = tx - this.pixelX;
        const dy = ty - this.pixelY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > this.speed) {
            this.pixelX += (dx / d) * this.speed;
            this.pixelY += (dy / d) * this.speed;
        } else {
            this.pixelX = tx;
            this.pixelY = ty;
        }
    }

    chooseDirection(maze, target) {
        const dirs = [DIR.UP, DIR.LEFT, DIR.DOWN, DIR.RIGHT];
        const opp = oppositeDir(this.dir);
        let bestDir = this.dir;
        let bestDist = Infinity;

        for (const d of dirs) {
            if (d === opp) continue;
            let nx = this.tileX + d.x;
            let ny = this.tileY + d.y;

            if (nx < 0) nx = COLS - 1;
            else if (nx >= COLS) nx = 0;
            if (ny < 0 || ny >= ROWS) continue;

            const cell = maze[ny][nx];

            const passable = this.mode === GHOST_MODE.EATEN
                ? cell !== CELL.WALL
                : cell !== CELL.WALL && cell !== CELL.GHOST_HOUSE && cell !== CELL.GATE;
            if (!passable) continue;

            const dist = distance(nx, ny, target.x, target.y);
            if (dist < bestDist) {
                bestDist = dist;
                bestDir = d;
            }
        }
        return bestDir;
    }

    bobInHouse() {
        const baseY = this.tileY * TILE + TILE / 2;
        this.pixelY = baseY + Math.sin(this.houseTimer * 0.08) * 4;
    }

    enterFrightened() {
        if (this.mode === GHOST_MODE.EATEN) return;
        this.mode = GHOST_MODE.FRIGHTENED;
        this.frightTimer = 360;
        this.dir = oppositeDir(this.dir);
    }
}

// ============================================================
//  3D MESH BUILDERS
// ============================================================

function createPacmanMesh() {
    const group = new THREE.Group();

    const topGeo = new THREE.SphereGeometry(0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const bottomGeo = new THREE.SphereGeometry(0.45, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0x886600,
        emissiveIntensity: 0.3,
        roughness: 0.3,
        metalness: 0.1
    });

    const topHalf = new THREE.Mesh(topGeo, mat);
    const bottomHalf = new THREE.Mesh(bottomGeo, mat);

    group.add(topHalf);
    group.add(bottomHalf);
    group.userData.topHalf = topHalf;
    group.userData.bottomHalf = bottomHalf;

    const light = new THREE.PointLight(0xffff00, 0.4, 4);
    light.position.set(0, 0.3, 0);
    group.add(light);

    return group;
}

function createGhostMesh(colorHex) {
    const group = new THREE.Group();

    const bodyGroup = new THREE.Group();

    const headGeo = new THREE.SphereGeometry(0.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const headMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.15,
        roughness: 0.4,
        metalness: 0.0
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.05;
    bodyGroup.add(head);

    const skirtGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.45, 20);
    const skirtMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.15,
        roughness: 0.4,
        metalness: 0.0
    });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = -0.175;
    bodyGroup.add(skirt);

    const tentacleGeo = new THREE.SphereGeometry(0.13, 8, 6);
    const tentacleMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.15,
        roughness: 0.4
    });
    const tentaclePositions = [-0.26, -0.09, 0.09, 0.26];
    for (const xp of tentaclePositions) {
        const t = new THREE.Mesh(tentacleGeo, tentacleMat);
        t.position.set(xp, -0.4, 0);
        t.scale.y = 0.7;
        bodyGroup.add(t);
        const t2 = new THREE.Mesh(tentacleGeo, tentacleMat);
        t2.position.set(xp, -0.4, 0.15);
        t2.scale.y = 0.7;
        bodyGroup.add(t2);
        const t3 = new THREE.Mesh(tentacleGeo, tentacleMat);
        t3.position.set(xp, -0.4, -0.15);
        t3.scale.y = 0.7;
        bodyGroup.add(t3);
    }

    group.add(bodyGroup);

    const eyeGroup = new THREE.Group();
    const eyeWhiteGeo = new THREE.SphereGeometry(0.1, 10, 8);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const pupilGeo = new THREE.SphereGeometry(0.055, 8, 6);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0000ff, roughness: 0.2 });

    for (const side of [-1, 1]) {
        const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        eyeWhite.position.set(side * 0.15, 0.12, 0.32);
        eyeWhite.scale.set(1, 1.2, 0.8);
        eyeGroup.add(eyeWhite);

        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.set(side * 0.15, 0.1, 0.38);
        eyeGroup.add(pupil);
    }
    group.add(eyeGroup);

    const frightenedFaceGroup = new THREE.Group();
    const fEyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const fEyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    for (const side of [-1, 1]) {
        const fEye = new THREE.Mesh(fEyeGeo, fEyeMat);
        fEye.position.set(side * 0.12, 0.12, 0.38);
        frightenedFaceGroup.add(fEye);
    }
    const mouthGeo = new THREE.BoxGeometry(0.3, 0.03, 0.03);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.05, 0.4);
    frightenedFaceGroup.add(mouth);
    frightenedFaceGroup.visible = false;
    group.add(frightenedFaceGroup);

    group.userData.bodyGroup = bodyGroup;
    group.userData.eyeGroup = eyeGroup;
    group.userData.frightenedFaceGroup = frightenedFaceGroup;
    group.userData.headMat = headMat;
    group.userData.skirtMat = skirtMat;
    group.userData.tentacleMat = tentacleMat;
    group.userData.originalColor = colorHex;

    return group;
}

// ============================================================
//  AUDIO MANAGER
// ============================================================

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.muted = localStorage.getItem('pacman-mute') === '1';
        this.sirenNodes = null;
        this.frightenedNodes = null;
        this.currentMusic = null;
        this.wakaHigh = false;
        this._resumed = false;
    }

    _ensureContext() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 1;
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.25;
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.35;
        this.sfxGain.connect(this.masterGain);
    }

    resume() {
        this._ensureContext();
        if (!this._resumed && this.ctx.state === 'suspended') {
            this.ctx.resume();
            this._resumed = true;
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('pacman-mute', this.muted ? '1' : '0');
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
        }
        return this.muted;
    }

    _osc(type, freq, gainVal, dest) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = gainVal;
        osc.connect(gain);
        gain.connect(dest || this.sfxGain);
        return { osc, gain };
    }

    // ---- Background music: cheerful melody loop ----

    startSiren(level) {
        this._ensureContext();
        this.stopMusic();

        const melodyBus = this.ctx.createGain();
        melodyBus.gain.value = 1;
        melodyBus.connect(this.musicGain);

        const melody = [
            523, 587, 659, 784,  659, 784, 880, 784,
            659, 587, 523, 587,  659, 523, 440, 523,
            587, 659, 784, 880,  784, 659, 587, 659,
            784, 880, 988, 880,  784, 659, 587, 523
        ];
        const noteDur = Math.max(0.1, 0.16 - level * 0.005);
        const loopDur = melody.length * noteDur;

        this._melodyCancel = false;

        const scheduleLoop = (startTime) => {
            if (this._melodyCancel) return;
            melody.forEach((freq, i) => {
                const noteStart = startTime + i * noteDur;
                const { osc, gain } = this._osc('square', freq, 0, melodyBus);
                gain.gain.setValueAtTime(0.28, noteStart);
                gain.gain.setTargetAtTime(0, noteStart + noteDur * 0.65, noteDur * 0.12);
                osc.start(noteStart);
                osc.stop(noteStart + noteDur);

                const { osc: o2, gain: g2 } = this._osc('triangle', freq * 0.5, 0, melodyBus);
                g2.gain.setValueAtTime(0.12, noteStart);
                g2.gain.setTargetAtTime(0, noteStart + noteDur * 0.6, noteDur * 0.1);
                o2.start(noteStart);
                o2.stop(noteStart + noteDur);
            });
            const nextStart = startTime + loopDur;
            const delay = (nextStart - this.ctx.currentTime - 0.2) * 1000;
            this._melodyTimer = setTimeout(() => scheduleLoop(nextStart), Math.max(delay, 50));
        };

        scheduleLoop(this.ctx.currentTime + 0.05);
        this.sirenNodes = { melodyBus };
        this.currentMusic = 'siren';
    }

    // ---- Background music: frightened ----

    startFrightened() {
        this._ensureContext();
        this.stopMusic();
        const t = this.ctx.currentTime;

        const o1 = this._osc('square', 220, 0.3, this.musicGain);
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'square';
        lfo.frequency.value = 8;
        lfoGain.gain.value = 80;
        lfo.connect(lfoGain);
        lfoGain.connect(o1.osc.frequency);

        const o2 = this._osc('sawtooth', 330, 0.15, this.musicGain);
        const lfo2 = this.ctx.createOscillator();
        const lfo2Gain = this.ctx.createGain();
        lfo2.type = 'sine';
        lfo2.frequency.value = 6;
        lfo2Gain.gain.value = 50;
        lfo2.connect(lfo2Gain);
        lfo2Gain.connect(o2.osc.frequency);

        o1.osc.start(t);
        lfo.start(t);
        o2.osc.start(t);
        lfo2.start(t);

        this.frightenedNodes = {
            osc1: o1.osc, gain1: o1.gain, lfo, lfoGain,
            osc2: o2.osc, gain2: o2.gain, lfo2, lfo2Gain
        };
        this.currentMusic = 'frightened';
    }

    stopMusic() {
        if (this.sirenNodes) {
            this._melodyCancel = true;
            if (this._melodyTimer) {
                clearTimeout(this._melodyTimer);
                this._melodyTimer = null;
            }
            try { this.sirenNodes.melodyBus.disconnect(); } catch (e) {}
            this.sirenNodes = null;
        }
        if (this.frightenedNodes) {
            const t = this.ctx ? this.ctx.currentTime : 0;
            try {
                this.frightenedNodes.gain1.gain.setValueAtTime(0, t);
                this.frightenedNodes.gain2.gain.setValueAtTime(0, t);
                this.frightenedNodes.osc1.stop(t + 0.01);
                this.frightenedNodes.osc2.stop(t + 0.01);
                this.frightenedNodes.lfo.stop(t + 0.01);
                this.frightenedNodes.lfo2.stop(t + 0.01);
            } catch (e) {}
            this.frightenedNodes = null;
        }
        this.currentMusic = null;
    }

    // ---- Sound effects ----

    playDotEat() {
        this._ensureContext();
        const t = this.ctx.currentTime;
        const freq = this.wakaHigh ? 587.33 : 523.25;
        this.wakaHigh = !this.wakaHigh;

        const { osc, gain } = this._osc('sine', freq, 0.6);
        osc.frequency.setTargetAtTime(freq * 0.7, t + 0.03, 0.02);
        gain.gain.setTargetAtTime(0, t + 0.06, 0.02);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    playPowerPellet() {
        this._ensureContext();
        const t = this.ctx.currentTime;

        const { osc, gain } = this._osc('square', 800, 0.5);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.25);
        gain.gain.setTargetAtTime(0, t + 0.2, 0.04);
        osc.start(t);
        osc.stop(t + 0.35);

        const { osc: o2, gain: g2 } = this._osc('sine', 600, 0.3);
        o2.frequency.exponentialRampToValueAtTime(150, t + 0.3);
        g2.gain.setTargetAtTime(0, t + 0.25, 0.04);
        o2.start(t + 0.02);
        o2.stop(t + 0.4);
    }

    playGhostEaten(combo) {
        this._ensureContext();
        const t = this.ctx.currentTime;
        const baseFreq = 300 + combo * 150;

        const { osc, gain } = this._osc('square', baseFreq, 0.5);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, t + 0.15);
        gain.gain.setTargetAtTime(0, t + 0.15, 0.03);
        osc.start(t);
        osc.stop(t + 0.25);

        const { osc: o2, gain: g2 } = this._osc('sine', baseFreq * 1.5, 0.3);
        o2.frequency.exponentialRampToValueAtTime(baseFreq * 3, t + 0.2);
        g2.gain.setTargetAtTime(0, t + 0.18, 0.03);
        o2.start(t + 0.03);
        o2.stop(t + 0.3);
    }

    playDeath() {
        this._ensureContext();
        this.stopMusic();
        const t = this.ctx.currentTime;
        const notes = [523, 494, 466, 440, 415, 392, 370, 349, 330, 311, 294, 277, 262, 247, 233, 220];

        notes.forEach((freq, i) => {
            const { osc, gain } = this._osc('sawtooth', freq, 0.4);
            const start = t + i * 0.08;
            gain.gain.setValueAtTime(0.4, start);
            gain.gain.setTargetAtTime(0, start + 0.06, 0.015);
            osc.start(start);
            osc.stop(start + 0.1);
        });

        const { osc: tail, gain: tGain } = this._osc('sine', 220, 0.3);
        const tailStart = t + notes.length * 0.08;
        tail.frequency.exponentialRampToValueAtTime(60, tailStart + 0.5);
        tGain.gain.setTargetAtTime(0, tailStart + 0.3, 0.1);
        tail.start(tailStart);
        tail.stop(tailStart + 0.7);
    }

    playLevelComplete() {
        this._ensureContext();
        this.stopMusic();
        const t = this.ctx.currentTime;
        const melody = [523, 587, 659, 698, 784, 880, 988, 1047];

        melody.forEach((freq, i) => {
            const { osc, gain } = this._osc('square', freq, 0.35);
            const start = t + i * 0.1;
            gain.gain.setValueAtTime(0.35, start);
            gain.gain.setTargetAtTime(0, start + 0.08, 0.015);
            osc.start(start);
            osc.stop(start + 0.12);

            const { osc: o2, gain: g2 } = this._osc('sine', freq * 1.5, 0.15);
            g2.gain.setValueAtTime(0.15, start);
            g2.gain.setTargetAtTime(0, start + 0.08, 0.015);
            o2.start(start + 0.01);
            o2.stop(start + 0.13);
        });
    }

    playReady() {
        this._ensureContext();
        const t = this.ctx.currentTime;
        const notes = [392, 0, 523, 0, 659, 0, 523, 659, 784];
        const durations = [0.12, 0.04, 0.12, 0.04, 0.12, 0.04, 0.08, 0.08, 0.24];

        let offset = 0;
        notes.forEach((freq, i) => {
            if (freq > 0) {
                const { osc, gain } = this._osc('square', freq, 0.3);
                const dur = durations[i];
                gain.gain.setValueAtTime(0.3, t + offset);
                gain.gain.setTargetAtTime(0, t + offset + dur * 0.7, 0.02);
                osc.start(t + offset);
                osc.stop(t + offset + dur + 0.05);
            }
            offset += durations[i];
        });
    }

    playGameOver() {
        this._ensureContext();
        this.stopMusic();
        const t = this.ctx.currentTime;
        const notes = [392, 370, 349, 330, 311, 294, 262];

        notes.forEach((freq, i) => {
            const { osc, gain } = this._osc('sawtooth', freq, 0.3);
            const start = t + i * 0.18;
            gain.gain.setValueAtTime(0.3, start);
            gain.gain.setTargetAtTime(0, start + 0.14, 0.03);
            osc.start(start);
            osc.stop(start + 0.22);

            const { osc: o2, gain: g2 } = this._osc('triangle', freq * 0.5, 0.2);
            g2.gain.setValueAtTime(0.2, start);
            g2.gain.setTargetAtTime(0, start + 0.14, 0.03);
            o2.start(start);
            o2.stop(start + 0.22);
        });
    }
}

// ============================================================
//  GAME
// ============================================================

class Game {
    constructor() {
        this.scoreEl = document.getElementById('score');
        this.highScoreEl = document.getElementById('high-score');
        this.levelEl = document.getElementById('level');
        this.livesEl = document.getElementById('lives-display');
        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('game-title');
        this.overlayMsg = document.getElementById('overlay-message');
        this.cameraLabel = document.getElementById('camera-label');
        this.readyText = document.getElementById('ready-text');
        this.helpOverlay = document.getElementById('help-overlay');
        this.helpVisible = false;

        this.highScore = parseInt(localStorage.getItem('pacman-high') || '0', 10);
        this.highScoreEl.textContent = this.highScore;

        this.state = STATE.START;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.globalTimer = 0;
        this.stateTimer = 0;
        this.ghostsEatenCombo = 0;
        this.modeTimer = 0;
        this.modePhase = 0;

        this.maze = copyMaze();
        this.totalDots = 0;
        this.dotsEaten = 0;
        this.countDots();

        this.pacman = new Pacman();
        this.ghosts = [
            new Ghost('blinky'),
            new Ghost('pinky'),
            new Ghost('inky'),
            new Ghost('clyde')
        ];

        this.audio = new AudioManager();
        this.frightenedActive = false;

        this.initThreeJS();
        this.buildMaze3D();
        this.createPacman3D();
        this.createGhosts3D();
        this.setupCameras();
        this.setupInput();
        this.showOverlay('PAC-MAN', 'Tap or press any key to start');
        this.updateHUD();
        this.updateMuteLabel();
        this.loop();
    }

    // --------------------------------------------------------
    //  THREE.JS INITIALIZATION
    // --------------------------------------------------------

    initThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.FogExp2(0x050510, 0.015);
        this._baseFogDensity = 0.015;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.autoClear = false;
        document.body.prepend(this.renderer.domElement);

        const ambient = new THREE.AmbientLight(0x333355, 0.6);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(5, 20, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 50;
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x4444ff, 0.2);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);

        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.updateCameraAspect();
        });
    }

    // --------------------------------------------------------
    //  3D MAZE CONSTRUCTION
    // --------------------------------------------------------

    buildMaze3D() {
        if (this.mazeGroup) this.scene.remove(this.mazeGroup);
        this.mazeGroup = new THREE.Group();
        this.dotMeshes = {};
        this.powerMeshes = {};

        const floorGeo = new THREE.PlaneGeometry(COLS + 2, ROWS + 2);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a1a,
            roughness: 0.8,
            metalness: 0.3
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, -0.5, 0);
        floor.receiveShadow = true;
        this.mazeGroup.add(floor);

        const wallGeo = new THREE.BoxGeometry(1, 0.8, 1);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x2121de,
            emissive: 0x0a0a6e,
            emissiveIntensity: 0.4,
            roughness: 0.5,
            metalness: 0.2
        });
        this.wallMat = wallMat;

        const dotGeo = new THREE.SphereGeometry(0.08, 8, 6);
        const dotMat = new THREE.MeshStandardMaterial({
            color: 0xffb8ae,
            emissive: 0xffb8ae,
            emissiveIntensity: 0.5,
            roughness: 0.3
        });

        const powerGeo = new THREE.SphereGeometry(0.2, 12, 10);
        const powerMat = new THREE.MeshStandardMaterial({
            color: 0xffb8ae,
            emissive: 0xffb8ae,
            emissiveIntensity: 0.8,
            roughness: 0.2
        });

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const cell = this.maze[y][x];
                const wx = x - COLS / 2 + 0.5;
                const wz = y - ROWS / 2 + 0.5;

                if (cell === CELL.WALL) {
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set(wx, 0, wz);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.mazeGroup.add(wall);
                } else if (cell === CELL.DOT) {
                    const dot = new THREE.Mesh(dotGeo, dotMat.clone());
                    dot.position.set(wx, 0.15, wz);
                    this.mazeGroup.add(dot);
                    this.dotMeshes[`${x},${y}`] = dot;
                } else if (cell === CELL.POWER) {
                    const power = new THREE.Mesh(powerGeo, powerMat.clone());
                    power.position.set(wx, 0.2, wz);
                    this.mazeGroup.add(power);
                    this.powerMeshes[`${x},${y}`] = power;

                    const pLight = new THREE.PointLight(0xffb8ae, 0.5, 3);
                    pLight.position.set(wx, 0.5, wz);
                    this.mazeGroup.add(pLight);
                    power.userData.light = pLight;
                } else if (cell === CELL.GATE) {
                    const gateGeo = new THREE.BoxGeometry(1, 0.12, 0.15);
                    const gateMat = new THREE.MeshStandardMaterial({
                        color: 0xffb8ff,
                        emissive: 0xffb8ff,
                        emissiveIntensity: 0.5
                    });
                    const gate = new THREE.Mesh(gateGeo, gateMat);
                    gate.position.set(wx, 0.06, wz);
                    this.mazeGroup.add(gate);
                }
            }
        }

        this.scene.add(this.mazeGroup);
    }

    // --------------------------------------------------------
    //  3D PAC-MAN
    // --------------------------------------------------------

    createPacman3D() {
        if (this.pacmanMesh) this.scene.remove(this.pacmanMesh);
        this.pacmanMesh = createPacmanMesh();
        this.pacmanMesh.position.set(
            toWorldX(this.pacman.pixelX),
            0.2,
            toWorldZ(this.pacman.pixelY)
        );
        this.scene.add(this.pacmanMesh);
    }

    // --------------------------------------------------------
    //  3D GHOSTS
    // --------------------------------------------------------

    createGhosts3D() {
        this.ghostMeshes = [];
        for (const g of this.ghosts) {
            if (g._mesh) this.scene.remove(g._mesh);
            const colorInt = parseInt(g.config.color.replace('#', ''), 16);
            const mesh = createGhostMesh(colorInt);
            mesh.position.set(
                toWorldX(g.pixelX),
                0.15,
                toWorldZ(g.pixelY)
            );
            this.scene.add(mesh);
            g._mesh = mesh;
            this.ghostMeshes.push(mesh);
        }
    }

    // --------------------------------------------------------
    //  CAMERAS
    // --------------------------------------------------------

    setupCameras() {
        this.cameraMode = 0;
        this.cameraNames = ['TOP-DOWN', 'THIRD PERSON'];

        const aspect = window.innerWidth / window.innerHeight;
        const frustum = 18;

        this.topCamera = this._createTopDownCamera();

        this.thirdPersonCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
        this.thirdPersonCamera.position.set(0, 15, 10);

        this.firstPersonCamera = new THREE.PerspectiveCamera(90, 16 / 9, 0.05, 200);

        this.frontCamera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 200);

        this.minimapCamera = new THREE.OrthographicCamera(
            -frustum * 1.0, frustum * 1.0,
            frustum * (ROWS / COLS), -frustum * (ROWS / COLS), 0.1, 100
        );
        this.minimapCamera.position.set(0, 30, 0);
        this.minimapCamera.lookAt(0, 0, 0);

        this.activeCamera = this.topCamera;

        this.cameraPos = new THREE.Vector3();
        this.cameraTarget = new THREE.Vector3();
        this.topCamPos = new THREE.Vector3(0, 14, 10);
        this.topCamTarget = new THREE.Vector3(0, 0, -2);
        this.fpvCameraPos = new THREE.Vector3();
        this.fpvCameraTarget = new THREE.Vector3();
        this.frontCameraPos = new THREE.Vector3();
        this.frontCameraTarget = new THREE.Vector3();

        this.updateCameraLabel();
    }

    _isPortrait() {
        return window.innerWidth / window.innerHeight < 1;
    }

    _createTopDownCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        const cam = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
        if (this._isPortrait()) {
            this._applyPortraitTopDown(cam);
        } else {
            cam.position.set(0, 30, 10);
            cam.lookAt(0, 0, 2);
        }
        return cam;
    }

    _applyPortraitTopDown(cam) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const mainH = h - Math.floor(h * 0.15);
        const viewAspect = w / mainH;

        const fovRad = THREE.MathUtils.degToRad(60);
        const halfVFov = fovRad / 2;
        const halfHFov = Math.atan(Math.tan(halfVFov) * viewAspect);

        const halfMazeW = COLS / 2 + 1.5;
        const halfMazeH = ROWS / 2 + 1.5;

        const yForWidth = halfMazeW / Math.tan(halfHFov);
        const yForHeight = halfMazeH / Math.tan(halfVFov);
        const camY = Math.max(yForWidth, yForHeight);

        cam.fov = 60;
        cam.aspect = viewAspect;
        cam.updateProjectionMatrix();
        cam.position.set(0, camY, 8);
        cam.lookAt(0, 0, 0);

        document.title = 'P:y=' + camY.toFixed(0) + ' a=' + viewAspect.toFixed(2);
    }

    updateCameraAspect() {
        const aspect = window.innerWidth / window.innerHeight;

        if (this._isPortrait()) {
            this._applyPortraitTopDown(this.topCamera);
        } else {
            this.topCamera.position.set(0, 30, 10);
            this.topCamera.lookAt(0, 0, 2);
            this.topCamera.aspect = aspect;
            this.topCamera.updateProjectionMatrix();
        }

        this.thirdPersonCamera.aspect = aspect;
        this.thirdPersonCamera.updateProjectionMatrix();
    }

    cycleCamera() {
        this.cameraMode = (this.cameraMode + 1) % 2;
        switch (this.cameraMode) {
            case 0: this.activeCamera = this.topCamera; break;
            case 1: this.activeCamera = this.thirdPersonCamera; break;
        }
        this.updateCameraLabel();
    }

    updateCameraLabel() {
        this.cameraLabel.textContent = `[C] ${this.cameraNames[this.cameraMode]}`;
    }

    updateCameras() {
        const px = toWorldX(this.pacman.pixelX);
        const pz = toWorldZ(this.pacman.pixelY);
        const angle = dirToAngle(this.pacman.dir);
        const dirX = Math.cos(angle);
        const dirZ = -Math.sin(angle);

        const idealPos = new THREE.Vector3(
            px - dirX * 6,
            8,
            pz - dirZ * 6
        );
        const idealTarget = new THREE.Vector3(px + dirX * 3, 0, pz + dirZ * 3);

        this.cameraPos.lerp(idealPos, 0.06);
        this.cameraTarget.lerp(idealTarget, 0.08);

        this.thirdPersonCamera.position.copy(this.cameraPos);
        this.thirdPersonCamera.lookAt(this.cameraTarget);

        const fpvIdealPos = new THREE.Vector3(px + dirX * 0.5, 0.35, pz + dirZ * 0.5);
        const fpvLookAt = new THREE.Vector3(px + dirX * 5, 0.2, pz + dirZ * 5);
        this.fpvCameraPos.lerp(fpvIdealPos, 0.12);
        this.fpvCameraTarget.lerp(fpvLookAt, 0.1);
        this.firstPersonCamera.position.copy(this.fpvCameraPos);
        this.firstPersonCamera.lookAt(this.fpvCameraTarget);

        const frontIdealPos = new THREE.Vector3(px + dirX * 5, 4, pz + dirZ * 5);
        const frontLookAt = new THREE.Vector3(px - dirX * 3, 0, pz - dirZ * 3);
        this.frontCameraPos.lerp(frontIdealPos, 0.06);
        this.frontCameraTarget.lerp(frontLookAt, 0.08);
        this.frontCamera.position.copy(this.frontCameraPos);
        this.frontCamera.lookAt(this.frontCameraTarget);
    }

    // --------------------------------------------------------
    //  INPUT
    // --------------------------------------------------------

    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.audio.resume();

            if (e.key === 'm' || e.key === 'M') {
                this.audio.toggleMute();
                this.updateMuteLabel();
                return;
            }

            if (e.key === 'h' || e.key === 'H') {
                this.toggleHelp();
                return;
            }

            if (e.key === 'Escape' && this.helpVisible) {
                this.toggleHelp();
                return;
            }

            if (this.helpVisible) return;

            if (this.state === STATE.START || this.state === STATE.GAMEOVER) {
                this.startGame();
                return;
            }

            let dir = null;
            switch (e.key) {
                case 'ArrowUp':    case 'w': case 'W': dir = DIR.UP; break;
                case 'ArrowDown':  case 's': case 'S': dir = DIR.DOWN; break;
                case 'ArrowLeft':  case 'a': case 'A': dir = DIR.LEFT; break;
                case 'ArrowRight': case 'd': case 'D': dir = DIR.RIGHT; break;
                case 'c': case 'C': this.cycleCamera(); break;
            }

            if (dir) {
                if (this.cameraMode >= 1) {
                    const facing = this.pacman.dir;
                    if (dir === DIR.UP) dir = facing;
                    else if (dir === DIR.DOWN) dir = oppositeDir(facing);
                    else if (dir === DIR.LEFT) dir = turnLeft(facing);
                    else if (dir === DIR.RIGHT) dir = turnRight(facing);
                }
                this.pacman.nextDir = dir;
            }

            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });

        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (this.isTouchDevice) {
            this.setupTouchInput();
        }
    }

    setupTouchInput() {
        document.body.classList.add('has-touch');

        document.addEventListener('touchmove', (e) => {
            if (!this.helpVisible) e.preventDefault();
        }, { passive: false });

        this.overlay.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.audio.resume();
            if (this.state === STATE.START || this.state === STATE.GAMEOVER) {
                this.startGame();
            }
        }, { passive: false });

        const dpadMap = {
            'dpad-up':    DIR.UP,
            'dpad-down':  DIR.DOWN,
            'dpad-left':  DIR.LEFT,
            'dpad-right': DIR.RIGHT
        };

        const setDirection = (dir) => {
            if (this.helpVisible) return;
            this.audio.resume();
            let d = dir;
            if (this.cameraMode >= 1) {
                const facing = this.pacman.dir;
                if (d === DIR.UP) d = facing;
                else if (d === DIR.DOWN) d = oppositeDir(facing);
                else if (d === DIR.LEFT) d = turnLeft(facing);
                else if (d === DIR.RIGHT) d = turnRight(facing);
            }
            this.pacman.nextDir = d;
        };

        for (const [id, dir] of Object.entries(dpadMap)) {
            const btn = document.getElementById(id);
            if (!btn) continue;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('active');
                setDirection(dir);
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
            }, { passive: false });

            btn.addEventListener('touchcancel', () => {
                btn.classList.remove('active');
            });
        }

        const camBtn = document.getElementById('touch-camera');
        if (camBtn) {
            camBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.audio.resume();
                this.cycleCamera();
            }, { passive: false });
        }

        const muteBtn = document.getElementById('touch-mute');
        if (muteBtn) {
            muteBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.audio.resume();
                this.audio.toggleMute();
                this.updateMuteLabel();
                muteBtn.textContent = this.audio.muted ? '\u{1F507}' : '\u{1F509}';
            }, { passive: false });
        }

        const helpBtn = document.getElementById('touch-help');
        if (helpBtn) {
            helpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.audio.resume();
                this.toggleHelp();
            }, { passive: false });
        }

        const helpClose = document.getElementById('help-close');
        if (helpClose) {
            const closeHelp = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.helpVisible) this.toggleHelp();
            };
            helpClose.addEventListener('touchstart', closeHelp, { passive: false });
            helpClose.addEventListener('click', closeHelp);
        }

        const helpContent = document.getElementById('help-content');
        const dismissHelp = (e) => {
            if (!this.helpVisible) return;
            if (helpContent && helpContent.contains(e.target)) return;
            if (e.target.id === 'help-close') return;
            e.preventDefault();
            this.toggleHelp();
        };
        this.helpOverlay.addEventListener('touchstart', dismissHelp, { passive: false });
        this.helpOverlay.addEventListener('click', dismissHelp);
    }

    toggleHelp() {
        this.helpVisible = !this.helpVisible;
        this.helpOverlay.classList.toggle('hidden', !this.helpVisible);

        if (this.helpVisible) {
            this._musicBeforeHelp = this.audio.currentMusic;
            this.audio.stopMusic();
        } else if (this.state === STATE.PLAYING) {
            if (this._musicBeforeHelp === 'frightened' && this.frightenedActive) {
                this.audio.startFrightened();
            } else {
                this.audio.startSiren(this.level);
            }
        }
    }

    updateMuteLabel() {
        const el = document.getElementById('mute-label');
        if (el) el.textContent = `[M] SOUND: ${this.audio.muted ? 'OFF' : 'ON'}`;
    }

    // --------------------------------------------------------
    //  GAME STATE
    // --------------------------------------------------------

    countDots() {
        this.totalDots = 0;
        for (let y = 0; y < ROWS; y++)
            for (let x = 0; x < COLS; x++)
                if (this.maze[y][x] === CELL.DOT || this.maze[y][x] === CELL.POWER)
                    this.totalDots++;
    }

    startGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.dotsEaten = 0;
        this.maze = copyMaze();
        this.countDots();
        this.buildMaze3D();
        this.resetEntities();
        this.audio.stopMusic();
        this.frightenedActive = false;
        this.enterState(STATE.READY);
        this.hideOverlay();
        this.updateHUD();
    }

    resetEntities() {
        this.pacman.reset();
        this.ghosts.forEach(g => g.reset());
        this.ghostsEatenCombo = 0;
        this.modeTimer = 0;
        this.modePhase = 0;

        this.cameraPos.set(
            toWorldX(this.pacman.pixelX) - 6,
            8,
            toWorldZ(this.pacman.pixelY) + 6
        );
        this.cameraTarget.set(
            toWorldX(this.pacman.pixelX),
            0,
            toWorldZ(this.pacman.pixelY)
        );
    }

    enterState(s) {
        this.state = s;
        this.stateTimer = 0;
        if (s === STATE.READY) {
            this.readyText.classList.remove('hidden');
            this.audio.stopMusic();
            this.audio.playReady();
            this.frightenedActive = false;
        } else {
            this.readyText.classList.add('hidden');
        }

        if (s === STATE.PLAYING) {
            this.audio.startSiren(this.level);
            this.frightenedActive = false;
        } else if (s === STATE.DEATH) {
            this.audio.playDeath();
            this.frightenedActive = false;
        } else if (s === STATE.LEVEL_COMPLETE) {
            this.audio.playLevelComplete();
            this.frightenedActive = false;
        } else if (s === STATE.GAMEOVER) {
            this.audio.playGameOver();
            this.frightenedActive = false;
        }
    }

    showOverlay(title, msg) {
        this.overlay.classList.remove('hidden');
        this.overlayTitle.textContent = title;
        this.overlayMsg.textContent = msg;
    }

    hideOverlay() {
        this.overlay.classList.add('hidden');
    }

    updateHUD() {
        this.scoreEl.textContent = this.score;
        this.levelEl.textContent = this.level;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pacman-high', this.highScore);
        }
        this.highScoreEl.textContent = this.highScore;

        this.livesEl.innerHTML = '';
        for (let i = 0; i < this.lives; i++) {
            const c = document.createElement('canvas');
            c.width = 20; c.height = 20;
            const lctx = c.getContext('2d');
            lctx.fillStyle = '#ffff00';
            lctx.beginPath();
            lctx.arc(10, 10, 8, 0.25, Math.PI * 2 - 0.25);
            lctx.lineTo(10, 10);
            lctx.closePath();
            lctx.fill();
            this.livesEl.appendChild(c);
        }
    }

    getModeSchedule() {
        return [
            { mode: GHOST_MODE.SCATTER, duration: 420 },
            { mode: GHOST_MODE.CHASE,   duration: 1200 },
            { mode: GHOST_MODE.SCATTER, duration: 420 },
            { mode: GHOST_MODE.CHASE,   duration: 1200 },
            { mode: GHOST_MODE.SCATTER, duration: 300 },
            { mode: GHOST_MODE.CHASE,   duration: 1200 },
            { mode: GHOST_MODE.SCATTER, duration: 300 },
            { mode: GHOST_MODE.CHASE,   duration: Infinity }
        ];
    }

    updateGhostModes() {
        this.modeTimer++;
        const schedule = this.getModeSchedule();
        if (this.modePhase >= schedule.length) return;

        const phase = schedule[this.modePhase];
        if (this.modeTimer >= phase.duration) {
            this.modeTimer = 0;
            this.modePhase++;
            if (this.modePhase < schedule.length) {
                const newMode = schedule[this.modePhase].mode;
                for (const g of this.ghosts) {
                    if (g.mode !== GHOST_MODE.FRIGHTENED && g.mode !== GHOST_MODE.EATEN && !g.inHouse) {
                        g.mode = newMode;
                        g.dir = oppositeDir(g.dir);
                    }
                }
            }
        }
    }

    // --------------------------------------------------------
    //  UPDATE (game logic - unchanged)
    // --------------------------------------------------------

    update() {
        if (this.helpVisible) return;

        this.globalTimer++;
        this.stateTimer++;

        if (this.state === STATE.READY) {
            if (this.stateTimer >= 120) {
                this.enterState(STATE.PLAYING);
            }
            return;
        }

        if (this.state === STATE.DEATH) {
            if (this.stateTimer >= 90) {
                if (this.lives <= 0) {
                    this.enterState(STATE.GAMEOVER);
                    this.showOverlay('GAME OVER', 'Tap or press any key to play again');
                } else {
                    this.resetEntities();
                    this.enterState(STATE.READY);
                }
            }
            return;
        }

        if (this.state === STATE.LEVEL_COMPLETE) {
            if (this.stateTimer >= 120) {
                this.level++;
                this.maze = copyMaze();
                this.dotsEaten = 0;
                this.countDots();
                this.buildMaze3D();
                this.resetEntities();
                this.ghosts.forEach(g => {
                    g.baseSpeed = Math.min(2.4, 1.6 + this.level * 0.08);
                    g.speed = g.baseSpeed;
                });
                this.pacman.speed = Math.min(2.6, 2 + this.level * 0.05);
                this.enterState(STATE.READY);
                this.updateHUD();
            }
            return;
        }

        if (this.state !== STATE.PLAYING) return;

        this.pacman.update(this.maze);
        this.updateGhostModes();

        const blinky = this.ghosts[0];
        for (const g of this.ghosts) {
            g.update(this.maze, this.pacman, blinky);
        }

        this.checkDotCollision();
        this.checkGhostCollision();

        const anyFrightened = this.ghosts.some(g => g.mode === GHOST_MODE.FRIGHTENED);
        if (anyFrightened && !this.frightenedActive) {
            this.frightenedActive = true;
            this.audio.startFrightened();
        } else if (!anyFrightened && this.frightenedActive) {
            this.frightenedActive = false;
            this.audio.startSiren(this.level);
        }

        if (this.dotsEaten >= this.totalDots) {
            this.enterState(STATE.LEVEL_COMPLETE);
        }
    }

    checkDotCollision() {
        const tileX = Math.floor(this.pacman.pixelX / TILE);
        const tileY = Math.floor(this.pacman.pixelY / TILE);
        if (tileX < 0 || tileX >= COLS || tileY < 0 || tileY >= ROWS) return;
        const cell = this.maze[tileY][tileX];
        const key = `${tileX},${tileY}`;

        if (cell === CELL.DOT) {
            this.maze[tileY][tileX] = CELL.EMPTY;
            this.score += 10;
            this.dotsEaten++;
            if (this.dotMeshes[key]) {
                this.dotMeshes[key].visible = false;
            }
            this.audio.playDotEat();
            this.updateHUD();
        } else if (cell === CELL.POWER) {
            this.maze[tileY][tileX] = CELL.EMPTY;
            this.score += 50;
            this.dotsEaten++;
            this.ghostsEatenCombo = 0;
            if (this.powerMeshes[key]) {
                this.powerMeshes[key].visible = false;
                if (this.powerMeshes[key].userData.light) {
                    this.powerMeshes[key].userData.light.visible = false;
                }
            }
            for (const g of this.ghosts) g.enterFrightened();
            this.audio.stopMusic();
            this.audio.playPowerPellet();
            this.updateHUD();
        }
    }

    checkGhostCollision() {
        for (const g of this.ghosts) {
            if (g.inHouse) continue;
            const dist = distance(this.pacman.pixelX, this.pacman.pixelY, g.pixelX, g.pixelY);
            if (dist < TILE * 0.8) {
                if (g.mode === GHOST_MODE.FRIGHTENED) {
                    g.mode = GHOST_MODE.EATEN;
                    this.ghostsEatenCombo++;
                    this.score += 200 * Math.pow(2, this.ghostsEatenCombo - 1);
                    this.audio.playGhostEaten(this.ghostsEatenCombo);
                    this.updateHUD();
                } else if (g.mode !== GHOST_MODE.EATEN) {
                    this.lives--;
                    this.pacman.dying = true;
                    this.enterState(STATE.DEATH);
                    this.updateHUD();
                }
            }
        }
    }

    // --------------------------------------------------------
    //  3D RENDERING
    // --------------------------------------------------------

    syncPacman3D() {
        const mesh = this.pacmanMesh;
        if (!mesh) return;

        const wx = toWorldX(this.pacman.pixelX);
        const wz = toWorldZ(this.pacman.pixelY);
        mesh.position.set(wx, 0.2, wz);

        const angle = dirToAngle(this.pacman.dir);
        mesh.rotation.y = angle + Math.PI / 2;

        const mouthOpen = this.pacman.mouthAngle * 0.45;
        mesh.userData.topHalf.rotation.x = -mouthOpen;
        mesh.userData.bottomHalf.rotation.x = mouthOpen;

        if (this.pacman.dying) {
            const progress = Math.min(this.pacman.deathFrame / 60, 1);
            const scale = Math.max(1 - progress, 0.01);
            mesh.scale.set(scale, scale, scale);
            mesh.position.y = 0.2 + progress * 2;
            mesh.rotation.z = progress * Math.PI * 4;
        } else {
            mesh.scale.set(1, 1, 1);
            mesh.rotation.z = 0;
        }

        mesh.visible = !(this.pacman.dying && this.pacman.deathFrame >= 60);
    }

    syncGhosts3D() {
        const t = this.globalTimer;

        for (const g of this.ghosts) {
            const mesh = g._mesh;
            if (!mesh) continue;

            const wx = toWorldX(g.pixelX);
            const wz = toWorldZ(g.pixelY);
            mesh.position.set(wx, 0.15, wz);

            const bobY = Math.sin(t * 0.08 + g.pixelX * 0.1) * 0.04;
            mesh.position.y += bobY;

            const angle = dirToAngle(g.dir);
            mesh.rotation.y = angle;

            const bodyGroup = mesh.userData.bodyGroup;
            const eyeGroup = mesh.userData.eyeGroup;
            const frightenedFace = mesh.userData.frightenedFaceGroup;
            const headMat = mesh.userData.headMat;
            const skirtMat = mesh.userData.skirtMat;
            const tentacleMat = mesh.userData.tentacleMat;
            const origColor = mesh.userData.originalColor;

            if (g.mode === GHOST_MODE.EATEN) {
                bodyGroup.visible = false;
                eyeGroup.visible = true;
                frightenedFace.visible = false;
            } else if (g.mode === GHOST_MODE.FRIGHTENED) {
                bodyGroup.visible = true;
                eyeGroup.visible = false;
                frightenedFace.visible = true;

                const flashing = g.frightTimer < 120 && Math.floor(t / 10) % 2 === 0;
                const color = flashing ? 0xffffff : 0x2121de;
                headMat.color.setHex(color);
                headMat.emissive.setHex(color);
                skirtMat.color.setHex(color);
                skirtMat.emissive.setHex(color);
                tentacleMat.color.setHex(color);
                tentacleMat.emissive.setHex(color);
            } else {
                bodyGroup.visible = true;
                eyeGroup.visible = true;
                frightenedFace.visible = false;
                headMat.color.setHex(origColor);
                headMat.emissive.setHex(origColor);
                skirtMat.color.setHex(origColor);
                skirtMat.emissive.setHex(origColor);
                tentacleMat.color.setHex(origColor);
                tentacleMat.emissive.setHex(origColor);
            }

            if (this.state === STATE.DEATH && this.stateTimer >= 30) {
                mesh.visible = false;
            } else {
                mesh.visible = true;
            }
        }
    }

    animateDots() {
        const t = this.globalTimer;

        for (const key in this.powerMeshes) {
            const mesh = this.powerMeshes[key];
            if (!mesh.visible) continue;
            const pulse = 0.7 + Math.sin(t * 0.08) * 0.3;
            mesh.material.emissiveIntensity = pulse;
            mesh.scale.setScalar(0.8 + Math.sin(t * 0.06) * 0.2);
            mesh.position.y = 0.2 + Math.sin(t * 0.05) * 0.08;
            if (mesh.userData.light) {
                mesh.userData.light.intensity = pulse * 0.6;
            }
        }
    }

    animateWalls() {
        if (this.state === STATE.LEVEL_COMPLETE) {
            const flash = Math.floor(this.stateTimer / 15) % 2 === 0;
            this.wallMat.color.setHex(flash ? 0xffffff : 0x2121de);
            this.wallMat.emissive.setHex(flash ? 0x666666 : 0x0a0a6e);
        } else {
            this.wallMat.color.setHex(0x2121de);
            this.wallMat.emissive.setHex(0x0a0a6e);
        }
    }

    render3D() {
        this.syncPacman3D();
        this.syncGhosts3D();
        this.animateDots();
        this.animateWalls();
        this.updateCameras();

        this.renderer.clear();

        const w = window.innerWidth;
        const h = window.innerHeight;
        const narrow = w < 600;
        const portrait = this._isPortrait();

        if (portrait) {
            const stripH = Math.floor(h * 0.15);
            const mainH = h - stripH;
            const halfW = Math.floor(w / 2);

            const savedFog = this.scene.fog;
            const mainCam = this.activeCamera;
            if (mainCam === this.topCamera) {
                this.scene.fog = null;
            }

            this.renderer.setViewport(0, 0, w, mainH);
            this.renderer.setScissor(0, 0, w, mainH);
            this.renderer.setScissorTest(true);
            this.renderer.render(this.scene, mainCam);

            this.scene.fog = savedFog;

            this.renderer.setViewport(0, mainH, halfW, stripH);
            this.renderer.setScissor(0, mainH, halfW, stripH);
            this.renderer.render(this.scene, this.frontCamera);

            const stripCam = this.cameraMode === 0
                ? this.thirdPersonCamera
                : this.minimapCamera;
            document.title = 'cam=' + this.cameraMode + ' strip=' + (stripCam === this.thirdPersonCamera ? '3P' : 'MAP');
            this.scene.fog = null;
            this.renderer.setViewport(halfW, mainH, w - halfW, stripH);
            this.renderer.setScissor(halfW, mainH, w - halfW, stripH);
            this.renderer.render(this.scene, stripCam);
            this.renderer.setScissorTest(false);
            this.scene.fog = savedFog;
        } else {
            if (this.scene.fog) {
                const camDist = this.activeCamera.position.length();
                this.scene.fog.density = this._baseFogDensity * (30 / Math.max(camDist, 30));
            }

            this.renderer.setViewport(0, 0, w, h);
            this.renderer.setScissor(0, 0, w, h);
            this.renderer.setScissorTest(false);
            this.renderer.render(this.scene, this.activeCamera);

            const minimapFrac = narrow ? 0.22 : 0.25;
            if (this.cameraMode === 0) {
                const mw = Math.floor(w * minimapFrac);
                const mh = Math.floor(mw * 9 / 16);
                const mx = w - mw - 10;
                const my = h - mh - 10;

                this.renderer.setViewport(mx, my, mw, mh);
                this.renderer.setScissor(mx, my, mw, mh);
                this.renderer.setScissorTest(true);
                this.renderer.render(this.scene, this.thirdPersonCamera);
                this.renderer.setScissorTest(false);
            } else if (this.cameraMode === 1) {
                const mw = Math.floor(w * minimapFrac);
                const mh = Math.floor(mw * 9 / 16);
                const mx = w - mw - 10;
                const my = h - mh - 10;

                const savedFog = this.scene.fog;
                this.scene.fog = null;
                this.renderer.setViewport(mx, my, mw, mh);
                this.renderer.setScissor(mx, my, mw, mh);
                this.renderer.setScissorTest(true);
                this.renderer.render(this.scene, this.minimapCamera);
                this.renderer.setScissorTest(false);
                this.scene.fog = savedFog;
            }

            if (!narrow) {
                const fw = Math.floor(w * 0.18);
                const fh = Math.floor(fw * 9 / 16);
                const fx = 10;
                const fy = h - fh - 10;

                this.renderer.setViewport(fx, fy, fw, fh);
                this.renderer.setScissor(fx, fy, fw, fh);
                this.renderer.setScissorTest(true);
                this.renderer.render(this.scene, this.frontCamera);
                this.renderer.setScissorTest(false);
            }
        }
    }

    // --------------------------------------------------------
    //  MAIN LOOP
    // --------------------------------------------------------

    loop() {
        this.update();
        this.render3D();
        requestAnimationFrame(() => this.loop());
    }
}

// ============================================================
//  BOOT
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
