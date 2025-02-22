let scene, camera, renderer, controls;
let spheres = [];
let params = {
    ballSize: 0.3,
    spacing: 0.3,
    sizeStep: 0.01,
    spacingStep: 0.05,
    colorShift: 0,  // -1 = black, 0 = normal, 1 = white
    colorStep: 0.1,
    centerGradient: 2.0,  // Changed default
    interiorOpacity: 1.0,  // Keep only this opacity parameter
    shape: 'box',  // New parameter for shape selection
    material: 'standard',
    resetView: function() {
        // Stop all momentum immediately
        controls.enableDamping = false;
        controls.update();
        
        // Reset position
        const pos = camera.position;
        const dist = Math.sqrt(pos.x*pos.x + pos.y*pos.y + pos.z*pos.z);
        const isoPos = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(dist);
        
        controls.target.set(0, 0, 0);
        camera.position.copy(isoPos);
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0, 0);
        
        // Re-enable damping after position is set
        controls.enableDamping = true;
        controls.update();
    },
    
    centerView: function() {
        // Focus on center diamond
        const centerPos = new THREE.Vector3(0, 0, 0);
        const targetDist = 0.15;  // Reduced from 0.25 to get extremely close to center
        const currentDir = camera.position.clone().normalize();
        
        controls.target.copy(centerPos);
        camera.position.copy(currentDir.multiplyScalar(targetDist));
        camera.lookAt(centerPos);
        
        controls.update();
    },
    
    fitView: function() {
        // Fit view to show entire cube
        controls.target.set(0, 0, 0);
        camera.position.set(20, 20, 20);
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0);
        
        controls.update();
    },
    lightIntensity: 0.5,
    centerLightIntensity: 1.0
};

// Update SHAPES with lower poly counts
const SHAPES = {
    sphere: new THREE.SphereGeometry(1, 16, 12),  // Increased segments
    diamond: new THREE.OctahedronGeometry(1, 0),
    star: new THREE.TetrahedronGeometry(1, 0),
    box: new THREE.BoxGeometry(1, 1, 1),
    hex: new THREE.CylinderGeometry(1, 1, 1, 6), // Hexagonal prism
    cross: new THREE.BoxGeometry(1.5, 0.5, 0.5) // Revert to original cross dimensions
};

// Add material definitions
const MATERIALS = {
    standard: {
        metalness: 0.0,
        roughness: 0.5,
        clearcoat: 0.0,
        transmission: 0.0,
        opacity: 1.0,
        transparent: false,  // Force opaque for standard
        depthWrite: true    // Enable depth writing
    },
    metal: {
        metalness: 1.0,
        roughness: 0.2,
        clearcoat: 0.5,
        transmission: 0.0,
        opacity: 1.0
    },
    glass: {
        metalness: 0.0,
        roughness: 0.0,
        clearcoat: 1.0,
        transmission: 0.9,
        opacity: 0.3
    },
    plastic: {
        metalness: 0.0,
        roughness: 0.3,
        clearcoat: 0.7,
        transmission: 0.0,
        opacity: 1.0
    },
    glossy: {
        metalness: 0.3,
        roughness: 0.0,
        clearcoat: 1.0,
        transmission: 0.0,
        opacity: 1.0
    }
};

// Add material caching
const materialCache = new Map(); // Cache for materials

// Update corner colors to just use black and white
const colors = {
    FTR: new THREE.Color(0x00FFFF), // Cyan
    RTL: new THREE.Color(0xFF00FF), // Magenta
    FBL: new THREE.Color(0xFFFF00), // Yellow
    RTR: new THREE.Color(0x0000FF), // Blue
    RBL: new THREE.Color(0xFF0000), // Red
    FBR: new THREE.Color(0x00FF00), // Green
    RBR: new THREE.Color(0x000000), // Black
    FTL: new THREE.Color(0x000000), // Changed to Black
    CENTER: new THREE.Color(0xFFFFFF) // White (center)
};

