/**
 * Colors.js - Color utilities and palettes for particle visualization
 * 
 * Features:
 * - Color palettes for particle types
 * - Dynamic color calculation based on properties
 * - Color conversion utilities
 * - Interpolation and blending
 */

class ColorManager {
    /**
     * Create a new color manager
     * @param {number} typeCount - Number of particle types
     * @param {Object} options - Configuration options
     */
    constructor(typeCount, options = {}) {
      this.typeCount = typeCount;
      
      // Default options
      this.options = Object.assign({
        defaultAlpha: 0.8,
        useGradientForVelocity: true,
        velocityColorScale: 0.1,
        highlightTypes: false,
        highlightedTypeId: -1,
        fadeInactiveTypes: true,
        inactiveAlpha: 0.3,
        colorMode: 'type', // 'type', 'property', 'velocity', 'custom'
        propertyIndex: 0,  // Which property to use for coloring (0-3)
        propertyColorMin: [0, 0, 255],  // Color for min property value
        propertyColorMax: [255, 0, 0],  // Color for max property value
      }, options);
      
      // Generate type colors if not provided
      if (!options.typeColors || !Array.isArray(options.typeColors)) {
        this.typeColors = this._generateTypeColors(typeCount);
      } else {
        this.typeColors = options.typeColors.slice(0);
        
        // Ensure enough colors for all types
        if (this.typeColors.length < typeCount) {
          const additionalColors = this._generateTypeColors(
            typeCount - this.typeColors.length, 
            this.typeColors.length
          );
          this.typeColors = this.typeColors.concat(additionalColors);
        }
      }
      
      // Prepare velocity gradient
      this.velocityGradient = [
        { stop: 0.0, color: [0, 50, 200] },    // Slow (blue)
        { stop: 0.5, color: [0, 200, 0] },     // Medium (green)
        { stop: 1.0, color: [200, 50, 0] }     // Fast (red)
      ];
      
      // Prepare size scale for different types
      this.typeSizeMultipliers = Array(typeCount).fill(1.0);
    }
    
    /**
     * Set color options
     * @param {Object} options - New options
     */
    setOptions(options) {
      this.options = Object.assign(this.options, options);
    }
    
    /**
     * Set specific color for a particle type
     * @param {number} typeId - Type ID
     * @param {Array|string} color - RGB array [r,g,b] or CSS color string
     */
    setTypeColor(typeId, color) {
      if (typeId < 0 || typeId >= this.typeCount) return;
      
      if (Array.isArray(color)) {
        this.typeColors[typeId] = color.slice(0, 3);
      } else if (typeof color === 'string') {
        this.typeColors[typeId] = this.parseColorString(color);
      }
    }
    
    /**
     * Set size multiplier for a particle type
     * @param {number} typeId - Type ID
     * @param {number} multiplier - Size multiplier (1.0 = normal)
     */
    setTypeSizeMultiplier(typeId, multiplier) {
      if (typeId < 0 || typeId >= this.typeCount) return;
      this.typeSizeMultipliers[typeId] = Math.max(0.1, multiplier);
    }
    
    /**
     * Get color for a particle based on current settings
     * @param {Object} particle - Particle data
     * @param {Object} parameters - Additional parameters like velocity
     * @return {string} RGBA color string
     */
    getParticleColor(particle, parameters = {}) {
      let color;
      let alpha = this.options.defaultAlpha;
      
      // Check if type is inactive based on highlight settings
      if (this.options.highlightTypes && 
          this.options.highlightedTypeId >= 0 && 
          particle.type !== this.options.highlightedTypeId) {
        if (this.options.fadeInactiveTypes) {
          alpha = this.options.inactiveAlpha;
        }
      }
      
      // Determine base color based on color mode
      switch (this.options.colorMode) {
        case 'property':
          // Use particle property for color
          const propIdx = this.options.propertyIndex;
          let propValue = 0;
          
          if (particle.properties && propIdx < particle.properties.length) {
            propValue = particle.properties[propIdx];
          }
          
          // Normalize property value (assuming range 0-1, can be adjusted)
          const normalizedValue = Math.max(0, Math.min(1, propValue));
          
          // Interpolate between min and max colors
          color = this.interpolateColor(
            this.options.propertyColorMin,
            this.options.propertyColorMax,
            normalizedValue
          );
          break;
          
        case 'velocity':
          // Use particle velocity for color
          const velocity = parameters.velocity || 0;
          // Get color from velocity gradient
          color = this.getGradientColor(this.velocityGradient, velocity * this.options.velocityColorScale);
          break;
          
        case 'custom':
          // Use custom function if provided
          if (parameters.colorFn && typeof parameters.colorFn === 'function') {
            const customColor = parameters.colorFn(particle, parameters);
            if (customColor) {
              return customColor; // Assume function returns complete color string
            }
          }
          // Fall back to type color
          color = this.typeColors[particle.type] || this.typeColors[0];
          break;
          
        case 'type':
        default:
          // Use pre-defined color based on type
          color = this.typeColors[particle.type] || this.typeColors[0];
          break;
      }
      
      // Modify color based on velocity if enabled
      if (this.options.useGradientForVelocity && parameters.velocity !== undefined && 
          this.options.colorMode !== 'velocity') {
        const velocityFactor = Math.min(1, parameters.velocity * this.options.velocityColorScale);
        const velocityColor = this.getGradientColor(this.velocityGradient, velocityFactor);
        
        // Blend with base color (30% velocity influence)
        color = this.blendColors(color, velocityColor, 0.3);
      }
      
      // Convert to RGBA string
      return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    }
    
