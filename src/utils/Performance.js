/**
 * Performance.js - Performance monitoring and optimization
 * 
 * Features:
 * - FPS counter and statistics
 * - Performance bottleneck detection
 * - Automatic quality adjustments
 * - Memory usage monitoring
 * - Frame time breakdown
 */

class PerformanceMonitor {
    /**
     * Create a new performance monitor
     * @param {Object} engine - Simulation engine
     * @param {Object} options - Configuration options
     */
    constructor(engine, options = {}) {
      this.engine = engine;
      
      // Default options
      this.options = Object.assign({
        sampleSize: 60,                     // Number of frames to average
        targetFps: 60,                      // Target framerate
        targetFrameTime: 1000 / 60,         // Target frame time in ms
        autoAdjustQuality: false,           // Auto-adjust quality for performance
        showStats: false,                   // Show stats overlay
        showGraph: false,                   // Show performance graph
        logToConsole: false,                // Log stats to console
        logInterval: 5000,                  // Console log interval (ms)
        alertThreshold: 20,                 // FPS threshold for alerts
        memoryTracking: false,              // Track memory usage
        memoryLimit: 500 * 1024 * 1024,     // Memory limit for auto-adjustments (500MB)
        reportInterval: 1000,               // Internal report interval (ms)
        customMetrics: {},                  // Custom metrics to track
        component: 'all',                   // Component to monitor ('all', 'physics', 'rendering')
        autoStartStop: false,               // Automatically pause when tabbed away
        adaptiveSettings: {                 // Settings that can be auto-adjusted
          enabled: false,                    // Master enable for adaptive settings
          maxParticles: { min: 100, max: 10000, step: 100 },
          renderQuality: { min: 0, max: 2, step: 1 }, // 0=fast, 1=normal, 2=high
          quadtreeDepth: { min: 3, max: 10, step: 1 },
          physicsSteps: { min: 1, max: 3, step: 1 },
          visibleDistance: { min: 100, max: 1000, step: 50 }
        }
      }, options);
      
      // Performance metrics
      this.metrics = {
        fps: 0,
        frameTime: 0,
        minFrameTime: Infinity,
        maxFrameTime: 0,
        avgFrameTime: 0,
        updateTime: 0,
        renderTime: 0,
        idleTime: 0,
        gcTime: 0,
        physicsTime: 0,
        particleCount: 0,
        activeParticles: 0,
        memory: null,
        vsyncStatus: null
      };
      
      // History buffers
      this.frameTimeHistory = new Array(this.options.sampleSize).fill(0);
      this.fpsHistory = new Array(this.options.sampleSize).fill(0);
      this.updateTimeHistory = new Array(this.options.sampleSize).fill(0);
      this.renderTimeHistory = new Array(this.options.sampleSize).fill(0);
      this.physicsTimeHistory = new Array(this.options.sampleSize).fill(0);
      this.memoryHistory = new Array(this.options.sampleSize).fill(0);
      this.particleCountHistory = new Array(this.options.sampleSize).fill(0);
      
      // Custom metric history
      this.customMetricHistory = {};
      for (const metric in this.options.customMetrics) {
        this.customMetricHistory[metric] = new Array(this.options.sampleSize).fill(0);
      }
      
      // Internal state
      this.startTime = 0;
      this.lastFrameTime = 0;
      this.frameCount = 0;
      this.historyIndex = 0;
      this.lastReportTime = 0;
      this.lastLogTime = 0;
      this.lowFpsCount = 0;
      this.fpsAlertTriggered = false;
      this.memoryAlertTriggered = false;
      this.isVisible = true;
      this.wasPaused = false;
      this.performanceMode = 'normal'; // 'normal', 'low', 'critical'
      
      // DOM elements
      this.statsContainer = null;
      this.graphCanvas = null;
      this.graphCtx = null;
      
      // Performance marks
      this.marks = {};
      this.measures = {};
      
      // Initialize
      this.initialize();
    }
    
    /**
     * Initialize the performance monitor
     * @private
     */
    initialize() {
      // Start timing
      this.startTime = performance.now();
      this.lastFrameTime = this.startTime;
      this.lastReportTime = this.startTime;
      this.lastLogTime = this.startTime;
      
      // Create stats overlay if enabled
      if (this.options.showStats) {
        this.createStatsOverlay();
      }
      
      // Create performance graph if enabled
      if (this.options.showGraph) {
        this.createPerformanceGraph();
      }
      
      // Setup visibility tracking if auto start/stop is enabled
      if (this.options.autoStartStop) {
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      }
      
      // Setup memory tracking if enabled
      if (this.options.memoryTracking && window.performance && window.performance.memory) {
        this.metrics.memory = {
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          usedJSHeapSize: window.performance.memory.usedJSHeapSize
        };
      }
      
      // Detect vsync status
      this.detectVsyncStatus();
    }
    
