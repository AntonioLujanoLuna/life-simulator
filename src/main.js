/**
 * main.js - Life Simulator Entry Point
 * 
 * This file initializes and runs the life simulator that breaks Newton's Third Law.
 * It sets up the canvas, UI controls, and simulation engine.
 */

// Import core modules
import Engine from './core/Engine.js';
import ParticleSystem from './core/Particles.js';
import RuleMatrix from './core/Rules.js';

// Import physics modules
import ForceCalculator from './physics/Forces.js';
import Integrator from './physics/Integrator.js';
import { Quadtree } from './physics/Spatial.js';

// Import rendering modules
import Camera from './rendering/Camera.js';
import Renderer from './rendering/Renderer.js';
import ColorManager from './rendering/Colors.js';

// Import UI modules
import Controls from './ui/Controls.js';
import Sliders from './ui/Sliders.js';
import TypeEditor from './ui/TypeEditor.js';

// Import utility modules
import Vector2 from './utils/Vector2.js';
import Random from './utils/Random.js';
import PerformanceMonitor from './utils/Performance.js';

/**
 * LifeSimulator class - Main application wrapper
 */
class LifeSimulator {
  /**
   * Initialize the life simulator
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Default configuration
    this.config = Object.assign({
      // Canvas configuration
      canvasId: 'simulation-canvas',
      width: window.innerWidth,
      height: window.innerHeight,
      
      // Simulation settings
      initialParticles: 500,
      maxParticles: 5000,
      worldWidth: 2000,
      worldHeight: 2000,
      typeCount: 3,
      fixedTimestep: 16, // 16ms = ~60fps
      
      // UI settings
      showControls: true,
      controlsPosition: 'right',
      showTypeEditor: true,
      showStats: true,
      
      // Performance settings
      useWorker: false,
      useSpatialHash: true,
      maxQuadtreeDepth: 8,
      
      // Visual settings
      renderQuality: 'normal', // 'fast', 'normal', 'detailed'
      useTrails: false,
      particleGlow: false,
      backgroundColor: '#111111',
      
      // Physics settings
      integrationMethod: 'verlet', // 'euler', 'verlet', 'rk4'
      damping: 0.999,
      boundaryHandling: 'none', // 'reflect', 'wrap', 'absorb', 'attract', 'none'
      
      // Rule presets
      initialPreset: 'orbital'
    }, options);
    
    // Internal state
    this.running = false;
    this.paused = false;
    this.initialized = false;
    this.canvas = null;
    this.container = null;
    this.controlsContainer = null;
    
    // Components will be initialized in init()
    this.engine = null;
    this.particles = null;
    this.rules = null;
    this.integrator = null;
    this.forceCalculator = null;
    this.quadtree = null;
    this.camera = null;
    this.renderer = null;
    this.colorManager = null;
    this.controls = null;
    this.typeEditor = null;
    this.performanceMonitor = null;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the simulation
   * @private
   */
  init() {
    // Create canvas if it doesn't exist
    this.canvas = document.getElementById(this.config.canvasId);
    
    if (!this.canvas) {
      console.log(`Creating canvas with id ${this.config.canvasId}`);
      this.canvas = document.createElement('canvas');
      this.canvas.id = this.config.canvasId;
      document.body.appendChild(this.canvas);
    }
    
    // Set up canvas size
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    
    // Create UI containers
    this.setupUIContainers();
    
    // Initialize simulation components
    this.initSimulation();
    
    // Initialize UI components
    this.initUI();
    
    // Add event listeners
    this.addEventListeners();
    
    // Set initialized flag
    this.initialized = true;
    
    console.log('Life Simulator initialized');
  }
  
