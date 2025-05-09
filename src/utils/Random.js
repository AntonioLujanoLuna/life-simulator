/**
 * Random.js - Advanced random number utilities
 * 
 * Features:
 * - High-quality seeded PRNG
 * - Various distributions (uniform, normal, exponential, etc.)
 * - Spatial distributions for particle placement
 * - Utilities for random selections, shuffling, etc.
 */

class Random {
    /**
     * Create a new random number generator
     * @param {number|string} seed - Seed for the RNG (optional)
     */
    constructor(seed) {
      this.seed = this.hashSeed(seed);
      this.state = this.seed;
      
      // Constants for Mulberry32 algorithm
      this._A = 1664525;
      this._C = 1013904223;
      this._M = 4294967296; // 2^32
    }
    
    /**
     * Hash a seed value into a 32-bit integer
     * @param {number|string|undefined} seed - Input seed
     * @return {number} 32-bit seed value
     * @private
     */
    hashSeed(seed) {
      // Default to current time if no seed provided
      if (seed === undefined || seed === null) {
        seed = Date.now();
      }
      
      // If seed is a string, convert to number via simple hash
      if (typeof seed === 'string') {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
          hash = ((hash << 5) - hash) + seed.charCodeAt(i);
          hash |= 0; // Convert to 32-bit integer
        }
        seed = Math.abs(hash);
      }
      
