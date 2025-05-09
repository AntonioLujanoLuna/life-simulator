/**
 * Integrator.js - Numerical integration for particle physics
 * 
 * Features:
 * - Multiple integration methods (Euler, Verlet, RK4)
 * - Stable physics simulations
 * - Constraint handling
 * - Energy conservation options
 */

class Integrator {
    /**
     * Create a new physics integrator
     * @param {ParticleSystem} particles - Particle system
     * @param {Object} bounds - Simulation boundary
     * @param {Quadtree} quadtree - Quadtree for spatial partitioning
     * @param {Object} options - Configuration options
     */
    constructor(particles, bounds, quadtree, options = {}) {
      this.particles = particles;
      this.bounds = bounds;
      this.quadtree = quadtree;
      
      // Default options
      this.options = Object.assign({
        method: 'verlet',         // 'euler', 'verlet', 'rk4'
        damping: 0.999,           // Velocity damping (energy loss)
        subSteps: 1,              // Physics sub-steps per main step
        maxVelocity: 1000,        // Maximum velocity cap
        constraintIterations: 1,  // Number of iterations for constraint solving
        boundaryHandling: 'reflect', // 'reflect', 'wrap', 'absorb', 'attract'
        elasticity: 0.8,          // Bounce elasticity coefficient
      }, options);
      
      // Store previous positions for Verlet integration
      this.previousPositions = new Float32Array(particles.maxParticles * 2);
      
      // Initialize previous positions
      this.initPreviousPositions();
      
      // Performance tracking
      this.lastIntegrationTime = 0;
    }
    
    /**
     * Initialize previous positions for Verlet integration
     * @private
     */
    initPreviousPositions() {
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) continue;
        
        const idx = i * 2;
        const x = this.particles.positions[idx];
        const y = this.particles.positions[idx + 1];
        const vx = this.particles.velocities[idx];
        const vy = this.particles.velocities[idx + 1];
        
