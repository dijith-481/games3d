import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";

const rendererCanvas = document.getElementById(
  "rendererCanvas",
) as HTMLCanvasElement;
const scene = new THREE.Scene();
let cubes: THREE.Mesh[] = [];
let faceCube: THREE.Object3D;
let faces: THREE.Mesh[] = [];
let tiny: THREE.Mesh[] = [];
let camera: THREE.PerspectiveCamera;

let renderer: THREE.WebGLRenderer;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let zoom = 8;

let isIntersected: boolean;
let downMousePosition = { x: 0, y: 0 };
let previousMousePosition = { x: 0, y: 0 };

let downcube: THREE.Mesh;
let isMouseDown: boolean;
let tween = new TWEEN.Tween();
let clickDelay: boolean = false;
let mouseUp: boolean = false;
raycaster = new THREE.Raycaster();
mouse = new THREE.Vector2();
isMouseDown = false;

initThree();
function initThree() {
  zoom = 8;
  camera = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.z = zoom;
  camera.lookAt(0, 0, 0);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ canvas: rendererCanvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Add cube
  let count = 0;
  let cubeSize = 0.95;
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
    new THREE.MeshBasicMaterial({ color: 0x0000ff }),
    new THREE.MeshBasicMaterial({ color: 0xffff00 }),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    new THREE.MeshBasicMaterial({ color: 0xffa500 }),
  ];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const cubeGeometry = new THREE.BoxGeometry(
          cubeSize,
          cubeSize,
          cubeSize,
        );
        const cube = new THREE.Mesh(cubeGeometry);
        for (let i = 0; i < cubeGeometry.groups.length; i++) {
          cube.geometry.groups[i].materialIndex = i;
        }
        cube.material = materials;
        cube.position.set(x, y, z);
        cube.userData["x"] = x;
        cube.userData["y"] = -y;
        cube.userData["z"] = -z;
        cube.userData["id"] = count++;
        cubes.push(cube);
        scene.add(cube);
      }
    }
  }

  for (let y = 0; y < 3; y++) {
    for (let x = -1; x <= 1; x += 2) {
      const faceGeometry = new THREE.BoxGeometry(
        y === 0 ? 0 : 3,
        y === 1 ? 0 : 3,
        y === 2 ? 0 : 3,
      );
      const face = new THREE.Mesh(
        faceGeometry,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          opacity: 0.2,
          transparent: true,
        }),
      );
      face.position.set(
        y === 0 ? x + x * 0.5 : 0,
        y === 1 ? x + x * 0.5 : 0,
        y === 2 ? x + x * 0.5 : 0,
      );
      face.userData["id"] = y === 0 ? `x` : y === 1 ? "y" : "z";
      face.userData["dir"] = x;
      scene.add(face);
      faces.push(face);
    }
  }

  addEventListeners();
}
function createtinyCube(pos: THREE.Vector3) {
  const tinyCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0,
      transparent: true,
    }),
  );
  tinyCube.position.set(pos.x, pos.y, pos.z);
  scene.add(tinyCube);
  tiny.push(tinyCube);
  return tinyCube;
}
function initAnimate(time: number) {
  tween.update(time);
  renderer.render(scene, camera);
  requestAnimationFrame(initAnimate);
}
requestAnimationFrame(initAnimate);
function addEventListeners(): void {
  rendererCanvas.addEventListener("mousedown", onMouseDown);
  rendererCanvas.addEventListener("mouseup", onMouseUp);
  rendererCanvas.addEventListener("mousemove", onMouseMove);
  rendererCanvas.addEventListener("touchstart", onMouseDown);
  rendererCanvas.addEventListener("touchend", onMouseUp);
  rendererCanvas.addEventListener("touchmove", onMouseMove);
}

