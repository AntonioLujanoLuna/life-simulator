/**
 * TypeEditor.js - Advanced particle type editor
 * 
 * Features:
 * - Visual editor for particle type properties
 * - Interaction matrix visualization and editing
 * - Force curve visualization
 * - Real-time previews
 * - Parameter presets
 */

class TypeEditor {
    /**
     * Create a new particle type editor
     * @param {Object} engine - Simulation engine
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Configuration options
     */
    constructor(engine, container, options = {}) {
      this.engine = engine;
      this.container = container;
      
      // Default options
      this.options = Object.assign({
        theme: 'dark',                   // 'dark' or 'light'
        showPreview: true,               // Show preview simulation
        previewSize: 200,                // Preview size in pixels
        previewParticles: 50,            // Number of particles in preview
        showForceGraph: true,            // Show force curve graph
        editAsymmetry: true,             // Allow editing asymmetric forces
        showAdvancedProperties: false,   // Show advanced properties
        enableTypeCreation: true,        // Allow creating new types
        maxTypes: 10,                    // Maximum number of particle types
        autoApply: false,                // Auto-apply changes
        confirmDelete: true,             // Confirm before deleting types
        showDescription: true,           // Show description of types/forces
        cssPrefix: 'type-editor',        // CSS class prefix
        defaultTypeProperties: {
          mass: 1.0,
          size: 5.0,
          charge: 0,
          friction: 0.0,
          fixed: false
        }
      }, options);
      
      // Current state
      this.selectedType = 0;
      this.selectedInteraction = { from: 0, to: 0 };
      this.pendingChanges = false;
      this.previewSimulation = null;
      this.forceGraph = null;
      
      // Property editors
      this.editors = {};
      
      // Generate styles
      this.styles = this.generateStyles();
      
      // Initialize UI
      this.init();
    }
    
    /**
     * Initialize the editor
     * @private
     */
    init() {
      // Add styles to document
      const styleElement = document.createElement('style');
      styleElement.textContent = this.styles;
      document.head.appendChild(styleElement);
      
      // Create main layout
      this.createLayout();
      
      // Create type list
      this.createTypeList();
      
      // Create property editor
      this.createPropertyEditor();
      
      // Create interaction editor
      this.createInteractionEditor();
      
      // Create preview if enabled
      if (this.options.showPreview) {
        this.createPreview();
      }
      
      // Initialize with first type
      this.selectType(0);
    }
    
    /**
     * Create main layout
     * @private
     */
    createLayout() {
      // Clear container
      this.container.innerHTML = '';
      
      // Apply base class
      this.container.classList.add(`${this.options.cssPrefix}`);
      this.container.classList.add(this.options.theme);
      
      // Create main sections
      this.editorContainer = document.createElement('div');
      this.editorContainer.className = `${this.options.cssPrefix}-editor`;
      
      // Create three-column layout
      this.leftColumn = document.createElement('div');
      this.leftColumn.className = `${this.options.cssPrefix}-column ${this.options.cssPrefix}-left`;
      
      this.middleColumn = document.createElement('div');
      this.middleColumn.className = `${this.options.cssPrefix}-column ${this.options.cssPrefix}-middle`;
      
      this.rightColumn = document.createElement('div');
      this.rightColumn.className = `${this.options.cssPrefix}-column ${this.options.cssPrefix}-right`;
      
      this.editorContainer.appendChild(this.leftColumn);
      this.editorContainer.appendChild(this.middleColumn);
      this.editorContainer.appendChild(this.rightColumn);
      
      this.container.appendChild(this.editorContainer);
      
      // Add bottom section for preview
      if (this.options.showPreview) {
        this.previewContainer = document.createElement('div');
        this.previewContainer.className = `${this.options.cssPrefix}-preview-container`;
        this.container.appendChild(this.previewContainer);
      }
      
      // Add button row
      this.buttonRow = document.createElement('div');
      this.buttonRow.className = `${this.options.cssPrefix}-button-row`;
      
      // Apply button
      this.applyButton = document.createElement('button');
      this.applyButton.className = `${this.options.cssPrefix}-button ${this.options.cssPrefix}-apply`;
      this.applyButton.textContent = 'Apply Changes';
      this.applyButton.disabled = true;
      this.applyButton.addEventListener('click', () => this.applyChanges());
      this.buttonRow.appendChild(this.applyButton);
      
      // Reset button
      this.resetButton = document.createElement('button');
      this.resetButton.className = `${this.options.cssPrefix}-button ${this.options.cssPrefix}-reset`;
      this.resetButton.textContent = 'Reset';
      this.resetButton.disabled = true;
      this.resetButton.addEventListener('click', () => this.resetChanges());
      this.buttonRow.appendChild(this.resetButton);
      
      this.container.appendChild(this.buttonRow);
    }
    
    /**
     * Create type list panel
     * @private
     */
    createTypeList() {
      const typeCount = this.getTypeCount();
      
      // Create header
      const header = document.createElement('div');
      header.className = `${this.options.cssPrefix}-panel-header`;
      header.textContent = 'Particle Types';
      this.leftColumn.appendChild(header);
      
      // Create list container
      this.typeListContainer = document.createElement('div');
      this.typeListContainer.className = `${this.options.cssPrefix}-type-list`;
      this.leftColumn.appendChild(this.typeListContainer);
      
      // Populate type list
      this.updateTypeList();
      
      // Add type button if enabled
      if (this.options.enableTypeCreation && typeCount < this.options.maxTypes) {
        const addButton = document.createElement('button');
        addButton.className = `${this.options.cssPrefix}-button ${this.options.cssPrefix}-add-type`;
        addButton.textContent = 'Add New Type';
        addButton.addEventListener('click', () => this.addNewType());
        this.leftColumn.appendChild(addButton);
      }
    }
    
    /**
     * Update type list
     * @private
     */
    updateTypeList() {
      const typeCount = this.getTypeCount();
      
      // Clear container
      this.typeListContainer.innerHTML = '';
      
      // Create type items
      for (let i = 0; i < typeCount; i++) {
        const typeItem = document.createElement('div');
        typeItem.className = `${this.options.cssPrefix}-type-item`;
        typeItem.dataset.type = i;
        
        if (i === this.selectedType) {
          typeItem.classList.add('selected');
        }
        
        // Color indicator
        const colorBox = document.createElement('div');
        colorBox.className = `${this.options.cssPrefix}-type-color`;
        colorBox.style.backgroundColor = this.getTypeColor(i);
        typeItem.appendChild(colorBox);
        
        // Type name
        const typeName = document.createElement('div');
        typeName.className = `${this.options.cssPrefix}-type-name`;
        typeName.textContent = `Type ${i + 1}`;
        typeItem.appendChild(typeName);
        
        // Delete button (if more than one type)
        if (typeCount > 1 && this.options.enableTypeCreation) {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = `${this.options.cssPrefix}-type-delete`;
          deleteBtn.innerHTML = '&times;';
          deleteBtn.title = 'Delete Type';
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteType(i);
          });
          typeItem.appendChild(deleteBtn);
        }
        