      return seed >>> 0; // Ensure 32-bit unsigned integer
    }
    
    /**
     * Set the random seed
     * @param {number|string} seed - New seed
     * @return {Random} Self for chaining
     */
    setSeed(seed) {
      this.seed = this.hashSeed(seed);
      this.state = this.seed;
      return this;
    }
    
    /**
     * Get the current seed
     * @return {number} Current seed
     */
    getSeed() {
      return this.seed;
    }
    
    /**
     * Get the current state (can be used to restore later)
     * @return {number} Current state
     */
    getState() {
      return this.state;
    }
    
    /**
     * Set the generator state
     * @param {number} state - State to set
     * @return {Random} Self for chaining
     */
    setState(state) {
      this.state = state >>> 0; // Ensure 32-bit unsigned
      return this;
    }
    
    /**
     * Generate a random number in [0, 1)
     * Uses Mulberry32 algorithm for good statistical properties
     * @return {number} Random number in [0, 1)
     */
    random() {
      // Update state using Mulberry32 algorithm
      let t = this.state + 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      this.state = (t ^ (t >>> 14)) >>> 0;
      
      // Convert to float in [0, 1)
      return this.state / 4294967296;
    }
    
    /**
     * Generate a random integer in [min, max] (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @return {number} Random integer in range
     */
    int(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(this.random() * (max - min + 1)) + min;
    }
    
    /**
     * Generate a random float in [min, max) or [0, min) if only one arg
     * @param {number} min - Minimum value (or max if only one arg)
     * @param {number} max - Maximum value (optional)
     * @return {number} Random float in range
     */
    float(min, max) {
      if (max === undefined) {
        max = min;
        min = 0;
      }
      return this.random() * (max - min) + min;
    }
    
    /**
     * Get a random boolean with given probability
     * @param {number} probability - Probability of true (default 0.5)
     * @return {boolean} Random boolean
     */
    boolean(probability = 0.5) {
      return this.random() < probability;
    }
    
    /**
     * Get a random item from an array
     * @param {Array} array - Array to select from
     * @return {*} Random array item
     */
    pick(array) {
      if (!array || array.length === 0) return undefined;
      return array[this.int(0, array.length - 1)];
    }
    
    /**
     * Get multiple random items from an array
     * @param {Array} array - Array to select from
     * @param {number} count - Number of items to pick
     * @param {boolean} allowDuplicates - Whether to allow picking the same item multiple times
     * @return {Array} Array of randomly selected items
     */
    multiPick(array, count, allowDuplicates = false) {
      if (!array || array.length === 0) return [];
      
      // Ensure count is valid
      count = Math.min(count, allowDuplicates ? Infinity : array.length);
      count = Math.max(0, count);
      
      // For a small number of picks from a large array,
      // just doing a simple pick with duplicate checking is faster
      if (allowDuplicates || count < array.length / 10) {
        const result = [];
        
        if (allowDuplicates) {
          // With duplicates - simple random selection
          for (let i = 0; i < count; i++) {
            result.push(this.pick(array));
          }
        } else {
          // Without duplicates - check for already picked
          const picked = new Set();
          while (result.length < count) {
            const idx = this.int(0, array.length - 1);
            if (!picked.has(idx)) {
              picked.add(idx);
              result.push(array[idx]);
            }
          }
        }
        
        return result;
      } else {
        // For picking a large fraction of the array, shuffle and slice
        const shuffled = this.shuffle(array.slice());
        return shuffled.slice(0, count);
      }
    }
    
    /**
     * Shuffle an array using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle (modified in-place)
     * @return {Array} Shuffled array (same instance)
     */
    shuffle(array) {
      if (!array) return array;
      
      // Fisher-Yates shuffle
      for (let i = array.length - 1; i > 0; i--) {
        const j = this.int(0, i);
        [array[i], array[j]] = [array[j], array[i]];
      }
      
      return array;
    }
    
    /**
     * Generate a random number with normal (Gaussian) distribution
     * Uses Box-Muller transform
     * @param {number} mean - Mean of the distribution
     * @param {number} stdDev - Standard deviation
     * @return {number} Random value from normal distribution
     */
    normal(mean = 0, stdDev = 1) {
      // Use Box-Muller transform
      const u1 = this.random();
      const u2 = this.random();
      
      // Create two independent normally distributed values
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      
      // Transform to desired mean and standard deviation
      return z0 * stdDev + mean;
    }
    
    /**
     * Generate a pair of independent normal values
     * Optimization of the normal() method when you need 2 values
     * @param {number} mean - Mean of the distribution
     * @param {number} stdDev - Standard deviation
     * @return {Array} Two random values [value1, value2]
     */
    normalPair(mean = 0, stdDev = 1) {
      // Use Box-Muller transform
      const u1 = this.random();
      const u2 = this.random();
      
      const r = Math.sqrt(-2.0 * Math.log(u1));
      const theta = 2.0 * Math.PI * u2;
      
      // Create two independent normally distributed values
      const z0 = r * Math.cos(theta);
      const z1 = r * Math.sin(theta);
      
      // Transform to desired mean and standard deviation
      return [
        z0 * stdDev + mean,
        z1 * stdDev + mean
      ];
    }
    
    /**
     * Generate a random number with exponential distribution
     * @param {number} lambda - Rate parameter
     * @return {number} Random value from exponential distribution
     */
    exponential(lambda = 1) {
      // Inverse transform sampling
      return -Math.log(1 - this.random()) / lambda;
    }
    
    /**
     * Generate a random number with Poisson distribution
     * @param {number} lambda - Expected number of occurrences
     * @return {number} Random value from Poisson distribution
     */
    poisson(lambda = 1) {
      if (lambda <= 0) return 0;
      
      // For small lambda, use direct method
      if (lambda < 10) {
        const l = Math.exp(-lambda);
        let k = 0;
        let p = 1;
        
        do {
          k++;
          p *= this.random();
        } while (p > l);
        
        return k - 1;
      } else {
        // For large lambda, use normal approximation
        const x = this.normal(lambda, Math.sqrt(lambda));
        return Math.max(0, Math.floor(x + 0.5));
      }
    }
    
    /**
     * Generate a random point within a circle
     * @param {number} radius - Circle radius
     * @param {boolean} uniform - If true, distribution is uniform by area
     * @return {Object} Point {x, y}
     */
    pointInCircle(radius = 1, uniform = true) {
      if (uniform) {
        // Uniform distribution by area
        const r = radius * Math.sqrt(this.random());
        const theta = this.random() * 2 * Math.PI;
        
        return {
          x: r * Math.cos(theta),
          y: r * Math.sin(theta)
        };
      } else {
        // Simple (but not uniform) method
        const theta = this.random() * 2 * Math.PI;
        const r = this.random() * radius;
        
        return {
          x: r * Math.cos(theta),
          y: r * Math.sin(theta)
        };
      }
    }
    
    /**
     * Generate a random point within a rectangle
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {number} x - X coordinate of top-left corner
     * @param {number} y - Y coordinate of top-left corner
     * @return {Object} Point {x, y}
     */
    pointInRectangle(width, height, x = 0, y = 0) {
      return {
        x: x + this.random() * width,
        y: y + this.random() * height
      };
    }
    
    /**
     * Generate a random point on a circle (circumference only)
     * @param {number} radius - Circle radius
     * @return {Object} Point {x, y}
     */
    pointOnCircle(radius = 1) {
      const theta = this.random() * 2 * Math.PI;
      
      return {
        x: radius * Math.cos(theta),
        y: radius * Math.sin(theta)
      };
    }
    
    /**
     * Generate a random unit vector
     * @return {Object} Unit vector {x, y}
     */
    unitVector() {
      const theta = this.random() * 2 * Math.PI;
      
      return {
        x: Math.cos(theta),
        y: Math.sin(theta)
      };
    }
    
    /**
     * Generate a random color
     * @param {boolean} includeAlpha - Whether to include alpha value
     * @return {Array} RGB or RGBA color [r, g, b] or [r, g, b, a]
     */
    color(includeAlpha = false) {
      const r = Math.floor(this.random() * 256);
      const g = Math.floor(this.random() * 256);
      const b = Math.floor(this.random() * 256);
      
      if (includeAlpha) {
        const a = this.random();
        return [r, g, b, a];
      }
      
      return [r, g, b];
    }
    
    /**
     * Generate a weighted random value
     * @param {Array} values - Array of values to choose from
     * @param {Array} weights - Array of weights
     * @return {*} Randomly selected value according to weights
     */
    weighted(values, weights) {
      if (!values || !weights || values.length !== weights.length || values.length === 0) {
        return undefined;
      }
      
      // Calculate sum of weights
      let sum = 0;
      for (let i = 0; i < weights.length; i++) {
        sum += weights[i];
      }
      
      // Get a random value between 0 and sum
      const r = this.float(0, sum);
      
      // Find which weight range it falls into
      let partialSum = 0;
      for (let i = 0; i < weights.length; i++) {
        partialSum += weights[i];
        if (r < partialSum) {
          return values[i];
        }
      }
      
      // Fallback (should not happen)
      return values[values.length - 1];
    }
    
    /**
     * Generate a set of particles with a given distribution
     * @param {number} count - Number of particles to generate
     * @param {Object} options - Distribution options
     * @return {Array} Array of particle positions and velocities
     */
    particles(count, options = {}) {
      const distribution = options.distribution || 'uniform';
      const bounds = options.bounds || { x: 0, y: 0, width: 100, height: 100 };
      const velocityScale = options.velocityScale || 1.0;
      const velocityAngle = options.velocityAngle; // If undefined, random directions
      const velocityType = options.velocityType || 'random'; // 'random', 'radial', 'circular', 'still'
      
      const particles = [];
      
      // Generate positions based on distribution
      switch (distribution) {
        case 'gaussian':
          // Gaussian distribution centered in the bounds
          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;
          const stdDevX = bounds.width / 6; // ~99.7% within bounds
          const stdDevY = bounds.height / 6;
          
          for (let i = 0; i < count; i++) {
            const x = this.normal(centerX, stdDevX);
            const y = this.normal(centerY, stdDevY);
            
            particles.push(this.createParticle(x, y, velocityScale, velocityAngle, velocityType, {
              centerX, centerY
            }));
          }
          break;
        
        case 'grid':
          // Arrange particles in a grid
          const cols = Math.ceil(Math.sqrt(count * bounds.width / bounds.height));
          const rows = Math.ceil(count / cols);
          const cellWidth = bounds.width / cols;
          const cellHeight = bounds.height / rows;
          
          for (let i = 0; i < count; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            // Position at cell center with optional jitter
            const jitter = options.jitter || 0;
            const jitterX = jitter * cellWidth * (this.random() - 0.5);
            const jitterY = jitter * cellHeight * (this.random() - 0.5);
            
            const x = bounds.x + (col + 0.5) * cellWidth + jitterX;
            const y = bounds.y + (row + 0.5) * cellHeight + jitterY;
            
            particles.push(this.createParticle(x, y, velocityScale, velocityAngle, velocityType, {
              centerX: bounds.x + bounds.width / 2,
              centerY: bounds.y + bounds.height / 2
            }));
          }
          break;
        
        case 'circle':
          // Particles distributed in a circle
          const radius = Math.min(bounds.width, bounds.height) / 2;
          const circleCenterX = bounds.x + bounds.width / 2;
          const circleCenterY = bounds.y + bounds.height / 2;
          
          for (let i = 0; i < count; i++) {
            const point = this.pointInCircle(radius, true);
            const x = circleCenterX + point.x;
            const y = circleCenterY + point.y;
            
            particles.push(this.createParticle(x, y, velocityScale, velocityAngle, velocityType, {
              centerX: circleCenterX,
              centerY: circleCenterY
            }));
          }
          break;
        
        case 'ring':
          // Particles distributed in a ring
          const ringRadius = Math.min(bounds.width, bounds.height) / 2;
          const ringWidth = options.ringWidth || ringRadius * 0.2;
          const ringCenterX = bounds.x + bounds.width / 2;
          const ringCenterY = bounds.y + bounds.height / 2;
          
          for (let i = 0; i < count; i++) {
            const theta = this.random() * 2 * Math.PI;
            const r = ringRadius - ringWidth / 2 + this.random() * ringWidth;
            
            const x = ringCenterX + r * Math.cos(theta);
            const y = ringCenterY + r * Math.sin(theta);
            
            particles.push(this.createParticle(x, y, velocityScale, velocityAngle, velocityType, {
              centerX: ringCenterX,
              centerY: ringCenterY
            }));
          }
          break;
        
        case 'clusters':
          // Multiple Gaussian clusters
          const clusterCount = options.clusterCount || 3;
          const clusterSizes = options.clusterSizes;
          const clusters = [];
          
          // Generate cluster centers
          for (let i = 0; i < clusterCount; i++) {
            clusters.push({
              x: bounds.x + this.random() * bounds.width,
              y: bounds.y + this.random() * bounds.height,
              radius: (options.clusterRadius || bounds.width / 8) * 
                      (clusterSizes ? clusterSizes[i % clusterSizes.length] : 1)
            });
          }
          
          // Assign particles to random clusters
          for (let i = 0; i < count; i++) {
            const cluster = this.pick(clusters);
            const point = this.pointInCircle(cluster.radius, true);
            
            const x = cluster.x + point.x;
            const y = cluster.y + point.y;
            
            particles.push(this.createParticle(x, y, velocityScale, velocityAngle, velocityType, {
              centerX: cluster.x,
              centerY: cluster.y
            }));
          }
          break;
        
        case 'perlin':
          // This would use Perlin noise to distribute particles
          // Since Perlin noise implementation is complex, falling back to uniform
          /* falls through */
        
        case 'uniform':
        default:
          // Uniform distribution in bounds
          for (let i = 0; i < count; i++) {
            const x = bounds.x + this.random() * bounds.width;
            const y = bounds.y + this.random() * bounds.height;
            
            particles.push(this.createParticle(x, y, velocityScale, velocityAngle, velocityType, {
              centerX: bounds.x + bounds.width / 2,
              centerY: bounds.y + bounds.height / 2
            }));
          }
          break;
      }
      
      return particles;
    }
    
    /**
     * Helper to create a particle with position and velocity
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} velocityScale - Scale factor for velocity
     * @param {number} velocityAngle - Fixed angle for velocity (optional)
     * @param {string} velocityType - Type of velocity distribution
     * @param {Object} context - Additional context (e.g., center point)
     * @return {Object} Particle object {x, y, vx, vy}
     * @private
     */
    createParticle(x, y, velocityScale, velocityAngle, velocityType, context) {
      let vx = 0;
      let vy = 0;
      
      switch (velocityType) {
        case 'radial':
          // Velocity away from center
          const dx = x - context.centerX;
          const dy = y - context.centerY;
          const length = Math.sqrt(dx * dx + dy * dy);
          
          if (length > 0.0001) {
            vx = (dx / length) * velocityScale;
            vy = (dy / length) * velocityScale;
          }
          break;
        
        case 'circular':
          // Velocity perpendicular to radial (orbital)
          const cx = x - context.centerX;
          const cy = y - context.centerY;
          const dist = Math.sqrt(cx * cx + cy * cy);
          
          if (dist > 0.0001) {
            // Perpendicular vector
            vx = -(cy / dist) * velocityScale;
            vy = (cx / dist) * velocityScale;
          }
          break;
        
        case 'still':
          // No velocity
          vx = 0;
          vy = 0;
          break;
        
        case 'random':
        default:
          // Random velocity
          if (velocityAngle !== undefined) {
            // Fixed angle
            vx = Math.cos(velocityAngle) * velocityScale;
            vy = Math.sin(velocityAngle) * velocityScale;
          } else {
            // Random direction
            const angle = this.random() * 2 * Math.PI;
            vx = Math.cos(angle) * velocityScale;
            vy = Math.sin(angle) * velocityScale;
          }
          break;
      }
      
      return { x, y, vx, vy };
    }
    
    /**
     * Get a random power law distributed value
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {number} exponent - Exponent (alpha) value
     * @return {number} Random value with power law distribution
     */
    powerLaw(min, max, exponent = 2) {
      if (max <= min) return min;
      
      // Calculate power law value
      const x = this.random();
      
      // Use inverse transform sampling for power law
      if (exponent === 1) {
        // Special case for exponent = 1 (to avoid division by zero)
        return min * Math.pow(max / min, x);
      } else {
        const a = Math.pow(min, 1 - exponent);
        const b = Math.pow(max, 1 - exponent);
        return Math.pow(a + (b - a) * x, 1 / (1 - exponent));
      }
    }
    
    /**
     * Get a random ID string
     * @param {number} length - Length of ID string
     * @param {string} charset - Character set to use
     * @return {string} Random ID
     */
    id(length = 8, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
      let result = '';
      for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(this.random() * charset.length));
      }
      return result;
    }
  }
  
  // Create a default instance with random seed
  const random = new Random();
  
  export { Random, random as default };