    /**
     * Begin frame timing
     */
    beginFrame() {
      const now = performance.now();
      
      // Calculate frame time
      const frameTime = now - this.lastFrameTime;
      this.lastFrameTime = now;
      
      // Store frame time
      this.metrics.frameTime = frameTime;
      
      // Update extremes
      this.metrics.minFrameTime = Math.min(this.metrics.minFrameTime, frameTime);
      this.metrics.maxFrameTime = Math.max(this.metrics.maxFrameTime, frameTime);
      
      // Mark beginning of frame
      this.mark('frameStart');
      
      // Get particle count
      if (this.engine.particles) {
        this.metrics.particleCount = this.engine.particles.count;
        this.metrics.activeParticles = this.engine.particles.getActiveCount();
      }
      
      return now;
    }
    
    /**
     * Start update phase timing
     */
    beginUpdate() {
      this.mark('updateStart');
    }
    
    /**
     * End update phase timing
     */
    endUpdate() {
      this.mark('updateEnd');
      this.measure('update', 'updateStart', 'updateEnd');
      this.metrics.updateTime = this.measures.update;
    }
    
    /**
     * Start physics phase timing
     */
    beginPhysics() {
      this.mark('physicsStart');
    }
    
    /**
     * End physics phase timing
     */
    endPhysics() {
      this.mark('physicsEnd');
      this.measure('physics', 'physicsStart', 'physicsEnd');
      this.metrics.physicsTime = this.measures.physics;
    }
    
    /**
     * Start render phase timing
     */
    beginRender() {
      this.mark('renderStart');
    }
    
    /**
     * End render phase timing
     */
    endRender() {
      this.mark('renderEnd');
      this.measure('render', 'renderStart', 'renderEnd');
      this.metrics.renderTime = this.measures.render;
    }
    
    /**
     * End frame timing and update metrics
     */
    endFrame() {
      this.mark('frameEnd');
      
      // Measure total frame time
      this.measure('frame', 'frameStart', 'frameEnd');
      
      // Calculate idle time (time not spent in update or render)
      const totalTime = this.measures.frame;
      const usedTime = (this.measures.update || 0) + (this.measures.render || 0);
      this.metrics.idleTime = Math.max(0, totalTime - usedTime);
      
      // Update frame counter
      this.frameCount++;
      
      // Update FPS calculation
      const now = performance.now();
      const elapsed = now - this.startTime;
      
      // Calculate current FPS (averaged over sampleSize frames)
      if (elapsed > 0) {
        this.metrics.fps = Math.min(144, Math.round(1000 / (elapsed / this.frameCount)));
      }
      
      // Update history buffers
      this.updateHistory();
      
      // Report metrics at the specified interval
      if (now - this.lastReportTime >= this.options.reportInterval) {
        this.generateReport();
        this.lastReportTime = now;
        
        // Auto-adjust quality if enabled
        if (this.options.autoAdjustQuality) {
          this.adjustQuality();
        }
      }
      
      // Log to console if enabled
      if (this.options.logToConsole && now - this.lastLogTime >= this.options.logInterval) {
        this.logPerformance();
        this.lastLogTime = now;
      }
      
      // Update statistics display if enabled
      if (this.options.showStats) {
        this.updateStatsDisplay();
      }
      
      // Update performance graph if enabled
      if (this.options.showGraph) {
        this.updatePerformanceGraph();
      }
      
      // Check for performance alerts
      this.checkPerformanceAlerts();
      
      // Reset start time if we've collected enough samples
      if (this.frameCount >= this.options.sampleSize) {
        this.startTime = now;
        this.frameCount = 0;
      }
      
      // Track memory usage if enabled
      if (this.options.memoryTracking && window.performance && window.performance.memory) {
        this.metrics.memory = {
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          usedJSHeapSize: window.performance.memory.usedJSHeapSize
        };
        
        // Record memory usage in history
        this.memoryHistory[this.historyIndex] = this.metrics.memory.usedJSHeapSize;
      }
    }
    
    /**
     * Mark a point in time for performance measurement
     * @param {string} name - Name of the mark
     */
    mark(name) {
      this.marks[name] = performance.now();
    }
    
    /**
     * Measure time between two marks
     * @param {string} name - Name of the measure
     * @param {string} startMark - Name of the start mark
     * @param {string} endMark - Name of the end mark
     * @return {number} Measured time in milliseconds
     */
    measure(name, startMark, endMark) {
      if (this.marks[startMark] && this.marks[endMark]) {
        const duration = this.marks[endMark] - this.marks[startMark];
        this.measures[name] = duration;
        return duration;
      }
      return 0;
    }
    