  /**
   * Set up UI containers
   * @private
   */
  setupUIContainers() {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'simulation-container';
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'hidden';
    
    // Move canvas into container
    if (this.canvas.parentNode) {
      this.canvas.parentNode.insertBefore(this.container, this.canvas);
    }
    this.container.appendChild(this.canvas);
    
    // Create controls container
    if (this.config.showControls) {
      this.controlsContainer = document.createElement('div');
      this.controlsContainer.className = 'simulation-controls';
      this.controlsContainer.style.position = 'absolute';
      
      // Position based on config
      switch (this.config.controlsPosition) {
        case 'left':
          this.controlsContainer.style.left = '10px';
          this.controlsContainer.style.top = '10px';
          break;
        case 'right':
        default:
          this.controlsContainer.style.right = '10px';
          this.controlsContainer.style.top = '10px';
          break;
      }
      
      this.container.appendChild(this.controlsContainer);
    }
    
    // Create type editor container if enabled
    if (this.config.showTypeEditor) {
      this.typeEditorContainer = document.createElement('div');
      this.typeEditorContainer.className = 'type-editor-container';
      this.typeEditorContainer.style.position = 'absolute';
      this.typeEditorContainer.style.left = '50%';
      this.typeEditorContainer.style.bottom = '10px';
      this.typeEditorContainer.style.transform = 'translateX(-50%)';
      this.typeEditorContainer.style.display = 'none'; // Hidden by default
      
      this.container.appendChild(this.typeEditorContainer);
    }
  }
  
    /**
   * Initialize simulation components
   * @private
   */
  initSimulation() {
    // Create world bounds - these will define a repeating cell in the infinite universe
    const worldBounds = {
      x: -this.config.worldWidth / 2,
      y: -this.config.worldHeight / 2,
      width: this.config.worldWidth,
      height: this.config.worldHeight
    };
    
    // Initialize particles
    this.particles = new ParticleSystem(this.config.maxParticles);
    
    // Initialize rule matrix
    this.rules = new RuleMatrix(this.config.typeCount);
    
    // Initialize spatial partitioning
    this.quadtree = new Quadtree(worldBounds, 8, this.config.maxQuadtreeDepth);
    
    // Initialize force calculator
    this.forceCalculator = new ForceCalculator(this.rules);
    
    // Initialize integrator - use infinite boundary mode by default
    this.integrator = new Integrator(this.particles, worldBounds, {
      method: this.config.integrationMethod,
      damping: this.config.damping,
      boundaryHandling: 'infinite' // Set to infinite mode instead of 'reflect', 'wrap', 'absorb'
    });
    
    // Initialize camera
    this.camera = new Camera(this.canvas, {
      initialScale: 0.5,
      worldBounds: worldBounds
    });
    
    // Initialize color manager
    this.colorManager = new ColorManager(this.config.typeCount);
    
    // Initialize renderer
    this.renderer = new Renderer(this.canvas, this.particles, this.camera, this.colorManager, {
      renderingMode: this.config.renderQuality,
      useTrails: this.config.useTrails,
      particleGlow: this.config.particleGlow,
      background: this.config.backgroundColor,
      showBoundary: true // Keep this true to show the boundary grid
    });
    
    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor(this, {
      showStats: this.config.showStats,
      autoStartStop: true
    });
    
    // Initialize engine
    this.engine = new Engine(this.canvas, {
      maxParticles: this.config.maxParticles,
      maxTypes: this.config.typeCount,
      worldWidth: this.config.worldWidth,
      worldHeight: this.config.worldHeight,
      useWorker: this.config.useWorker,
      fixedTimeStep: this.config.fixedTimestep
    });
    
    // Connect all systems to the engine
    this.engine.init(
      this.particles,
      this.rules,
      {
        quadtree: this.quadtree,
        camera: this.camera,
        renderer: this.renderer,
        integrator: this.integrator
      }
    );
    
    // Set global properties
    this.engine.forceCalculator = this.forceCalculator;
    
    // Add helper methods to engine
    this.addEngineHelpers();
    
    // Apply initial preset
    if (this.config.initialPreset) {
      this.rules.applyPreset(this.config.initialPreset);
    }
    
    // Create initial particles
    this.createInitialParticles();
  }
  
