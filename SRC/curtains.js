import { THREE, scene } from './core.js';
import { curtainConfig } from '../config.js';

function getGarageDoorSizeApprox(root, garageRef) {
  const base = garageRef || root?.getObjectByName('PuertaGaraje') || root?.getObjectByName('garage');
  if (!base) return null;
  const bb = new THREE.Box3().setFromObject(base);
  const size = bb.getSize(new THREE.Vector3());
  return size;
}

function resolveCurtainDimensions(modelBox, root, garageRef) {
  const modelSize = modelBox.getSize(new THREE.Vector3());
  const garageSize = getGarageDoorSizeApprox(root, garageRef);

  let width;
  switch (curtainConfig.widthMode) {
    case 'garageWidth':
      width = (garageSize ? garageSize.x : modelSize.x) * (curtainConfig.widthScale || 1);
      break;
    case 'modelWidth':
      width = modelSize.x * (curtainConfig.widthScale || 1);
      break;
    case 'absolute':
      width = curtainConfig.widthValue || 1;
      break;
    default:
      width = (garageSize ? garageSize.x : modelSize.x) * 1.0;
  }
  width = Math.max(curtainConfig.minWidth || 0.05, width);

  let height;
  switch (curtainConfig.heightMode) {
    case 'garageHeight':
      height = (garageSize ? garageSize.y : modelSize.y) * (curtainConfig.heightScale || 1);
      break;
    case 'modelHeight':
      height = modelSize.y * (curtainConfig.heightScale || 1);
      break;
    case 'absolute':
      height = curtainConfig.heightValue || 1;
      break;
    default:
      height = (garageSize ? garageSize.y : modelSize.y) * 0.75;
  }
  height = Math.max(curtainConfig.minHeight || 0.05, height);

  return { width, height };
}

function createCurtainPanelAt(worldTopCenter, width, maxHeight) {
  const pivot = new THREE.Group();
  pivot.position.copy(worldTopCenter);
  scene.add(pivot);

  const geometry = new THREE.BoxGeometry(1, 1, 0.05);
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0, roughness: 0.6 });
  const panel = new THREE.Mesh(geometry, material);
  panel.castShadow = false;
  panel.receiveShadow = false;
  panel.scale.x = Math.max(0.05, width);
  panel.scale.y = 0.001;
  panel.scale.z = Math.max(0.02, width * 0.05);
  panel.position.y = -panel.scale.y / 2;
  pivot.add(panel);

  const maxScaleY = Math.max(0.05, maxHeight);
  return { pivot, panel, maxScaleY };
}

export { getGarageDoorSizeApprox, resolveCurtainDimensions, createCurtainPanelAt };


