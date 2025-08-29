import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.150.1/examples/jsm/controls/OrbitControls.js';

// ===== CONFIGURACIÓN INICIAL DE ESCENA/CÁMARA/RENDER =====
const scene = new THREE.Scene();

// Fondo
const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load('assets/background.png');
scene.background = backgroundTexture;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Controles
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.screenSpacePanning = true;
controls.enablePan = true;
controls.enableRotate = true;

export { THREE, scene, camera, renderer, controls };


