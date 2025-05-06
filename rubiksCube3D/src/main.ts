import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";

type Axis = "x" | "y" | "z";
type Sign = -1 | 1;
const rendererCanvas = document.getElementById(
  "rendererCanvas",
) as HTMLCanvasElement;
const scene = new THREE.Scene();
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;

let cubes: THREE.Mesh[] = [];
let faces: THREE.Mesh[] = [];
let layer: THREE.Object3D;
let clickedCubePos: THREE.Vector3;
let rotationAxis: Axis;
let clickedAxis: Axis;
let firstIntersectedPos: { x: number; y: number; z: number };
let layerRotationDir: "x" | "y";
let layerRotationSign: Sign;
let clickedAxisDir: Sign;

let zoom = 8;
let isRotatingCube = false;
let isLayerRotationcomplete = true;
let isLayerFound = false;
let isMouseDown = false;
let clickDelay = false;
let startMousePos = { x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };
let tween = new TWEEN.Tween();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

init();
/**
 * Initializes the scene, camera, renderer, and objects.
 * Sets up event listeners for user interaction.
 */
function init() {
  // Initialize camera and set its position
  zoom = 10;
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  const pos = Math.sqrt((zoom * zoom) / 3);
  camera.position.z = pos;
  camera.position.y = pos;
  camera.position.x = pos;
  camera.lookAt(0, 0, 0);

  // Renderer setup with the canvas
  renderer = new THREE.WebGLRenderer({
    canvas: rendererCanvas,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);

  /**
   * Create and add cubes to the scene.
   */
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0x55ff55 }), // Green
    new THREE.MeshBasicMaterial({ color: 0x5555ff }), // Blue
    new THREE.MeshBasicMaterial({ color: 0xffff55 }), // Yellow
    new THREE.MeshBasicMaterial({ color: 0xffffff }), // White
    new THREE.MeshBasicMaterial({ color: 0xff5555 }), // Red
    new THREE.MeshBasicMaterial({ color: 0xffa555 }), // Orange
    new THREE.MeshBasicMaterial({ color: 0x000000 }), // Black - for inactive sides
  ];

  const cubeSize = 0.98;

  // Define which material index corresponds to which face for clarity
  const FACE_MATERIALS = {
    RIGHT: 0, // Green
    LEFT: 1, // Blue
    TOP: 2, // Yellow
    BOTTOM: 3, // White
    FRONT: 4, // Red
    BACK: 5, // Orange
    INACTIVE: 6, // Black
  };

  // Loop through x, y, z coordinates to create and position cubes
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const cubeGeometry = new THREE.BoxGeometry(
          cubeSize,
          cubeSize,
          cubeSize,
        );
        const cube = new THREE.Mesh(cubeGeometry);

        // Determine the material index for each face based on its position
        const materialIndices = [
          FACE_MATERIALS.INACTIVE, // Right face
          FACE_MATERIALS.INACTIVE, // Left face
          FACE_MATERIALS.INACTIVE, // Top face
          FACE_MATERIALS.INACTIVE, // Bottom face
          FACE_MATERIALS.INACTIVE, // Front face
          FACE_MATERIALS.INACTIVE, // Back face
        ];

        // Assign specific material indices based on position
        if (x === 1) materialIndices[0] = FACE_MATERIALS.RIGHT; // Right face
        if (x === -1) materialIndices[1] = FACE_MATERIALS.LEFT; // Left face
        if (y === 1) materialIndices[2] = FACE_MATERIALS.TOP; // Top face
        if (y === -1) materialIndices[3] = FACE_MATERIALS.BOTTOM; // Bottom face
        if (z === 1) materialIndices[4] = FACE_MATERIALS.FRONT; // Front face
        if (z === -1) materialIndices[5] = FACE_MATERIALS.BACK; // Back face

        // Assign materials to cube faces using the calculated indices
        for (let i = 0; i < cubeGeometry.groups.length; i++) {
          cube.geometry.groups[i].materialIndex = materialIndices[i];
        }
        cube.material = materials; // Assign the materials array to the cube

        cube.position.set(x, y, z);
        cubes.push(cube);
        scene.add(cube);
      }
    }
  }

  /**
   * Create and add invisible faces for raycasting and interaction.
   */
  for (let y = 0; y < 3; y++) {
    for (let x = -1; x <= 1; x += 2) {
      const faceGeometry = new THREE.BoxGeometry(
        y === 0 ? 0 : 3,
        y === 1 ? 0 : 3,
        y === 2 ? 0 : 3,
      );
      // Create invisible faces with transparent material
      const face = new THREE.Mesh(
        faceGeometry,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          opacity: 0.0,
          transparent: true,
        }),
      );
      // Position faces and store axis and direction data
      face.position.set(
        y === 0 ? x + x * 0.5 : 0,
        y === 1 ? x + x * 0.5 : 0,
        y === 2 ? x + x * 0.5 : 0,
      );
      face.userData["axis"] = y === 0 ? `x` : y === 1 ? "y" : "z";
      face.userData["dir"] = x;
      scene.add(face);
      faces.push(face);
    }
  }

  // Add event listeners for user interaction
  addEventListeners();
  requestAnimationFrame(animate);
}
function animate(time: number) {
  tween.update(time);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

/**
 * Adds event listeners for mouse and touch events to the renderer canvas.
 *
 * @returns {void}
 */
function addEventListeners(): void {
  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    onMouseDown(e);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    onMouseUp();
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    onMouseMove(e);
  };

  rendererCanvas.addEventListener("mousedown", onMouseDown);
  rendererCanvas.addEventListener("mouseup", onMouseUp);
  rendererCanvas.addEventListener("mousemove", onMouseMove);
  rendererCanvas.addEventListener("touchstart", handleTouchStart);
  rendererCanvas.addEventListener("touchend", handleTouchEnd);
  rendererCanvas.addEventListener("touchmove", handleTouchMove);
  const zoomSlider = document.getElementById("zoom-slider") as HTMLInputElement;

  zoomSlider.addEventListener("input", () => {
    const sliderValue = 100 - parseFloat(zoomSlider.value);
    const zoomMin = 3;
    const zoomMax = 41;
    const lastzoom = zoom;
    zoom = zoomMin + (zoomMax - zoomMin) * (sliderValue / 100);

    camera.position.z = (camera.position.z * zoom) / lastzoom;
    camera.position.x = (camera.position.x * zoom) / lastzoom;
    camera.position.y = (camera.position.y * zoom) / lastzoom;
    camera.lookAt(0, 0, 0);
  });
}