    /**
     * Get adjusted size for a particle
     * @param {Object} particle - Particle data
     * @param {number} baseSize - Base size before adjustments
     * @return {number} Adjusted size
     */
    getParticleSize(particle, baseSize) {
      let sizeMultiplier = 1.0;
      
      // Apply type-specific multiplier
      if (particle.type >= 0 && particle.type < this.typeSizeMultipliers.length) {
        sizeMultiplier = this.typeSizeMultipliers[particle.type];
      }
      
      return baseSize * sizeMultiplier;
    }
    
    /**
     * Generate a palette of visually distinct colors
     * @param {number} count - Number of colors needed
     * @param {number} offset - Hue offset to avoid similar colors
     * @return {Array} Array of RGB color arrays
     * @private
     */
    _generateTypeColors(count, offset = 0) {
      const colors = [];
      const goldenRatioConjugate = 0.618033988749895;
      
      for (let i = 0; i < count; i++) {
        // Use golden ratio to get well-distributed hues
        const hue = (offset + i * goldenRatioConjugate) % 1;
        
        // Convert HSV to RGB with high saturation and value
        const rgb = this.hsvToRgb(hue, 0.85, 0.9);
        colors.push(rgb);
      }
      
      return colors;
    }
    
    /**
     * Convert HSV color to RGB
     * @param {number} h - Hue (0-1)
     * @param {number} s - Saturation (0-1)
     * @param {number} v - Value (0-1)
     * @return {Array} RGB array [r,g,b] (0-255)
     */
    hsvToRgb(h, s, v) {
      let r, g, b;
      
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);
      
      switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
      }
      
      return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
      ];
    }
    
    /**
     * Convert RGB color to HSV
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @return {Array} HSV array [h,s,v] (0-1)
     */
    rgbToHsv(r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      
      let h;
      const s = max === 0 ? 0 : d / max;
      const v = max;
      
      if (max === min) {
        h = 0; // achromatic
      } else {
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      
      return [h, s, v];
    }
    
    /**
     * Parse CSS color string to RGB array
     * @param {string} color - CSS color string (hex, rgb, rgba)
     * @return {Array} RGB array [r,g,b] (0-255)
     */
    parseColorString(color) {
      // Create a temporary element to use browser's color parsing
      const tmp = document.createElement('div');
      tmp.style.color = color;
      document.body.appendChild(tmp);
      
      const computedColor = getComputedStyle(tmp).color;
      document.body.removeChild(tmp);
      
      // Parse computed color (format: rgb(r, g, b) or rgba(r, g, b, a))
      const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      
      if (match) {
        return [
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3], 10)
        ];
      }
      
      // Default to black if parsing fails
      return [0, 0, 0];
    }
    
    /**
     * Interpolate between two colors
     * @param {Array} color1 - First color [r,g,b]
     * @param {Array} color2 - Second color [r,g,b]
     * @param {number} ratio - Interpolation ratio (0-1)
     * @return {Array} Interpolated color [r,g,b]
     */
    interpolateColor(color1, color2, ratio) {
      return [
        Math.round(color1[0] + (color2[0] - color1[0]) * ratio),
        Math.round(color1[1] + (color2[1] - color1[1]) * ratio),
        Math.round(color1[2] + (color2[2] - color1[2]) * ratio)
      ];
    }
    
    /**
     * Get color from gradient based on position
     * @param {Array} gradient - Array of {stop, color} objects
     * @param {number} position - Position in gradient (0-1)
     * @return {Array} Interpolated color [r,g,b]
     */
    getGradientColor(gradient, position) {
      // Clamp position to 0-1
      const pos = Math.max(0, Math.min(1, position));
      
      // Find the two stops that contain this position
      let lower = gradient[0];
      let upper = gradient[gradient.length - 1];
      
      for (let i = 0; i < gradient.length - 1; i++) {
        if (gradient[i].stop <= pos && gradient[i + 1].stop >= pos) {
          lower = gradient[i];
          upper = gradient[i + 1];
          break;
        }
      }
      
      // If at exact stop, return that color
      if (lower.stop === pos) return lower.color;
      if (upper.stop === pos) return upper.color;
      
      // Interpolate between stops
      const range = upper.stop - lower.stop;
      const adjustedPos = range > 0 ? (pos - lower.stop) / range : 0;
      
      return this.interpolateColor(lower.color, upper.color, adjustedPos);
    }
    
    /**
     * Blend two colors together
     * @param {Array} color1 - First color [r,g,b]
     * @param {Array} color2 - Second color [r,g,b]
     * @param {number} ratio - Blend ratio (0 = all color1, 1 = all color2)
     * @return {Array} Blended color [r,g,b]
     */
    blendColors(color1, color2, ratio) {
      return this.interpolateColor(color1, color2, ratio);
    }
    
    /**
     * Darken or lighten a color
     * @param {Array} color - Color to adjust [r,g,b]
     * @param {number} factor - Adjustment factor (-1 to 1, negative darkens)
     * @return {Array} Adjusted color [r,g,b]
     */
    adjustBrightness(color, factor) {
      // Convert to HSV
      const hsv = this.rgbToHsv(color[0], color[1], color[2]);
      
      // Adjust value (brightness)
      if (factor > 0) {
        // Lighten
        hsv[2] = Math.min(1, hsv[2] + factor * (1 - hsv[2]));
      } else {
        // Darken
        hsv[2] = Math.max(0, hsv[2] + factor * hsv[2]);
      }
      
      // Convert back to RGB
      return this.hsvToRgb(hsv[0], hsv[1], hsv[2]);
    }
    
    /**
     * Create a palette of related colors
     * @param {Array} baseColor - Base color [r,g,b]
     * @param {number} count - Number of colors in palette
     * @param {string} scheme - Color scheme ('analogous', 'complementary', 'triadic', etc.)
     * @return {Array} Array of RGB color arrays
     */
    createPalette(baseColor, count, scheme = 'analogous') {
      // Convert to HSV for easier manipulation
      const hsv = this.rgbToHsv(baseColor[0], baseColor[1], baseColor[2]);
      const h = hsv[0];
      const s = hsv[1];
      const v = hsv[2];
      
      const palette = [];
      
      switch (scheme) {
        case 'monochromatic':
          // Vary saturation and value
          for (let i = 0; i < count; i++) {
            const newS = 0.3 + (s * 0.7 * i / (count - 1));
            const newV = 0.7 + (v * 0.3 * i / (count - 1));
            palette.push(this.hsvToRgb(h, newS, newV));
          }
          break;
          
        case 'analogous':
          // Analogous colors - adjacent on the color wheel
          const hueRange = 0.083; // About 30° on the color wheel
          for (let i = 0; i < count; i++) {
            const newH = (h + hueRange * (i / (count - 1) - 0.5) + 1) % 1;
            palette.push(this.hsvToRgb(newH, s, v));
          }
          break;
          
        case 'complementary':
          // Complementary colors - opposite on the color wheel
          for (let i = 0; i < count; i++) {
            const ratio = i / (count - 1);
            const newH = (h + ratio * 0.5) % 1;
            palette.push(this.hsvToRgb(newH, s, v));
          }
          break;
          
        case 'triadic':
          // Triadic colors - three equally spaced on the color wheel
          for (let i = 0; i < count; i++) {
            const section = Math.floor(i * 3 / count);
            const ratio = (i % (count / 3)) / (count / 3 - 1);
            const hueShift = section / 3;
            const newH = (h + hueShift + ratio * 0.05) % 1;
            palette.push(this.hsvToRgb(newH, s, v));
          }
          break;
          
        default:
          // Default to rainbow spectrum
          for (let i = 0; i < count; i++) {
            const newH = i / count;
            palette.push(this.hsvToRgb(newH, s, v));
          }
      }
      
      return palette;
    }
    
    /**
     * Generate a new color scheme for particle types
     * @param {string} scheme - Color scheme name
     */
    generateScheme(scheme) {
      switch (scheme) {
        case 'rainbow':
          this.typeColors = this._generateTypeColors(this.typeCount);
          break;
          
        case 'pastel':
          this.typeColors = [];
          for (let i = 0; i < this.typeCount; i++) {
            const hue = i / this.typeCount;
            this.typeColors.push(this.hsvToRgb(hue, 0.5, 1.0));
          }
          break;
          
        case 'vivid':
          this.typeColors = [];
          for (let i = 0; i < this.typeCount; i++) {
            const hue = i / this.typeCount;
            this.typeColors.push(this.hsvToRgb(hue, 1.0, 0.9));
          }
          break;
          
        case 'ocean':
          const oceanBase = this.parseColorString('#0077be');
          this.typeColors = this.createPalette(oceanBase, this.typeCount, 'analogous');
          break;
          
        case 'forest':
          const forestBase = this.parseColorString('#228B22');
          this.typeColors = this.createPalette(forestBase, this.typeCount, 'analogous');
          break;
          
        case 'fire':
          const fireBase = this.parseColorString('#ff4500');
          this.typeColors = this.createPalette(fireBase, this.typeCount, 'analogous');
          break;
          
        case 'grayscale':
          this.typeColors = [];
          for (let i = 0; i < this.typeCount; i++) {
            const value = 40 + Math.round((255 - 40) * i / (this.typeCount - 1));
            this.typeColors.push([value, value, value]);
          }
          break;
          
        case 'random':
        default:
          this.typeColors = [];
          for (let i = 0; i < this.typeCount; i++) {
            this.typeColors.push([
              Math.floor(Math.random() * 255),
              Math.floor(Math.random() * 255),
              Math.floor(Math.random() * 255)
            ]);
          }
      }
    }
  }
  
  export default ColorManager;