  /**
   * Add helper methods to engine
   * @private
   */
  addEngineHelpers() {
    // Method to add particles
    this.engine.addParticles = (count, options = {}) => {
      const currentCount = this.particles.getActiveCount();
      const totalCount = this.particles.count;
      
      // Generate particle options if not provided
      if (!options.distribution) {
        options.distribution = 'uniform';
      }
      
      if (!options.bounds) {
        options.bounds = {
          x: -this.config.worldWidth / 2,
          y: -this.config.worldHeight / 2,
          width: this.config.worldWidth,
          height: this.config.worldHeight
        };
      }
      
      // Generate random particles
      const newParticles = Random.particles(count, options);
      
      // Add each particle
      for (let i = 0; i < newParticles.length; i++) {
        const p = newParticles[i];
        
        // If particle type not specified, assign random type
        const type = options.type !== undefined ? options.type : 
                    Math.floor(Random.random() * this.config.typeCount);
        
        this.particles.create({
          x: p.x,
          y: p.y,
          vx: p.vx,
          vy: p.vy,
          mass: options.mass || 1.0,
          size: options.size || 5.0,
          type: type
        });
      }
      
      return this.particles.getActiveCount() - currentCount;
    };
    
    // Method to remove particles
    this.engine.removeParticles = (count, options = {}) => {
      const currentCount = this.particles.getActiveCount();
      
      if (count >= currentCount) {
        // Remove all particles
        for (let i = 0; i < this.particles.count; i++) {
          if (this.particles.active[i]) {
            this.particles.remove(i);
          }
        }
        return currentCount;
      }
      
      // If type specified, remove particles of that type
      if (options.type !== undefined) {
        return this.particles.removeByType(options.type);
      }
      
      // Otherwise remove random particles
      let removed = 0;
      const indices = [];
      
      // Collect active particle indices
      for (let i = 0; i < this.particles.count; i++) {
        if (this.particles.active[i]) {
          indices.push(i);
        }
      }
      
      // Shuffle and remove
      Random.shuffle(indices);
      for (let i = 0; i < Math.min(count, indices.length); i++) {
        this.particles.remove(indices[i]);
        removed++;
      }
      
      return removed;
    };
    
    // Method to update particle property
    this.engine.updateParticleProperty = (typeId, property, value) => {
      let updated = 0;
      
      for (let i = 0; i < this.particles.count; i++) {
        if (this.particles.active[i] && this.particles.types[i] === typeId) {
          switch (property) {
            case 'mass':
              this.particles.masses[i] = value;
              break;
            case 'size':
              this.particles.sizes[i] = value;
              break;
            case 'friction':
              // Friction would be applied in the integrator
              break;
            case 'fixed':
              // This would be a flag to prevent movement
              break;
            default:
              // Custom properties
              const propIdx = i * 4;
              const propMap = { 'charge': 0, 'custom1': 1, 'custom2': 2, 'custom3': 3 };
              if (propMap[property] !== undefined) {
                this.particles.properties[propIdx + propMap[property]] = value;
              }
              break;
          }
          updated++;
        }
      }
      
      return updated;
    };
    
    // Method to set global forces
    this.engine.setGlobalForce = (forceType, value) => {
      // Initialize global forces object if doesn't exist
      if (!this.engine.globalForces) {
        this.engine.globalForces = {};
      }
      
      // Set or remove force
      if (value === null) {
        delete this.engine.globalForces[forceType];
      } else {
        this.engine.globalForces[forceType] = value;
      }
      
      return true;
    };
    
    // Method to update type count
    this.engine.setTypeCount = (count) => {
      const oldCount = this.rules.typeCount;
      
      // Validate input
      count = Math.max(1, Math.min(10, count));
      
      if (count === oldCount) return false;
      
      // Update rules matrix
      this.rules.reset(count);
      
      // Update color manager
      this.colorManager = new ColorManager(count);
      this.renderer.colorManager = this.colorManager;
      
      // If reducing types, convert existing particles
      if (count < oldCount) {
        for (let i = 0; i < this.particles.count; i++) {
          if (this.particles.active[i] && this.particles.types[i] >= count) {
            this.particles.types[i] = count - 1;
          }
        }
      }
      
      // Update config
      this.config.typeCount = count;
      
      return true;
    };
  }
  