    /**
     * Add a custom timing measurement
     * @param {string} name - Name of the measurement
     * @param {number} time - Time in milliseconds
     */
    addCustomTiming(name, time) {
      this.measures[name] = time;
      
      // Add to custom metrics if defined
      if (this.options.customMetrics[name] !== undefined) {
        this.options.customMetrics[name] = time;
        
        // Record in history
        if (this.customMetricHistory[name]) {
          this.customMetricHistory[name][this.historyIndex] = time;
        }
      }
    }
    
    /**
     * Update history buffers with current values
     * @private
     */
    updateHistory() {
      // Update frame time history
      this.frameTimeHistory[this.historyIndex] = this.metrics.frameTime;
      
      // Update FPS history
      this.fpsHistory[this.historyIndex] = this.metrics.fps;
      
      // Update timing history
      this.updateTimeHistory[this.historyIndex] = this.metrics.updateTime;
      this.renderTimeHistory[this.historyIndex] = this.metrics.renderTime;
      this.physicsTimeHistory[this.historyIndex] = this.metrics.physicsTime;
      
      // Update particle count history
      this.particleCountHistory[this.historyIndex] = this.metrics.activeParticles;
      
      // Update custom metrics history
      for (const metric in this.customMetricHistory) {
        if (this.options.customMetrics[metric] !== undefined) {
          this.customMetricHistory[metric][this.historyIndex] = this.options.customMetrics[metric];
        }
      }
      
      // Increment history index
      this.historyIndex = (this.historyIndex + 1) % this.options.sampleSize;
      
      // Calculate averages once we've filled the buffer
      if (this.frameCount >= this.options.sampleSize) {
        this.metrics.avgFrameTime = this.calculateAverage(this.frameTimeHistory);
      }
    }
    
    /**
     * Calculate average of an array of values
     * @param {Array} values - Array of numeric values
     * @return {number} Average value
     * @private
     */
    calculateAverage(values) {
      let sum = 0;
      let count = 0;
      
      for (let i = 0; i < values.length; i++) {
        if (values[i] > 0) { // Only count valid values
          sum += values[i];
          count++;
        }
      }
      
      return count > 0 ? sum / count : 0;
    }
    
    /**
     * Generate a performance report
     * @return {Object} Performance report
     * @private
     */
    generateReport() {
      // Calculate averages from history
      const avgFps = this.calculateAverage(this.fpsHistory);
      const avgFrameTime = this.calculateAverage(this.frameTimeHistory);
      const avgUpdateTime = this.calculateAverage(this.updateTimeHistory);
      const avgRenderTime = this.calculateAverage(this.renderTimeHistory);
      const avgPhysicsTime = this.calculateAverage(this.physicsTimeHistory);
      
      // Calculate CPU utilization percentage
      const cpuUtilization = avgFrameTime > 0 ? 
        ((avgUpdateTime + avgRenderTime) / avgFrameTime) * 100 : 0;
      
      // Calculate performance score (0-100)
      let performanceScore = 100;
      
      // Reduce score based on frame time relative to target
      if (avgFrameTime > this.options.targetFrameTime) {
        performanceScore -= Math.min(50, 
          ((avgFrameTime - this.options.targetFrameTime) / this.options.targetFrameTime) * 50);
      }
      
      // Reduce score based on CPU utilization
      if (cpuUtilization > 80) {
        performanceScore -= Math.min(30, (cpuUtilization - 80) * 1.5);
      }
      
      // Reduce score based on memory usage if tracking enabled
      if (this.options.memoryTracking && this.metrics.memory) {
        const memoryUsageRatio = this.metrics.memory.usedJSHeapSize / this.metrics.memory.jsHeapSizeLimit;
        if (memoryUsageRatio > 0.7) {
          performanceScore -= Math.min(20, (memoryUsageRatio - 0.7) * 100);
        }
      }
      
      // Clamp score to 0-100
      performanceScore = Math.max(0, Math.min(100, Math.round(performanceScore)));
      
      // Determine performance category
      let performanceCategory;
      if (performanceScore >= 80) {
        performanceCategory = 'good';
        this.performanceMode = 'normal';
      } else if (performanceScore >= 50) {
        performanceCategory = 'average';
        this.performanceMode = 'normal';
      } else if (performanceScore >= 30) {
        performanceCategory = 'poor';
        this.performanceMode = 'low';
      } else {
        performanceCategory = 'critical';
        this.performanceMode = 'critical';
      }
      
      // Generate report
      const report = {
        timestamp: performance.now(),
        fps: {
          current: this.metrics.fps,
          average: avgFps,
          target: this.options.targetFps
        },
        frameTime: {
          current: this.metrics.frameTime,
          average: avgFrameTime,
          min: this.metrics.minFrameTime,
          max: this.metrics.maxFrameTime,
          target: this.options.targetFrameTime
        },
        timing: {
          update: avgUpdateTime,
          render: avgRenderTime,
          physics: avgPhysicsTime,
          idle: this.metrics.idleTime
        },
        particles: {
          total: this.metrics.particleCount,
          active: this.metrics.activeParticles
        },
        memory: this.metrics.memory,
        cpuUtilization: cpuUtilization,
        performanceScore: performanceScore,
        performanceCategory: performanceCategory,
        vsyncStatus: this.metrics.vsyncStatus,
        histogram: {
          frameTime: this.frameTimeHistory.slice(),
          fps: this.fpsHistory.slice()
        },
        customMetrics: {}
      };
      
      // Add custom metrics
      for (const metric in this.options.customMetrics) {
        report.customMetrics[metric] = {
          current: this.options.customMetrics[metric],
          average: this.calculateAverage(this.customMetricHistory[metric] || [])
        };
      }
      
      // Emit report event
      this.emitEvent('performanceReport', report);
      
      return report;
    }
    
