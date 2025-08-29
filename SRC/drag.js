import { THREE, camera, renderer, controls } from './core.js';

const dragState = { 
  active: false, 
  target: null, 
  offset: new THREE.Vector3(), 
  mode: 'xy', 
  pointerId: null 
};

function screenToWorldOnPlane(clientX, clientY, referenceZ) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;
  const ndc = new THREE.Vector2(x, y);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -referenceZ);
  const intersection = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersection);
  return intersection;
}

function screenToWorldOnHorizontalPlane(clientX, clientY, referenceY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;
  const ndc = new THREE.Vector2(x, y);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -referenceY);
  const intersection = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersection);
  return intersection;
}

function enableDragForPivot(pivot, options = {}) {
  if (!pivot) return;
  const { onMove, onEnd } = options;
  const hud = document.getElementById('hud-curtain-front');

  const updateHUD = () => {
    if (!hud) return;
    const p = (dragState.active && dragState.target) ? dragState.target.position : pivot.position;
    if (!p) return;
    hud.textContent = `Cortina: x=${p.x.toFixed(3)}  y=${p.y.toFixed(3)}  z=${p.z.toFixed(3)}`;
  };

  const pickMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.25, depthTest: false });
  const pickGeo = new THREE.SphereGeometry(0.05, 16, 16);
  const pickHandle = new THREE.Mesh(pickGeo, pickMat);
  pickHandle.name = 'PivotHandle';
  pivot.add(pickHandle);

  renderer.domElement.addEventListener('contextmenu', (e) => {
    if (dragState.active) e.preventDefault();
  });

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (!e.shiftKey) return;
    const isRight = e.button === 2;
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ndc = new THREE.Vector2(x, y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(pickHandle, true);
    if (!hits || hits.length === 0) return;

    const world = isRight
      ? screenToWorldOnHorizontalPlane(e.clientX, e.clientY, pivot.position.y)
      : screenToWorldOnPlane(e.clientX, e.clientY, pivot.position.z);
    if (!world) return;

    e.preventDefault();
    e.stopPropagation();
    renderer.domElement.setPointerCapture?.(e.pointerId);

    dragState.active = true;
    dragState.target = pivot;
    dragState.pointerId = e.pointerId;
    dragState.mode = isRight ? 'z' : 'xy';
    dragState.offset.copy(pivot.position).sub(world);

    if (controls) controls.enabled = false;
    renderer.domElement.style.cursor = 'grabbing';
  }, { passive: false });

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!dragState.active || dragState.target !== pivot) return;
    e.preventDefault();

    if (dragState.mode === 'z') {
      const world = screenToWorldOnHorizontalPlane(e.clientX, e.clientY, pivot.position.y);
      if (!world) return;
      const next = world.clone().add(dragState.offset);
      pivot.position.z = next.z;
    } else {
      const world = screenToWorldOnPlane(e.clientX, e.clientY, pivot.position.z);
      if (!world) return;
      const next = world.clone().add(dragState.offset);
      pivot.position.x = next.x;
      pivot.position.y = next.y;
    }
    if (onMove) onMove(pivot);
    updateHUD();
  }, { passive: false });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (dragState.active && dragState.target === pivot) {
      e.preventDefault();
      if (dragState.pointerId != null) {
        renderer.domElement.releasePointerCapture?.(dragState.pointerId);
      }
      dragState.active = false;
      dragState.pointerId = null;
      if (controls) controls.enabled = true;
      renderer.domElement.style.cursor = '';
      updateHUD();
      if (onEnd) onEnd(pivot);
    }
  });

  updateHUD();
}

export { dragState, screenToWorldOnPlane, screenToWorldOnHorizontalPlane, enableDragForPivot };


