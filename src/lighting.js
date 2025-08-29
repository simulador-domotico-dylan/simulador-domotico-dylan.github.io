import { THREE, scene } from './core.js';

let ambientLight, mainLight;
let brightnessValue = 1.0;

function createLights() {
  ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
  mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(4, 10, 6);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 60;
  mainLight.shadow.camera.left = -12;
  mainLight.shadow.camera.right = 12;
  mainLight.shadow.camera.top = 12;
  mainLight.shadow.camera.bottom = -12;
  mainLight.shadow.bias = -0.0003;
  mainLight.shadow.normalBias = 0.02;
  scene.add(ambientLight);
  scene.add(mainLight);
}

function updateBrightness(value) {
  brightnessValue = value / 100;
  if (ambientLight) ambientLight.intensity = brightnessValue * 2.5;
  if (mainLight) mainLight.intensity = brightnessValue * 1.2;
}

export { createLights, updateBrightness, ambientLight, mainLight };


