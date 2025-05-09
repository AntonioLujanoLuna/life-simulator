class Engine {
    /**
     * Create a new simulation engine
     * @param {HTMLCanvasElement} canvas - Canvas element for rendering
     * @param {Object} options - Configuration options
     */
    constructor(canvas, options = {}) {
      // Default options
      this.options = Object.assign({
        maxParticles: 10000,
        maxTypes: 10,
        worldWidth: 2000,
        worldHeight: 2000,
        useWorker: false,
        fixedTimeStep: 16, // ms (~60 updates per second)
        initialTimeScale: 1.0,
      }, options);
  
      // References
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      
      // Import dependencies (these would be initialized externally)
      this.particles = null;
      this.rules = null;
      this.quadtree = null;
      this.camera = null;
      this.renderer = null;
      this.integrator = null;
      
      // Simulation state
      this.running = false;
      this.timeScale = this.options.initialTimeScale;
      this.lastTimestamp = 0;
      this.accumulatedTime = 0;
      this.fixedTimeStep = this.options.fixedTimeStep;
      this.frameCount = 0;
      this.frameTime = 0;
      this.fps = 0;
      this.performanceMonitor = null; // Added property
      
      // Performance metrics
      this.metrics = {
        updateTime: 0,
        renderTime: 0,
        integrationTime: 0,
        lastMetricsUpdate: 0,
      };
      this.workerMessageQueue = [];
    }
  
    /**
     * Set the performance monitor instance
     * @param {PerformanceMonitor} monitor - Performance monitor instance
     */
    setPerformanceMonitor(monitor) {
      this.performanceMonitor = monitor;
    }

    /**
     * Initialize the simulation with all required systems
     */
    initialize() {
      // Initialize all systems
      this.particles = new Particles(this.options.maxParticles, this.options.maxTypes, this.worldWidth, this.worldHeight);
      this.rules = new Rules(this.particles);
      this.quadtree = new Quadtree(this.worldWidth, this.worldHeight);
      this.camera = new Camera(this.worldWidth, this.worldHeight);
      this.renderer = new Renderer(this.canvas, this.particles, this.rules, this.camera);
      this.integrator = new Integrator(this.particles, this.rules, this.quadtree);
    }

    /**
     * Start the simulation loop
     */
    start() {
      this.running = true;
      this.lastTimestamp = performance.now();
      this.accumulatedTime = 0;
      this.frameCount = 0;
      this.frameTime = 0;
      this.fps = 0;
      this._boundLoop = this.loop.bind(this);
      requestAnimationFrame(this._boundLoop);
    }

    /**
     * Simulation loop
     * @private
     */
    loop(timestamp) {
      if (!this.running) return;

      if (this.performanceMonitor) this.performanceMonitor.beginFrame();
      
      // Calculate delta time and FPS
      const deltaTime = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;
      this.accumulatedTime += deltaTime;
      this.frameCount++;
      this.frameTime += deltaTime;
      this.fps = 1000 / (this.frameTime / this.frameCount);
      
      if (this.useWorker) {
        // Handle physics via worker
        this.updateWithWorker();
        // For worker mode, we don't have interpolation yet
        interpolationAlpha = 0;
      } else {
        // Direct physics update
        if (this.performanceMonitor) this.performanceMonitor.beginUpdate();
        const startTime = performance.now();
        
        let steps = 0;
        while (this.accumulatedTime >= this.fixedTimeStep && steps < 5) { // Cap at 5 steps to prevent spiral of death
          this.update(this.fixedTimeStep);
          this.accumulatedTime -= this.fixedTimeStep;
          steps++;
        }
        
        // If we hit the step cap, discard remaining time to catch up
        if (steps >= 5 && this.accumulatedTime > this.fixedTimeStep) {
          console.warn('Physics falling behind, discarding time:', this.accumulatedTime);
          this.accumulatedTime = 0;
        }
        
        this.metrics.updateTime = performance.now() - startTime;
        if (this.performanceMonitor) this.performanceMonitor.endUpdate();
        
        // Calculate interpolation alpha for rendering between physics steps
        interpolationAlpha = this.accumulatedTime / this.fixedTimeStep;
      }
      
      // Render current state
      if (this.performanceMonitor) this.performanceMonitor.beginRender();
      const renderStart = performance.now();
      this.renderer.render(interpolationAlpha);
      this.metrics.renderTime = performance.now() - renderStart;
      if (this.performanceMonitor) this.performanceMonitor.endRender();
      
      // Update performance metrics
      this.metrics.integrationTime = performance.now() - intStart;
      this.metrics.lastMetricsUpdate = timestamp;
      
      if (this.performanceMonitor) this.performanceMonitor.endFrame();

      // Continue loop
      requestAnimationFrame(this._boundLoop);
    }
  
    /**
     * Single physics update step
     * @param {number} timeStep - Time step in milliseconds
     * @private
     */
    update(timeStep) {
      if (this.performanceMonitor) this.performanceMonitor.beginPhysics();
      // Convert to seconds for physics
      const dt = timeStep * 0.001;
      
      this.integrator.integrate(dt);
      this.metrics.integrationTime = performance.now() - intStart;
      if (this.performanceMonitor) this.performanceMonitor.endPhysics();
    }
  
    /**
     * Rebuild the spatial partitioning structure
     */
    rebuildQuadtree() {
      this.quadtree.clear();
      this.particles.forEach(particle => {
        this.quadtree.insert(particle);
      });
    }

    /**
     * Handle physics update via worker
     */
    updateWithWorker() {
      // Implementation of updateWithWorker method
    }
} 