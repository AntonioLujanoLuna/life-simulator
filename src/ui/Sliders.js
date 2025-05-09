/**
 * Sliders.js - Parameter adjustment controls
 * 
 * Features:
 * - Advanced slider controls with various types
 * - Real-time parameter updates
 * - Numeric input with validation
 * - Value range indicator
 * - Precision control
 */

class Sliders {
    /**
     * Create slider controls manager
     * @param {Object} engine - Simulation engine
     * @param {Object} options - Configuration options
     */
    constructor(engine, options = {}) {
      this.engine = engine;
      
      // Default options
      this.options = Object.assign({
        theme: 'dark',             // Matches Controls.js theme
        precision: 2,              // Default decimal precision for display
        showMinMax: true,          // Show min/max values
        showLabels: true,          // Show labels
        showValue: true,           // Show current value
        showTooltips: true,        // Show tooltips
        useNumberInputs: true,     // Show number input field alongside slider
        useLiveUpdate: false,      // Update on input vs change events
        animateValueChanges: true, // Animate value display changes
        vertical: false,           // Vertical sliders
        groupRelatedControls: true, // Group related controls
        cssPrefix: 'sim-slider',   // CSS prefix for classes
      }, options);
      
      // Slider registry
      this.sliders = {};
      
      // Slider groups
      this.groups = {};
      
      // CSS styles added to document
      this.stylesAdded = false;
    }
    
