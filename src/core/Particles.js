/**
 * Particles.js - Efficient particle management system
 * 
 * Features:
 * - Structure of Arrays (SoA) design for cache efficiency
 * - TypedArrays for memory efficiency and performance
 * - Methods for creating, updating, and managing particles
 * - Spatial data management for efficient lookup
 */

class ParticleSystem {
    /**
     * Create a new particle system
     * @param {number} maxParticles - Maximum number of particles to support
     */
    constructor(maxParticles) {
      this.maxParticles = maxParticles;
      
      // Structure of Arrays for better cache performance
      this.positions = new Float32Array(maxParticles * 2);      // x, y
      this.velocities = new Float32Array(maxParticles * 2);     // vx, vy
      this.accelerations = new Float32Array(maxParticles * 2);  // ax, ay
      this.masses = new Float32Array(maxParticles);             // mass
      this.sizes = new Float32Array(maxParticles);              // visual radius
      this.types = new Uint8Array(maxParticles);                // particle type ID
      this.active = new Uint8Array(maxParticles);               // 0 = inactive, 1 = active
      this.lifespans = new Float32Array(maxParticles);          // remaining lifetime in seconds (if used)
      this.properties = new Float32Array(maxParticles * 4);     // 4 generic custom properties
      
      // Previous positions for Verlet integration
      this.prevPositions = new Float32Array(maxParticles * 2);
      
      // Particle state
      this.count = 0;  // Total particles created (some may be inactive)
      
      // Reusable index pool for recycling inactive particle slots
      this.freeIndices = [];
      
      // Default particle values
      this.defaults = {
        mass: 1.0,
        size: 5.0,
        type: 0,
        lifespan: Infinity, // Infinite by default
      };
      
      // Performance tracking
      this.creationTime = 0;
      this.updateTime = 0;
    }
    
    /**
     * Reset the particle system
     * @param {number} maxParticles - New maximum particle count (optional)
     */
    reset(maxParticles = this.maxParticles) {
      // If size changed, create new arrays
      if (maxParticles !== this.maxParticles) {
        this.maxParticles = maxParticles;
        this.positions = new Float32Array(maxParticles * 2);
        this.velocities = new Float32Array(maxParticles * 2);
        this.accelerations = new Float32Array(maxParticles * 2);
        this.masses = new Float32Array(maxParticles);
        this.sizes = new Float32Array(maxParticles);
        this.types = new Uint8Array(maxParticles);
        this.active = new Uint8Array(maxParticles);
        this.lifespans = new Float32Array(maxParticles);
        this.properties = new Float32Array(maxParticles * 4);
        this.prevPositions = new Float32Array(maxParticles * 2);
      } else {
        // Just clear existing arrays
        this.positions.fill(0);
        this.velocities.fill(0);
        this.accelerations.fill(0);
        this.masses.fill(0);
        this.sizes.fill(0);
        this.types.fill(0);
        this.active.fill(0);
        this.lifespans.fill(0);
        this.properties.fill(0);
        this.prevPositions.fill(0);
      }
      
      // Reset counters and pool
      this.count = 0;
      this.freeIndices = [];
    }
    
