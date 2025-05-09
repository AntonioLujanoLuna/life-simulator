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
      
      // Simulation state
      this.running = false;
      this.timeScale = this.options.initialTimeScale;
      this.lastTimestamp = 0;
      this.accumulatedTime = 0;
      this.fixedTimeStep = this.options.fixedTimeStep;
      this.frameCount = 0;
      this.frameTime = 0;
      this.fps = 0;
      
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
      this.integrator = systems.integrator || new Integrator(this.particles, this.bounds);
      
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
      requestAnimationFrame(this._boundLoop);
      
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
      if (!this.running) return;
      
      // Calculate delta time and FPS
      const deltaTime = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;
      
      // Update FPS counter every second
      this.frameCount++;
      this.frameTime += deltaTime;
      if (this.frameTime >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / this.frameTime);
        this.frameCount = 0;
        this.frameTime = 0;
      }
      
      // Accumulate time and run fixed physics steps
      this.accumulatedTime += deltaTime * this.timeScale;
      
      let interpolationAlpha = 0;
      
      if (this.useWorker) {
        // Handle physics via worker
        this.updateWithWorker();
        // For worker mode, we don't have interpolation yet
        interpolationAlpha = 0;
      } else {
        // Direct physics update
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
        
        // Calculate interpolation alpha for rendering between physics steps
        interpolationAlpha = this.accumulatedTime / this.fixedTimeStep;
      }
      
      // Render current state
      const renderStart = performance.now();
      this.renderer.render(interpolationAlpha);
      this.metrics.renderTime = performance.now() - renderStart;
      
      // Update performance metrics
      if (timestamp - this.metrics.lastMetricsUpdate > 1000) {
        this.updateMetrics();
        this.metrics.lastMetricsUpdate = timestamp;
      }
      
      // Continue loop
      requestAnimationFrame(this._boundLoop);
    }
  
    /**
     * Single physics update step
     * @param {number} timeStep - Time step in milliseconds
     * @private
     */
    update(timeStep) {
      // Convert to seconds for physics
      const dt = timeStep * 0.001;
      
      // Rebuild quadtree
      const qtStart = performance.now();
      this.rebuildQuadtree();
      this.metrics.quadtreeTime = performance.now() - qtStart;
      
      // Calculate forces
      const forceStart = performance.now();
      this.calculateForces(dt);
      this.metrics.forceTime = performance.now() - forceStart;
      
      // Integrate positions
      const intStart = performance.now();
      this.integrator.integrate(dt);
      this.metrics.integrationTime = performance.now() - intStart;
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
     * Calculate forces between particles
     * @param {number} dt - Time step in seconds
     * @private
     */
    calculateForces(dt) {
      // Reset accelerations
      this.particles.accelerations.fill(0);
      
      // For each active particle
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) continue;
        
        const typeI = this.particles.types[i];
        const posX = this.particles.positions[i*2];
        const posY = this.particles.positions[i*2+1];
        const mass = this.particles.masses[i];
        
        // Define search range
        const maxDistance = this.rules.getMaxInteractionDistance(typeI);
        const queryRange = {
          x: posX - maxDistance,
          y: posY - maxDistance,
          width: maxDistance * 2,
          height: maxDistance * 2,
          contains: (point) => {
            const dx = point.x - posX;
            const dy = point.y - posY;
            return dx*dx + dy*dy <= maxDistance*maxDistance;
          }
        };
        
        // Get nearby particles
        const nearby = this.quadtree.query(queryRange);
        
        // Apply forces from each nearby particle
        for (let j = 0; j < nearby.length; j++) {
          const otherIdx = nearby[j].index;
          
          if (i === otherIdx || !this.particles.active[otherIdx]) continue;
          
          const typeJ = this.particles.types[otherIdx];
          
          // Skip if no interaction exists
          if (!this.rules.hasInteraction(typeI, typeJ)) continue;
          
          // Calculate vector between particles
          const otherX = this.particles.positions[otherIdx*2];
          const otherY = this.particles.positions[otherIdx*2+1];
          const dx = otherX - posX;
          const dy = otherY - posY;
          const distSq = dx*dx + dy*dy;
          
          // Skip if too far or too close
          if (distSq < 0.0001) continue;
          
          const dist = Math.sqrt(distSq);
          
          // Get force from rules
          const force = this.rules.calculateForce(typeI, typeJ, dist);
          
          // Skip if no force
          if (Math.abs(force) < 0.0001) continue;
          
          // Apply force to acceleration (F = ma, so a = F/m)
          const forceX = (dx / dist) * force;
          const forceY = (dy / dist) * force;
          
          // Add to acceleration
          this.particles.accelerations[i*2] += forceX / mass;
          this.particles.accelerations[i*2+1] += forceY / mass;
          
          // Breaking Newton's Third Law - no equal and opposite force
          // If we wanted to respect Newton's Third Law, we'd do:
          // this.particles.accelerations[otherIdx*2] -= forceX / this.particles.masses[otherIdx];
          // this.particles.accelerations[otherIdx*2+1] -= forceY / this.particles.masses[otherIdx];
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
      // Update particles with data from worker
      this.particles.positions = data.positions;
      this.particles.velocities = data.velocities;
      this.particles.accelerations = data.accelerations;
      
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
      this.physicsWorker.postMessage({
        type: 'init',
        particles: {
          positions: this.particles.positions,
          velocities: this.particles.velocities,
          accelerations: this.particles.accelerations,
          masses: this.particles.masses,
          sizes: this.particles.sizes,
          types: this.particles.types,
          active: this.particles.active,
          count: this.particles.count
        },
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
     * Update and log performance metrics
     * @private
     */
    updateMetrics() {
      // Only log if running in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`FPS: ${this.fps} | Particles: ${this.particles.getActiveCount()} | Update: ${this.metrics.updateTime.toFixed(2)}ms | Render: ${this.metrics.renderTime.toFixed(2)}ms`);
        console.log(`  Physics breakdown - Quadtree: ${this.metrics.quadtreeTime.toFixed(2)}ms | Forces: ${this.metrics.forceTime.toFixed(2)}ms | Integration: ${this.metrics.integrationTime.toFixed(2)}ms`);
      }
    }
  
    /**
     * Clean up resources (e.g., terminate workers)
     */
    dispose() {
      this.stop();
      
      // Clean up worker
      if (this.physicsWorker) {
        this.physicsWorker.terminate();
        this.physicsWorker = null;
      }
      
      // Clear references to help GC
      this.particles = null;
      this.rules = null;
      this.quadtree = null;
      this.renderer = null;
      this.integrator = null;
      this.camera = null;
    }
  }
  
  /**
   * Simple Quadtree implementation for spatial partitioning
   * This is a placeholder - in a full implementation, this would be in its own file
   */
  class Quadtree {
    constructor(bounds, capacity = 4, depth = 0, maxDepth = 8) {
      this.bounds = bounds;
      this.capacity = capacity;
      this.depth = depth;
      this.maxDepth = maxDepth;
      this.points = [];
      this.divided = false;
      this.children = null;
    }
    
    clear() {
      this.points = [];
      this.divided = false;
      this.children = null;
    }
    
    insert(point) {
      // Implementation would go here
    }
    
    query(range, found = []) {
      // Implementation would go here
      return found;
    }
  }
  
  /**
   * Simple Camera placeholder - in a full implementation, this would be in its own file
   */
  class Camera {
    constructor(canvas) {
      this.canvas = canvas;
      this.position = { x: 0, y: 0 };
      this.scale = 1.0;
    }
    
    // Methods would go here
  }
  
  /**
   * Simple Renderer placeholder - in a full implementation, this would be in its own file
   */
  class Renderer {
    constructor(canvas, particles, camera) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = particles;
      this.camera = camera;
    }
    
    render(interpolationAlpha) {
      // Implementation would go here
    }
  }
  
  /**
   * Simple Integrator placeholder - in a full implementation, this would be in its own file
   */
  class Integrator {
    constructor(particles, bounds) {
      this.particles = particles;
      this.bounds = bounds;
    }
    
    integrate(dt) {
      // Implementation would go here
    }
    
    setBounds(bounds) {
      this.bounds = bounds;
    }
  }
  
  // Export the Engine class
  export default Engine;