    /**
     * Create a new slider
     * @param {Object} options - Slider options
     * @param {HTMLElement} container - Container element
     * @return {Object} Slider components {slider, input, display}
     */
    createSlider(options, container) {
      const {
        id,
        label = '',
        min = 0,
        max = 100,
        step = 1,
        value = min,
        precision = this.options.precision,
        onChange = null,
        onInput = null,
        group = null,
        tooltip = null,
        unit = '',
        logarithmic = false,
        colorScale = false,
        colors = null
      } = options;
      
      // Add styles if not already added
      this.ensureStylesAdded();
      
      // Create slider container
      const sliderContainer = document.createElement('div');
      sliderContainer.className = `${this.options.cssPrefix}-container`;
      
      if (this.options.vertical) {
        sliderContainer.classList.add(`${this.options.cssPrefix}-vertical`);
      }
      
      // Create label if enabled
      if (label && this.options.showLabels) {
        const labelElement = document.createElement('div');
        labelElement.className = `${this.options.cssPrefix}-label`;
        labelElement.textContent = label;
        
        if (tooltip && this.options.showTooltips) {
          labelElement.title = tooltip;
        }
        
        sliderContainer.appendChild(labelElement);
      }
      
      // Create slider controls container
      const controlsContainer = document.createElement('div');
      controlsContainer.className = `${this.options.cssPrefix}-controls`;
      
      // Create slider element
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = `${this.options.cssPrefix}`;
      slider.id = id;
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.value = value;
      
      if (tooltip && this.options.showTooltips) {
        slider.title = tooltip;
      }
      
      // Create min/max labels if enabled
      if (this.options.showMinMax) {
        const rangeContainer = document.createElement('div');
        rangeContainer.className = `${this.options.cssPrefix}-range`;
        
        const minLabel = document.createElement('span');
        minLabel.className = `${this.options.cssPrefix}-min`;
        minLabel.textContent = this.formatValue(min, precision, unit);
        
        const maxLabel = document.createElement('span');
        maxLabel.className = `${this.options.cssPrefix}-max`;
        maxLabel.textContent = this.formatValue(max, precision, unit);
        
        rangeContainer.appendChild(minLabel);
        rangeContainer.appendChild(maxLabel);
        
        if (this.options.vertical) {
          // For vertical sliders, min is at bottom, max at top
          rangeContainer.style.flexDirection = 'column-reverse';
        }
        
        controlsContainer.appendChild(rangeContainer);
      }
      
      // Create slider wrapper
      const sliderWrapper = document.createElement('div');
      sliderWrapper.className = `${this.options.cssPrefix}-wrapper`;
      
      // Add color scale background if enabled
      if (colorScale && colors) {
        // Create gradient from colors
        let gradient;
        
        if (this.options.vertical) {
          gradient = 'linear-gradient(to top, ';
        } else {
          gradient = 'linear-gradient(to right, ';
        }
        
        colors.forEach((color, index) => {
          gradient += color + ' ' + (index * 100 / (colors.length - 1)) + '%';
          
          if (index < colors.length - 1) {
            gradient += ', ';
          }
        });
        
        gradient += ')';
        
        sliderWrapper.style.background = gradient;
      }
      
      sliderWrapper.appendChild(slider);
      controlsContainer.appendChild(sliderWrapper);
      
      // Create value display and/or input
      let valueDisplay = null;
      let numberInput = null;
      
      const valueContainer = document.createElement('div');
      valueContainer.className = `${this.options.cssPrefix}-value-container`;
      
      if (this.options.showValue) {
        valueDisplay = document.createElement('span');
        valueDisplay.className = `${this.options.cssPrefix}-value`;
        valueDisplay.textContent = this.formatValue(value, precision, unit);
        valueContainer.appendChild(valueDisplay);
      }
      
      if (this.options.useNumberInputs) {
        numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.className = `${this.options.cssPrefix}-input`;
        numberInput.min = min;
        numberInput.max = max;
        numberInput.step = step;
        numberInput.value = value;
        
        // Add unit if present
        if (unit) {
          const inputGroup = document.createElement('div');
          inputGroup.className = `${this.options.cssPrefix}-input-group`;
          
          inputGroup.appendChild(numberInput);
          
          const unitSpan = document.createElement('span');
          unitSpan.className = `${this.options.cssPrefix}-unit`;
          unitSpan.textContent = unit;
          inputGroup.appendChild(unitSpan);
          
          valueContainer.appendChild(inputGroup);
        } else {
          valueContainer.appendChild(numberInput);
        }
      }
      
      controlsContainer.appendChild(valueContainer);
      sliderContainer.appendChild(controlsContainer);
      
      // Add to container
      container.appendChild(sliderContainer);
      
      // Event handlers
      
      // Convert between logarithmic and linear scales if needed
      const logToLinear = (logVal) => {
        if (!logarithmic) return logVal;
        
        const minLog = Math.log(Math.max(0.0001, min));
        const maxLog = Math.log(Math.max(0.0001, max));
        const scale = (maxLog - minLog) / (max - min);
        
        return Math.exp(minLog + scale * (logVal - min));
      };
      
      const linearToLog = (linVal) => {
        if (!logarithmic) return linVal;
        
        const minLog = Math.log(Math.max(0.0001, min));
        const maxLog = Math.log(Math.max(0.0001, max));
        const scale = (maxLog - minLog) / (max - min);
        
        return min + (Math.log(Math.max(0.0001, linVal)) - minLog) / scale;
      };
      
      // Update displayed value
      const updateDisplayedValue = () => {
        const displayVal = logToLinear(parseFloat(slider.value));
        
        if (valueDisplay) {
          if (this.options.animateValueChanges) {
            valueDisplay.classList.add('updating');
            setTimeout(() => {
              valueDisplay.textContent = this.formatValue(displayVal, precision, unit);
              valueDisplay.classList.remove('updating');
            }, 50);
          } else {
            valueDisplay.textContent = this.formatValue(displayVal, precision, unit);
          }
        }
        
        if (numberInput && document.activeElement !== numberInput) {
          numberInput.value = displayVal.toFixed(precision);
        }
      };
      
      // Handle slider input event (during drag)
      slider.addEventListener('input', () => {
        updateDisplayedValue();
        
        if (this.options.useLiveUpdate && onInput) {
          const value = logToLinear(parseFloat(slider.value));
          onInput(value);
        }
      });
      
      // Handle slider change event (after drag)
      slider.addEventListener('change', () => {
        const value = logToLinear(parseFloat(slider.value));
        
        updateDisplayedValue();
        
        if (onChange) {
          onChange(value);
        }
      });
      
      // Handle number input
      if (numberInput) {
        numberInput.addEventListener('change', () => {
          const value = parseFloat(numberInput.value);
          
          // Validate input
          if (isNaN(value)) {
            numberInput.value = slider.value;
            return;
          }
          
          // Clamp to min/max
          const clampedValue = Math.max(min, Math.min(max, value));
          if (clampedValue !== value) {
            numberInput.value = clampedValue;
          }
          
          const logValue = linearToLog(clampedValue);
          slider.value = logValue;
          
          if (onChange) {
            onChange(clampedValue);
          }
        });
      }
      
      // Add to registry
      this.sliders[id] = {
        slider,
        valueDisplay,
        numberInput,
        container: sliderContainer,
        options,
        getValue: () => logToLinear(parseFloat(slider.value)),
        setValue: (newValue) => {
          const logValue = linearToLog(Math.max(min, Math.min(max, newValue)));
          slider.value = logValue;
          updateDisplayedValue();
        }
      };
      
      // Add to group if specified
      if (group) {
        if (!this.groups[group]) {
          this.groups[group] = [];
        }
        this.groups[group].push(id);
      }
      
      return this.sliders[id];
    }
    
    /**
     * Create a group of related sliders
     * @param {string} groupId - Group ID
     * @param {string} label - Group label
     * @param {Array} sliders - Array of slider options
     * @param {HTMLElement} container - Container element
     * @return {HTMLElement} Group container
     */
    createSliderGroup(groupId, label, sliders, container) {
      // Create group container
      const groupContainer = document.createElement('div');
      groupContainer.className = `${this.options.cssPrefix}-group`;
      groupContainer.dataset.group = groupId;
      
      // Add group label if provided
      if (label) {
        const groupLabel = document.createElement('div');
        groupLabel.className = `${this.options.cssPrefix}-group-label`;
        groupLabel.textContent = label;
        groupContainer.appendChild(groupLabel);
      }
      
      // Create sliders
      sliders.forEach(sliderOptions => {
        this.createSlider({
          ...sliderOptions,
          group: groupId
        }, groupContainer);
      });
      
      // Add to container
      container.appendChild(groupContainer);
      
      return groupContainer;
    }
    