function updateMousePosition(event: MouseEvent | TouchEvent): void {
  let clientX: number;
  let clientY: number;
  if (event instanceof MouseEvent) {
    clientX = event.clientX;
    clientY = event.clientY;
  } else {
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  }
  const rect = rendererCanvas.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function onMouseDown(event: MouseEvent | TouchEvent): void {
  if (clickDelay) return;
  clickDelay = false;
  isMouseDown = true;
  updateMousePosition(event);
  downMousePosition.x = mouse.x;
  downMousePosition.y = mouse.y;
  previousMousePosition.x = downMousePosition.x;
  previousMousePosition.y = downMousePosition.y;
  console.log(downMousePosition);

  let intersection = checkIntersection();
  if (intersection.isIntersected) {
    isIntersected = true;
    downcube = createtinyCube(intersection.intersectedPosition);
    clickedCubePos = intersection.clickedCubePos;
    clickedFace = intersection.clickedFace as "x" | "y" | "z";
    clickedFaceDir = intersection.clickedFaceDir as -1 | 1;
  } else {
    isIntersected = false;
  }

  clickDelay = true;
  setTimeout(() => {
    clickDelay = false;
  }, 300);
}

let clickedCubePos: THREE.Vector3;
let clickedFace: "x" | "y" | "z";
let clickedFaceDir: -1 | 1;

function onMouseUp(event: MouseEvent | TouchEvent): void {
  console.log(event);
  if (mouseUp) return;
  isMouseDown = false;
  foundFace = false;
  if (isIntersected) {
    mouseUp = true;
    tiny.forEach((tinycube) => {
      scene.remove(tinycube);
    });
    completeRotation();
    setTimeout(() => {
      while (faceCube.children.length > 0) {
        scene.attach(faceCube.children[0]);
      }
      scene.remove(faceCube);
      mouseUp = false;
    }, 300);
  }
}
let foundFace = false;
let rotatelayerKey!: "x" | "y" | "z";

function onMouseMove(event: MouseEvent | TouchEvent): void {
  if (mouseUp) return;
  if (!isMouseDown) return;
  updateMousePosition(event);

  const deltaMove = {
    x: mouse.x - previousMousePosition.x,
    y: mouse.y - previousMousePosition.y,
  };
  previousMousePosition.x = mouse.x;
  previousMousePosition.y = mouse.y;

  if (isIntersected) {
    let bigDelta!: number;
    let smallDelta!: number;
    if (!foundFace) {
      let intersection = checkIntersection();
      if (intersection.isIntersected) {
        let cube = createtinyCube(intersection.intersectedPosition);
        const deltatiny: { [key in "x" | "y" | "z"]: number } = {
          x: downcube.position.x - cube.position.x,
          y: downcube.position.y - cube.position.y,
          z: downcube.position.z - cube.position.z,
        };

        delete deltatiny[clickedFace];
        const values = Object.values(deltatiny).sort(
          (a, b) => Math.abs(a) - Math.abs(b),
        );
        bigDelta = Math.abs(values[1]);
        smallDelta = Math.abs(values[0]);
        rotatelayerKey = Object.keys(deltatiny).find(
          (key) =>
            Math.abs(deltatiny[key as keyof typeof deltatiny]) === smallDelta,
        ) as keyof typeof deltatiny;

        if (
          Math.abs(bigDelta) > 0.2 &&
          Math.abs(bigDelta) > Math.abs(smallDelta * 2)
        ) {
          createFace(rotatelayerKey);
          let directionKey = Object.keys(deltatiny).find(
            (key) =>
              Math.abs(deltatiny[key as keyof typeof deltatiny]) === bigDelta,
          ) as keyof typeof deltatiny;
          direction = Math.sign(deltatiny[directionKey]) as -1 | 1;
          if (Math.abs(deltaMove.x) > Math.abs(deltaMove.y)) {
            mouseDir = "x";
          } else {
            mouseDir = "y";
          }
          direction *= getRotationDirection(
            clickedFace,
            clickedFaceDir,
            directionKey,
          );
          direction *= Math.sign(deltaMove[mouseDir]);
          foundFace = true;
        }
      }
    } else {
      rotateFace(deltaMove[mouseDir]);
    }
  } else {
    rotateCamera(deltaMove);
  }
}

function getRotationDirection(
  clickedFace: "x" | "y" | "z",
  clickedFaceDir: 1 | -1,
  directionKey: "x" | "y" | "z",
): -1 | 1 {
  type OtherAxes<T extends "x" | "y" | "z"> = Exclude<"x" | "y" | "z", T>;
  type RotationMap = {
    [Face in "x" | "y" | "z"]: {
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
  return rotationMap[clickedFace][clickedFaceDir][
    directionKey as OtherAxes<typeof clickedFace>
  ];
}

let direction: -1 | 1;
let mouseDir: "x" | "y";

function checkIntersection() {
  let intersection = {
    isIntersected: false,
    intersectedPosition: new THREE.Vector3(),
    clickedCubePos: new THREE.Vector3(),
    clickedFace: undefined as "x" | "y" | "z" | undefined,
    clickedFaceDir: undefined as -1 | 1 | undefined,
  };
  raycaster.setFromCamera(mouse, camera);
  const cubeIntersects = raycaster.intersectObjects(cubes);
  const faceIntersects = raycaster.intersectObjects(faces);

  if (faceIntersects.length > 0) {
    const intersectedCube = cubeIntersects[0].object as THREE.Mesh;
    intersection.clickedCubePos = intersectedCube.position;

    let intersectedFace = faceIntersects[0].object as THREE.Mesh;
    intersection.isIntersected = true;
    intersection.intersectedPosition = faceIntersects[0].point;
    intersection.clickedFace = intersectedFace.userData["id"];
    intersection.clickedFaceDir = intersectedFace.userData["dir"];
  } else {
    //  console.log('test')
    intersection.isIntersected = false;
  }
  return intersection;
}

function createFace(axis: "x" | "y" | "z") {
  faceCube = new THREE.Group();
  const index = Math.round(clickedCubePos[axis]);
  // console.log(index)
  cubes.forEach((cube) => {
    // console.log(Math.round(cube.position[axis]))
    if (Math.round(cube.position[axis]) === index) {
      faceCube.add(cube);
    }
  });

  scene.add(faceCube);
}
function rotateFace(delta: number) {
  faceCube.rotation[rotatelayerKey] += direction * delta * 5;
}
function completeRotation() {
  const snapAngle = Math.PI / 2;
  const startRotation: { x: number; y: number; z: number } = {
    x: 0,
    y: 0,
    z: 0,
  };
  const endRotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  startRotation[rotatelayerKey] = faceCube.rotation[rotatelayerKey];
  endRotation[rotatelayerKey] =
    Math.round(startRotation[rotatelayerKey] / snapAngle) * snapAngle;
  tween = new TWEEN.Tween(startRotation)
    .to(endRotation, 200)
    .easing(TWEEN.Easing.Linear.None)
    .onUpdate(() => {
      faceCube.rotation[rotatelayerKey] = startRotation[rotatelayerKey];
    })
    .onComplete(() => {
      faceCube.rotation[rotatelayerKey] = endRotation[rotatelayerKey];
    })
    .start();
}

function rotateCamera(delta: { x: number; y: number }) {
  const targetPosition = new THREE.Vector3(); // Target position
  const currentPosition = new THREE.Vector3().copy(camera.position); // Current
  const cameraZ = new THREE.Vector3();
  const cameraX = new THREE.Vector3();
  const cameraY = camera.up;
  camera.getWorldDirection(cameraZ);
  cameraX.crossVectors(cameraZ, cameraY).normalize();
  let x = delta.y * 1.3;
  let y = -delta.x * 1.3;
  const yQuaternion = new THREE.Quaternion().setFromAxisAngle(cameraY, y * 3);
  const xQuaternion = new THREE.Quaternion().setFromAxisAngle(cameraX, x * 3);
  let combined = new THREE.Quaternion().multiplyQuaternions(
    xQuaternion,
    yQuaternion,
  );
  combined.normalize();
  targetPosition.copy(currentPosition).applyQuaternion(combined);
  const offset = camera.position;
  offset.applyQuaternion(combined);
  camera.position.copy(offset);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  camera.up.applyQuaternion(combined);
}
