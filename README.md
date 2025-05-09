# Life Simulator - Breaking Newton's Third Law

An interactive particle simulation that deliberately breaks the physical principle of equal and opposite reactions to explore emergent patterns and behaviors not possible in physically accurate systems.

![Life Simulator Screenshot](https://via.placeholder.com/800x450?text=Life+Simulator+Screenshot)

## Overview

This project simulates particles that interact with attractive and repulsive forces, but intentionally violates Newton's Third Law by not requiring equal and opposite reactions. This allows for complex emergent behaviors, self-organization, and pattern formation that aren't possible in typical physics simulations.

## Features

- **Interactive Particle Simulation**: Create, manipulate, and observe thousands of particles in real-time
- **Rule-Based Interactions**: Define complex rules for how different particle types interact with each other
- **Asymmetric Forces**: Experiment with forces that break Newton's Third Law of Motion
- **Presets**: Multiple predefined simulation types (Orbital, Segregation, Food Chain, etc.)
- **Interactive Controls**: Adjust parameters in real-time to see how they affect the simulation
- **Performance Optimization**: Efficient spatial partitioning and rendering for smooth performance
- **Visual Effects**: Particle glows, trails, and color modes for aesthetic visualization

## How It Works

The simulation creates different types of particles that can attract or repel each other based on a set of rules. Unlike traditional physics simulations, these forces do not need to be symmetrical - Type A particles can be strongly attracted to Type B particles, while Type B might be repelled by or indifferent to Type A.

This asymmetry leads to interesting emergent behaviors like:
- Self-organization into complex structures
- Circulatory systems and dynamic flows
- Predator-prey relationships
- Crystallization and pattern formation
- Swarming and flocking behaviors

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (for development)

### Running the Simulation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/life-simulator.git
   cd life-simulator
   ```

2. Start a local web server:
   
   Using Python:
   ```bash
   python -m http.server
   ```
   
   Using Node.js (with http-server):
   ```bash
   npx http-server
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

### Using the Simulation

- **Pan**: Click and drag to move around
- **Zoom**: Use mouse wheel or pinch gesture
- **Add Particles**: Double-click to add a cluster of particles
- **Controls Panel**: Use the panel on the right to adjust simulation parameters
- **Presets**: Try different presets to see various behaviors
- **Type Editor**: Modify how different particle types interact with each other

## Keyboard Shortcuts

- **Space**: Pause/resume simulation
- **R**: Reset simulation
- **C**: Center camera
- **T**: Toggle type editor
- **+/-**: Zoom in/out
- **P**: Take screenshot

## Customization

### Simulation Parameters

- **Time Scale**: Control simulation speed
- **Particle Count**: Adjust the number of particles
- **Particle Types**: Change number of particle types
- **Physics Method**: Choose between Euler, Verlet, or RK4 integration
- **Boundary Handling**: Set how particles interact with boundaries

### Particle Interactions

Use the Type Editor to customize:

- **Attraction**: How strongly particles are attracted to each other
- **Repulsion**: How strongly particles repel at close distances
- **Activation Distance**: Maximum distance at which forces apply
- **Asymmetry**: Level of violation of Newton's Third Law (0-1)
- **Force Falloff**: How quickly force diminishes with distance

## Presets

- **Basic Attraction**: Simple attractive and repulsive forces
- **Orbital**: Planets orbiting central bodies with moons
- **Segregation**: Particles that prefer to group with their own kind
- **Food Chain**: Hierarchical predator-prey relationships
- **Crystal Formation**: Particles that organize into crystalline structures

## Technical Details

The simulation uses various optimization techniques:

- **Spatial Partitioning**: Quadtree for efficient proximity queries
- **Data Structures**: Structure-of-Arrays (SoA) for cache efficiency
- **Adaptive Quality**: Automatic adjustment based on performance
- **Web Workers**: Optional multi-threading for physics calculations
- **Rendering Modes**: Multiple quality levels for different performance targets

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Builds on concepts from [Emergence](https://en.wikipedia.org/wiki/Emergence) in complex systems