    /**
     * Create a 2D slider control (joint control for two parameters)
     * @param {Object} options - 2D slider options
     * @param {HTMLElement} container - Container element
     * @return {Object} 2D slider components
     */
    create2DSlider(options, container) {
      const {
        id,
        label = '',
        xLabel = 'X',
        yLabel = 'Y',
        xMin = -1,
        xMax = 1,
        yMin = -1,
        yMax = 1,
        xValue = 0,
        yValue = 0,
        xStep = 0.01,
        yStep = 0.01,
        size = 200,
        onChange = null,
        tooltip = null
      } = options;
      
      // Add styles if not already added
      this.ensureStylesAdded();
      
      // Create container
      const sliderContainer = document.createElement('div');
      sliderContainer.className = `${this.options.cssPrefix}-2d-container`;
      
      // Add label if provided
      if (label) {
        const labelElement = document.createElement('div');
        labelElement.className = `${this.options.cssPrefix}-label`;
        labelElement.textContent = label;
        
        if (tooltip && this.options.showTooltips) {
          labelElement.title = tooltip;
        }
        
        sliderContainer.appendChild(labelElement);
      }
      
      // Create 2D pad
      const pad = document.createElement('div');
      pad.className = `${this.options.cssPrefix}-2d-pad`;
      pad.style.width = `${size}px`;
      pad.style.height = `${size}px`;
      
      // Create handle
      const handle = document.createElement('div');
      handle.className = `${this.options.cssPrefix}-2d-handle`;
      pad.appendChild(handle);
      
      // Create axis labels
      if (xLabel || yLabel) {
        const xAxisLabel = document.createElement('div');
        xAxisLabel.className = `${this.options.cssPrefix}-2d-x-label`;
        xAxisLabel.textContent = xLabel;
        pad.appendChild(xAxisLabel);
        
        const yAxisLabel = document.createElement('div');
        yAxisLabel.className = `${this.options.cssPrefix}-2d-y-label`;
        yAxisLabel.textContent = yLabel;
        pad.appendChild(yAxisLabel);
      }
      
      // Add pad to container
      sliderContainer.appendChild(pad);
      
      // Create value displays
      const valueContainer = document.createElement('div');
      valueContainer.className = `${this.options.cssPrefix}-2d-values`;
      
      // X value
      const xContainer = document.createElement('div');
      xContainer.className = `${this.options.cssPrefix}-2d-value`;
      
      const xValueLabel = document.createElement('span');
      xValueLabel.textContent = `${xLabel}: `;
      xContainer.appendChild(xValueLabel);
      
      const xValueDisplay = document.createElement('span');
      xValueDisplay.className = `${this.options.cssPrefix}-2d-value-x`;
      xValueDisplay.textContent = xValue.toFixed(2);
      xContainer.appendChild(xValueDisplay);
      
      valueContainer.appendChild(xContainer);
      
      // Y value
      const yContainer = document.createElement('div');
      yContainer.className = `${this.options.cssPrefix}-2d-value`;
      
      const yValueLabel = document.createElement('span');
      yValueLabel.textContent = `${yLabel}: `;
      yContainer.appendChild(yValueLabel);
      
      const yValueDisplay = document.createElement('span');
      yValueDisplay.className = `${this.options.cssPrefix}-2d-value-y`;
      yValueDisplay.textContent = yValue.toFixed(2);
      yContainer.appendChild(yValueDisplay);
      
      valueContainer.appendChild(yContainer);
      
      sliderContainer.appendChild(valueContainer);
      
      // Add to container
      container.appendChild(sliderContainer);
      
      // Functions to convert between pad coordinates and value
      const xToPos = (x) => {
        return ((x - xMin) / (xMax - xMin)) * size;
      };
      
      const yToPos = (y) => {
        return size - ((y - yMin) / (yMax - yMin)) * size;
      };
      
      const posToX = (pos) => {
        return xMin + (pos / size) * (xMax - xMin);
      };
      
      const posToY = (pos) => {
        return yMin + ((size - pos) / size) * (yMax - yMin);
      };
      
      // Initialize handle position
      let currentX = xValue;
      let currentY = yValue;
      
      const updateHandlePosition = () => {
        const xPos = xToPos(currentX);
        const yPos = yToPos(currentY);
        
        handle.style.left = `${xPos}px`;
        handle.style.top = `${yPos}px`;
        
        xValueDisplay.textContent = currentX.toFixed(2);
        yValueDisplay.textContent = currentY.toFixed(2);
      };
      
      updateHandlePosition();
      
      // Handle mouse/touch interaction
      let isDragging = false;
      
      const startDrag = (e) => {
        e.preventDefault();
        isDragging = true;
        updateFromEvent(e);
        pad.classList.add('active');
      };
      
      const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        pad.classList.remove('active');
        
        if (onChange) {
          onChange(currentX, currentY);
        }
      };
      