/**
 * Updates the mouse position based on the provided event.
 *
 * This function calculates the normalized mouse coordinates within the renderer canvas,
 * taking into account both mouse and touch events.
 *
 * @param {MouseEvent | TouchEvent} event - The mouse or touch event.
 */
function updateMousePosition(event: MouseEvent | TouchEvent): void {
  const clientData = getClientData(event);
  const rect = rendererCanvas.getBoundingClientRect();
  mouse.x = ((clientData.x - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientData.y - rect.top) / rect.height) * 2 + 1;

  function getClientData(event: MouseEvent | TouchEvent) {
    /**
     * Extracts clientX and clientY from the event.
     *
     * @param {MouseEvent | TouchEvent} event - The mouse or touch event.
     * @returns {{x: number, y: number}} - An object containing the clientX and clientY coordinates.
     */
    let clientData = { x: 0, y: 0 };
    if (event instanceof MouseEvent) {
      clientData.x = event.clientX;
      clientData.y = event.clientY;
      return clientData;
    }
    clientData.x = event.changedTouches[0].clientX;
    clientData.y = event.changedTouches[0].clientY;
    return clientData;
  }
}

/**
 * Handles the mousedown event.
 * This function is responsible for initializing the state variables related to mouse interaction
 * and determining if a cube is being rotated or not.
 *
 * @param {MouseEvent | TouchEvent} event - The mouse or touch event object.
 * @returns {void}
 */