    /**
     * Adjust quality settings based on performance
     * @private
     */
    adjustQuality() {
      if (!this.options.adaptiveSettings.enabled) return;
      
      // Only adjust if we have enough data
      if (this.frameCount < this.options.sampleSize / 2) return;
      
      const avgFps = this.calculateAverage(this.fpsHistory);
      const avgFrameTime = this.calculateAverage(this.frameTimeHistory);
      
      // Check memory usage
      let memoryPressure = false;
      if (this.options.memoryTracking && this.metrics.memory) {
        memoryPressure = this.metrics.memory.usedJSHeapSize > this.options.memoryLimit * 0.8;
      }
      
      // Determine if we need to adjust quality
      const targetFrameTime = 1000 / this.options.targetFps;
      const lowPerformance = avgFrameTime > targetFrameTime * 1.2 || avgFps < this.options.targetFps * 0.8;
      const criticalPerformance = avgFrameTime > targetFrameTime * 1.5 || avgFps < this.options.targetFps * 0.6;
      const highPerformance = avgFrameTime < targetFrameTime * 0.7 && avgFps > this.options.targetFps * 0.9;
      
      // Take actions based on performance level
      if (criticalPerformance || memoryPressure) {
        // Critical performance - make significant adjustments
        this.decreaseQuality(2);
        this.emitEvent('qualityAdjusted', { level: 'critical', action: 'decrease' });
      } else if (lowPerformance) {
        // Low performance - make minor adjustments
        this.decreaseQuality(1);
        this.emitEvent('qualityAdjusted', { level: 'low', action: 'decrease' });
      } else if (highPerformance && !memoryPressure && this.performanceMode !== 'normal') {
        // High performance - gradually restore quality
        this.increaseQuality(1);
        this.emitEvent('qualityAdjusted', { level: 'high', action: 'increase' });
      }
    }
    