      const updateFromEvent = (e) => {
        if (!isDragging) return;
        
        let clientX, clientY;
        
        if (e.touches) {
          // Touch event
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          // Mouse event
          clientX = e.clientX;
          clientY = e.clientY;
        }
        
        const rect = pad.getBoundingClientRect();
        let x = clientX - rect.left;
        let y = clientY - rect.top;
        
        // Clamp to pad bounds
        x = Math.max(0, Math.min(size, x));
        y = Math.max(0, Math.min(size, y));
        
        // Convert to values
        currentX = posToX(x);
        currentY = posToY(y);
        
        // Apply step
        currentX = Math.round(currentX / xStep) * xStep;
        currentY = Math.round(currentY / yStep) * yStep;
        
        // Clamp to min/max
        currentX = Math.max(xMin, Math.min(xMax, currentX));
        currentY = Math.max(yMin, Math.min(yMax, currentY));
        
        updateHandlePosition();
      };
      
      // Mouse events
      pad.addEventListener('mousedown', startDrag);
      window.addEventListener('mousemove', updateFromEvent);
      window.addEventListener('mouseup', stopDrag);
      
      // Touch events
      pad.addEventListener('touchstart', startDrag);
      window.addEventListener('touchmove', updateFromEvent);
      window.addEventListener('touchend', stopDrag);
      window.addEventListener('touchcancel', stopDrag);
      
      // Register 2D slider
      this.sliders[id] = {
        container: sliderContainer,
        pad,
        handle,
        xValueDisplay,
        yValueDisplay,
        options,
        getValue: () => ({ x: currentX, y: currentY }),
        setValue: (x, y) => {
          currentX = Math.max(xMin, Math.min(xMax, x));
          currentY = Math.max(yMin, Math.min(yMax, y));
          updateHandlePosition();
        }
      };
      