        // Initialize with current position offset by velocity
        // This creates a smooth initial trajectory
        this.previousPositions[idx] = x - vx;
        this.previousPositions[idx + 1] = y - vy;
      }
    }
    
    /**
     * Set simulation bounds
     * @param {Object} bounds - New simulation bounds
     * @return {Integrator} Self for chaining
     */
    setBounds(bounds) {
      this.bounds = bounds;
      return this;
    }
    
    /**
     * Set integration options
     * @param {Object} options - New options
     * @return {Integrator} Self for chaining
     */
    setOptions(options) {
      this.options = Object.assign(this.options, options);
      
      // If switching to/from Verlet, we need to reinitialize
      if (options.method && options.method !== this.options.method) {
        if (options.method === 'verlet') {
          this.initPreviousPositions();
        }
      }
      
      return this;
    }
    
    /**
     * Perform physics integration
     * @param {number} dt - Time step in seconds
     * @return {Integrator} Self for chaining
     */
    integrate(dt) {
      const startTime = performance.now();
      
      // Calculate sub-step time
      const subDt = dt / this.options.subSteps;
      
      // Perform integration in sub-steps for stability
      for (let step = 0; step < this.options.subSteps; step++) {
        switch (this.options.method) {
          case 'euler':
            this.integrateEuler(subDt);
            break;
          
          case 'verlet':
            this.integrateVerlet(subDt);
            break;
            
          case 'rk4':
            this.integrateRK4(subDt);
            break;
            
          default:
            this.integrateVerlet(subDt); // Default to Verlet
        }
        
        // Apply constraints and boundary conditions
        this.applyConstraints();
        this.applyBoundaries();
      }
      
      this.lastIntegrationTime = performance.now() - startTime;
      
      return this;
    }
    
    /**
     * Simple Euler integration (least accurate but fastest)
     * @param {number} dt - Time step in seconds
     * @private
     */
    integrateEuler(dt) {
      const damping = this.options.damping;
      const maxVelocity = this.options.maxVelocity;
      
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) continue;
        
        const idx = i * 2;
        
        // Update velocity based on acceleration
        this.particles.velocities[idx] += this.particles.accelerations[idx] * dt;
        this.particles.velocities[idx + 1] += this.particles.accelerations[idx + 1] * dt;
        
        // Apply damping
        this.particles.velocities[idx] *= damping;
        this.particles.velocities[idx + 1] *= damping;
        
        // Apply velocity cap
        const velMagSq = 
          this.particles.velocities[idx] * this.particles.velocities[idx] + 
          this.particles.velocities[idx + 1] * this.particles.velocities[idx + 1];
        
        if (velMagSq > maxVelocity * maxVelocity) {
          const scale = maxVelocity / Math.sqrt(velMagSq);
          this.particles.velocities[idx] *= scale;
          this.particles.velocities[idx + 1] *= scale;
        }
        
        // Update position based on velocity
        this.particles.positions[idx] += this.particles.velocities[idx] * dt;
        this.particles.positions[idx + 1] += this.particles.velocities[idx + 1] * dt;
      }
    }
    
    /**
     * Verlet integration (good stability, energy conservation)
     * @param {number} dt - Time step in seconds
     * @private
     */
    integrateVerlet(dt) {
      const damping = this.options.damping;
      const maxVelocity = this.options.maxVelocity;
      
      // Store dt squared for optimization
      const dt2 = dt * dt;
      
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) continue;
        
        const idx = i * 2;
        
        // Store current position
        const currentX = this.particles.positions[idx];
        const currentY = this.particles.positions[idx + 1];
        
        // Verlet integration: x(t+dt) = 2x(t) - x(t-dt) + a(t)dt²
        let newX = 2 * currentX - this.previousPositions[idx] + 
                   this.particles.accelerations[idx] * dt2;
        let newY = 2 * currentY - this.previousPositions[idx + 1] + 
                   this.particles.accelerations[idx + 1] * dt2;
        
        // Apply damping to the displacement
        newX = currentX + (newX - currentX) * damping;
        newY = currentY + (newY - currentY) * damping;
        
        // Update velocity (for visualization and forces that depend on velocity)
        this.particles.velocities[idx] = (newX - currentX) / dt;
        this.particles.velocities[idx + 1] = (newY - currentY) / dt;
        
        // Apply velocity cap
        const velMagSq = 
          this.particles.velocities[idx] * this.particles.velocities[idx] + 
          this.particles.velocities[idx + 1] * this.particles.velocities[idx + 1];
        
        if (velMagSq > maxVelocity * maxVelocity) {
          const scale = maxVelocity / Math.sqrt(velMagSq);
          this.particles.velocities[idx] *= scale;
          this.particles.velocities[idx + 1] *= scale;
          
          // Recompute new position with capped velocity
          newX = currentX + this.particles.velocities[idx] * dt;
          newY = currentY + this.particles.velocities[idx + 1] * dt;
        }
        
        // Store previous position for next step
        this.previousPositions[idx] = currentX;
        this.previousPositions[idx + 1] = currentY;
        
        // Update to new position
        this.particles.positions[idx] = newX;
        this.particles.positions[idx + 1] = newY;
      }
    }
    
    /**
     * 4th-order Runge-Kutta integration (most accurate but slowest)
     * @param {number} dt - Time step in seconds
     * @private
     */
    integrateRK4(dt) {
      const damping = this.options.damping;
      const maxVelocity = this.options.maxVelocity;
      
      // Temporary arrays for RK4 computation
      const k1v = new Float32Array(this.particles.maxParticles * 2);
      const k1p = new Float32Array(this.particles.maxParticles * 2);
      const k2v = new Float32Array(this.particles.maxParticles * 2);
      const k2p = new Float32Array(this.particles.maxParticles * 2);
      const k3v = new Float32Array(this.particles.maxParticles * 2);
      const k3p = new Float32Array(this.particles.maxParticles * 2);
      const k4v = new Float32Array(this.particles.maxParticles * 2);
      const k4p = new Float32Array(this.particles.maxParticles * 2);
      
      // This is a simplified RK4 that doesn't recalculate forces at intermediate steps
      // For a full RK4, we'd need to recalculate accelerations at each stage
      
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) continue;
        
        const idx = i * 2;
        
        // Current state
        const x = this.particles.positions[idx];
        const y = this.particles.positions[idx + 1];
        const vx = this.particles.velocities[idx];
        const vy = this.particles.velocities[idx + 1];
        const ax = this.particles.accelerations[idx];
        const ay = this.particles.accelerations[idx + 1];
        
        // Stage 1
        k1v[idx] = ax * dt;
        k1v[idx + 1] = ay * dt;
        k1p[idx] = vx * dt;
        k1p[idx + 1] = vy * dt;
        
        // Stage 2
        k2v[idx] = ax * dt;
        k2v[idx + 1] = ay * dt;
        k2p[idx] = (vx + k1v[idx] * 0.5) * dt;
        k2p[idx + 1] = (vy + k1v[idx + 1] * 0.5) * dt;
        
        // Stage 3
        k3v[idx] = ax * dt;
        k3v[idx + 1] = ay * dt;
        k3p[idx] = (vx + k2v[idx] * 0.5) * dt;
        k3p[idx + 1] = (vy + k2v[idx + 1] * 0.5) * dt;
        
        // Stage 4
        k4v[idx] = ax * dt;
        k4v[idx + 1] = ay * dt;
        k4p[idx] = (vx + k3v[idx]) * dt;
        k4p[idx + 1] = (vy + k3v[idx + 1]) * dt;
        
        // Combine stages with weights
        const newVx = vx + (k1v[idx] + 2 * k2v[idx] + 2 * k3v[idx] + k4v[idx]) / 6;
        const newVy = vy + (k1v[idx + 1] + 2 * k2v[idx + 1] + 2 * k3v[idx + 1] + k4v[idx + 1]) / 6;
        
        // Apply damping
        const dampedVx = newVx * damping;
        const dampedVy = newVy * damping;
        
        // Apply velocity cap
        let finalVx = dampedVx;
        let finalVy = dampedVy;
        const velMagSq = dampedVx * dampedVx + dampedVy * dampedVy;
        
        if (velMagSq > maxVelocity * maxVelocity) {
          const scale = maxVelocity / Math.sqrt(velMagSq);
          finalVx *= scale;
          finalVy *= scale;
        }
        
        // Update velocity
        this.particles.velocities[idx] = finalVx;
        this.particles.velocities[idx + 1] = finalVy;
        
        // Update position
        this.particles.positions[idx] = x + (k1p[idx] + 2 * k2p[idx] + 2 * k3p[idx] + k4p[idx]) / 6;
        this.particles.positions[idx + 1] = y + (k1p[idx + 1] + 2 * k2p[idx + 1] + 2 * k3p[idx + 1] + k4p[idx + 1]) / 6;
      }
    }
    
    /**
     * Apply constraints to particles (distances, collisions, etc.)
     * @private
     */
    applyConstraints() {
      // Apply constraints multiple times for better convergence
      for (let iter = 0; iter < this.options.constraintIterations; iter++) {
        this.resolveCollisions();
      }
    }
    
    /**
     * Resolve collisions between particles
     * @private
     */
    resolveCollisions() {
      if (!this.quadtree) {
        console.warn("Integrator.resolveCollisions: Quadtree not available. Skipping efficient collision detection.");
        return;
      }

      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) continue;

        const idxI = i * 2;
        const posXi = this.particles.positions[idxI];
        const posYi = this.particles.positions[idxI + 1];
        const radiusI = this.particles.sizes[i];

        // Define a query range around particle 'i'.
        // Heuristic: Search in a box that's roughly twice the particle's diameter.
        // This should be sufficient to find most direct collision candidates.
        // Adjust queryRadius if necessary based on typical particle size distribution.
        const queryExtent = radiusI * 2; 
        const queryRange = {
          x: posXi - queryExtent,
          y: posYi - queryExtent,
          width: queryExtent * 2,
          height: queryExtent * 2,
        };

        const nearbyCandidates = this.quadtree.query(queryRange);

        for (const candidatePoint of nearbyCandidates) {
          const j = candidatePoint.index; // Quadtree stores points with an 'index'

          // Process each pair only once (j > i) and ensure particle j is active.
          if (j <= i || !this.particles.active[j]) {
            continue;
          }
          
          const idxJ = j * 2;
          const posXj = this.particles.positions[idxJ];
          const posYj = this.particles.positions[idxJ + 1];
          const radiusJ = this.particles.sizes[j];
          
          // Calculate distance
          const dx = posXj - posXi;
          const dy = posYj - posYi;
          const distSq = dx * dx + dy * dy;
          
          // Sum of radii squared
          const minDistSq = (radiusI + radiusJ) * (radiusI + radiusJ);
          
          // Check if collision
          if (distSq < minDistSq && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const overlap = (radiusI + radiusJ) - dist;
            
            // Normalize direction
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Calculate mass ratios for response
            const massI = this.particles.masses[i];
            const massJ = this.particles.masses[j];
            const totalMass = massI + massJ;
            
            // Avoid division by zero if totalMass is zero (e.g. massless particles)
            const ratioI = totalMass > 0 ? massJ / totalMass : 0.5;
            const ratioJ = totalMass > 0 ? massI / totalMass : 0.5;
            
            // Move apart proportional to mass
            this.particles.positions[idxI] -= nx * overlap * ratioI;
            this.particles.positions[idxI + 1] -= ny * overlap * ratioI;
            this.particles.positions[idxJ] += nx * overlap * ratioJ;
            this.particles.positions[idxJ + 1] += ny * overlap * ratioJ;
            
            // Calculate velocity along normal direction
            const velXi = this.particles.velocities[idxI];
            const velYi = this.particles.velocities[idxI + 1];
            const velXj = this.particles.velocities[idxJ];
            const velYj = this.particles.velocities[idxJ + 1];
            
            const velNormalI = velXi * nx + velYi * ny;
            const velNormalJ = velXj * nx + velYj * ny;
            
            // Skip if moving away from each other
            if (velNormalI - velNormalJ <= 0) continue;
            
            // Calculate new velocities (elastic collision)
            const elasticity = this.options.elasticity;
            
            const newVelNormalI = totalMass > 0 ? ((velNormalI * (massI - massJ)) + 2 * massJ * velNormalJ) / totalMass : velNormalI;
            const newVelNormalJ = totalMass > 0 ? ((velNormalJ * (massJ - massI)) + 2 * massI * velNormalI) / totalMass : velNormalJ;
            
            // Apply elasticity
            const finalVelNormalI = velNormalI + (newVelNormalI - velNormalI) * elasticity;
            const finalVelNormalJ = velNormalJ + (newVelNormalJ - velNormalJ) * elasticity;
            
            // Apply velocity changes along normal
            this.particles.velocities[idxI] += (finalVelNormalI - velNormalI) * nx;
            this.particles.velocities[idxI + 1] += (finalVelNormalI - velNormalI) * ny;
            this.particles.velocities[idxJ] += (finalVelNormalJ - velNormalJ) * nx;
            this.particles.velocities[idxJ + 1] += (finalVelNormalJ - velNormalJ) * ny;
          }
        }
      }
    }
    
    /**
     * Apply boundary conditions to keep particles in bounds or create repeating universe effect
     * @private
     */
    applyBoundaries() {
      const particles = this.particles;
      const bounds = this.bounds;
      const boundaryType = this.options.boundaryHandling;
      const elasticity = this.options.elasticity;

      // If set to infinite, don't apply any boundary constraints
      if (boundaryType === 'infinite') {
        // The infinite boundary mode doesn't apply any constraints
        // Instead, we'll handle this in the rendering system
        return;
      }

      // Original boundary handling code for other modes
      for (let i = 0; i < particles.count; i++) {
        if (!particles.active[i]) continue;
        
        const idx = i * 2;
        let posX = particles.positions[idx];
        let posY = particles.positions[idx + 1];
        let velX = particles.velocities[idx];
        let velY = particles.velocities[idx + 1];
        
        // Add a small margin to account for particle size
        const margin = particles.sizes[i];
        const leftBound = bounds.x + margin;
        const rightBound = bounds.x + bounds.width - margin;
        const topBound = bounds.y + margin;
        const bottomBound = bounds.y + bounds.height - margin;
        
        let updated = false;
        
        switch (boundaryType) {
          case 'reflect':
            // Reflect off boundaries with elasticity
            if (posX < leftBound) {
              posX = leftBound + (leftBound - posX) * elasticity;
              velX = -velX * elasticity;
              updated = true;
            } else if (posX > rightBound) {
              posX = rightBound - (posX - rightBound) * elasticity;
              velX = -velX * elasticity;
              updated = true;
            }
            
            if (posY < topBound) {
              posY = topBound + (topBound - posY) * elasticity;
              velY = -velY * elasticity;
              updated = true;
            } else if (posY > bottomBound) {
              posY = bottomBound - (posY - bottomBound) * elasticity;
              velY = -velY * elasticity;
              updated = true;
            }
            break;
            
          case 'wrap':
            // Wrap around boundaries
            if (posX < bounds.x) {
              posX = bounds.x + bounds.width - margin;
              updated = true;
            } else if (posX > bounds.x + bounds.width) {
              posX = bounds.x + margin;
              updated = true;
            }
            
            if (posY < bounds.y) {
              posY = bounds.y + bounds.height - margin;
              updated = true;
            } else if (posY > bounds.y + bounds.height) {
              posY = bounds.y + margin;
              updated = true;
            }
            break;
            
          case 'absorb':
            // Remove particles that exit boundaries
            if (posX < bounds.x || posX > bounds.x + bounds.width ||
                posY < bounds.y || posY > bounds.y + bounds.height) {
              particles.remove(i);
              // Don't update position since particle is removed
              continue;
            }
            break;
            
          case 'attract':
            // Pull particles back into bounds with a force
            const forceStrength = 0.1;
            
            if (posX < leftBound) {
              particles.accelerations[idx] += forceStrength * (leftBound - posX);
            } else if (posX > rightBound) {
              particles.accelerations[idx] -= forceStrength * (posX - rightBound);
            }
            
            if (posY < topBound) {
              particles.accelerations[idx + 1] += forceStrength * (topBound - posY);
            } else if (posY > bottomBound) {
              particles.accelerations[idx + 1] -= forceStrength * (posY - bottomBound);
            }
            break;
        }
        
        // Update particle position and velocity if changed
        if (updated) {
          particles.positions[idx] = posX;
          particles.positions[idx + 1] = posY;
          particles.velocities[idx] = velX;
          particles.velocities[idx + 1] = velY;
        }
      }
    }
    
    /**
     * Get current energy of the system
     * @return {Object} Energy components (kinetic, potential)
     */
    getSystemEnergy() {
      let kineticEnergy = 0;
      
      for (let i = 0; i < this.particles.count; i++) {
        if (!this.particles.active[i]) continue;
        
        const idx = i * 2;
        const velX = this.particles.velocities[idx];
        const velY = this.particles.velocities[idx + 1];
        const mass = this.particles.masses[i];
        
        // KE = 0.5 * m * v^2
        kineticEnergy += 0.5 * mass * (velX * velX + velY * velY);
      }
      
      return {
        kinetic: kineticEnergy,
        // Potential energy would depend on forces, not calculated here
        potential: 0,
        total: kineticEnergy
      };
    }
    
    /**
     * Get performance statistics
     * @return {Object} Performance metrics
     */
    getPerformanceMetrics() {
      return {
        integrationTime: this.lastIntegrationTime,
        method: this.options.method,
        particleCount: this.particles.getActiveCount()
      };
    }
  }
  
  export default Integrator;