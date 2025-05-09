/**
 * Forces.js - Force calculation for particle interactions
 * 
 * Features:
 * - Efficient force calculation between particles
 * - Custom force functions based on rules matrix
 * - Optimization through spatial partitioning integration
 * - Support for asymmetric forces (breaking Newton's Third Law)
 */

class ForceCalculator {
    /**
     * Create a new force calculator
     * @param {RuleMatrix} ruleMatrix - Rules defining particle interactions
     */
    constructor(ruleMatrix) {
      this.rules = ruleMatrix;
      
      // Performance tracking
      this.lastCalculationTime = 0;
      this.particleInteractions = 0;
      this.forcesCalculated = 0;
    }
    
    /**
     * Set rule matrix
     * @param {RuleMatrix} ruleMatrix - New rules matrix
     */
    setRuleMatrix(ruleMatrix) {
      this.rules = ruleMatrix;
    }
    
    /**
     * Calculate forces between all particles
     * @param {ParticleSystem} particles - Particle system
     * @param {Quadtree} quadtree - Spatial partitioning structure
     * @param {number} dt - Time step in seconds
     * @return {number} Number of particle interactions processed
     */
    calculateForces(particles, quadtree, dt) {
      const startTime = performance.now();
      
      // Reset performance counters
      this.particleInteractions = 0;
      this.forcesCalculated = 0;
      
      // Reset accelerations
      particles.accelerations.fill(0);
      
      // For each active particle
      for (let i = 0; i < particles.count; i++) {
        if (!particles.active[i]) continue;
        
        const typeI = particles.types[i];
        const posX = particles.positions[i*2];
        const posY = particles.positions[i*2+1];
        const mass = particles.masses[i];
        
        // Skip if no interactions defined for this type
        let hasAnyInteractions = false;
        for (let t = 0; t < this.rules.typeCount; t++) {
          if (this.rules.hasInteraction(typeI, t)) {
            hasAnyInteractions = true;
            break;
          }
        }
        
        if (!hasAnyInteractions) continue;
        
        // Define search range based on max interaction distance
        const maxDistance = this.rules.getMaxInteractionDistance(typeI);
        if (maxDistance <= 0) continue;
        
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
        const nearby = quadtree.query(queryRange);
        
        // Apply forces from each nearby particle
        for (let j = 0; j < nearby.length; j++) {
          const otherIdx = nearby[j].index;
          
          // Skip self-interaction
          if (i === otherIdx || !particles.active[otherIdx]) continue;
          
          this.particleInteractions++;
          
          const typeJ = particles.types[otherIdx];
          
          // Skip if no interaction exists
          if (!this.rules.hasInteraction(typeI, typeJ)) continue;
          
          // Calculate vector between particles
          const otherX = particles.positions[otherIdx*2];
          const otherY = particles.positions[otherIdx*2+1];
          const dx = otherX - posX;
          const dy = otherY - posY;
          const distSq = dx*dx + dy*dy;
          
          // Skip if too close (avoid division by zero)
          if (distSq < 0.0001) continue;
          
          const dist = Math.sqrt(distSq);
          
          // Get force from rules
          const force = this.rules.calculateForce(typeI, typeJ, dist);
          
          // Skip if negligible force
          if (Math.abs(force) < 0.0001) continue;
          
          this.forcesCalculated++;
          
          // Apply force to acceleration (F = ma, so a = F/m)
          const forceX = (dx / dist) * force;
          const forceY = (dy / dist) * force;
          
          particles.accelerations[i*2] += forceX / mass;
          particles.accelerations[i*2+1] += forceY / mass;
          
          // Breaking Newton's Third Law - we don't apply equal and opposite force
          // We can optionally apply a scaled force in the opposite direction
          // based on the asymmetry parameter in the rule
          
          const rule = this.rules.getRule(typeI, typeJ);
          if (rule && rule.asymmetry > 0) {
            const otherMass = particles.masses[otherIdx];
            const reverseFactor = rule.asymmetry; // 0 = one-way, 1 = symmetric
            
            // Apply scaled reverse force
            particles.accelerations[otherIdx*2] -= (forceX / otherMass) * reverseFactor;
            particles.accelerations[otherIdx*2+1] -= (forceY / otherMass) * reverseFactor;
          }
        }
      }
      
      this.lastCalculationTime = performance.now() - startTime;
      
      return this.forcesCalculated;
    }
    
