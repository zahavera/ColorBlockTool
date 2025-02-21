let scene, camera, renderer, controls;
let spheres = [];
let params = {
    ballSize: 0.06,
    spacing: 0.3,
    sizeStep: 0.01,
    spacingStep: 0.05,
    colorShift: 0,  // -1 = black, 0 = normal, 1 = white
    colorStep: 0.1,
    centerGradient: 2.0,  // Changed default
    interiorOpacity: 1.0,  // Keep only this opacity parameter
    shape: 'sphere',  // New parameter for shape selection
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
    lightIntensity: 0.7,
    centerLightIntensity: 0.3
};

// Update SHAPES with lower poly counts
const SHAPES = {
    sphere: new THREE.SphereGeometry(1, 4, 3),  // Reduced segments further
    diamond: new THREE.OctahedronGeometry(1, 0),
    star: new THREE.TetrahedronGeometry(1, 0),
    box: new THREE.BoxGeometry(1, 1, 1),
    hex: new THREE.CylinderGeometry(1, 1, 1, 6), // Hexagonal prism
    cross: new THREE.BoxGeometry(1.5, 0.5, 0.5)  // Revert to original cross dimensions
};

// Add material definitions
const MATERIALS = {
    standard: {
        metalness: 0.0,
        roughness: 0.5,
        clearcoat: 0.0,
        transmission: 0.0,
        opacity: 1.0
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

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 20, 20); // Moved camera further out
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer();
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
            centerLight: document.getElementById('centerLight')
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
            updateShapes();
        });
        inputs.material.addEventListener('change', e => {
            params.material = e.target.value;
            updateMaterial();
        });
        inputs.centerLight.addEventListener('input', updateCenterLight);
    }

    setupControls();
    createGrid();
    
    window.addEventListener('resize', onWindowResize, false);
    animate();

    // Replace single directional light with corner lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Add lights at each corner of the cube
    cornerLights = [
        { pos: [1, 1, 1] },    // Top Front Right
        { pos: [-1, 1, 1] },   // Top Front Left
        { pos: [1, -1, 1] },   // Bottom Front Right
        { pos: [-1, -1, 1] },  // Bottom Front Left
        { pos: [1, 1, -1] },   // Top Back Right
        { pos: [-1, 1, -1] },  // Top Back Left
        { pos: [1, -1, -1] },  // Bottom Back Right
        { pos: [-1, -1, -1] }  // Bottom Back Left
    ].map(({ pos }) => {
        const light = new THREE.DirectionalLight(0xffffff, params.lightIntensity);
        light.position.set(...pos).multiplyScalar(10);
        light.lookAt(0, 0, 0);
        scene.add(light);
        return light;
    });

    // Add light control
    const lightSlider = document.getElementById('lightIntensity');
    lightSlider.addEventListener('input', updateLightIntensity);
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
        depthWrite: false, // Allow proper transparency
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
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

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    scene.add(light);
    
    updateGridPositions(); // Set initial positions and scale
}