// Move PRESETS to top of file, before init()
const PRESETS = [
    {
        name: "ColorCube",
        ballSize: 0.3,
        spacing: 0.3,
        colorShift: 0.5,
        centerGradient: 2.0,
        opacity: 1.0,
        lightIntensity: 0.5,  // Match initial state
        centerLight: 1.0,
        shape: 'box',
        material: 'standard',
        view: 'isoFit'
    },
    {
        name: "ColorCube Center",
        ballSize: 0.3,
        spacing: 0.3,
        colorShift: 0.5,
        centerGradient: 5.0,
        opacity: 0.0,
        lightIntensity: 0.1,
        centerLight: 0.5,
        shape: 'box',
        material: 'standard',
        view: 'center'
    },
    {
        name: "Metal Spheres",
        ballSize: 0.5,
        spacing: 0.8,
        colorShift: 0.5,
        centerGradient: 5.0,
        opacity: 1.0,
        lightIntensity: 3,
        centerLight: 0.6,
        shape: 'sphere',
        material: 'metal',
        view: 'isoFit'
    },
    {
        name: "ColorBalls",
        ballSize: 0.26,
        spacing: 1,
        colorShift: 0.2,
        centerGradient: 2,
        opacity: 0,
        lightIntensity: 1,
        centerLight: 5,
        shape: 'sphere',
        material: 'standard',
        view: 'isoFit'
    },
    {
        name: "Spread Diamonds",
        ballSize: 0.2,
        spacing: 1.0,
        colorShift: 0.5,
        centerGradient: 5.0,
        opacity: 1.0,
        lightIntensity: 0.5,
        centerLight: 0.2,
        uiOpacity: 0.3,
        shape: 'diamond',
        material: 'plastic',
        view: 'isoFit'
    },
    {
        name: "Spread Diamonds",
        ballSize: 0.2,
        spacing: 1.0,
        colorShift: 0.5,
        centerGradient: 5.0,
        opacity: 1.0,
        lightIntensity: 0.5,
        centerLight: 0.2,
        uiOpacity: 0.3,
        shape: 'diamond',
        material: 'plastic',
        view: 'center'
    }
];