    /**
     * Decrease quality settings
     * @param {number} amount - How much to decrease quality (1 = minor, 2 = major)
     * @private
     */
    decreaseQuality(amount) {
      const settings = this.options.adaptiveSettings;
      const engine = this.engine;
      
      // Analyze what's taking the most time
      const avgUpdateTime = this.calculateAverage(this.updateTimeHistory);
      const avgRenderTime = this.calculateAverage(this.renderTimeHistory);
      const avgPhysicsTime = this.calculateAverage(this.physicsTimeHistory);
      
      // Flag to track if we made any changes
      let madeChanges = false;
      
      // Adjust based on bottleneck
      if (avgRenderTime > avgUpdateTime) {
        // Rendering is the bottleneck
        
        // Reduce render quality
        if (engine.renderer && settings.renderQuality) {
          const current = engine.renderer.options.renderingMode === 'detailed' ? 2 :
                         (engine.renderer.options.renderingMode === 'normal' ? 1 : 0);
          
          const newQuality = Math.max(settings.renderQuality.min, current - amount);
          
          if (newQuality !== current) {
            const modes = ['fast', 'normal', 'detailed'];
            engine.renderer.setOptions({ renderingMode: modes[newQuality] });
            madeChanges = true;
          }
        }
        
        // Disable special effects if critical
        if (amount > 1 && engine.renderer) {
          engine.renderer.setOptions({
            particleGlow: false,
            useTrails: false,
            drawShadows: false
          });
          madeChanges = true;
        }
      } else if (avgPhysicsTime > avgRenderTime * 1.5) {
        // Physics is the bottleneck
        
        // Reduce particle count
        if (settings.maxParticles) {
          const currentCount = this.metrics.activeParticles;
          const newCount = Math.max(settings.maxParticles.min, 
            currentCount - settings.maxParticles.step * amount * 2);
          
          if (newCount < currentCount) {
            engine.removeParticles(currentCount - newCount);
            madeChanges = true;
          }
        }
        
        // Simplify quadtree
        if (settings.quadtreeDepth && engine.quadtree) {
          const current = engine.quadtree.maxDepth;
          const newDepth = Math.max(settings.quadtreeDepth.min, current - amount);
          
          if (newDepth !== current) {
            engine.quadtree.maxDepth = newDepth;
            madeChanges = true;
          }
        }
        
        // Reduce physics steps if critical
        if (amount > 1 && settings.physicsSteps && engine.integrator) {
          const current = engine.integrator.options.subSteps;
          const newSteps = Math.max(settings.physicsSteps.min, current - 1);
          
          if (newSteps !== current) {
            engine.integrator.setOptions({ subSteps: newSteps });
            madeChanges = true;
          }
        }
      } else {
        // General performance issues
        
        // Reduce both particle count and visual quality
        if (settings.maxParticles) {
          const currentCount = this.metrics.activeParticles;
          const newCount = Math.max(settings.maxParticles.min, 
            currentCount - settings.maxParticles.step * amount);
          
          if (newCount < currentCount) {
            engine.removeParticles(currentCount - newCount);
            madeChanges = true;
          }
        }
        
        // Reduce visible distance
        if (settings.visibleDistance && engine.renderer) {
          const current = engine.renderer.options.maxParticlesPerFrame;
          const newLimit = Math.max(settings.visibleDistance.min, 
            current - settings.visibleDistance.step * amount);
          
          if (newLimit !== current) {
            engine.renderer.setOptions({ maxParticlesPerFrame: newLimit });
            madeChanges = true;
          }
        }
      }
      
      if (madeChanges) {
        console.log(`Performance monitor decreased quality (level ${amount})`);
      }
    }
    
    /**
     * Increase quality settings
     * @param {number} amount - How much to increase quality
     * @private
     */
    increaseQuality(amount) {
      const settings = this.options.adaptiveSettings;
      const engine = this.engine;
      
      // Flag to track if we made any changes
      let madeChanges = false;
      
      // Gradually restore settings, prioritizing visual quality
      
      // Increase render quality
      if (engine.renderer && settings.renderQuality) {
        const current = engine.renderer.options.renderingMode === 'detailed' ? 2 :
                       (engine.renderer.options.renderingMode === 'normal' ? 1 : 0);
        
        const newQuality = Math.min(settings.renderQuality.max, current + amount);
        
        if (newQuality !== current) {
          const modes = ['fast', 'normal', 'detailed'];
          engine.renderer.setOptions({ renderingMode: modes[newQuality] });
          madeChanges = true;
          
          // Don't make more changes in one step
          return;
        }
      }
      
      // Re-enable effects
      if (engine.renderer && 
          !engine.renderer.options.useTrails && 
          !engine.renderer.options.particleGlow) {
        
        // Restore one effect at a time
        if (!engine.renderer.options.useTrails) {
          engine.renderer.setOptions({ useTrails: true });
          madeChanges = true;
          return;
        } else if (!engine.renderer.options.particleGlow) {
          engine.renderer.setOptions({ particleGlow: true });
          madeChanges = true;
          return;
        }
      }
      
      // Increase particle count
      if (settings.maxParticles) {
        const currentCount = this.metrics.activeParticles;
        const newCount = Math.min(settings.maxParticles.max, 
          currentCount + settings.maxParticles.step * amount);
        
        if (newCount > currentCount) {
          engine.addParticles(newCount - currentCount);
          madeChanges = true;
          return;
        }
      }
      
      // Restore quadtree depth
      if (settings.quadtreeDepth && engine.quadtree) {
        const current = engine.quadtree.maxDepth;
        const newDepth = Math.min(settings.quadtreeDepth.max, current + amount);
        
        if (newDepth !== current) {
          engine.quadtree.maxDepth = newDepth;
          madeChanges = true;
          return;
        }
      }
      
      // Increase physics steps
      if (settings.physicsSteps && engine.integrator) {
        const current = engine.integrator.options.subSteps;
        const newSteps = Math.min(settings.physicsSteps.max, current + amount);
        
        if (newSteps !== current) {
          engine.integrator.setOptions({ subSteps: newSteps });
          madeChanges = true;
        }
      }
      
      if (madeChanges) {
        console.log(`Performance monitor increased quality (level ${amount})`);
      }
    }
    
