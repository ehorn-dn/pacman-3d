// ============================================================
//  PAC-MAN 3D — Main Game Script
// ============================================================
//  A complete 3D Pac-Man game built with Three.js (r128).
//
//  Architecture overview:
//    1. Constants & maze definition
//    2. Utility functions (distance, direction helpers, coordinate transforms)
//    3. Pacman class — player entity with tile-based movement
//    4. Ghost class — AI enemies with scatter/chase/frightened/eaten modes
//    5. 3D mesh builders — procedural geometry for Pac-Man and ghosts
//    6. AudioManager — Web Audio API synthesizer for music & SFX
//    7. Game class — orchestrates state machine, Three.js scene, input,
//       collision detection, cameras, HUD, and the main loop
//
//  Coordinate systems:
//    - Tile coordinates: integer grid positions (tileX, tileY) in a 28×31 maze
//    - Pixel coordinates: sub-tile positions (pixelX, pixelY) for smooth movement
//    - World coordinates: Three.js 3D space, centered at origin, 1 unit = 1 tile
// ============================================================


// ============================================================
//  CONSTANTS
// ============================================================

// Size of each tile in pixel-space (used for sub-tile movement interpolation)
const TILE = 20;

// Maze dimensions — matches the classic Pac-Man 28-column × 31-row layout
const COLS = 28;
const ROWS = 31;

// Total pixel dimensions of the logical game area
const CANVAS_W = COLS * TILE;
const CANVAS_H = ROWS * TILE;

// Direction vectors — each direction is a unit step in tile coordinates.
// NONE is used when an entity is stationary.
const DIR = {
    UP:    { x:  0, y: -1 },
    DOWN:  { x:  0, y:  1 },
    LEFT:  { x: -1, y:  0 },
    RIGHT: { x:  1, y:  0 },
    NONE:  { x:  0, y:  0 }
};

// Cell types in the maze grid — each integer maps to a tile behavior:
//   EMPTY (0)       — passable, no collectible
//   WALL (1)        — impassable barrier, rendered as blue 3D blocks
//   DOT (2)         — small pellet worth 10 points
//   POWER (3)       — large power pellet worth 50 points, triggers frightened mode
//   GHOST_HOUSE (4) — interior of the ghost pen, only ghosts can enter
//   GATE (5)        — the ghost house entrance gate, ghosts pass through when eaten
//   TUNNEL (6)      — wrap-around tunnel at the maze edges
const CELL = {
    EMPTY:   0,
    WALL:    1,
    DOT:     2,
    POWER:   3,
    GHOST_HOUSE: 4,
    GATE:    5,
    TUNNEL:  6
};

// Game state machine — controls which update/render logic runs each frame.
//   START          — title screen, waiting for player input
//   READY          — brief countdown before gameplay begins
//   PLAYING        — active gameplay
//   DEATH          — Pac-Man death animation playing
//   GAMEOVER       — all lives lost, showing game-over screen
//   LEVEL_COMPLETE — all dots eaten, walls flash before advancing
const STATE = {
    START:    'start',
    READY:    'ready',
    PLAYING:  'playing',
    DEATH:    'death',
    GAMEOVER: 'gameover',
    LEVEL_COMPLETE: 'level_complete'
};

// Ghost behavior modes — determines targeting strategy:
//   CHASE      — each ghost uses its unique targeting algorithm
//   SCATTER    — ghosts retreat to their assigned corner
//   FRIGHTENED — ghosts turn blue, move randomly, can be eaten
//   EATEN      — ghost is just eyes, rushing back to the ghost house
const GHOST_MODE = {
    CHASE:      'chase',
    SCATTER:    'scatter',
    FRIGHTENED: 'frightened',
    EATEN:      'eaten'
};


// ============================================================
//  MAZE DEFINITION  (28 × 31)
// ============================================================
//  Each row is an array of CELL values. The layout mirrors the
//  classic Pac-Man maze:
//    - Outer walls form the boundary
//    - Interior walls create corridors
//    - Dots (2) and power pellets (3) fill the corridors
//    - Ghost house (4) is in the center with gates (5) at the entrance
//    - Tunnels (6) at row 14 allow horizontal wrap-around
//    - Rows 10-18 contain the ghost house and surrounding area
//      with empty (0) cells forming the side passages
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
//  UTILITY FUNCTIONS
// ============================================================

/**
 * Euclidean distance between two points.
 * Used for ghost targeting (choosing the direction that minimizes
 * distance to the target tile) and collision detection.
 */