      return this.sliders[id];
    }
    
    /**
     * Create a radial slider control
     * @param {Object} options - Radial slider options
     * @param {HTMLElement} container - Container element
     * @return {Object} Radial slider components
     */
    createRadialSlider(options, container) {
      const {
        id,
        label = '',
        min = 0,
        max = 100,
        step = 1,
        value = min,
        angleMin = 0,
        angleMax = 360,
        size = 150,
        onChange = null,
        tooltip = null,
        unit = '',
        trackWidth = 10,
        showMinMax = true,
        prefix = ''
      } = options;
      
      // Add styles if not already added
      this.ensureStylesAdded();
      
      // Create container
      const sliderContainer = document.createElement('div');
      sliderContainer.className = `${this.options.cssPrefix}-radial-container`;
      
      // Add label if provided
      if (label) {
        const labelElement = document.createElement('div');
        labelElement.className = `${this.options.cssPrefix}-label`;
        labelElement.textContent = label;
        
        if (tooltip && this.options.showTooltips) {
          labelElement.title = tooltip;
        }
        
        sliderContainer.appendChild(labelElement);
      }
      
      // Create radial pad
      const pad = document.createElement('div');
      pad.className = `${this.options.cssPrefix}-radial-pad`;
      pad.style.width = `${size}px`;
      pad.style.height = `${size}px`;
      
      // Create track
      const track = document.createElement('div');
      track.className = `${this.options.cssPrefix}-radial-track`;
      track.style.borderWidth = `${trackWidth}px`;
      pad.appendChild(track);
      
      // Create filled track
      const filledTrack = document.createElement('svg');
      filledTrack.className = `${this.options.cssPrefix}-radial-filled`;
      filledTrack.setAttribute('viewBox', `0 0 ${size} ${size}`);
      filledTrack.style.width = `${size}px`;
      filledTrack.style.height = `${size}px`;
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', size / 2);
      circle.setAttribute('cy', size / 2);
      circle.setAttribute('r', (size - trackWidth * 2) / 2);
      circle.setAttribute('stroke-width', trackWidth);
      circle.setAttribute('fill', 'none');
      filledTrack.appendChild(circle);
      
      pad.appendChild(filledTrack);
      
      // Create handle
      const handle = document.createElement('div');
      handle.className = `${this.options.cssPrefix}-radial-handle`;
      pad.appendChild(handle);
      
      // Create value display
      const valueDisplay = document.createElement('div');
      valueDisplay.className = `${this.options.cssPrefix}-radial-value`;
      
      const valueText = document.createElement('span');
      valueText.className = `${this.options.cssPrefix}-radial-value-text`;
      valueText.textContent = prefix + value + unit;
      valueDisplay.appendChild(valueText);
      
      pad.appendChild(valueDisplay);
      
      // Add min/max labels if enabled
      if (showMinMax) {
        const minLabel = document.createElement('div');
        minLabel.className = `${this.options.cssPrefix}-radial-min`;
        minLabel.textContent = min;
        pad.appendChild(minLabel);
        
        const maxLabel = document.createElement('div');
        maxLabel.className = `${this.options.cssPrefix}-radial-max`;
        maxLabel.textContent = max;
        pad.appendChild(maxLabel);
      }
      
      // Add to container
      sliderContainer.appendChild(pad);
      container.appendChild(sliderContainer);
      
      // Convert between angle and value
      const angleToValue = (angle) => {
        const angleRange = angleMax - angleMin;
        const valueRange = max - min;
        return min + (angle - angleMin) / angleRange * valueRange;
      };
      
      const valueToAngle = (value) => {
        const angleRange = angleMax - angleMin;
        const valueRange = max - min;
        return angleMin + (value - min) / valueRange * angleRange;
      };
      
      // Convert position to angle
      const posToAngle = (x, y) => {
        const centerX = size / 2;
        const centerY = size / 2;
        
        const dx = x - centerX;
        const dy = y - centerY;
        
        // Calculate angle in degrees
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Adjust to 0-360 range
        if (angle < 0) {
          angle += 360;
        }
        
        return angle;
      };
      
      // Calculate handle position from angle
      const angleToPos = (angle) => {
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2 - trackWidth;
        
        // Convert angle to radians
        const radians = angle * Math.PI / 180;
        
        return {
          x: centerX + radius * Math.cos(radians),
          y: centerY + radius * Math.sin(radians)
        };
      };
      
      // Update SVG arc
      const updateArc = (angle) => {
        // Normalize angle for arc drawing
        let startAngle = angleMin;
        let endAngle = angle;
        
        // Ensure we draw in the correct direction
        if (startAngle > endAngle) {
          [startAngle, endAngle] = [endAngle, startAngle];
        }
        
        // Convert to radians
        startAngle = startAngle * Math.PI / 180;
        endAngle = endAngle * Math.PI / 180;
        
        const radius = (size - trackWidth * 2) / 2;
        const centerX = size / 2;
        const centerY = size / 2;
        
        // Calculate arc points
        const startX = centerX + radius * Math.cos(startAngle);
        const startY = centerY + radius * Math.sin(startAngle);
        const endX = centerX + radius * Math.cos(endAngle);
        const endY = centerY + radius * Math.sin(endAngle);
        
        // Determine if we need to draw a large arc
        const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
        
        // Create path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `
          M ${startX} ${startY}
          A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
        `);
        path.setAttribute('stroke-width', trackWidth);
        path.setAttribute('fill', 'none');
        
        // Replace existing circle with path
        filledTrack.innerHTML = '';
        filledTrack.appendChild(path);
      };
      
      // Current value
      let currentValue = value;
      
      // Update display
      const updateDisplay = () => {
        const angle = valueToAngle(currentValue);
        const pos = angleToPos(angle);
        
        // Update handle position
        handle.style.left = `${pos.x}px`;
        handle.style.top = `${pos.y}px`;
        
        // Update value display
        valueText.textContent = prefix + currentValue.toFixed(step < 1 ? 2 : 0) + unit;
        
        // Update arc
        updateArc(angle);
      };
      
      updateDisplay();
      
      // Handle interaction
      let isDragging = false;
      
      const startDrag = (e) => {
        e.preventDefault();
        isDragging = true;
        updateFromEvent(e);
        pad.classList.add('active');
      };
      
      const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        pad.classList.remove('active');
        
        if (onChange) {
          onChange(currentValue);
        }
      };
      
      const updateFromEvent = (e) => {
        if (!isDragging) return;
        
        let clientX, clientY;
        
        if (e.touches) {
          // Touch event
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          // Mouse event
          clientX = e.clientX;
          clientY = e.clientY;
        }
        
        const rect = pad.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // Calculate angle
        const angle = posToAngle(x, y);
        
        // Calculate value
        let newValue = angleToValue(angle);
        
        // Apply step
        newValue = Math.round(newValue / step) * step;
        
        // Clamp to min/max
        currentValue = Math.max(min, Math.min(max, newValue));
        
        updateDisplay();
      };
      
      // Mouse events
      pad.addEventListener('mousedown', startDrag);
      window.addEventListener('mousemove', updateFromEvent);
      window.addEventListener('mouseup', stopDrag);
      
      // Touch events
      pad.addEventListener('touchstart', startDrag);
      window.addEventListener('touchmove', updateFromEvent);
      window.addEventListener('touchend', stopDrag);
      window.addEventListener('touchcancel', stopDrag);
      
      // Register radial slider
      this.sliders[id] = {
        container: sliderContainer,
        pad,
        handle,
        valueDisplay: valueText,
        options,
        getValue: () => currentValue,
        setValue: (newValue) => {
          currentValue = Math.max(min, Math.min(max, newValue));
          updateDisplay();
        }
      };
      
      return this.sliders[id];
    }
    
    /**
     * Create multi-thumb range slider
     * @param {Object} options - Range slider options
     * @param {HTMLElement} container - Container element
     * @return {Object} Range slider components
     */
    createRangeSlider(options, container) {
      const {
        id,
        label = '',
        min = 0,
        max = 100,
        step = 1,
        values = [25, 75],
        precision = this.options.precision,
        onChange = null,
        tooltip = null,
        unit = '',
        showLabels = true,
        colorFill = true
      } = options;
      
      // Add styles if not already added
      this.ensureStylesAdded();
      
      // Create container
      const sliderContainer = document.createElement('div');
      sliderContainer.className = `${this.options.cssPrefix}-range-container`;
      
      // Add label if provided
      if (label && showLabels) {
        const labelElement = document.createElement('div');
        labelElement.className = `${this.options.cssPrefix}-label`;
        labelElement.textContent = label;
        
        if (tooltip && this.options.showTooltips) {
          labelElement.title = tooltip;
        }
        
        sliderContainer.appendChild(labelElement);
      }
      
      // Create range element
      const rangeElement = document.createElement('div');
      rangeElement.className = `${this.options.cssPrefix}-range`;
      
      // Create track
      const track = document.createElement('div');
      track.className = `${this.options.cssPrefix}-range-track`;
      rangeElement.appendChild(track);
      
      // Create filled track
      const filledTrack = document.createElement('div');
      filledTrack.className = `${this.options.cssPrefix}-range-fill`;
      rangeElement.appendChild(filledTrack);
      
      // Create thumbs
      const thumbs = [];
      
      for (let i = 0; i < values.length; i++) {
        const thumb = document.createElement('div');
        thumb.className = `${this.options.cssPrefix}-range-thumb`;
        thumb.dataset.index = i;
        
        // Create tooltip
        const thumbTooltip = document.createElement('div');
        thumbTooltip.className = `${this.options.cssPrefix}-range-tooltip`;
        thumbTooltip.textContent = this.formatValue(values[i], precision, unit);
        thumb.appendChild(thumbTooltip);
        
        rangeElement.appendChild(thumb);
        thumbs.push(thumb);
      }
      
      // Add min/max labels if enabled
      if (this.options.showMinMax) {
        const minLabel = document.createElement('div');
        minLabel.className = `${this.options.cssPrefix}-range-min`;
        minLabel.textContent = this.formatValue(min, precision, unit);
        rangeElement.appendChild(minLabel);
        
        const maxLabel = document.createElement('div');
        maxLabel.className = `${this.options.cssPrefix}-range-max`;
        maxLabel.textContent = this.formatValue(max, precision, unit);
        rangeElement.appendChild(maxLabel);
      }
      
      // Add to container
      sliderContainer.appendChild(rangeElement);
      container.appendChild(sliderContainer);
      
      // Current values
      const currentValues = [...values];
      
      // Utility functions
      const valueToPosition = (value) => {
        return ((value - min) / (max - min)) * 100;
      };
      
      const positionToValue = (position, width) => {
        const percent = position / width;
        return min + percent * (max - min);
      };
      
      // Update display
      const updateDisplay = () => {
        // Sort values
        const sortedValues = [...currentValues].sort((a, b) => a - b);
        
        // Update thumb positions
        for (let i = 0; i < thumbs.length; i++) {
          const percent = valueToPosition(currentValues[i]);
          thumbs[i].style.left = `${percent}%`;
          
          // Update tooltip
          const tooltip = thumbs[i].querySelector(`.${this.options.cssPrefix}-range-tooltip`);
          tooltip.textContent = this.formatValue(currentValues[i], precision, unit);
        }
        
        // Update filled track
        if (colorFill && thumbs.length >= 2) {
          const minVal = Math.min(...currentValues);
          const maxVal = Math.max(...currentValues);
          
          const leftPercent = valueToPosition(minVal);
          const rightPercent = valueToPosition(maxVal);
          
          filledTrack.style.left = `${leftPercent}%`;
          filledTrack.style.width = `${rightPercent - leftPercent}%`;
        }
      };
      
      updateDisplay();
      
      // Handle interaction
      let activeDrag = null;
      
      const startDrag = (e) => {
        const target = e.target;
        
        if (target.classList.contains(`${this.options.cssPrefix}-range-thumb`)) {
          e.preventDefault();
          activeDrag = target;
          const thumbIndex = parseInt(target.dataset.index, 10);
          
          // Show tooltip
          const tooltip = target.querySelector(`.${this.options.cssPrefix}-range-tooltip`);
          tooltip.classList.add('visible');
          
          updateFromEvent(e);
        }
      };
      
      const stopDrag = () => {
        if (!activeDrag) return;
        
        // Hide tooltip
        const tooltip = activeDrag.querySelector(`.${this.options.cssPrefix}-range-tooltip`);
        tooltip.classList.remove('visible');
        
        activeDrag = null;
        
        if (onChange) {
          onChange(currentValues);
        }
      };
      
      const updateFromEvent = (e) => {
        if (!activeDrag) return;
        
        const thumbIndex = parseInt(activeDrag.dataset.index, 10);
        const rect = rangeElement.getBoundingClientRect();
        
        let clientX;
        
        if (e.touches) {
          // Touch event
          clientX = e.touches[0].clientX;
        } else {
          // Mouse event
          clientX = e.clientX;
        }
        
        const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
        
        // Calculate value
        let newValue = positionToValue(relativeX, rect.width);
        
        // Apply step
        newValue = Math.round(newValue / step) * step;
        
        // Clamp to min/max
        newValue = Math.max(min, Math.min(max, newValue));
        
        // Update value
        currentValues[thumbIndex] = newValue;
        
        updateDisplay();
      };
      
      // Mouse events
      rangeElement.addEventListener('mousedown', startDrag);
      window.addEventListener('mousemove', updateFromEvent);
      window.addEventListener('mouseup', stopDrag);
      
      // Touch events
      rangeElement.addEventListener('touchstart', startDrag);
      window.addEventListener('touchmove', updateFromEvent);
      window.addEventListener('touchend', stopDrag);
      window.addEventListener('touchcancel', stopDrag);
      
      // Register range slider
      this.sliders[id] = {
        container: sliderContainer,
        rangeElement,
        thumbs,
        filledTrack,
        options,
        getValue: () => [...currentValues],
        setValue: (newValues) => {
          if (Array.isArray(newValues) && newValues.length === currentValues.length) {
            for (let i = 0; i < newValues.length; i++) {
              currentValues[i] = Math.max(min, Math.min(max, newValues[i]));
            }
            updateDisplay();
          }
        }
      };
      
      return this.sliders[id];
    }
    
    /**
     * Get a slider by ID
     * @param {string} id - Slider ID
     * @return {Object|null} Slider object or null if not found
     */
    getSlider(id) {
      return this.sliders[id] || null;
    }
    
    /**
     * Get sliders in a group
     * @param {string} groupId - Group ID
     * @return {Array} Array of slider objects
     */
    getSliderGroup(groupId) {
      const sliderIds = this.groups[groupId] || [];
      return sliderIds.map(id => this.sliders[id]).filter(Boolean);
    }
    
    /**
     * Update a slider's value
     * @param {string} id - Slider ID
     * @param {number|Array} value - New value
     * @param {boolean} triggerChange - Whether to trigger onChange event
     * @return {boolean} Success
     */
    updateSliderValue(id, value, triggerChange = false) {
      const slider = this.sliders[id];
      if (!slider) return false;
      
      slider.setValue(value);
      
      if (triggerChange && slider.options.onChange) {
        slider.options.onChange(value);
      }
      
      return true;
    }
    
    /**
     * Format value for display
     * @param {number} value - Value to format
     * @param {number} precision - Decimal precision
     * @param {string} unit - Unit to append
     * @return {string} Formatted value
     * @private
     */
    formatValue(value, precision, unit = '') {
      // Format by precision
      let formatted;
      
      if (precision === 0) {
        formatted = Math.round(value).toString();
      } else {
        formatted = value.toFixed(precision);
      }
      
      // Add unit if present
      if (unit) {
        formatted += unit;
      }
      
      return formatted;
    }
    
    /**
     * Add CSS styles for sliders
     * @private
     */
    ensureStylesAdded() {
      if (this.stylesAdded) return;
      
      const theme = this.options.theme === 'dark' ?
        {
          background: '#1a1a1a',
          text: '#ffffff',
          slider: '#505050',
          sliderThumb: '#909090',
          sliderFilled: '#606060',
          sliderHover: '#707070'
        } :
        {
          background: '#f5f5f5',
          text: '#2a2a2a',
          slider: '#cccccc',
          sliderThumb: '#707070',
          sliderFilled: '#999999',
          sliderHover: '#888888'
        };
      
      const style = document.createElement('style');
      style.textContent = `
        /* Basic slider styles */
        .${this.options.cssPrefix}-container {
          margin-bottom: 15px;
        }
        
        .${this.options.cssPrefix}-vertical {
          height: 200px;
          display: flex;
          flex-direction: column;
        }
        
        .${this.options.cssPrefix}-label {
          margin-bottom: 5px;
          display: flex;
          justify-content: space-between;
          color: ${theme.text};
        }
        
        .${this.options.cssPrefix}-controls {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .${this.options.cssPrefix}-vertical .${this.options.cssPrefix}-controls {
          flex-direction: column;
          height: 100%;
        }
        
        .${this.options.cssPrefix}-range {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: ${theme.text};
          opacity: 0.7;
        }
        
        .${this.options.cssPrefix}-vertical .${this.options.cssPrefix}-range {
          flex-direction: column;
          height: 100%;
          margin-right: 10px;
        }
        
        .${this.options.cssPrefix}-wrapper {
          flex-grow: 1;
          position: relative;
          margin: 0 10px;
        }
        
        .${this.options.cssPrefix}-vertical .${this.options.cssPrefix}-wrapper {
          height: 100%;
          width: 30px;
          margin: 10px 0;
        }
        
        .${this.options.cssPrefix} {
          -webkit-appearance: none;
          width: 100%;
          height: 5px;
          border-radius: 5px;
          background: ${theme.slider};
          outline: none;
        }
        
        .${this.options.cssPrefix}-vertical .${this.options.cssPrefix} {
          width: 5px;
          height: 100%;
          transform: rotate(270deg);
          transform-origin: center center;
          margin: 0;
        }
        
        .${this.options.cssPrefix}::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: ${theme.sliderThumb};
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .${this.options.cssPrefix}::-moz-range-thumb {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: ${theme.sliderThumb};
          cursor: pointer;
          border: none;
          transition: background 0.2s;
        }
        
        .${this.options.cssPrefix}::-webkit-slider-thumb:hover {
          background: ${theme.sliderHover};
        }
        
        .${this.options.cssPrefix}::-moz-range-thumb:hover {
          background: ${theme.sliderHover};
        }
        
        .${this.options.cssPrefix}-value-container {
          min-width: 60px;
          text-align: center;
        }
        
        .${this.options.cssPrefix}-value {
          display: inline-block;
          transition: opacity 0.2s;
        }
        
        .${this.options.cssPrefix}-value.updating {
          opacity: 0.5;
        }
        
        .${this.options.cssPrefix}-input {
          width: 60px;
          padding: 3px;
          text-align: center;
          background-color: ${theme.background};
          border: 1px solid ${theme.slider};
          border-radius: 3px;
          color: ${theme.text};
        }
        
        .${this.options.cssPrefix}-input-group {
          position: relative;
          display: inline-block;
        }
        
        .${this.options.cssPrefix}-unit {
          position: absolute;
          right: 5px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.7;
          font-size: 12px;
          pointer-events: none;
        }
        
        /* Group styles */
        .${this.options.cssPrefix}-group {
          border: 1px solid ${theme.slider};
          border-radius: 5px;
          padding: 10px;
          margin-bottom: 15px;
        }
        
        .${this.options.cssPrefix}-group-label {
          margin: -20px 0 10px 10px;
          background-color: ${theme.background};
          padding: 0 5px;
          display: inline-block;
          font-weight: bold;
          color: ${theme.text};
        }
        
        /* 2D slider styles */
        .${this.options.cssPrefix}-2d-container {
          margin-bottom: 20px;
        }
        
        .${this.options.cssPrefix}-2d-pad {
          position: relative;
          background-color: ${theme.slider};
          border-radius: 5px;
          margin: 10px 0;
        }
        
        .${this.options.cssPrefix}-2d-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${theme.sliderThumb};
          transform: translate(-50%, -50%);
          cursor: pointer;
          z-index: 2;
        }
        
        .${this.options.cssPrefix}-2d-x-label,
        .${this.options.cssPrefix}-2d-y-label {
          position: absolute;
          color: ${theme.text};
          font-size: 12px;
          opacity: 0.7;
        }
        
        .${this.options.cssPrefix}-2d-x-label {
          bottom: 5px;
          right: 5px;
        }
        
        .${this.options.cssPrefix}-2d-y-label {
          top: 5px;
          left: 5px;
        }
        
        .${this.options.cssPrefix}-2d-values {
          display: flex;
          justify-content: space-around;
        }
        
        .${this.options.cssPrefix}-2d-value {
          text-align: center;
          font-size: 14px;
          color: ${theme.text};
        }
        
        /* Radial slider styles */
        .${this.options.cssPrefix}-radial-container {
          margin-bottom: 20px;
          text-align: center;
        }
        
        .${this.options.cssPrefix}-radial-pad {
          position: relative;
          display: inline-block;
          margin: 10px 0;
        }
        
        .${this.options.cssPrefix}-radial-track {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 50%;
          border-style: solid;
          border-color: ${theme.slider};
          box-sizing: border-box;
        }
        
        .${this.options.cssPrefix}-radial-filled {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
        }
        
        .${this.options.cssPrefix}-radial-filled circle,
        .${this.options.cssPrefix}-radial-filled path {
          stroke: ${theme.sliderFilled};
        }
        
        .${this.options.cssPrefix}-radial-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${theme.sliderThumb};
          transform: translate(-50%, -50%);
          cursor: pointer;
          z-index: 2;
        }
        
        .${this.options.cssPrefix}-radial-value {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
          color: ${theme.text};
          font-size: 20px;
          font-weight: bold;
        }
        
        .${this.options.cssPrefix}-radial-min,
        .${this.options.cssPrefix}-radial-max {
          position: absolute;
          color: ${theme.text};
          font-size: 12px;
          opacity: 0.7;
        }
        
        .${this.options.cssPrefix}-radial-min {
          bottom: 5px;
          left: 5px;
        }
        
        .${this.options.cssPrefix}-radial-max {
          top: 5px;
          right: 5px;
        }
        
        /* Range slider styles */
        .${this.options.cssPrefix}-range-container {
          margin-bottom: 20px;
        }
        
        .${this.options.cssPrefix}-range {
          position: relative;
          height: 30px;
          margin: 10px 0;
        }
        
        .${this.options.cssPrefix}-range-track {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 5px;
          background-color: ${theme.slider};
          border-radius: 5px;
          transform: translateY(-50%);
        }
        
        .${this.options.cssPrefix}-range-fill {
          position: absolute;
          top: 50%;
          height: 5px;
          background-color: ${theme.sliderFilled};
          border-radius: 5px;
          transform: translateY(-50%);
        }
        
        .${this.options.cssPrefix}-range-thumb {
          position: absolute;
          top: 50%;
          width: 15px;
          height: 15px;
          background-color: ${theme.sliderThumb};
          border-radius: 50%;
          transform: translate(-50%, -50%);
          cursor: pointer;
          z-index: 2;
        }
        
        .${this.options.cssPrefix}-range-tooltip {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          background-color: ${theme.background};
          color: ${theme.text};
          padding: 3px 8px;
          border-radius: 3px;
          font-size: 12px;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        
        .${this.options.cssPrefix}-range-tooltip.visible {
          opacity: 1;
        }
        
        .${this.options.cssPrefix}-range-min,
        .${this.options.cssPrefix}-range-max {
          position: absolute;
          top: 100%;
          color: ${theme.text};
          font-size: 12px;
          opacity: 0.7;
          margin-top: 5px;
        }
        
        .${this.options.cssPrefix}-range-min {
          left: 0;
        }
        
        .${this.options.cssPrefix}-range-max {
          right: 0;
        }
      `;
      
      document.head.appendChild(style);
      this.stylesAdded = true;
    }
  }
  
  export default Sliders;