  /**
   * Create initial particles
   * @private
   */
  createInitialParticles() {
    // Distribution options based on preset
    let options = {
      distribution: 'uniform',
      velocityScale: 0.5
    };
    
    // Adjust based on preset
    switch (this.config.initialPreset) {
      case 'orbital':
        options = {
          distribution: 'circle',
          velocityType: 'circular',
          velocityScale: 1.0
        };
        break;
      case 'segregation':
        options = {
          distribution: 'uniform',
          velocityScale: 0.2
        };
        break;
      case 'food_chain':
        options = {
          distribution: 'clusters',
          clusterCount: 4,
          velocityScale: 0.3
        };
        break;
      case 'crystal_formation':
        options = {
          distribution: 'gaussian',
          velocityScale: 0.1
        };
        break;
    }
    
    // Add particles
    this.engine.addParticles(this.config.initialParticles, options);
  }
  
  /**
   * Initialize UI components
   * @private
   */
  initUI() {
    // Initialize controls if enabled
    if (this.config.showControls && this.controlsContainer) {
      this.controls = new Controls(this.engine, this.controlsContainer, {
        theme: 'dark',
        position: this.config.controlsPosition,
        showDebugControls: false
      });
    }
    
    // Initialize type editor if enabled
    if (this.config.showTypeEditor && this.typeEditorContainer) {
      this.typeEditor = new TypeEditor(this.engine, this.typeEditorContainer, {
        theme: 'dark',
        showPreview: true,
        editAsymmetry: true,
        autoApply: true
      });
    }
  }
  
  /**
   * Add event listeners
   * @private
   */
  addEventListeners() {
    // Window resize handler
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Key press handler for shortcuts
    window.addEventListener('keydown', this.handleKeyPress.bind(this));
    
    // Canvas click handler
    this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    
    // Double click handler for adding particles
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
  }
  
  /**
   * Handle window resize
   * @private
   */
  handleResize() {
    // Update canvas size
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // Update renderer if initialized
    if (this.renderer) {
      this.renderer.handleResize();
    }
  }
  
  /**
   * Handle key press
   * @param {KeyboardEvent} event - Key event
   * @private
   */
  handleKeyPress(event) {
    switch (event.key) {
      case ' ':
        // Space - toggle pause
        this.togglePause();
        break;
      case 'r':
        // R - reset simulation
        this.reset();
        break;
      case 'c':
        // C - center camera
        if (this.camera) {
          this.camera.reset(500);
        }
        break;
      case 't':
        // T - toggle type editor
        this.toggleTypeEditor();
        break;
      case '+':
      case '=':
        // Plus - zoom in
        if (this.camera) {
          this.camera.setZoom(this.camera.scale * 1.2);
        }
        break;
      case '-':
        // Minus - zoom out
        if (this.camera) {
          this.camera.setZoom(this.camera.scale / 1.2);
        }
        break;
      case 'p':
        // P - take screenshot
        this.takeScreenshot();
        break;
    }
  }
  
  /**
   * Handle canvas click
   * @param {MouseEvent} event - Mouse event
   * @private
   */
  handleCanvasClick(event) {
    // Convert screen coordinates to world coordinates
    const rect = this.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    
    // Get world coordinates from camera
    const worldPos = this.camera.screenToWorld(screenX, screenY);
    
    // Log position
    console.log('Click at:', worldPos);
    
    // If shift key held, add particle at click position
    if (event.shiftKey) {
      const type = event.ctrlKey ? 
        Math.floor(Random.random() * this.config.typeCount) : 0;
      
      this.engine.addParticles(1, {
        bounds: {
          x: worldPos.x - 5,
          y: worldPos.y - 5,
          width: 10,
          height: 10
        },
        type: type,
        velocityScale: 0.2
      });
    }
  }
  
  /**
   * Handle double click
   * @param {MouseEvent} event - Mouse event
   * @private
   */
  handleDoubleClick(event) {
    // Add cluster of particles at double click position
    const rect = this.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    
    // Get world coordinates from camera
    const worldPos = this.camera.screenToWorld(screenX, screenY);
    
    // Add cluster of particles
    const count = event.shiftKey ? 50 : 10;
    const radius = event.shiftKey ? 50 : 20;
    
    this.engine.addParticles(count, {
      distribution: 'circle',
      bounds: {
        x: worldPos.x - radius,
        y: worldPos.y - radius,
        width: radius * 2,
        height: radius * 2
      },
      velocityScale: 0.1
    });
  }
  