let currentPreset = 0;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 20, 20); // Moved camera further out
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        logarithmicDepthBuffer: true,  // Add this
        precision: 'highp'             // Add this
    });
    renderer.setPixelRatio(window.devicePixelRatio); // Add this
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.maxDistance = 34.64; // Math.sqrt(20^2 + 20^2 + 20^2) to match initial camera position

    // Remove GUI setup and replace with custom controls
    function setupControls() {
        const inputs = {
            ballSize: document.getElementById('ballSize'),
            spacing: document.getElementById('spacing'),
            colorShift: document.getElementById('colorShift'),
            centerGradient: document.getElementById('centerGradient'),
            opacity: document.getElementById('opacity'),
            shape: document.getElementById('shape'),
            material: document.getElementById('material'),
            centerLight: document.getElementById('centerLight'),
            lightIntensity: document.getElementById('lightIntensity')
        };

        // Set initial values
        inputs.ballSize.value = params.ballSize;
        inputs.spacing.value = params.spacing;
        inputs.colorShift.value = 0.5; // Start at middle (normal color)
        params.colorShift = 0; // This corresponds to normal color internally
        inputs.centerGradient.value = params.centerGradient;
        inputs.opacity.value = params.interiorOpacity;
        inputs.shape.value = params.shape;
        inputs.material.value = params.material;
        inputs.centerLight.value = params.centerLightIntensity;
        inputs.lightIntensity.value = params.lightIntensity;

        // Add listeners
        inputs.ballSize.addEventListener('input', e => {
            params.ballSize = parseFloat(e.target.value);
            updateGridPositions();
        });
        inputs.spacing.addEventListener('input', e => {
            params.spacing = parseFloat(e.target.value);
            updateGridPositions();
        });
        inputs.colorShift.addEventListener('input', e => {
            params.colorShift = calculateColor(parseFloat(e.target.value));
            updateColors();
        });
        inputs.centerGradient.addEventListener('input', e => {
            params.centerGradient = parseFloat(e.target.value);
            updateColors();
        });
        inputs.opacity.addEventListener('input', e => {
            params.interiorOpacity = parseFloat(e.target.value);
            updateOpacity();
        });
        inputs.shape.addEventListener('change', e => {
            params.shape = e.target.value;
            // Store current material type before rebuild
            const currentMaterial = params.material;
            
            // Clear scene
            spheres.forEach(shape => {
                if (shape.children) {
                    shape.children.forEach(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    });
                }
                if (shape.geometry) shape.geometry.dispose();
                scene.remove(shape);
            });
            spheres = [];
            materialCache.clear();
            
            // Rebuild grid and force material update
            createGrid();
            params.material = currentMaterial; // Restore material type
            updateMaterial(); // Force material update
        });
        inputs.material.addEventListener('change', e => {
            params.material = e.target.value;
            updateMaterial();
        });
        inputs.centerLight.addEventListener('input', updateCenterLight);
        inputs.lightIntensity.addEventListener('input', e => {
            const intensity = parseFloat(e.target.value);
            params.lightIntensity = intensity;
            updateLightIntensity();
        });
    }

    setupControls();
    createGrid();
    
    window.addEventListener('resize', onWindowResize, false);
    animate();

    // Remove the old lighting code and replace with this:
    // Base ambient light
    params.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(params.ambientLight);

    // Store corner lights in params instead of global
    params.cornerLights = cornerLights = [
        // Front corners
        { pos: [1, 1, 1], color: 0xCCCCCC },    // Top Front Right
        { pos: [-1, 1, 1], color: 0xCCCCCC },   // Top Front Left
        { pos: [1, -1, 1], color: 0xCCCCCC },   // Bottom Front Right
        { pos: [-1, -1, 1], color: 0xCCCCCC },  // Bottom Front Left
        // Back corners
        { pos: [1, 1, -1], color: 0xCCCCCC },   // Top Back Right
        { pos: [-1, 1, -1], color: 0xCCCCCC },  // Top Back Left
        { pos: [1, -1, -1], color: 0xCCCCCC },  // Bottom Back Right
        { pos: [-1, -1, -1], color: 0xCCCCCC }  // Bottom Back Left
    ].map(({ pos, color }) => {
        const light = new THREE.DirectionalLight(color, params.lightIntensity);
        light.position.set(...pos).multiplyScalar(15);
        light.lookAt(0, 0, 0);
        scene.add(light);
        return light;
    });

    // Add reset handler
    document.getElementById('resetDefaults').addEventListener('click', function() {
        if (PRESETS.length === 0) return;
    
        currentPreset = (currentPreset + 1) % PRESETS.length;
        const preset = PRESETS[currentPreset];
        
        // First apply all control values
        Object.entries(preset).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
                const numInput = document.getElementById(id + 'Num');
                if (numInput) numInput.value = value;
            }
        });

        // Then update all parameters at once
        updateParams();  // This will handle all updates including lighting

        // Apply view settings last
        if (preset.view === 'isoFit') {
            params.resetView();
            params.fitView();
        } else if (preset.view === 'center') {
            params.centerView();
        }
    });

    // Initialize preset button text
    document.getElementById('resetDefaults').textContent = 'Presets';
    const firstPreset = PRESETS[currentPreset];
    const floatingPresetButton = document.querySelector('.main-buttons button:nth-child(2)');
    if (floatingPresetButton) {
        floatingPresetButton.textContent = `${firstPreset.name} (${currentPreset + 1}/${PRESETS.length})`;
    }
}

function shiftColor(color) {
    const white = new THREE.Color(0xFFFFFF);
    const black = new THREE.Color(0x000000);
    
    const shift = params.colorShift;
    if (shift > 0) {
        return color.clone().lerp(white, shift);
    } else if (shift < 0) {
        return color.clone().lerp(black, -shift);
    }
    return color.clone();
}

function lerp3Colors(x, y, z) {
    const color = new THREE.Color();
    
    // Adjust center calculations for 25x25x25
    const dx = (x - 12) / 12;
    const dy = (y - 12) / 12;
    const dz = (z - 12) / 12;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz) / Math.sqrt(3);
    
    // Use the gradient control parameter
    const centerWeight = 1 - Math.pow(distance, 1/params.centerGradient);
    
    // Adjust normalization for 25x25x25
    const fx = x / 24;
    const fy = y / 24;
    const fz = z / 24;
    
    // Corner interpolation (as before)
    const fb = colors.FBL.clone().lerp(colors.FBR, fx);
    const ft = colors.FTL.clone().lerp(colors.FTR, fx);
    const rb = colors.RBL.clone().lerp(colors.RBR, fx);
    const rt = colors.RTL.clone().lerp(colors.RTR, fx);
    
    const f = fb.clone().lerp(ft, fy);
    const r = rb.clone().lerp(rt, fy);
    
    color.copy(f.clone().lerp(r, fz));
    
    // Apply controlled center weight
    const baseColor = color.lerp(colors.CENTER, Math.pow(centerWeight, params.centerGradient));
    
    // Then apply color shift
    return shiftColor(baseColor);
}

