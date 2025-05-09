/**
 * Rules.js - Particle interaction rules system
 * 
 * Features:
 * - Defines how different particle types interact with each other
 * - Supports asymmetric forces (breaking Newton's Third Law)
 * - Custom force falloff functions
 * - Rule-based interaction matrix
 */

class RuleMatrix {
    /**
     * Create a new rule matrix for particle interactions
     * @param {number} typeCount - Number of particle types
     */
    constructor(typeCount) {
      this.typeCount = typeCount;
      
      // Initialize rule matrix (3D array)
      // First dimension: type A
      // Second dimension: type B
      // Third dimension: rule properties
      this.rules = Array(typeCount).fill().map(() => 
        Array(typeCount).fill().map(() => this.createDefaultRule())
      );
      
      // Optimization: Track which types have any interactions
      this.hasInteractions = Array(typeCount).fill().map(() => 
        Array(typeCount).fill(false)
      );
      
      // Cache for maximum interaction distances by type
      this.maxDistanceCache = Array(typeCount).fill(0);
      this.cacheValid = false;
    }
    
    /**
     * Create default rule object
     * @return {Object} Default rule object
     * @private
     */
    createDefaultRule() {
      return {
        attractionStrength: 0,      // Positive = attraction, baseline force
        repulsionStrength: 0,       // Positive = repulsion (typically active at closer distances)
        activationDistance: 100,    // Max distance for interaction
        minDistance: 1,             // Min distance for force calculation (avoid singularity)
        forceFalloff: 'inverse_square', // Force decay with distance ('inverse_square', 'linear', 'constant')
        asymmetry: 1.0,             // Controls force asymmetry (0 = one-way, 1 = symmetric)
        active: false               // Whether this rule has any effect
      };
    }
    
    /**
     * Reset the rule matrix
     * @param {number} typeCount - New type count (optional)
     */
    reset(typeCount = this.typeCount) {
      this.typeCount = typeCount;
      
      // Reinitialize all arrays
      this.rules = Array(typeCount).fill().map(() => 
        Array(typeCount).fill().map(() => this.createDefaultRule())
      );
      
      this.hasInteractions = Array(typeCount).fill().map(() => 
        Array(typeCount).fill(false)
      );
      
      this.maxDistanceCache = Array(typeCount).fill(0);
      this.cacheValid = false;
    }
    
    /**
     * Set rule for how type A particles interact with type B particles
     * @param {number} typeA - First particle type
     * @param {number} typeB - Second particle type
     * @param {Object} ruleParams - Rule parameters
     * @return {boolean} Success
     */
    setRule(typeA, typeB, ruleParams) {
      if (typeA < 0 || typeA >= this.typeCount || typeB < 0 || typeB >= this.typeCount) {
        console.error(`Invalid type indices: ${typeA}, ${typeB}`);
        return false;
      }
      
      // Update rule with new parameters (preserve defaults for unspecified)
      const currentRule = this.rules[typeA][typeB];
      const updatedRule = {
        ...currentRule,
        ...ruleParams
      };
      
      // Ensure minimum distance is positive to avoid singularities
      updatedRule.minDistance = Math.max(0.1, updatedRule.minDistance);
      
      // Update the rule
      this.rules[typeA][typeB] = updatedRule;
      
      // Mark as having an interaction if either attraction or repulsion is non-zero
      const hasEffect = (
        Math.abs(updatedRule.attractionStrength) > 0.0001 || 
        Math.abs(updatedRule.repulsionStrength) > 0.0001
      );
      
      this.hasInteractions[typeA][typeB] = hasEffect;
      updatedRule.active = hasEffect;
      
      // For symmetric interactions, update the reverse direction
      if (ruleParams.symmetric === true) {
        // Create symmetric rule with same parameters
        const symmetricParams = {...ruleParams};
        delete symmetricParams.asymmetry; // Don't copy asymmetry
        
        // Explicitly set asymmetry to match the first direction
        symmetricParams.asymmetry = updatedRule.asymmetry;
        
        // Set the reverse rule
        this.setRule(typeB, typeA, symmetricParams);
      }
      
      // Invalidate max distance cache
      this.cacheValid = false;
      
      return true;
    }
    