    /**
     * Create a new particle
     * @param {Object} params - Particle parameters
     * @return {number} Index of the created particle, or -1 if failed
     */
    create(params = {}) {
      // Check if we've reached particle limit
      if (this.count >= this.maxParticles && this.freeIndices.length === 0) {
        console.warn('Maximum particle count reached');
        return -1;
      }
      
      const startTime = performance.now();
      
      // Get next available index (either from free pool or increment count)
      let index;
      if (this.freeIndices.length > 0) {
        index = this.freeIndices.pop();
      } else {
        index = this.count++;
      }
      
      // Set particle data with defaults for missing values
      const x = params.x !== undefined ? params.x : 0;
      const y = params.y !== undefined ? params.y : 0;
      const vx = params.vx !== undefined ? params.vx : 0;
      const vy = params.vy !== undefined ? params.vy : 0;
      const mass = params.mass !== undefined ? params.mass : this.defaults.mass;
      const size = params.size !== undefined ? params.size : this.defaults.size;
      const type = params.type !== undefined ? params.type : this.defaults.type;
      const lifespan = params.lifespan !== undefined ? params.lifespan : this.defaults.lifespan;
      
      // Position
      const idx = index * 2;
      this.positions[idx] = x;
      this.positions[idx + 1] = y;
      
      // Velocity
      this.velocities[idx] = vx;
      this.velocities[idx + 1] = vy;
      
      // Zero acceleration
      this.accelerations[idx] = 0;
      this.accelerations[idx + 1] = 0;
      
      // Other properties
      this.masses[index] = mass;
      this.sizes[index] = size;
      this.types[index] = type;
      this.active[index] = 1;
      this.lifespans[index] = lifespan;
      
      // Initialize previous position for Verlet integration
      // Start with slight offset based on velocity for better initial behavior
      this.prevPositions[idx] = x - vx;
      this.prevPositions[idx + 1] = y - vy;
      
      // Custom properties if provided
      if (params.properties) {
        const propIdx = index * 4;
        for (let i = 0; i < Math.min(params.properties.length, 4); i++) {
          this.properties[propIdx + i] = params.properties[i];
        }
      }
      
      this.creationTime += performance.now() - startTime;
      
      return index;
    }
    
    /**
     * Create multiple particles at once
     * @param {number} count - Number of particles to create
     * @param {Function} paramGenerator - Function that returns params for each particle
     * @return {Array} Array of created particle indices
     */
    createBatch(count, paramGenerator) {
      const startTime = performance.now();
      const indices = [];
      
      for (let i = 0; i < count; i++) {
        const params = typeof paramGenerator === 'function' 
          ? paramGenerator(i, count) 
          : paramGenerator;
        
        const index = this.create(params);
        if (index !== -1) {
          indices.push(index);
        } else {
          // If we can't create more particles, stop
          break;
        }
      }
      
      this.creationTime += performance.now() - startTime;
      
      return indices;
    }
    
    /**
     * Remove a particle by index
     * @param {number} index - Index of particle to remove
     * @return {boolean} Success
     */
    remove(index) {
      if (index < 0 || index >= this.maxParticles || !this.active[index]) {
        return false;
      }
      
      // Mark as inactive
      this.active[index] = 0;
      
      // Add index to free pool for reuse
      this.freeIndices.push(index);
      
      return true;
    }
    
    /**
     * Update particle properties
     * @param {number} index - Index of particle to update
     * @param {Object} params - Properties to update
     * @return {boolean} Success
     */
    updateParticle(index, params) {
      if (index < 0 || index >= this.maxParticles || !this.active[index]) {
        return false;
      }
      
      const idx = index * 2;
      
      // Update properties if provided
      if (params.x !== undefined) this.positions[idx] = params.x;
      if (params.y !== undefined) this.positions[idx + 1] = params.y;
      if (params.vx !== undefined) this.velocities[idx] = params.vx;
      if (params.vy !== undefined) this.velocities[idx + 1] = params.vy;
      if (params.mass !== undefined) this.masses[index] = params.mass;
      if (params.size !== undefined) this.sizes[index] = params.size;
      if (params.type !== undefined) this.types[index] = params.type;
      if (params.lifespan !== undefined) this.lifespans[index] = params.lifespan;
      
      // Update custom properties if provided
      if (params.properties) {
        const propIdx = index * 4;
        for (let i = 0; i < Math.min(params.properties.length, 4); i++) {
          this.properties[propIdx + i] = params.properties[i];
        }
      }
      
      return true;
    }
    