function distance(ax, ay, bx, by) {
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/**
 * Returns the 180° opposite of a direction.
 * Ghosts are not allowed to reverse direction except when
 * mode changes (scatter↔chase) or entering frightened mode.
 */
function oppositeDir(d) {
    if (d === DIR.UP) return DIR.DOWN;
    if (d === DIR.DOWN) return DIR.UP;
    if (d === DIR.LEFT) return DIR.RIGHT;
    if (d === DIR.RIGHT) return DIR.LEFT;
    return DIR.NONE;
}

/**
 * Rotates a direction 90° counter-clockwise.
 * Used to remap controls in third-person camera mode where
 * "left" means "turn left relative to Pac-Man's facing".
 */
function turnLeft(d) {
    if (d === DIR.UP) return DIR.LEFT;
    if (d === DIR.DOWN) return DIR.RIGHT;
    if (d === DIR.LEFT) return DIR.DOWN;
    if (d === DIR.RIGHT) return DIR.UP;
    return DIR.NONE;
}

/**
 * Rotates a direction 90° clockwise.
 * Counterpart to turnLeft for right-relative controls.
 */
function turnRight(d) {
    if (d === DIR.UP) return DIR.RIGHT;
    if (d === DIR.DOWN) return DIR.LEFT;
    if (d === DIR.LEFT) return DIR.UP;
    if (d === DIR.RIGHT) return DIR.DOWN;
    return DIR.NONE;
}

/**
 * Deep-copies the maze template so each level starts fresh.
 * The template is never mutated — dots are removed from the copy.
 */
function copyMaze() {
    return MAZE_TEMPLATE.map(row => [...row]);
}

/**
 * Converts pixel X coordinate to Three.js world X.
 * Centers the maze at the origin: tile 0 maps to -COLS/2,
 * tile COLS-1 maps to +COLS/2.
 */
function toWorldX(pixelX) { return (pixelX / TILE) - COLS / 2; }

/**
 * Converts pixel Y coordinate to Three.js world Z.
 * Y in tile-space maps to Z in 3D (the maze lies on the XZ plane).
 */
function toWorldZ(pixelY) { return (pixelY / TILE) - ROWS / 2; }

/**
 * Converts a direction vector to a rotation angle (radians).
 * Used to orient Pac-Man and ghost meshes to face their
 * movement direction. RIGHT = 0, UP = π/2, LEFT = π, DOWN = -π/2.
 */
function dirToAngle(dir) {
    if (dir === DIR.RIGHT) return 0;
    if (dir === DIR.DOWN)  return -Math.PI / 2;
    if (dir === DIR.LEFT)  return Math.PI;
    if (dir === DIR.UP)    return Math.PI / 2;
    return 0;
}


// ============================================================
//  PACMAN CLASS
// ============================================================
//  Represents the player character. Handles:
//    - Tile-based movement with sub-tile pixel interpolation
//    - Direction queuing (nextDir is applied at tile centers)
//    - Horizontal tunnel wrapping
//    - Mouth open/close animation
//    - Death animation state
// ============================================================

class Pacman {
    constructor() { this.reset(); }

    /**
     * Resets Pac-Man to the starting position (tile 14, 23 — just
     * below the center of the maze). Faces left initially.
     */
    reset() {
        this.tileX = 14;                              // Current tile column
        this.tileY = 23;                              // Current tile row
        this.pixelX = this.tileX * TILE + TILE / 2;   // Sub-tile X (center of tile)
        this.pixelY = this.tileY * TILE + TILE / 2;   // Sub-tile Y (center of tile)
        this.dir = DIR.LEFT;                           // Current movement direction
        this.nextDir = DIR.LEFT;                       // Queued direction (applied at next tile center)
        this.speed = 2;                                // Movement speed in pixels per frame
        this.mouthAngle = 0;                           // Current mouth opening angle (0 = closed)
        this.mouthOpening = true;                      // Whether mouth is opening or closing
        this.deathFrame = 0;                           // Frame counter for death animation
        this.dying = false;                            // Whether death animation is playing
    }

    /**
     * Per-frame update. If dying, just advances the death animation.
     * Otherwise: animates the mouth, checks if at a tile center to
     * apply queued direction changes, then interpolates toward the
     * target tile center.
     *
     * Movement model: Pac-Man moves toward the center of his current
     * target tile. When he reaches a tile center, the queued direction
     * is tested — if passable, it becomes the active direction. Then
     * the tile coordinates advance by one step in the active direction.
     * Between tile centers, pixel position is interpolated smoothly.
     */
    update(maze) {
        if (this.dying) {
            this.deathFrame++;
            return;
        }

        this.animateMouth();

        // Calculate the pixel center of the current tile
        const cx = this.tileX * TILE + TILE / 2;
        const cy = this.tileY * TILE + TILE / 2;

        // Check if Pac-Man is close enough to the tile center to snap
        const atCenter = Math.abs(this.pixelX - cx) < this.speed &&
                         Math.abs(this.pixelY - cy) < this.speed;

        if (atCenter) {
            // Snap to exact tile center to prevent drift
            this.pixelX = cx;
            this.pixelY = cy;

            // Try to apply the queued direction
            if (this.canMove(this.nextDir, maze)) {
                this.dir = this.nextDir;
            }

            // If current direction is blocked, stop moving
            if (!this.canMove(this.dir, maze)) return;

            // Advance to the next tile in the current direction
            this.tileX += this.dir.x;
            this.tileY += this.dir.y;

            // Horizontal tunnel wrapping — teleport to opposite side
            if (this.tileX < 0) { this.tileX = COLS - 1; this.pixelX = this.tileX * TILE + TILE / 2; }
            if (this.tileX >= COLS) { this.tileX = 0; this.pixelX = this.tileX * TILE + TILE / 2; }
        }

        // Smoothly interpolate pixel position toward the target tile center
        const tx = this.tileX * TILE + TILE / 2;
        const ty = this.tileY * TILE + TILE / 2;
        const dx = tx - this.pixelX;
        const dy = ty - this.pixelY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > this.speed) {
            // Move at constant speed toward target
            this.pixelX += (dx / d) * this.speed;
            this.pixelY += (dy / d) * this.speed;
        } else {
            // Close enough — snap to target
            this.pixelX = tx;
            this.pixelY = ty;
        }
    }

    /**
     * Tests whether Pac-Man can move in the given direction from
     * his current tile. Pac-Man cannot enter walls, ghost house
     * interior, or the ghost gate. Tunnel wrapping (going off-screen
     * horizontally) is always allowed.
     */
    canMove(dir, maze) {
        const nx = this.tileX + dir.x;
        const ny = this.tileY + dir.y;
        if (nx < 0 || nx >= COLS) return true;   // Allow horizontal wrap
        if (ny < 0 || ny >= ROWS) return false;   // Block vertical out-of-bounds
        const cell = maze[ny][nx];
        return cell !== CELL.WALL && cell !== CELL.GHOST_HOUSE && cell !== CELL.GATE;
    }

    /**
     * Oscillates the mouth angle between ~0 (closed) and ~0.9 (wide open).
     * The mouthAngle value is used in 3D rendering to rotate the top
     * and bottom hemisphere halves of the Pac-Man mesh.
     */
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
//  GHOST CLASS
// ============================================================
//  Each ghost has a unique personality defined by its targeting
//  algorithm in chase mode:
//
//    Blinky (red)   — directly targets Pac-Man's current tile
//    Pinky (pink)   — targets 4 tiles ahead of Pac-Man
//    Inky (cyan)    — uses Blinky's position to calculate a
//                     reflected target (complex flanking behavior)
//    Clyde (orange) — chases Pac-Man when far away (>8 tiles),
//                     retreats to scatter corner when close
//
//  Ghost house mechanics:
//    - All ghosts except Blinky start inside the ghost house
//    - Each ghost has a release delay (Pinky: 120, Inky: 300, Clyde: 480 frames)
//    - While in the house, ghosts bob up and down
//    - On release, they teleport to the house exit (tile 14, 11)
// ============================================================

// Ghost type configurations — defines each ghost's unique properties
const GHOST_TYPES = {
    blinky: {
        color: '#ff0000',                    // Red
        scatter: { x: 25, y: -3 },          // Top-right corner (off-screen target)
        homeX: 14, homeY: 11,                // Ghost house exit position
        startX: 14, startY: 11              // Starting position (outside house)
    },
    pinky: {
        color: '#ffb8ff',                    // Pink
        scatter: { x:  2, y: -3 },          // Top-left corner
        homeX: 14, homeY: 14,                // Inside ghost house
        startX: 14, startY: 14
    },
    inky: {
        color: '#00ffff',                    // Cyan
        scatter: { x: 27, y: 34 },          // Bottom-right corner
        homeX: 12, homeY: 14,                // Inside ghost house (left side)
        startX: 12, startY: 14
    },
    clyde: {
        color: '#ffb852',                    // Orange
        scatter: { x:  0, y: 34 },          // Bottom-left corner
        homeX: 16, homeY: 14,                // Inside ghost house (right side)
        startX: 16, startY: 14
    }
};

class Ghost {
    constructor(type) {
        this.type = type;                     // 'blinky', 'pinky', 'inky', or 'clyde'
        this.config = GHOST_TYPES[type];      // Static configuration for this ghost type
        this.reset();
    }

    /**
     * Resets ghost to its starting configuration. Blinky starts
     * outside the house (inHouse = false), all others start inside
     * with a release delay timer.
     */
    reset() {
        this.tileX = this.config.startX;
        this.tileY = this.config.startY;
        this.pixelX = this.tileX * TILE + TILE / 2;
        this.pixelY = this.tileY * TILE + TILE / 2;
        this.dir = DIR.UP;
        this.mode = GHOST_MODE.SCATTER;        // All ghosts start in scatter mode
        this.baseSpeed = 1.6;                  // Normal movement speed (increases per level)
        this.speed = this.baseSpeed;
        this.frightTimer = 0;                  // Countdown frames remaining in frightened mode
        this.inHouse = this.type !== 'blinky'; // Only Blinky starts outside the house
        this.houseTimer = 0;                   // Frames spent waiting in the house

        // Release delay: how many frames each ghost waits before leaving the house
        // Blinky: 0 (already outside), Pinky: 120, Inky: 300, Clyde: 480
        this.releaseDelay = this.type === 'pinky' ? 120 : this.type === 'inky' ? 300 : this.type === 'clyde' ? 480 : 0;
    }

    /**
     * Calculates the target tile for pathfinding based on current mode.
     *
     * SCATTER:    Returns the ghost's assigned corner tile.
     * FRIGHTENED: Returns a random tile (creates erratic movement).
     * CHASE:      Uses ghost-specific targeting (see class docstring).
     *
     * @param {Pacman} pacman - The player, for targeting calculations
     * @param {Ghost} blinky - Blinky ghost reference, needed by Inky's algorithm
     * @returns {{x: number, y: number}} Target tile coordinates
     */
    getTargetTile(pacman, blinky) {
        if (this.mode === GHOST_MODE.SCATTER) {
            return this.config.scatter;
        }
        if (this.mode === GHOST_MODE.FRIGHTENED) {
            return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        }

        switch (this.type) {
            case 'blinky':
                // Blinky: direct pursuit — target is Pac-Man's exact tile
                return { x: pacman.tileX, y: pacman.tileY };

            case 'pinky':
                // Pinky: ambush — targets 4 tiles ahead of Pac-Man's facing direction
                return { x: pacman.tileX + pacman.dir.x * 4, y: pacman.tileY + pacman.dir.y * 4 };

            case 'inky': {
                // Inky: flanking — takes a point 2 tiles ahead of Pac-Man,
                // then doubles the vector from Blinky to that point.
                // This creates a pincer movement with Blinky.
                const ahead2X = pacman.tileX + pacman.dir.x * 2;
                const ahead2Y = pacman.tileY + pacman.dir.y * 2;
                return { x: ahead2X + (ahead2X - blinky.tileX), y: ahead2Y + (ahead2Y - blinky.tileY) };
            }

            case 'clyde': {
                // Clyde: shy — chases Pac-Man when far away (>8 tiles),
                // but retreats to his scatter corner when too close
                const dist = distance(this.tileX, this.tileY, pacman.tileX, pacman.tileY);
                if (dist > 8) return { x: pacman.tileX, y: pacman.tileY };
                return this.config.scatter;
            }
        }
    }

    /**
     * Per-frame ghost update. Handles:
     *   1. Ghost house waiting and release
     *   2. Eaten mode — fast return to ghost house, then resume scatter
     *   3. Frightened mode — slow speed, countdown timer
     *   4. Tile-center decision making — choose best direction toward target
     *   5. Smooth pixel interpolation between tiles
     *   6. Horizontal tunnel wrapping
     */
    update(maze, pacman, blinky) {
        // --- Ghost house logic ---
        if (this.inHouse) {
            this.houseTimer++;
            if (this.houseTimer >= this.releaseDelay) {
                // Release: teleport to house exit and start moving left
                this.inHouse = false;
                this.tileX = 14;
                this.tileY = 11;
                this.pixelX = this.tileX * TILE + TILE / 2;
                this.pixelY = this.tileY * TILE + TILE / 2;
                this.dir = DIR.LEFT;
            } else {
                // Still waiting — bob up and down inside the house
                this.bobInHouse();
                return;
            }
        }

        // --- Eaten mode: rush back to ghost house at high speed ---
        if (this.mode === GHOST_MODE.EATEN) {
            this.speed = 4;  // 2.5× normal speed
            const homeX = 14;
            const homeY = 11;
            // Check if we've reached the ghost house entrance
            if (this.tileX === homeX && this.tileY === homeY &&
                Math.abs(this.pixelX - (homeX * TILE + TILE / 2)) < 2 &&
                Math.abs(this.pixelY - (homeY * TILE + TILE / 2)) < 2) {
                // Arrived — resume normal behavior
                this.mode = GHOST_MODE.SCATTER;
                this.speed = this.baseSpeed;
            }
        }

        // --- Frightened mode: slow down, count down timer ---
        if (this.mode === GHOST_MODE.FRIGHTENED) {
            this.speed = 1.0;  // ~60% of normal speed
            this.frightTimer--;
            if (this.frightTimer <= 0) {
                // Frightened period expired — return to scatter
                this.mode = GHOST_MODE.SCATTER;
                this.speed = this.baseSpeed;
            }
        }

        // --- Tile-center decision point ---
        const cx = this.tileX * TILE + TILE / 2;
        const cy = this.tileY * TILE + TILE / 2;
        const atCenter = Math.abs(this.pixelX - cx) < this.speed &&
                         Math.abs(this.pixelY - cy) < this.speed;

        if (atCenter) {
            this.pixelX = cx;
            this.pixelY = cy;

            // Eaten ghosts target the house entrance; others use their AI target
            const target = this.mode === GHOST_MODE.EATEN
                ? { x: 14, y: 11 }
                : this.getTargetTile(pacman, blinky);

            // Choose the best direction toward the target tile
            this.dir = this.chooseDirection(maze, target);

            // Advance to the next tile
            this.tileX += this.dir.x;
            this.tileY += this.dir.y;

            // Horizontal tunnel wrapping
            if (this.tileX < 0) { this.tileX = COLS - 1; this.pixelX = this.tileX * TILE + TILE / 2; }
            if (this.tileX >= COLS) { this.tileX = 0; this.pixelX = this.tileX * TILE + TILE / 2; }
        }

        // --- Smooth pixel interpolation toward target tile center ---
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

    /**
     * Ghost pathfinding: at each intersection, evaluate all possible
     * directions (excluding reverse) and pick the one whose next tile
     * is closest to the target. This is the classic Pac-Man ghost AI —
     * greedy, not optimal, which creates predictable-but-challenging behavior.
     *
     * Priority order when distances tie: UP > LEFT > DOWN > RIGHT
     * (matches the original arcade behavior).
     *
     * Eaten ghosts can pass through the ghost house and gate tiles;
     * normal ghosts cannot.
     */
    chooseDirection(maze, target) {
        const dirs = [DIR.UP, DIR.LEFT, DIR.DOWN, DIR.RIGHT];
        const opp = oppositeDir(this.dir);  // Ghosts cannot reverse
        let bestDir = this.dir;
        let bestDist = Infinity;

        for (const d of dirs) {
            if (d === opp) continue;  // Skip reverse direction

            let nx = this.tileX + d.x;
            let ny = this.tileY + d.y;

            // Handle tunnel wrapping for pathfinding
            if (nx < 0) nx = COLS - 1;
            else if (nx >= COLS) nx = 0;
            if (ny < 0 || ny >= ROWS) continue;

            const cell = maze[ny][nx];

            // Eaten ghosts can pass through ghost house and gate; others cannot
            const passable = this.mode === GHOST_MODE.EATEN
                ? cell !== CELL.WALL
                : cell !== CELL.WALL && cell !== CELL.GHOST_HOUSE && cell !== CELL.GATE;
            if (!passable) continue;

            // Pick the direction that minimizes Euclidean distance to target
            const dist = distance(nx, ny, target.x, target.y);
            if (dist < bestDist) {
                bestDist = dist;
                bestDir = d;
            }
        }
        return bestDir;
    }

    /**
     * Animates a gentle vertical bobbing motion while the ghost
     * waits inside the ghost house. Uses a sine wave based on
     * the house timer for smooth oscillation.
     */
    bobInHouse() {
        const baseY = this.tileY * TILE + TILE / 2;
        this.pixelY = baseY + Math.sin(this.houseTimer * 0.08) * 4;
    }

    /**
     * Transitions the ghost into frightened mode (triggered by
     * Pac-Man eating a power pellet). Eaten ghosts are immune.
     * The ghost reverses direction and slows down for 360 frames (~6 seconds).
     */
    enterFrightened() {
        if (this.mode === GHOST_MODE.EATEN) return;  // Can't frighten an eaten ghost
        this.mode = GHOST_MODE.FRIGHTENED;
        this.frightTimer = 360;                       // ~6 seconds at 60fps
        this.dir = oppositeDir(this.dir);             // Reverse direction immediately
    }
}


// ============================================================
//  3D MESH BUILDERS
// ============================================================
//  Procedurally generates Three.js meshes for game entities.
//  No external model files are needed — everything is built
//  from primitive geometries (spheres, cylinders, boxes).
// ============================================================

/**
 * Creates the Pac-Man 3D mesh as a Group containing:
 *   - Top hemisphere (rotates upward for mouth opening)
 *   - Bottom hemisphere (rotates downward for mouth opening)
 *   - A yellow point light for a subtle glow effect
 *
 * The two hemispheres are stored in userData so the Game class
 * can animate the mouth by rotating them each frame.
 *
 * @returns {THREE.Group} The Pac-Man mesh group
 */
function createPacmanMesh() {
    const group = new THREE.Group();

    const topGeo = new THREE.SphereGeometry(0.45, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    const bottomGeo = new THREE.SphereGeometry(0.45, 32, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);

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

    // Eyes parented to topHalf so they move with the upper jaw
    const eyeGeo = new THREE.SphereGeometry(0.055, 10, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.0 });
    const eyeHighlightGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const eyeHighlightMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5
    });
    for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(side * 0.16, 0.08, 0.36);
        topHalf.add(eye);
        const highlight = new THREE.Mesh(eyeHighlightGeo, eyeHighlightMat);
        highlight.position.set(0.02, 0.02, 0.03);
        eye.add(highlight);
    }

    // Dark mouth interior visible when jaws open
    const mouthInteriorGeo = new THREE.SphereGeometry(0.3, 16, 12);
    const mouthInteriorMat = new THREE.MeshStandardMaterial({
        color: 0x440000, emissive: 0x220000, emissiveIntensity: 0.2,
        roughness: 0.9, metalness: 0.0, side: THREE.BackSide
    });
    const mouthInterior = new THREE.Mesh(mouthInteriorGeo, mouthInteriorMat);
    mouthInterior.position.set(0, 0, 0.05);
    mouthInterior.scale.set(1, 0.5, 1);
    group.add(mouthInterior);

    group.userData.topHalf = topHalf;
    group.userData.bottomHalf = bottomHalf;
    group.userData.mouthInterior = mouthInterior;

    const light = new THREE.PointLight(0xffff00, 0.4, 4);
    light.position.set(0, 0.3, 0);
    group.add(light);
    group.userData.light = light;

    return group;
}

/**
 * Creates a ghost 3D mesh as a Group containing:
 *   - Body group: dome head + cylindrical skirt + tentacle bumps at the bottom
 *   - Eye group: white eyeballs with blue pupils (normal face)
 *   - Frightened face group: small white dots for eyes + wavy mouth line
 *
 * The mesh supports three visual states:
 *   - Normal: colored body + eyes visible
 *   - Frightened: blue body + frightened face (flashes white when expiring)
 *   - Eaten: body hidden, only eyes visible (floating back to ghost house)
 *
 * Materials and sub-groups are stored in userData for runtime state switching.
 *
 * @param {number} colorHex - The ghost's color as a hex integer (e.g., 0xff0000)
 * @returns {THREE.Group} The ghost mesh group
 */