function onMouseDown(event: MouseEvent | TouchEvent): void {
  if (clickDelay) return;
  clickDelay = false;
  isMouseDown = true;
  updateMousePosition(event);
  startMousePos.x = mouse.x;
  startMousePos.y = mouse.y;
  lastMousePos.x = startMousePos.x;
  lastMousePos.y = startMousePos.y;

  const intersection = getIntersectionInfo();
  if (intersection) {
    isRotatingCube = true;
    firstIntersectedPos = intersection.intersectedPosition;
    clickedCubePos = intersection.clickedCubePos;
    clickedAxis = intersection.clickedAxis as Axis;
    clickedAxisDir = intersection.clickedAxisDir as Sign;
  } else {
    isRotatingCube = false;
  }

  clickDelay = true;
  setTimeout(() => {
    clickDelay = false;
  }, 300);
}

/**
 * This function is called when the mouse button is released.
 * It handles the completion of a layer rotation and reattaches the cubes to the scene.
 *
 * @returns {void}
 */
function onMouseUp(): void {
  isMouseDown = false;
  isLayerFound = false;
  if (!isLayerRotationcomplete) return; //handle race condition
  if (!isRotatingCube) return;
  isLayerRotationcomplete = false;
  completeLayerRotation(); //complete layer rotation, remove layer reattach cubes
  setTimeout(() => {
    while (layer.children.length > 0) {
      scene.attach(layer.children[0]);
    }
    scene.remove(layer);
    isLayerRotationcomplete = true;
  }, 300);
}

/**
 * Handles mouse movement events to control cube rotation and layer selection.
 *
 * If the layer rotation is not complete, it returns to avoid race conditions.
 * If the mouse button is not pressed, it returns to avoid repeated calls.
 * Updates the mouse position based on the event.
 * Rotates the camera if the mouse start was outside the cube.
 * Rotates the layer if a layer is found  when mouse moves again.
 * Finds the layer to rotate based on mouse movement and intersection information.
 * @param {MouseEvent | TouchEvent} event - The mouse or touch event.
 */
function onMouseMove(event: MouseEvent | TouchEvent): void {
  if (!isLayerRotationcomplete) return; //to avoid race condition
  if (!isMouseDown) return; //avoid repeated calls
  updateMousePosition(event);
  const mouseDelta = {
    x: mouse.x - lastMousePos.x,
    y: mouse.y - lastMousePos.y,
  };
  lastMousePos.x = mouse.x;
  lastMousePos.y = mouse.y;
  //rotate camera if mouse start was outside
  if (!isRotatingCube) {
    rotateCamera(mouseDelta);
    return;
  }
  //rotate the layer if layer is found
  if (isLayerFound) {
    rotatelayer(mouseDelta[layerRotationDir]);
    return;
  }
  //find layer to rotate
  let deltaLarge: number;
  let deltaSmall: number;
  const intersection = getIntersectionInfo();
  if (intersection) {
    let intersectedPos = intersection.intersectedPosition;
    const intersectedPosDelta: { [key in Axis]: number } = {
      x: firstIntersectedPos.x - intersectedPos.x,
      y: firstIntersectedPos.y - intersectedPos.y,
      z: firstIntersectedPos.z - intersectedPos.z,
    };

    delete intersectedPosDelta[clickedAxis]; //delete clicked axis since rotation axis is one of other two
    const values = Object.values(intersectedPosDelta).sort(
      (a, b) => Math.abs(a) - Math.abs(b),
    );
    deltaLarge = Math.abs(values[1]); // value of rotation directon axis
    deltaSmall = Math.abs(values[0]); //value of rotation axis
    rotationAxis = Object.keys(intersectedPosDelta).find(
      (key) =>
        Math.abs(
          intersectedPosDelta[key as keyof typeof intersectedPosDelta],
        ) === deltaSmall,
    ) as keyof typeof intersectedPosDelta;

    //wait for delta large to be sufficiently large else the rotation axis may be ambigious.
    if (
      Math.abs(deltaLarge) > 0.1 &&
      Math.abs(deltaLarge) > Math.abs(deltaSmall * 2) //one movement dominates other clearly
    ) {
      createlayer(rotationAxis);
      let rotationDirectionAxis = Object.keys(intersectedPosDelta).find(
        (key) =>
          Math.abs(
            intersectedPosDelta[key as keyof typeof intersectedPosDelta],
          ) === deltaLarge,
      ) as keyof typeof intersectedPosDelta;
      layerRotationDir =
        Math.abs(mouseDelta.x) > Math.abs(mouseDelta.y) ? "x" : "y";
      layerRotationSign = Math.sign(
        intersectedPosDelta[rotationDirectionAxis],
      ) as Sign; //set direction of layer rotation as sign of rotaion directon axis
      layerRotationSign *= getRotationDirection(
        clickedAxis,
        clickedAxisDir,
        rotationDirectionAxis,
      ); //multiply face specific rotation sign to layer rotation
      layerRotationSign *= Math.sign(mouseDelta[layerRotationDir]); // multiply mouse movement sign to get final direction
      isLayerFound = true;
    }
  }
}

