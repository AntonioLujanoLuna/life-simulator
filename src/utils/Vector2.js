/**
 * Vector2.js - 2D vector operations
 * 
 * Features:
 * - Optimized 2D vector operations
 * - Static methods for memory efficiency
 * - Common vector math operations
 * - Fluent API for method chaining
 */

class Vector2 {
    /**
     * Create a new Vector2
     * @param {number} x - X component
     * @param {number} y - Y component
     */
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
    
    /**
     * Set vector components
     * @param {number} x - X component
     * @param {number} y - Y component
     * @return {Vector2} Self for chaining
     */
    set(x, y) {
      this.x = x;
      this.y = y;
      return this;
    }
    
    /**
     * Copy values from another vector
     * @param {Vector2} v - Vector to copy from
     * @return {Vector2} Self for chaining
     */
    copy(v) {
      this.x = v.x;
      this.y = v.y;
      return this;
    }
    
    /**
     * Clone this vector to a new instance
     * @return {Vector2} New vector with same values
     */
    clone() {
      return new Vector2(this.x, this.y);
    }
    
    /**
     * Add another vector
     * @param {Vector2} v - Vector to add
     * @return {Vector2} Self for chaining
     */
    add(v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    }
    
    /**
     * Add scalar values
     * @param {number} x - X value to add
     * @param {number} y - Y value to add
     * @return {Vector2} Self for chaining
     */
    addScalar(x, y = x) {
      this.x += x;
      this.y += y;
      return this;
    }
    
    /**
     * Subtract another vector
     * @param {Vector2} v - Vector to subtract
     * @return {Vector2} Self for chaining
     */
    subtract(v) {
      this.x -= v.x;
      this.y -= v.y;
      return this;
    }
    
    /**
     * Subtract scalar values
     * @param {number} x - X value to subtract
     * @param {number} y - Y value to subtract
     * @return {Vector2} Self for chaining
     */
    subtractScalar(x, y = x) {
      this.x -= x;
      this.y -= y;
      return this;
    }
    
    /**
     * Multiply by another vector (component-wise)
     * @param {Vector2} v - Vector to multiply by
     * @return {Vector2} Self for chaining
     */
    multiply(v) {
      this.x *= v.x;
      this.y *= v.y;
      return this;
    }
    
    /**
     * Multiply by scalar value(s)
     * @param {number} scalar - Scalar to multiply by
     * @param {number} [scalarY] - Optional separate Y scalar
     * @return {Vector2} Self for chaining
     */
    multiplyScalar(scalar, scalarY) {
      this.x *= scalar;
      this.y *= (scalarY !== undefined) ? scalarY : scalar;
      return this;
    }
    
    /**
     * Divide by another vector (component-wise)
     * @param {Vector2} v - Vector to divide by
     * @return {Vector2} Self for chaining
     */
    divide(v) {
      if (v.x === 0 || v.y === 0) {
        console.warn('Vector2: Division by zero');
        return this;
      }
      this.x /= v.x;
      this.y /= v.y;
      return this;
    }
    
    /**
     * Divide by scalar value(s)
     * @param {number} scalar - Scalar to divide by
     * @param {number} [scalarY] - Optional separate Y scalar
     * @return {Vector2} Self for chaining
     */
    divideScalar(scalar, scalarY) {
      if (scalar === 0 || (scalarY !== undefined && scalarY === 0)) {
        console.warn('Vector2: Division by zero');
        return this;
      }
      
      this.x /= scalar;
      this.y /= (scalarY !== undefined) ? scalarY : scalar;
      return this;
    }
    
    /**
     * Calculate dot product with another vector
     * @param {Vector2} v - Vector to calculate dot product with
     * @return {number} Dot product
     */
    dot(v) {
      return this.x * v.x + this.y * v.y;
    }
    
    /**
     * Calculate cross product with another vector
     * In 2D, this returns a scalar representing the z component
     * @param {Vector2} v - Vector to calculate cross product with
     * @return {number} Cross product (scalar)
     */
    cross(v) {
      return this.x * v.y - this.y * v.x;
    }
    