  /**
   * Start the simulation
   */
  start() {
    if (!this.initialized) {
      console.warn('Cannot start: simulation not initialized');
      return false;
    }
    
    if (this.running) {
      console.warn('Simulation already running');
      return false;
    }
    
    // Start engine
    this.engine.start();
    this.running = true;
    this.paused = false;
    
    // Hide the loading overlay
    const loadingOverlay = document.getElementById('loading-overlay'); // Assuming this ID
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
    
    console.log('Simulation started');
    return true;
  }
  
  /**
   * Stop the simulation
   */
  stop() {
    if (!this.running) {
      console.warn('Simulation not running');
      return false;
    }
    
    // Stop engine
    this.engine.stop();
    this.running = false;
    
    console.log('Simulation stopped');
    return true;
  }
  
  /**
   * Pause or unpause the simulation
   */
  togglePause() {
    if (!this.running && !this.paused) {
      // Not running or paused, start it
      return this.start();
    }
    
    if (this.paused) {
      // Currently paused, unpause
      this.engine.start();
      this.paused = false;
      this.running = true;
      console.log('Simulation unpaused');
    } else {
      // Currently running, pause
      this.engine.stop();
      this.paused = true;
      this.running = false;
      console.log('Simulation paused');
    }
    
    return true;
  }
  
  /**
   * Reset the simulation
   */
  reset() {
    // Save running state
    const wasRunning = this.running;
    
    // Stop if running
    if (this.running) {
      this.stop();
    }
    
    // Reset engine
    this.engine.reset();
    
    // Reset camera
    this.camera.reset();
    
    // Create initial particles
    this.createInitialParticles();
    
    // Restart if it was running
    if (wasRunning) {
      this.start();
    }
    
    console.log('Simulation reset');
    return true;
  }
  
  /**
   * Toggle type editor visibility
   */
  toggleTypeEditor() {
    if (!this.config.showTypeEditor || !this.typeEditorContainer) {
      return false;
    }
    
    if (this.typeEditorContainer.style.display === 'none') {
      this.typeEditorContainer.style.display = 'block';
    } else {
      this.typeEditorContainer.style.display = 'none';
    }
    
    return true;
  }
  
  /**
   * Take a screenshot of the current simulation
   */
  takeScreenshot() {
    if (!this.canvas) {
      console.warn('Cannot take screenshot: canvas not available');
      return false;
    }
    
    try {
      // Create download link
      const link = document.createElement('a');
      link.download = `life-simulator-${Date.now()}.png`;
      link.href = this.canvas.toDataURL('image/png');
      link.click();
      return true;
    } catch (e) {
      console.error('Failed to take screenshot:', e);
      return false;
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    // Stop if running
    if (this.running) {
      this.stop();
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyPress);
    this.canvas.removeEventListener('click', this.handleCanvasClick);
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
    
    // Dispose components
    if (this.engine) this.engine.dispose();
    if (this.renderer) this.renderer.dispose();
    if (this.controls) this.controls.dispose();
    if (this.performanceMonitor) this.performanceMonitor.dispose();
    
    // Clean up references
    this.engine = null;
    this.particles = null;
    this.rules = null;
    this.integrator = null;
    this.forceCalculator = null;
    this.quadtree = null;
    this.camera = null;
    this.renderer = null;
    this.colorManager = null;
    this.controls = null;
    this.typeEditor = null;
    this.performanceMonitor = null;
    
    console.log('Simulation disposed');
    return true;
  }
}

// Create and start life simulator when page loads
window.addEventListener('load', () => {
  const simulator = new LifeSimulator({
    initialParticles: 500,
    initialPreset: 'orbital'
  });
  
  // Start simulation
  simulator.start();
  
  // Make available globally for debugging
  window.simulator = simulator;
});

export default LifeSimulator;