    /**
     * Get the current state of a particle
     * @param {number} index - Index of particle
     * @return {Object|null} Particle state or null if invalid
     */
    getParticle(index) {
      if (index < 0 || index >= this.maxParticles || !this.active[index]) {
        return null;
      }
      
      const idx = index * 2;
      const propIdx = index * 4;
      
      return {
        x: this.positions[idx],
        y: this.positions[idx + 1],
        vx: this.velocities[idx],
        vy: this.velocities[idx + 1],
        ax: this.accelerations[idx],
        ay: this.accelerations[idx + 1],
        mass: this.masses[index],
        size: this.sizes[index],
        type: this.types[index],
        lifespan: this.lifespans[index],
        properties: [
          this.properties[propIdx],
          this.properties[propIdx + 1],
          this.properties[propIdx + 2],
          this.properties[propIdx + 3]
        ]
      };
    }
    
    /**
     * Get number of active particles
     * @return {number} Count of active particles
     */
    getActiveCount() {
      let activeCount = 0;
      for (let i = 0; i < this.count; i++) {
        if (this.active[i]) activeCount++;
      }
      return activeCount;
    }
    
    /**
     * Remove all particles of a specific type
     * @param {number} type - Type ID to remove
     * @return {number} Count of removed particles
     */
    removeByType(type) {
      let removedCount = 0;
      
      for (let i = 0; i < this.count; i++) {
        if (this.active[i] && this.types[i] === type) {
          this.remove(i);
          removedCount++;
        }
      }
      
      return removedCount;
    }
    
    /**
     * Find particles within a radius
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Search radius
     * @param {number} [typeFilter] - Optional type filter
     * @return {Array} Array of particle indices
     */
    findInRadius(x, y, radius, typeFilter) {
      const radiusSq = radius * radius;
      const found = [];
      
      for (let i = 0; i < this.count; i++) {
        if (!this.active[i]) continue;
        
        // Skip if type doesn't match filter
        if (typeFilter !== undefined && this.types[i] !== typeFilter) continue;
        
        const idx = i * 2;
        const dx = this.positions[idx] - x;
        const dy = this.positions[idx + 1] - y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq <= radiusSq) {
          found.push(i);
        }
      }
      
