/**
 * Controls.js - Main UI controls manager
 * 
 * Features:
 * - Centralized UI controls management
 * - Event handling and parameter synchronization
 * - Dynamic UI element creation
 * - Preset management
 */

class Controls {
    /**
     * Create a new controls manager
     * @param {Object} engine - Simulation engine
     * @param {HTMLElement} container - Container element for controls
     * @param {Object} options - Configuration options
     */
    constructor(engine, container, options = {}) {
      this.engine = engine;
      this.container = container;
      
      // Default options
      this.options = Object.assign({
        theme: 'dark',                         // 'dark' or 'light'
        position: 'right',                     // 'left', 'right', 'top', 'bottom'
        width: '280px',                        // Width of control panel
        collapsed: false,                      // Start collapsed
        collapsible: true,                     // Allow collapsing panel
        showPresets: true,                     // Show preset controls
        showParticleControls: true,            // Show particle controls
        showVisualControls: true,              // Show visual controls
        showDebugControls: false,              // Show debug controls
        useTooltips: true,                     // Show tooltips
        floatingControls: false,               // Use floating controls instead of panel
        savePreferences: true,                 // Save preferences in localStorage
        localStorageKey: 'life_simulator_prefs', // Key for localStorage
        confirmReset: true,                    // Confirm before reset
        showResetButton: true,                 // Show reset button
        showTitleBar: true,                    // Show title bar
        title: 'Simulation Controls',          // Title bar text
        customCssClass: '',                    // Additional CSS class
        maxPresets: 10,                        // Maximum number of custom presets
        debugMode: false,                      // Enable debug features
      }, options);
      
      // Internal state
      this.isCollapsed = this.options.collapsed;
      this.activeTab = 'simulation';
      this.sliders = {};
      this.buttons = {};
      this.checkboxes = {};
      this.selects = {};
      this.colorPickers = {};
      this.customControls = {};
      this.presets = [];
      this.activePresetId = null;
      
      // CSS styles
      this.styles = {
        dark: {
          background: '#1a1a1a',
          text: '#ffffff',
          slider: '#505050',
          sliderThumb: '#909090',
          button: '#3a3a3a',
          buttonHover: '#505050',
          buttonActive: '#606060',
          input: '#303030',
          border: '#505050',
          tab: '#252525',
          tabActive: '#3a3a3a',
          tabHover: '#353535',
        },
        light: {
          background: '#f5f5f5',
          text: '#2a2a2a',
          slider: '#cccccc',
          sliderThumb: '#707070',
          button: '#e0e0e0',
          buttonHover: '#d0d0d0',
          buttonActive: '#c0c0c0',
          input: '#ffffff',
          border: '#cccccc',
          tab: '#e8e8e8',
          tabActive: '#ffffff',
          tabHover: '#f0f0f0',
        }
      };
      
      // Initialize UI
      this.init();
    }
    
    /**
     * Initialize the controls
     * @private
     */
    init() {
      // Load saved preferences if enabled
      if (this.options.savePreferences) {
        this.loadPreferences();
      }
      
      // Create control panel elements
      this.createControlPanel();
      
      // Create tabs
      this.createTabs();
      
      // Create control sections
      this.createSimulationControls();
      this.createParticleControls();
      this.createVisualControls();
      this.createPresetControls();
      
      if (this.options.showDebugControls || this.options.debugMode) {
        this.createDebugControls();
      }
      
      // Register general event handlers
      this.registerEvents();
      
      // Apply initial settings
      this.applySettings();
    }
    
    /**
     * Create the main control panel
     * @private
     */
    createControlPanel() {
      // Create panel container
      this.panel = document.createElement('div');
      this.panel.className = `sim-control-panel ${this.options.theme} ${this.options.position} ${this.options.customCssClass}`;
      
      // Add custom styles
      const style = document.createElement('style');
      style.textContent = this.generateCss();
      document.head.appendChild(style);
      
      // Set width
      this.panel.style.width = this.options.width;
      
      // Create title bar if enabled
      if (this.options.showTitleBar) {
        const titleBar = document.createElement('div');
        titleBar.className = 'sim-control-title';
        titleBar.textContent = this.options.title;
        
        if (this.options.collapsible) {
          const collapseBtn = document.createElement('button');
          collapseBtn.className = 'sim-collapse-btn';
          collapseBtn.innerHTML = this.isCollapsed ? '&#9654;' : '&#9664;';
          collapseBtn.addEventListener('click', () => this.toggleCollapse());
          titleBar.appendChild(collapseBtn);
          this.collapseBtn = collapseBtn;
        }
        
        this.panel.appendChild(titleBar);
      }
      
      // Create panel content container
      this.contentContainer = document.createElement('div');
      this.contentContainer.className = 'sim-control-content';
      
      if (this.isCollapsed) {
        this.contentContainer.style.display = 'none';
        this.panel.classList.add('collapsed');
      }
      
      this.panel.appendChild(this.contentContainer);
      
      // Add to container
      this.container.appendChild(this.panel);
    }
    
    /**
     * Create tab navigation
     * @private
     */
    createTabs() {
      this.tabContainer = document.createElement('div');
      this.tabContainer.className = 'sim-tab-container';
      
      this.tabContent = document.createElement('div');
      this.tabContent.className = 'sim-tab-content';
      
      // Define tabs
      const tabs = [
        { id: 'simulation', label: 'Simulation', icon: '&#9881;' },
        { id: 'particles', label: 'Particles', icon: '&#9679;' },
        { id: 'visual', label: 'Visual', icon: '&#128444;' },
        { id: 'presets', label: 'Presets', icon: '&#128190;' }
      ];
      
      if (this.options.showDebugControls || this.options.debugMode) {
        tabs.push({ id: 'debug', label: 'Debug', icon: '&#128270;' });
      }
      
      // Create tabs
      tabs.forEach(tab => {
        const tabElement = document.createElement('div');
        tabElement.className = 'sim-tab';
        tabElement.dataset.tab = tab.id;
        
        if (this.options.useTooltips) {
          tabElement.title = tab.label;
        }
        
        if (tab.id === this.activeTab) {
          tabElement.classList.add('active');
        }
        
        tabElement.innerHTML = `<span class="tab-icon">${tab.icon}</span><span class="tab-label">${tab.label}</span>`;
        
        tabElement.addEventListener('click', () => this.activateTab(tab.id));
        
        this.tabContainer.appendChild(tabElement);
        
        // Create tab content container
        const contentElement = document.createElement('div');
        contentElement.className = 'sim-tab-pane';
        contentElement.dataset.tab = tab.id;
        
        if (tab.id === this.activeTab) {
          contentElement.classList.add('active');
        }
        
        this.tabContent.appendChild(contentElement);
      });
      
      this.contentContainer.appendChild(this.tabContainer);
      this.contentContainer.appendChild(this.tabContent);
    }
    