// Update updateMaterial for better performance
function updateMaterial() {
    const materialType = params.material;
    const properties = MATERIALS[materialType];
    
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
                    const cacheKey = `${materialType}_${isInt}`;
                    
                    // Try to get cached material
                    if (!materialCache.has(cacheKey)) {
                        const material = new THREE.MeshPhysicalMaterial({
                            ...properties,
                            transparent: isInt || materialType === 'glass',
                            opacity: isInt ? params.interiorOpacity : 1.0,
                            depthWrite: !isInt,
                            depthTest: true,
                            polygonOffset: true,
                            polygonOffsetFactor: -1,
                            polygonOffsetUnits: -1
                        });
                        materialCache.set(cacheKey, material);
                    }
                    
                    // Use cached material and just update color
                    object.material = materialCache.get(cacheKey).clone();
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
        for(let y = 0; y < 25; y++) {  // Fixed: was using x < 25
            for(let z = 0; z < 25; z++) {  // Fixed: was using x < 25
                const sphere = spheres[index++];
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
        for(let y = 0; y < 25; y++) {   // Fixed: was using x < 25
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
        for(let y = 0; y < 25; y++) {   // Fixed: was using x in condition
            for(let z = 0; z < 25; z++) {
                const sphere = spheres[index++];
                if (isInterior(x, y, z)) {
                    sphere.material.opacity = params.interiorOpacity;
                }
            }
        }
    }
}

// Update updateShapes to be more efficient
function updateShapes() {
    let index = 0;
    const crossTemplate = SHAPES.cross;
    
    for(let x = 0; x < 25; x++) {
        for(let y = 0; y < 25; y++) {   // Fixed: was using x in condition
            for(let z = 0; z < 25; z++) {  // Fixed: was using x in condition
                if (!(x === 12 && y === 12 && z === 12)) {
                    const oldShape = spheres[index];
                    const oldMaterial = oldShape.material;
                    scene.remove(oldShape);
                    
                    let newShape;
                    if (params.shape === 'cross') {
                        newShape = new THREE.Group();
                        const box1 = new THREE.Mesh(crossTemplate, oldMaterial);
                        const box2 = new THREE.Mesh(crossTemplate, oldMaterial);
                        const box3 = new THREE.Mesh(crossTemplate, oldMaterial);
                        box2.rotation.z = Math.PI/2;
                        box3.rotation.x = Math.PI/2;
                        newShape.add(box1, box2, box3);
                    } else {
                        newShape = new THREE.Mesh(SHAPES[params.shape], oldMaterial);
                    }
                    
                    newShape.position.copy(oldShape.position);
                    newShape.scale.copy(oldShape.scale);
                    spheres[index] = newShape;
                    scene.add(newShape);
                }
                index++;
            }
        }
    }
    
    // Ensure material properties are maintained
    updateMaterial();
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

function updateLightIntensity() {
    const intensity = parseFloat(document.getElementById('lightIntensity').value);
    params.lightIntensity = intensity;
    cornerLights.forEach(light => {
        light.intensity = intensity;
    });
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
    // Create single state for all random changes
    const previousState = {
        ballSize: document.getElementById('ballSize').value,
        spacing: document.getElementById('spacing').value,
        colorShift: document.getElementById('colorShift').value,
        centerGradient: document.getElementById('centerGradient').value,
        opacity: document.getElementById('opacity').value,
        shape: document.getElementById('shape').value,
        material: document.getElementById('material').value,
        bgRed: document.getElementById('bgRed').value,
        bgGreen: document.getElementById('bgGreen').value,
        bgBlue: document.getElementById('bgBlue').value,
        bgBright: document.getElementById('bgBright').value,
        lightIntensity: document.getElementById('lightIntensity').value,
        centerLight: document.getElementById('centerLight').value
    };
    
    // Make all random changes
    document.getElementById('ballSize').value = (Math.random() * 2.98 + 0.02).toFixed(2);
    document.getElementById('spacing').value = (Math.random() * 0.9 + 0.1).toFixed(2);
    document.getElementById('colorShift').value = Math.random().toFixed(1);
    document.getElementById('centerGradient').value = (Math.random() * 4.9 + 0.1).toFixed(1);
    document.getElementById('opacity').value = Math.random().toFixed(1);

    const shapes = ['sphere', 'diamond', 'star', 'box', 'cross'];
    const materials = ['standard', 'metal', 'glass', 'plastic', 'glossy'];
    document.getElementById('shape').value = shapes[Math.floor(Math.random() * shapes.length)];
    document.getElementById('material').value = materials[Math.floor(Math.random() * materials.length)];
    document.getElementById('lightIntensity').value = (Math.random() * 2).toFixed(1);
    document.getElementById('centerLight').value = (Math.random() * 2).toFixed(1);

    // Update all controls
    ['ballSize', 'spacing', 'colorShift', 'centerGradient', 'opacity', 
     'shape', 'material', 'lightIntensity', 'centerLight']
        .forEach(id => document.getElementById(id).dispatchEvent(new Event('input')));

    // Save state after all changes are made
    undoStack.push(previousState);
    undoButton.disabled = false;
};

init();