    /**
     * Apply global forces to all particles
     * @param {ParticleSystem} particles - Particle system
     * @param {Object} globalForces - Global force definitions
     * @param {number} dt - Time step in seconds
     */
    applyGlobalForces(particles, globalForces, dt) {
      for (let i = 0; i < particles.count; i++) {
        if (!particles.active[i]) continue;
        
        const mass = particles.masses[i];
        const idx = i * 2;
        
        // Apply gravity if defined
        if (globalForces.gravity) {
          particles.accelerations[idx] += globalForces.gravity.x;
          particles.accelerations[idx + 1] += globalForces.gravity.y;
        }
        
        // Apply viscous drag if defined
        if (globalForces.drag) {
          const dragCoeff = globalForces.drag;
          particles.accelerations[idx] -= particles.velocities[idx] * dragCoeff / mass;
          particles.accelerations[idx + 1] -= particles.velocities[idx + 1] * dragCoeff / mass;
        }
        
        // Apply central attraction if defined
        if (globalForces.centralAttraction) {
          const attraction = globalForces.centralAttraction;
          const centerX = attraction.x || 0;
          const centerY = attraction.y || 0;
          const strength = attraction.strength || 0;
          
          const dx = centerX - particles.positions[idx];
          const dy = centerY - particles.positions[idx + 1];
          const distSq = dx*dx + dy*dy;
          
          if (distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const forceMag = strength / (distSq * mass);
            particles.accelerations[idx] += dx / dist * forceMag;
            particles.accelerations[idx + 1] += dy / dist * forceMag;
          }
        }
        
        // Apply vortex force if defined
        if (globalForces.vortex) {
          const vortex = globalForces.vortex;
          const centerX = vortex.x || 0;
          const centerY = vortex.y || 0;
          const strength = vortex.strength || 0;
          
          const dx = particles.positions[idx] - centerX;
          const dy = particles.positions[idx + 1] - centerY;
          const distSq = dx*dx + dy*dy;
          
          if (distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const forceMag = strength / (dist * mass);
            
            // Perpendicular force for vortex (rotate 90 degrees)
            particles.accelerations[idx] += -dy / dist * forceMag;
            particles.accelerations[idx + 1] += dx / dist * forceMag;
          }
        }
      }
    }
    
    /**
     * Apply a targeted force to particles in a specific region
     * @param {ParticleSystem} particles - Particle system
     * @param {Object} force - Force definition (position, radius, strength, direction)
     */
    applyLocalForce(particles, force) {
      const { x, y, radius, strength, direction } = force;
      const radiusSq = radius * radius;
      
      // Normalize direction if provided
      let dirX = 0, dirY = 0;
      if (direction) {
        const dirLen = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (dirLen > 0.0001) {
          dirX = direction.x / dirLen;
          dirY = direction.y / dirLen;
        }
      }
      
      // Apply to all particles in range
      for (let i = 0; i < particles.count; i++) {
        if (!particles.active[i]) continue;
        
        const idx = i * 2;
        const particleX = particles.positions[idx];
        const particleY = particles.positions[idx + 1];
        
        const dx = particleX - x;
        const dy = particleY - y;
        const distSq = dx*dx + dy*dy;
        
        if (distSq <= radiusSq) {
          const mass = particles.masses[i];
          let forceMag = strength / mass;
          
          // Apply falloff with distance
          if (distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const falloff = 1 - (dist / radius); // Linear falloff
            forceMag *= falloff;
          }
          
          if (direction) {
            // Use specified direction
            particles.accelerations[idx] += dirX * forceMag;
            particles.accelerations[idx + 1] += dirY * forceMag;
          } else {
            // Radial force (outward if positive, inward if negative)
            if (distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              particles.accelerations[idx] += (dx / dist) * forceMag;
              particles.accelerations[idx + 1] += (dy / dist) * forceMag;
            }
          }
        }
      }
    }
    
    /**
     * Apply boundary conditions to contain particles
     * @param {ParticleSystem} particles - Particle system
     * @param {Object} bounds - Boundary rectangle {x, y, width, height}
     * @param {string} boundaryType - Type of boundary ('reflect', 'wrap', 'absorb')
     * @param {number} elasticity - Bounce elasticity (0-1) for 'reflect' type
     */
    applyBoundaries(particles, bounds, boundaryType = 'reflect', elasticity = 0.8) {
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
     * Get performance statistics
     * @return {Object} Performance metrics
     */
    getPerformanceMetrics() {
      return {
        calculationTime: this.lastCalculationTime,
        particleInteractions: this.particleInteractions,
        forcesCalculated: this.forcesCalculated,
        interactionsPerMs: this.lastCalculationTime > 0 ? 
          this.particleInteractions / this.lastCalculationTime : 0
      };
    }
  }
  
  export default ForceCalculator;