function isInterior(x, y, z) {
    // Returns true if ball is not on surface and not center
    return x !== 0 && x !== 24 && 
           y !== 0 && y !== 24 && 
           z !== 0 && z !== 24 && 
           !(x === 12 && y === 12 && z === 12);
}

// Update material settings to handle clipping better
function createGrid() {
    // Create shared geometries
    const centerGeometry = new THREE.OctahedronGeometry(1, 0);
    
    // Create base material with improved settings and physical properties
    const baseMaterial = new THREE.MeshPhysicalMaterial({
        transparent: true,
        opacity: 1.0,
        depthWrite: true,     // Changed from false
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,  // Changed from -1
        polygonOffsetUnits: -2,   // Changed from -1
        alphaToCoverage: true     // Add this
    });
    
    for(let x = 0; x < 25; x++) {
        for(let y = 0; y < 25; y++) {  // Fixed: was using x in condition
            for(let z = 0; z < 25; z++) {
                const material = baseMaterial.clone();
                material.transparent = isInterior(x, y, z);
                material.opacity = isInterior(x, y, z) ? params.interiorOpacity : 1.0;
                material.color = lerp3Colors(x, y, z);
                
                if (x === 12 && y === 12 && z === 12) {
                    // Create a special material for center that doesn't change
                    const centerMaterial = new THREE.MeshPhysicalMaterial({
                        color: 0xFFFFFF,
                        emissive: 0xFFFFFF,
                        emissiveIntensity: params.centerLightIntensity,
                        transparent: false,
                        depthWrite: true,
                        depthTest: true,
                        metalness: 0.2,
                        roughness: 0.1,
                        clearcoat: 1.0
                    });

                    const sphere = new THREE.Mesh(centerGeometry, centerMaterial);
                    // Add point light at center with increased range and intensity
                    const centerLight = new THREE.PointLight(0xFFFFFF, params.centerLightIntensity * 4, 15);
                    sphere.add(centerLight);
                    spheres.push(sphere);
                } else {
                    let shape;
                    if (params.shape === 'cross') {
                        // Create a plus sign from three boxes
                        shape = new THREE.Group();
                        const box1 = new THREE.Mesh(SHAPES.cross, material);
                        const box2 = new THREE.Mesh(SHAPES.cross, material);
                        const box3 = new THREE.Mesh(SHAPES.cross, material);
                        box2.rotation.z = Math.PI/2;
                        box3.rotation.x = Math.PI/2;
                        shape.add(box1, box2, box3);
                    } else {
                        shape = new THREE.Mesh(SHAPES[params.shape], material);
                    }
                    spheres.push(shape);
                }
                scene.add(spheres[spheres.length - 1]);
            }
        }
    }
    
    updateGridPositions(); // Set initial positions and scale
}

// Update updateMaterial for better performance
function updateMaterial() {
    const materialType = params.material;
    const properties = MATERIALS[materialType];
    
    materialCache.clear(); // Clear cache to force new materials

    let index = 0;
    for(let x = 0; x < 25; x++) {
        for(let y = 0; y < 25; y++) {
            for(let z = 0; z < 25; z++) {
                // Skip center diamond material update
                if (x === 12 && y === 12 && z === 12) {
                    index++;
                    continue;
                }
                const object = spheres[index++]; 
                if (object.material) {
                    const isInt = isInterior(x, y, z);
                    const material = new THREE.MeshPhysicalMaterial({
                        ...properties,
                        transparent: (isInt || materialType === 'glass'),
                        opacity: isInt ? params.interiorOpacity : 1.0,
                        depthWrite: true,  // Changed from conditional
                        depthTest: true,
                        polygonOffset: true,
                        polygonOffsetFactor: -2,
                        polygonOffsetUnits: -2,
                        alphaToCoverage: true,
                        transmission: isInt && params.interiorOpacity < 0.3 ? 0.8 : 0,  // Add transmission for low opacity
                        metalness: Math.min(properties.metalness, 0.5),  // Limit metalness
                        roughness: Math.max(properties.roughness, 0.1)   // Ensure some roughness
                    });
                    
                    // Update material and color
                    object.material = material;
                    object.material.color = lerp3Colors(x, y, z);
                }
            }
        }
    }
}