      return found;
    }
    
    /**
     * Update particle lifespans and remove expired particles
     * @param {number} dt - Time step in seconds
     * @return {number} Count of removed particles
     */
    updateLifespans(dt) {
      const startTime = performance.now();
      let removedCount = 0;
      
      for (let i = 0; i < this.count; i++) {
        if (!this.active[i]) continue;
        
        // Skip particles with infinite lifespan
        if (this.lifespans[i] === Infinity) continue;
        
        // Decrease lifespan
        this.lifespans[i] -= dt;
        
        // Remove if expired
        if (this.lifespans[i] <= 0) {
          this.remove(i);
          removedCount++;
        }
      }
      
      this.updateTime += performance.now() - startTime;
      
      return removedCount;
    }
    
    /**
     * Apply a force to a specific particle
     * @param {number} index - Particle index
     * @param {number} forceX - X component of force
     * @param {number} forceY - Y component of force
     * @return {boolean} Success
     */
    applyForce(index, forceX, forceY) {
      if (index < 0 || index >= this.maxParticles || !this.active[index]) {
        return false;
      }
      
      const idx = index * 2;
      const mass = this.masses[index];
      
      // F = ma, so a = F/m
      this.accelerations[idx] += forceX / mass;
      this.accelerations[idx + 1] += forceY / mass;
      
      return true;
    }
    
    /**
     * Apply a force to all particles in a radius
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Affect radius
     * @param {number} forceX - X component of force
     * @param {number} forceY - Y component of force
     * @param {number} [falloff='linear'] - Force falloff type ('linear', 'quadratic', 'constant')
     * @param {number} [typeFilter] - Optional type filter
     * @return {number} Count of affected particles
     */
    applyRadialForce(x, y, radius, forceX, forceY, falloff = 'linear', typeFilter) {
      const radiusSq = radius * radius;
      let affectedCount = 0;
      
      for (let i = 0; i < this.count; i++) {
        if (!this.active[i]) continue;
        
        // Skip if type doesn't match filter
        if (typeFilter !== undefined && this.types[i] !== typeFilter) continue;
        
        const idx = i * 2;
        const dx = this.positions[idx] - x;
        const dy = this.positions[idx + 1] - y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq <= radiusSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          let forceMult = 1;
          
          // Apply falloff
          switch (falloff) {
            case 'linear':
              forceMult = 1 - (dist / radius);
              break;
            case 'quadratic':
              forceMult = 1 - (distSq / radiusSq);
              break;
            case 'constant':
              forceMult = 1;
              break;
          }
          
          // Apply scaled force
          this.applyForce(i, forceX * forceMult, forceY * forceMult);
          affectedCount++;
        }
      }
      
      return affectedCount;
    }
    
    /**
     * Apply gravity-like attraction/repulsion between particle types
     * @param {number} typeA - First particle type
     * @param {number} typeB - Second particle type
     * @param {number} strength - Force strength (negative for repulsion)
     * @param {number} minDist - Minimum effective distance
     * @param {number} maxDist - Maximum effective distance
     * @return {number} Count of interactions processed
     */
    applyTypeInteraction(typeA, typeB, strength, minDist, maxDist) {
      // This is just for manual testing - in normal operation, the Engine class
      // uses the RuleMatrix to handle all interactions
      
      const minDistSq = minDist * minDist;
      const maxDistSq = maxDist * maxDist;
      let interactionCount = 0;
      
      // Find all type A particles
      for (let i = 0; i < this.count; i++) {
        if (!this.active[i] || this.types[i] !== typeA) continue;
        
        const idxA = i * 2;
        const xA = this.positions[idxA];
        const yA = this.positions[idxA + 1];
        const massA = this.masses[i];
        
        // Find all type B particles
        for (let j = 0; j < this.count; j++) {
          if (!this.active[j] || this.types[j] !== typeB || i === j) continue;
          
          const idxB = j * 2;
          const xB = this.positions[idxB];
          const yB = this.positions[idxB + 1];
          
          // Calculate distance
          const dx = xB - xA;
          const dy = yB - yA;
          const distSq = dx * dx + dy * dy;
          
          // Skip if outside effective range
          if (distSq < minDistSq || distSq > maxDistSq) continue;
          
          const dist = Math.sqrt(distSq);
          
          // Calculate force magnitude with inverse square law
          const forceMag = strength / distSq;
          
          // Apply force components to A (not to B - breaking Newton's Third Law)
          const forceX = (dx / dist) * forceMag;
          const forceY = (dy / dist) * forceMag;
          
          this.accelerations[idxA] += forceX / massA;
          this.accelerations[idxA + 1] += forceY / massA;
          
          interactionCount++;
        }
      }
      
      return interactionCount;
    }
    
    /**
     * Serialize particle data for transfer to worker
     * @return {Object} Serialized particle data
     */
    serialize() {
      return {
        positions: this.positions,
        velocities: this.velocities,
        accelerations: this.accelerations,
        masses: this.masses,
        sizes: this.sizes,
        types: this.types,
        active: this.active,
        lifespans: this.lifespans,
        properties: this.properties,
        prevPositions: this.prevPositions,
        count: this.count
      };
    }
    
    /**
     * Deserialize particle data from worker
     * @param {Object} data - Serialized particle data
     */
    deserialize(data) {
      this.positions = data.positions;
      this.velocities = data.velocities;
      this.accelerations = data.accelerations;
      this.masses = data.masses;
      this.sizes = data.sizes;
      this.types = data.types;
      this.active = data.active;
      this.lifespans = data.lifespans;
      this.properties = data.properties;
      this.prevPositions = data.prevPositions;
      this.count = data.count;
    }
  }
  
  export default ParticleSystem;