    /**
     * Get rule for interaction between two particle types
     * @param {number} typeA - First particle type
     * @param {number} typeB - Second particle type
     * @return {Object|null} Rule object or null if invalid
     */
    getRule(typeA, typeB) {
      if (typeA < 0 || typeA >= this.typeCount || typeB < 0 || typeB >= this.typeCount) {
        return null;
      }
      
      return this.rules[typeA][typeB];
    }
    
    /**
     * Check if there's any interaction between two types
     * @param {number} typeA - First particle type
     * @param {number} typeB - Second particle type
     * @return {boolean} Whether interaction exists
     */
    hasInteraction(typeA, typeB) {
      if (typeA < 0 || typeA >= this.typeCount || typeB < 0 || typeB >= this.typeCount) {
        return false;
      }
      
      return this.hasInteractions[typeA][typeB];
    }
    
    /**
     * Calculate force between two particles based on their types and distance
     * @param {number} typeA - Type of first particle
     * @param {number} typeB - Type of second particle
     * @param {number} distance - Distance between particles
     * @return {number} Force magnitude (positive = attraction, negative = repulsion)
     */
    calculateForce(typeA, typeB, distance) {
      if (typeA < 0 || typeA >= this.typeCount || typeB < 0 || typeB >= this.typeCount) {
        return 0;
      }
      
      const rule = this.rules[typeA][typeB];
      
      // Skip if no interaction or outside activation distance
      if (!rule.active || distance > rule.activationDistance) {
        return 0;
      }
      
      // Clamp distance to minimum to avoid singularities
      const clampedDist = Math.max(rule.minDistance, distance);
      
      // Calculate force based on falloff function
      let forceMagnitude = 0;
      
      switch (rule.forceFalloff) {
        case 'inverse_square':
          // Attraction follows inverse square law (like gravity)
          forceMagnitude = rule.attractionStrength / (clampedDist * clampedDist);
          
          // Repulsion is typically stronger at close distances
          if (rule.repulsionStrength > 0) {
            const repulsionFactor = Math.pow(rule.activationDistance / clampedDist, 2);
            forceMagnitude -= (rule.repulsionStrength * repulsionFactor) / (clampedDist * clampedDist);
          }
          break;
          
        case 'linear':
          // Linear falloff with distance
          const normalizedDist = clampedDist / rule.activationDistance;
          forceMagnitude = rule.attractionStrength * (1 - normalizedDist);
          
          // Linear repulsion
          if (rule.repulsionStrength > 0) {
            const repulsionFalloff = 1 - normalizedDist;
            forceMagnitude -= rule.repulsionStrength * repulsionFalloff;
          }
          break;
          
        case 'constant':
          // Constant force regardless of distance (within activation range)
          forceMagnitude = rule.attractionStrength;
          
          // Constant repulsion
          if (rule.repulsionStrength > 0) {
            forceMagnitude -= rule.repulsionStrength;
          }
          break;
          
        case 'exponential':
          // Exponential falloff
          const expFactor = -clampedDist / (rule.activationDistance * 0.5);
          forceMagnitude = rule.attractionStrength * Math.exp(expFactor);
          
          // Exponential repulsion
          if (rule.repulsionStrength > 0) {
            const repulsionExp = -clampedDist / (rule.activationDistance * 0.2); // Faster falloff
            forceMagnitude -= rule.repulsionStrength * Math.exp(repulsionExp);
          }
          break;
          
        case 'sigmoid':
          // Sigmoid falloff (smooth transition between regions)
          const normDist = clampedDist / rule.activationDistance;
          const sigmoid = 1 / (1 + Math.exp(10 * (normDist - 0.5)));
          forceMagnitude = rule.attractionStrength * sigmoid;
          
          // Sigmoid repulsion
          if (rule.repulsionStrength > 0) {
            const repulsionSigmoid = 1 / (1 + Math.exp(15 * (normDist - 0.3))); // Sharper falloff
            forceMagnitude -= rule.repulsionStrength * repulsionSigmoid;
          }
          break;
          
        default:
          // Default to inverse square
          forceMagnitude = rule.attractionStrength / (clampedDist * clampedDist);
          if (rule.repulsionStrength > 0) {
            forceMagnitude -= rule.repulsionStrength / (clampedDist * clampedDist);
          }
      }
      
      return forceMagnitude;
    }
    
