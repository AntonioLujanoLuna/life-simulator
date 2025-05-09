/**
 * Engine.js - Main simulation loop and orchestration
 * 
 * Handles:
 * - Main simulation loop
 * - Time scaling and fixed timestep physics
 * - System coordination
 * - Optional Web Worker integration
 */

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
      this.forceCalculator = null; // Added for ForceCalculator
      
      // Simulation state
      this.running = false;
      this.timeScale = this.options.initialTimeScale;
      this.lastTimestamp = 0;
      this.accumulatedTime = 0;
      this.fixedTimeStep = this.options.fixedTimeStep;
      this.frameCount = 0;
      this.frameTime = 0;
      this.fps = 0;
      this.performanceMonitor = null; // Added for PerformanceMonitor
      this._isLoopRunning = false; // Flag to track if the main animation loop is active
      
      // Performance metrics
      this.metrics = {
        updateTime: 0,
        renderTime: 0,
        quadtreeTime: 0,
        forceTime: 0,
        integrationTime: 0,
        lastMetricsUpdate: 0,
      };
      
      // Web Worker for physics (optional)
      this.useWorker = this.options.useWorker;
      this.physicsWorker = null;
      this.pendingWorkerResponses = 0;
      this.workerUpdateInProgress = false;
      
      // Bounds for simulation
      this.bounds = {
        x: 0,
        y: 0,
        width: this.options.worldWidth,
        height: this.options.worldHeight
      };
      
      // Event handlers
      this._boundLoop = this.loop.bind(this);
      
      // Worker message queue to prevent flooding the worker
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
     * @param {ParticleSystem} particles - Particle management system
     * @param {RuleMatrix} rules - Interaction rules system
     * @param {Object} systems - Additional systems (camera, renderer, etc.)
     */
    init(particles, rules, systems = {}) {
      this.particles = particles;
      this.rules = rules;
      
      // Set up additional systems
      this.quadtree = systems.quadtree || new Quadtree(this.bounds);
      this.camera = systems.camera || new Camera(this.canvas);
      this.renderer = systems.renderer || new Renderer(this.canvas, this.particles, this.camera);
      this.integrator = systems.integrator || new Integrator(this.particles, this.bounds, this.quadtree, this.options.integratorOptions || {});
      
      if (systems.forceCalculator) {
        this.forceCalculator = systems.forceCalculator;
      } else if (!this.useWorker) { // Only critical if not using worker for physics
        console.error("Engine.init: ForceCalculator not provided in systems and not using Web Worker. Particle interactions will not be calculated for the main thread physics path.");
      }
      
      // Initialize physics worker if enabled
      if (this.useWorker) {
        this.initPhysicsWorker();
      }
  
      return this;
    }
  
    /**
     * Start the simulation
     * @return {Engine} Self for chaining
     */
    start() {
      if (this.running) return this;
      
      this.running = true;
      this.lastTimestamp = performance.now();
      
      if (!this._isLoopRunning) {
        this._isLoopRunning = true;
        requestAnimationFrame(this._boundLoop);
      }
      
      return this;
    }
  
    /**
     * Stop the simulation
     * @return {Engine} Self for chaining
     */
    stop() {
      this.running = false;
      return this;
    }
  
    /**
     * Reset the simulation with new parameters
     * @param {Object} options - Reset options
     * @return {Engine} Self for chaining
     */
    reset(options = {}) {
      // Default to current options if not specified
      const resetOptions = Object.assign({}, this.options, options);
      
      // Stop current simulation
      const wasRunning = this.running;
      this.stop();
      
      // Reset state
      this.accumulatedTime = 0;
      this.frameCount = 0;
      
      // Re-initialize with new options if provided
      if (Object.keys(options).length > 0) {
        this.options = resetOptions;
        // Update dependent systems with new options
        if (this.particles) {
          this.particles.reset(resetOptions.maxParticles);
        }
        if (this.rules) {
          this.rules.reset(resetOptions.maxTypes);
        }
        
        // Update bounds
        this.bounds = {
          x: 0,
          y: 0,
          width: resetOptions.worldWidth,
          height: resetOptions.worldHeight
        };
        
        // Update integrator bounds
        if (this.integrator) {
          this.integrator.setBounds(this.bounds);
        }
        
        // Restart worker if necessary
        if (this.useWorker && this.physicsWorker) {
          this.physicsWorker.terminate();
          this.initPhysicsWorker();
        }
      }
      
      // Restart if it was running
      if (wasRunning) {
        this.start();
      }
      
      return this;
    }
  
    /**
     * Main animation loop
     * @param {number} timestamp - Current timestamp from requestAnimationFrame
     * @private
     */
    loop(timestamp) {
      if (!this._isLoopRunning) return; // If dispose was called, for example.

      if (this.performanceMonitor) this.performanceMonitor.beginFrame();
      
      // Calculate delta time and FPS
      const rawDeltaTime = timestamp - this.lastTimestamp;
      // Clamp deltaTime to prevent large jumps (e.g., if tab was inactive or on resume) and negative values.
      // Max step of 100ms (equivalent to 10 FPS for catch-up), min of 0.
      const deltaTime = Math.max(0, Math.min(rawDeltaTime, 100));
      this.lastTimestamp = timestamp;
      
      // Update FPS counter every second (using rawDeltaTime for accuracy over time)
      this.frameCount++;
      this.frameTime += rawDeltaTime;
      if (this.frameTime >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / this.frameTime);
        this.frameCount = 0;
        this.frameTime = 0;
      }
      
      let interpolationAlpha = 0;

      if (this.running) { // Only run simulation logic if not paused
        if (this.performanceMonitor) this.performanceMonitor.beginUpdate();
        const physicsStartTime = performance.now();

        // Accumulate time for fixed physics steps
        this.accumulatedTime += deltaTime * this.timeScale; // Use clamped deltaTime
      
        if (this.useWorker) {
          // Handle physics via worker
          this.updateWithWorker(); // This method internally checks accumulatedTime and posts to worker
          interpolationAlpha = 0; // Worker mode might not use interpolation in the same way
        } else {
          // Direct physics update
          let steps = 0;
          while (this.accumulatedTime >= this.fixedTimeStep && steps < 5) { // Cap at 5 steps to prevent spiral of death
            this.update(this.fixedTimeStep); // Actual physics update
            this.accumulatedTime -= this.fixedTimeStep;
            steps++;
          }
          
          // If we hit the step cap, discard remaining time to catch up
          if (steps >= 5 && this.accumulatedTime > this.fixedTimeStep) {
            console.warn('Physics falling behind, discarding time:', this.accumulatedTime);
            this.accumulatedTime = 0;
          }
          interpolationAlpha = this.accumulatedTime / this.fixedTimeStep;
        }
        this.metrics.updateTime = performance.now() - physicsStartTime;
        if (this.performanceMonitor) this.performanceMonitor.endUpdate();
      } else {
        // Simulation is paused, calculate interpolation based on last accumulated time
        if (!this.useWorker) {
            interpolationAlpha = this.accumulatedTime / this.fixedTimeStep;
        } else {
            interpolationAlpha = 0; // Match worker behavior when running
        }
      }
      
      // Update camera every frame using clamped deltaTime
      if (this.camera && typeof this.camera.update === 'function') {
        this.camera.update(deltaTime);
      }
      
      // Render current state
      if (this.performanceMonitor) this.performanceMonitor.beginRender();
      const renderStart = performance.now();
      if(this.renderer) { // Check if renderer exists
          this.renderer.render(interpolationAlpha);
      }
      this.metrics.renderTime = performance.now() - renderStart;
      if (this.performanceMonitor) this.performanceMonitor.endRender();
      
      // Update performance metrics (Engine's console logger)
      if (timestamp - this.metrics.lastMetricsUpdate > 1000) {
        this.updateMetrics();
        this.metrics.lastMetricsUpdate = timestamp;
      }
      
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
      if (!this.useWorker && !this.forceCalculator) {
        // Log warning or error if critical physics component is missing for non-worker path
        console.warn("Engine.update: No ForceCalculator available for non-worker path. Skipping physics update step.");
        // Ensure accelerations are zero if no forces are calculated
        if (this.particles) {
            this.particles.accelerations.fill(0);
        }
        // Integrate with zero accelerations or simply return
        // For now, let's assume we still integrate (e.g., movement from existing velocity)
        const dtFallback = timeStep * 0.001;
        if (this.integrator) {
            this.integrator.integrate(dtFallback);
        }
        this.metrics.quadtreeTime = 0;
        this.metrics.forceTime = 0;
        this.metrics.integrationTime = this.integrator ? (performance.now() - performance.now()) : 0; // Placeholder if integrator runs
        return; 
      }

      if (this.performanceMonitor) this.performanceMonitor.beginPhysics();
      
      // Convert to seconds for physics
      const dt = timeStep * 0.001;
      
      // Rebuild quadtree
      const qtStart = performance.now();
      this.rebuildQuadtree();
      this.metrics.quadtreeTime = performance.now() - qtStart;
      
      // Calculate forces using ForceCalculator if not using worker
      if (this.forceCalculator) {
        // ForceCalculator.calculateForces should handle resetting accelerations.
        this.forceCalculator.calculateForces(this.particles, this.quadtree, dt);
        this.metrics.forceTime = this.forceCalculator.lastCalculationTime; 
      } else {
        // This case should ideally not be reached if useWorker is false due to the check above.
        // If useWorker is true, this whole 'update' method isn't called for physics.
        // If somehow reached and particles exist, ensure accelerations are zeroed.
        if (this.particles) {
            this.particles.accelerations.fill(0);
        }
        this.metrics.forceTime = 0;
      }
      
      // Integrate positions
      const integrationStart = performance.now();
      if (this.integrator) {
        this.integrator.integrate(dt);
        this.metrics.integrationTime = performance.now() - integrationStart; // Corrected from +=
      } else {
        this.metrics.integrationTime = 0;
      }
      
      if (this.performanceMonitor) this.performanceMonitor.endPhysics();
    }
  
    /**
     * Rebuild the spatial partitioning structure
     * @private
     */
    rebuildQuadtree() {
      this.quadtree.clear();
      
      for (let i = 0; i < this.particles.count; i++) {
        if (this.particles.active[i]) {
          this.quadtree.insert({
            index: i,
            x: this.particles.positions[i*2],
            y: this.particles.positions[i*2+1]
          });
        }
      }
    }
  
    /**
     * Handle physics updates with a Web Worker
     * @private
     */
    updateWithWorker() {
      if (this.workerUpdateInProgress || this.pendingWorkerResponses > 2) {
        // Don't flood the worker, queue the message instead
        this.workerMessageQueue.push({
          type: 'update',
          steps: Math.floor(this.accumulatedTime / this.fixedTimeStep),
          timeStep: this.fixedTimeStep
        });
        return;
      }
      
      // Check if we need to run physics steps
      if (this.accumulatedTime >= this.fixedTimeStep) {
        const steps = Math.floor(this.accumulatedTime / this.fixedTimeStep);
        
        // Mark as busy and send update message
        this.workerUpdateInProgress = true;
        this.pendingWorkerResponses++;
        
        this.physicsWorker.postMessage({
          type: 'update',
          steps: steps,
          timeStep: this.fixedTimeStep
        });
        
        // Consume the time
        this.accumulatedTime -= steps * this.fixedTimeStep;
      }
    }
  
    /**
     * Handle a response from the physics worker
     * @param {Object} data - Response data from worker
     * @private
     */
    handleWorkerResponse(data) {
      if (this.particles && data) {
        this.particles.deserialize(data); // Use deserialize method
      } else {
        console.error("Engine.handleWorkerResponse: Particle system not available or worker data missing.");
      }
      
      // Mark as no longer busy
      this.workerUpdateInProgress = false;
      this.pendingWorkerResponses--;
      
      // Process any queued messages
      if (this.workerMessageQueue.length > 0 && !this.workerUpdateInProgress) {
        const nextMessage = this.workerMessageQueue.shift();
        this.workerUpdateInProgress = true;
        this.pendingWorkerResponses++;
        this.physicsWorker.postMessage(nextMessage);
      }
    }
  
    /**
     * Initialize the physics worker
     * @private
     */
    initPhysicsWorker() {
      // Create a new worker
      this.physicsWorker = new Worker('../physics/PhysicsWorker.js');
      
      // Set up message handler
      this.physicsWorker.onmessage = (e) => {
        const { type, data } = e.data;
        
        if (type === 'update_complete') {
          this.handleWorkerResponse(data);
        }
      };
      
      // Initialize worker with current state
      if (!this.particles) {
        console.error("Engine.initPhysicsWorker: Particle system not initialized before worker.");
        return;
      }
      if (!this.rules) {
        console.error("Engine.initPhysicsWorker: RuleMatrix not initialized before worker.");
        return;
      }
      
      this.physicsWorker.postMessage({
        type: 'init',
        particles: this.particles.serialize(), // Use serialize method
        rules: this.rules.serialize(),
        bounds: this.bounds
      });
    }
  
    /**
     * Set the simulation time scale
     * @param {number} scale - New time scale
     * @return {Engine} Self for chaining
     */
    setTimeScale(scale) {
      this.timeScale = Math.max(0, scale);
      return this;
    }
  
    /**
     * Update and log performance metrics (Engine's console logger)
     * @private
     */
    updateMetrics() {
      if (!this.performanceMonitor) {
        console.group("Engine Metrics (1s interval)");
        console.log(`FPS: ${this.fps}`);
        console.log(`Update Time: ${this.metrics.updateTime.toFixed(2)}ms`);
        console.log(`Render Time: ${this.metrics.renderTime.toFixed(2)}ms`);
        if (this.useWorker) {
          console.log("(Physics on Worker)");
        } else {
          console.log(`  Quadtree: ${this.metrics.quadtreeTime.toFixed(2)}ms`);
          console.log(`  Force Calc: ${this.metrics.forceTime.toFixed(2)}ms`);
          console.log(`  Integration: ${this.metrics.integrationTime.toFixed(2)}ms`);
        }
        console.groupEnd();
      }
      // If performanceMonitor exists, it handles its own logging via its endFrame method
      // based on its own logToConsole and logInterval options.
    }
  
    /**
     * Clean up resources (e.g., terminate workers)
     */
    dispose() {
      this.stop(); // Ensure running flag is false
      this._isLoopRunning = false; // Explicitly stop the animation frame loop

      if (this.useWorker && this.physicsWorker) {
        this.physicsWorker.terminate();
        this.physicsWorker = null;
      }

      // Dispose of systems that might have been created by the engine
      // and have a dispose method.
      if (this.renderer && typeof this.renderer.dispose === 'function') {
        this.renderer.dispose();
      }
      // Assuming Quadtree, Camera, Integrator don't have specific dispose methods
      // or their cleanup is handled by nulling references.
      // If they do, their dispose methods should be called here.

      // Null out references to components to help with garbage collection
      this.canvas = null; // The engine doesn't own the canvas, but good to clear ref
      this.ctx = null;
      this.particles = null;
      this.rules = null;
      this.quadtree = null;
      this.camera = null;
      this.renderer = null;
      this.integrator = null;
      this.performanceMonitor = null; // Clear reference, owner should dispose
      
      this.workerMessageQueue = []; // Clear any pending messages

      console.log("Engine disposed");
    }
  }
  
  // Export the Engine class
  export default Engine;