/**
 * Determines the direction of rotation for a given interaction.
 *
 * @param clickedAxis The axis that was clicked.
 * @param clickedAxisDir The direction of the click on the axis (1 or -1).
 * @param rotationDirectionAxis The axis around which the rotation should occur.
 *
 * @returns 1 or -1, indicating the direction of rotation.
 *   1 represents a clockwise rotation, and -1 represents a counterclockwise rotation.
 *
 */
function getRotationDirection(
  clickedAxis: Axis,
  clickedAxisDir: Sign,
  rotationDirectionAxis: Axis,
): -1 | 1 {
  type OtherAxes<T extends Axis> = Exclude<Axis, T>;
  type RotationMap = {
    [Face in Axis]: {
      [Dir in "1" | "-1"]: {
        [Key in OtherAxes<Face>]: number;
      };
    };
  };
  const rotationMap: RotationMap = {
    x: {
      "-1": {
        y: 1,
        z: -1,
      },
      "1": {
        y: -1,
        z: 1,
      },
    },
    y: {
      "-1": {
        x: -1,
        z: 1,
      },
      "1": {
        x: 1,
        z: -1,
      },
    },
    z: {
      "-1": {
        x: 1,
        y: -1,
      },
      "1": {
        x: -1,
        y: 1,
      },
    },
  };
  return rotationMap[clickedAxis][clickedAxisDir][
    rotationDirectionAxis as OtherAxes<typeof clickedAxis>
  ];
}

/**
 * Calculates and returns intersection information when a ray is cast from the camera through the mouse position.
 *
 * @return An object containing information about the intersection, or null if no intersection occurs.
 * The object contains:
 * - intersectedPosition: The 3D point where the ray intersects the face.
 * - clickedCubePos: The position of the cube that was intersected.
 * - clickedAxis: The axis of the face that was intersected ("X", "Y", or "Z").
 * - clickedAxisDir: The direction of the intersected face's axis (1 or -1).
 */
function getIntersectionInfo() {
  raycaster.setFromCamera(mouse, camera);
  const faceIntersections = raycaster.intersectObjects(faces);

  if (faceIntersections.length === 0) {
    return null;
  }
  const cubeIntersects = raycaster.intersectObjects(cubes);
  const intersectedFace = faceIntersections[0].object as THREE.Mesh;
  return {
    intersectedPosition: faceIntersections[0].point,
    clickedCubePos: cubeIntersects[0].object.position,
    clickedAxis: intersectedFace.userData["axis"],
    clickedAxisDir: intersectedFace.userData["dir"],
  };
}

/**
 * create a layer based on mouse down  to apply rotation.
 *
 * this function  takes an axis and calculates
 * the position of that axis then creates a
 * layer including all cubes with that specific position.
 * @param {Axis} axis the axis to create layer
 *
 * @returns None
 */