    /**
     * Get maximum interaction distance for a particle type
     * This is used for spatial partitioning optimization
     * @param {number} type - Particle type
     * @return {number} Maximum interaction distance
     */
    getMaxInteractionDistance(type) {
      if (type < 0 || type >= this.typeCount) {
        return 0;
      }
      
      // Rebuild cache if invalid
      if (!this.cacheValid) {
        this.updateMaxDistanceCache();
      }
      
      return this.maxDistanceCache[type];
    }
    
    /**
     * Update the maximum distance cache
     * @private
     */
    updateMaxDistanceCache() {
      // Reset all distances
      this.maxDistanceCache.fill(0);
      
      // Find max activation distance for each type
      for (let typeA = 0; typeA < this.typeCount; typeA++) {
        for (let typeB = 0; typeB < this.typeCount; typeB++) {
          const rule = this.rules[typeA][typeB];
          
          if (rule.active) {
            this.maxDistanceCache[typeA] = Math.max(
              this.maxDistanceCache[typeA], 
              rule.activationDistance
            );
          }
        }
      }
      
      this.cacheValid = true;
    }
    
    /**
     * Create a preset rule matrix
     * @param {string} presetName - Name of the preset
     * @return {boolean} Success
     */
    applyPreset(presetName) {
      // Reset current rules
      this.reset(this.typeCount);
      
      switch (presetName.toLowerCase()) {
        case 'basic_attraction':
          this.createBasicAttractionPreset();
          return true;
          
        case 'orbital':
          this.createOrbitalPreset();
          return true;
          
        case 'segregation':
          this.createSegregationPreset();
          return true;
          
        case 'food_chain':
          this.createFoodChainPreset();
          return true;
          
        case 'crystal_formation':
          this.createCrystalPreset();
          return true;
          
        default:
          console.error(`Unknown preset: ${presetName}`);
          return false;
      }
    }
    
    /**
     * Create a basic attraction preset
     * @private
     */
    createBasicAttractionPreset() {
      // Simple attraction between particle types
      for (let i = 0; i < Math.min(this.typeCount, 3); i++) {
        for (let j = 0; j < Math.min(this.typeCount, 3); j++) {
          if (i === j) {
            // Same type slight repulsion
            this.setRule(i, j, {
              attractionStrength: 0,
              repulsionStrength: 0.5,
              activationDistance: 50,
              minDistance: 5,
              forceFalloff: 'inverse_square'
            });
          } else {
            // Different types attract
            this.setRule(i, j, {
              attractionStrength: 1.0,
              repulsionStrength: 0.3,
              activationDistance: 100,
              minDistance: 5,
              forceFalloff: 'inverse_square'
            });
          }
        }
      }
    }
    
    /**
     * Create an orbital motion preset
     * @private
     */
    createOrbitalPreset() {
      // Type 0: Central bodies
      // Type 1: Orbiting bodies
      // Type 2: Disruptors
      
      // Central attracts orbiters
      this.setRule(0, 1, {
        attractionStrength: 3.0,
        repulsionStrength: 0.1,
        activationDistance: 200,
        minDistance: 10,
        forceFalloff: 'inverse_square',
        asymmetry: 1.0  // Symmetric force
      });
      
      // Orbiters weakly attract central
      this.setRule(1, 0, {
        attractionStrength: 0.1,
        repulsionStrength: 0,
        activationDistance: 200,
        minDistance: 10,
        forceFalloff: 'inverse_square'
      });
      
      // Orbiters repel each other
      this.setRule(1, 1, {
        attractionStrength: 0,
        repulsionStrength: 0.5,
        activationDistance: 50,
        minDistance: 5,
        forceFalloff: 'inverse_square'
      });
      
      // Disruptors repel orbiters
      this.setRule(2, 1, {
        attractionStrength: 0,
        repulsionStrength: 2.0,
        activationDistance: 100,
        minDistance: 5,
        forceFalloff: 'inverse_square',
        asymmetry: 0.2  // Mostly one-way
      });
      
      // Central bodies attract each other
      this.setRule(0, 0, {
        attractionStrength: 1.0,
        repulsionStrength: 5.0,  // Strong short-range repulsion
        activationDistance: 150,
        minDistance: 20,
        forceFalloff: 'inverse_square'
      });
    }
    
