/**
 * Camera.js - Camera system for zoom and pan
 * 
 * Features:
 * - Zoom and pan functionality
 * - Coordinate conversion between world and screen
 * - Mouse and touch input handling
 * - Smooth transitions and animations
 * - Viewbox constraints
 */

class Camera {
    /**
     * Create a new camera
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} options - Camera options
     */
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      
      // Default options
      this.options = Object.assign({
        initialScale: 1.0,
        minScale: 0.1,
        maxScale: 10.0,
        zoomSpeed: 0.1,
        panSpeed: 1.0,
        smoothingFactor: 0.15,
        keepInView: true,
        constrainViewToWorld: true,
        worldBounds: null // Will be set by engine
      }, options);
      
      // Camera state
      this.position = { x: 0, y: 0 };        // Center of view in world coordinates
      this.targetPosition = { x: 0, y: 0 };  // For smooth transitions
      this.scale = this.options.initialScale; // Zoom level (1.0 = 100%)
      this.targetScale = this.options.initialScale;
      this.isDragging = false;
      this.lastMousePos = { x: 0, y: 0 };
      
      // For pinch-to-zoom
      this.touchDistance = 0;
      this.touchMode = 'none'; // 'none', 'pan', 'zoom'
      this.touchPoints = [];
      
      // For animation
      this.isAnimating = false;
      this.animationStartTime = 0;
      this.animationDuration = 0;
      this.animationStartPos = { x: 0, y: 0 };
      this.animationEndPos = { x: 0, y: 0 };
      this.animationStartScale = 1.0;
      this.animationEndScale = 1.0;
      
      // Debugging
      this.debug = false;
      
