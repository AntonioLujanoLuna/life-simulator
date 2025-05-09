/**
 * Renderer.js - Particle system visualization
 * 
 * Features:
 * - Efficient particle rendering
 * - Multiple rendering styles (circles, squares, images, etc.)
 * - Debug visualizations for forces, boundaries, etc.
 * - Performance optimization
 * - Visual effects (trails, glow, etc.)
 */

class Renderer {
    /**
     * Create a new particle renderer
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {ParticleSystem} particles - Particle system
     * @param {Camera} camera - Camera system
     * @param {ColorManager} colorManager - Color manager
     * @param {Object} options - Renderer options
     */
    constructor(canvas, particles, camera, colorManager, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.particles = particles;
      this.camera = camera;
      this.colorManager = colorManager;
      
      // Default options
      this.options = Object.assign({
        renderStyle: 'circle',      // 'circle', 'square', 'pixel', 'image', 'custom'
        background: '#111',         // Background color
        bgAlpha: 1.0,               // Background opacity
        showBoundary: true,         // Show simulation boundary
        boundaryColor: 'rgba(255,255,255,0.2)',
        pixelSize: 2,               // Size of pixels when using 'pixel' style
        useTrails: false,           // Enable particle trails
        trailLength: 10,            // Number of positions to keep in trail
        trailOpacityStart: 0.5,     // Starting opacity for trails
        trailOpacityEnd: 0,         // Ending opacity for trails
        particleGlow: false,        // Add glow effect to particles
        glowSize: 2,                // Glow size multiplier
        glowIntensity: 0.5,         // Glow intensity
        drawShadows: false,         // Draw shadows under particles
        shadowOffset: 2,            // Shadow offset
        shadowOpacity: 0.3,         // Shadow opacity
        velocityArrows: false,      // Draw velocity direction arrows
        disableSmoothing: false,    // Disable anti-aliasing for pixelated look
        showQuadtree: false,        // Debug: show quadtree
        showForces: false,          // Debug: show force vectors
        forceScale: 10,             // Debug: scale factor for force vectors
        useBatch: true,             // Use batch rendering for performance
        renderingMode: 'normal',    // 'normal', 'fast', 'detailed'
        maxParticlesPerFrame: 10000, // Limit for fast rendering mode
        statsOverlay: false,        // Show performance statistics overlay
        statsUpdateInterval: 1000    // Stats update interval in ms
      }, options);
      
      // Trail storage
      this.trails = [];
      this.needsTrailUpdate = true;
      
      // Images for particle rendering
      this.particleImages = {};
      
      // Rendering stats
      this.stats = {
        fps: 0,
        frameTime: 0,
        particlesRendered: 0,
        lastStatsUpdate: 0,
        frameCount: 0,
        totalFrameTime: 0
      };
      
      // Offscreen canvas for batched rendering
      this.offscreenCanvas = null;
      this.offscreenCtx = null;
      if (this.options.useBatch) {
        this.initOffscreenCanvas();
      }
      
      // Adapt to high DPI displays
      this.setupHiDPI();
      
      // Resize canvas when window is resized
      this._resizeHandler = this.handleResize.bind(this);
      window.addEventListener('resize', this._resizeHandler);
      
      // Resize to initial size
      this.handleResize();
    }
    
    /**
     * Initialize offscreen canvas for batch rendering
     * @private
     */
    initOffscreenCanvas() {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.canvas.width;
      this.offscreenCanvas.height = this.canvas.height;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
    }
    
    /**
     * Handle canvas resize
     */
    handleResize() {
      const containerStyle = getComputedStyle(this.canvas.parentElement || document.body);
      const width = parseInt(containerStyle.width, 10);
      const height = parseInt(containerStyle.height, 10);
      
      // Update canvas size
      this.canvas.width = width;
      this.canvas.height = height;
      
      // Resize offscreen canvas if using batch rendering
      if (this.options.useBatch && this.offscreenCanvas) {
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
      }
      
      this.setupHiDPI();
    }
    
    /**
     * Set up for high DPI displays
     * @private
     */
    setupHiDPI() {
      // Get device pixel ratio
      const dpr = window.devicePixelRatio || 1;
      
      // Get canvas dimensions
      const { width, height } = this.canvas;
      
      // Scale up for high DPI
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      
      // Scale context
      this.ctx.scale(dpr, dpr);
      
      // Do the same for offscreen canvas if used
      if (this.options.useBatch && this.offscreenCanvas) {
        this.offscreenCanvas.width = width * dpr;
        this.offscreenCanvas.height = height * dpr;
        this.offscreenCtx.scale(dpr, dpr);
      }
    }
    