    /**
     * Create a segregation preset
     * @private
     */
    createSegregationPreset() {
      // Each type attracts its own kind and repels others
      
      for (let i = 0; i < Math.min(this.typeCount, 4); i++) {
        for (let j = 0; j < Math.min(this.typeCount, 4); j++) {
          if (i === j) {
            // Same type attraction with short-range repulsion
            this.setRule(i, j, {
              attractionStrength: 1.0,
              repulsionStrength: 3.0,
              activationDistance: 100,
              minDistance: 5,
              forceFalloff: 'inverse_square'
            });
          } else {
            // Different types repel
            this.setRule(i, j, {
              attractionStrength: 0,
              repulsionStrength: 2.0,
              activationDistance: 80,
              minDistance: 5,
              forceFalloff: 'inverse_square'
            });
          }
        }
      }
    }
    
    /**
     * Create a food chain preset
     * @private
     */
    createFoodChainPreset() {
      // Type 0: Plants (lowest)
      // Type 1: Herbivores
      // Type 2: Carnivores
      // Type 3: Apex predators
      
      // Each level is attracted to the level below (food) and repelled by the level above (predators)
      
      // Plants spread out
      this.setRule(0, 0, {
        attractionStrength: 0.2,
        repulsionStrength: 0.5,
        activationDistance: 50,
        minDistance: 5,
        forceFalloff: 'inverse_square'
      });
      
      // Herbivores are attracted to plants (breaking Newton's Third Law)
      this.setRule(1, 0, {
        attractionStrength: 2.0,
        repulsionStrength: 0,
        activationDistance: 100,
        minDistance: 5,
        forceFalloff: 'inverse_square',
        asymmetry: 0.0  // One-way interaction
      });
      
      // Plants don't react to herbivores
      this.setRule(0, 1, {
        attractionStrength: 0,
        repulsionStrength: 0,
        activationDistance: 0,
        minDistance: 5,
        forceFalloff: 'inverse_square'
      });
      
      // Herbivores maintain distance from each other
      this.setRule(1, 1, {
        attractionStrength: 0.3,
        repulsionStrength: 0.8,
        activationDistance: 60,
        minDistance: 10,
        forceFalloff: 'inverse_square'
      });
      
      // Carnivores chase herbivores
      this.setRule(2, 1, {
        attractionStrength: 2.5,
        repulsionStrength: 0,
        activationDistance: 150,
        minDistance: 5,
        forceFalloff: 'linear',
        asymmetry: 0.0  // One-way
      });
      
      // Herbivores flee from carnivores
      this.setRule(1, 2, {
        attractionStrength: -2.0,  // Negative attraction = repulsion
        repulsionStrength: 0,
        activationDistance: 120,
        minDistance: 5,
        forceFalloff: 'exponential'
      });
      
      // Carnivores maintain distance from each other
      this.setRule(2, 2, {
        attractionStrength: 0.1,
        repulsionStrength: 1.0,
        activationDistance: 80,
        minDistance: 15,
        forceFalloff: 'inverse_square'
      });
      
      // Apex predators chase carnivores
      this.setRule(3, 2, {
        attractionStrength: 3.0,
        repulsionStrength: 0,
        activationDistance: 200,
        minDistance: 5,
        forceFalloff: 'linear',
        asymmetry: 0.0  // One-way
      });
      
      // Carnivores flee from apex predators
      this.setRule(2, 3, {
        attractionStrength: -2.5,  // Negative attraction = repulsion
        repulsionStrength: 0,
        activationDistance: 150,
        minDistance: 5,
        forceFalloff: 'exponential'
      });
      
      // Apex predators are territorial
      this.setRule(3, 3, {
        attractionStrength: 0,
        repulsionStrength: 3.0,
        activationDistance: 150,
        minDistance: 20,
        forceFalloff: 'inverse_square'
      });
    }
    