    /**
     * Log performance statistics to console
     * @private
     */
    logPerformance() {
      if (!this.options.logToConsole) return;
      
      const report = this.generateReport();
      
      console.group('Performance Report');
      console.log(`FPS: ${report.fps.average.toFixed(1)} (Target: ${report.fps.target})`);
      console.log(`Frame Time: ${report.frameTime.average.toFixed(2)}ms (Target: ${report.frameTime.target.toFixed(2)}ms)`);
      console.log(`Update Time: ${report.timing.update.toFixed(2)}ms, Render Time: ${report.timing.render.toFixed(2)}ms`);
      console.log(`Particles: ${report.particles.active} / ${report.particles.total}`);
      
      if (report.memory) {
        const usedMB = (report.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
        const totalMB = (report.memory.totalJSHeapSize / (1024 * 1024)).toFixed(1);
        const limitMB = (report.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(1);
        console.log(`Memory: ${usedMB}MB / ${totalMB}MB (Limit: ${limitMB}MB)`);
      }
      
      console.log(`Performance Score: ${report.performanceScore}/100 (${report.performanceCategory})`);
      
      // Log custom metrics
      if (Object.keys(report.customMetrics).length > 0) {
        console.log('Custom Metrics:');
        for (const metric in report.customMetrics) {
          console.log(`  ${metric}: ${report.customMetrics[metric].average.toFixed(2)}`);
        }
      }
      
      console.groupEnd();
    }
    
    /**
     * Create stats overlay
     * @private
     */
    createStatsOverlay() {
      // Create container
      this.statsContainer = document.createElement('div');
      this.statsContainer.className = 'performance-stats';
      this.statsContainer.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        border-radius: 4px;
        z-index: 9999;
        width: 200px;
        pointer-events: none;
      `;
      
      // Create content
      this.statsContainer.innerHTML = `
        <div class="perf-title">Performance Monitor</div>
        <div class="perf-row">FPS: <span id="perf-fps">0</span></div>
        <div class="perf-row">Frame Time: <span id="perf-frame-time">0</span> ms</div>
        <div class="perf-row">Update: <span id="perf-update-time">0</span> ms</div>
        <div class="perf-row">Render: <span id="perf-render-time">0</span> ms</div>
        <div class="perf-row">Physics: <span id="perf-physics-time">0</span> ms</div>
        <div class="perf-row">Particles: <span id="perf-particles">0</span></div>
        <div class="perf-row">Mode: <span id="perf-mode">normal</span></div>
      `;
      
      // Add style
      const style = document.createElement('style');
      style.textContent = `
        .performance-stats .perf-title {
          font-weight: bold;
          margin-bottom: 5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
          padding-bottom: 3px;
        }
        .performance-stats .perf-row {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }
        .performance-stats .perf-warning {
          color: #ffcc00;
        }
        .performance-stats .perf-critical {
          color: #ff5555;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(this.statsContainer);
    }
    
    /**
     * Update stats display
     * @private
     */
    updateStatsDisplay() {
      if (!this.statsContainer) return;
      
      // Update values
      const fpsElement = document.getElementById('perf-fps');
      const frameTimeElement = document.getElementById('perf-frame-time');
      const updateTimeElement = document.getElementById('perf-update-time');
      const renderTimeElement = document.getElementById('perf-render-time');
      const physicsTimeElement = document.getElementById('perf-physics-time');
      const particlesElement = document.getElementById('perf-particles');
      const modeElement = document.getElementById('perf-mode');
      
      if (fpsElement) {
        fpsElement.textContent = Math.round(this.metrics.fps);
        
        // Add warning classes
        if (this.metrics.fps < this.options.targetFps * 0.8) {
          fpsElement.className = 'perf-warning';
        } else if (this.metrics.fps < this.options.targetFps * 0.5) {
          fpsElement.className = 'perf-critical';
        } else {
          fpsElement.className = '';
        }
      }
      
      if (frameTimeElement) {
        frameTimeElement.textContent = this.metrics.frameTime.toFixed(1);
        
        // Add warning classes
        if (this.metrics.frameTime > this.options.targetFrameTime * 1.2) {
          frameTimeElement.className = 'perf-warning';
        } else if (this.metrics.frameTime > this.options.targetFrameTime * 1.5) {
          frameTimeElement.className = 'perf-critical';
        } else {
          frameTimeElement.className = '';
        }
      }
      
      if (updateTimeElement) {
        updateTimeElement.textContent = this.metrics.updateTime.toFixed(1);
        
        // Add warning classes
        if (this.metrics.updateTime > this.options.targetFrameTime * 0.5) {
          updateTimeElement.className = 'perf-warning';
        } else if (this.metrics.updateTime > this.options.targetFrameTime * 0.8) {
          updateTimeElement.className = 'perf-critical';
        }
      }
      
      if (renderTimeElement) {
        renderTimeElement.textContent = this.metrics.renderTime.toFixed(1);
        
        // Add warning classes
        if (this.metrics.renderTime > this.options.targetFrameTime * 0.5) {
          renderTimeElement.className = 'perf-warning';
        } else if (this.metrics.renderTime > this.options.targetFrameTime * 0.8) {
          renderTimeElement.className = 'perf-critical';
        }
      }
      
      if (physicsTimeElement) {
        physicsTimeElement.textContent = this.metrics.physicsTime.toFixed(1);
      }
      
      if (particlesElement) {
        particlesElement.textContent = `${this.metrics.activeParticles} / ${this.metrics.particleCount}`;
      }
      
      if (modeElement) {
        modeElement.textContent = this.performanceMode;
        
        if (this.performanceMode === 'low') {
          modeElement.className = 'perf-warning';
        } else if (this.performanceMode === 'critical') {
          modeElement.className = 'perf-critical';
        } else {
          modeElement.className = '';
        }
      }
    }
    
    /**
     * Create performance graph
     * @private
     */
    createPerformanceGraph() {
      // Create canvas
      this.graphCanvas = document.createElement('canvas');
      this.graphCanvas.width = 200;
      this.graphCanvas.height = 100;
      this.graphCanvas.className = 'performance-graph';
      this.graphCanvas.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background-color: rgba(0, 0, 0, 0.7);
        border-radius: 4px;
        z-index: 9999;
        pointer-events: none;
      `;
      
      this.graphCtx = this.graphCanvas.getContext('2d');
      document.body.appendChild(this.graphCanvas);
    }
    
    /**
     * Update performance graph
     * @private
     */
    updatePerformanceGraph() {
      if (!this.graphCanvas || !this.graphCtx) return;
      
      const ctx = this.graphCtx;
      const width = this.graphCanvas.width;
      const height = this.graphCanvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw target frame time line
      const targetY = height - (this.options.targetFrameTime / 33.33) * height;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(0, targetY);
      ctx.lineTo(width, targetY);
      ctx.stroke();
      
      // Draw frame times
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      // Get max value for scaling
      const maxFrameTime = Math.max(...this.frameTimeHistory, this.options.targetFrameTime * 2);
      
      for (let i = 0; i < this.frameTimeHistory.length; i++) {
        if (this.frameTimeHistory[i] === 0) continue;
        
        const x = (i / this.frameTimeHistory.length) * width;
        const y = height - (this.frameTimeHistory[i] / maxFrameTime) * height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Draw update time
      ctx.strokeStyle = '#2196F3';
      ctx.beginPath();
      
      for (let i = 0; i < this.updateTimeHistory.length; i++) {
        if (this.updateTimeHistory[i] === 0) continue;
        
        const x = (i / this.updateTimeHistory.length) * width;
        const y = height - (this.updateTimeHistory[i] / maxFrameTime) * height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Draw render time
      ctx.strokeStyle = '#FFC107';
      ctx.beginPath();
      
      for (let i = 0; i < this.renderTimeHistory.length; i++) {
        if (this.renderTimeHistory[i] === 0) continue;
        
        const x = (i / this.renderTimeHistory.length) * width;
        const y = height - (this.renderTimeHistory[i] / maxFrameTime) * height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Add legend
      ctx.fillStyle = 'white';
      ctx.font = '9px monospace';
      ctx.fillText(`Frame: ${this.metrics.frameTime.toFixed(1)}ms`, 5, 10);
      ctx.fillText(`Target: ${this.options.targetFrameTime.toFixed(1)}ms`, 5, 20);
      ctx.fillText(`FPS: ${this.metrics.fps}`, width - 50, 10);
    }
    
    /**
     * Check for performance alerts
     * @private
     */
    checkPerformanceAlerts() {
      // Check for low FPS
      if (this.metrics.fps < this.options.alertThreshold) {
        this.lowFpsCount++;
        
        // Trigger alert if FPS is consistently low
        if (this.lowFpsCount >= 10 && !this.fpsAlertTriggered) {
          this.fpsAlertTriggered = true;
          this.emitEvent('performanceAlert', {
            type: 'fps',
            message: `Low FPS detected (${Math.round(this.metrics.fps)})`
          });
        }
      } else {
        // Reset counter if FPS recovers
        this.lowFpsCount = 0;
        this.fpsAlertTriggered = false;
      }
      
      // Check for memory issues
      if (this.options.memoryTracking && this.metrics.memory) {
        const memoryUsageRatio = this.metrics.memory.usedJSHeapSize / this.metrics.memory.jsHeapSizeLimit;
        
        if (memoryUsageRatio > 0.9 && !this.memoryAlertTriggered) {
          this.memoryAlertTriggered = true;
          this.emitEvent('performanceAlert', {
            type: 'memory',
            message: `High memory usage (${Math.round(memoryUsageRatio * 100)}%)`
          });
        } else if (memoryUsageRatio < 0.8) {
          this.memoryAlertTriggered = false;
        }
      }
    }
    
    /**
     * Handle visibility change
     * @param {Event} event - Visibility change event
     * @private
     */
    handleVisibilityChange(event) {
      if (document.hidden) {
        // Tab is hidden
        this.isVisible = false;
        
        // Pause simulation if it was running
        if (this.engine.running) {
          this.wasPaused = false;
          this.engine.stop();
        } else {
          this.wasPaused = true;
        }
      } else {
        // Tab is visible again
        this.isVisible = true;
        
        // Resume simulation if it wasn't paused before
        if (!this.wasPaused) {
          this.engine.start();
        }
        
        // Reset metrics
        this.metrics.minFrameTime = Infinity;
        this.metrics.maxFrameTime = 0;
        this.startTime = performance.now();
        this.frameCount = 0;
      }
    }
    
    /**
     * Detect vsync status
     * @private
     */
    detectVsyncStatus() {
      // Check if we can detect vsync
      if (!window.requestAnimationFrame) {
        this.metrics.vsyncStatus = 'unknown';
        return;
      }
      
      // Measure time between rAF calls
      let frameCount = 0;
      const timestamps = [];
      
      const measure = (timestamp) => {
        timestamps.push(timestamp);
        frameCount++;
        
        if (frameCount < 20) {
          requestAnimationFrame(measure);
        } else {
          // Calculate intervals between frames
          const intervals = [];
          for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
          }
          
          // Calculate standard deviation
          const avg = this.calculateAverage(intervals);
          let sum = 0;
          for (let i = 0; i < intervals.length; i++) {
            sum += Math.pow(intervals[i] - avg, 2);
          }
          const stdDev = Math.sqrt(sum / intervals.length);
          
          // Determine if vsync is enabled
          if (Math.abs(avg - 16.67) < 2 && stdDev < 2) {
            this.metrics.vsyncStatus = 'enabled';
          } else if (avg < 8) {
            this.metrics.vsyncStatus = 'disabled';
          } else {
            this.metrics.vsyncStatus = 'unknown';
          }
        }
      };
      
      requestAnimationFrame(measure);
    }
    
    /**
     * Emit an event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     * @private
     */
    emitEvent(eventName, data) {
      // For integration with event systems, would dispatch event to listeners
      if (this.engine.emit) {
        this.engine.emit(eventName, data);
      }
      
      // Also dispatch DOM event for external listeners
      const event = new CustomEvent(eventName, { detail: data });
      document.dispatchEvent(event);
    }
    
    /**
     * Reset metrics
     */
    reset() {
      // Reset metrics
      this.metrics = {
        fps: 0,
        frameTime: 0,
        minFrameTime: Infinity,
        maxFrameTime: 0,
        avgFrameTime: 0,
        updateTime: 0,
        renderTime: 0,
        idleTime: 0,
        gcTime: 0,
        physicsTime: 0,
        particleCount: 0,
        activeParticles: 0,
        memory: this.metrics.memory,
        vsyncStatus: this.metrics.vsyncStatus
      };
      
      // Reset history buffers
      this.frameTimeHistory.fill(0);
      this.fpsHistory.fill(0);
      this.updateTimeHistory.fill(0);
      this.renderTimeHistory.fill(0);
      this.physicsTimeHistory.fill(0);
      this.memoryHistory.fill(0);
      this.particleCountHistory.fill(0);
      
      // Reset custom metric history
      for (const metric in this.customMetricHistory) {
        this.customMetricHistory[metric].fill(0);
      }
      
      // Reset counters
      this.startTime = performance.now();
      this.lastFrameTime = this.startTime;
      this.frameCount = 0;
      this.historyIndex = 0;
      this.lowFpsCount = 0;
      this.fpsAlertTriggered = false;
      this.memoryAlertTriggered = false;
    }
    
    /**
     * Dispose performance monitor
     */
    dispose() {
      // Remove DOM elements
      if (this.statsContainer && this.statsContainer.parentNode) {
        this.statsContainer.parentNode.removeChild(this.statsContainer);
      }
      
      if (this.graphCanvas && this.graphCanvas.parentNode) {
        this.graphCanvas.parentNode.removeChild(this.graphCanvas);
      }
      
      // Remove event listeners
      if (this.options.autoStartStop) {
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      }
      
      // Clear references
      this.engine = null;
      this.statsContainer = null;
      this.graphCanvas = null;
      this.graphCtx = null;
    }
  }
  
  export default PerformanceMonitor;