      // Bind event handlers
      this._bindEvents();
    }
    
    /**
     * Bind mouse and touch events
     * @private
     */
    _bindEvents() {
      // Mouse events
      this.canvas.addEventListener('wheel', this._handleZoom.bind(this));
      this.canvas.addEventListener('mousedown', this._handleMouseDown.bind(this));
      window.addEventListener('mousemove', this._handleMouseMove.bind(this));
      window.addEventListener('mouseup', this._handleMouseUp.bind(this));
      
      // Touch events
      this.canvas.addEventListener('touchstart', this._handleTouchStart.bind(this));
      window.addEventListener('touchmove', this._handleTouchMove.bind(this));
      window.addEventListener('touchend', this._handleTouchEnd.bind(this));
      window.addEventListener('touchcancel', this._handleTouchEnd.bind(this));
      
      // Prevent context menu on right-click
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    /**
     * Set world bounds
     * @param {Object} bounds - World bounds {x, y, width, height}
     */
    setWorldBounds(bounds) {
      this.options.worldBounds = bounds;
      
      // Center camera on world if not set
      if (this.position.x === 0 && this.position.y === 0) {
        this.position.x = bounds.x + bounds.width / 2;
        this.position.y = bounds.y + bounds.height / 2;
        this.targetPosition = {...this.position};
      }
    }
    
    /**
     * Convert world coordinates to screen coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @return {Object} Screen coordinates {x, y}
     */
    worldToScreen(worldX, worldY) {
      return {
        x: (worldX - this.position.x) * this.scale + this.canvas.width / 2,
        y: (worldY - this.position.y) * this.scale + this.canvas.height / 2
      };
    }
    
    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @return {Object} World coordinates {x, y}
     */
    screenToWorld(screenX, screenY) {
      return {
        x: (screenX - this.canvas.width / 2) / this.scale + this.position.x,
        y: (screenY - this.canvas.height / 2) / this.scale + this.position.y
      };
    }
    
    /**
     * Get current view bounds in world coordinates
     * @return {Object} View bounds {x, y, width, height}
     */
    getViewBounds() {
      const halfWidth = (this.canvas.width / 2) / this.scale;
      const halfHeight = (this.canvas.height / 2) / this.scale;
      
      return {
        x: this.position.x - halfWidth,
        y: this.position.y - halfHeight,
        width: halfWidth * 2,
        height: halfHeight * 2
      };
    }
    
    /**
     * Check if a point is visible in the current view
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @return {boolean} True if point is visible
     */
    isPointVisible(x, y) {
      const bounds = this.getViewBounds();
      return (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      );
    }
    
    /**
     * Apply camera transform to canvas context
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    applyTransform(ctx) {
      ctx.save();
      
      // Move to center of canvas
      ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      
      // Apply zoom
      ctx.scale(this.scale, this.scale);
      
      // Move to camera position (inverted since we're moving the world, not the camera)
      ctx.translate(-this.position.x, -this.position.y);
    }
    
    /**
     * Reset transform to identity
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    resetTransform(ctx) {
      ctx.restore();
    }
    
    /**
     * Update camera (smoothing, animation, constraints)
     * @param {number} deltaTime - Time since last update (ms)
     */
    update(deltaTime) {
      // Handle animation
      if (this.isAnimating) {
        const elapsed = performance.now() - this.animationStartTime;
        const t = Math.min(elapsed / this.animationDuration, 1.0);
        
        // Easing function (cubic ease-in-out)
        const easedT = t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
        
        // Interpolate position and scale
        this.position.x = this.animationStartPos.x + (this.animationEndPos.x - this.animationStartPos.x) * easedT;
        this.position.y = this.animationStartPos.y + (this.animationEndPos.y - this.animationStartPos.y) * easedT;
        this.scale = this.animationStartScale + (this.animationEndScale - this.animationStartScale) * easedT;
        
        // End animation when complete
        if (t >= 1.0) {
          this.isAnimating = false;
        }
      } else {
        // Smooth camera motion
        const smooth = Math.min(1.0, this.options.smoothingFactor * (deltaTime / 16.67));
        
        this.position.x += (this.targetPosition.x - this.position.x) * smooth;
        this.position.y += (this.targetPosition.y - this.position.y) * smooth;
        this.scale += (this.targetScale - this.scale) * smooth;
      }
      
      // Enforce constraints
      this._enforceConstraints();
    }
    
    /**
     * Move camera to a specific position
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     * @param {boolean} instant - Skip animation
     */
    moveTo(x, y, instant = false) {
      if (instant) {
        this.position.x = x;
        this.position.y = y;
        this.targetPosition.x = x;
        this.targetPosition.y = y;
      } else {
        this.targetPosition.x = x;
        this.targetPosition.y = y;
      }
    }
    
    /**
     * Set zoom level
     * @param {number} newScale - New zoom level
     * @param {boolean} instant - Skip animation
     */
    setZoom(newScale, instant = false) {
      const scale = Math.max(
        this.options.minScale,
        Math.min(this.options.maxScale, newScale)
      );
      
      if (instant) {
        this.scale = scale;
        this.targetScale = scale;
      } else {
        this.targetScale = scale;
      }
    }
    
    /**
     * Zoom and center on a specific region
     * @param {Object} bounds - Region to focus {x, y, width, height}
     * @param {number} padding - Padding around region (0-1)
     * @param {number} duration - Animation duration (ms), 0 for instant
     */
    zoomToRegion(bounds, padding = 0.1, duration = 500) {
      // Calculate target scale to fit region
      const scaleX = this.canvas.width / (bounds.width * (1 + padding * 2));
      const scaleY = this.canvas.height / (bounds.height * (1 + padding * 2));
      
      // Use smaller scale to ensure entire region is visible
      const newScale = Math.min(scaleX, scaleY);
      
      // Constrain to min/max scale
      const constrainedScale = Math.max(
        this.options.minScale,
        Math.min(this.options.maxScale, newScale)
      );
      
      // Calculate center of region
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      
      if (duration <= 0) {
        // Instant update
        this.scale = constrainedScale;
        this.targetScale = constrainedScale;
        this.position.x = centerX;
        this.position.y = centerY;
        this.targetPosition.x = centerX;
        this.targetPosition.y = centerY;
      } else {
        // Animated transition
        this.isAnimating = true;
        this.animationStartTime = performance.now();
        this.animationDuration = duration;
        this.animationStartPos = {...this.position};
        this.animationEndPos = {x: centerX, y: centerY};
        this.animationStartScale = this.scale;
        this.animationEndScale = constrainedScale;
      }
    }
    
    /**
     * Reset camera to initial state
     * @param {number} duration - Animation duration (ms), 0 for instant
     */
    reset(duration = 500) {
      if (this.options.worldBounds) {
        // Reset to center of world bounds
        this.zoomToRegion(this.options.worldBounds, 0.05, duration);
      } else {
        // Reset to origin with default scale
        const centerX = 0;
        const centerY = 0;
        const defaultScale = this.options.initialScale;
        
        if (duration <= 0) {
          this.scale = defaultScale;
          this.targetScale = defaultScale;
          this.position.x = centerX;
          this.position.y = centerY;
          this.targetPosition.x = centerX;
          this.targetPosition.y = centerY;
        } else {
          this.isAnimating = true;
          this.animationStartTime = performance.now();
          this.animationDuration = duration;
          this.animationStartPos = {...this.position};
          this.animationEndPos = {x: centerX, y: centerY};
          this.animationStartScale = this.scale;
          this.animationEndScale = defaultScale;
        }
      }
    }
    
    /**
     * Enforce camera constraints
     * @private
     */
    _enforceConstraints() {
      // Enforce zoom constraints
      this.scale = Math.max(
        this.options.minScale,
        Math.min(this.options.maxScale, this.scale)
      );
      
      // Enforce world bounds constraints if enabled
      if (this.options.constrainViewToWorld && this.options.worldBounds) {
        const worldBounds = this.options.worldBounds;
        const viewBounds = this.getViewBounds();
        
        // Calculate maximum allowed offsets
        const maxOffsetX = Math.max(0, (viewBounds.width - worldBounds.width) / 2);
        const maxOffsetY = Math.max(0, (viewBounds.height - worldBounds.height) / 2);
        
        // Calculate world center
        const worldCenterX = worldBounds.x + worldBounds.width / 2;
        const worldCenterY = worldBounds.y + worldBounds.height / 2;
        
        // Constrain X position
        if (viewBounds.width < worldBounds.width) {
          // View is smaller than world, ensure view is inside world
          if (viewBounds.x < worldBounds.x) {
            this.position.x += worldBounds.x - viewBounds.x;
          } else if (viewBounds.x + viewBounds.width > worldBounds.x + worldBounds.width) {
            this.position.x -= (viewBounds.x + viewBounds.width) - (worldBounds.x + worldBounds.width);
          }
        } else {
          // View is larger than world, center world in view
          this.position.x = worldCenterX;
        }
        
        // Constrain Y position (similar logic)
        if (viewBounds.height < worldBounds.height) {
          if (viewBounds.y < worldBounds.y) {
            this.position.y += worldBounds.y - viewBounds.y;
          } else if (viewBounds.y + viewBounds.height > worldBounds.y + worldBounds.height) {
            this.position.y -= (viewBounds.y + viewBounds.height) - (worldBounds.y + worldBounds.height);
          }
        } else {
          this.position.y = worldCenterY;
        }
      }
    }
    
    /**
     * Handle mouse wheel zoom
     * @param {WheelEvent} event - Wheel event
     * @private
     */
    _handleZoom(event) {
      event.preventDefault();
      
      // Get mouse position before zoom
      const mousePos = {
        x: event.offsetX,
        y: event.offsetY
      };
      
      // Convert to world coordinates
      const worldPos = this.screenToWorld(mousePos.x, mousePos.y);
      
      // Calculate zoom factor
      const zoomFactor = event.deltaY > 0 ? 
                         (1 - this.options.zoomSpeed) : 
                         (1 + this.options.zoomSpeed);
      
      // Apply zoom
      const newScale = this.targetScale * zoomFactor;
      this.targetScale = Math.max(
        this.options.minScale,
        Math.min(this.options.maxScale, newScale)
      );
      
      if (this.options.keepInView) {
        // Adjust position to zoom toward mouse
        const scaleFactor = this.targetScale / this.scale;
        const dx = (worldPos.x - this.targetPosition.x) * (1 - 1 / scaleFactor);
        const dy = (worldPos.y - this.targetPosition.y) * (1 - 1 / scaleFactor);
        
        this.targetPosition.x += dx;
        this.targetPosition.y += dy;
      }
    }
    
    /**
     * Handle mouse button down
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _handleMouseDown(event) {
      // Only primary button (left click)
      if (event.button !== 0) return;
      
      this.isDragging = true;
      this.lastMousePos = {
        x: event.clientX,
        y: event.clientY
      };
      
      // Prevent text selection during drag
      event.preventDefault();
      
      // Set canvas cursor
      this.canvas.style.cursor = 'grabbing';
    }
    
    /**
     * Handle mouse movement
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _handleMouseMove(event) {
      if (!this.isDragging) return;
      
      // Calculate movement delta
      const deltaX = event.clientX - this.lastMousePos.x;
      const deltaY = event.clientY - this.lastMousePos.y;
      
      // Convert to world coordinates based on scale
      this.targetPosition.x -= deltaX / this.scale;
      this.targetPosition.y -= deltaY / this.scale;
      
      // Update last position
      this.lastMousePos = {
        x: event.clientX,
        y: event.clientY
      };
    }
    
    /**
     * Handle mouse button up
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _handleMouseUp() {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    }
    
    /**
     * Handle touch start
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchStart(event) {
      event.preventDefault(); // Prevent scrolling
      
      // Store touch points
      this.touchPoints = [];
      for (let i = 0; i < event.touches.length; i++) {
        this.touchPoints.push({
          id: event.touches[i].identifier,
          x: event.touches[i].clientX,
          y: event.touches[i].clientY
        });
      }
      
      if (event.touches.length === 1) {
        // Single touch - panning
        this.touchMode = 'pan';
        this.lastMousePos = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      } else if (event.touches.length === 2) {
        // Two touches - pinch zoom
        this.touchMode = 'zoom';
        this.touchDistance = this._calculateTouchDistance(
          event.touches[0].clientX, event.touches[0].clientY,
          event.touches[1].clientX, event.touches[1].clientY
        );
        
        // Calculate center point between touches
        this.lastMousePos = {
          x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
          y: (event.touches[0].clientY + event.touches[1].clientY) / 2
        };
      }
    }
    
    /**
     * Handle touch movement
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchMove(event) {
      if (this.touchMode === 'none') return;
      event.preventDefault();
      
      if (this.touchMode === 'pan' && event.touches.length === 1) {
        // Single touch - panning
        const deltaX = event.touches[0].clientX - this.lastMousePos.x;
        const deltaY = event.touches[0].clientY - this.lastMousePos.y;
        
        // Convert to world coordinates based on scale
        this.targetPosition.x -= deltaX / this.scale;
        this.targetPosition.y -= deltaY / this.scale;
        
        // Update last position
        this.lastMousePos = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      } else if (this.touchMode === 'zoom' && event.touches.length === 2) {
        // Two touches - zooming
        const currentDistance = this._calculateTouchDistance(
          event.touches[0].clientX, event.touches[0].clientY,
          event.touches[1].clientX, event.touches[1].clientY
        );
        
        // Calculate zoom factor based on change in distance
        const zoomFactor = currentDistance / this.touchDistance;
        const newScale = this.targetScale * zoomFactor;
        
        // Get center point between touches
        const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
        
        // Convert to world coordinates
        const worldPos = this.screenToWorld(centerX, centerY);
        
        // Apply zoom
        this.targetScale = Math.max(
          this.options.minScale,
          Math.min(this.options.maxScale, newScale)
        );
        
        if (this.options.keepInView) {
          // Adjust position to zoom toward center
          const scaleFactor = this.targetScale / this.scale;
          const dx = (worldPos.x - this.targetPosition.x) * (1 - 1 / scaleFactor);
          const dy = (worldPos.y - this.targetPosition.y) * (1 - 1 / scaleFactor);
          
          this.targetPosition.x += dx;
          this.targetPosition.y += dy;
        }
        
        // Update for next move
        this.touchDistance = currentDistance;
        this.lastMousePos = {
          x: centerX,
          y: centerY
        };
      }
    }
    
    /**
     * Handle touch end
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchEnd(event) {
      // Update touch points
      const activeTouches = [];
      for (let i = 0; i < event.touches.length; i++) {
        activeTouches.push({
          id: event.touches[i].identifier,
          x: event.touches[i].clientX,
          y: event.touches[i].clientY
        });
      }
      this.touchPoints = activeTouches;
      
      if (event.touches.length === 0) {
        this.touchMode = 'none';
      } else if (event.touches.length === 1) {
        // Switch to pan mode if we were zooming
        if (this.touchMode === 'zoom') {
          this.touchMode = 'pan';
          this.lastMousePos = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
          };
        }
      }
    }
    
    /**
     * Calculate distance between two touch points
     * @param {number} x1 - First touch X
     * @param {number} y1 - First touch Y
     * @param {number} x2 - Second touch X
     * @param {number} y2 - Second touch Y
     * @return {number} Distance between points
     * @private
     */
    _calculateTouchDistance(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Draw debug information
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawDebug(ctx) {
      if (!this.debug) return;
      
      // Save current state
      ctx.save();
      
      // Reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      // Set text style
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(5, 5, 250, 85);
      ctx.fillStyle = 'white';
      
      // Draw camera info
      ctx.fillText(`Position: ${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}`, 10, 20);
      ctx.fillText(`Scale: ${this.scale.toFixed(2)}x`, 10, 35);
      
      const viewBounds = this.getViewBounds();
      ctx.fillText(`View: ${viewBounds.x.toFixed(0)}, ${viewBounds.y.toFixed(0)}, ${viewBounds.width.toFixed(0)}, ${viewBounds.height.toFixed(0)}`, 10, 50);
      
      // Draw mode info
      let modeText = 'Mode: ';
      if (this.isDragging) modeText += 'Dragging';
      else if (this.isAnimating) modeText += 'Animating';
      else if (this.touchMode !== 'none') modeText += this.touchMode;
      else modeText += 'Idle';
      
      ctx.fillText(modeText, 10, 65);
      
      // Draw frame info
      ctx.fillText(`Canvas: ${this.canvas.width}x${this.canvas.height}`, 10, 80);
      
      // Restore context
      ctx.restore();
    }
  }
  
  export default Camera;