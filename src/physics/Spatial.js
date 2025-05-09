/**
 * Spatial.js - Spatial partitioning for efficient proximity queries
 * 
 * Features:
 * - Quadtree implementation for 2D spatial partitioning
 * - Optimized range queries for finding nearby particles
 * - Dynamic rebalancing
 * - Visualization support for debugging
 */

class Quadtree {
    /**
     * Create a new quadtree for spatial partitioning
     * @param {Object} bounds - Boundary rectangle {x, y, width, height}
     * @param {number} capacity - Max number of points per node before splitting
     * @param {number} maxDepth - Maximum depth of the tree
     * @param {number} depth - Current depth (used internally for recursion)
     */
    constructor(bounds, capacity = 8, maxDepth = 8, depth = 0) {
      this.bounds = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      };
      this.capacity = capacity;
      this.maxDepth = maxDepth;
      this.depth = depth;
      this.points = [];
      this.divided = false;
      this.children = null;
      
      // Performance tracking
      this.lastRebuildTime = 0;
      this.lastQueryTime = 0;
      this.totalQueries = 0;
      this.totalPointsQueried = 0;
      this.totalNodesVisited = 0;
    }
    
    /**
     * Clear the quadtree
     */
    clear() {
      this.points = [];
      this.divided = false;
      this.children = null;
    }
    
    /**
     * Insert a point into the quadtree
     * @param {Object} point - Point with {x, y} coordinates and optional data
     * @return {boolean} Success
     */
    insert(point) {
      // Check if point is within bounds
      if (!this.containsPoint(point)) {
        return false;
      }
      
      // If space in this node and not too deep, add here
      if (this.points.length < this.capacity || this.depth >= this.maxDepth) {
        this.points.push(point);
        return true;
      }
      
      // Otherwise, subdivide and add to appropriate child
      if (!this.divided) {
        this.subdivide();
      }
      
      // Add point to appropriate child
      return (
        this.children.nw.insert(point) ||
        this.children.ne.insert(point) ||
        this.children.sw.insert(point) ||
        this.children.se.insert(point)
      );
    }
    
    /**
     * Insert multiple points at once
     * @param {Array} points - Array of points to insert
     * @return {number} Number of successfully inserted points
     */
    insertAll(points) {
      const startTime = performance.now();
      let count = 0;
      
      for (const point of points) {
        if (this.insert(point)) {
          count++;
        }
      }
      
      this.lastRebuildTime = performance.now() - startTime;
      
      return count;
    }
    
    /**
     * Rebuild the quadtree from an array of points
     * @param {Array} points - Array of points
     * @return {number} Number of inserted points
     */
    rebuild(points) {
      const startTime = performance.now();
      
      this.clear();
      let count = this.insertAll(points);
      
      this.lastRebuildTime = performance.now() - startTime;
      
      return count;
    }
    
    /**
     * Subdivide this node into four children
     * @private
     */
    subdivide() {
      const x = this.bounds.x;
      const y = this.bounds.y;
      const halfWidth = this.bounds.width / 2;
      const halfHeight = this.bounds.height / 2;
      const nextDepth = this.depth + 1;
      
      this.children = {
        nw: new Quadtree(
          { x, y, width: halfWidth, height: halfHeight },
          this.capacity,
          this.maxDepth,
          nextDepth
        ),
        ne: new Quadtree(
          { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
          this.capacity,
          this.maxDepth,
          nextDepth
        ),
        sw: new Quadtree(
          { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
          this.capacity,
          this.maxDepth,
          nextDepth
        ),
        se: new Quadtree(
          { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
          this.capacity,
          this.maxDepth,
          nextDepth
        )
      };
      
      // Move existing points to children
      for (const point of this.points) {
        this.children.nw.insert(point) ||
        this.children.ne.insert(point) ||
        this.children.sw.insert(point) ||
        this.children.se.insert(point);
      }
      
      this.points = [];
      this.divided = true;
    }
    
    /**
     * Query points within a rectangular region
     * @param {Object} range - Query rectangle {x, y, width, height}
     * @param {Array} found - Array to populate with found points (modified in place)
     * @return {Array} Array of points in range
     */
    query(range, found = []) {
      const startTime = performance.now();
      this.totalQueries++;
      this.totalNodesVisited++;
      
      // Skip if range doesn't intersect this node
      if (!this.intersectsRange(range)) {
        return found;
      }
      
      // Check points at this level
      for (const point of this.points) {
        this.totalPointsQueried++;
        if (this.pointInRange(point, range)) {
          found.push(point);
        }
      }
      
      // If divided, check children
      if (this.divided) {
        this.children.nw.query(range, found);
        this.children.ne.query(range, found);
        this.children.sw.query(range, found);
        this.children.se.query(range, found);
      }
      
      this.lastQueryTime = performance.now() - startTime;
      
      return found;
    }
    
    /**
     * Query points within a circular region
     * @param {Object} circle - Circle {x, y, radius}
     * @param {Array} found - Array to populate with found points (modified in place)
     * @return {Array} Array of points in range
     */
    queryCircle(circle, found = []) {
      const startTime = performance.now();
      this.totalQueries++;
      this.totalNodesVisited++;
      
      // Create bounding box for initial filtering
      const range = {
        x: circle.x - circle.radius,
        y: circle.y - circle.radius,
        width: circle.radius * 2,
        height: circle.radius * 2
      };
      
      // Skip if bounding box doesn't intersect this node
      if (!this.intersectsRange(range)) {
        return found;
      }
      
      // Check points at this level
      for (const point of this.points) {
        this.totalPointsQueried++;
        
        // Check if point is within circle
        const dx = point.x - circle.x;
        const dy = point.y - circle.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq <= circle.radius * circle.radius) {
          found.push(point);
        }
      }
      
      // If divided, check children
      if (this.divided) {
        this.children.nw.queryCircle(circle, found);
        this.children.ne.queryCircle(circle, found);
        this.children.sw.queryCircle(circle, found);
        this.children.se.queryCircle(circle, found);
      }
      
      this.lastQueryTime = performance.now() - startTime;
      
      return found;
    }
    
    /**
     * Find k-nearest neighbors to a point
     * @param {Object} target - Target point {x, y}
     * @param {number} k - Number of neighbors to find
     * @param {number} maxDistance - Maximum distance to search (optional)
     * @return {Array} Array of k closest points, sorted by distance
     */
    findNearestNeighbors(target, k, maxDistance = Infinity) {
      // Array to hold neighbors with distance
      const neighbors = [];
      
      // Use circle query with increasing radius
      let searchRadius = 10;  // Start with small radius
      const maxRadius = maxDistance !== Infinity ? maxDistance : Math.max(this.bounds.width, this.bounds.height);
      
      while (searchRadius <= maxRadius && neighbors.length < k) {
        const circle = {
          x: target.x,
          y: target.y,
          radius: searchRadius
        };
        
        // Clear previous results
        neighbors.length = 0;
        
        // Query points in circle
        const found = this.queryCircle(circle, []);
        
        // Calculate distances and add to neighbors
        for (const point of found) {
          const dx = point.x - target.x;
          const dy = point.y - target.y;
          const distSq = dx * dx + dy * dy;
          
          neighbors.push({
            point: point,
            distance: Math.sqrt(distSq)
          });
        }
        
        // If we have enough neighbors, stop
        if (neighbors.length >= k) {
          break;
        }
        
        // Otherwise, double the search radius
        searchRadius *= 2;
      }
      
      // Sort by distance
      neighbors.sort((a, b) => a.distance - b.distance);
      
      // Return only the closest k
      return neighbors.slice(0, k).map(n => n.point);
    }
    
    /**
     * Count total number of points in the quadtree
     * @return {number} Total point count
     */
    size() {
      let count = this.points.length;
      
      if (this.divided) {
        count += this.children.nw.size();
        count += this.children.ne.size();
        count += this.children.sw.size();
        count += this.children.se.size();
      }
      
      return count;
    }
    
    /**
     * Get all points in the quadtree
     * @return {Array} Array of all points
     */
    getAllPoints() {
      const allPoints = [...this.points];
      
      if (this.divided) {
        allPoints.push(...this.children.nw.getAllPoints());
        allPoints.push(...this.children.ne.getAllPoints());
        allPoints.push(...this.children.sw.getAllPoints());
        allPoints.push(...this.children.se.getAllPoints());
      }
      
      return allPoints;
    }
    
    /**
     * Check if a point is within bounds
     * @param {Object} point - Point to check
     * @return {boolean} True if in bounds
     * @private
     */
    containsPoint(point) {
      return (
        point.x >= this.bounds.x &&
        point.x < this.bounds.x + this.bounds.width &&
        point.y >= this.bounds.y &&
        point.y < this.bounds.y + this.bounds.height
      );
    }
    
    /**
     * Check if a range intersects with this node
     * @param {Object} range - Range to check
     * @return {boolean} True if ranges intersect
     * @private
     */
    intersectsRange(range) {
      return !(
        range.x > this.bounds.x + this.bounds.width ||
        range.x + range.width < this.bounds.x ||
        range.y > this.bounds.y + this.bounds.height ||
        range.y + range.height < this.bounds.y
      );
    }
    
    /**
     * Check if a point is within a range
     * @param {Object} point - Point to check
     * @param {Object} range - Range to check against
     * @return {boolean} True if point in range
     * @private
     */
    pointInRange(point, range) {
      // If range has a contains method, use that (for custom shapes)
      if (range.contains && typeof range.contains === 'function') {
        return range.contains(point);
      }
      
      // Otherwise use rectangular bounds
      return (
        point.x >= range.x &&
        point.x < range.x + range.width &&
        point.y >= range.y &&
        point.y < range.y + range.height
      );
    }
    
    /**
     * Optimize the quadtree by rebalancing
     * Useful after many inserts/removes
     */
    rebalance() {
      const points = this.getAllPoints();
      this.clear();
      this.insertAll(points);
    }
    
    /**
     * Get performance statistics
     * @return {Object} Performance metrics
     */
    getPerformanceMetrics() {
      return {
        rebuildTime: this.lastRebuildTime,
        queryTime: this.lastQueryTime,
        totalQueries: this.totalQueries,
        totalPointsQueried: this.totalPointsQueried,
        totalNodesVisited: this.totalNodesVisited,
        averageNodesPerQuery: this.totalQueries > 0 ? 
          this.totalNodesVisited / this.totalQueries : 0,
        averagePointsPerQuery: this.totalQueries > 0 ? 
          this.totalPointsQueried / this.totalQueries : 0
      };
    }
    
    /**
     * Draw the quadtree for debugging (uses canvas context)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} options - Drawing options
     */
    draw(ctx, options = {}) {
      const defaultOptions = {
        nodeColor: 'rgba(0, 0, 0, 0.3)',
        leafColor: 'rgba(0, 0, 255, 0.2)',
        pointColor: 'rgba(255, 0, 0, 0.7)',
        pointRadius: 2,
        showPoints: true,
        showEmptyNodes: true,
        nodeLineWidth: 1
      };
      
      const drawOptions = { ...defaultOptions, ...options };
      
      // Draw this node
      if (drawOptions.showEmptyNodes || this.points.length > 0 || this.divided) {
        ctx.strokeStyle = this.divided ? drawOptions.nodeColor : drawOptions.leafColor;
        ctx.lineWidth = drawOptions.nodeLineWidth;
        ctx.strokeRect(
          this.bounds.x,
          this.bounds.y,
          this.bounds.width,
          this.bounds.height
        );
      }
      
      // Draw points if this is a leaf node
      if (drawOptions.showPoints && this.points.length > 0) {
        ctx.fillStyle = drawOptions.pointColor;
        for (const point of this.points) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, drawOptions.pointRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Draw children if divided
      if (this.divided) {
        this.children.nw.draw(ctx, drawOptions);
        this.children.ne.draw(ctx, drawOptions);
        this.children.sw.draw(ctx, drawOptions);
        this.children.se.draw(ctx, drawOptions);
      }
    }
  }
  
  /**
   * Grid-based spatial partitioning (alternative to Quadtree)
   * Better for uniform distributions of particles
   */
  class SpatialGrid {
    /**
     * Create a new spatial grid
     * @param {Object} bounds - Boundary rectangle {x, y, width, height}
     * @param {number} cellSize - Size of each grid cell
     */
    constructor(bounds, cellSize) {
      this.bounds = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      };
      this.cellSize = cellSize;
      
      // Calculate grid dimensions
      this.cols = Math.ceil(bounds.width / cellSize);
      this.rows = Math.ceil(bounds.height / cellSize);
      
      // Create empty grid
      this.grid = new Array(this.cols * this.rows);
      for (let i = 0; i < this.grid.length; i++) {
        this.grid[i] = [];
      }
      
      // Performance tracking
      this.lastRebuildTime = 0;
      this.lastQueryTime = 0;
    }
    
    /**
     * Clear the grid
     */
    clear() {
      for (let i = 0; i < this.grid.length; i++) {
        this.grid[i] = [];
      }
    }
    
    /**
     * Insert a point into the grid
     * @param {Object} point - Point with {x, y} coordinates
     * @return {boolean} Success
     */
    insert(point) {
      const cellIndex = this.getCellIndex(point.x, point.y);
      if (cellIndex === -1) return false;
      
      this.grid[cellIndex].push(point);
      return true;
    }
    
    /**
     * Rebuild the grid with an array of points
     * @param {Array} points - Array of points
     * @return {number} Number of inserted points
     */
    rebuild(points) {
      const startTime = performance.now();
      
      this.clear();
      let count = 0;
      
      for (const point of points) {
        if (this.insert(point)) {
          count++;
        }
      }
      
      this.lastRebuildTime = performance.now() - startTime;
      
      return count;
    }
    
    /**
     * Get index of cell that contains a point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @return {number} Cell index or -1 if out of bounds
     * @private
     */
    getCellIndex(x, y) {
      // Check if point is in bounds
      if (
        x < this.bounds.x || 
        x >= this.bounds.x + this.bounds.width || 
        y < this.bounds.y || 
        y >= this.bounds.y + this.bounds.height
      ) {
        return -1;
      }
      
      // Calculate grid cell coordinates
      const gridX = Math.floor((x - this.bounds.x) / this.cellSize);
      const gridY = Math.floor((y - this.bounds.y) / this.cellSize);
      
      // Convert to 1D index
      return gridY * this.cols + gridX;
    }
    
    /**
     * Get indices of cells that overlap a range
     * @param {Object} range - Query rectangle {x, y, width, height}
     * @return {Array} Array of cell indices
     * @private
     */
    getCellsInRange(range) {
      // Calculate grid cell coordinates of range corners
      const minX = Math.max(0, Math.floor((range.x - this.bounds.x) / this.cellSize));
      const maxX = Math.min(this.cols - 1, Math.floor((range.x + range.width - this.bounds.x) / this.cellSize));
      const minY = Math.max(0, Math.floor((range.y - this.bounds.y) / this.cellSize));
      const maxY = Math.min(this.rows - 1, Math.floor((range.y + range.height - this.bounds.y) / this.cellSize));
      
      const indices = [];
      
      // Collect all cell indices in the range
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          indices.push(y * this.cols + x);
        }
      }
      
      return indices;
    }
    
    /**
     * Query points within a rectangular range
     * @param {Object} range - Query rectangle {x, y, width, height}
     * @return {Array} Array of points in range
     */
    query(range) {
      const startTime = performance.now();
      
      const cellIndices = this.getCellsInRange(range);
      const found = [];
      
      // Check all points in relevant cells
      for (const cellIndex of cellIndices) {
        const cellPoints = this.grid[cellIndex];
        
        for (const point of cellPoints) {
          // Check if point is within range
          if (
            point.x >= range.x &&
            point.x < range.x + range.width &&
            point.y >= range.y &&
            point.y < range.y + range.height
          ) {
            found.push(point);
          }
        }
      }
      
      this.lastQueryTime = performance.now() - startTime;
      
      return found;
    }
    
    /**
     * Query points within a circular range
     * @param {Object} circle - Circle {x, y, radius}
     * @return {Array} Array of points in range
     */
    queryCircle(circle) {
      const startTime = performance.now();
      
      // Create bounding box for the circle
      const range = {
        x: circle.x - circle.radius,
        y: circle.y - circle.radius,
        width: circle.radius * 2,
        height: circle.radius * 2
      };
      
      const cellIndices = this.getCellsInRange(range);
      const found = [];
      
      const radiusSq = circle.radius * circle.radius;
      
      // Check all points in relevant cells
      for (const cellIndex of cellIndices) {
        const cellPoints = this.grid[cellIndex];
        
        for (const point of cellPoints) {
          // Calculate distance to circle center
          const dx = point.x - circle.x;
          const dy = point.y - circle.y;
          const distSq = dx * dx + dy * dy;
          
          // Check if point is within circle
          if (distSq <= radiusSq) {
            found.push(point);
          }
        }
      }
      
      this.lastQueryTime = performance.now() - startTime;
      
      return found;
    }
    
    /**
     * Get performance statistics
     * @return {Object} Performance metrics
     */
    getPerformanceMetrics() {
      return {
        rebuildTime: this.lastRebuildTime,
        queryTime: this.lastQueryTime,
        cellCount: this.grid.length,
        cellSize: this.cellSize
      };
    }
    
    /**
     * Draw the grid for debugging (uses canvas context)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} options - Drawing options
     */
    draw(ctx, options = {}) {
      const defaultOptions = {
        gridColor: 'rgba(0, 0, 0, 0.2)',
        pointColor: 'rgba(255, 0, 0, 0.7)',
        pointRadius: 2,
        showPoints: true,
        showEmptyCells: false
      };
      
      const drawOptions = { ...defaultOptions, ...options };
      
      // Draw grid lines
      ctx.strokeStyle = drawOptions.gridColor;
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let x = 0; x <= this.cols; x++) {
        const xPos = this.bounds.x + x * this.cellSize;
        ctx.beginPath();
        ctx.moveTo(xPos, this.bounds.y);
        ctx.lineTo(xPos, this.bounds.y + this.bounds.height);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = 0; y <= this.rows; y++) {
        const yPos = this.bounds.y + y * this.cellSize;
        ctx.beginPath();
        ctx.moveTo(this.bounds.x, yPos);
        ctx.lineTo(this.bounds.x + this.bounds.width, yPos);
        ctx.stroke();
      }
      
      // Draw points
      if (drawOptions.showPoints) {
        ctx.fillStyle = drawOptions.pointColor;
        
        for (let i = 0; i < this.grid.length; i++) {
          const cellPoints = this.grid[i];
          
          if (cellPoints.length > 0 || drawOptions.showEmptyCells) {
            for (const point of cellPoints) {
              ctx.beginPath();
              ctx.arc(point.x, point.y, drawOptions.pointRadius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }
  }
  
  export { Quadtree, SpatialGrid };