    /**
     * Create simulation controls
     * @private
     */
    createSimulationControls() {
      const pane = this.getTabPane('simulation');
      
      // Time scale slider
      this.createSlider({
        id: 'timeScale',
        label: 'Simulation Speed',
        min: 0,
        max: 2,
        step: 0.01,
        value: 1,
        onChange: (value) => {
          this.engine.setTimeScale(value);
        }
      }, pane);
      
      // Particle count slider
      this.createSlider({
        id: 'particleCount',
        label: 'Particle Count',
        min: 10,
        max: 2000,
        step: 10,
        value: 500,
        onChange: (value) => {
          // Update particle count (engine method to be implemented)
          if (this.engine.particles) {
            const currentCount = this.engine.particles.getActiveCount();
            
            if (value > currentCount) {
              // Add particles
              this.engine.addParticles(value - currentCount);
            } else if (value < currentCount) {
              // Remove particles
              this.engine.removeParticles(currentCount - value);
            }
          }
        }
      }, pane);
      
      // Particle types slider
      this.createSlider({
        id: 'typeCount',
        label: 'Particle Types',
        min: 1,
        max: 10,
        step: 1,
        value: 3,
        onChange: (value) => {
          // Update type count (engine method to be implemented)
          if (this.engine.rules) {
            this.engine.setTypeCount(value);
          }
        }
      }, pane);
      
      // Physics method dropdown
      this.createSelect({
        id: 'physicsMethod',
        label: 'Physics Method',
        options: [
          { value: 'euler', label: 'Euler' },
          { value: 'verlet', label: 'Verlet' },
          { value: 'rk4', label: 'RK4 (Accurate)' }
        ],
        value: 'verlet',
        onChange: (value) => {
          if (this.engine.integrator) {
            this.engine.integrator.setOptions({ method: value });
          }
        }
      }, pane);
      
      // Add separator
      this.createSeparator(pane);
      
      // Boundary handling dropdown
      this.createSelect({
        id: 'boundaryHandling',
        label: 'Boundary Handling',
        options: [
          { value: 'infinite', label: 'Infinite (Unbounded)' },
          { value: 'reflect', label: 'Reflect' },
          { value: 'wrap', label: 'Wrap Around' },
          { value: 'absorb', label: 'Absorb (Remove)' },
          { value: 'attract', label: 'Attract (Pull)' }
        ],
        value: 'infinite', // Set infinite as default
        onChange: (value) => {
          if (this.engine.integrator) {
            this.engine.integrator.setOptions({ boundaryHandling: value });
          }
        }
      }, pane);
      
      // Energy conservation (damping) slider
      this.createSlider({
        id: 'damping',
        label: 'Energy Conservation',
        min: 0.9,
        max: 1.0,
        step: 0.001,
        value: 0.999,
        onChange: (value) => {
          if (this.engine.integrator) {
            this.engine.integrator.setOptions({ damping: value });
          }
        }
      }, pane);
      
      // Global forces
      this.createSeparator(pane, 'Global Forces');
      
      // Gravity checkbox
      this.createCheckbox({
        id: 'useGravity',
        label: 'Enable Gravity',
        value: false,
        onChange: (checked) => {
          // Toggle gravity
          if (this.engine.forceCalculator) {
            if (checked) {
              this.engine.setGlobalForce('gravity', { x: 0, y: 0.1 });
            } else {
              this.engine.setGlobalForce('gravity', null);
            }
          }
        }
      }, pane);
      
      // Drag (viscosity) slider
      this.createSlider({
        id: 'drag',
        label: 'Drag (Viscosity)',
        min: 0,
        max: 0.1,
        step: 0.001,
        value: 0,
        onChange: (value) => {
          if (this.engine.forceCalculator) {
            this.engine.setGlobalForce('drag', value > 0 ? value : null);
          }
        }
      }, pane);
      
      // Show grid checkbox
      this.createCheckbox({
        id: 'showGrid',
        label: 'Show Grid Lines',
        value: true,
        onChange: (checked) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ showBoundary: checked });
          }
        }
      }, pane);
      
      // Reset button
      if (this.options.showResetButton) {
        const resetButton = document.createElement('button');
        resetButton.className = 'sim-button sim-reset-button';
        resetButton.textContent = 'Reset Simulation';
        resetButton.addEventListener('click', () => {
          if (!this.options.confirmReset || confirm('Reset the simulation?')) {
            this.engine.reset();
          }
        });
        pane.appendChild(resetButton);
      }
    }
    
    /**
     * Create particle controls
     * @private
     */
    createParticleControls() {
      if (!this.options.showParticleControls) return;
      
      const pane = this.getTabPane('particles');
      
      // Type selector
      this.createSelect({
        id: 'selectedType',
        label: 'Particle Type',
        options: this.generateTypeOptions(3), // Default to 3 types
        value: '0',
        onChange: (value) => {
          // Update type editor to show this type's settings
          this.updateTypeEditor(parseInt(value, 10));
        }
      }, pane);
      
      // Create type editor container
      const editorContainer = document.createElement('div');
      editorContainer.className = 'sim-type-editor';
      pane.appendChild(editorContainer);
      this.typeEditorContainer = editorContainer;
      
      // Initial type editor setup
      this.updateTypeEditor(0);
      
      // Interaction matrix button
      const matrixButton = document.createElement('button');
      matrixButton.className = 'sim-button';
      matrixButton.textContent = 'Edit Interaction Matrix';
      matrixButton.addEventListener('click', () => {
        this.showInteractionMatrix();
      });
      pane.appendChild(matrixButton);
    }
    
    /**
     * Create visual controls
     * @private
     */
    createVisualControls() {
      if (!this.options.showVisualControls) return;
      
      const pane = this.getTabPane('visual');
      
      // Rendering style dropdown
      this.createSelect({
        id: 'renderStyle',
        label: 'Particle Style',
        options: [
          { value: 'circle', label: 'Circle' },
          { value: 'square', label: 'Square' },
          { value: 'pixel', label: 'Pixel' },
          { value: 'image', label: 'Image' }
        ],
        value: 'circle',
        onChange: (value) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ renderStyle: value });
          }
        }
      }, pane);
      
      // Color mode dropdown
      this.createSelect({
        id: 'colorMode',
        label: 'Color Mode',
        options: [
          { value: 'type', label: 'By Type' },
          { value: 'velocity', label: 'By Velocity' },
          { value: 'property', label: 'By Property' }
        ],
        value: 'type',
        onChange: (value) => {
          if (this.engine.renderer && this.engine.renderer.colorManager) {
            this.engine.renderer.colorManager.setOptions({ colorMode: value });
          }
        }
      }, pane);
      
      // Color scheme dropdown
      this.createSelect({
        id: 'colorScheme',
        label: 'Color Scheme',
        options: [
          { value: 'default', label: 'Default' },
          { value: 'rainbow', label: 'Rainbow' },
          { value: 'pastel', label: 'Pastel' },
          { value: 'vivid', label: 'Vivid' },
          { value: 'ocean', label: 'Ocean' },
          { value: 'forest', label: 'Forest' },
          { value: 'fire', label: 'Fire' },
          { value: 'grayscale', label: 'Grayscale' }
        ],
        value: 'default',
        onChange: (value) => {
          if (value !== 'default' && this.engine.renderer && this.engine.renderer.colorManager) {
            this.engine.renderer.colorManager.generateScheme(value);
          }
        }
      }, pane);
      
      // Background color picker
      this.createColorPicker({
        id: 'backgroundColor',
        label: 'Background Color',
        value: '#111111',
        onChange: (value) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ background: value });
          }
        }
      }, pane);
      
      // Visual effects section
      this.createSeparator(pane, 'Visual Effects');
      
      // Trails checkbox
      this.createCheckbox({
        id: 'useTrails',
        label: 'Particle Trails',
        value: false,
        onChange: (checked) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ useTrails: checked });
          }
        }
      }, pane);
      
      // Trail length slider (only visible when trails enabled)
      const trailLengthSlider = this.createSlider({
        id: 'trailLength',
        label: 'Trail Length',
        min: 3,
        max: 30,
        step: 1,
        value: 10,
        onChange: (value) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ trailLength: value });
          }
        }
      }, pane);
      trailLengthSlider.parentElement.style.display = 'none';
      
      // Show/hide trail length based on trails checkbox
      this.checkboxes.useTrails.addEventListener('change', (e) => {
        trailLengthSlider.parentElement.style.display = e.target.checked ? 'block' : 'none';
      });
      
      // Glow effect checkbox
      this.createCheckbox({
        id: 'particleGlow',
        label: 'Glow Effect',
        value: false,
        onChange: (checked) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ particleGlow: checked });
          }
        }
      }, pane);
      
      // Show velocity checkbox
      this.createCheckbox({
        id: 'velocityArrows',
        label: 'Show Velocity Arrows',
        value: false,
        onChange: (checked) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ velocityArrows: checked });
          }
        }
      }, pane);
      
      // Performance mode dropdown
      this.createSelect({
        id: 'renderingMode',
        label: 'Performance Mode',
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'fast', label: 'Fast (Low Quality)' },
          { value: 'detailed', label: 'Detailed (Slower)' }
        ],
        value: 'normal',
        onChange: (value) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ renderingMode: value });
          }
        }
      }, pane);
      
      // Stats overlay checkbox
      this.createCheckbox({
        id: 'statsOverlay',
        label: 'Show Performance Stats',
        value: false,
        onChange: (checked) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ statsOverlay: checked });
          }
        }
      }, pane);
    }
    
    /**
     * Create preset controls
     * @private
     */
    createPresetControls() {
      if (!this.options.showPresets) return;
      
      const pane = this.getTabPane('presets');
      
      // Preset selector
      this.createSelect({
        id: 'presetSelector',
        label: 'Simulation Presets',
        options: [
          { value: 'basic_attraction', label: 'Basic Attraction' },
          { value: 'orbital', label: 'Orbital System' },
          { value: 'segregation', label: 'Segregation' },
          { value: 'food_chain', label: 'Food Chain' },
          { value: 'crystal_formation', label: 'Crystal Growth' },
        ],
        value: '',
        onChange: (value) => {
          if (value && this.engine.rules) {
            this.engine.rules.applyPreset(value);
            this.activePresetId = value;
          }
        }
      }, pane);
      
      // Load preset button
      const loadButton = document.createElement('button');
      loadButton.className = 'sim-button';
      loadButton.textContent = 'Load Preset';
      loadButton.addEventListener('click', () => {
        const presetId = this.selects.presetSelector.value;
        if (presetId && this.engine.rules) {
          this.engine.rules.applyPreset(presetId);
          this.activePresetId = presetId;
        }
      });
      pane.appendChild(loadButton);
      
      // Saved presets section
      this.createSeparator(pane, 'Saved Presets');
      
      // Custom presets container
      this.customPresetsContainer = document.createElement('div');
      this.customPresetsContainer.className = 'sim-custom-presets';
      pane.appendChild(this.customPresetsContainer);
      
      // Update custom presets display
      this.updateCustomPresets();
      
      // Save current preset
      const saveContainer = document.createElement('div');
      saveContainer.className = 'sim-save-preset';
      
      const presetNameInput = document.createElement('input');
      presetNameInput.type = 'text';
      presetNameInput.placeholder = 'Preset Name';
      presetNameInput.className = 'sim-input';
      saveContainer.appendChild(presetNameInput);
      
      const saveButton = document.createElement('button');
      saveButton.className = 'sim-button';
      saveButton.textContent = 'Save Current';
      saveButton.addEventListener('click', () => {
        const name = presetNameInput.value.trim();
        if (name) {
          this.saveCurrentPreset(name);
          presetNameInput.value = '';
        } else {
          alert('Please enter a preset name');
        }
      });
      saveContainer.appendChild(saveButton);
      
      pane.appendChild(saveContainer);
      
      // Import/Export section
      this.createSeparator(pane, 'Import/Export');
      
      // Export button
      const exportButton = document.createElement('button');
      exportButton.className = 'sim-button';
      exportButton.textContent = 'Export All Presets';
      exportButton.addEventListener('click', () => {
        this.exportPresets();
      });
      pane.appendChild(exportButton);
      
      // Import button
      const importButton = document.createElement('button');
      importButton.className = 'sim-button';
      importButton.textContent = 'Import Presets';
      importButton.addEventListener('click', () => {
        this.importPresets();
      });
      pane.appendChild(importButton);
    }
    
    /**
     * Create debug controls
     * @private
     */
    createDebugControls() {
      const pane = this.getTabPane('debug');
      
      // Show quadtree checkbox
      this.createCheckbox({
        id: 'showQuadtree',
        label: 'Show Spatial Partitioning',
        value: false,
        onChange: (checked) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ showQuadtree: checked });
          }
        }
      }, pane);
      
      // Show forces checkbox
      this.createCheckbox({
        id: 'showForces',
        label: 'Show Force Vectors',
        value: false,
        onChange: (checked) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ showForces: checked });
          }
        }
      }, pane);
      
      // Force scale slider
      this.createSlider({
        id: 'forceScale',
        label: 'Force Vector Scale',
        min: 1,
        max: 50,
        step: 1,
        value: 10,
        onChange: (value) => {
          if (this.engine.renderer) {
            this.engine.renderer.setOptions({ forceScale: value });
          }
        }
      }, pane);
      
      // Camera debug checkbox
      this.createCheckbox({
        id: 'cameraDebug',
        label: 'Show Camera Debug Info',
        value: false,
        onChange: (checked) => {
          if (this.engine.camera) {
            this.engine.camera.debug = checked;
          }
        }
      }, pane);
      
      // Physics debug section
      this.createSeparator(pane, 'Physics Debug');
      
      // Physics sub-steps slider
      this.createSlider({
        id: 'physicsSubSteps',
        label: 'Physics Sub-steps',
        min: 1,
        max: 10,
        step: 1,
        value: 1,
        onChange: (value) => {
          if (this.engine.integrator) {
            this.engine.integrator.setOptions({ subSteps: value });
          }
        }
      }, pane);
      
      // Constraint iterations slider
      this.createSlider({
        id: 'constraintIterations',
        label: 'Constraint Iterations',
        min: 1,
        max: 10,
        step: 1,
        value: 1,
        onChange: (value) => {
          if (this.engine.integrator) {
            this.engine.integrator.setOptions({ constraintIterations: value });
          }
        }
      }, pane);
      
      // Use worker checkbox
      this.createCheckbox({
        id: 'useWorker',
        label: 'Use Web Worker (Threaded)',
        value: false,
        onChange: (checked) => {
          // This requires engine restart
          if (confirm('This will reset the simulation. Continue?')) {
            this.engine.options.useWorker = checked;
            this.engine.reset();
          } else {
            // Revert checkbox state
            this.checkboxes.useWorker.checked = !checked;
          }
        }
      }, pane);
      
      // Log performances button
      const logButton = document.createElement('button');
      logButton.className = 'sim-button';
      logButton.textContent = 'Log Performance Data';
      logButton.addEventListener('click', () => {
        // Log performance metrics
        console.group('Performance Metrics');
        
        if (this.engine.metrics) {
          console.table(this.engine.metrics);
        }
        
        if (this.engine.renderer && this.engine.renderer.stats) {
          console.log('Renderer Stats:', this.engine.renderer.stats);
        }
        
        if (this.engine.quadtree) {
          console.log('Quadtree Metrics:', this.engine.quadtree.getPerformanceMetrics());
        }
        
        if (this.engine.integrator) {
          console.log('Integrator Metrics:', this.engine.integrator.getPerformanceMetrics());
        }
        
        console.groupEnd();
      });
      pane.appendChild(logButton);
    }
    
    /**
     * Update type editor for a specific particle type
     * @param {number} typeId - Type ID to edit
     * @private
     */
    updateTypeEditor(typeId) {
      // Clear editor container
      this.typeEditorContainer.innerHTML = '';
      
      // Create type-specific controls
      
      // Type color picker
      this.createColorPicker({
        id: `typeColor${typeId}`,
        label: 'Type Color',
        value: this.getTypeColor(typeId),
        onChange: (value) => {
          if (this.engine.renderer && this.engine.renderer.colorManager) {
            this.engine.renderer.colorManager.setTypeColor(typeId, value);
          }
        }
      }, this.typeEditorContainer);
      
      // Type size multiplier
      this.createSlider({
        id: `typeSize${typeId}`,
        label: 'Size Multiplier',
        min: 0.2,
        max: 3,
        step: 0.1,
        value: 1.0,
        onChange: (value) => {
          if (this.engine.renderer && this.engine.renderer.colorManager) {
            this.engine.renderer.colorManager.setTypeSizeMultiplier(typeId, value);
          }
        }
      }, this.typeEditorContainer);
      
      // Type mass
      this.createSlider({
        id: `typeMass${typeId}`,
        label: 'Mass',
        min: 0.1,
        max: 10,
        step: 0.1,
        value: 1.0,
        onChange: (value) => {
          // Update mass for all particles of this type
          if (this.engine.particles) {
            this.engine.updateParticleProperty(typeId, 'mass', value);
          }
        }
      }, this.typeEditorContainer);
      
      // Self-interaction strength
      this.createSlider({
        id: `typeSelfAttraction${typeId}`,
        label: 'Self-Attraction',
        min: -2,
        max: 2,
        step: 0.1,
        value: this.getTypeInteraction(typeId, typeId).attractionStrength,
        onChange: (value) => {
          if (this.engine.rules) {
            this.engine.rules.setRule(typeId, typeId, { attractionStrength: value });
          }
        }
      }, this.typeEditorContainer);
      
      // Self-repulsion strength
      this.createSlider({
        id: `typeSelfRepulsion${typeId}`,
        label: 'Self-Repulsion',
        min: 0,
        max: 5,
        step: 0.1,
        value: this.getTypeInteraction(typeId, typeId).repulsionStrength,
        onChange: (value) => {
          if (this.engine.rules) {
            this.engine.rules.setRule(typeId, typeId, { repulsionStrength: value });
          }
        }
      }, this.typeEditorContainer);
      
      // Add interactions with other types
      if (this.engine.rules && this.engine.rules.typeCount > 1) {
        this.createSeparator(this.typeEditorContainer, 'Interactions with Other Types');
        
        for (let otherType = 0; otherType < this.engine.rules.typeCount; otherType++) {
          if (otherType === typeId) continue;
          
          const interaction = this.getTypeInteraction(typeId, otherType);
          
          // Group for this interaction
          const group = document.createElement('div');
          group.className = 'sim-interaction-group';
          
          // Type label
          const label = document.createElement('div');
          label.className = 'sim-group-label';
          label.textContent = `Type ${otherType + 1}`;
          label.style.color = this.getTypeColorCss(otherType);
          group.appendChild(label);
          
          // Attraction strength
          this.createSlider({
            id: `typeAttract${typeId}_${otherType}`,
            label: 'Attraction',
            min: -2,
            max: 2,
            step: 0.1,
            value: interaction.attractionStrength,
            onChange: (value) => {
              if (this.engine.rules) {
                this.engine.rules.setRule(typeId, otherType, { attractionStrength: value });
              }
            }
          }, group);
          
          // Asymmetry slider
          this.createSlider({
            id: `typeAsymmetry${typeId}_${otherType}`,
            label: 'Asymmetry',
            min: 0,
            max: 1,
            step: 0.01,
            value: interaction.asymmetry,
            onChange: (value) => {
              if (this.engine.rules) {
                this.engine.rules.setRule(typeId, otherType, { asymmetry: value });
              }
            },
            tooltip: '0 = One-way force, 1 = Symmetric (Newton\'s Third Law)'
          }, group);
          
          this.typeEditorContainer.appendChild(group);
        }
      }
    }
    
    /**
     * Show interaction matrix editor
     * @private
     */
    showInteractionMatrix() {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'sim-modal-overlay';
      
      // Create modal container
      const modal = document.createElement('div');
      modal.className = 'sim-modal sim-matrix-editor';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'sim-modal-header';
      header.innerHTML = `
        <h3>Interaction Matrix</h3>
        <button class="sim-modal-close">&times;</button>
      `;
      modal.appendChild(header);
      
      // Close button handler
      const closeBtn = header.querySelector('.sim-modal-close');
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
      
      // Create matrix container
      const matrixContainer = document.createElement('div');
      matrixContainer.className = 'sim-matrix-container';
      
      // Get type count
      const typeCount = this.engine.rules ? this.engine.rules.typeCount : 3;
      
      // Create matrix header
      const matrixHeader = document.createElement('div');
      matrixHeader.className = 'sim-matrix-header';
      
      // Empty corner cell
      const cornerCell = document.createElement('div');
      cornerCell.className = 'sim-matrix-corner';
      cornerCell.textContent = 'From ↓ To →';
      matrixHeader.appendChild(cornerCell);
      
      // Column headers (to)
      for (let j = 0; j < typeCount; j++) {
        const headerCell = document.createElement('div');
        headerCell.className = 'sim-matrix-col-header';
        headerCell.textContent = `Type ${j + 1}`;
        headerCell.style.backgroundColor = this.getTypeColorCss(j, 0.3);
        matrixHeader.appendChild(headerCell);
      }
      
      matrixContainer.appendChild(matrixHeader);
      
      // Create matrix rows
      for (let i = 0; i < typeCount; i++) {
        const row = document.createElement('div');
        row.className = 'sim-matrix-row';
        
        // Row header (from)
        const rowHeader = document.createElement('div');
        rowHeader.className = 'sim-matrix-row-header';
        rowHeader.textContent = `Type ${i + 1}`;
        rowHeader.style.backgroundColor = this.getTypeColorCss(i, 0.3);
        row.appendChild(rowHeader);
        
        // Cells
        for (let j = 0; j < typeCount; j++) {
          const cell = document.createElement('div');
          cell.className = 'sim-matrix-cell';
          
          // Direction indicator for asymmetric forces
          const dirIndicator = document.createElement('div');
          dirIndicator.className = 'sim-direction-indicator';
          dirIndicator.innerHTML = '→';
          
          // Get current interaction
          const interaction = this.getTypeInteraction(i, j);
          const reverseInteraction = this.getTypeInteraction(j, i);
          
          // Create cell content
          const cellContent = document.createElement('div');
          cellContent.className = 'sim-matrix-cell-content';
          
          // Attraction value
          const attraLabel = document.createElement('div');
          attraLabel.className = 'sim-matrix-label';
          attraLabel.textContent = 'Attr:';
          cellContent.appendChild(attraLabel);
          
          const attraValue = document.createElement('input');
          attraValue.type = 'number';
          attraValue.className = 'sim-matrix-input';
          attraValue.min = -5;
          attraValue.max = 5;
          attraValue.step = 0.1;
          attraValue.value = interaction.attractionStrength;
          attraValue.addEventListener('change', () => {
            if (this.engine.rules) {
              this.engine.rules.setRule(i, j, { 
                attractionStrength: parseFloat(attraValue.value) 
              });
            }
          });
          cellContent.appendChild(attraValue);
          
          // Repulsion value
          const repulLabel = document.createElement('div');
          repulLabel.className = 'sim-matrix-label';
          repulLabel.textContent = 'Repul:';
          cellContent.appendChild(repulLabel);
          
          const repulValue = document.createElement('input');
          repulValue.type = 'number';
          repulValue.className = 'sim-matrix-input';
          repulValue.min = 0;
          repulValue.max = 5;
          repulValue.step = 0.1;
          repulValue.value = interaction.repulsionStrength;
          repulValue.addEventListener('change', () => {
            if (this.engine.rules) {
              this.engine.rules.setRule(i, j, { 
                repulsionStrength: parseFloat(repulValue.value) 
              });
            }
          });
          cellContent.appendChild(repulValue);
          
          // Asymmetry factor
          if (i !== j) {  // Only for interactions between different types
            const asymLabel = document.createElement('div');
            asymLabel.className = 'sim-matrix-label';
            asymLabel.textContent = 'Asym:';
            cellContent.appendChild(asymLabel);
            
            const asymValue = document.createElement('input');
            asymValue.type = 'range';
            asymValue.className = 'sim-matrix-slider';
            asymValue.min = 0;
            asymValue.max = 1;
            asymValue.step = 0.01;
            asymValue.value = interaction.asymmetry;
            
            // Update direction indicator based on asymmetry
            const updateDirection = () => {
              const value = parseFloat(asymValue.value);
              if (value === 0) {
                dirIndicator.innerHTML = '→';
                dirIndicator.style.opacity = '1';
              } else if (value === 1) {
                dirIndicator.innerHTML = '↔';
                dirIndicator.style.opacity = '1';
              } else {
                dirIndicator.innerHTML = '⇄';
                dirIndicator.style.opacity = '0.7';
              }
            };
            
            updateDirection();
            
            asymValue.addEventListener('input', updateDirection);
            asymValue.addEventListener('change', () => {
              if (this.engine.rules) {
                this.engine.rules.setRule(i, j, { 
                  asymmetry: parseFloat(asymValue.value) 
                });
                updateDirection();
              }
            });
            cellContent.appendChild(asymValue);
            
            // Add direction indicator
            cell.appendChild(dirIndicator);
          }
          
          cell.appendChild(cellContent);
          row.appendChild(cell);
        }
        
        matrixContainer.appendChild(row);
      }
      
      modal.appendChild(matrixContainer);
      
      // Button row
      const buttonRow = document.createElement('div');
      buttonRow.className = 'sim-modal-buttons';
      
      // Symmetrize button
      const symmetrizeBtn = document.createElement('button');
      symmetrizeBtn.className = 'sim-button';
      symmetrizeBtn.textContent = 'Symmetrize All';
      symmetrizeBtn.addEventListener('click', () => {
        if (this.engine.rules) {
          for (let i = 0; i < typeCount; i++) {
            for (let j = i + 1; j < typeCount; j++) {
              const interaction = this.getTypeInteraction(i, j);
              this.engine.rules.setRule(i, j, { 
                asymmetry: 1.0  // Fully symmetric
              });
              this.engine.rules.setRule(j, i, { 
                attractionStrength: interaction.attractionStrength,
                repulsionStrength: interaction.repulsionStrength,
                asymmetry: 1.0
              });
            }
          }
          
          // Refresh the matrix
          document.body.removeChild(overlay);
          this.showInteractionMatrix();
        }
      });
      buttonRow.appendChild(symmetrizeBtn);
      
      // Reset button
      const resetBtn = document.createElement('button');
      resetBtn.className = 'sim-button';
      resetBtn.textContent = 'Reset Matrix';
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all interaction values?') && this.engine.rules) {
          for (let i = 0; i < typeCount; i++) {
            for (let j = 0; j < typeCount; j++) {
              if (i === j) {
                // Self-interaction: slight repulsion
                this.engine.rules.setRule(i, j, {
                  attractionStrength: 0,
                  repulsionStrength: 0.5,
                  asymmetry: 1.0
                });
              } else {
                // Cross interaction: weak attraction
                this.engine.rules.setRule(i, j, {
                  attractionStrength: 0.5,
                  repulsionStrength: 0.1,
                  asymmetry: 1.0
                });
              }
            }
          }
          
          // Refresh the matrix
          document.body.removeChild(overlay);
          this.showInteractionMatrix();
        }
      });
      buttonRow.appendChild(resetBtn);
      
      modal.appendChild(buttonRow);
      
      // Add to page
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    }
    
    /**
     * Update custom presets display
     * @private
     */
    updateCustomPresets() {
      // Clear container
      this.customPresetsContainer.innerHTML = '';
      
      if (this.presets.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'sim-empty-message';
        emptyMessage.textContent = 'No saved presets yet';
        this.customPresetsContainer.appendChild(emptyMessage);
        return;
      }
      
      // Create preset items
      this.presets.forEach(preset => {
        const presetItem = document.createElement('div');
        presetItem.className = 'sim-preset-item';
        
        const presetName = document.createElement('span');
        presetName.className = 'sim-preset-name';
        presetName.textContent = preset.name;
        presetItem.appendChild(presetName);
        
        const loadBtn = document.createElement('button');
        loadBtn.className = 'sim-small-button sim-load-preset';
        loadBtn.textContent = 'Load';
        loadBtn.addEventListener('click', () => {
          this.loadPreset(preset);
        });
        presetItem.appendChild(loadBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'sim-small-button sim-delete-preset';
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', () => {
          if (confirm(`Delete preset "${preset.name}"?`)) {
            this.deletePreset(preset.id);
          }
        });
        presetItem.appendChild(deleteBtn);
        
        this.customPresetsContainer.appendChild(presetItem);
      });
    }
    
    /**
     * Generate CSS for control panel
     * @return {string} CSS styles
     * @private
     */
    generateCss() {
      const theme = this.styles[this.options.theme];
      
      return `
        .sim-control-panel {
          position: absolute;
          background-color: ${theme.background};
          color: ${theme.text};
          font-family: Arial, sans-serif;
          font-size: 14px;
          border-radius: 5px;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
          transition: all 0.3s ease;
          z-index: 1000;
          max-height: 100%;
          overflow: auto;
        }
        
        .sim-control-panel.right {
          right: 10px;
          top: 10px;
        }
        
        .sim-control-panel.left {
          left: 10px;
          top: 10px;
        }
        
        .sim-control-panel.top {
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
        }
        
        .sim-control-panel.bottom {
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
        }
        
        .sim-control-panel.collapsed {
          width: auto !important;
        }
        
        .sim-control-title {
          padding: 10px;
          font-weight: bold;
          border-bottom: 1px solid ${theme.border};
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .sim-collapse-btn {
          background: none;
          border: none;
          color: ${theme.text};
          cursor: pointer;
          font-size: 12px;
        }
        
        .sim-control-content {
          padding: 10px;
        }
        
        .sim-tab-container {
          display: flex;
          border-bottom: 1px solid ${theme.border};
          margin-bottom: 10px;
        }
        
        .sim-tab {
          padding: 8px 10px;
          background-color: ${theme.tab};
          cursor: pointer;
          border-radius: 4px 4px 0 0;
          margin-right: 1px;
        }
        
        .sim-tab:hover {
          background-color: ${theme.tabHover};
        }
        
        .sim-tab.active {
          background-color: ${theme.tabActive};
          font-weight: bold;
        }
        
        .sim-tab-icon {
          margin-right: 5px;
        }
        
        .sim-tab-pane {
          display: none;
        }
        
        .sim-tab-pane.active {
          display: block;
        }
        
        .sim-control-group {
          margin-bottom: 15px;
        }
        
        .sim-control-label {
          display: block;
          margin-bottom: 5px;
        }
        
        .sim-slider {
          width: 100%;
          background-color: ${theme.slider};
          -webkit-appearance: none;
          height: 5px;
          border-radius: 5px;
          outline: none;
        }
        
        .sim-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background-color: ${theme.sliderThumb};
          cursor: pointer;
        }
        
        .sim-slider::-moz-range-thumb {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background-color: ${theme.sliderThumb};
          cursor: pointer;
          border: none;
        }
        
        .sim-slider-value {
          float: right;
          font-size: 12px;
          opacity: 0.8;
        }
        
        .sim-button {
          background-color: ${theme.button};
          color: ${theme.text};
          border: none;
          border-radius: 4px;
          padding: 8px 15px;
          cursor: pointer;
          width: 100%;
          margin-top: 5px;
          transition: background-color 0.2s;
        }
        
        .sim-button:hover {
          background-color: ${theme.buttonHover};
        }
        
        .sim-button:active {
          background-color: ${theme.buttonActive};
        }
        
        .sim-small-button {
          background-color: ${theme.button};
          color: ${theme.text};
          border: none;
          border-radius: 4px;
          padding: 3px 8px;
          cursor: pointer;
          font-size: 12px;
          margin-left: 5px;
        }
        
        .sim-small-button:hover {
          background-color: ${theme.buttonHover};
        }
        
        .sim-reset-button {
          background-color: #993333;
        }
        
        .sim-reset-button:hover {
          background-color: #cc3333;
        }
        
        .sim-checkbox {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .sim-checkbox input {
          margin-right: 10px;
        }
        
        .sim-select {
          width: 100%;
          padding: 5px;
          background-color: ${theme.input};
          color: ${theme.text};
          border: 1px solid ${theme.border};
          border-radius: 4px;
        }
        
        .sim-input {
          width: 100%;
          padding: 5px;
          background-color: ${theme.input};
          color: ${theme.text};
          border: 1px solid ${theme.border};
          border-radius: 4px;
          box-sizing: border-box;
        }
        
        .sim-color-picker {
          display: flex;
          align-items: center;
        }
        
        .sim-color-input {
          -webkit-appearance: none;
          width: 30px;
          height: 30px;
          border: none;
          background: none;
          cursor: pointer;
        }
        
        .sim-color-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }
        
        .sim-color-input::-webkit-color-swatch {
          border: 1px solid ${theme.border};
          border-radius: 4px;
        }
        
        .sim-color-value {
          margin-left: 10px;
          flex-grow: 1;
        }
        
        .sim-separator {
          border-top: 1px solid ${theme.border};
          margin: 15px 0;
          position: relative;
        }
        
        .sim-separator-label {
          position: absolute;
          top: -10px;
          left: 10px;
          background-color: ${theme.background};
          padding: 0 5px;
          font-size: 12px;
          color: ${theme.text};
          opacity: 0.8;
        }
        
        .sim-type-editor {
          padding: 10px;
          background-color: rgba(0,0,0,0.1);
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        .sim-interaction-group {
          margin-top: 10px;
          padding: 5px;
          background-color: rgba(0,0,0,0.05);
          border-radius: 4px;
        }
        
        .sim-group-label {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .sim-custom-presets {
          max-height: 200px;
          overflow-y: auto;
          margin-bottom: 10px;
        }
        
        .sim-preset-item {
          display: flex;
          align-items: center;
          padding: 5px;
          border-bottom: 1px solid ${theme.border};
        }
        
        .sim-preset-name {
          flex-grow: 1;
        }
        
        .sim-save-preset {
          display: flex;
          margin-top: 10px;
        }
        
        .sim-save-preset .sim-input {
          flex-grow: 1;
          margin-right: 5px;
        }
        
        .sim-save-preset .sim-button {
          width: auto;
          margin-top: 0;
        }
        
        .sim-empty-message {
          font-style: italic;
          opacity: 0.7;
          text-align: center;
          padding: 10px;
        }
        
        .sim-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .sim-modal {
          background-color: ${theme.background};
          border-radius: 5px;
          box-shadow: 0 0 20px rgba(0,0,0,0.3);
          max-width: 90%;
          max-height: 90%;
          overflow: auto;
          color: ${theme.text};
        }
        
        .sim-modal-header {
          padding: 10px 15px;
          border-bottom: 1px solid ${theme.border};
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .sim-modal-header h3 {
          margin: 0;
        }
        
        .sim-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: ${theme.text};
        }
        
        .sim-modal-buttons {
          padding: 10px 15px;
          border-top: 1px solid ${theme.border};
          display: flex;
          justify-content: flex-end;
        }
        
        .sim-modal-buttons .sim-button {
          width: auto;
          margin-left: 10px;
        }
        
        .sim-matrix-editor {
          width: 80%;
          max-width: 800px;
        }
        
        .sim-matrix-container {
          padding: 15px;
          overflow: auto;
        }
        
        .sim-matrix-header, .sim-matrix-row {
          display: flex;
          align-items: center;
        }
        
        .sim-matrix-corner, .sim-matrix-col-header, .sim-matrix-row-header {
          min-width: 80px;
          padding: 5px;
          text-align: center;
          font-weight: bold;
          font-size: 12px;
        }
        
        .sim-matrix-cell {
          min-width: 120px;
          min-height: 80px;
          padding: 5px;
          margin: 2px;
          border: 1px solid ${theme.border};
          background-color: rgba(0,0,0,0.05);
          position: relative;
        }
        
        .sim-matrix-cell-content {
          display: flex;
          flex-direction: column;
        }
        
        .sim-matrix-label {
          font-size: 11px;
          margin-bottom: 2px;
        }
        
        .sim-matrix-input {
          width: 100%;
          padding: 3px;
          font-size: 12px;
          background-color: ${theme.input};
          color: ${theme.text};
          border: 1px solid ${theme.border};
          border-radius: 3px;
          margin-bottom: 5px;
        }
        
        .sim-matrix-slider {
          width: 100%;
          margin-bottom: 5px;
        }
        
        .sim-direction-indicator {
          position: absolute;
          top: 5px;
          right: 5px;
          font-size: 18px;
          opacity: 0.7;
        }
      `;
    }
    
    /**
     * Create a slider control
     * @param {Object} options - Slider options
     * @param {HTMLElement} parent - Parent element
     * @return {HTMLInputElement} Slider element
     * @private
     */
    createSlider(options, parent) {
      const { id, label, min, max, step, value, onChange, tooltip } = options;
      
      const group = document.createElement('div');
      group.className = 'sim-control-group';
      
      const labelElement = document.createElement('label');
      labelElement.className = 'sim-control-label';
      labelElement.textContent = label;
      
      if (tooltip && this.options.useTooltips) {
        labelElement.title = tooltip;
      }
      
      const sliderContainer = document.createElement('div');
      sliderContainer.className = 'sim-slider-container';
      
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'sim-slider';
      slider.id = id;
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.value = value;
      
      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'sim-slider-value';
      valueDisplay.textContent = value;
      
      slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
      });
      
      if (onChange) {
        slider.addEventListener('change', () => {
          onChange(parseFloat(slider.value));
        });
      }
      
      labelElement.appendChild(valueDisplay);
      group.appendChild(labelElement);
      
      sliderContainer.appendChild(slider);
      group.appendChild(sliderContainer);
      
      parent.appendChild(group);
      
      // Store reference
      this.sliders[id] = slider;
      
      return slider;
    }
    
    /**
     * Create a checkbox control
     * @param {Object} options - Checkbox options
     * @param {HTMLElement} parent - Parent element
     * @return {HTMLInputElement} Checkbox element
     * @private
     */
    createCheckbox(options, parent) {
      const { id, label, value, onChange, tooltip } = options;
      
      const checkbox = document.createElement('div');
      checkbox.className = 'sim-checkbox';
      
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.checked = value;
      
      const labelElement = document.createElement('label');
      labelElement.htmlFor = id;
      labelElement.textContent = label;
      
      if (tooltip && this.options.useTooltips) {
        checkbox.title = tooltip;
      }
      
      if (onChange) {
        input.addEventListener('change', () => {
          onChange(input.checked);
        });
      }
      
      checkbox.appendChild(input);
      checkbox.appendChild(labelElement);
      
      parent.appendChild(checkbox);
      
      // Store reference
      this.checkboxes[id] = input;
      
      return input;
    }
    
    /**
     * Create a select control
     * @param {Object} options - Select options
     * @param {HTMLElement} parent - Parent element
     * @return {HTMLSelectElement} Select element
     * @private
     */
    createSelect(options, parent) {
      const { id, label, options: selectOptions, value, onChange, tooltip } = options;
      
      const group = document.createElement('div');
      group.className = 'sim-control-group';
      
      const labelElement = document.createElement('label');
      labelElement.className = 'sim-control-label';
      labelElement.textContent = label;
      
      if (tooltip && this.options.useTooltips) {
        labelElement.title = tooltip;
      }
      
      const select = document.createElement('select');
      select.className = 'sim-select';
      select.id = id;
      
      selectOptions.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.label;
        select.appendChild(optElement);
      });
      
      select.value = value;
      
      if (onChange) {
        select.addEventListener('change', () => {
          onChange(select.value);
        });
      }
      
      group.appendChild(labelElement);
      group.appendChild(select);
      
      parent.appendChild(group);
      
      // Store reference
      this.selects[id] = select;
      
      return select;
    }
    
    /**
     * Create a color picker control
     * @param {Object} options - Color picker options
     * @param {HTMLElement} parent - Parent element
     * @return {HTMLInputElement} Color picker element
     * @private
     */
    createColorPicker(options, parent) {
      const { id, label, value, onChange, tooltip } = options;
      
      const group = document.createElement('div');
      group.className = 'sim-control-group';
      
      const labelElement = document.createElement('label');
      labelElement.className = 'sim-control-label';
      labelElement.textContent = label;
      
      if (tooltip && this.options.useTooltips) {
        labelElement.title = tooltip;
      }
      
      const colorContainer = document.createElement('div');
      colorContainer.className = 'sim-color-picker';
      
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'sim-color-input';
      colorInput.id = id;
      colorInput.value = value;
      
      const colorValue = document.createElement('span');
      colorValue.className = 'sim-color-value';
      colorValue.textContent = value;
      
      colorInput.addEventListener('input', () => {
        colorValue.textContent = colorInput.value;
      });
      
      if (onChange) {
        colorInput.addEventListener('change', () => {
          onChange(colorInput.value);
        });
      }
      
      colorContainer.appendChild(colorInput);
      colorContainer.appendChild(colorValue);
      
      group.appendChild(labelElement);
      group.appendChild(colorContainer);
      
      parent.appendChild(group);
      
      // Store reference
      this.colorPickers[id] = colorInput;
      
      return colorInput;
    }
    
    /**
     * Create a separator with optional label
     * @param {HTMLElement} parent - Parent element
     * @param {string} label - Optional label
     * @return {HTMLElement} Separator element
     * @private
     */
    createSeparator(parent, label) {
      const separator = document.createElement('div');
      separator.className = 'sim-separator';
      
      if (label) {
        const labelElement = document.createElement('span');
        labelElement.className = 'sim-separator-label';
        labelElement.textContent = label;
        separator.appendChild(labelElement);
      }
      
      parent.appendChild(separator);
      return separator;
    }
    
    /**
     * Register general event handlers
     * @private
     */
    registerEvents() {
      // Window resize handler
      window.addEventListener('resize', () => {
        // Adjust panel position if needed
      });
      
      // Save preferences before unload
      if (this.options.savePreferences) {
        window.addEventListener('beforeunload', () => {
          this.savePreferences();
        });
      }
    }
    
    /**
     * Toggle control panel collapse state
     * @private
     */
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
      
      if (this.isCollapsed) {
        this.contentContainer.style.display = 'none';
        this.panel.classList.add('collapsed');
        if (this.collapseBtn) {
          this.collapseBtn.innerHTML = '&#9654;';
        }
      } else {
        this.contentContainer.style.display = 'block';
        this.panel.classList.remove('collapsed');
        if (this.collapseBtn) {
          this.collapseBtn.innerHTML = '&#9664;';
        }
      }
    }
    
    /**
     * Activate a specific tab
     * @param {string} tabId - Tab ID to activate
     * @private
     */
    activateTab(tabId) {
      // Update active tab
      this.activeTab = tabId;
      
      // Update tab buttons
      const tabs = this.tabContainer.querySelectorAll('.sim-tab');
      tabs.forEach(tab => {
        if (tab.dataset.tab === tabId) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
      
      // Update tab panes
      const panes = this.tabContent.querySelectorAll('.sim-tab-pane');
      panes.forEach(pane => {
        if (pane.dataset.tab === tabId) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    }
    
    /**
     * Get tab pane element by ID
     * @param {string} tabId - Tab ID
     * @return {HTMLElement} Tab pane element
     * @private
     */
    getTabPane(tabId) {
      return this.tabContent.querySelector(`.sim-tab-pane[data-tab="${tabId}"]`);
    }
    
    /**
     * Apply initial settings to the engine
     * @private
     */
    applySettings() {
      // Time scale
      if (this.engine.setTimeScale && this.sliders.timeScale) {
        this.engine.setTimeScale(parseFloat(this.sliders.timeScale.value));
      }
      
      // Particle count
      if (this.engine.particles && this.sliders.particleCount) {
        const count = parseInt(this.sliders.particleCount.value, 10);
        const currentCount = this.engine.particles.getActiveCount();
        
        if (count > currentCount) {
          this.engine.addParticles(count - currentCount);
        }
      }
      
      // Physics method
      if (this.engine.integrator && this.selects.physicsMethod) {
        this.engine.integrator.setOptions({ method: this.selects.physicsMethod.value });
      }
      
      // Boundary handling
      if (this.engine.integrator && this.selects.boundaryHandling) {
        this.engine.integrator.setOptions({ boundaryHandling: this.selects.boundaryHandling.value });
      }
      
      // Renderer settings
      if (this.engine.renderer) {
        // Render style
        if (this.selects.renderStyle) {
          this.engine.renderer.setOptions({ renderStyle: this.selects.renderStyle.value });
        }
        
        // Trails
        if (this.checkboxes.useTrails) {
          this.engine.renderer.setOptions({ useTrails: this.checkboxes.useTrails.checked });
        }
        
        // Background color
        if (this.colorPickers.backgroundColor) {
          this.engine.renderer.setOptions({ background: this.colorPickers.backgroundColor.value });
        }
      }
    }
    
    /**
     * Save current preferences to localStorage
     * @private
     */
    savePreferences() {
      if (!this.options.savePreferences) return;
      
      const preferences = {
        // UI state
        collapsed: this.isCollapsed,
        activeTab: this.activeTab,
        theme: this.options.theme,
        
        // Control values
        sliders: {},
        checkboxes: {},
        selects: {},
        colorPickers: {},
        
        // Custom presets
        presets: this.presets,
        activePresetId: this.activePresetId
      };
      
      // Save slider values
      for (const id in this.sliders) {
        preferences.sliders[id] = this.sliders[id].value;
      }
      
      // Save checkbox values
      for (const id in this.checkboxes) {
        preferences.checkboxes[id] = this.checkboxes[id].checked;
      }
      
      // Save select values
      for (const id in this.selects) {
        preferences.selects[id] = this.selects[id].value;
      }
      
      // Save color picker values
      for (const id in this.colorPickers) {
        preferences.colorPickers[id] = this.colorPickers[id].value;
      }
      
      // Save to localStorage
      try {
        localStorage.setItem(this.options.localStorageKey, JSON.stringify(preferences));
      } catch (e) {
        console.warn('Failed to save preferences:', e);
      }
    }
    
    /**
     * Load preferences from localStorage
     * @private
     */
    loadPreferences() {
      if (!this.options.savePreferences) return;
      
      try {
        const saved = localStorage.getItem(this.options.localStorageKey);
        if (!saved) return;
        
        const preferences = JSON.parse(saved);
        
        // Restore UI state
        this.isCollapsed = preferences.collapsed || false;
        this.activeTab = preferences.activeTab || 'simulation';
        
        // Restore theme if present
        if (preferences.theme) {
          this.options.theme = preferences.theme;
        }
        
        // Restore presets
        if (preferences.presets) {
          this.presets = preferences.presets;
        }
        
        if (preferences.activePresetId) {
          this.activePresetId = preferences.activePresetId;
        }
        
        // Note: Control values are restored after UI is created
        this.savedPreferences = preferences;
        
      } catch (e) {
        console.warn('Failed to load preferences:', e);
      }
    }
    
    /**
     * Save current simulation state as a preset
     * @param {string} name - Preset name
     * @private
     */
    saveCurrentPreset(name) {
      // Check if we've reached max presets
      if (this.presets.length >= this.options.maxPresets) {
        alert(`Maximum of ${this.options.maxPresets} presets reached. Please delete some before saving more.`);
        return;
      }
      
      // Generate unique ID
      const id = 'custom_' + Date.now();
      
      // Get current rules
      let ruleData = null;
      if (this.engine.rules) {
        ruleData = this.engine.rules.serialize();
      }
      
      // Create preset object
      const preset = {
        id,
        name,
        timestamp: Date.now(),
        typeCount: this.engine.rules ? this.engine.rules.typeCount : 3,
        ruleData
      };
      
      // Add to presets
      this.presets.push(preset);
      
      // Save preferences
      this.savePreferences();
      
      // Update display
      this.updateCustomPresets();
    }
    
    /**
     * Load a saved preset
     * @param {Object} preset - Preset to load
     * @private
     */
    loadPreset(preset) {
      if (!preset || !preset.ruleData || !this.engine.rules) return;
      
      // If type count differs, reset the engine
      if (preset.typeCount !== this.engine.rules.typeCount) {
        // Update type count slider
        if (this.sliders.typeCount) {
          this.sliders.typeCount.value = preset.typeCount;
        }
        
        // Update engine type count
        this.engine.setTypeCount(preset.typeCount);
      }
      
      // Apply rule data
      this.engine.rules.deserialize(preset.ruleData);
      
      // Update active preset
      this.activePresetId = preset.id;
      
      // Save preferences
      this.savePreferences();
      
      // Show feedback
      alert(`Preset "${preset.name}" loaded successfully!`);
    }
    
    /**
     * Delete a saved preset
     * @param {string} presetId - Preset ID to delete
     * @private
     */
    deletePreset(presetId) {
      // Find preset index
      const index = this.presets.findIndex(p => p.id === presetId);
      
      if (index !== -1) {
        // Remove from array
        this.presets.splice(index, 1);
        
        // Clear active preset if deleted
        if (this.activePresetId === presetId) {
          this.activePresetId = null;
        }
        
        // Save preferences
        this.savePreferences();
        
        // Update display
        this.updateCustomPresets();
      }
    }
    
    /**
     * Export all presets to JSON file
     * @private
     */
    exportPresets() {
      if (this.presets.length === 0) {
        alert('No presets to export');
        return;
      }
      
      // Create export data
      const exportData = {
        format: 'life_simulator_presets',
        version: '1.0',
        timestamp: Date.now(),
        presets: this.presets
      };
      
      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create download link
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `life_simulator_presets_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    }
    
    /**
     * Import presets from JSON file
     * @private
     */
    importPresets() {
      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.addEventListener('change', () => {
        if (!input.files || !input.files[0]) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            
            // Validate format
            if (!data.format || data.format !== 'life_simulator_presets') {
              throw new Error('Invalid preset file format');
            }
            
            // Confirm import
            if (!confirm(`Import ${data.presets.length} presets? This will overwrite any duplicates.`)) {
              return;
            }
            
            // Process presets
            let importCount = 0;
            
            data.presets.forEach(preset => {
              // Check if preset already exists
              const existingIndex = this.presets.findIndex(p => p.id === preset.id);
              
              if (existingIndex !== -1) {
                // Replace existing
                this.presets[existingIndex] = preset;
              } else {
                // Add new if we have space
                if (this.presets.length < this.options.maxPresets) {
                  this.presets.push(preset);
                }
              }
              
              importCount++;
            });
            
            // Save and update
            this.savePreferences();
            this.updateCustomPresets();
            
            alert(`Successfully imported ${importCount} presets`);
            
          } catch (error) {
            alert(`Error importing presets: ${error.message}`);
            console.error('Import error:', error);
          }
        };
        
        reader.readAsText(input.files[0]);
      });
      
      input.click();
    }
    
    /**
     * Generate options for type selector
     * @param {number} count - Number of types
     * @return {Array} Array of option objects
     * @private
     */
    generateTypeOptions(count) {
      const options = [];
      
      for (let i = 0; i < count; i++) {
        options.push({
          value: i.toString(),
          label: `Type ${i + 1}`
        });
      }
      
      return options;
    }
    
    /**
     * Get interaction rule between two types
     * @param {number} typeA - First type
     * @param {number} typeB - Second type
     * @return {Object} Interaction rule
     * @private
     */
    getTypeInteraction(typeA, typeB) {
      if (this.engine.rules) {
        return this.engine.rules.getRule(typeA, typeB) || {
          attractionStrength: 0,
          repulsionStrength: 0,
          asymmetry: 1.0
        };
      }
      
      return {
        attractionStrength: 0,
        repulsionStrength: 0,
        asymmetry: 1.0
      };
    }
    
    /**
     * Get color for a particle type
     * @param {number} typeId - Type ID
     * @return {string} Color in hex format
     * @private
     */
    getTypeColor(typeId) {
      if (this.engine.renderer && this.engine.renderer.colorManager) {
        const color = this.engine.renderer.colorManager.typeColors[typeId];
        if (color) {
          return `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`;
        }
      }
      
      // Default colors
      const defaultColors = [
        '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff',
        '#44ffff', '#ff9944', '#4499ff', '#ff4499', '#99ff44'
      ];
      
      return defaultColors[typeId % defaultColors.length];
    }
    
    /**
     * Get CSS color for a particle type
     * @param {number} typeId - Type ID
     * @param {number} alpha - Optional alpha value
     * @return {string} CSS color
     * @private
     */
    getTypeColorCss(typeId, alpha = 1) {
      if (this.engine.renderer && this.engine.renderer.colorManager) {
        const color = this.engine.renderer.colorManager.typeColors[typeId];
        if (color) {
          return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        }
      }
      
      // Parse from hex
      const hex = this.getTypeColor(typeId);
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  
  export default Controls;