function createGhostMesh(colorHex) {
    const group = new THREE.Group();

    const bodyGroup = new THREE.Group();

    // Dome head with higher poly count for smoother appearance
    const headGeo = new THREE.SphereGeometry(0.4, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2);
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

    // Tapered skirt — slightly wider at the bottom for the classic ghost silhouette
    const skirtGeo = new THREE.CylinderGeometry(0.4, 0.42, 0.45, 28);
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

    // Scalloped tentacles arranged in a circle around the bottom
    const tentacleGeo = new THREE.SphereGeometry(0.14, 10, 8);
    const tentacleMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.15,
        roughness: 0.4
    });
    const tentacles = [];
    const tentacleCount = 8;
    for (let i = 0; i < tentacleCount; i++) {
        const angle = (i / tentacleCount) * Math.PI * 2;
        const tx = Math.cos(angle) * 0.3;
        const tz = Math.sin(angle) * 0.3;
        const t = new THREE.Mesh(tentacleGeo, tentacleMat);
        t.position.set(tx, -0.4, tz);
        t.scale.set(1, 0.7, 1);
        bodyGroup.add(t);
        tentacles.push(t);
    }

    group.add(bodyGroup);

    // --- Eyes with trackable pupils ---
    const eyeGroup = new THREE.Group();
    const eyeWhiteGeo = new THREE.SphereGeometry(0.11, 12, 10);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.15, metalness: 0.0
    });
    const pupilGeo = new THREE.SphereGeometry(0.06, 10, 8);
    const pupilMat = new THREE.MeshStandardMaterial({
        color: 0x1111cc, roughness: 0.15, metalness: 0.0
    });

    const pupils = [];
    for (const side of [-1, 1]) {
        const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        eyeWhite.position.set(side * 0.16, 0.12, 0.32);
        eyeWhite.scale.set(1, 1.25, 0.85);
        eyeGroup.add(eyeWhite);

        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.set(side * 0.16, 0.1, 0.39);
        eyeGroup.add(pupil);
        pupils.push(pupil);
    }
    group.add(eyeGroup);

    // --- Frightened face with wavy mouth ---
    const frightenedFaceGroup = new THREE.Group();
    const fEyeGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const fEyeMat = new THREE.MeshStandardMaterial({
        color: 0xffcccc, emissive: 0xffcccc, emissiveIntensity: 0.3
    });
    for (const side of [-1, 1]) {
        const fEye = new THREE.Mesh(fEyeGeo, fEyeMat);
        fEye.position.set(side * 0.12, 0.12, 0.38);
        frightenedFaceGroup.add(fEye);
    }
    // Wavy mouth made of small segments for a zig-zag look
    const fMouthMat = new THREE.MeshStandardMaterial({
        color: 0xffcccc, emissive: 0xffcccc, emissiveIntensity: 0.3
    });
    const mouthSegGeo = new THREE.BoxGeometry(0.06, 0.025, 0.025);
    const mouthSegments = 6;
    for (let i = 0; i < mouthSegments; i++) {
        const seg = new THREE.Mesh(mouthSegGeo, fMouthMat);
        const xOff = (i - (mouthSegments - 1) / 2) * 0.055;
        const yOff = (i % 2 === 0) ? 0.015 : -0.015;
        seg.position.set(xOff, -0.06 + yOff, 0.4);
        frightenedFaceGroup.add(seg);
    }
    frightenedFaceGroup.visible = false;
    group.add(frightenedFaceGroup);

    group.userData.bodyGroup = bodyGroup;
    group.userData.eyeGroup = eyeGroup;
    group.userData.frightenedFaceGroup = frightenedFaceGroup;
    group.userData.headMat = headMat;
    group.userData.skirtMat = skirtMat;
    group.userData.tentacleMat = tentacleMat;
    group.userData.originalColor = colorHex;
    group.userData.tentacles = tentacles;
    group.userData.pupils = pupils;

    return group;
}


// ============================================================
//  AUDIO MANAGER
// ============================================================
//  Synthesizes all game audio using the Web Audio API.
//  No audio files are loaded — everything is generated from
//  oscillators (sine, square, sawtooth, triangle waves).
//
//  Audio graph:
//    oscillators → sfxGain (0.35) ──┐
//    melody loop → musicGain (0.25) ┼→ masterGain (0/1) → destination
//
//  The masterGain node acts as a mute switch (0 or 1).
//  Mute preference is persisted in localStorage.
// ============================================================

class AudioManager {
    constructor() {
        this.ctx = null;              // AudioContext (created lazily on first interaction)
        this.masterGain = null;       // Master volume node (0 = muted, 1 = unmuted)
        this.musicGain = null;        // Background music volume (0.25)
        this.sfxGain = null;          // Sound effects volume (0.35)
        this.muted = localStorage.getItem('pacman-mute') === '1';
        this.sirenNodes = null;       // Active melody loop nodes
        this.frightenedNodes = null;  // Active frightened music nodes
        this.currentMusic = null;     // 'siren' | 'frightened' | null
        this.wakaHigh = false;        // Alternates dot-eat pitch (waka-waka effect)
        this._resumed = false;        // Whether AudioContext has been resumed after user gesture
    }

    /**
     * Lazily creates the AudioContext and gain node chain.
     * Called before any audio operation. The AudioContext is created
     * on demand because browsers require a user gesture before
     * allowing audio playback.
     */
    _ensureContext() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Master gain — controls mute/unmute
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 1;
        this.masterGain.connect(this.ctx.destination);

        // Music gain — lower volume for background music
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.25;
        this.musicGain.connect(this.masterGain);