        // Click handler
        typeItem.addEventListener('click', () => {
          this.selectType(i);
        });
        
        this.typeListContainer.appendChild(typeItem);
      }
    }
    
    /**
     * Create property editor panel
     * @private
     */
    createPropertyEditor() {
      // Create header
      const header = document.createElement('div');
      header.className = `${this.options.cssPrefix}-panel-header`;
      header.textContent = 'Properties';
      this.middleColumn.appendChild(header);
      
      // Create property container
      this.propertyContainer = document.createElement('div');
      this.propertyContainer.className = `${this.options.cssPrefix}-property-container`;
      this.middleColumn.appendChild(this.propertyContainer);
      
      // Properties will be populated when a type is selected
    }
    
    /**
     * Create interaction editor panel
     * @private
     */
    createInteractionEditor() {
      // Create header
      const header = document.createElement('div');
      header.className = `${this.options.cssPrefix}-panel-header`;
      header.textContent = 'Interactions';
      this.rightColumn.appendChild(header);
      
      // Create interaction selector
      const selectorContainer = document.createElement('div');
      selectorContainer.className = `${this.options.cssPrefix}-interaction-selector`;
      
      // From selector
      const fromContainer = document.createElement('div');
      fromContainer.className = `${this.options.cssPrefix}-selector-group`;
      
      const fromLabel = document.createElement('label');
      fromLabel.textContent = 'From:';
      fromContainer.appendChild(fromLabel);
      
      this.fromSelect = document.createElement('select');
      this.fromSelect.className = `${this.options.cssPrefix}-select`;
      this.updateTypeSelectors();
      
      this.fromSelect.addEventListener('change', () => {
        this.selectedInteraction.from = parseInt(this.fromSelect.value, 10);
        this.updateInteractionEditor();
      });
      
      fromContainer.appendChild(this.fromSelect);
      selectorContainer.appendChild(fromContainer);
      
      // Direction indicator
      const directionIndicator = document.createElement('div');
      directionIndicator.className = `${this.options.cssPrefix}-direction`;
      directionIndicator.innerHTML = '→';
      selectorContainer.appendChild(directionIndicator);
      
      // To selector
      const toContainer = document.createElement('div');
      toContainer.className = `${this.options.cssPrefix}-selector-group`;
      
      const toLabel = document.createElement('label');
      toLabel.textContent = 'To:';
      toContainer.appendChild(toLabel);
      
      this.toSelect = document.createElement('select');
      this.toSelect.className = `${this.options.cssPrefix}-select`;
      // Populated in updateTypeSelectors
      
      this.toSelect.addEventListener('change', () => {
        this.selectedInteraction.to = parseInt(this.toSelect.value, 10);
        this.updateInteractionEditor();
      });
      
      toContainer.appendChild(this.toSelect);
      selectorContainer.appendChild(toContainer);
      
      this.rightColumn.appendChild(selectorContainer);
      
      // Create interaction property container
      this.interactionContainer = document.createElement('div');
      this.interactionContainer.className = `${this.options.cssPrefix}-interaction-container`;
      this.rightColumn.appendChild(this.interactionContainer);
      
      // Create force graph container if enabled
      if (this.options.showForceGraph) {
        this.forceGraphContainer = document.createElement('div');
        this.forceGraphContainer.className = `${this.options.cssPrefix}-force-graph`;
        this.rightColumn.appendChild(this.forceGraphContainer);
      }
      
      // View matrix button
      const matrixButton = document.createElement('button');
      matrixButton.className = `${this.options.cssPrefix}-button ${this.options.cssPrefix}-matrix-button`;
      matrixButton.textContent = 'View Full Interaction Matrix';
      matrixButton.addEventListener('click', () => this.showInteractionMatrix());
      this.rightColumn.appendChild(matrixButton);
    }
    
    /**
     * Create simulation preview
     * @private
     */
    createPreview() {
      if (!this.options.showPreview) return;
      
      // Create preview header
      const previewHeader = document.createElement('div');
      previewHeader.className = `${this.options.cssPrefix}-panel-header`;
      previewHeader.textContent = 'Live Preview';
      this.previewContainer.appendChild(previewHeader);
      
      // Create canvas
      this.previewCanvas = document.createElement('canvas');
      this.previewCanvas.className = `${this.options.cssPrefix}-preview-canvas`;
      this.previewCanvas.width = this.options.previewSize;
      this.previewCanvas.height = this.options.previewSize;
      this.previewContainer.appendChild(this.previewCanvas);
      
      // Initialize preview simulation
      this.initPreviewSimulation();
    }
    
    /**
     * Initialize preview simulation
     * @private
     */
    initPreviewSimulation() {
      // This would create a small simulation using the engine's components
      // For this example, we'll just create a placeholder
      
      // A real implementation would:
      // 1. Create particle system
      // 2. Create rule matrix with current settings
      // 3. Create integrator, renderer, etc.
      // 4. Start simulation loop
      
      // Here we'll just draw some placeholder particles
      const ctx = this.previewCanvas.getContext('2d');
      const size = this.options.previewSize;
      
      // Draw background
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, size, size);
      
      // Draw particles
      const typeCount = this.getTypeCount();
      const particlesPerType = Math.floor(this.options.previewParticles / typeCount);
      
      for (let type = 0; type < typeCount; type++) {
        ctx.fillStyle = this.getTypeColor(type);
        
        for (let i = 0; i < particlesPerType; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const radius = 3 + Math.random() * 2;
          
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // In a real implementation, we would return:
      // - Update function to call on each frame
      // - Dispose function to clean up resources
    }
    
    /**
     * Generate and draw force graph
     * @private
     */
    drawForceGraph() {
      if (!this.options.showForceGraph || !this.forceGraphContainer) return;
      
      // Clear container
      this.forceGraphContainer.innerHTML = '';
      
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = 250;
      canvas.height = 150;
      this.forceGraphContainer.appendChild(canvas);
      
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      // Get current interaction
      const from = this.selectedInteraction.from;
      const to = this.selectedInteraction.to;
      
      // Get force parameters
      const interaction = this.getInteraction(from, to);
      const attraction = interaction.attractionStrength;
      const repulsion = interaction.repulsionStrength;
      const minDist = interaction.minDistance;
      const maxDist = interaction.activationDistance;
      
      // Draw background
      ctx.fillStyle = '#222';
      ctx.fillRect(0, 0, width, height);
      
      // Draw axes
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      
      // X-axis (distance)
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      
      // Y-axis (force)
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(10, height);
      ctx.stroke();
      
      // Draw labels
      ctx.fillStyle = '#ccc';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      
      // X-axis label
      ctx.fillText('Distance', width - 50, height / 2 + 15);
      
      // Y-axis label
      ctx.save();
      ctx.translate(20, 20);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Force', 0, 0);
      ctx.restore();
      
      // Zero point
      ctx.fillText('0', 5, height / 2 + 12);
      
      // Draw force curve
      ctx.strokeStyle = '#4af';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Plot force vs distance
      const maxForce = Math.max(Math.abs(attraction), Math.abs(repulsion)) * 1.5 || 1;
      const forceFactor = (height / 2) / maxForce;
      const distFactor = (width - 20) / maxDist;
      
      // Calculate force at different distances
      for (let dist = minDist; dist <= maxDist; dist += maxDist / 100) {
        let force;
        
        // Force calculation based on falloff type
        switch (interaction.forceFalloff) {
          case 'inverse_square':
            force = attraction / (dist * dist) - repulsion / (dist * dist) * Math.pow(maxDist / dist, 2);
            break;
          case 'linear':
            force = attraction * (1 - dist / maxDist) - repulsion * (1 - dist / maxDist);
            break;
          case 'exponential':
            force = attraction * Math.exp(-dist / (maxDist * 0.5)) - repulsion * Math.exp(-dist / (maxDist * 0.2));
            break;
          case 'constant':
          default:
            force = attraction - repulsion;
            break;
        }
        
        // Map to canvas coordinates
        const x = 10 + dist * distFactor;
        const y = height / 2 - force * forceFactor;
        
        if (dist === minDist) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Draw min/max distance markers
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      
      // Min distance
      const minX = 10 + minDist * distFactor;
      ctx.beginPath();
      ctx.moveTo(minX, 0);
      ctx.lineTo(minX, height);
      ctx.stroke();
      ctx.fillText(`${minDist}`, minX - 5, height - 5);
      
      // Max distance
      const maxX = 10 + maxDist * distFactor;
      ctx.beginPath();
      ctx.moveTo(maxX, 0);
      ctx.lineTo(maxX, height);
      ctx.stroke();
      ctx.fillText(`${maxDist}`, maxX - 5, height - 5);
      
      ctx.setLineDash([]);
    }
    
    /**
     * Select a particle type
     * @param {number} typeId - Type ID to select
     * @private
     */
    selectType(typeId) {
      // Check if changes need to be saved
      if (this.pendingChanges) {
        if (confirm('You have unsaved changes. Apply them before switching?')) {
          this.applyChanges();
        } else {
          this.resetChanges();
        }
      }
      
      // Update selected type
      this.selectedType = typeId;
      
      // Update type list
      const typeItems = this.typeListContainer.querySelectorAll(`.${this.options.cssPrefix}-type-item`);
      typeItems.forEach(item => {
        if (parseInt(item.dataset.type, 10) === typeId) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
      });
      
      // Update interaction selection
      this.selectedInteraction.from = typeId;
      this.updateTypeSelectors();
      
      // Update property editor
      this.updatePropertyEditor();
      
      // Update interaction editor
      this.updateInteractionEditor();
    }
    
    /**
     * Update property editor for selected type
     * @private
     */
    updatePropertyEditor() {
      // Clear container
      this.propertyContainer.innerHTML = '';
      
      const typeId = this.selectedType;
      
      // Create color picker
      this.createColorPicker(typeId);
      
      // Create mass slider
      this.createSlider({
        id: 'mass',
        label: 'Mass',
        min: 0.1,
        max: 10,
        step: 0.1,
        value: this.getTypeProperty(typeId, 'mass') || 1.0,
        description: 'How heavy particles are. Affects force response.'
      });
      
      // Create size slider
      this.createSlider({
        id: 'size',
        label: 'Size',
        min: 1,
        max: 20,
        step: 0.5,
        value: this.getTypeProperty(typeId, 'size') || 5.0,
        description: 'Visual size and collision radius.'
      });
      
      // Create friction slider
      this.createSlider({
        id: 'friction',
        label: 'Friction',
        min: 0,
        max: 1,
        step: 0.01,
        value: this.getTypeProperty(typeId, 'friction') || 0.0,
        description: 'How quickly particles slow down.'
      });
      
      // Create fixed checkbox
      const fixedValue = this.getTypeProperty(typeId, 'fixed') || false;
      
      const fixedContainer = document.createElement('div');
      fixedContainer.className = `${this.options.cssPrefix}-property`;
      
      const fixedLabel = document.createElement('label');
      fixedLabel.textContent = 'Fixed Position';
      
      const fixedCheckbox = document.createElement('input');
      fixedCheckbox.type = 'checkbox';
      fixedCheckbox.checked = fixedValue;
      fixedCheckbox.addEventListener('change', () => {
        this.setTypeProperty(typeId, 'fixed', fixedCheckbox.checked);
      });
      
      fixedLabel.prepend(fixedCheckbox);
      fixedContainer.appendChild(fixedLabel);
      
      const fixedDescription = document.createElement('div');
      fixedDescription.className = `${this.options.cssPrefix}-description`;
      fixedDescription.textContent = 'When checked, particles cannot move but still exert forces.';
      fixedContainer.appendChild(fixedDescription);
      
      this.propertyContainer.appendChild(fixedContainer);
      
      // Advanced properties if enabled
      if (this.options.showAdvancedProperties) {
        // Create a collapsible section
        const advancedSection = document.createElement('div');
        advancedSection.className = `${this.options.cssPrefix}-advanced-section`;
        
        const advancedHeader = document.createElement('div');
        advancedHeader.className = `${this.options.cssPrefix}-advanced-header`;
        advancedHeader.textContent = 'Advanced Properties';
        advancedHeader.addEventListener('click', () => {
          advancedContent.style.display = advancedContent.style.display === 'none' ? 'block' : 'none';
          advancedHeader.classList.toggle('expanded');
        });
        
        const advancedContent = document.createElement('div');
        advancedContent.className = `${this.options.cssPrefix}-advanced-content`;
        advancedContent.style.display = 'none';
        
        // Example: Charge property
        this.createSlider({
          id: 'charge',
          label: 'Charge',
          min: -10,
          max: 10,
          step: 0.1,
          value: this.getTypeProperty(typeId, 'charge') || 0,
          description: 'Electrical charge for Coulomb-like forces.',
          container: advancedContent
        });
        
        // Add more advanced properties here
        
        advancedSection.appendChild(advancedHeader);
        advancedSection.appendChild(advancedContent);
        this.propertyContainer.appendChild(advancedSection);
      }
    }
    
    /**
     * Create color picker for type
     * @param {number} typeId - Type ID
     * @private
     */
    createColorPicker(typeId) {
      const colorContainer = document.createElement('div');
      colorContainer.className = `${this.options.cssPrefix}-property`;
      
      const colorLabel = document.createElement('label');
      colorLabel.textContent = 'Color';
      colorContainer.appendChild(colorLabel);
      
      const colorWrapper = document.createElement('div');
      colorWrapper.className = `${this.options.cssPrefix}-color-wrapper`;
      
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = this.getTypeColor(typeId);
      colorInput.addEventListener('change', () => {
        this.setTypeColor(typeId, colorInput.value);
      });
      
      colorWrapper.appendChild(colorInput);
      colorContainer.appendChild(colorWrapper);
      
      const colorDescription = document.createElement('div');
      colorDescription.className = `${this.options.cssPrefix}-description`;
      colorDescription.textContent = 'Visual appearance of this particle type.';
      colorContainer.appendChild(colorDescription);
      
      this.propertyContainer.appendChild(colorContainer);
    }
    
    /**
     * Create a slider control
     * @param {Object} options - Slider options
     * @param {HTMLElement} container - Optional container (defaults to propertyContainer)
     * @private
     */
    createSlider(options) {
      const { id, label, min, max, step, value, description, container } = options;
      const typeId = this.selectedType;
      
      const propertyContainer = container || this.propertyContainer;
      
      const sliderContainer = document.createElement('div');
      sliderContainer.className = `${this.options.cssPrefix}-property`;
      
      // Label
      const sliderLabel = document.createElement('label');
      sliderLabel.textContent = label;
      sliderContainer.appendChild(sliderLabel);
      
      // Slider and value container
      const sliderWrapper = document.createElement('div');
      sliderWrapper.className = `${this.options.cssPrefix}-slider-wrapper`;
      
      // Create slider
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.value = value;
      
      // Value display
      const valueDisplay = document.createElement('span');
      valueDisplay.className = `${this.options.cssPrefix}-value`;
      valueDisplay.textContent = value;
      
      // Update on input
      slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
      });
      
      // Save on change
      slider.addEventListener('change', () => {
        this.setTypeProperty(typeId, id, parseFloat(slider.value));
      });
      
      sliderWrapper.appendChild(slider);
      sliderWrapper.appendChild(valueDisplay);
      sliderContainer.appendChild(sliderWrapper);
      
      // Description if provided
      if (description && this.options.showDescription) {
        const descriptionElement = document.createElement('div');
        descriptionElement.className = `${this.options.cssPrefix}-description`;
        descriptionElement.textContent = description;
        sliderContainer.appendChild(descriptionElement);
      }
      
      propertyContainer.appendChild(sliderContainer);
      
      // Store reference to slider
      this.editors[id] = {
        slider,
        valueDisplay,
        getValue: () => parseFloat(slider.value),
        setValue: (val) => {
          slider.value = val;
          valueDisplay.textContent = val;
        }
      };
      
      return this.editors[id];
    }
    
    /**
     * Update interaction editor for selected interaction
     * @private
     */
    updateInteractionEditor() {
      // Clear container
      this.interactionContainer.innerHTML = '';
      
      const from = this.selectedInteraction.from;
      const to = this.selectedInteraction.to;
      
      // Get current interaction
      const interaction = this.getInteraction(from, to);
      
      // Create section title
      const sectionTitle = document.createElement('div');
      sectionTitle.className = `${this.options.cssPrefix}-section-title`;
      
      // Create colored indicators for from/to types
      const fromIndicator = document.createElement('span');
      fromIndicator.className = `${this.options.cssPrefix}-type-indicator`;
      fromIndicator.style.backgroundColor = this.getTypeColor(from);
      
      const toIndicator = document.createElement('span');
      toIndicator.className = `${this.options.cssPrefix}-type-indicator`;
      toIndicator.style.backgroundColor = this.getTypeColor(to);
      
      sectionTitle.appendChild(fromIndicator);
      sectionTitle.innerHTML += ` Type ${from + 1} → Type ${to + 1} `;
      sectionTitle.appendChild(toIndicator);
      
      this.interactionContainer.appendChild(sectionTitle);
      
      // Create attraction slider
      this.createInteractionSlider({
        id: 'attractionStrength',
        label: 'Attraction',
        min: -5,
        max: 5,
        step: 0.1,
        value: interaction.attractionStrength,
        description: 'Positive values attract, negative values repel.'
      });
      
      // Create repulsion slider
      this.createInteractionSlider({
        id: 'repulsionStrength',
        label: 'Repulsion',
        min: 0,
        max: 10,
        step: 0.1,
        value: interaction.repulsionStrength,
        description: 'Short-range repulsion to prevent overlap.'
      });
      
      // Create min distance slider
      this.createInteractionSlider({
        id: 'minDistance',
        label: 'Minimum Distance',
        min: 0.1,
        max: 20,
        step: 0.1,
        value: interaction.minDistance,
        description: 'Distance below which particles strongly repel.'
      });
      
      // Create activation distance slider
      this.createInteractionSlider({
        id: 'activationDistance',
        label: 'Activation Distance',
        min: 10,
        max: 200,
        step: 5,
        value: interaction.activationDistance,
        description: 'Maximum distance at which forces apply.'
      });
      
      // Create force falloff dropdown
      const falloffContainer = document.createElement('div');
      falloffContainer.className = `${this.options.cssPrefix}-property`;
      
      const falloffLabel = document.createElement('label');
      falloffLabel.textContent = 'Force Falloff';
      falloffContainer.appendChild(falloffLabel);
      
      const falloffSelect = document.createElement('select');
      falloffSelect.className = `${this.options.cssPrefix}-select`;
      
      const falloffOptions = [
        { value: 'inverse_square', label: 'Inverse Square (1/r²)' },
        { value: 'linear', label: 'Linear' },
        { value: 'exponential', label: 'Exponential' },
        { value: 'constant', label: 'Constant' }
      ];
      
      falloffOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        falloffSelect.appendChild(optionElement);
      });
      
      falloffSelect.value = interaction.forceFalloff;
      
      falloffSelect.addEventListener('change', () => {
        this.setInteractionProperty(from, to, 'forceFalloff', falloffSelect.value);
        this.drawForceGraph();
      });
      
      falloffContainer.appendChild(falloffSelect);
      
      const falloffDescription = document.createElement('div');
      falloffDescription.className = `${this.options.cssPrefix}-description`;
      falloffDescription.textContent = 'How force changes with distance.';
      falloffContainer.appendChild(falloffDescription);
      
      this.interactionContainer.appendChild(falloffContainer);
      
      // Add asymmetry slider if enabled and not self-interaction
      if (this.options.editAsymmetry && from !== to) {
        this.createInteractionSlider({
          id: 'asymmetry',
          label: 'Asymmetry',
          min: 0,
          max: 1,
          step: 0.01,
          value: interaction.asymmetry,
          description: '0 = One-way force, 1 = Equal and opposite (Newton\'s Third Law)'
        });
        
        // Add reciprocal button to set reverse interaction
        const reciprocalButton = document.createElement('button');
        reciprocalButton.className = `${this.options.cssPrefix}-button ${this.options.cssPrefix}-reciprocal`;
        reciprocalButton.textContent = 'Edit Reverse Interaction';
        reciprocalButton.addEventListener('click', () => {
          this.selectedInteraction = { from: to, to: from };
          this.fromSelect.value = to;
          this.toSelect.value = from;
          this.updateInteractionEditor();
        });
        this.interactionContainer.appendChild(reciprocalButton);
      }
      
      // Draw force graph if enabled
      if (this.options.showForceGraph) {
        this.drawForceGraph();
      }
    }
    
    /**
     * Create a slider for interaction properties
     * @param {Object} options - Slider options
     * @private
     */
    createInteractionSlider(options) {
      const { id, label, min, max, step, value, description } = options;
      const from = this.selectedInteraction.from;
      const to = this.selectedInteraction.to;
      
      const sliderContainer = document.createElement('div');
      sliderContainer.className = `${this.options.cssPrefix}-property`;
      
      // Label
      const sliderLabel = document.createElement('label');
      sliderLabel.textContent = label;
      sliderContainer.appendChild(sliderLabel);
      
      // Slider and value container
      const sliderWrapper = document.createElement('div');
      sliderWrapper.className = `${this.options.cssPrefix}-slider-wrapper`;
      
      // Create slider
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.value = value;
      
      // Value display
      const valueDisplay = document.createElement('span');
      valueDisplay.className = `${this.options.cssPrefix}-value`;
      valueDisplay.textContent = value;
      
      // Update on input
      slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
        
        // Live preview if auto-apply is enabled
        if (this.options.autoApply) {
          this.setInteractionProperty(from, to, id, parseFloat(slider.value));
          this.drawForceGraph();
        }
      });
      
      // Save on change
      slider.addEventListener('change', () => {
        this.setInteractionProperty(from, to, id, parseFloat(slider.value));
        this.drawForceGraph();
      });
      
      sliderWrapper.appendChild(slider);
      sliderWrapper.appendChild(valueDisplay);
      sliderContainer.appendChild(sliderWrapper);
      
      // Description if provided
      if (description && this.options.showDescription) {
        const descriptionElement = document.createElement('div');
        descriptionElement.className = `${this.options.cssPrefix}-description`;
        descriptionElement.textContent = description;
        sliderContainer.appendChild(descriptionElement);
      }
      
      this.interactionContainer.appendChild(sliderContainer);
      
      // Store reference to slider in an object keyed by interaction and property
      const key = `${from}_${to}_${id}`;
      this.editors[key] = {
        slider,
        valueDisplay,
        getValue: () => parseFloat(slider.value),
        setValue: (val) => {
          slider.value = val;
          valueDisplay.textContent = val;
        }
      };
      
      return this.editors[key];
    }
    
    /**
     * Update type selector dropdowns
     * @private
     */
    updateTypeSelectors() {
      const typeCount = this.getTypeCount();
      
      // Clear existing options
      this.fromSelect.innerHTML = '';
      this.toSelect.innerHTML = '';
      
      // Add options for each type
      for (let i = 0; i < typeCount; i++) {
        const fromOption = document.createElement('option');
        fromOption.value = i;
        fromOption.textContent = `Type ${i + 1}`;
        fromOption.style.backgroundColor = this.getTypeColor(i);
        this.fromSelect.appendChild(fromOption);
        
        const toOption = document.createElement('option');
        toOption.value = i;
        toOption.textContent = `Type ${i + 1}`;
        toOption.style.backgroundColor = this.getTypeColor(i);
        this.toSelect.appendChild(toOption);
      }
      
      // Set current selection
      this.fromSelect.value = this.selectedInteraction.from;
      this.toSelect.value = this.selectedInteraction.to;
    }
    
    /**
     * Show full interaction matrix in a modal
     * @private
     */
    showInteractionMatrix() {
      const typeCount = this.getTypeCount();
      
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = `${this.options.cssPrefix}-overlay`;
      
      // Create matrix container
      const matrixContainer = document.createElement('div');
      matrixContainer.className = `${this.options.cssPrefix}-matrix-container`;
      
      // Create header
      const header = document.createElement('div');
      header.className = `${this.options.cssPrefix}-matrix-header`;
      header.innerHTML = `
        <h3>Interaction Matrix</h3>
        <button class="${this.options.cssPrefix}-close-button">&times;</button>
      `;
      matrixContainer.appendChild(header);
      
      // Close button handler
      const closeButton = header.querySelector(`.${this.options.cssPrefix}-close-button`);
      closeButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
      
      // Create matrix
      const matrixTable = document.createElement('table');
      matrixTable.className = `${this.options.cssPrefix}-matrix`;
      
      // Create table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      // Empty corner cell
      const cornerCell = document.createElement('th');
      cornerCell.className = `${this.options.cssPrefix}-matrix-corner`;
      cornerCell.innerHTML = 'From ↓ To →';
      headerRow.appendChild(cornerCell);
      
      // Type column headers
      for (let i = 0; i < typeCount; i++) {
        const th = document.createElement('th');
        th.className = `${this.options.cssPrefix}-matrix-type`;
        th.style.backgroundColor = this.getTypeColor(i);
        th.textContent = `Type ${i + 1}`;
        headerRow.appendChild(th);
      }
      
      thead.appendChild(headerRow);
      matrixTable.appendChild(thead);
      
      // Create table body
      const tbody = document.createElement('tbody');
      
      for (let i = 0; i < typeCount; i++) {
        const row = document.createElement('tr');
        
        // Row header (type)
        const rowHeader = document.createElement('th');
        rowHeader.className = `${this.options.cssPrefix}-matrix-type`;
        rowHeader.style.backgroundColor = this.getTypeColor(i);
        rowHeader.textContent = `Type ${i + 1}`;
        row.appendChild(rowHeader);
        
        // Interaction cells
        for (let j = 0; j < typeCount; j++) {
          const cell = document.createElement('td');
          cell.className = `${this.options.cssPrefix}-matrix-cell`;
          
          // Get interaction
          const interaction = this.getInteraction(i, j);
          
          // Create cell content
          const cellContent = document.createElement('div');
          cellContent.className = `${this.options.cssPrefix}-matrix-cell-content`;
          
          // Attraction value
          const attraction = document.createElement('div');
          attraction.className = `${this.options.cssPrefix}-matrix-value`;
          attraction.innerHTML = `Attr: <span>${interaction.attractionStrength}</span>`;
          cellContent.appendChild(attraction);
          
          // Repulsion value
          const repulsion = document.createElement('div');
          repulsion.className = `${this.options.cssPrefix}-matrix-value`;
          repulsion.innerHTML = `Rep: <span>${interaction.repulsionStrength}</span>`;
          cellContent.appendChild(repulsion);
          
          // Asymmetry indicator (only for non-self interactions)
          if (i !== j) {
            const asymmetry = document.createElement('div');
            asymmetry.className = `${this.options.cssPrefix}-matrix-asymmetry`;
            
            // Arrow direction based on asymmetry
            if (interaction.asymmetry === 0) {
              asymmetry.textContent = '→'; // One-way
            } else if (interaction.asymmetry === 1) {
              asymmetry.textContent = '↔'; // Two-way (symmetric)
            } else {
              asymmetry.textContent = '⇄'; // Partial
            }
            
            cellContent.appendChild(asymmetry);
          }
          
          // Edit button
          const editButton = document.createElement('button');
          editButton.className = `${this.options.cssPrefix}-matrix-edit`;
          editButton.textContent = 'Edit';
          editButton.addEventListener('click', () => {
            // Close matrix
            document.body.removeChild(overlay);
            
            // Select interaction
            this.selectedInteraction = { from: i, to: j };
            this.fromSelect.value = i;
            this.toSelect.value = j;
            this.updateInteractionEditor();
          });
          
          cellContent.appendChild(editButton);
          cell.appendChild(cellContent);
          row.appendChild(cell);
        }
        
        tbody.appendChild(row);
      }
      
      matrixTable.appendChild(tbody);
      matrixContainer.appendChild(matrixTable);
      
      // Add to page
      overlay.appendChild(matrixContainer);
      document.body.appendChild(overlay);
    }
    
    /**
     * Add a new particle type
     * @private
     */
    addNewType() {
      const typeCount = this.getTypeCount();
      
      if (typeCount >= this.options.maxTypes) {
        alert(`Maximum number of types (${this.options.maxTypes}) reached.`);
        return;
      }
      
      // Create new type - implementation would call engine.addParticleType()
      const newTypeId = typeCount;
      
      // Update type list
      this.updateTypeList();
      
      // Select new type
      this.selectType(newTypeId);
    }
    
    /**
     * Delete a particle type
     * @param {number} typeId - Type ID to delete
     * @private
     */
    deleteType(typeId) {
      const typeCount = this.getTypeCount();
      
      if (typeCount <= 1) {
        alert('Cannot delete the last particle type.');
        return;
      }
      
      if (this.options.confirmDelete && !confirm(`Delete Type ${typeId + 1}?`)) {
        return;
      }
      
      // Delete type - implementation would call engine.removeParticleType()
      
      // Update type list
      this.updateTypeList();
      
      // Select first type if the deleted one was selected
      if (this.selectedType === typeId) {
        this.selectType(0);
      } else if (this.selectedType > typeId) {
        // Select the previous type ID since IDs have shifted
        this.selectType(this.selectedType - 1);
      }
    }
    
    /**
     * Apply pending changes to the simulation
     * @private
     */
    applyChanges() {
      // Implementation would apply all staged changes to the engine
      
      // Reset pending changes flag
      this.pendingChanges = false;
      this.applyButton.disabled = true;
      this.resetButton.disabled = true;
      
      // Update preview if enabled
      if (this.options.showPreview) {
        this.updatePreview();
      }
    }
    
    /**
     * Reset pending changes
     * @private
     */
    resetChanges() {
      // Implementation would revert all staged changes
      
      // Reset pending changes flag
      this.pendingChanges = false;
      this.applyButton.disabled = true;
      this.resetButton.disabled = true;
      
      // Reload from engine state
      this.updatePropertyEditor();
      this.updateInteractionEditor();
    }
    
    /**
     * Update preview simulation
     * @private
     */
    updatePreview() {
      if (!this.options.showPreview) return;
      
      // In a real implementation, this would update the preview simulation
      // with the current rule matrix and particle properties
      
      // For this example, just redraw some particles
      this.initPreviewSimulation();
    }
    
    /**
     * Set a property for a particle type
     * @param {number} typeId - Type ID
     * @param {string} property - Property name
     * @param {*} value - Property value
     * @private
     */
    setTypeProperty(typeId, property, value) {
      // Implementation would stage changes to be applied later
      
      // Mark changes as pending
      this.pendingChanges = true;
      this.applyButton.disabled = false;
      this.resetButton.disabled = false;
      
      // Apply immediately if auto-apply is enabled
      if (this.options.autoApply) {
        this.applyChanges();
      }
    }
    
    /**
     * Set color for a particle type
     * @param {number} typeId - Type ID
     * @param {string} color - Color string
     * @private
     */
    setTypeColor(typeId, color) {
      // Implementation would update color in the engine
      
      // Update color in type list
      const typeItem = this.typeListContainer.querySelector(`[data-type="${typeId}"]`);
      if (typeItem) {
        const colorBox = typeItem.querySelector(`.${this.options.cssPrefix}-type-color`);
        if (colorBox) {
          colorBox.style.backgroundColor = color;
        }
      }
      
      // Mark changes as pending
      this.pendingChanges = true;
      this.applyButton.disabled = false;
      this.resetButton.disabled = false;
      
      // Apply immediately if auto-apply is enabled
      if (this.options.autoApply) {
        this.applyChanges();
      }
    }
    
    /**
     * Set an interaction property
     * @param {number} fromType - From type ID
     * @param {number} toType - To type ID
     * @param {string} property - Property name
     * @param {*} value - Property value
     * @private
     */
    setInteractionProperty(fromType, toType, property, value) {
      // Implementation would stage changes to be applied later
      
      // Mark changes as pending
      this.pendingChanges = true;
      this.applyButton.disabled = false;
      this.resetButton.disabled = false;
      
      // Apply immediately if auto-apply is enabled
      if (this.options.autoApply) {
        this.applyChanges();
      }
    }
    
    /**
     * Get the number of particle types
     * @return {number} Type count
     * @private
     */
    getTypeCount() {
      // Implementation would get this from the engine
      return this.engine.rules ? this.engine.rules.typeCount : 3;
    }
    
    /**
     * Get color for a particle type
     * @param {number} typeId - Type ID
     * @return {string} Color in hex format
     * @private
     */
    getTypeColor(typeId) {
      // Implementation would get this from the engine
      if (this.engine.renderer && this.engine.renderer.colorManager) {
        const color = this.engine.renderer.colorManager.typeColors[typeId];
        if (color) {
          return `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`;
        }
      }
      
      // Default colors as fallback
      const defaultColors = [
        '#FF5555', '#55FF55', '#5555FF', '#FFFF55', '#FF55FF',
        '#55FFFF', '#FF9955', '#5599FF', '#FF5599', '#99FF55'
      ];
      
      return defaultColors[typeId % defaultColors.length];
    }
    
    /**
     * Get a property for a particle type
     * @param {number} typeId - Type ID
     * @param {string} property - Property name
     * @return {*} Property value
     * @private
     */
    getTypeProperty(typeId, property) {
      // Implementation would get this from the engine
      return this.options.defaultTypeProperties[property];
    }
    
    /**
     * Get interaction between two types
     * @param {number} fromType - From type ID
     * @param {number} toType - To type ID
     * @return {Object} Interaction parameters
     * @private
     */
    getInteraction(fromType, toType) {
      // Implementation would get this from the engine
      if (this.engine.rules) {
        return this.engine.rules.getRule(fromType, toType) || {
          attractionStrength: 0,
          repulsionStrength: 0,
          minDistance: 1,
          activationDistance: 100,
          forceFalloff: 'inverse_square',
          asymmetry: 1.0
        };
      }
      
      // Default values
      return {
        attractionStrength: fromType === toType ? 0 : 0.5,
        repulsionStrength: fromType === toType ? 0.5 : 0.1,
        minDistance: 1,
        activationDistance: 100,
        forceFalloff: 'inverse_square',
        asymmetry: 1.0
      };
    }
    
    /**
     * Generate CSS styles for the editor
     * @return {string} CSS styles
     * @private
     */
    generateStyles() {
      const theme = this.options.theme === 'dark' ?
        {
          background: '#1a1a1a',
          backgroundAlt: '#222222',
          backgroundLight: '#333333',
          text: '#ffffff',
          border: '#444444',
          buttonBg: '#3a3a3a',
          buttonBgHover: '#4a4a4a',
          sliderBg: '#444444',
          sliderThumb: '#cccccc',
          inputBg: '#333333',
          highlight: '#3a74b1'
        } :
        {
          background: '#f5f5f5',
          backgroundAlt: '#e8e8e8',
          backgroundLight: '#ffffff',
          text: '#333333',
          border: '#cccccc',
          buttonBg: '#e0e0e0',
          buttonBgHover: '#d0d0d0',
          sliderBg: '#cccccc',
          sliderThumb: '#666666',
          inputBg: '#ffffff',
          highlight: '#5a94d1'
        };
      
      return `
        /* Base styles */
        .${this.options.cssPrefix} {
          font-family: Arial, sans-serif;
          color: ${theme.text};
          background-color: ${theme.background};
          border-radius: 5px;
          padding: 10px;
          box-sizing: border-box;
        }
        
        .${this.options.cssPrefix}-editor {
          display: flex;
          margin-bottom: 10px;
        }
        
        .${this.options.cssPrefix}-column {
          flex: 1;
          padding: 10px;
          border-radius: 5px;
          background-color: ${theme.backgroundAlt};
          margin: 0 5px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .${this.options.cssPrefix}-column:first-child {
          margin-left: 0;
        }
        
        .${this.options.cssPrefix}-column:last-child {
          margin-right: 0;
        }
        
        .${this.options.cssPrefix}-left {
          flex: 0.7;
        }
        
        .${this.options.cssPrefix}-middle {
          flex: 1;
        }
        
        .${this.options.cssPrefix}-right {
          flex: 1.3;
        }
        
        .${this.options.cssPrefix}-panel-header {
          font-weight: bold;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid ${theme.border};
        }
        
        /* Type list */
        .${this.options.cssPrefix}-type-list {
          margin-bottom: 10px;
        }
        
        .${this.options.cssPrefix}-type-item {
          display: flex;
          align-items: center;
          padding: 8px;
          margin-bottom: 5px;
          background-color: ${theme.backgroundLight};
          border-radius: 3px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .${this.options.cssPrefix}-type-item:hover {
          background-color: ${theme.highlight}33;
        }
        
        .${this.options.cssPrefix}-type-item.selected {
          background-color: ${theme.highlight}66;
        }
        
        .${this.options.cssPrefix}-type-color {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          margin-right: 10px;
          border: 1px solid ${theme.border};
        }
        
        .${this.options.cssPrefix}-type-name {
          flex-grow: 1;
        }
        
        .${this.options.cssPrefix}-type-delete {
          background: none;
          border: none;
          color: ${theme.text}88;
          font-size: 16px;
          cursor: pointer;
          opacity: 0.5;
        }
        
        .${this.options.cssPrefix}-type-delete:hover {
          opacity: 1;
          color: #ff5555;
        }
        
        /* Property editor */
        .${this.options.cssPrefix}-property-container {
          margin-bottom: 10px;
        }
        
        .${this.options.cssPrefix}-property {
          margin-bottom: 15px;
        }
        
        .${this.options.cssPrefix}-property label {
          display: block;
          margin-bottom: 5px;
        }
        
        .${this.options.cssPrefix}-description {
          font-size: 12px;
          opacity: 0.7;
          margin-top: 3px;
        }
        
        .${this.options.cssPrefix}-color-wrapper {
          display: flex;
          align-items: center;
        }
        
        .${this.options.cssPrefix}-color-wrapper input[type="color"] {
          border: none;
          background: none;
          width: 40px;
          height: 30px;
          cursor: pointer;
        }
        
        /* Slider */
        .${this.options.cssPrefix}-slider-wrapper {
          display: flex;
          align-items: center;
        }
        
        .${this.options.cssPrefix}-slider-wrapper input[type="range"] {
          flex-grow: 1;
          margin-right: 10px;
          height: 5px;
          background: ${theme.sliderBg};
          border-radius: 5px;
          appearance: none;
          -webkit-appearance: none;
          outline: none;
        }
        
        .${this.options.cssPrefix}-slider-wrapper input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: ${theme.sliderThumb};
          cursor: pointer;
        }
        
        .${this.options.cssPrefix}-slider-wrapper input[type="range"]::-moz-range-thumb {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: ${theme.sliderThumb};
          cursor: pointer;
          border: none;
        }
        
        .${this.options.cssPrefix}-value {
          min-width: 40px;
          text-align: right;
        }
        
        /* Interaction editor */
        .${this.options.cssPrefix}-interaction-selector {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          background-color: ${theme.backgroundLight};
          padding: 10px;
          border-radius: 5px;
        }
        
        .${this.options.cssPrefix}-selector-group {
          flex-grow: 1;
        }
        
        .${this.options.cssPrefix}-direction {
          font-size: 20px;
          margin: 0 10px;
        }
        
        .${this.options.cssPrefix}-select {
          width: 100%;
          padding: 5px;
          background-color: ${theme.inputBg};
          color: ${theme.text};
          border: 1px solid ${theme.border};
          border-radius: 3px;
        }
        
        .${this.options.cssPrefix}-section-title {
          margin-bottom: 10px;
          padding: 5px;
          background-color: ${theme.backgroundLight};
          border-radius: 3px;
          text-align: center;
        }
        
        .${this.options.cssPrefix}-type-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin: 0 5px;
        }
        
        .${this.options.cssPrefix}-force-graph {
          margin: 15px 0;
          background-color: ${theme.backgroundLight};
          border-radius: 5px;
          padding: 5px;
        }
        
        /* Advanced section */
        .${this.options.cssPrefix}-advanced-section {
          margin-top: 15px;
          border-top: 1px solid ${theme.border};
          padding-top: 10px;
        }
        
        .${this.options.cssPrefix}-advanced-header {
          cursor: pointer;
          position: relative;
          padding-left: 15px;
        }
        
        .${this.options.cssPrefix}-advanced-header:before {
          content: '►';
          position: absolute;
          left: 0;
          top: 0;
          font-size: 10px;
        }
        
        .${this.options.cssPrefix}-advanced-header.expanded:before {
          content: '▼';
        }
        
        .${this.options.cssPrefix}-advanced-content {
          margin-top: 10px;
        }
        
        /* Preview */
        .${this.options.cssPrefix}-preview-container {
          margin-bottom: 10px;
          background-color: ${theme.backgroundAlt};
          border-radius: 5px;
          padding: 10px;
        }
        
        .${this.options.cssPrefix}-preview-canvas {
          display: block;
          margin: 0 auto;
          border: 1px solid ${theme.border};
          border-radius: 3px;
        }
        
        /* Buttons */
        .${this.options.cssPrefix}-button {
          padding: 8px 15px;
          background-color: ${theme.buttonBg};
          border: none;
          border-radius: 3px;
          color: ${theme.text};
          cursor: pointer;
          margin-right: 10px;
          transition: background-color 0.2s;
        }
        
        .${this.options.cssPrefix}-button:hover {
          background-color: ${theme.buttonBgHover};
        }
        
        .${this.options.cssPrefix}-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .${this.options.cssPrefix}-button-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }
        
        .${this.options.cssPrefix}-apply {
          background-color: #4caf50;
          color: white;
        }
        
        .${this.options.cssPrefix}-apply:hover {
          background-color: #45a049;
        }
        
        .${this.options.cssPrefix}-reset {
          background-color: #f44336;
          color: white;
        }
        
        .${this.options.cssPrefix}-reset:hover {
          background-color: #d32f2f;
        }
        
        .${this.options.cssPrefix}-reciprocal {
          width: 100%;
          margin-top: 10px;
        }
        
        /* Matrix modal */
        .${this.options.cssPrefix}-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .${this.options.cssPrefix}-matrix-container {
          background-color: ${theme.background};
          border-radius: 5px;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
          max-width: 90%;
          max-height: 90%;
          overflow: auto;
        }
        
        .${this.options.cssPrefix}-matrix-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          border-bottom: 1px solid ${theme.border};
        }
        
        .${this.options.cssPrefix}-matrix-header h3 {
          margin: 0;
        }
        
        .${this.options.cssPrefix}-close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: ${theme.text};
        }
        
        .${this.options.cssPrefix}-matrix {
          border-collapse: collapse;
          margin: 15px;
        }
        
        .${this.options.cssPrefix}-matrix th,
        .${this.options.cssPrefix}-matrix td {
          padding: 10px;
          text-align: center;
          border: 1px solid ${theme.border};
        }
        
        .${this.options.cssPrefix}-matrix-corner {
          font-size: 12px;
          opacity: 0.7;
        }
        
        .${this.options.cssPrefix}-matrix-type {
          color: ${theme.text};
        }
        
        .${this.options.cssPrefix}-matrix-cell {
          min-width: 100px;
          min-height: 80px;
        }
        
        .${this.options.cssPrefix}-matrix-cell-content {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .${this.options.cssPrefix}-matrix-value {
          margin-bottom: 5px;
          font-size: 12px;
        }
        
        .${this.options.cssPrefix}-matrix-value span {
          font-weight: bold;
        }
        
        .${this.options.cssPrefix}-matrix-asymmetry {
          font-size: 18px;
          margin: 5px 0;
        }
        
        .${this.options.cssPrefix}-matrix-edit {
          margin-top: 5px;
          padding: 3px 8px;
          font-size: 12px;
        }
      `;
    }
  }
  
  export default TypeEditor;