function isOnSurface(x, y, z) {
    return x === 0 || x === 24 || 
           y === 0 || y === 24 || 
           z === 0 || z === 24;
}

function updateGridPositions() {
    let index = 0;
    for(let x = 0; x < 25; x++) {
        for(let y = 0; y < 25; y++) {
            for(let z = 0; z < 25; z++) {
                const sphere = spheres[index++]; 
                if (!sphere) {
                    console.warn(`Sphere is undefined at index ${index-1} (x=${x}, y=${y}, z=${z})`);
                    continue;
                }
                sphere.position.set(
                    (x - 12) * params.spacing,
                    (y - 12) * params.spacing,
                    (z - 12) * params.spacing
                );
                sphere.scale.setScalar(params.ballSize);
            }
        }
    }
}

function updateColors() {
    let index = 0;
    for(let x = 0; x < 25; x++) {
        for(let y = 0;  y < 25; y++) {   // Fixed: was using x < 25
            for(let z = 0;  z < 25; z++) {
                const sphere = spheres[index++]; 
                sphere.material.color = lerp3Colors(x, y, z);
            }
        }
    }
}

function updateOpacity() {
    let index = 0;
    for(let x = 0; x < 25; x++) {
        for(let y = 0;  y < 25; y++) {   // Fixed: was using x in condition
            for(let z = 0;  z < 25; z++) {
                const sphere = spheres[index++]; 
                if (isInterior(x, y, z)) {
                    // Update transparency properties for better light penetration
                    sphere.material.opacity = params.interiorOpacity;
                    sphere.material.transparent = params.interiorOpacity < 1;
                    sphere.material.depthWrite = params.interiorOpacity >= 0.5;
                    sphere.material.transmission = params.interiorOpacity < 0.3 ? 0.8 : 0;
                }
            }
        }
    }
    renderer.render(scene, camera);
}