    /**
     * Calculate squared length of vector
     * @return {number} Squared length
     */
    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
    
    /**
     * Calculate length of vector
     * @return {number} Length
     */
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    /**
     * Normalize vector to unit length
     * @return {Vector2} Self for chaining
     */
    normalize() {
      const length = this.length();
      
      if (length > 0) {
        this.x /= length;
        this.y /= length;
      }
      
      return this;
    }
    
    /**
     * Limit vector magnitude to maximum value
     * @param {number} max - Maximum magnitude
     * @return {Vector2} Self for chaining
     */
    limit(max) {
      const lengthSq = this.lengthSq();
      
      if (lengthSq > max * max) {
        this.multiplyScalar(max / Math.sqrt(lengthSq));
      }
      
      return this;
    }
    
    /**
     * Set vector to minimum components between this and another vector
     * @param {Vector2} v - Vector to compare with
     * @return {Vector2} Self for chaining
     */
    min(v) {
      this.x = Math.min(this.x, v.x);
      this.y = Math.min(this.y, v.y);
      return this;
    }
    
    /**
     * Set vector to maximum components between this and another vector
     * @param {Vector2} v - Vector to compare with
     * @return {Vector2} Self for chaining
     */
    max(v) {
      this.x = Math.max(this.x, v.x);
      this.y = Math.max(this.y, v.y);
      return this;
    }
    
    /**
     * Clamp vector components between min and max values
     * @param {number} minX - Minimum X value
     * @param {number} minY - Minimum Y value
     * @param {number} maxX - Maximum X value
     * @param {number} maxY - Maximum Y value
     * @return {Vector2} Self for chaining
     */
    clamp(minX, minY, maxX, maxY) {
      this.x = Math.min(Math.max(this.x, minX), maxX);
      this.y = Math.min(Math.max(this.y, minY), maxY);
      return this;
    }
    