    /**
     * Create a crystal formation preset
     * @private
     */
    createCrystalPreset() {
      // Type 0: Core particles
      // Type 1: Branch particles
      // Type 2: Outer shell particles
      
      // Core particles form the center
      this.setRule(0, 0, {
        attractionStrength: 2.0,
        repulsionStrength: 4.0,
        activationDistance: 50,
        minDistance: 10,
        forceFalloff: 'sigmoid'
      });
      
      // Branch particles are attracted to core
      this.setRule(1, 0, {
        attractionStrength: 2.5,
        repulsionStrength: 0.5,
        activationDistance: 100,
        minDistance: 5,
        forceFalloff: 'inverse_square',
        asymmetry: 0.5  // Partially asymmetric
      });
      
      // Core particles attract branches but weakly
      this.setRule(0, 1, {
        attractionStrength: 1.0,
        repulsionStrength: 0.2,
        activationDistance: 80,
        minDistance: 5,
        forceFalloff: 'inverse_square'
      });
      
      // Branch particles form linear structures
      this.setRule(1, 1, {
        attractionStrength: 1.0,
        repulsionStrength: 2.0,
        activationDistance: 40,
        minDistance: 5,
        forceFalloff: 'sigmoid'
      });
      
      // Outer shell particles attracted to branches
      this.setRule(2, 1, {
        attractionStrength: 2.0,
        repulsionStrength: 0.3,
        activationDistance: 60,
        minDistance: 5,
        forceFalloff: 'inverse_square',
        asymmetry: 0.2  // Mostly one-way
      });
      
      // Branch particles weakly attract shells
      this.setRule(1, 2, {
        attractionStrength: 0.4,
        repulsionStrength: 0.1,
        activationDistance: 50,
        minDistance: 5,
        forceFalloff: 'inverse_square'
      });
      
      // Shell particles arrange in a grid
      this.setRule(2, 2, {
        attractionStrength: 0.5,
        repulsionStrength: 1.0,
        activationDistance: 30,
        minDistance: 5,
        forceFalloff: 'sigmoid'
      });
    }
    
    /**
     * Create a custom preset
     * @param {Array} ruleData - Array of rule objects 
     * @return {boolean} Success
     */
    createCustomPreset(ruleData) {
      if (!Array.isArray(ruleData)) {
        console.error('Rule data must be an array');
        return false;
      }
      
      // Reset current rules
      this.reset(this.typeCount);
      
      // Apply each rule in the data
      for (const rule of ruleData) {
        if (rule.typeA === undefined || rule.typeB === undefined) {
          console.error('Rule missing type indices', rule);
          continue;
        }
        
        this.setRule(rule.typeA, rule.typeB, rule);
      }
      
      return true;
    }
    
    /**
     * Clone the entire rule matrix
     * @return {RuleMatrix} Cloned rule matrix
     */
    clone() {
      const clone = new RuleMatrix(this.typeCount);
      
      // Deep copy all rules
      for (let i = 0; i < this.typeCount; i++) {
        for (let j = 0; j < this.typeCount; j++) {
          clone.rules[i][j] = {...this.rules[i][j]};
          clone.hasInteractions[i][j] = this.hasInteractions[i][j];
        }
      }
      
      // Copy max distance cache
      clone.maxDistanceCache = [...this.maxDistanceCache];
      clone.cacheValid = this.cacheValid;
      
      return clone;
    }
    
    /**
     * Serialize rules for transfer to worker or storage
     * @return {Object} Serialized rules
     */
    serialize() {
      return {
        typeCount: this.typeCount,
        rules: this.rules,
        hasInteractions: this.hasInteractions,
        maxDistanceCache: this.maxDistanceCache,
        cacheValid: this.cacheValid
      };
    }
    
    /**
     * Deserialize rules from data
     * @param {Object} data - Serialized rule data
     */
    deserialize(data) {
      this.typeCount = data.typeCount;
      this.rules = data.rules;
      this.hasInteractions = data.hasInteractions;
      this.maxDistanceCache = data.maxDistanceCache;
      this.cacheValid = data.cacheValid;
    }
  }
  
  export default RuleMatrix;