        // SFX gain — slightly louder for sound effects
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.35;
        this.sfxGain.connect(this.masterGain);
    }

    /**
     * Resumes the AudioContext if it was suspended (browsers suspend
     * AudioContext until a user gesture like click/tap/keypress).
     * Called on every user interaction to ensure audio works.
     */
    resume() {
        this._ensureContext();
        if (!this._resumed && this.ctx.state === 'suspended') {
            this.ctx.resume();
            this._resumed = true;
        }
    }

    /**
     * Toggles mute on/off. Persists the preference to localStorage.
     * Uses setTargetAtTime for a smooth 20ms fade to avoid clicks.
     * @returns {boolean} The new muted state
     */
    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('pacman-mute', this.muted ? '1' : '0');
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
        }
        return this.muted;
    }

    /**
     * Helper to create an oscillator + gain node pair.
     * Connects osc → gain → destination (defaults to sfxGain).
     * Returns both nodes so the caller can schedule start/stop and envelopes.
     *
     * @param {string} type - Oscillator waveform: 'sine', 'square', 'sawtooth', 'triangle'
     * @param {number} freq - Frequency in Hz
     * @param {number} gainVal - Initial gain value (0-1)
     * @param {AudioNode} [dest] - Destination node (defaults to this.sfxGain)
     * @returns {{osc: OscillatorNode, gain: GainNode}}
     */
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

    /**
     * Starts the main background melody — a looping chiptune-style
     * sequence using square and triangle waves. The tempo increases
     * slightly with each level (shorter note duration).
     *
     * Uses Web Audio scheduling: notes are pre-scheduled in batches
     * for sample-accurate timing, with a setTimeout to schedule the
     * next loop iteration before the current one finishes.
     *
     * @param {number} level - Current game level (affects tempo)
     */
    startSiren(level) {
        this._ensureContext();
        this.stopMusic();

        // Dedicated gain bus for the melody so we can disconnect it cleanly
        const melodyBus = this.ctx.createGain();
        melodyBus.gain.value = 1;
        melodyBus.connect(this.musicGain);

        // 32-note melody sequence (frequencies in Hz)
        // C5, D5, E5, G5, E5, G5, A5, G5, E5, D5, C5, D5, E5, C5, A4, C5, ...
        const melody = [
            523, 587, 659, 784,  659, 784, 880, 784,
            659, 587, 523, 587,  659, 523, 440, 523,
            587, 659, 784, 880,  784, 659, 587, 659,
            784, 880, 988, 880,  784, 659, 587, 523
        ];

        // Note duration decreases with level for increasing urgency
        const noteDur = Math.max(0.1, 0.16 - level * 0.005);
        const loopDur = melody.length * noteDur;

        this._melodyCancel = false;

        /**
         * Schedules one full loop of the melody starting at the given time.
         * Each note is a short square wave with a triangle sub-octave for richness.
         * Gain envelopes create a staccato feel (attack → quick decay).
         */
        const scheduleLoop = (startTime) => {
            if (this._melodyCancel) return;
            melody.forEach((freq, i) => {
                const noteStart = startTime + i * noteDur;

                // Primary voice: square wave at melody pitch
                const { osc, gain } = this._osc('square', freq, 0, melodyBus);
                gain.gain.setValueAtTime(0.28, noteStart);
                gain.gain.setTargetAtTime(0, noteStart + noteDur * 0.65, noteDur * 0.12);
                osc.start(noteStart);
                osc.stop(noteStart + noteDur);

                // Secondary voice: triangle wave one octave below for warmth
                const { osc: o2, gain: g2 } = this._osc('triangle', freq * 0.5, 0, melodyBus);
                g2.gain.setValueAtTime(0.12, noteStart);
                g2.gain.setTargetAtTime(0, noteStart + noteDur * 0.6, noteDur * 0.1);
                o2.start(noteStart);
                o2.stop(noteStart + noteDur);
            });

            // Schedule the next loop iteration 200ms before the current one ends
            const nextStart = startTime + loopDur;
            const delay = (nextStart - this.ctx.currentTime - 0.2) * 1000;
            this._melodyTimer = setTimeout(() => scheduleLoop(nextStart), Math.max(delay, 50));
        };

        scheduleLoop(this.ctx.currentTime + 0.05);
        this.sirenNodes = { melodyBus };
        this.currentMusic = 'siren';
    }

    // ---- Background music: frightened mode ----

    /**
     * Starts the frightened-mode background music — an eerie warbling
     * sound using frequency-modulated oscillators. Two voices:
     *   1. Square wave at 220Hz modulated by an 8Hz square LFO (±80Hz)
     *   2. Sawtooth wave at 330Hz modulated by a 6Hz sine LFO (±50Hz)
     * This creates a pulsating, unsettling atmosphere.
     */
    startFrightened() {
        this._ensureContext();
        this.stopMusic();
        const t = this.ctx.currentTime;

        // Voice 1: square wave with aggressive square-wave FM
        const o1 = this._osc('square', 220, 0.3, this.musicGain);
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'square';
        lfo.frequency.value = 8;      // 8Hz modulation rate
        lfoGain.gain.value = 80;      // ±80Hz frequency deviation
        lfo.connect(lfoGain);
        lfoGain.connect(o1.osc.frequency);  // Modulate the carrier frequency

        // Voice 2: sawtooth wave with gentler sine FM
        const o2 = this._osc('sawtooth', 330, 0.15, this.musicGain);
        const lfo2 = this.ctx.createOscillator();
        const lfo2Gain = this.ctx.createGain();
        lfo2.type = 'sine';
        lfo2.frequency.value = 6;     // 6Hz modulation rate
        lfo2Gain.gain.value = 50;     // ±50Hz frequency deviation
        lfo2.connect(lfo2Gain);
        lfo2Gain.connect(o2.osc.frequency);

        // Start all oscillators simultaneously
        o1.osc.start(t);
        lfo.start(t);
        o2.osc.start(t);
        lfo2.start(t);

        // Store all nodes for cleanup
        this.frightenedNodes = {
            osc1: o1.osc, gain1: o1.gain, lfo, lfoGain,
            osc2: o2.osc, gain2: o2.gain, lfo2, lfo2Gain
        };
        this.currentMusic = 'frightened';
    }

    /**
     * Stops whatever background music is currently playing.
     * Disconnects and cleans up all associated audio nodes.
     * Safe to call even if no music is playing.
     */
    stopMusic() {
        // Clean up melody loop
        if (this.sirenNodes) {
            this._melodyCancel = true;
            if (this._melodyTimer) {
                clearTimeout(this._melodyTimer);
                this._melodyTimer = null;
            }
            try { this.sirenNodes.melodyBus.disconnect(); } catch (e) {}
            this.sirenNodes = null;
        }

        // Clean up frightened music
        if (this.frightenedNodes) {
            const t = this.ctx ? this.ctx.currentTime : 0;
            try {
                // Immediately silence, then stop oscillators
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

    /**
     * Plays the dot-eating "waka" sound. Alternates between two
     * pitches (D5 and C5) to create the classic waka-waka rhythm.
     * Short sine wave with a quick downward pitch bend.
     */
    playDotEat() {
        this._ensureContext();
        const t = this.ctx.currentTime;
        const freq = this.wakaHigh ? 587.33 : 523.25;  // D5 or C5
        this.wakaHigh = !this.wakaHigh;  // Alternate for next call

        const { osc, gain } = this._osc('sine', freq, 0.6);
        osc.frequency.setTargetAtTime(freq * 0.7, t + 0.03, 0.02);  // Pitch drops 30%
        gain.gain.setTargetAtTime(0, t + 0.06, 0.02);                // Quick fade out
        osc.start(t);
        osc.stop(t + 0.12);
    }

    /**
     * Plays the power pellet collection sound — a dramatic descending
     * sweep. Two layered voices (square + sine) with exponential
     * frequency ramps from high to low.
     */
    playPowerPellet() {
        this._ensureContext();
        const t = this.ctx.currentTime;

        // Primary: square wave 800Hz → 200Hz
        const { osc, gain } = this._osc('square', 800, 0.5);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.25);
        gain.gain.setTargetAtTime(0, t + 0.2, 0.04);
        osc.start(t);
        osc.stop(t + 0.35);

        // Secondary: sine wave 600Hz → 150Hz (slightly delayed)
        const { osc: o2, gain: g2 } = this._osc('sine', 600, 0.3);
        o2.frequency.exponentialRampToValueAtTime(150, t + 0.3);
        g2.gain.setTargetAtTime(0, t + 0.25, 0.04);
        o2.start(t + 0.02);
        o2.stop(t + 0.4);
    }

    /**
     * Plays the ghost-eaten sound — an ascending chirp that gets
     * higher with each consecutive ghost eaten (combo multiplier).
     * Two voices: square wave + sine wave, both sweeping upward.
     *
     * @param {number} combo - How many ghosts eaten in this power pellet (1-4)
     */
    playGhostEaten(combo) {
        this._ensureContext();
        const t = this.ctx.currentTime;
        const baseFreq = 300 + combo * 150;  // Higher pitch for bigger combos

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

    /**
     * Plays the Pac-Man death sound — a descending chromatic scale
     * (C5 down to A3) using sawtooth waves, followed by a low
     * sine tail that fades out. Stops any background music first.
     */
    playDeath() {
        this._ensureContext();
        this.stopMusic();
        const t = this.ctx.currentTime;

        // Descending chromatic notes from C5 (523Hz) to A3 (220Hz)
        const notes = [523, 494, 466, 440, 415, 392, 370, 349, 330, 311, 294, 277, 262, 247, 233, 220];

        notes.forEach((freq, i) => {
            const { osc, gain } = this._osc('sawtooth', freq, 0.4);
            const start = t + i * 0.08;  // 80ms per note
            gain.gain.setValueAtTime(0.4, start);
            gain.gain.setTargetAtTime(0, start + 0.06, 0.015);
            osc.start(start);
            osc.stop(start + 0.1);
        });

        // Low sine tail — sweeps from 220Hz down to 60Hz
        const { osc: tail, gain: tGain } = this._osc('sine', 220, 0.3);
        const tailStart = t + notes.length * 0.08;
        tail.frequency.exponentialRampToValueAtTime(60, tailStart + 0.5);
        tGain.gain.setTargetAtTime(0, tailStart + 0.3, 0.1);
        tail.start(tailStart);
        tail.stop(tailStart + 0.7);
    }

    /**
     * Plays the level-complete fanfare — an ascending C major scale
     * (C5 to C6) with harmonics. Two voices per note: square wave
     * at the fundamental + sine wave at 1.5× (a fifth above).
     */
    playLevelComplete() {
        this._ensureContext();
        this.stopMusic();
        const t = this.ctx.currentTime;
        const melody = [523, 587, 659, 698, 784, 880, 988, 1047];  // C5 to C6

        melody.forEach((freq, i) => {
            const { osc, gain } = this._osc('square', freq, 0.35);
            const start = t + i * 0.1;  // 100ms per note
            gain.gain.setValueAtTime(0.35, start);
            gain.gain.setTargetAtTime(0, start + 0.08, 0.015);
            osc.start(start);
            osc.stop(start + 0.12);

            // Harmonic at a perfect fifth above
            const { osc: o2, gain: g2 } = this._osc('sine', freq * 1.5, 0.15);
            g2.gain.setValueAtTime(0.15, start);
            g2.gain.setTargetAtTime(0, start + 0.08, 0.015);
            o2.start(start + 0.01);
            o2.stop(start + 0.13);
        });
    }

    /**
     * Plays the "READY!" jingle before each round starts.
     * A short ascending arpeggio: G4, C5, E5, C5+E5, G5.
     * Rests (freq=0) create rhythmic gaps between notes.
     */
    playReady() {
        this._ensureContext();
        const t = this.ctx.currentTime;
        const notes =    [392, 0, 523, 0, 659, 0, 523, 659, 784];
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

    /**
     * Plays the game-over sound — a slow descending scale (G4 to C4)
     * using sawtooth waves with a triangle sub-octave for a somber,
     * heavy tone. Stops any background music first.
     */
    playGameOver() {
        this._ensureContext();
        this.stopMusic();
        const t = this.ctx.currentTime;
        const notes = [392, 370, 349, 330, 311, 294, 262];  // G4 down to C4

        notes.forEach((freq, i) => {
            // Primary: sawtooth wave
            const { osc, gain } = this._osc('sawtooth', freq, 0.3);
            const start = t + i * 0.18;  // 180ms per note (slower = more somber)
            gain.gain.setValueAtTime(0.3, start);
            gain.gain.setTargetAtTime(0, start + 0.14, 0.03);
            osc.start(start);
            osc.stop(start + 0.22);

            // Sub-octave: triangle wave for weight
            const { osc: o2, gain: g2 } = this._osc('triangle', freq * 0.5, 0.2);
            g2.gain.setValueAtTime(0.2, start);
            g2.gain.setTargetAtTime(0, start + 0.14, 0.03);
            o2.start(start);
            o2.stop(start + 0.22);
        });
    }
}


// ============================================================
//  GAME CLASS
// ============================================================
//  The main orchestrator. Manages:
//    - Three.js scene, renderer, cameras, and lighting
//    - 3D maze construction from the tile grid
//    - Entity creation and synchronization (Pac-Man, ghosts)
//    - Game state machine (start → ready → playing → death/level complete)
//    - Input handling (keyboard + touch)
//    - Collision detection (dots, power pellets, ghosts)
//    - Ghost mode scheduling (scatter ↔ chase phases)
//    - HUD updates (score, lives, level)
//    - Multi-viewport rendering (main view + minimap + secondary cameras)
//    - The main game loop (update → render at ~60fps via requestAnimationFrame)
// ============================================================

class Game {
    constructor() {
        // --- DOM element references ---
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
        this.resetConfirmEl = document.getElementById('reset-confirm');
        this.resetConfirmVisible = false;

        // --- Load persisted high score from localStorage ---
        this.highScore = parseInt(localStorage.getItem('pacman-high') || '0', 10);
        this.highScoreEl.textContent = this.highScore;

        // --- Game state initialization ---
        this.state = STATE.START;      // Begin on the title screen
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.globalTimer = 0;          // Monotonically increasing frame counter
        this.stateTimer = 0;           // Frames since entering current state
        this.ghostsEatenCombo = 0;     // Consecutive ghosts eaten during one power pellet
        this.modeTimer = 0;            // Frames in current scatter/chase phase
        this.modePhase = 0;            // Index into the scatter/chase schedule

        // --- Maze setup ---
        this.maze = copyMaze();        // Working copy of the maze (dots get removed)
        this.totalDots = 0;            // Total dots + power pellets in the maze
        this.dotsEaten = 0;            // How many have been eaten this level
        this.countDots();

        // --- Entity creation ---
        this.pacman = new Pacman();
        this.ghosts = [
            new Ghost('blinky'),       // Red — direct chaser
            new Ghost('pinky'),        // Pink — ambusher
            new Ghost('inky'),         // Cyan — flanker (uses Blinky's position)
            new Ghost('clyde')         // Orange — shy (retreats when close)
        ];

        // --- Audio ---
        this.audio = new AudioManager();
        this.frightenedActive = false; // Tracks whether frightened music is playing

        // --- Initialize everything and start the game loop ---
        this.initThreeJS();            // Create scene, renderer, lights
        this.buildMaze3D();            // Generate 3D maze geometry
        this.createPacman3D();         // Create Pac-Man mesh
        this.createGhosts3D();         // Create ghost meshes
        this.setupCameras();           // Initialize camera system
        this.setupInput();             // Bind keyboard and touch handlers
        this.showOverlay('PAC-MAN', 'Tap or press any key to start');
        this.updateHUD();
        this.updateMuteLabel();
        this.loop();                   // Start the requestAnimationFrame loop
    }

    // --------------------------------------------------------
    //  THREE.JS INITIALIZATION
    // --------------------------------------------------------

    /**
     * Sets up the Three.js scene, renderer, and lighting.
     *
     * Scene: dark blue-black background with exponential fog for
     * depth atmosphere (especially visible in third-person view).
     *
     * Renderer: WebGL with antialiasing, shadow maps (PCF soft),
     * and manual clear (autoClear: false) for multi-viewport rendering.
     *
     * Lighting:
     *   - Ambient light (dim blue-purple) for base illumination
     *   - Directional light (white) as the main shadow-casting light
     *   - Fill light (blue) from the opposite side to soften shadows
     */
    initThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);  // Very dark blue-black
        this.scene.fog = new THREE.FogExp2(0x050510, 0.015);
        this._baseFogDensity = 0.015;

        // --- WebGL Renderer ---
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));  // Cap at 2× for performance
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.autoClear = false;  // We clear manually for multi-viewport
        document.body.prepend(this.renderer.domElement);  // Insert canvas before the game-container div

        // --- Ambient light: dim blue-purple base illumination ---
        const ambient = new THREE.AmbientLight(0x333355, 0.6);
        this.scene.add(ambient);

        // --- Main directional light: white, casts shadows ---
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(5, 20, 5);
        dirLight.castShadow = true;
        // Shadow camera frustum sized to cover the entire maze
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 50;
        this.scene.add(dirLight);

        // --- Fill light: blue, from the opposite side to soften shadows ---
        const fillLight = new THREE.DirectionalLight(0x4444ff, 0.2);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);

        // --- Handle window resize ---
        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.updateCameraAspect();
        });
    }

    // --------------------------------------------------------
    //  3D MAZE CONSTRUCTION
    // --------------------------------------------------------

    _createWallTexture() {
        const size = 128;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#2121de';
        ctx.fillRect(0, 0, size, size);

        // Horizontal circuit traces
        ctx.strokeStyle = 'rgba(80, 80, 255, 0.35)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const y = 10 + i * 20 + (i % 2) * 6;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size * 0.3, y);
            ctx.lineTo(size * 0.35, y + 8);
            ctx.lineTo(size * 0.65, y + 8);
            ctx.lineTo(size * 0.7, y);
            ctx.lineTo(size, y);
            ctx.stroke();
        }

        // Vertical traces
        for (let i = 0; i < 4; i++) {
            const x = 20 + i * 28;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size * 0.4);
            ctx.lineTo(x + 6, size * 0.45);
            ctx.lineTo(x + 6, size * 0.7);
            ctx.lineTo(x, size * 0.75);
            ctx.lineTo(x, size);
            ctx.stroke();
        }

        // Junction nodes
        ctx.fillStyle = 'rgba(100, 100, 255, 0.5)';
        for (let i = 0; i < 8; i++) {
            const nx = 15 + (i * 37) % size;
            const ny = 12 + (i * 43) % size;
            ctx.beginPath();
            ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Subtle grid overlay
        ctx.strokeStyle = 'rgba(40, 40, 180, 0.2)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < size; i += 16) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    _createWallBumpMap() {
        const size = 128;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, size, size);

        // Raised brick pattern
        ctx.fillStyle = '#999999';
        for (let row = 0; row < 8; row++) {
            const offset = (row % 2) * 8;
            for (let col = 0; col < 8; col++) {
                ctx.fillRect(col * 16 + offset + 1, row * 16 + 1, 14, 14);
            }
        }

        // Circuit trace grooves (darker = indented)
        ctx.strokeStyle = '#606060';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const y = 12 + i * 24;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size * 0.4, y);
            ctx.lineTo(size * 0.5, y + 6);
            ctx.lineTo(size, y + 6);
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    _createFloorTexture() {
        const tileSize = 16;
        const w = COLS * tileSize;
        const h = ROWS * tileSize;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, w, h);

        // Tile grid lines
        ctx.strokeStyle = 'rgba(30, 30, 80, 0.6)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath(); ctx.moveTo(x * tileSize, 0); ctx.lineTo(x * tileSize, h); ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath(); ctx.moveTo(0, y * tileSize); ctx.lineTo(w, y * tileSize); ctx.stroke();
        }

        // Subtle dot at each grid intersection
        ctx.fillStyle = 'rgba(40, 40, 120, 0.4)';
        for (let x = 0; x <= COLS; x++) {
            for (let y = 0; y <= ROWS; y++) {
                ctx.beginPath();
                ctx.arc(x * tileSize, y * tileSize, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Faint radial gradient from center
        const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
        grd.addColorStop(0, 'rgba(20, 20, 60, 0.15)');
        grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        return tex;
    }

    _isGhostHouseWall(x, y) {
        return y >= 12 && y <= 16 && x >= 10 && x <= 17
            && this.maze[y][x] === CELL.WALL;
    }

    _isBoundaryWall(x, y) {
        return y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1;
    }

    _tileIsWall(x, y) {
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
        return this.maze[y][x] === CELL.WALL;
    }

    /**
     * Generates the 3D representation of the maze from the tile grid.
     * Called once at startup and again when advancing to a new level
     * (to restore all dots).
     *
     * Creates:
     *   - A textured floor plane with grid pattern
     *   - Wall blocks with procedural circuit-board textures and height variation
     *   - Neon edge strips along exposed wall tops
     *   - Beveled wall top caps
     *   - Small glowing spheres for DOT tiles
     *   - Larger pulsing spheres with point lights for POWER pellet tiles
     *   - Decorated ghost house with tinted walls and glowing gate
     *
     * Dot and power pellet meshes are stored in dictionaries keyed
     * by "x,y" so they can be hidden when eaten.
     */
    buildMaze3D() {
        if (this.mazeGroup) this.scene.remove(this.mazeGroup);
        this.mazeGroup = new THREE.Group();
        this.dotMeshes = {};
        this.powerMeshes = {};

        // --- Procedural textures ---
        const wallTex = this._createWallTexture();
        const wallBump = this._createWallBumpMap();
        const floorTex = this._createFloorTexture();

        // --- Textured floor plane ---
        const floorGeo = new THREE.PlaneGeometry(COLS + 2, ROWS + 2);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a1a,
            map: floorTex,
            roughness: 0.85,
            metalness: 0.3
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, -0.5, 0);
        floor.receiveShadow = true;
        this.mazeGroup.add(floor);

        // --- Wall geometries for different heights ---
        const WALL_H_OUTER = 1.0;
        const WALL_H_INNER = 0.8;
        const WALL_H_GHOST = 0.6;
        const wallGeoOuter = new THREE.BoxGeometry(1, WALL_H_OUTER, 1);
        const wallGeoInner = new THREE.BoxGeometry(1, WALL_H_INNER, 1);
        const wallGeoGhost = new THREE.BoxGeometry(1, WALL_H_GHOST, 1);

        // --- Wall top cap geometries (slightly wider bevel) ---
        const capH = 0.06;
        const capOverhang = 1.06;
        const capGeoOuter = new THREE.BoxGeometry(capOverhang, capH, capOverhang);
        const capGeoInner = new THREE.BoxGeometry(capOverhang, capH, capOverhang);
        const capGeoGhost = new THREE.BoxGeometry(capOverhang, capH, capOverhang);

        // --- Wall materials ---
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x2121de,
            emissive: 0x0a0a6e,
            emissiveIntensity: 0.4,
            roughness: 0.45,
            metalness: 0.2,
            map: wallTex,
            bumpMap: wallBump,
            bumpScale: 0.15
        });
        this.wallMat = wallMat;

        const wallCapMat = new THREE.MeshStandardMaterial({
            color: 0x3535ee,
            emissive: 0x1515aa,
            emissiveIntensity: 0.3,
            roughness: 0.3,
            metalness: 0.4
        });
        this.wallCapMat = wallCapMat;

        const ghostHouseWallMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a8e,
            emissive: 0x0808aa,
            emissiveIntensity: 0.5,
            roughness: 0.4,
            metalness: 0.15,
            map: wallTex,
            bumpMap: wallBump,
            bumpScale: 0.1,
            transparent: true,
            opacity: 0.85
        });
        this.ghostHouseWallMat = ghostHouseWallMat;

        const ghostHouseCapMat = new THREE.MeshStandardMaterial({
            color: 0x2a2aaa,
            emissive: 0x1010cc,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.3,
            transparent: true,
            opacity: 0.85
        });

        // --- Neon edge strip geometry and material ---
        const neonH = 0.04;
        const neonDepth = 0.06;
        const neonGeoX = new THREE.BoxGeometry(1.02, neonH, neonDepth);
        const neonGeoZ = new THREE.BoxGeometry(neonDepth, neonH, 1.02);
        const neonMat = new THREE.MeshStandardMaterial({
            color: 0x44aaff,
            emissive: 0x44aaff,
            emissiveIntensity: 1.0,
            roughness: 0.1,
            metalness: 0.0,
            transparent: true,
            opacity: 0.8
        });
        const neonGhostMat = new THREE.MeshStandardMaterial({
            color: 0x8855ff,
            emissive: 0x8855ff,
            emissiveIntensity: 0.9,
            roughness: 0.1,
            metalness: 0.0,
            transparent: true,
            opacity: 0.7
        });

        // --- Dot geometry and material ---
        const dotGeo = new THREE.SphereGeometry(0.08, 8, 6);
        const dotMat = new THREE.MeshStandardMaterial({
            color: 0xffb8ae,
            emissive: 0xffb8ae,
            emissiveIntensity: 0.5,
            roughness: 0.3
        });

        // --- Power pellet geometry and material ---
        const powerGeo = new THREE.SphereGeometry(0.2, 12, 10);
        const powerMat = new THREE.MeshStandardMaterial({
            color: 0xffb8ae,
            emissive: 0xffb8ae,
            emissiveIntensity: 0.8,
            roughness: 0.2
        });

        // --- Iterate over every tile in the maze ---
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const cell = this.maze[y][x];
                const wx = x - COLS / 2 + 0.5;
                const wz = y - ROWS / 2 + 0.5;

                if (cell === CELL.WALL) {
                    const isGhost = this._isGhostHouseWall(x, y);
                    const isBound = this._isBoundaryWall(x, y);

                    let geo, h, mat, capGeo, cMat, edgeMat;
                    if (isGhost) {
                        geo = wallGeoGhost; h = WALL_H_GHOST;
                        mat = ghostHouseWallMat; capGeo = capGeoGhost;
                        cMat = ghostHouseCapMat; edgeMat = neonGhostMat;
                    } else if (isBound) {
                        geo = wallGeoOuter; h = WALL_H_OUTER;
                        mat = wallMat; capGeo = capGeoOuter;
                        cMat = wallCapMat; edgeMat = neonMat;
                    } else {
                        geo = wallGeoInner; h = WALL_H_INNER;
                        mat = wallMat; capGeo = capGeoInner;
                        cMat = wallCapMat; edgeMat = neonMat;
                    }

                    const yOff = (h - WALL_H_INNER) / 2;

                    const wall = new THREE.Mesh(geo, mat);
                    wall.position.set(wx, yOff, wz);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.mazeGroup.add(wall);

                    // Wall top cap (beveled slab)
                    const cap = new THREE.Mesh(capGeo, cMat);
                    cap.position.set(wx, h / 2 + capH / 2 + yOff, wz);
                    cap.receiveShadow = true;
                    this.mazeGroup.add(cap);

                    // Neon edge strips on exposed sides
                    const topY = h / 2 + capH + neonH / 2 + yOff;
                    if (!this._tileIsWall(x, y - 1)) {
                        const strip = new THREE.Mesh(neonGeoX, edgeMat);
                        strip.position.set(wx, topY, wz - 0.5);
                        this.mazeGroup.add(strip);
                    }
                    if (!this._tileIsWall(x, y + 1)) {
                        const strip = new THREE.Mesh(neonGeoX, edgeMat);
                        strip.position.set(wx, topY, wz + 0.5);
                        this.mazeGroup.add(strip);
                    }
                    if (!this._tileIsWall(x - 1, y)) {
                        const strip = new THREE.Mesh(neonGeoZ, edgeMat);
                        strip.position.set(wx - 0.5, topY, wz);
                        this.mazeGroup.add(strip);
                    }
                    if (!this._tileIsWall(x + 1, y)) {
                        const strip = new THREE.Mesh(neonGeoZ, edgeMat);
                        strip.position.set(wx + 0.5, topY, wz);
                        this.mazeGroup.add(strip);
                    }

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
                    const gateGeo = new THREE.BoxGeometry(1, 0.14, 0.18);
                    const gateMat = new THREE.MeshStandardMaterial({
                        color: 0xffb8ff,
                        emissive: 0xffb8ff,
                        emissiveIntensity: 0.7
                    });
                    const gate = new THREE.Mesh(gateGeo, gateMat);
                    gate.position.set(wx, 0.07, wz);
                    this.mazeGroup.add(gate);

                    // Glowing pillars on gate sides
                    const pillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
                    const pillarMat = new THREE.MeshStandardMaterial({
                        color: 0xff88ff,
                        emissive: 0xff88ff,
                        emissiveIntensity: 0.8
                    });
                    for (const side of [-0.5, 0.5]) {
                        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
                        pillar.position.set(wx + side, 0.25, wz);
                        this.mazeGroup.add(pillar);
                    }

                    // Point lights flanking the gate
                    const gateLight = new THREE.PointLight(0xff88ff, 0.4, 3);
                    gateLight.position.set(wx, 0.5, wz);
                    this.mazeGroup.add(gateLight);
                }
            }
        }

        this.scene.add(this.mazeGroup);
    }

    // --------------------------------------------------------
    //  3D PAC-MAN
    // --------------------------------------------------------

    /**
     * Creates (or recreates) the Pac-Man 3D mesh and positions it
     * at the current pixel coordinates. Called at startup and after
     * level transitions.
     */
    createPacman3D() {
        if (this.pacmanMesh) this.scene.remove(this.pacmanMesh);
        this.pacmanMesh = createPacmanMesh();
        this.pacmanMesh.position.set(
            toWorldX(this.pacman.pixelX),
            0.2,  // Slightly above the floor
            toWorldZ(this.pacman.pixelY)
        );
        this.scene.add(this.pacmanMesh);
    }

    // --------------------------------------------------------
    //  3D GHOSTS
    // --------------------------------------------------------

    /**
     * Creates 3D meshes for all four ghosts. Each ghost's color
     * is parsed from its hex string config and used to create
     * a uniquely colored mesh. Meshes are stored on the ghost
     * objects as g._mesh for per-frame synchronization.
     */
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

    /**
     * Initializes the multi-camera system. The game supports:
     *
     *   0. TOP-DOWN (default) — elevated perspective camera looking down at the maze.
     *      In portrait mode, dynamically adjusts FOV and height to fit the maze.
     *
     *   1. THIRD PERSON — follows behind Pac-Man with smooth interpolation.
     *      Camera position and look-at target lerp toward ideal positions.
     *
     * Additional cameras used for secondary viewports (not user-selectable):
     *   - First-person camera: positioned at Pac-Man's eye level
     *   - Front camera: faces Pac-Man from ahead
     *   - Minimap camera: orthographic top-down view of the entire maze
     *
     * Smooth camera vectors (cameraPos, cameraTarget, etc.) are used
     * with lerp() each frame to prevent jarring camera jumps.
     */
    setupCameras() {
        this.cameraMode = 0;
        this.cameraNames = ['TOP-DOWN', 'THIRD PERSON'];

        const aspect = window.innerWidth / window.innerHeight;
        const frustum = 18;

        // Main top-down camera (adapts to portrait/landscape)
        this.topCamera = this._createTopDownCamera();

        // Third-person chase camera
        this.thirdPersonCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
        this.thirdPersonCamera.position.set(0, 15, 10);

        // First-person camera (used in secondary viewport)
        this.firstPersonCamera = new THREE.PerspectiveCamera(90, 16 / 9, 0.05, 200);

        // Front-facing camera (used in secondary viewport)
        this.frontCamera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 200);

        // Orthographic minimap camera — shows the entire maze from directly above
        this.minimapCamera = new THREE.OrthographicCamera(
            -frustum * 1.0, frustum * 1.0,
            frustum * (ROWS / COLS), -frustum * (ROWS / COLS), 0.1, 100
        );
        this.minimapCamera.position.set(0, 30, 0);
        this.minimapCamera.lookAt(0, 0, 0);

        // Start with top-down as the active camera
        this.activeCamera = this.topCamera;

        // Smooth interpolation vectors for the third-person camera
        this.cameraPos = new THREE.Vector3();
        this.cameraTarget = new THREE.Vector3();
        this.topCamPos = new THREE.Vector3(0, 14, 10);
        this.topCamTarget = new THREE.Vector3(0, 0, -2);

        // Smooth interpolation vectors for first-person camera
        this.fpvCameraPos = new THREE.Vector3();
        this.fpvCameraTarget = new THREE.Vector3();

        // Smooth interpolation vectors for front-facing camera
        this.frontCameraPos = new THREE.Vector3();
        this.frontCameraTarget = new THREE.Vector3();

        this.updateCameraLabel();
    }

    /**
     * Detects whether the viewport is in portrait orientation.
     * Used to switch between landscape and portrait rendering layouts.
     */
    _isPortrait() {
        return window.innerWidth / window.innerHeight < 1;
    }

    /**
     * Creates the top-down camera. In landscape, uses a fixed elevated
     * position. In portrait, dynamically calculates the camera height
     * needed to fit the entire maze within the available viewport area
     * (accounting for the 15% secondary camera strip at the top).
     */
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

    /**
     * Calculates and applies portrait-mode camera settings.
     * Computes the minimum camera height needed to see the full maze
     * width and height within the main viewport area (below the 15%
     * secondary camera strip). Uses trigonometry with the FOV to
     * determine the required distance.
     */
    _applyPortraitTopDown(cam) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const mainH = h - Math.floor(h * 0.15);  // Main area = 85% of height
        const viewAspect = w / mainH;

        // Calculate horizontal and vertical FOV in radians
        const fovRad = THREE.MathUtils.degToRad(60);
        const halfVFov = fovRad / 2;
        const halfHFov = Math.atan(Math.tan(halfVFov) * viewAspect);

        // Maze extents with padding
        const halfMazeW = COLS / 2 + 1.5;
        const halfMazeH = ROWS / 2 + 1.5;

        // Camera height needed to see full width vs full height
        const yForWidth = halfMazeW / Math.tan(halfHFov);
        const yForHeight = halfMazeH / Math.tan(halfVFov);
        const camY = Math.max(yForWidth, yForHeight);  // Use the larger value

        cam.fov = 60;
        cam.aspect = viewAspect;
        cam.updateProjectionMatrix();
        cam.position.set(0, camY, 8);
        cam.lookAt(0, 0, 0);

        // Debug info in title bar (useful during development)
        document.title = 'P:y=' + camY.toFixed(0) + ' a=' + viewAspect.toFixed(2);
    }

    /**
     * Updates camera aspect ratios when the window is resized.
     * Recalculates portrait-mode camera if needed.
     */
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

    /**
     * Cycles between available camera modes (top-down ↔ third-person).
     * Triggered by pressing [C] or tapping the CAM button.
     */
    cycleCamera() {
        this.cameraMode = (this.cameraMode + 1) % 2;
        switch (this.cameraMode) {
            case 0: this.activeCamera = this.topCamera; break;
            case 1: this.activeCamera = this.thirdPersonCamera; break;
        }
        this.updateCameraLabel();
    }

    /**
     * Updates the on-screen camera label to show the current mode name.
     */
    updateCameraLabel() {
        this.cameraLabel.textContent = `[C] ${this.cameraNames[this.cameraMode]}`;
    }

    /**
     * Per-frame camera update. Computes ideal positions for all cameras
     * based on Pac-Man's current position and facing direction, then
     * uses lerp() for smooth interpolation (prevents jarring jumps).
     *
     * Third-person camera: 6 units behind, 8 units above, looking 3 units ahead.
     * First-person camera: at Pac-Man's position, looking 5 units ahead.
     * Front camera: 5 units ahead, 4 units above, looking back at Pac-Man.
     */
    updateCameras() {
        const px = toWorldX(this.pacman.pixelX);
        const pz = toWorldZ(this.pacman.pixelY);
        const angle = dirToAngle(this.pacman.dir);
        const dirX = Math.cos(angle);
        const dirZ = -Math.sin(angle);

        // --- Third-person camera: behind and above Pac-Man ---
        const idealPos = new THREE.Vector3(
            px - dirX * 6,   // 6 units behind
            8,               // 8 units above
            pz - dirZ * 6
        );
        const idealTarget = new THREE.Vector3(px + dirX * 3, 0, pz + dirZ * 3);

        // Smooth interpolation (lower factor = smoother but more latent)
        this.cameraPos.lerp(idealPos, 0.06);
        this.cameraTarget.lerp(idealTarget, 0.08);

        this.thirdPersonCamera.position.copy(this.cameraPos);
        this.thirdPersonCamera.lookAt(this.cameraTarget);

        // --- First-person camera: at Pac-Man's eye level ---
        const fpvIdealPos = new THREE.Vector3(px + dirX * 0.5, 0.35, pz + dirZ * 0.5);
        const fpvLookAt = new THREE.Vector3(px + dirX * 5, 0.2, pz + dirZ * 5);
        this.fpvCameraPos.lerp(fpvIdealPos, 0.12);
        this.fpvCameraTarget.lerp(fpvLookAt, 0.1);
        this.firstPersonCamera.position.copy(this.fpvCameraPos);
        this.firstPersonCamera.lookAt(this.fpvCameraTarget);

        // --- Front camera: ahead of Pac-Man, looking back ---
        const frontIdealPos = new THREE.Vector3(px + dirX * 5, 4, pz + dirZ * 5);
        const frontLookAt = new THREE.Vector3(px - dirX * 3, 0, pz - dirZ * 3);
        this.frontCameraPos.lerp(frontIdealPos, 0.06);
        this.frontCameraTarget.lerp(frontLookAt, 0.08);
        this.frontCamera.position.copy(this.frontCameraPos);
        this.frontCamera.lookAt(this.frontCameraTarget);
    }

    // --------------------------------------------------------
    //  INPUT HANDLING
    // --------------------------------------------------------

    /**
     * Sets up keyboard event listeners and detects touch capability.
     *
     * Keyboard controls:
     *   - WASD / Arrow keys: set Pac-Man's queued direction
     *   - C: cycle camera mode
     *   - M: toggle mute
     *   - H / Escape: toggle help overlay
     *   - Any key on title/game-over screen: start game
     *
     * In third-person camera mode (cameraMode >= 1), directional
     * inputs are remapped relative to Pac-Man's facing direction:
     *   UP = forward (same as facing), DOWN = backward,
     *   LEFT = turn left, RIGHT = turn right.
     */
    setupInput() {
        document.addEventListener('keydown', (e) => {
            // Ensure AudioContext is resumed on any keypress
            this.audio.resume();

            // --- Reset confirmation dialog handling ---
            if (this.resetConfirmVisible) {
                if (e.key === 'y' || e.key === 'Y') {
                    this.confirmReset(true);
                } else {
                    this.confirmReset(false);
                }
                return;
            }

            // --- Mute toggle (works in any state) ---
            if (e.key === 'm' || e.key === 'M') {
                this.audio.toggleMute();
                this.updateMuteLabel();
                return;
            }

            // --- Reset: show confirmation prompt ---
            if (e.key === 'r' || e.key === 'R') {
                this.showResetConfirm();
                return;
            }

            // --- Help toggle ---
            if (e.key === 'h' || e.key === 'H') {
                this.toggleHelp();
                return;
            }

            // --- Escape closes help if open ---
            if (e.key === 'Escape' && this.helpVisible) {
                this.toggleHelp();
                return;
            }

            // Block all other input while help is visible
            if (this.helpVisible) return;

            // --- Start/restart game from title or game-over screen ---
            if (this.state === STATE.START || this.state === STATE.GAMEOVER) {
                this.startGame();
                return;
            }

            // --- Directional input ---
            let dir = null;
            switch (e.key) {
                case 'ArrowUp':    case 'w': case 'W': dir = DIR.UP; break;
                case 'ArrowDown':  case 's': case 'S': dir = DIR.DOWN; break;
                case 'ArrowLeft':  case 'a': case 'A': dir = DIR.LEFT; break;
                case 'ArrowRight': case 'd': case 'D': dir = DIR.RIGHT; break;
                case 'c': case 'C': this.cycleCamera(); break;
            }

            if (dir) {
                // In third-person mode, remap directions relative to Pac-Man's facing
                if (this.cameraMode >= 1) {
                    const facing = this.pacman.dir;
                    if (dir === DIR.UP) dir = facing;                    // Forward
                    else if (dir === DIR.DOWN) dir = oppositeDir(facing); // Backward
                    else if (dir === DIR.LEFT) dir = turnLeft(facing);   // Turn left
                    else if (dir === DIR.RIGHT) dir = turnRight(facing); // Turn right
                }
                this.pacman.nextDir = dir;
            }

            // Prevent arrow keys from scrolling the page
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });

        // Detect touch capability and set up touch controls if needed
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (this.isTouchDevice) {
            this.setupTouchInput();
        }
    }

    /**
     * Sets up touch input for mobile devices. Adds the "has-touch"
     * class to <body> to show touch-only UI elements via CSS.
     *
     * Touch controls:
     *   - D-pad buttons: directional movement
     *   - CAM button: cycle camera
     *   - Mute button: toggle sound
     *   - Help button: toggle help overlay
     *   - Overlay tap: start/restart game
     *   - Help overlay tap (outside content): dismiss help
     *
     * All touch handlers use { passive: false } and call preventDefault()
     * to prevent browser default touch behaviors (scrolling, zooming).
     */
    setupTouchInput() {
        document.body.classList.add('has-touch');

        // --- Control mode: 'dpad' or 'swipe', persisted in localStorage ---
        this.touchControlMode = localStorage.getItem('pacman-control-mode') || 'dpad';
        if (this.touchControlMode === 'swipe') {
            document.body.classList.add('swipe-mode');
        }

        // Prevent scrolling on touch move (except in help overlay for scrollable content)
        document.addEventListener('touchmove', (e) => {
            if (!this.helpVisible) e.preventDefault();
        }, { passive: false });

        // Tap overlay to start/restart game
        this.overlay.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.audio.resume();
            if (this.state === STATE.START || this.state === STATE.GAMEOVER) {
                this.startGame();
            }
        }, { passive: false });

        // --- D-pad directional buttons ---
        const dpadMap = {
            'dpad-up':    DIR.UP,
            'dpad-down':  DIR.DOWN,
            'dpad-left':  DIR.LEFT,
            'dpad-right': DIR.RIGHT
        };

        /**
         * Applies a direction, remapping for third-person camera if needed.
         * Same logic as the keyboard handler's direction remapping.
         */
        const setDirection = (dir) => {
            if (this.helpVisible || this.resetConfirmVisible) return;
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

        // Bind touch events to each D-pad button
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

        // --- Swipe gesture detection on the canvas ---
        const SWIPE_THRESHOLD = 30;
        const swipeIndicator = document.getElementById('swipe-indicator');
        const swipeArrows = { UP: '\u25B2', DOWN: '\u25BC', LEFT: '\u25C0', RIGHT: '\u25B6' };
        let swipeStartX = 0;
        let swipeStartY = 0;
        let swipeTracking = false;

        const showSwipeIndicator = (x, y, dir) => {
            if (!swipeIndicator) return;
            const label = Object.entries(DIR).find(([, v]) => v === dir);
            swipeIndicator.textContent = label ? swipeArrows[label[0]] || '' : '';
            swipeIndicator.style.left = x + 'px';
            swipeIndicator.style.top = y + 'px';
            swipeIndicator.classList.remove('hidden', 'show');
            void swipeIndicator.offsetWidth;
            swipeIndicator.classList.add('show');
            clearTimeout(this._swipeIndicatorTimer);
            this._swipeIndicatorTimer = setTimeout(() => {
                swipeIndicator.classList.add('hidden');
                swipeIndicator.classList.remove('show');
            }, 400);
        };

        const isSwipeTarget = (e) => {
            const t = e.target;
            if (t === this.renderer.domElement) return true;
            if (t === document.getElementById('game-container')) return true;
            if (t === document.body || t === document.documentElement) return true;
            return false;
        };

        document.addEventListener('touchstart', (e) => {
            if (this.touchControlMode !== 'swipe') return;
            if (!isSwipeTarget(e)) return;
            const touch = e.touches[0];
            swipeStartX = touch.clientX;
            swipeStartY = touch.clientY;
            swipeTracking = true;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (this.touchControlMode !== 'swipe' || !swipeTracking) return;
            swipeTracking = false;
            const touch = e.changedTouches[0];
            const dx = touch.clientX - swipeStartX;
            const dy = touch.clientY - swipeStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return;

            let dir;
            if (absDx > absDy) {
                dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
            } else {
                dir = dy > 0 ? DIR.DOWN : DIR.UP;
            }
            setDirection(dir);
            showSwipeIndicator(swipeStartX, swipeStartY, dir);
        }, { passive: true });

        document.addEventListener('touchcancel', () => {
            swipeTracking = false;
        });

        // --- Control mode toggle button (DPAD / SWIPE) ---
        const controlModeBtn = document.getElementById('touch-control-mode');
        if (controlModeBtn) {
            controlModeBtn.textContent = this.touchControlMode === 'swipe' ? 'SWIPE' : 'DPAD';

            const toggleControlMode = (e) => {
                e.preventDefault();
                this.audio.resume();
                if (this.touchControlMode === 'dpad') {
                    this.touchControlMode = 'swipe';
                    document.body.classList.add('swipe-mode');
                    controlModeBtn.textContent = 'SWIPE';
                } else {
                    this.touchControlMode = 'dpad';
                    document.body.classList.remove('swipe-mode');
                    controlModeBtn.textContent = 'DPAD';
                }
                localStorage.setItem('pacman-control-mode', this.touchControlMode);
            };
            controlModeBtn.addEventListener('touchstart', toggleControlMode, { passive: false });
            controlModeBtn.addEventListener('click', toggleControlMode);
        }

        // --- Camera cycle button ---
        const camBtn = document.getElementById('touch-camera');
        if (camBtn) {
            camBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.audio.resume();
                this.cycleCamera();
            }, { passive: false });
        }

        // --- Mute toggle button ---
        const muteBtn = document.getElementById('touch-mute');
        if (muteBtn) {
            muteBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.audio.resume();
                this.audio.toggleMute();
                this.updateMuteLabel();
                // Update button icon: speaker with sound vs muted speaker
                muteBtn.textContent = this.audio.muted ? '\u{1F507}' : '\u{1F509}';
            }, { passive: false });
        }

        // --- Help toggle button ---
        const helpBtn = document.getElementById('touch-help');
        if (helpBtn) {
            helpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.audio.resume();
                this.toggleHelp();
            }, { passive: false });
        }

        // --- Reset options button (shows confirmation) ---
        const resetBtn = document.getElementById('touch-reset');
        if (resetBtn) {
            resetBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.audio.resume();
                this.showResetConfirm();
            }, { passive: false });
        }

        // --- Reset confirmation YES / NO buttons ---
        const resetYes = document.getElementById('reset-yes');
        const resetNo = document.getElementById('reset-no');
        if (resetYes) {
            resetYes.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.confirmReset(true);
            }, { passive: false });
        }
        if (resetNo) {
            resetNo.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.confirmReset(false);
            }, { passive: false });
        }

        // --- Help close button (×) ---
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

        // --- Tap outside help content to dismiss ---
        const helpContent = document.getElementById('help-content');
        const dismissHelp = (e) => {
            if (!this.helpVisible) return;
            if (helpContent && helpContent.contains(e.target)) return;  // Don't dismiss if tapping content
            if (e.target.id === 'help-close') return;                   // Handled by close button
            e.preventDefault();
            this.toggleHelp();
        };
        this.helpOverlay.addEventListener('touchstart', dismissHelp, { passive: false });
        this.helpOverlay.addEventListener('click', dismissHelp);
    }

    /**
     * Toggles the help overlay visibility. When opening, pauses
     * background music. When closing during gameplay, resumes the
     * appropriate music (frightened or normal siren).
     */
    toggleHelp() {
        this.helpVisible = !this.helpVisible;
        this.helpOverlay.classList.toggle('hidden', !this.helpVisible);

        if (this.helpVisible) {
            // Remember what music was playing so we can resume it
            this._musicBeforeHelp = this.audio.currentMusic;
            this.audio.stopMusic();
        } else if (this.state === STATE.PLAYING) {
            // Resume the appropriate background music
            if (this._musicBeforeHelp === 'frightened' && this.frightenedActive) {
                this.audio.startFrightened();
            } else {
                this.audio.startSiren(this.level);
            }
        }
    }

    /**
     * Updates the on-screen mute label text to reflect current state.
     */
    updateMuteLabel() {
        const el = document.getElementById('mute-label');
        if (el) el.textContent = `[M] SOUND: ${this.audio.muted ? 'OFF' : 'ON'}`;
    }

    /**
     * Shows the reset confirmation prompt. Blocks all other input
     * until the user confirms (Y / YES) or cancels (any other key / NO).
     */
    showResetConfirm() {
        this.resetConfirmVisible = true;
        this.resetConfirmEl.classList.remove('hidden');
    }

    /**
     * Handles the user's response to the reset confirmation prompt.
     * @param {boolean} confirmed - true to proceed with reset, false to cancel
     */
    confirmReset(confirmed) {
        this.resetConfirmVisible = false;
        this.resetConfirmEl.classList.add('hidden');
        if (confirmed) this.resetOptions();
    }

    /**
     * Resets all user-configurable options to their defaults:
     * camera → top-down, sound → on, touch control mode → dpad,
     * high score → 0. Clears persisted localStorage values.
     */
    resetOptions() {
        // Camera → top-down
        this.cameraMode = 0;
        this.activeCamera = this.topCamera;
        this.updateCameraLabel();

        // Sound → unmuted
        if (this.audio.muted) {
            this.audio.toggleMute();
        }
        this.updateMuteLabel();

        // Touch control mode → dpad
        if (this.isTouchDevice) {
            this.touchControlMode = 'dpad';
            document.body.classList.remove('swipe-mode');
            const controlModeBtn = document.getElementById('touch-control-mode');
            if (controlModeBtn) controlModeBtn.textContent = 'DPAD';
        }

        // High score → 0
        this.highScore = 0;
        this.highScoreEl.textContent = '0';

        // Clear all persisted preferences
        localStorage.removeItem('pacman-mute');
        localStorage.removeItem('pacman-control-mode');
        localStorage.removeItem('pacman-high');

        // Update touch mute button icon
        const muteBtn = document.getElementById('touch-mute');
        if (muteBtn) muteBtn.textContent = '\u{1F509}';
    }

    // --------------------------------------------------------
    //  GAME STATE MANAGEMENT
    // --------------------------------------------------------

    /**
     * Counts the total number of dots and power pellets in the maze.
     * Used to determine when a level is complete (dotsEaten >= totalDots).
     */
    countDots() {
        this.totalDots = 0;
        for (let y = 0; y < ROWS; y++)
            for (let x = 0; x < COLS; x++)
                if (this.maze[y][x] === CELL.DOT || this.maze[y][x] === CELL.POWER)
                    this.totalDots++;
    }

    /**
     * Starts a new game from scratch. Resets score, lives, level,
     * rebuilds the maze, and enters the READY state.
     */
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

    /**
     * Resets Pac-Man and all ghosts to their starting positions.
     * Also resets the ghost mode schedule and camera interpolation
     * vectors to prevent the camera from flying across the map.
     */
    resetEntities() {
        this.pacman.reset();
        this.ghosts.forEach(g => g.reset());
        this.ghostsEatenCombo = 0;
        this.modeTimer = 0;
        this.modePhase = 0;

        // Reset camera interpolation to Pac-Man's starting position
        // to prevent a long camera pan from the previous position
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

    /**
     * Transitions to a new game state. Resets the state timer and
     * triggers state-specific side effects (audio, UI elements).
     *
     * @param {string} s - The new state (one of STATE.*)
     */
    enterState(s) {
        this.state = s;
        this.stateTimer = 0;
        if (s === STATE.READY) {
            this.readyText.classList.remove('hidden');  // Show "READY!" text
            this.audio.stopMusic();
            this.audio.playReady();                     // Play ready jingle
            this.frightenedActive = false;
        } else {
            this.readyText.classList.add('hidden');
        }

        if (s === STATE.PLAYING) {
            this.audio.startSiren(this.level);          // Start background melody
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

    /**
     * Shows the full-screen overlay with a title and message.
     * Used for the start screen and game-over screen.
     */
    showOverlay(title, msg) {
        this.overlay.classList.remove('hidden');
        this.overlayTitle.textContent = title;
        this.overlayMsg.textContent = msg;
    }

    /**
     * Hides the full-screen overlay (fades out via CSS transition).
     */
    hideOverlay() {
        this.overlay.classList.add('hidden');
    }

    /**
     * Updates all HUD elements: score, level, high score, and lives.
     * High score is persisted to localStorage when beaten.
     * Lives are rendered as small Pac-Man icons drawn on mini canvases.
     */
    updateHUD() {
        this.scoreEl.textContent = this.score;
        this.levelEl.textContent = this.level;

        // Update high score if current score exceeds it
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pacman-high', this.highScore);
        }
        this.highScoreEl.textContent = this.highScore;

        // Render life icons as small yellow Pac-Man shapes on mini canvases
        this.livesEl.innerHTML = '';
        for (let i = 0; i < this.lives; i++) {
            const c = document.createElement('canvas');
            c.width = 20; c.height = 20;
            const lctx = c.getContext('2d');
            lctx.fillStyle = '#ffff00';
            lctx.beginPath();
            // Draw a Pac-Man shape: arc with a mouth gap (0.25 to 2π-0.25 radians)
            lctx.arc(10, 10, 8, 0.25, Math.PI * 2 - 0.25);
            lctx.lineTo(10, 10);
            lctx.closePath();
            lctx.fill();
            this.livesEl.appendChild(c);
        }
    }

    /**
     * Returns the ghost mode schedule — an array of alternating
     * scatter and chase phases with durations in frames.
     *
     * The classic Pac-Man pattern:
     *   Scatter (7s) → Chase (20s) → Scatter (7s) → Chase (20s) →
     *   Scatter (5s) → Chase (20s) → Scatter (5s) → Chase (forever)
     *
     * At 60fps: 7s = 420 frames, 20s = 1200 frames, 5s = 300 frames.
     */
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

    /**
     * Advances the ghost mode timer and transitions all non-special
     * ghosts (not frightened, not eaten, not in house) to the next
     * scatter/chase phase when the current phase expires.
     * Ghosts reverse direction on mode transitions.
     */
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
                    // Only transition ghosts that are in normal scatter/chase mode
                    if (g.mode !== GHOST_MODE.FRIGHTENED && g.mode !== GHOST_MODE.EATEN && !g.inHouse) {
                        g.mode = newMode;
                        g.dir = oppositeDir(g.dir);  // Reverse on mode change
                    }
                }
            }
        }
    }

    // --------------------------------------------------------
    //  MAIN UPDATE (per-frame game logic)
    // --------------------------------------------------------

    /**
     * The core game update function, called once per frame.
     * Handles the state machine transitions and gameplay logic.
     *
     * State machine:
     *   READY → (120 frames) → PLAYING
     *   PLAYING → (all dots eaten) → LEVEL_COMPLETE
     *   PLAYING → (ghost collision) → DEATH
     *   DEATH → (90 frames, lives > 0) → READY
     *   DEATH → (90 frames, lives = 0) → GAMEOVER
     *   LEVEL_COMPLETE → (120 frames) → READY (next level)
     *
     * During PLAYING state:
     *   1. Update Pac-Man movement
     *   2. Update ghost mode schedule (scatter ↔ chase)
     *   3. Update all ghost AI and movement
     *   4. Check dot/power pellet collisions
     *   5. Check ghost collisions
     *   6. Manage frightened music transitions
     *   7. Check level completion
     */
    update() {
        if (this.helpVisible || this.resetConfirmVisible) return;

        this.globalTimer++;
        this.stateTimer++;

        // --- READY state: wait 120 frames (~2 seconds), then start playing ---
        if (this.state === STATE.READY) {
            if (this.stateTimer >= 120) {
                this.enterState(STATE.PLAYING);
            }
            return;
        }

        // --- DEATH state: wait 90 frames for death animation, then respawn or game over ---
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

        // --- LEVEL_COMPLETE state: wait 120 frames, then advance to next level ---
        if (this.state === STATE.LEVEL_COMPLETE) {
            if (this.stateTimer >= 120) {
                this.level++;
                this.maze = copyMaze();
                this.dotsEaten = 0;
                this.countDots();
                this.buildMaze3D();
                this.resetEntities();

                // Increase ghost and Pac-Man speed with each level (capped)
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

        // --- Only process gameplay during PLAYING state ---
        if (this.state !== STATE.PLAYING) return;

        // Update Pac-Man movement
        this.pacman.update(this.maze);

        // Advance the scatter/chase mode schedule
        this.updateGhostModes();

        // Update all ghosts (Blinky is passed to Inky for its targeting algorithm)
        const blinky = this.ghosts[0];
        for (const g of this.ghosts) {
            g.update(this.maze, this.pacman, blinky);
        }

        // Check for dot and power pellet collection
        this.checkDotCollision();

        // Check for ghost collisions (eat frightened ghosts or lose a life)
        this.checkGhostCollision();

        // --- Manage frightened music transitions ---
        // Switch to frightened music when any ghost becomes frightened,
        // switch back to normal siren when all ghosts leave frightened mode
        const anyFrightened = this.ghosts.some(g => g.mode === GHOST_MODE.FRIGHTENED);
        if (anyFrightened && !this.frightenedActive) {
            this.frightenedActive = true;
            this.audio.startFrightened();
        } else if (!anyFrightened && this.frightenedActive) {
            this.frightenedActive = false;
            this.audio.startSiren(this.level);
        }

        // Check if all dots have been eaten → level complete
        if (this.dotsEaten >= this.totalDots) {
            this.enterState(STATE.LEVEL_COMPLETE);
        }
    }

    /**
     * Checks if Pac-Man is on a dot or power pellet tile and collects it.
     *
     * Dots: +10 points, hide the 3D mesh, play waka sound.
     * Power pellets: +50 points, hide mesh + light, reset ghost combo,
     *   trigger frightened mode on all ghosts, play power pellet sound.
     */
    checkDotCollision() {
        const tileX = Math.floor(this.pacman.pixelX / TILE);
        const tileY = Math.floor(this.pacman.pixelY / TILE);
        if (tileX < 0 || tileX >= COLS || tileY < 0 || tileY >= ROWS) return;
        const cell = this.maze[tileY][tileX];
        const key = `${tileX},${tileY}`;

        if (cell === CELL.DOT) {
            this.maze[tileY][tileX] = CELL.EMPTY;  // Remove dot from maze data
            this.score += 10;
            this.dotsEaten++;
            if (this.dotMeshes[key]) {
                this.dotMeshes[key].visible = false;  // Hide 3D dot mesh
            }
            this.audio.playDotEat();
            this.updateHUD();

        } else if (cell === CELL.POWER) {
            this.maze[tileY][tileX] = CELL.EMPTY;
            this.score += 50;
            this.dotsEaten++;
            this.ghostsEatenCombo = 0;  // Reset combo counter for new power pellet

            // Hide power pellet mesh and its associated point light
            if (this.powerMeshes[key]) {
                this.powerMeshes[key].visible = false;
                if (this.powerMeshes[key].userData.light) {
                    this.powerMeshes[key].userData.light.visible = false;
                }
            }

            // Trigger frightened mode on all ghosts
            for (const g of this.ghosts) g.enterFrightened();

            this.audio.stopMusic();
            this.audio.playPowerPellet();
            this.updateHUD();
        }
    }

    /**
     * Checks for collisions between Pac-Man and each ghost.
     * Uses pixel-distance collision (threshold: 0.8 tiles).
     *
     * If the ghost is FRIGHTENED: ghost is eaten, combo score awarded
     *   (200 × 2^(combo-1): 200, 400, 800, 1600).
     * If the ghost is normal (CHASE/SCATTER): Pac-Man loses a life.
     * If the ghost is EATEN: no collision (just eyes, no hitbox).
     */
    checkGhostCollision() {
        for (const g of this.ghosts) {
            if (g.inHouse) continue;  // Ghosts in the house can't be touched
            const dist = distance(this.pacman.pixelX, this.pacman.pixelY, g.pixelX, g.pixelY);
            if (dist < TILE * 0.8) {
                if (g.mode === GHOST_MODE.FRIGHTENED) {
                    // Eat the frightened ghost
                    g.mode = GHOST_MODE.EATEN;
                    this.ghostsEatenCombo++;
                    // Combo scoring: 200, 400, 800, 1600
                    this.score += 200 * Math.pow(2, this.ghostsEatenCombo - 1);
                    this.audio.playGhostEaten(this.ghostsEatenCombo);
                    this.updateHUD();
                } else if (g.mode !== GHOST_MODE.EATEN) {
                    // Pac-Man dies
                    this.lives--;
                    this.pacman.dying = true;
                    this.enterState(STATE.DEATH);
                    this.updateHUD();
                }
            }
        }
    }

    // --------------------------------------------------------
    //  3D RENDERING & SYNCHRONIZATION
    // --------------------------------------------------------

    /**
     * Synchronizes the Pac-Man 3D mesh with the game state.
     * Updates position, rotation (facing direction), mouth animation,
     * and death animation (shrink + spin + rise).
     */
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

        // Scale mouth interior visibility with mouth opening
        if (mesh.userData.mouthInterior) {
            mesh.userData.mouthInterior.scale.y = 0.15 + this.pacman.mouthAngle * 0.45;
        }

        if (this.pacman.dying) {
            const df = this.pacman.deathFrame;
            const light = mesh.userData.light;

            if (df < 15) {
                // Phase 1: flatten into a pancake with a light flash
                const p = df / 15;
                const sy = Math.max(1 - p * 0.7, 0.3);
                const sxz = 1 + p * 0.3;
                mesh.scale.set(sxz, sy, sxz);
                mesh.rotation.z = 0;
                mesh.position.y = 0.2;
                if (light) light.intensity = 0.4 + (1 - p) * 2.0;
            } else {
                // Phase 2: spin, shrink, and rise
                const p2 = Math.min((df - 15) / 45, 1);
                const scale = Math.max((1 - p2) * 1.3, 0.01);
                mesh.scale.set(scale, scale, scale);
                mesh.position.y = 0.2 + p2 * 2.5;
                mesh.rotation.z = p2 * Math.PI * 6;
                if (light) light.intensity = Math.max(0.4 * (1 - p2), 0);
            }
        } else {
            mesh.rotation.z = 0;

            // Squash-and-stretch when moving
            const dir = this.pacman.dir;
            const isMoving = dir !== DIR.NONE && (dir.x !== 0 || dir.y !== 0);
            const lerpSpeed = 0.12;

            if (isMoving) {
                // Elongate along movement axis, compress perpendicular
                const stretch = 1.08;
                const squash = 0.94;
                if (dir.x !== 0) {
                    // Horizontal movement: stretch is along world-X (but mesh is rotated, so use Z for forward)
                    mesh.scale.x += (stretch - mesh.scale.x) * lerpSpeed;
                    mesh.scale.y += (squash - mesh.scale.y) * lerpSpeed;
                    mesh.scale.z += (squash - mesh.scale.z) * lerpSpeed;
                } else {
                    mesh.scale.x += (squash - mesh.scale.x) * lerpSpeed;
                    mesh.scale.y += (squash - mesh.scale.y) * lerpSpeed;
                    mesh.scale.z += (stretch - mesh.scale.z) * lerpSpeed;
                }
            } else {
                mesh.scale.x += (1 - mesh.scale.x) * lerpSpeed;
                mesh.scale.y += (1 - mesh.scale.y) * lerpSpeed;
                mesh.scale.z += (1 - mesh.scale.z) * lerpSpeed;
            }

            if (mesh.userData.light) mesh.userData.light.intensity = 0.4;
        }

        mesh.visible = !(this.pacman.dying && this.pacman.deathFrame >= 60);
    }

    /**
     * Synchronizes all ghost 3D meshes with game state.
     * For each ghost, updates:
     *   - Position (pixel → world coordinates + vertical bobbing)
     *   - Rotation (face movement direction)
     *   - Visual state (normal / frightened / eaten):
     *       Normal:     colored body + eyes visible
     *       Frightened: blue body + frightened face (flashes white near expiry)
     *       Eaten:      body hidden, only eyes visible
     *   - Visibility (hidden during death animation after 30 frames)
     */
    syncGhosts3D() {
        const t = this.globalTimer;

        for (const g of this.ghosts) {
            const mesh = g._mesh;
            if (!mesh) continue;

            const wx = toWorldX(g.pixelX);
            const wz = toWorldZ(g.pixelY);
            mesh.position.set(wx, 0.15, wz);

            const phaseOffset = g.pixelX * 0.1;
            const bobY = Math.sin(t * 0.08 + phaseOffset) * 0.04;
            mesh.position.y += bobY;

            const angle = dirToAngle(g.dir);
            mesh.rotation.y = angle + Math.PI / 2;

            // Ghostly wobble/sway — subtle tilt that oscillates while floating
            mesh.rotation.z = Math.sin(t * 0.06 + phaseOffset * 1.7) * 0.05;

            // Tentacle undulation — each tentacle bobs independently
            const tentacles = mesh.userData.tentacles;
            if (tentacles) {
                for (let i = 0; i < tentacles.length; i++) {
                    const tentacle = tentacles[i];
                    const wave = Math.sin(t * 0.12 + i * (Math.PI * 2 / tentacles.length)) * 0.04;
                    tentacle.position.y = -0.4 + wave;
                    tentacle.scale.y = 0.7 + Math.sin(t * 0.1 + i * 0.8) * 0.12;
                }
            }

            // Pupil direction tracking — pupils shift toward movement direction
            const pupils = mesh.userData.pupils;
            if (pupils) {
                let pxOff = 0, pzOff = 0;
                if (g.dir === DIR.RIGHT)     { pxOff = 0;     pzOff = 0.04; }
                else if (g.dir === DIR.LEFT)  { pxOff = 0;     pzOff = -0.04; }
                else if (g.dir === DIR.UP)    { pxOff = 0.03;  pzOff = 0; }
                else if (g.dir === DIR.DOWN)  { pxOff = -0.03; pzOff = 0; }

                // Pupils are at index 0 (left, side=-1) and 1 (right, side=+1)
                pupils[0].position.set(-0.16 + pzOff, 0.1 + pxOff, 0.39);
                pupils[1].position.set(0.16 + pzOff, 0.1 + pxOff, 0.39);
            }

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

                // Frightened trembling — intensifies as timer runs down
                const maxFright = 360;
                const urgency = 1 - Math.min(g.frightTimer / maxFright, 1);
                const shake = (0.01 + urgency * 0.02);
                mesh.position.x += (Math.random() - 0.5) * shake * 2;
                mesh.position.z += (Math.random() - 0.5) * shake * 2;

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

    /**
     * Animates power pellet meshes: pulsing glow, oscillating scale,
     * and gentle vertical bobbing. Creates an eye-catching effect
     * to draw the player's attention to power pellets.
     */
    animateDots() {
        const t = this.globalTimer;

        for (const key in this.powerMeshes) {
            const mesh = this.powerMeshes[key];
            if (!mesh.visible) continue;

            // Pulsing emissive intensity (0.4 to 1.0)
            const pulse = 0.7 + Math.sin(t * 0.08) * 0.3;
            mesh.material.emissiveIntensity = pulse;

            // Oscillating scale (0.6 to 1.0)
            mesh.scale.setScalar(0.8 + Math.sin(t * 0.06) * 0.2);

            // Vertical bobbing
            mesh.position.y = 0.2 + Math.sin(t * 0.05) * 0.08;

            // Sync the associated point light intensity with the pulse
            if (mesh.userData.light) {
                mesh.userData.light.intensity = pulse * 0.6;
            }
        }
    }

    /**
     * Animates wall appearance during level completion.
     * Walls flash between white and blue every 15 frames
     * to create a celebratory strobe effect.
     */
    animateWalls() {
        if (this.state === STATE.LEVEL_COMPLETE) {
            const flash = Math.floor(this.stateTimer / 15) % 2 === 0;
            this.wallMat.color.setHex(flash ? 0xffffff : 0x2121de);
            this.wallMat.emissive.setHex(flash ? 0x666666 : 0x0a0a6e);
            if (this.wallCapMat) {
                this.wallCapMat.color.setHex(flash ? 0xffffff : 0x3535ee);
                this.wallCapMat.emissive.setHex(flash ? 0x888888 : 0x1515aa);
            }
            if (this.ghostHouseWallMat) {
                this.ghostHouseWallMat.color.setHex(flash ? 0xddddff : 0x1a1a8e);
                this.ghostHouseWallMat.emissive.setHex(flash ? 0x555555 : 0x0808aa);
            }
        } else {
            this.wallMat.color.setHex(0x2121de);
            this.wallMat.emissive.setHex(0x0a0a6e);
            if (this.wallCapMat) {
                this.wallCapMat.color.setHex(0x3535ee);
                this.wallCapMat.emissive.setHex(0x1515aa);
            }
            if (this.ghostHouseWallMat) {
                this.ghostHouseWallMat.color.setHex(0x1a1a8e);
                this.ghostHouseWallMat.emissive.setHex(0x0808aa);
            }
        }
    }

    /**
     * Main 3D rendering function. Synchronizes all meshes with game
     * state, updates cameras, then renders the scene using a
     * multi-viewport layout that adapts to screen orientation.
     *
     * PORTRAIT layout (mobile):
     *   ┌──────────────────┐
     *   │ Front  │ 3P/Map  │  ← 15% height strip (two secondary views)
     *   ├──────────────────┤
     *   │                  │
     *   │   Main Camera    │  ← 85% height (active camera)
     *   │                  │
     *   └──────────────────┘
     *
     * LANDSCAPE layout (desktop):
     *   ┌──────────────────────────────┐
     *   │                              │
     *   │        Main Camera           │
     *   │                              │
     *   │  ┌─────┐          ┌─────┐   │
     *   │  │Front│          │Mini │   │  ← Small PiP viewports
     *   │  └─────┘          └─────┘   │
     *   └──────────────────────────────┘
     *
     * Fog is temporarily disabled for top-down and minimap cameras
     * to ensure full maze visibility.
     */
    render3D() {
        // Sync all 3D meshes with current game state
        this.syncPacman3D();
        this.syncGhosts3D();
        this.animateDots();
        this.animateWalls();
        this.updateCameras();

        // Clear the entire framebuffer before rendering
        this.renderer.clear();

        const w = window.innerWidth;
        const h = window.innerHeight;
        const narrow = w < 600;
        const portrait = this._isPortrait();

        if (portrait) {
            // --- PORTRAIT LAYOUT ---
            const stripH = Math.floor(h * 0.15);   // Top 15% for secondary views
            const mainH = h - stripH;               // Bottom 85% for main view
            const halfW = Math.floor(w / 2);

            // Disable fog for top-down camera (needs full visibility)
            const savedFog = this.scene.fog;
            const mainCam = this.activeCamera;
            if (mainCam === this.topCamera) {
                this.scene.fog = null;
            }

            // Render main viewport (bottom 85%)
            this.renderer.setViewport(0, 0, w, mainH);
            this.renderer.setScissor(0, 0, w, mainH);
            this.renderer.setScissorTest(true);
            this.renderer.render(this.scene, mainCam);

            this.scene.fog = savedFog;

            // Render front camera in left half of top strip
            this.renderer.setViewport(0, mainH, halfW, stripH);
            this.renderer.setScissor(0, mainH, halfW, stripH);
            this.renderer.render(this.scene, this.frontCamera);

            // Render secondary camera in right half of top strip
            // (third-person when in top-down mode, minimap when in third-person mode)
            const stripCam = this.cameraMode === 0
                ? this.thirdPersonCamera
                : this.minimapCamera;
            document.title = 'cam=' + this.cameraMode + ' strip=' + (stripCam === this.thirdPersonCamera ? '3P' : 'MAP');
            this.scene.fog = null;  // No fog for strip cameras
            this.renderer.setViewport(halfW, mainH, w - halfW, stripH);
            this.renderer.setScissor(halfW, mainH, w - halfW, stripH);
            this.renderer.render(this.scene, stripCam);
            this.renderer.setScissorTest(false);
            this.scene.fog = savedFog;

        } else {
            // --- LANDSCAPE LAYOUT ---

            // Adjust fog density based on camera distance for better visuals
            if (this.scene.fog) {
                const camDist = this.activeCamera.position.length();
                this.scene.fog.density = this._baseFogDensity * (30 / Math.max(camDist, 30));
            }

            // Render full-screen main viewport
            this.renderer.setViewport(0, 0, w, h);
            this.renderer.setScissor(0, 0, w, h);
            this.renderer.setScissorTest(false);
            this.renderer.render(this.scene, this.activeCamera);

            // --- Picture-in-picture secondary viewport (bottom-right) ---
            const minimapFrac = narrow ? 0.22 : 0.25;

            if (this.cameraMode === 0) {
                // Top-down mode: show third-person PiP
                const mw = Math.floor(w * minimapFrac);
                const mh = Math.floor(mw * 9 / 16);  // 16:9 aspect ratio
                const mx = w - mw - 10;
                const my = h - mh - 10;

                this.renderer.setViewport(mx, my, mw, mh);
                this.renderer.setScissor(mx, my, mw, mh);
                this.renderer.setScissorTest(true);
                this.renderer.render(this.scene, this.thirdPersonCamera);
                this.renderer.setScissorTest(false);

            } else if (this.cameraMode === 1) {
                // Third-person mode: show minimap PiP (no fog)
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

            // --- Front camera PiP (bottom-left, hidden on narrow screens) ---
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
    //  MAIN GAME LOOP
    // --------------------------------------------------------

    /**
     * The main game loop. Runs update() for game logic, then
     * render3D() for visual output, then schedules the next frame
     * via requestAnimationFrame (~60fps).
     */
    loop() {
        this.update();
        this.render3D();
        requestAnimationFrame(() => this.loop());
    }
}


// ============================================================
//  BOOT
// ============================================================
//  Waits for the DOM to be fully loaded, then creates the Game
//  instance which initializes everything and starts the loop.
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