    /**
     * Set renderer options
     * @param {Object} options - New options
     */
    setOptions(options) {
      const oldRendingMode = this.options.renderingMode;
      const oldBatchSetting = this.options.useBatch;
      
      this.options = Object.assign(this.options, options);
      
      // If batch rendering setting changed, reinitialize
      if (oldBatchSetting !== this.options.useBatch) {
        if (this.options.useBatch) {
          this.initOffscreenCanvas();
        } else {
          this.offscreenCanvas = null;
          this.offscreenCtx = null;
        }
      }
      
      // If trail setting changed, reinitialize trails
      if (options.useTrails !== undefined && options.useTrails !== this.options.useTrails) {
        this.needsTrailUpdate = true;
        if (options.useTrails) {
          this.initTrails();
        } else {
          this.trails = [];
        }
      }
    }
    
    /**
     * Initialize particle trails
     * @private
     */
    initTrails() {
      this.trails = new Array(this.particles.maxParticles);
      
      for (let i = 0; i < this.particles.maxParticles; i++) {
        this.trails[i] = [];
      }
      this.needsTrailUpdate = false;
    }
    
    /**
     * Update particle trails with current positions
     * @private
     */
    updateTrails() {
      if (!this.options.useTrails) return;
      
      // Initialize trails if needed
      if (this.needsTrailUpdate) {
        this.initTrails();
      }
      
      // Update each particle's trail
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) {
          // Clear trail for inactive particles
          this.trails[i] = [];
          continue;
        }
        
        const idx = i * 2;
        const x = this.particles.positions[idx];
        const y = this.particles.positions[idx + 1];
        
        // Add current position to trail
        this.trails[i].push({ x, y });
        