function createlayer(axis: Axis) {
  layer = new THREE.Group();
  const index = Math.round(clickedCubePos[axis]); //round the axis position
  cubes.forEach((cube) => {
    if (Math.round(cube.position[axis]) === index) {
      layer.add(cube);
    } //add cubes in that specific layer to layer
  });
  scene.add(layer); //add that layer to scene for rotation and animation
}

/**
 * rotate a layer based on mouse movement.
 * @param {number} delta  change in mouse position.
 */
function rotatelayer(delta: number) {
  const rotationfactor = 5;
  layer.rotation[rotationAxis] += layerRotationSign * delta * rotationfactor;
}

/**
 * Completes the rotation of a face of the cube.
 *
 * This function calculates the target rotation angle based on the current rotation
 * and a snap angle. It then uses a tween to smoothly animate the rotation to
 * the target angle.
 *
 * @returns void
 */
function completeLayerRotation() {
  const snapAngle = Math.PI / 2;
  const snapThreshold = Math.PI / 10;
  const startRotation: { x: number; y: number; z: number } = {
    x: 0,
    y: 0,
    z: 0,
  };
  const endRotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  startRotation[rotationAxis] = layer.rotation[rotationAxis];
  if (Math.abs(startRotation[rotationAxis] % snapAngle) < snapThreshold) {
    endRotation[rotationAxis] =
      Math.round(startRotation[rotationAxis] / snapAngle) * snapAngle; //set final position to starting layer position since layer only moved a little
  } else if (Math.sign(startRotation[rotationAxis] % snapAngle) == -1) {
    endRotation[rotationAxis] =
      Math.floor(startRotation[rotationAxis] / snapAngle) * snapAngle; // snap to next multiple of snapangle since cube is rotated right
  } else {
    endRotation[rotationAxis] =
      Math.ceil(startRotation[rotationAxis] / snapAngle) * snapAngle; // snap to previous multiple of snapangle since cube is rotated left
  }
  //use tween to do smooth rotation
  tween = new TWEEN.Tween(startRotation)
    .to(endRotation, 200)
    .easing(TWEEN.Easing.Linear.None)
    .onUpdate(() => {
      layer.rotation[rotationAxis] = startRotation[rotationAxis]; //for smooth rotation
    })
    .start();
}

/**
 * Rotates the camera based on mouse movement.
 * camera revolves around cube always pointing to origin to create an illusion of rotating cube.
 *
 * This function calculates the rotation based on the provided delta values
 * and applies it to the camera's position .
 *
 * @param {object} delta - An object containing the change in mouse position.
 * @param {number} delta.x - The horizontal change in mouse position.
 * @param {number} delta.y - The vertical change in mouse position.
 *
 * @returns void
 */
function rotateCamera(delta: { x: number; y: number }) {
  const rotationfactor = 1.3; //controls the rotation speed
  const cameraDirection = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const camraUp = camera.up.clone();
  camera.getWorldDirection(cameraDirection); //get cameras forward direction
  cameraRight.crossVectors(cameraDirection, camraUp).normalize(); //normalize for consistent length
  let rotationAngleX = delta.y * rotationfactor;
  let rotationAngleY = -delta.x * rotationfactor;
  //Create rotation quaternions for X and Y axes.
  const rotationQuaternionY = new THREE.Quaternion().setFromAxisAngle(
    camraUp,
    rotationAngleY * 3,
  );
  const rotationQuaternionX = new THREE.Quaternion().setFromAxisAngle(
    cameraRight,
    rotationAngleX * 3,
  );
  //combine quaternion rotations
  const combinedRotation = new THREE.Quaternion().multiplyQuaternions(
    rotationQuaternionX,
    rotationQuaternionY,
  );
  camera.position.applyQuaternion(combinedRotation); //apply quaternion to camera to get new camera position
  camera.up.applyQuaternion(combinedRotation); //to keep the up vector stable
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}