// Update updateShapes to be more efficient
function updateShapes() {
    // Iterate through all spheres in the grid
    let index = 0;
    for(let x = 0; x < 25; x++) {
        for(let y = 0; y < 25; y++) {
            for(let z = 0; z < 25; z++) {
                // Get the current sphere
                const sphere = spheres[index];
                if (!sphere) {
                    console.warn(`Sphere is undefined at index ${index} (x=${x}, y=${y}, z=${z})`);
                    index++;
                    continue;
                }

                let newGeometry;
                // If at the center, use the octahedron geometry
                if (x === 12 && y === 12 && z === 12) {
                    newGeometry = new THREE.OctahedronGeometry(1, 0);
                } 
                // Otherwise, use the geometry defined by the shape parameter
                else {
                    newGeometry = SHAPES[params.shape];
                }

                // If the current geometry is different from the new geometry
                if (sphere.geometry.type !== newGeometry.type) {
                    // Dispose of the old geometry
                    sphere.geometry.dispose();
                    // Set the new geometry
                    sphere.geometry = newGeometry
                }
                index++;
            }
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Required for damping and auto-rotation
    renderer.render(scene, camera);
}

function calculateColor(colorShiftValue) {
    // Convert 0-1 range to internal values where:
    // 0 = black (-1)
    // 0.5 = original color (0)
    // 1 = white (1)
    return (colorShiftValue - 0.5) * 2;
}

// Add updateParams function to ensure THREE.js parameters are in sync
function updateParams() {
    params.ballSize = parseFloat(document.getElementById('ballSize').value);
    params.spacing = parseFloat(document.getElementById('spacing').value);
    params.colorShift = calculateColor(parseFloat(document.getElementById('colorShift').value));
    params.centerGradient = parseFloat(document.getElementById('centerGradient').value);
    params.interiorOpacity = parseFloat(document.getElementById('opacity').value);
    params.shape = document.getElementById('shape').value;
    params.material = document.getElementById('material').value;
    params.lightIntensity = parseFloat(document.getElementById('lightIntensity').value);
    params.centerLightIntensity = parseFloat(document.getElementById('centerLight').value);

    // Update everything
    updateGridPositions();
    updateColors();
    updateOpacity();
    updateShapes();
    updateMaterial();
    updateLightIntensity();
    updateCenterLight();
}

// Update function to use global cornerLights or params.cornerLights
function updateLightIntensity() {
    const intensity = parseFloat(document.getElementById('lightIntensity').value);
    params.lightIntensity = intensity;
    
    params.cornerLights.forEach(light => {
        light.intensity = intensity;
    });
    
    if (params.ambientLight) {
        params.ambientLight.intensity = intensity * 0.5;
    }

    if (renderer) renderer.render(scene, camera);
}

function updateCenterLight() {
    const intensity = parseFloat(document.getElementById('centerLight').value);
    params.centerLightIntensity = intensity;
    
    const centerIndex = 12 * 25 * 25 + 12 * 25 + 12;
    const centerObject = spheres[centerIndex];
    if (centerObject) {
        centerObject.material.emissiveIntensity = intensity;
        if (centerObject.children.length > 0) {
            centerObject.children[0].intensity = intensity * 4; // Increased multiplier
        }
    }
}

// Fix undo functionality
window.randomizeControls = function() {
    // 1. Generate Random Values:
    const randomSpacing = (Math.random() * 0.9 + 0.1).toFixed(2);
    const maxSize = Math.min(randomSpacing, 3.0);
    const randomSize = (Math.random() * (maxSize - 0.02) + 0.02).toFixed(2);
    const shapes = ['sphere', 'diamond', 'star', 'box', 'cross'];
    const materials = ['standard', 'metal', 'glass', 'plastic', 'glossy'];
    const randomColorShift = Math.random().toFixed(1);
    const randomCenterGradient = (Math.random() * 4.9 + 0.1).toFixed(1);
    const randomOpacity = Math.random().toFixed(1);

    // 2. Update Input Elements:
    document.getElementById('spacing').value = randomSpacing;
    document.getElementById('ballSize').value = randomSize;
    document.getElementById('colorShift').value = randomColorShift;
    document.getElementById('centerGradient').value = randomCenterGradient;
    document.getElementById('opacity').value = randomOpacity;

    const shapeSelect = document.getElementById('shape');
    shapeSelect.value = shapes[Math.floor(Math.random() * shapes.length)];
    const materialSelect = document.getElementById('material');
    materialSelect.value = materials[Math.floor(Math.random() * materials.length)];

    // 3. Update Parameters:
    // - Update the internal 'params' object with the new values.
    // - This ensures that the Three.js scene is updated correctly.
    params.spacing = parseFloat(randomSpacing);
    params.ballSize = parseFloat(randomSize);
    params.colorShift = calculateColor(parseFloat(randomColorShift));
    params.centerGradient = parseFloat(randomCenterGradient);
    params.interiorOpacity = parseFloat(randomOpacity);
    params.shape = shapeSelect.value;
    params.material = materialSelect.value;

    // 4. Update Three.js Scene:
    // - Call the functions that update the Three.js scene based on the new parameters.
    // - This ensures that the scene is rendered correctly.
    updateGridPositions();
    updateColors();
    updateOpacity();
    updateShapes();
    updateMaterial();
};

// Add these functions after the existing code
function getConfiguration() {
    return {
        name: "Custom Configuration",
        settings: {
            ballSize: params.ballSize,
            spacing: params.spacing,
            colorShift: document.getElementById('colorShift').value,
            centerGradient: params.centerGradient,
            opacity: params.interiorOpacity,
            lightIntensity: params.lightIntensity,
            centerLight: params.centerLightIntensity,
            shape: params.shape,
            material: params.material,
            view: 'isoFit',
            bgColor: {
                r: parseFloat(document.getElementById('bgRed').value),
                g: parseFloat(document.getElementById('bgGreen').value),
                b: parseFloat(document.getElementById('bgBlue').value),
                brightness: parseFloat(document.getElementById('bgBright').value)
            }
        }
    };
}

function applyConfiguration(config) {
    if (!config || !config.settings) {
        console.error('Invalid configuration format');
        return false;
    }

    try {
        const s = config.settings;
        
        // Update all controls
        document.getElementById('ballSize').value = s.ballSize;
        document.getElementById('spacing').value = s.spacing;
        document.getElementById('colorShift').value = s.colorShift;
        document.getElementById('centerGradient').value = s.centerGradient;
        document.getElementById('opacity').value = s.opacity;
        document.getElementById('lightIntensity').value = s.lightIntensity;
        document.getElementById('centerLight').value = s.centerLight;
        document.getElementById('shape').value = s.shape;
        document.getElementById('material').value = s.material;
        
        // Update background color
        if (s.bgColor) {
            document.getElementById('bgRed').value = s.bgColor.r;
            document.getElementById('bgGreen').value = s.bgColor.g;
            document.getElementById('bgBlue').value = s.bgColor.b;
            document.getElementById('bgBright').value = s.bgColor.brightness;
        }

        // Trigger updates
        updateParams();
        
        // Explicitly update lighting
        if (typeof s.lightIntensity === 'number') {
            params.lightIntensity = s.lightIntensity;
            updateLightIntensity();
        }
        
        return true;
    } catch (error) {
        console.error('Error applying configuration:', error);
        return false;
    }
}

function copyConfig() {
    const config = getConfiguration();
    const configString = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(configString).then(() => {
        // Show subtle visual feedback
        const copyButton = document.querySelector('button[onclick="copyConfig()"]');
        const originalText = copyButton.textContent;
        copyButton.textContent = '✓';  // Changed feedback to just checkmark
        copyButton.style.backgroundColor = '#2d6a4f';
        setTimeout(() => {
            copyButton.textContent = '📋';  // Reset to clipboard icon
            copyButton.style.backgroundColor = '';
        }, 1000);
    }).catch(err => {
        console.error('Failed to copy configuration:', err);
    });
}

function pasteConfig() {
    navigator.clipboard.readText().then(text => {
        try {
            const config = JSON.parse(text);
            if (applyConfiguration(config)) {
                const pasteButton = document.querySelector('button[onclick="pasteConfig()"]');
                pasteButton.textContent = '✓';
                pasteButton.style.backgroundColor = '#2d6a4f';
                setTimeout(() => {
                    pasteButton.textContent = '📝';
                    pasteButton.style.backgroundColor = '';
                }, 1000);
            }
        } catch (error) {
            console.error('Error parsing configuration:', error);
        }
    }).catch(err => {
        console.error('Clipboard read failed:', err);
    });
}

function saveAsPreset() {
    const config = getConfiguration();
    const name = prompt('Enter preset name:', config.name);
    if (!name) return;
    
    // Create proper preset structure with all required fields
    const preset = {
        name: name,
        ballSize: params.ballSize,
        spacing: params.spacing,
        colorShift: document.getElementById('colorShift').value,
        centerGradient: params.centerGradient,
        opacity: params.interiorOpacity,
        lightIntensity: params.lightIntensity,
        centerLight: params.centerLightIntensity,
        shape: params.shape,
        material: params.material,
        view: 'isoFit',
        uiOpacity: parseFloat(document.getElementById('uiOpacity').value) || 0.5
    };

    // Add to end of presets array
    PRESETS.push(preset);
    
    // Update currentPreset to point to new preset
    currentPreset = PRESETS.length - 1;
    
    // Keep drawer button text simple
    document.getElementById('resetDefaults').textContent = 'Presets';
    
    // Update floating button with details
    const floatingPresetButton = document.querySelector('.main-buttons button:nth-child(2)');
    if (floatingPresetButton) {
        floatingPresetButton.textContent = `${name} (${currentPreset + 1}/${PRESETS.length})`;
    }
    
    // Show feedback
    const saveButton = document.querySelector('button[onclick="saveAsPreset()"]');
    const originalText = saveButton.textContent;
    saveButton.textContent = '✓';  // Changed feedback to just checkmark
    saveButton.style.backgroundColor = '#2d6a4f';
    setTimeout(() => {
        saveButton.textContent = '💾';  // Reset to save icon
        saveButton.style.backgroundColor = '';
    }, 1000);
}

// Also update preset button text to show current preset
const presetButton = document.getElementById('resetDefaults');
presetButton.textContent = `Preset: ${name}`;

init();