        // Limit trail length
        if (this.trails[i].length > this.options.trailLength) {
          this.trails[i].shift();
        }
      }
    }
    
    /**
     * Load image for particle rendering
     * @param {string} key - Image identifier
     * @param {string} src - Image source URL
     * @return {Promise} Promise that resolves when image is loaded
     */
    loadParticleImage(key, src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.particleImages[key] = img;
          resolve(img);
        };
        img.onerror = () => {
          reject(new Error(`Failed to load image: ${src}`));
        };
        img.src = src;
      });
    }
    
    /**
     * Render the particles
     * @param {number} interpolationAlpha - Interpolation factor (0-1)
     */
    render(interpolationAlpha = 0) {
      const startTime = performance.now();
      
      // Update stats
      this.stats.frameCount++;
      
      const ctx = this.options.useBatch ? this.offscreenCtx : this.ctx;
      
      // Clear canvas
      if (this.options.bgAlpha < 1.0) {
        // Partially transparent background
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      
      // Fill background if specified
      if (this.options.background) {
        ctx.fillStyle = this.options.background;
        if (this.options.bgAlpha < 1.0) {
          // Use globalAlpha for background transparency
          ctx.globalAlpha = this.options.bgAlpha;
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          ctx.globalAlpha = 1.0;
        } else {
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
      }
      
      // Apply camera transform
      this.camera.applyTransform(ctx);
      
      // Update trails if enabled
      if (this.options.useTrails) {
        this.updateTrails();
      }
      
      // Disable image smoothing for pixelated look if requested
      if (this.options.disableSmoothing) {
        ctx.imageSmoothingEnabled = false;
      }
      
      // Draw world boundary if enabled
      if (this.options.showBoundary && this.camera.options.worldBounds) {
        this.drawWorldBoundary(ctx);
      }
      
      // Show quadtree if debugging
      if (this.options.showQuadtree && this.options.quadtree) {
        this.options.quadtree.draw(ctx);
      }
      
      // Select appropriate rendering mode
      switch (this.options.renderingMode) {
        case 'fast':
          this.renderFast(ctx, interpolationAlpha);
          break;
        case 'detailed':
          this.renderDetailed(ctx, interpolationAlpha);
          break;
        case 'normal':
        default:
          this.renderNormal(ctx, interpolationAlpha);
          break;
      }
      
      // Draw debug visualizations
      if (this.options.showForces) {
        this.drawForceVectors(ctx);
      }
      
      // Reset camera transform
      this.camera.resetTransform(ctx);
      
      // If using batch rendering, copy offscreen canvas to main canvas
      if (this.options.useBatch) {
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
      }
      
      // Draw camera debug info if enabled
      this.camera.drawDebug(this.ctx);
      
      // Draw stats overlay if enabled
      if (this.options.statsOverlay) {
        this.drawStatsOverlay();
      }
      
      // Update rendering stats
      this.stats.frameTime = performance.now() - startTime;
      this.stats.totalFrameTime += this.stats.frameTime;
      
      // Update FPS stats at interval
      const currentTime = performance.now();
      if (currentTime - this.stats.lastStatsUpdate > this.options.statsUpdateInterval) {
        this.stats.fps = Math.round(1000 * this.stats.frameCount / (currentTime - this.stats.lastStatsUpdate));
        this.stats.avgFrameTime = this.stats.totalFrameTime / this.stats.frameCount;
        this.stats.lastStatsUpdate = currentTime;
        this.stats.frameCount = 0;
        this.stats.totalFrameTime = 0;
      }
    }
    
    /**
     * Normal rendering mode - balanced between speed and quality
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} interpolationAlpha - Interpolation factor (0-1)
     * @private
     */
    renderNormal(ctx, interpolationAlpha) {
      // First draw trails if enabled
      if (this.options.useTrails) {
        this.drawTrails(ctx);
      }
      
      // Draw shadows if enabled
      if (this.options.drawShadows) {
        this.drawParticleShadows(ctx);
      }
      
      // Draw particles
      this.drawParticles(ctx, interpolationAlpha);
      
      // Draw glow if enabled
      if (this.options.particleGlow) {
        this.drawParticleGlow(ctx, interpolationAlpha);
      }
      
      // Draw velocity arrows if enabled
      if (this.options.velocityArrows) {
        this.drawVelocityArrows(ctx);
      }
    }
    
    /**
     * Fast rendering mode - optimized for large particle counts
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} interpolationAlpha - Interpolation factor (0-1)
     * @private
     */
    renderFast(ctx, interpolationAlpha) {
      // Limit number of particles to render
      const maxParticles = this.options.maxParticlesPerFrame;
      const renderCount = Math.min(this.particles.count, maxParticles);
      
      // Set rendering style to simple mode
      const originalStyle = this.options.renderStyle;
      if (originalStyle === 'circle') {
        this.options.renderStyle = 'pixel';
      }
      
      // Draw particles with minimal effects
      ctx.beginPath();
      
      for (let i = 0; i < renderCount; i++) {
        if (!this.particles.active[i]) continue;
        
        const idx = i * 2;
        const x = this.particles.positions[idx];
        const y = this.particles.positions[idx + 1];
        
        // Calculate velocity for color
        const vx = this.particles.velocities[idx];
        const vy = this.particles.velocities[idx + 1];
        const velocity = Math.sqrt(vx * vx + vy * vy);
        
        // Get color
        const type = this.particles.types[i];
        ctx.fillStyle = this.colorManager.getParticleColor(
          { type }, 
          { velocity }
        );
        
        // Draw as pixel or small square
        const size = this.options.pixelSize;
        ctx.fillRect(x - size/2, y - size/2, size, size);
      }
      
      // Restore original style
      this.options.renderStyle = originalStyle;
      
      this.stats.particlesRendered = renderCount;
    }
    
    /**
     * Detailed rendering mode - high quality with all effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} interpolationAlpha - Interpolation factor (0-1)
     * @private
     */
    renderDetailed(ctx, interpolationAlpha) {
      // Draw trails with higher quality
      if (this.options.useTrails) {
        this.drawTrails(ctx, true);
      }
      
      // Draw enhanced shadows
      if (this.options.drawShadows) {
        this.drawParticleShadows(ctx, 1.5);
      }
      
      // Draw enhanced glow
      if (this.options.particleGlow) {
        // Pre-glow layer
        this.drawParticleGlow(ctx, interpolationAlpha, 2.0, 0.3);
      }
      
      // Draw particles with high quality
      this.drawParticles(ctx, interpolationAlpha, true);
      
      // Draw enhanced glow on top
      if (this.options.particleGlow) {
        this.drawParticleGlow(ctx, interpolationAlpha, 1.0, 0.7);
      }
      
      // Draw velocity arrows with more detail
      if (this.options.velocityArrows) {
        this.drawVelocityArrows(ctx, true);
      }
    }
    
        /**
     * Draw world boundaries with repeating grid effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @private
     */
    drawWorldBoundary(ctx) {
      const bounds = this.camera.options.worldBounds;
      if (!bounds) return;
      
      // Get current view bounds
      const viewBounds = this.camera.getViewBounds();
      
      // Calculate which world copies are visible
      const visibleWorldCopies = this.getVisibleWorldCopies(viewBounds, bounds);
      
      // Set the boundary style
      ctx.strokeStyle = this.options.boundaryColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]); // Dashed lines for the grid
      
      // Draw each visible world cell
      for (let worldX = visibleWorldCopies.minX; worldX <= visibleWorldCopies.maxX; worldX++) {
        for (let worldY = visibleWorldCopies.minY; worldY <= visibleWorldCopies.maxY; worldY++) {
          // Calculate the offset for this world copy
          const offsetX = worldX * bounds.width;
          const offsetY = worldY * bounds.height;
          
          // Draw the boundary rectangle
          ctx.strokeRect(
            bounds.x + offsetX,
            bounds.y + offsetY,
            bounds.width,
            bounds.height
          );
          
          // Add coordinates text to help with orientation
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.font = '14px Arial';
          ctx.fillText(
            `(${worldX},${worldY})`, 
            bounds.x + offsetX + 10,
            bounds.y + offsetY + 20
          );
        }
      }
      
      // Reset line dash
      ctx.setLineDash([]);
    }
    
    /**
     * Draw particle trails
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {boolean} highQuality - Whether to use high quality rendering
     * @private
     */
    drawTrails(ctx, highQuality = false) {
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i] || !this.trails[i] || this.trails[i].length < 2) continue;
        
        const trail = this.trails[i];
        const type = this.particles.types[i];
        
        // Get base color without alpha
        const baseColor = this.colorManager.getParticleColor(
          { type }, 
          { velocity: 0 }
        );
        
        // Fade opacity from start to end
        const startOpacity = this.options.trailOpacityStart;
        const endOpacity = this.options.trailOpacityEnd;
        
        if (highQuality) {
          // High quality trails with gradient
          ctx.beginPath();
          ctx.moveTo(trail[0].x, trail[0].y);
          
          for (let j = 1; j < trail.length; j++) {
            // Use bezier curves for smoother trails
            if (j < trail.length - 1) {
              const xc = (trail[j].x + trail[j+1].x) / 2;
              const yc = (trail[j].y + trail[j+1].y) / 2;
              ctx.quadraticCurveTo(trail[j].x, trail[j].y, xc, yc);
            } else {
              ctx.lineTo(trail[j].x, trail[j].y);
            }
          }
          
          // Create gradient along path
          const gradient = ctx.createLinearGradient(
            trail[0].x, trail[0].y,
            trail[trail.length-1].x, trail[trail.length-1].y
          );
          
          // Extract color components from RGBA string
          const colorMatch = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
          if (colorMatch) {
            const r = colorMatch[1];
            const g = colorMatch[2];
            const b = colorMatch[3];
            
            // Add gradient stops
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${endOpacity})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${startOpacity})`);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = this.particles.sizes[i] * 0.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        } else {
          // Standard quality trails
          ctx.beginPath();
          
          for (let j = 0; j < trail.length - 1; j++) {
            const opacity = endOpacity + (startOpacity - endOpacity) * (j / (trail.length - 1));
            
            // Extract color components
            const colorMatch = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
            if (colorMatch) {
              const r = colorMatch[1];
              const g = colorMatch[2];
              const b = colorMatch[3];
              
              ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
              ctx.lineWidth = this.particles.sizes[i] * 0.3;
              
              ctx.beginPath();
              ctx.moveTo(trail[j].x, trail[j].y);
              ctx.lineTo(trail[j+1].x, trail[j+1].y);
              ctx.stroke();
            }
          }
        }
      }
    }
    
        /**
     * Draw particles with repeating universe effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} interpolationAlpha - Interpolation factor (0-1)
     * @param {boolean} highQuality - Whether to use high quality rendering
     * @private
     */
    drawParticles(ctx, interpolationAlpha, highQuality = false) {
      // Determine visible area
      const viewBounds = this.camera.getViewBounds();
      
      // Expand bounds slightly to include particles just off-screen
      const extendedBounds = {
        x: viewBounds.x - 100,
        y: viewBounds.y - 100,
        width: viewBounds.width + 200,
        height: viewBounds.height + 200
      };
      
      // Reference to world bounds - for repeating effect
      const worldBounds = this.camera.options.worldBounds;
      
      // Track drawn particles count
      let particlesRendered = 0;
      
      // Determine how many copies of the world to render in each direction
      // This creates the repeating universe illusion
      const visibleWorldCopies = this.getVisibleWorldCopies(viewBounds, worldBounds);
      
      // For each world copy, draw the particles that would be visible
      for (let worldX = visibleWorldCopies.minX; worldX <= visibleWorldCopies.maxX; worldX++) {
        for (let worldY = visibleWorldCopies.minY; worldY <= visibleWorldCopies.maxY; worldY++) {
          // Skip drawing if no world bounds defined (initial loading)
          if (!worldBounds) continue;
          
          // Calculate the offset for this world copy
          const offsetX = worldX * worldBounds.width;
          const offsetY = worldY * worldBounds.height;
          
          // Draw each particle with appropriate offset
          for (let i = 0; i < this.particles.count; i++) {
            if (!this.particles.active[i]) continue;
            
            const idx = i * 2;
            const x = this.particles.positions[idx] + offsetX;
            const y = this.particles.positions[idx + 1] + offsetY;
            
            // Skip particles outside of extended view
            if (x < extendedBounds.x || x > extendedBounds.x + extendedBounds.width ||
                y < extendedBounds.y || y > extendedBounds.y + extendedBounds.height) {
              continue;
            }
            
            // Calculate velocity magnitude for coloring
            const vx = this.particles.velocities[idx];
            const vy = this.particles.velocities[idx + 1];
            const velocity = Math.sqrt(vx * vx + vy * vy);
            
            // Get particle properties
            const size = this.colorManager.getParticleSize(
              { type: this.particles.types[i] },
              this.particles.sizes[i]
            );
            
            const color = this.colorManager.getParticleColor(
              { 
                type: this.particles.types[i],
                properties: this.getParticleProperties(i)
              }, 
              { velocity }
            );
            
            // Render based on style
            switch (this.options.renderStyle) {
              case 'square':
                this.drawSquareParticle(ctx, x, y, size, color, highQuality);
                break;
                
              case 'pixel':
                this.drawPixelParticle(ctx, x, y, this.options.pixelSize, color);
                break;
                
              case 'image':
                this.drawImageParticle(ctx, x, y, size, color, this.particles.types[i]);
                break;
                
              case 'custom':
                if (this.options.customRenderer && typeof this.options.customRenderer === 'function') {
                  this.options.customRenderer(ctx, {
                    x, y, size, color, type: this.particles.types[i],
                    velocity: { x: vx, y: vy },
                    properties: this.getParticleProperties(i)
                  });
                } else {
                  // Fall back to circle if custom renderer not available
                  this.drawCircleParticle(ctx, x, y, size, color, highQuality);
                }
                break;
                
              case 'circle':
              default:
                this.drawCircleParticle(ctx, x, y, size, color, highQuality);
                break;
            }
            
            particlesRendered++;
          }
        }
      }
      
      this.stats.particlesRendered = particlesRendered;
    }

        /**
     * Calculate which world copies are visible in the current view
     * @param {Object} viewBounds - Current view bounds
     * @param {Object} worldBounds - World bounds
     * @return {Object} Visible world copies range {minX, maxX, minY, maxY}
     * @private
     */
    getVisibleWorldCopies(viewBounds, worldBounds) {
      // Default to just the main world if no world bounds
      if (!worldBounds || worldBounds.width === 0 || worldBounds.height === 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
      }
      
      // Calculate how many world copies we need in each direction
      // We add 1 to ensure we always render enough copies
      const minX = Math.floor(viewBounds.x / worldBounds.width) - 1;
      const maxX = Math.ceil((viewBounds.x + viewBounds.width) / worldBounds.width);
      const minY = Math.floor(viewBounds.y / worldBounds.height) - 1;
      const maxY = Math.ceil((viewBounds.y + viewBounds.height) / worldBounds.height);
      
      // Limit the number of copies to prevent rendering too many
      // This is an optimization to prevent excessive rendering
      const maxCopies = 3; // Adjust this value based on performance needs
      
      return {
        minX: Math.max(minX, -maxCopies),
        maxX: Math.min(maxX, maxCopies),
        minY: Math.max(minY, -maxCopies),
        maxY: Math.min(maxY, maxCopies)
      };
    }

    
    /**
     * Draw a circular particle
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Particle size
     * @param {string} color - Particle color
     * @param {boolean} highQuality - Whether to use high quality rendering
     * @private
     */
    drawCircleParticle(ctx, x, y, size, color, highQuality = false) {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      
      if (highQuality) {
        // Create radial gradient for more realistic look
        const gradient = ctx.createRadialGradient(
          x, y, 0,
          x, y, size
        );
        
        // Extract color components from RGBA string
        const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (colorMatch) {
          const r = parseInt(colorMatch[1], 10);
          const g = parseInt(colorMatch[2], 10);
          const b = parseInt(colorMatch[3], 10);
          const a = colorMatch[4] ? parseFloat(colorMatch[4]) : 1;
          
          // Lighter center
          const centerR = Math.min(255, r + 50);
          const centerG = Math.min(255, g + 50);
          const centerB = Math.min(255, b + 50);
          
          gradient.addColorStop(0, `rgba(${centerR}, ${centerG}, ${centerB}, ${a})`);
          gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${a})`);
          gradient.addColorStop(1, `rgba(${Math.max(0, r-20)}, ${Math.max(0, g-20)}, ${Math.max(0, b-20)}, ${a})`);
          
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = color;
        }
      } else {
        ctx.fillStyle = color;
      }
      
      ctx.fill();
    }
    
    /**
     * Draw a square particle
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Particle size
     * @param {string} color - Particle color
     * @param {boolean} highQuality - Whether to use high quality rendering
     * @private
     */
    drawSquareParticle(ctx, x, y, size, color, highQuality = false) {
      const halfSize = size;
      
      if (highQuality) {
        // Create gradient for more realistic look
        const gradient = ctx.createLinearGradient(
          x - halfSize, y - halfSize,
          x + halfSize, y + halfSize
        );
        
        // Extract color components
        const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (colorMatch) {
          const r = parseInt(colorMatch[1], 10);
          const g = parseInt(colorMatch[2], 10);
          const b = parseInt(colorMatch[3], 10);
          const a = colorMatch[4] ? parseFloat(colorMatch[4]) : 1;
          
          // Lighter top left
          const lighter = `rgba(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)}, ${a})`;
          // Darker bottom right
          const darker = `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, ${a})`;
          
          gradient.addColorStop(0, lighter);
          gradient.addColorStop(1, darker);
          
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = color;
        }
        
        // Rounded corners
        const radius = size * 0.2;
        ctx.beginPath();
        ctx.moveTo(x - halfSize + radius, y - halfSize);
        ctx.lineTo(x + halfSize - radius, y - halfSize);
        ctx.quadraticCurveTo(x + halfSize, y - halfSize, x + halfSize, y - halfSize + radius);
        ctx.lineTo(x + halfSize, y + halfSize - radius);
        ctx.quadraticCurveTo(x + halfSize, y + halfSize, x + halfSize - radius, y + halfSize);
        ctx.lineTo(x - halfSize + radius, y + halfSize);
        ctx.quadraticCurveTo(x - halfSize, y + halfSize, x - halfSize, y + halfSize - radius);
        ctx.lineTo(x - halfSize, y - halfSize + radius);
        ctx.quadraticCurveTo(x - halfSize, y - halfSize, x - halfSize + radius, y - halfSize);
        ctx.closePath();
        ctx.fill();
      } else {
        // Simple square
        ctx.fillStyle = color;
        ctx.fillRect(x - halfSize, y - halfSize, size * 2, size * 2);
      }
    }
    
    /**
     * Draw a pixel-style particle
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Pixel size
     * @param {string} color - Particle color
     * @private
     */
    drawPixelParticle(ctx, x, y, size, color) {
      ctx.fillStyle = color;
      
      // For pixel rendering, make sure the particles align to pixel grid
      const pixelX = Math.floor(x - size / 2);
      const pixelY = Math.floor(y - size / 2);
      
      ctx.fillRect(pixelX, pixelY, size, size);
    }
    
    /**
     * Draw an image particle
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Particle size
     * @param {string} color - Particle color (for tinting)
     * @param {number} type - Particle type
     * @private
     */
    drawImageParticle(ctx, x, y, size, color, type) {
      // Get image for particle type
      const imageKey = `type${type}`;
      const image = this.particleImages[imageKey] || this.particleImages.default;
      
      if (image) {
        // Calculate centered position
        const halfSize = size;
        const drawSize = size * 2;
        
        // Apply tinting if specified
        if (this.options.tintImages) {
          // Save context for clipping and filtering
          ctx.save();
          
          // Create circular clipping path
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          
          // Extract color components
          const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (colorMatch) {
            const r = parseInt(colorMatch[1], 10) / 255;
            const g = parseInt(colorMatch[2], 10) / 255;
            const b = parseInt(colorMatch[3], 10) / 255;
            
            // Apply color filter
            ctx.filter = `brightness(0.8) sepia(1) saturate(${g + 0.5}) hue-rotate(${Math.round(360 * (0.5 - b))}deg)`;
          }
          
          // Draw image
          ctx.drawImage(image, x - halfSize, y - halfSize, drawSize, drawSize);
          
          // Restore context
          ctx.restore();
        } else {
          // Draw image without tinting
          ctx.drawImage(image, x - halfSize, y - halfSize, drawSize, drawSize);
        }
      } else {
        // Fallback to circle if image not available
        this.drawCircleParticle(ctx, x, y, size, color);
      }
    }
    
    /**
     * Draw particle glow effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} interpolationAlpha - Interpolation factor (0-1)
     * @param {number} sizeFactor - Size multiplier for glow
     * @param {number} intensityFactor - Intensity multiplier for glow
     * @private
     */
    drawParticleGlow(ctx, interpolationAlpha, sizeFactor = 1.0, intensityFactor = 1.0) {
      // Save original composite operation
      const originalComposite = ctx.globalCompositeOperation;
      
      // Set to screen for additive blending
      ctx.globalCompositeOperation = 'screen';
      
      const intensity = this.options.glowIntensity * intensityFactor;
      const sizeMultiplier = this.options.glowSize * sizeFactor;
      
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) continue;
        
        const idx = i * 2;
        const x = this.particles.positions[idx];
        const y = this.particles.positions[idx + 1];
        
        // Calculate velocity for color intensity
        const vx = this.particles.velocities[idx];
        const vy = this.particles.velocities[idx + 1];
        const velocity = Math.sqrt(vx * vx + vy * vy);
        
        // Skip particles outside of view
        const viewBounds = this.camera.getViewBounds();
        if (x < viewBounds.x - 100 || x > viewBounds.x + viewBounds.width + 100 ||
            y < viewBounds.y - 100 || y > viewBounds.y + viewBounds.height + 100) {
          continue;
        }
        
        // Get particle color
        const color = this.colorManager.getParticleColor(
          { 
            type: this.particles.types[i],
            properties: this.getParticleProperties(i)
          }, 
          { velocity }
        );
        
        // Extract color components
        const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (colorMatch) {
          const r = parseInt(colorMatch[1], 10);
          const g = parseInt(colorMatch[2], 10);
          const b = parseInt(colorMatch[3], 10);
          const a = colorMatch[4] ? parseFloat(colorMatch[4]) : 1;
          
          // Create radial gradient for glow
          const size = this.colorManager.getParticleSize(
            { type: this.particles.types[i] },
            this.particles.sizes[i]
          );
          
          const glowSize = size * sizeMultiplier;
          const glowAlpha = Math.min(1, a * intensity);
          
          const gradient = ctx.createRadialGradient(
            x, y, size * 0.5,
            x, y, glowSize
          );
          
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowAlpha})`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, glowSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Restore original composite operation
      ctx.globalCompositeOperation = originalComposite;
    }
    
    /**
     * Draw shadows under particles
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} shadowScale - Scale factor for shadow size
     * @private
     */
    drawParticleShadows(ctx, shadowScale = 1.0) {
      const offset = this.options.shadowOffset;
      const opacity = this.options.shadowOpacity;
      
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) continue;
        
        const idx = i * 2;
        const x = this.particles.positions[idx] + offset;
        const y = this.particles.positions[idx + 1] + offset;
        
        // Skip particles outside of view
        const viewBounds = this.camera.getViewBounds();
        if (x < viewBounds.x - 50 || x > viewBounds.x + viewBounds.width + 50 ||
            y < viewBounds.y - 50 || y > viewBounds.y + viewBounds.height + 50) {
          continue;
        }
        
        const size = this.colorManager.getParticleSize(
          { type: this.particles.types[i] },
          this.particles.sizes[i]
        );
        
        // Draw shadow
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size * shadowScale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    /**
     * Draw velocity direction arrows
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {boolean} detailed - Whether to use detailed rendering
     * @private
     */
    drawVelocityArrows(ctx, detailed = false) {
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) continue;
        
        const idx = i * 2;
        const x = this.particles.positions[idx];
        const y = this.particles.positions[idx + 1];
        
        // Calculate velocity
        const vx = this.particles.velocities[idx];
        const vy = this.particles.velocities[idx + 1];
        const velocity = Math.sqrt(vx * vx + vy * vy);
        
        // Skip if velocity is too small
        if (velocity < 0.1) continue;
        
        // Skip particles outside of view
        const viewBounds = this.camera.getViewBounds();
        if (x < viewBounds.x || x > viewBounds.x + viewBounds.width ||
            y < viewBounds.y || y > viewBounds.y + viewBounds.height) {
          continue;
        }
        
        // Draw velocity vector
        const size = this.particles.sizes[i];
        const arrowLength = size + velocity * 5;
        const endX = x + (vx / velocity) * arrowLength;
        const endY = y + (vy / velocity) * arrowLength;
        
        // Get color based on velocity
        const type = this.particles.types[i];
        const color = this.colorManager.getParticleColor(
          { type }, 
          { velocity }
        );
        
        if (detailed) {
          // Draw arrow with arrowhead
          const angle = Math.atan2(vy, vx);
          const headSize = size * 0.8;
          
          // Draw shaft
          ctx.strokeStyle = color;
          ctx.lineWidth = size * 0.3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          
          // Draw arrowhead
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headSize * Math.cos(angle - Math.PI / 6),
            endY - headSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endX - headSize * Math.cos(angle + Math.PI / 6),
            endY - headSize * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        } else {
          // Simple line
          ctx.strokeStyle = color;
          ctx.lineWidth = size * 0.3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }
    }
    
    /**
     * Draw force vectors for debugging
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @private
     */
    drawForceVectors(ctx) {
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) continue;
        
        const idx = i * 2;
        const x = this.particles.positions[idx];
        const y = this.particles.positions[idx + 1];
        
        // Skip particles outside of view
        const viewBounds = this.camera.getViewBounds();
        if (x < viewBounds.x || x > viewBounds.x + viewBounds.width ||
            y < viewBounds.y || y > viewBounds.y + viewBounds.height) {
          continue;
        }
        
        // Get acceleration (force)
        const ax = this.particles.accelerations[idx];
        const ay = this.particles.accelerations[idx + 1];
        const forceMag = Math.sqrt(ax * ax + ay * ay);
        
        // Skip if force is too small
        if (forceMag < 0.01) continue;
        
        // Draw force vector
        const scale = this.options.forceScale;
        const endX = x + ax * scale;
        const endY = y + ay * scale;
        
        // Color based on force magnitude
        const intensity = Math.min(1, forceMag * 0.1);
        const r = Math.floor(intensity * 255);
        const g = Math.floor((1 - intensity) * 255);
        const color = `rgba(${r}, ${g}, 0, 0.7)`;
        
        // Draw line
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Draw arrowhead
        const angle = Math.atan2(ay, ax);
        const headSize = 3;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headSize * Math.cos(angle - Math.PI / 6),
          endY - headSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          endX - headSize * Math.cos(angle + Math.PI / 6),
          endY - headSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    }
    
    /**
     * Draw stats overlay
     * @private
     */
    drawStatsOverlay() {
      const ctx = this.ctx;
      ctx.save();
      
      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 90);
      
      // Text
      ctx.font = '12px monospace';
      ctx.fillStyle = 'white';
      ctx.fillText(`FPS: ${this.stats.fps}`, 20, 30);
      ctx.fillText(`Frame time: ${this.stats.avgFrameTime?.toFixed(2) || 0} ms`, 20, 50);
      ctx.fillText(`Particles: ${this.stats.particlesRendered} / ${this.particles.getActiveCount()}`, 20, 70);
      ctx.fillText(`Scale: ${this.camera.scale.toFixed(2)}x`, 20, 90);
      
      ctx.restore();
    }
    
    /**
     * Get particle custom properties
     * @param {number} index - Particle index
     * @return {Array} Array of property values
     * @private
     */
    getParticleProperties(index) {
      const propIdx = index * 4;
      return [
        this.particles.properties[propIdx],
        this.particles.properties[propIdx + 1],
        this.particles.properties[propIdx + 2],
        this.particles.properties[propIdx + 3]
      ];
    }
    
    /**
     * Clean up resources
     */
    dispose() {
      // Remove event listeners
      window.removeEventListener('resize', this._resizeHandler);
      
      // Clear references
      this.particles = null;
      this.camera = null;
      this.colorManager = null;
      this.trails = null;
      this.particleImages = null;
      this.offscreenCanvas = null;
      this.offscreenCtx = null;
    }
  }
  
  export default Renderer;