    /**
     * Calculate the distance to another vector
     * @param {Vector2} v - Vector to calculate distance to
     * @return {number} Distance
     */
    distanceTo(v) {
      const dx = this.x - v.x;
      const dy = this.y - v.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Calculate squared distance to another vector
     * @param {Vector2} v - Vector to calculate squared distance to
     * @return {number} Squared distance
     */
    distanceToSq(v) {
      const dx = this.x - v.x;
      const dy = this.y - v.y;
      return dx * dx + dy * dy;
    }
    
    /**
     * Linearly interpolate towards target vector
     * @param {Vector2} v - Target vector
     * @param {number} t - Interpolation factor between 0 and 1
     * @return {Vector2} Self for chaining
     */
    lerp(v, t) {
      this.x += (v.x - this.x) * t;
      this.y += (v.y - this.y) * t;
      return this;
    }
    
    /**
     * Apply a transformation matrix to this vector
     * @param {Array} matrix - 2x2 transformation matrix as flat array [a, b, c, d]
     * @return {Vector2} Self for chaining
     */
    applyMatrix(matrix) {
      const x = this.x;
      const y = this.y;
      
      this.x = matrix[0] * x + matrix[1] * y;
      this.y = matrix[2] * x + matrix[3] * y;
      
      return this;
    }
    
    /**
     * Rotate vector by angle
     * @param {number} angle - Angle in radians
     * @return {Vector2} Self for chaining
     */
    rotate(angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      const x = this.x;
      const y = this.y;
      
      this.x = x * cos - y * sin;
      this.y = x * sin + y * cos;
      
      return this;
    }
    
    /**
     * Get angle of this vector in radians
     * @return {number} Angle in radians
     */
    angle() {
      return Math.atan2(this.y, this.x);
    }
    
    /**
     * Get angle between this vector and another
     * @param {Vector2} v - Vector to get angle to
     * @return {number} Angle in radians
     */
    angleTo(v) {
      return Math.atan2(
        this.x * v.y - this.y * v.x,
        this.x * v.x + this.y * v.y
      );
    }
    
    /**
     * Negate vector components
     * @return {Vector2} Self for chaining
     */
    negate() {
      this.x = -this.x;
      this.y = -this.y;
      return this;
    }
    
    /**
     * Invert vector components (1/x, 1/y)
     * @return {Vector2} Self for chaining
     */
    invert() {
      if (this.x !== 0) this.x = 1 / this.x;
      if (this.y !== 0) this.y = 1 / this.y;
      return this;
    }
    
    /**
     * Reflect vector across normal
     * @param {Vector2} normal - Normal to reflect across (should be normalized)
     * @return {Vector2} Self for chaining
     */
    reflect(normal) {
      const dot2 = this.dot(normal) * 2;
      
      this.x -= normal.x * dot2;
      this.y -= normal.y * dot2;
      
      return this;
    }
    
    /**
     * Get perpendicular vector (rotated 90 degrees counter-clockwise)
     * @return {Vector2} Self for chaining
     */
    perp() {
      const x = this.x;
      this.x = -this.y;
      this.y = x;
      return this;
    }
    
    /**
     * Check if this vector equals another
     * @param {Vector2} v - Vector to compare with
     * @param {number} [epsilon=1e-10] - Comparison threshold
     * @return {boolean} True if vectors are equal
     */
    equals(v, epsilon = 1e-10) {
      return (
        Math.abs(this.x - v.x) <= epsilon &&
        Math.abs(this.y - v.y) <= epsilon
      );
    }
    
    /**
     * Round vector components to nearest integer
     * @return {Vector2} Self for chaining
     */
    round() {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      return this;
    }
    
    /**
     * Floor vector components
     * @return {Vector2} Self for chaining
     */
    floor() {
      this.x = Math.floor(this.x);
      this.y = Math.floor(this.y);
      return this;
    }
    
    /**
     * Ceil vector components
     * @return {Vector2} Self for chaining
     */
    ceil() {
      this.x = Math.ceil(this.x);
      this.y = Math.ceil(this.y);
      return this;
    }
    
    /**
     * Convert to array
     * @return {Array} Array [x, y]
     */
    toArray() {
      return [this.x, this.y];
    }
    
    /**
     * Convert to object
     * @return {Object} Object {x, y}
     */
    toObject() {
      return { x: this.x, y: this.y };
    }
    
    /**
     * Convert to string
     * @return {string} String representation
     */
    toString() {
      return `(${this.x}, ${this.y})`;
    }
    
    /**
     * Check if either component is NaN
     * @return {boolean} True if either component is NaN
     */
    isNaN() {
      return isNaN(this.x) || isNaN(this.y);
    }
    
    /**
     * Check if either component is infinite
     * @return {boolean} True if either component is infinite
     */
    isInfinite() {
      return !isFinite(this.x) || !isFinite(this.y);
    }
    
    /**
     * Check if vector has zero length
     * @param {number} [epsilon=1e-10] - Comparison threshold
     * @return {boolean} True if length is zero
     */
    isZero(epsilon = 1e-10) {
      return this.lengthSq() < epsilon * epsilon;
    }
    
    // Static methods for operations without modifying vectors
    
    /**
     * Create a new vector from angle and length
     * @param {number} angle - Angle in radians
     * @param {number} length - Vector length
     * @return {Vector2} New vector
     */
    static fromAngle(angle, length = 1) {
      return new Vector2(
        Math.cos(angle) * length,
        Math.sin(angle) * length
      );
    }
    
    /**
     * Create a vector from polar coordinates
     * @param {number} radius - Radius
     * @param {number} theta - Angle in radians
     * @return {Vector2} New vector
     */
    static fromPolar(radius, theta) {
      return new Vector2(
        radius * Math.cos(theta),
        radius * Math.sin(theta)
      );
    }
    
    /**
     * Add two vectors
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Sum vector (new or target)
     */
    static add(a, b, target) {
      if (target) {
        target.x = a.x + b.x;
        target.y = a.y + b.y;
        return target;
      }
      return new Vector2(a.x + b.x, a.y + b.y);
    }
    
    /**
     * Subtract vector b from vector a
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Difference vector (new or target)
     */
    static subtract(a, b, target) {
      if (target) {
        target.x = a.x - b.x;
        target.y = a.y - b.y;
        return target;
      }
      return new Vector2(a.x - b.x, a.y - b.y);
    }
    
    /**
     * Multiply two vectors component-wise
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Product vector (new or target)
     */
    static multiply(a, b, target) {
      if (target) {
        target.x = a.x * b.x;
        target.y = a.y * b.y;
        return target;
      }
      return new Vector2(a.x * b.x, a.y * b.y);
    }
    
    /**
     * Multiply vector by scalar
     * @param {Vector2} v - Vector
     * @param {number} scalar - Scalar value
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Scaled vector (new or target)
     */
    static multiplyScalar(v, scalar, target) {
      if (target) {
        target.x = v.x * scalar;
        target.y = v.y * scalar;
        return target;
      }
      return new Vector2(v.x * scalar, v.y * scalar);
    }
    
    /**
     * Divide vector by scalar
     * @param {Vector2} v - Vector
     * @param {number} scalar - Scalar value
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Scaled vector (new or target)
     */
    static divideScalar(v, scalar, target) {
      if (scalar === 0) {
        console.warn('Vector2: Division by zero');
        return target ? target.set(0, 0) : new Vector2();
      }
      
      const invScalar = 1 / scalar;
      
      if (target) {
        target.x = v.x * invScalar;
        target.y = v.y * invScalar;
        return target;
      }
      
      return new Vector2(v.x * invScalar, v.y * invScalar);
    }
    
    /**
     * Dot product of two vectors
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @return {number} Dot product
     */
    static dot(a, b) {
      return a.x * b.x + a.y * b.y;
    }
    
    /**
     * Cross product of two vectors (returns scalar)
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @return {number} Cross product
     */
    static cross(a, b) {
      return a.x * b.y - a.y * b.x;
    }
    
    /**
     * Distance between two vectors
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @return {number} Distance
     */
    static distance(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Squared distance between two vectors
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @return {number} Squared distance
     */
    static distanceSq(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return dx * dx + dy * dy;
    }
    
    /**
     * Linear interpolation between two vectors
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @param {number} t - Interpolation factor (0-1)
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Interpolated vector (new or target)
     */
    static lerp(a, b, t, target) {
      if (target) {
        target.x = a.x + (b.x - a.x) * t;
        target.y = a.y + (b.y - a.y) * t;
        return target;
      }
      return new Vector2(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t
      );
    }
    
    /**
     * Get minimum components from two vectors
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Minimum components vector (new or target)
     */
    static min(a, b, target) {
      if (target) {
        target.x = Math.min(a.x, b.x);
        target.y = Math.min(a.y, b.y);
        return target;
      }
      return new Vector2(
        Math.min(a.x, b.x),
        Math.min(a.y, b.y)
      );
    }
    
    /**
     * Get maximum components from two vectors
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Maximum components vector (new or target)
     */
    static max(a, b, target) {
      if (target) {
        target.x = Math.max(a.x, b.x);
        target.y = Math.max(a.y, b.y);
        return target;
      }
      return new Vector2(
        Math.max(a.x, b.x),
        Math.max(a.y, b.y)
      );
    }
    
    /**
     * Normalize a vector
     * @param {Vector2} v - Vector to normalize
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Normalized vector (new or target)
     */
    static normalize(v, target) {
      const length = Math.sqrt(v.x * v.x + v.y * v.y);
      
      if (length === 0) {
        return target ? target.set(0, 0) : new Vector2();
      }
      
      const invLength = 1 / length;
      
      if (target) {
        target.x = v.x * invLength;
        target.y = v.y * invLength;
        return target;
      }
      
      return new Vector2(
        v.x * invLength,
        v.y * invLength
      );
    }
    
    /**
     * Angle between two vectors
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @return {number} Angle in radians
     */
    static angle(a, b) {
      // cos⁻¹(a·b / (|a|·|b|))
      const lenA = a.length();
      const lenB = b.length();
      
      if (lenA === 0 || lenB === 0) {
        return 0;
      }
      
      const dot = a.x * b.x + a.y * b.y;
      return Math.acos(Math.min(Math.max(dot / (lenA * lenB), -1), 1));
    }
    
    /**
     * Rotate a vector by angle
     * @param {Vector2} v - Vector to rotate
     * @param {number} angle - Angle in radians
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Rotated vector (new or target)
     */
    static rotate(v, angle, target) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      if (target) {
        target.x = v.x * cos - v.y * sin;
        target.y = v.x * sin + v.y * cos;
        return target;
      }
      
      return new Vector2(
        v.x * cos - v.y * sin,
        v.x * sin + v.y * cos
      );
    }
    
    /**
     * Check if two vectors are equals
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @param {number} [epsilon=1e-10] - Comparison threshold
     * @return {boolean} True if vectors are equal
     */
    static equals(a, b, epsilon = 1e-10) {
      return (
        Math.abs(a.x - b.x) <= epsilon &&
        Math.abs(a.y - b.y) <= epsilon
      );
    }
    
    /**
     * Project vector a onto vector b
     * @param {Vector2} a - Vector to project
     * @param {Vector2} b - Vector to project onto
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Projected vector (new or target)
     */
    static project(a, b, target) {
      const bLengthSq = b.x * b.x + b.y * b.y;
      
      if (bLengthSq === 0) {
        return target ? target.set(0, 0) : new Vector2();
      }
      
      const scalar = (a.x * b.x + a.y * b.y) / bLengthSq;
      
      if (target) {
        target.x = b.x * scalar;
        target.y = b.y * scalar;
        return target;
      }
      
      return new Vector2(b.x * scalar, b.y * scalar);
    }
    
    /**
     * Create vector from array
     * @param {Array} array - Array [x, y]
     * @return {Vector2} New vector
     */
    static fromArray(array) {
      return new Vector2(array[0], array[1]);
    }
    
    /**
     * Create vector from object
     * @param {Object} obj - Object {x, y}
     * @return {Vector2} New vector
     */
    static fromObject(obj) {
      return new Vector2(obj.x, obj.y);
    }
    
    /**
     * Generate a random unit vector
     * @return {Vector2} Random unit vector
     */
    static random() {
      const angle = Math.random() * Math.PI * 2;
      return new Vector2(Math.cos(angle), Math.sin(angle));
    }
    
    /**
     * Calculate the midpoint between two vectors
     * @param {Vector2} a - First vector
     * @param {Vector2} b - Second vector
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Midpoint vector (new or target)
     */
    static midpoint(a, b, target) {
      if (target) {
        target.x = (a.x + b.x) * 0.5;
        target.y = (a.y + b.y) * 0.5;
        return target;
      }
      return new Vector2((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
    }
    
    /**
     * Get the normal vector to a line segment
     * @param {Vector2} a - Line segment start
     * @param {Vector2} b - Line segment end
     * @param {Vector2} [target] - Target vector to store result
     * @return {Vector2} Normal vector (new or target)
     */
    static normal(a, b, target) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (len === 0) {
        return target ? target.set(0, 0) : new Vector2();
      }
      
      const nx = -dy / len;
      const ny = dx / len;
      
      if (target) {
        target.x = nx;
        target.y = ny;
        return target;
      }
      
      return new Vector2(nx, ny);
    }
    
    /**
     * Zero vector constant
     * @type {Vector2}
     */
    static ZERO = Object.freeze(new Vector2(0, 0));
    
    /**
     * Unit X vector constant
     * @type {Vector2}
     */
    static UNIT_X = Object.freeze(new Vector2(1, 0));
    
    /**
     * Unit Y vector constant
     * @type {Vector2}
     */
    static UNIT_Y = Object.freeze(new Vector2(0, 1));
    
    /**
     * Up vector constant (negative Y)
     * @type {Vector2}
     */
    static UP = Object.freeze(new Vector2(0, -1));
    
    /**
     * Down vector constant (positive Y)
     * @type {Vector2}
     */
    static DOWN = Object.freeze(new Vector2(0, 1));
    
    /**
     * Left vector constant (negative X)
     * @type {Vector2}
     */
    static LEFT = Object.freeze(new Vector2(-1, 0));
    
    /**
     * Right vector constant (positive X)
     * @type {Vector2}
     */
    static RIGHT = Object.freeze(new Vector2(1, 0));
  }
  
  export default Vector2;