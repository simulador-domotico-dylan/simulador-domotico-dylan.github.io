import { THREE, scene, camera, renderer, controls } from './src/core.js';
import { createLights, updateBrightness, ambientLight, mainLight } from './src/lighting.js';
import { setupLightButtons } from './src/lightsUi.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { curtainConfig, buttonConfig } from './config.js';
import { topBarScale } from './config.js';
import { animatePanel, rotarSuave, rotarGarageSuave } from './src/animation.js';

// ===== CONFIGURACIÓN INICIAL =====
// Escena/cámara/renderer ya inicializados en core.js

// ===== SISTEMA DE ILUMINACIÓN Y BRILLO =====
// Escalado proporcional de la barra superior y sus iconos/textos
document.addEventListener('DOMContentLoaded', () => {
  const bar = document.getElementById('controls');
  if (bar) {
    // Mantener centrado horizontal con translateX(-50%) y aplicar escala
    bar.style.transform = `translateX(-50%) scale(${topBarScale})`;
    bar.style.transformOrigin = 'top center';
  }
});

// Variables para control de brillo
// Eliminar cualquier div sobrante del zoom de la interfaz si quedó en el DOM
window.addEventListener('DOMContentLoaded', () => {
  const zi = document.getElementById('zoom-indicator-3d');
  if (zi) zi.remove();
});
let floorBrightnessValue = 1.5; // Valor inicial 150%
let floorObject = null; // Referencia al piso

// Función para actualizar el brillo del piso
function updateFloorBrightness(value) {
  floorBrightnessValue = value / 100; // Convertir porcentaje a decimal (0-3)
  
  if (floorObject && floorObject.material) {
    // Mantener el color verde original
    floorObject.material.color.setHex(0x00ff00); // Verde
    floorObject.material.emissive.setHex(0x000000); // Sin emisión
    floorObject.material.emissiveIntensity = 0;
    // Material mate
    floorObject.material.metalness = 0.0;
    floorObject.material.roughness = 0.9;
  }
}

// Configurar luces estilo Unity
createLights();

// Configurar brillo inicial
updateBrightness(100);
updateFloorBrightness(150);

// ===== CONTROLES DE CÁMARA =====
// OrbitControls ya configurados en core.js
// Mostrar cursor de mano al interactuar con la casa
let isRotating = false;
let isOverHouse = false;
const raycaster = new THREE.Raycaster();
renderer.domElement.addEventListener('pointermove', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera({ x, y }, camera);
  let intersects = [];
  if (modelo) {
    intersects = raycaster.intersectObject(modelo, true);
  }
  isOverHouse = intersects.length > 0;
  if (!isRotating) {
    renderer.domElement.style.cursor = isOverHouse ? 'grab' : 'default';
  }
});
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button === 0 && isOverHouse) { // solo click izquierdo sobre la casa
    isRotating = true;
    renderer.domElement.style.cursor = 'grabbing';
  }
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (isRotating) {
    isRotating = false;
    renderer.domElement.style.cursor = isOverHouse ? 'grab' : 'default';
  }
});
renderer.domElement.addEventListener('pointerleave', (e) => {
  if (isRotating) {
    isRotating = false;
  }
  renderer.domElement.style.cursor = 'default';
});

// ===== ESTADO GLOBAL =====

// Referencias a objetos principales
let modelo, puerta, garage, portonDelantero, portonTrasero;

// Estado de puertas y portones
let puertaAbierta = false;
let garageAbierto = false;
let animacionActiva = false;
let portonDelanteroAbierto = false;
let portonTraseroAbierto = false;

// Estado para la funcionalidad de arrastre
const dragState = {
  active: false,
  target: null,
  pointerId: null,
  mode: 'xy', // 'xy' o 'z'
  offset: new THREE.Vector3()
};

// Referencias a objetos de control
let portonDelanteroRef = null;
let puertaControl = null; // Objeto que controlará el botón principal
let puertaControlAbierta = false;

// Puertas interiores
let puertaInterior1 = null; // puerta_cuarto
let puertaInterior1Abierta = false;
let puertaInterior2 = null; // puerta_baño
let puertaInterior2Abierta = false;

// Pivots para portones
let portonTraseroPivot = null; // Pivot para portón trasero (para bisagra superior)
let portonDelanteroPivot = null; // Pivot para portón delantero (bisagra superior)

// ===== SISTEMA DE CORTINAS =====

// Cortinas: control por escala desde borde superior
let cortinaDelantera = null;
let cortinaTrasera = null;
let cortinaDelanteraPivot = null; // pivot superior para rotación
let cortinaTraseraPivot = null;   // pivot superior para rotación
let cortinaDelanteraCerrada = false; // por defecto abiertas
let cortinaTraseraCerrada = false;   // por defecto abiertas

// Paneles rojos simuladores de cortina
let cortinaDelanteraPanelPivot = null;
let cortinaDelanteraPanel = null;
let cortinaDelanteraPanelMaxScaleY = 1;
let cortinaTraseraPanelPivot = null;
let cortinaTraseraPanel = null;
let cortinaTraseraPanelMaxScaleY = 1;

// Constantes para posicionamiento de cortina trasera
const REAR_LOCKED_X = -0.710;
const REAR_LOCKED_Z = 0.098;
const REAR_LOCKED_Y = 0.585;

// ===== FUNCIONES DE CORTINAS =====

/**
 * Obtiene el tamaño aproximado de la puerta de garaje para escalar paneles
 * @returns {THREE.Vector3|null} Dimensiones de la puerta o null si no se encuentra
 */
function getGarageDoorSizeApprox() {
  const base = garage || modelo?.getObjectByName('PuertaGaraje') || modelo?.getObjectByName('garage');
  if (!base) return null;
  const bb = new THREE.Box3().setFromObject(base);
  const size = bb.getSize(new THREE.Vector3());
  return size;
}

/**
 * Calcula las dimensiones de las cortinas según la configuración
 * @param {THREE.Box3} modelBox - Caja delimitadora del modelo
 * @returns {Object} Ancho y alto calculados para la cortina
 */
function resolveCurtainDimensions(modelBox) {
  const modelSize = modelBox.getSize(new THREE.Vector3());
  const garageSize = getGarageDoorSizeApprox();

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

// ===== UTILIDADES DE UI =====
// Importamos setButtonLabel desde buttonLogic.js
import { inicializarBotones, setButtonLabel } from './src/buttonLogic.js';

/**
 * Crea un panel de cortina con pivot superior
 * @param {THREE.Vector3} worldTopCenter - Posición del centro superior en coordenadas mundiales
 * @param {number} width - Ancho del panel
 * @param {number} maxHeight - Altura máxima del panel
 * @returns {Object} Objeto con pivot, panel y altura máxima
 */
function createCurtainPanelAt(worldTopCenter, width, maxHeight) {
  const pivot = new THREE.Group();
  pivot.position.copy(worldTopCenter);
  scene.add(pivot);

  const geometry = new THREE.BoxGeometry(1, 1, 0.05);
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0, roughness: 0.6 });
  const panel = new THREE.Mesh(geometry, material);
  panel.castShadow = false;
  panel.receiveShadow = false;
  panel.scale.x = Math.max(0.05, width); // ancho fijo
  panel.scale.y = 0.001; // abierto (casi cero)
  panel.scale.z = Math.max(0.02, width * 0.05);
  // Top anclado al pivot: centro queda a -scaleY/2
  panel.position.y = -panel.scale.y / 2;
  pivot.add(panel);

  const maxScaleY = Math.max(0.05, maxHeight);
  return { pivot, panel, maxScaleY };
}

// ===== SISTEMA DE ANIMACIONES =====

// ===== SISTEMA DE ARRASTRE (DRAG & DROP) =====

/**
 * Sincroniza los inputs de posición de la cortina extra con la posición del pivot
 */
function syncExtraPositionInputsFromPivot() {
	const xIn = document.getElementById('ce-pos-x');
	const yIn = document.getElementById('ce-pos-y');
	const zIn = document.getElementById('ce-pos-z');
	// Si no existen los sliders, simplemente no hacer nada (no romper la lógica)
	if (!xIn || !yIn || !zIn || !cortinaExtraPivot) return;
	xIn.value = cortinaExtraPivot.position.x.toFixed(3);
	yIn.value = cortinaExtraPivot.position.y.toFixed(3);
	zIn.value = cortinaExtraPivot.position.z.toFixed(3);
}

// ===== SISTEMA DE ARRASTRE DE PIVOTS =====

/**
 * Habilita el arrastre para un pivot
 * @param {THREE.Object3D} pivot - Pivot al que se le habilitará el arrastre
 */
function enableDragForPivot(pivot) {
	if (!pivot) return;
    const hud = document.getElementById('hud-curtain-front');
    
    /**
     * Actualiza el HUD con las coordenadas del pivot activo
     */
    const updateHUD = () => {
        if (!hud) return;
        // Mostrar coordenadas del pivot activo, o de la cortina extra, o de la trasera
        const p = (dragState.active && dragState.target)
            ? dragState.target.position
            : (cortinaExtraPivot?.position || cortinaTraseraPanelPivot?.position);
        if (!p) return;
        hud.textContent = `Cortina: x=${p.x.toFixed(3)}  y=${p.y.toFixed(3)}  z=${p.z.toFixed(3)}`;
    };

	// Handle de pick pequeño en el pivot (para raycast preciso)
	const pickMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.25, depthTest: false });
	const pickGeo = new THREE.SphereGeometry(0.05, 16, 16);
	const pickHandle = new THREE.Mesh(pickGeo, pickMat);
	pickHandle.name = 'PivotHandle';
	pivot.add(pickHandle);

	// Evitar menú contextual mientras se usa click derecho para arrastrar
	renderer.domElement.addEventListener('contextmenu', (e) => {
		if (dragState.active) e.preventDefault();
	});

	// Evento de inicio de arrastre
	renderer.domElement.addEventListener('pointerdown', (e) => {
		// Requerir Shift para activar drag y evitar capturas accidentales al rotar la cámara
		if (!e.shiftKey) return;
		const isRight = e.button === 2;
		
		// Raycast al handle; solo arrancar si clickeamos el handle del pivot
		const rect = renderer.domElement.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
		const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
		const ndc = new THREE.Vector2(x, y);
		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(ndc, camera);
		const hits = raycaster.intersectObject(pickHandle, true);
		if (!hits || hits.length === 0) return; // no tocaste el handle

		const world = isRight
			? screenToWorldOnHorizontalPlane(e.clientX, e.clientY, pivot.position.y)
			: screenToWorldOnPlane(e.clientX, e.clientY, pivot.position.z);
		if (!world) return;
		
		e.preventDefault();
		e.stopPropagation();
		renderer.domElement.setPointerCapture?.(e.pointerId);
		
		// Configurar estado de arrastre
		dragState.active = true;
		dragState.target = pivot;
		dragState.pointerId = e.pointerId;
		dragState.mode = isRight ? 'z' : 'xy';
		dragState.offset.copy(pivot.position).sub(world);
		
		// Deshabilitar controles de cámara durante el arrastre
		if (typeof controls !== 'undefined' && controls) controls.enabled = false;
		renderer.domElement.style.cursor = 'grabbing';
	}, { passive: false });

	// Evento de movimiento durante el arrastre
	renderer.domElement.addEventListener('pointermove', (e) => {
		if (!dragState.active || dragState.target !== pivot) return;
		e.preventDefault();
		
		if (dragState.mode === 'z') {
			// Movimiento en el plano horizontal (cambio de Z)
			const world = screenToWorldOnHorizontalPlane(e.clientX, e.clientY, pivot.position.y);
			if (!world) return;
			const next = world.clone().add(dragState.offset);
			
			// Aplicar restricciones según el tipo de pivot
			if (pivot === cortinaTraseraPanelPivot) {
				// La cortina trasera tiene posición fija
				pivot.position.z = REAR_LOCKED_Z; 
				pivot.position.x = REAR_LOCKED_X; 
				pivot.position.y = REAR_LOCKED_Y; 
			} else {
				pivot.position.z = next.z;
			}
		} else {
			// Movimiento en el plano vertical (cambio de X e Y)
			const world = screenToWorldOnPlane(e.clientX, e.clientY, pivot.position.z);
			if (!world) return;
			const next = world.clone().add(dragState.offset);
			
			// Aplicar restricciones según el tipo de pivot
			if (pivot === cortinaTraseraPanelPivot) {
				// La cortina trasera tiene posición fija
				pivot.position.x = REAR_LOCKED_X;
				pivot.position.z = REAR_LOCKED_Z;
				pivot.position.y = REAR_LOCKED_Y;
			} else {
				pivot.position.x = next.x;
				pivot.position.y = next.y;
			}
		}
		
		// Actualizar interfaz
		updateHUD();
		
		// Actualizar sliders en tiempo real si estamos moviendo la cortina extra
		if (pivot === cortinaExtraPivot) {
			syncExtraPositionInputsFromPivot();
		}
	}, { passive: false });

	// Evento de finalización de arrastre
	renderer.domElement.addEventListener('pointerup', (e) => {
		if (dragState.active && dragState.target === pivot) {
			e.preventDefault();
			
			// Liberar captura de puntero
			if (dragState.pointerId != null) {
				renderer.domElement.releasePointerCapture?.(dragState.pointerId);
			}
			
			// Restablecer estado
			dragState.active = false;
			dragState.pointerId = null;
			
			// Reactivar controles de cámara
			if (typeof controls !== 'undefined' && controls) controls.enabled = true;
			renderer.domElement.style.cursor = '';
			
			// Actualizar interfaz
			updateHUD();
			if (pivot === cortinaExtraPivot) {
				syncExtraPositionInputsFromPivot();
				updateCurtainExtraSizeLabel();
			}
		}
	});

	// Inicializar HUD
	updateHUD();
}

// Conjunto de mallas rojas (debug)
let redDebugMeshes = [];

function isLikelyRedColor(col) {
  if (!col) return false;
  // Usar componentes lineales
  const r = col.r ?? 0, g = col.g ?? 0, b = col.b ?? 0;
  return r > 0.6 && g < 0.35 && b < 0.35; // umbral tolerante
}

function collectRedMeshes(root) {
  const result = [];
  root.traverse((child) => {
    if (!child.isMesh) return;
    const mat = child.material;
    if (Array.isArray(mat)) {
      if (mat.some(m => isLikelyRedColor(m?.color) || isLikelyRedColor(m?.emissive))) result.push(child);
    } else if (mat) {
      if (isLikelyRedColor(mat.color) || isLikelyRedColor(mat.emissive)) result.push(child);
    }
  });
  return result;
}

function prepareCurtainWithTopPivot(node) {
  // Acepta un Object3D (grupo o mesh) y crea:
  // pivot (en borde superior) -> offsetGroup -> node
  if (!node) return { pivot: null };

  // BBox en mundo del nodo completo
  const bboxWorld = new THREE.Box3().setFromObject(node);
  const sizeWorld = bboxWorld.getSize(new THREE.Vector3());
  const centerWorld = bboxWorld.getCenter(new THREE.Vector3());
  const topCenterWorld = new THREE.Vector3(centerWorld.x, bboxWorld.max.y, centerWorld.z);

  const parent = node.parent;
  const pivot = new THREE.Group();
  parent.add(pivot);
  parent.worldToLocal(topCenterWorld);
  pivot.position.copy(topCenterWorld);

  // offsetGroup mantendrá el contenido con la parte superior alineada al pivot
  const offsetGroup = new THREE.Group();
  pivot.add(offsetGroup);

  // Mover el node dentro del offsetGroup preservando transf. mundiales
  offsetGroup.attach(node);

  // Calcular la escala de mundo actual para convertir altura de mundo a espacio local del offset
  const worldScale = new THREE.Vector3();
  offsetGroup.getWorldScale(worldScale);
  const halfHeightLocal = (sizeWorld.y / (worldScale.y || 1)) / 2;

  // Desplazar contenido hacia abajo para que el borde superior coincida con el pivot
  offsetGroup.position.y -= halfHeightLocal;

  return { pivot, offsetGroup };
}

/**
 * Anima la escala vertical de un objeto
 * @param {THREE.Object3D} pivot - Objeto a animar
 * @param {number} objetivoEscalaY - Escala Y objetivo
 * @param {number} duracionMs - Duración de la animación en milisegundos
 * @param {Function} alFinalizar - Callback al finalizar la animación
 */
function animarEscalaY(pivot, objetivoEscalaY, duracionMs, alFinalizar) {
  if (!pivot) return;
  const inicio = performance.now();
  const escalaInicial = pivot.scale.y;
  function loop(t) {
    const p = Math.min(1, (t - inicio) / duracionMs);
    const valor = escalaInicial + (objetivoEscalaY - escalaInicial) * p;
    pivot.scale.y = valor;
    if (p < 1) requestAnimationFrame(loop); else if (alFinalizar) alFinalizar();
  }
  requestAnimationFrame(loop);
}

/**
 * Rota suavemente un objeto en el eje Y sin vibraciones
 * @param {THREE.Object3D} objeto - Objeto a rotar
 * @param {number} destinoY - Rotación Y objetivo en radianes
 * @param {Function} alFinalizar - Callback al finalizar la animación
 */
// rotarSuave importado desde src/animation.js

/**
 * Rota suavemente un objeto en el eje X (específico para puertas de garaje)
 * @param {THREE.Object3D} objeto - Objeto a rotar
 * @param {number} destinoRotacion - Rotación X objetivo en radianes
 * @param {Function} alFinalizar - Callback al finalizar la animación
 */
// rotarGarageSuave importado desde src/animation.js

// Gestión de luces movida a src/lightsUi.js

function findByAnyName(root, namesOrKeywords) {
  // Primero intento nombres exactos
  for (const n of namesOrKeywords) {
    const exact = root.getObjectByName(n);
    if (exact) return exact;
  }
  // Luego por coincidencia parcial (case-insensitive)
  const lowered = namesOrKeywords.map(n => n.toLowerCase());
  let result = null;
  root.traverse((child) => {
    if (result || !child.name) return;
    const nm = child.name.toLowerCase();
    if (lowered.some(k => nm.includes(k))) result = child;
  });
  return result;
}

function normalizeName(str) {
  return (str || "")
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}+/gu, '')
    .trim();
}

function findCurtain(root, candidates) {
  const lowered = candidates.map(c => normalizeName(c));
  let found = null;
  root.traverse((child) => {
    if (found || !child.name) return;
    const nm = normalizeName(child.name);
    if (lowered.some(k => nm === k || nm.includes(k) || nm.startsWith(k))) {
      found = child;
    }
  });
  return found;
}

function fallbackFindCurtainsByCylinderNames(root) {
  // Busca mallas con 'cilindro' o 'cylinder' y elige la más frontal y la más trasera por Z en mundo
  const candidates = [];
  root.traverse((child) => {
    if (!child.isMesh || !child.name) return;
    const nm = normalizeName(child.name);
    if (nm.includes('cilindro') || nm.includes('cylinder')) {
      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);
      candidates.push({ node: child, z: worldPos.z });
    }
  });
  if (candidates.length === 0) return { front: null, back: null };
  candidates.sort((a, b) => a.z - b.z);
  // Menor Z asumimos más cercano a cámara frontal según modelo habitual
  const front = candidates[0]?.node || null;
  const back = candidates[candidates.length - 1]?.node || null;
  return { front, back };
}

function logNamesContaining(root, keywords) {
  const lowered = keywords.map(k => normalizeName(k));
  console.warn("Nombres que coinciden con:", lowered.join(", "));
  root.traverse((child) => {
    if (!child.name) return;
    const nm = normalizeName(child.name);
    if (lowered.some(k => nm.includes(k))) console.warn("  -", child.name);
  });
}

// Utilidades de sombras
function setReceiveOnAll(root, receive) {
  root.traverse((child) => {
    if (child.isMesh) child.receiveShadow = receive;
  });
}
function setCastRecursively(obj, cast, receive) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      if (typeof receive === 'boolean') child.receiveShadow = receive;
    }
  });
}
function disableCastEverywhere(root) {
  root.traverse((child) => { if (child.isMesh) child.castShadow = false; });
}

// Utilidades de movimiento alternativo para cortina delantera
function testRotatePivotTop(meshNode) {
  const prep = prepareCurtainWithTopPivot(meshNode);
  const pivot = prep.pivot;
  const a0 = pivot.rotation.x;
  const a1 = a0 + Math.PI / 2;
  rotarGarageSuave(pivot, a1, () => rotarGarageSuave(pivot, a0));
}

function testScaleKeepTop(meshNode) {
  initCurtainAnchor(meshNode);
  animateCurtainScaleKeepTop(meshNode, 2.2, 300, () => animateCurtainScaleKeepTop(meshNode, 1.0, 300));
}

function testTranslateLocal(meshNode) {
  const startY = meshNode.position.y;
  const endY = startY - 1.0;
  const start = performance.now();
  function step(t) {
    const p = Math.min(1, (t - start) / 250);
    meshNode.position.y = startY + (endY - startY) * p;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function testTranslateWorld(meshNode) {
  const wp = new THREE.Vector3();
  meshNode.getWorldPosition(wp);
  const startY = wp.y;
  const endY = startY - 1.0;
  const start = performance.now();
  function step(t) {
    const p = Math.min(1, (t - start) / 250);
    const y = startY + (endY - startY) * p;
    meshNode.parent.worldToLocal(wp.set(wp.x, y, wp.z));
    meshNode.position.copy(wp);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function testMoveGeometry(meshNode) {
  // Clonar geometría para no afectar otras instancias y desplazar sus vértices en -Y
  const meshes = [];
  meshNode.traverse((c) => { if (c.isMesh) meshes.push(c); });
  meshes.forEach((m) => {
    const geom = m.geometry?.clone();
    if (!geom || !geom.attributes?.position) return;
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) - 0.2); // bajar 0.2 en espacio local de la geometría
    }
    pos.needsUpdate = true;
    m.geometry = geom;
  });
}

// Enganche de botones de prueba
const btnTest1 = document.getElementById('btnTestCortina1');
if (btnTest1) btnTest1.addEventListener('click', () => {
  const node = modelo?.getObjectByName('CortinaDelantera') || modelo?.getObjectByName('Cilindro.004');
  if (!node) return console.warn('No encontrado: CortinaDelantera/Cilindro.004');
  testRotatePivotTop(node);
});

const btnTest2 = document.getElementById('btnTestCortina2');
if (btnTest2) btnTest2.addEventListener('click', () => {
  const node = modelo?.getObjectByName('CortinaDelantera') || modelo?.getObjectByName('Cilindro.004');
  if (!node) return console.warn('No encontrado: CortinaDelantera/Cilindro.004');
  const mesh = node.isMesh ? node : (() => { let m=null; node.traverse(c=>{if(!m && c.isMesh) m=c;}); return m||node; })();
  testScaleKeepTop(mesh);
});

const btnTest3 = document.getElementById('btnTestCortina3');
if (btnTest3) btnTest3.addEventListener('click', () => {
  const node = modelo?.getObjectByName('CortinaDelantera') || modelo?.getObjectByName('Cilindro.004');
  if (!node) return console.warn('No encontrado: CortinaDelantera/Cilindro.004');
  testTranslateLocal(node);
});

const btnTest4 = document.getElementById('btnTestCortina4');
if (btnTest4) btnTest4.addEventListener('click', () => {
  const node = modelo?.getObjectByName('CortinaDelantera') || modelo?.getObjectByName('Cilindro.004');
  if (!node) return console.warn('No encontrado: CortinaDelantera/Cilindro.004');
  const mesh = node; // trabajar con el propio nodo; si es grupo, mover grupo
  testTranslateWorld(mesh);
});

const btnTest5 = document.getElementById('btnTestCortina5');
if (btnTest5) btnTest5.addEventListener('click', () => {
  const node = modelo?.getObjectByName('CortinaDelantera') || modelo?.getObjectByName('Cilindro.004');
  if (!node) return console.warn('No encontrado: CortinaDelantera/Cilindro.004');
  const mesh = node; // si es grupo, se aplicará a sus meshes hijas
  testMoveGeometry(mesh);
});

// --- Cortina EXTRA ---
let cortinaExtraPivot = null;
let cortinaExtraPanel = null;
let cortinaExtraMaxScaleY = 1;
let cortinaExtraCerrada = false;
let cortinaExtraInitialized = false;
let cortinaExtraOpenHeight = 0; // altura de apertura (baseline) para medir "cuánto baja"

function createCurtainExtraAt(worldTopCenter, width, maxHeight) {
  const sim = createCurtainPanelAt(worldTopCenter, width, maxHeight);
  cortinaExtraPivot = sim.pivot;
  cortinaExtraPanel = sim.panel;
  cortinaExtraMaxScaleY = sim.maxScaleY;
  return sim;
}

function spawnCurtainExtraNear(modelBox) {
  const center = modelBox.getCenter(new THREE.Vector3());
  const top = modelBox.max.y;
  const worldTopCenter = new THREE.Vector3(center.x + 0.2, top - 0.02, center.z); // un poco desplazada en X
  const dims = resolveCurtainDimensions(modelBox);
  createCurtainExtraAt(worldTopCenter, Math.min(1.2, dims.width * 0.5), Math.min(1.8, dims.height));
  // enableDragForPivot(cortinaExtraPivot); // Comentado: no necesitamos drag para cortina ancha trasera
  initCurtainExtraUI();
}

// --- Cortina EXTRA (duplicado real de la delantera) ---
let cortinaExtraNode = null;
let cortinaExtraOrigWidth = 1;
let cortinaExtraOrigHeight = 1;

function cloneMaterialsDeep(root) {
	root.traverse((child) => {
		if (!child.isMesh || !child.material) return;
		if (Array.isArray(child.material)) {
			child.material = child.material.map((m) => m?.clone ? m.clone() : m);
		} else if (child.material?.clone) {
			child.material = child.material.clone();
		}
	});
}

function duplicateFrontCurtain() {
	if (!cortinaDelantera || !cortinaDelantera.parent) return null;
	// Medir tamaño original de la delantera
	const bb = new THREE.Box3().setFromObject(cortinaDelantera);
	cortinaExtraOrigWidth = Math.max(0.001, bb.max.x - bb.min.x);
	cortinaExtraOrigHeight = Math.max(0.001, bb.max.y - bb.min.y);

	// Clonar profundamente
	const clone = cortinaDelantera.clone(true);
	cloneMaterialsDeep(clone);
	clone.name = (cortinaDelantera.name || 'CortinaDelantera') + '_Duplicada';
	// Insertar junto al original
	cortinaDelantera.parent.add(clone);
	// Ligerísimo offset para evitar z-fighting visual
	clone.position.z += 0.002;
	cortinaExtraNode = clone;
	return clone;
}

function syncExtraSlidersFromNode() {
	const x = document.getElementById('ce-pos-x');
	const y = document.getElementById('ce-pos-y');
	const z = document.getElementById('ce-pos-z');
	const w = document.getElementById('ce-width');
	const h = document.getElementById('ce-height');
	// Si no existen los sliders, simplemente no hacer nada (no romper la lógica)
	if (!cortinaExtraNode || !x || !y || !z || !w || !h) return;
	x.value = String(cortinaExtraNode.position.x.toFixed(3));
	y.value = String(cortinaExtraNode.position.y.toFixed(3));
	z.value = String(cortinaExtraNode.position.z.toFixed(3));
	// Medir tamaño actual para reflejar en sliders
	const bb = new THREE.Box3().setFromObject(cortinaExtraNode);
	const curW = Math.max(0.001, bb.max.x - bb.min.x);
	const curH = Math.max(0.001, bb.max.y - bb.min.y);
	w.value = String(curW.toFixed(3));
	h.value = String(curH.toFixed(3));
}

// Valores fijos de W/H para cortina extra
const CURTAIN_EXTRA_FIXED_W = 0.229;
const CURTAIN_EXTRA_FIXED_H = 0.050;

function updateCurtainExtraSizeLabel() {
	const label = document.getElementById('ce-size');
    const drop = document.getElementById('ce-drop');
	// Si no existe el label, simplemente no hacer nada (no romper la lógica)
	if (!label) return;
	let w = 0, h = CURTAIN_EXTRA_FIXED_H;
	if (cortinaExtraNode) {
		const bb = new THREE.Box3().setFromObject(cortinaExtraNode);
		w = Math.max(0, bb.max.x - bb.min.x);
	} else if (cortinaExtraPanel) {
		w = Math.max(0, cortinaExtraPanel.scale.x);
        h = Math.max(0, cortinaExtraPanel.scale.y);
	}
	label.textContent = `W: ${w.toFixed(3)}  H: ${h.toFixed(3)}`;
    // Mostrar cuánto baja: diferencia respecto a la apertura completa de la línea delantera
    if (drop) {
    const openH = (typeof cortinaDelanteraPanelMaxScaleY === 'number' && cortinaDelanteraPanelMaxScaleY > 0)
        ? cortinaDelanteraPanelMaxScaleY
        : (cortinaExtraMaxScaleY > 0 ? cortinaExtraMaxScaleY : h);
        const currentH = (cortinaExtraPanel ? Math.max(0, cortinaExtraPanel.scale.y) : h);
        const delta = Math.max(0, openH - currentH);
        const pct = openH > 0 ? Math.round((delta / openH) * 100) : 0;
        drop.textContent = `Baja: ${delta.toFixed(3)} (${pct}%)`;
    }
}

function initCurtainExtraUIForClone() {
    const btn = document.getElementById('btnCortinaExtra');
    // NO buscar sliders del DOM - usar valores fijos directamente
    if (!btn) return;

    // Inicializar estado (abierta/cerrada) según altura actual vs valor de cierre
    if (cortinaExtraPanel) {
        const openTargetInit = (typeof cortinaDelanteraPanelMaxScaleY === 'number' && cortinaDelanteraPanelMaxScaleY > 0)
            ? cortinaDelanteraPanelMaxScaleY
            : (cortinaExtraMaxScaleY > 0 ? cortinaExtraMaxScaleY : (cortinaExtraPanel.scale?.y || CURTAIN_EXTRA_FIXED_H));
        const closeTargetInit = Math.max(0.001, CURTAIN_EXTRA_FIXED_H);
        // Considerar cerrada si está en o por debajo del cierre
        cortinaExtraCerrada = (cortinaExtraPanel.scale.y <= closeTargetInit + 1e-4);
        updateCurtainExtraBtnVisual();
    }

	

	btn.addEventListener('click', () => {
		if (cortinaExtraNode) {
			// Si estamos clonando la malla, el botón alterna visibilidad (no escala)
			cortinaExtraNode.visible = !cortinaExtraNode.visible;
			updateBtn();
			return;
		}
        // Si es panel rojo, el botón cierra/abre escalando en Y desde el borde superior
		if (!cortinaExtraPanel) return;
        const openTarget = (typeof cortinaDelanteraPanelMaxScaleY === 'number' && cortinaDelanteraPanelMaxScaleY > 0)
            ? cortinaDelanteraPanelMaxScaleY
            : (cortinaExtraMaxScaleY > 0 ? cortinaExtraMaxScaleY : (cortinaExtraPanel.scale?.y || CURTAIN_EXTRA_FIXED_H));
        const closeTarget = Math.max(0.001, CURTAIN_EXTRA_FIXED_H);
    const objetivo = cortinaExtraCerrada ? openTarget : closeTarget;
    animatePanel(cortinaExtraPanel, objetivo, 350, () => {
      cortinaExtraCerrada = !cortinaExtraCerrada;
      updateCurtainExtraBtnVisual();
    });
	});

    // Bloquear en valores solicitados por el usuario (solo coord. y ancho)
    const LOCK_W = 0.569;
    const LOCK_X = -0.188;
    const LOCK_Y = 0.660;
    const LOCK_Z = 0.107;

    // Aplicar a escena
    if (cortinaExtraNode) {
        cortinaExtraNode.position.set(LOCK_X, LOCK_Y, LOCK_Z);
        // Ajustar ancho manteniendo altura visual
        const bb0 = new THREE.Box3().setFromObject(cortinaExtraNode);
        const baseW = Math.max(0.001, bb0.max.x - bb0.min.x);
        const sx = LOCK_W / baseW;
        cortinaExtraNode.scale.x *= sx;
    } else if (cortinaExtraPivot && cortinaExtraPanel) {
        cortinaExtraPivot.position.set(LOCK_X, LOCK_Y, LOCK_Z);
        cortinaExtraPanel.scale.x = LOCK_W;
        cortinaExtraPanel.position.y = -cortinaExtraPanel.scale.y / 2;
    }

	updateCurtainExtraSizeLabel();
}
// ...existing code...

function updateCurtainExtraBtnVisual() {
  const btn = document.getElementById('btnCortinaExtra');
  if (!btn) return;
  if (cortinaExtraCerrada) {
    btn.classList.remove('curtains');
    btn.classList.add('curtains-closed');
  } else {
    btn.classList.remove('curtains-closed');
    btn.classList.add('curtains');
  }
}

// Forzar posición inicial exacta de la cortina extra
function setCurtainExtraInitialPosition() {
	const x = document.getElementById('ce-pos-x');
	const y = document.getElementById('ce-pos-y');
	const z = document.getElementById('ce-pos-z');
	const w = document.getElementById('ce-width');
	// Si no existen los sliders, simplemente no hacer nada (no romper la lógica)
	if (!x || !y || !z || !w) return;
	x.value = '-0.710';
	y.value = '0.585';
	z.value = '0.098';
	w.value = '0.229';
	// Aplicar a escena
	if (cortinaExtraNode) {
		cortinaExtraNode.position.set(-0.710, 0.585, 0.098);
		const bb0 = new THREE.Box3().setFromObject(cortinaExtraNode);
		const baseW = Math.max(0.001, bb0.max.x - bb0.min.x);
		const sx = 0.229 / baseW;
		cortinaExtraNode.scale.x *= sx;
	} else if (cortinaExtraPivot && cortinaExtraPanel) {
		cortinaExtraPivot.position.set(-0.710, 0.585, 0.098);
		cortinaExtraPanel.scale.x = 0.229;
		cortinaExtraPanel.scale.y = CURTAIN_EXTRA_FIXED_H;
		cortinaExtraPanel.position.y = -cortinaExtraPanel.scale.y / 2;
	}
	updateCurtainExtraSizeLabel();
}

// Sincronizar sliders al terminar drag si el objetivo es la cortina extra
(function augmentDragSync() {
	const origPointerUp = enableDragForPivot;
	// No reemplazamos la función, aprovechamos el handler existente añadiendo un pequeño hook tras updateHUD
	// Añadimos un listener global al canvas para hacer sync al soltar, si el target fue la cortina extra
	renderer?.domElement?.addEventListener('pointerup', () => {
		if (dragState && dragState.target === cortinaExtraNode) {
			syncExtraSlidersFromNode();
		}
	});
})();

function clonePivotWithMaterials(pivot) {
	if (!pivot) return null;
	const clone = pivot.clone(true);
	// Clonar materiales de todos los meshes dentro del pivot
	clone.traverse((child) => {
		if (!child.isMesh || !child.material) return;
		if (Array.isArray(child.material)) {
			child.material = child.material.map((m) => (m && m.clone ? m.clone() : m));
		} else if (child.material.clone) {
			child.material = child.material.clone();
		}
	});
    // Agregar al MISMO padre para preservar el mismo espacio local
    const parent = pivot.parent || scene;
    parent.add(clone);
    // Copiar transform local 1:1 para que las escalas numéricas coincidan
    clone.position.copy(pivot.position);
    clone.rotation.copy(pivot.rotation);
    clone.scale.copy(pivot.scale);
	return clone;
}

// Cargar modelo
const loader = new GLTFLoader();
loader.load('assets/modelo_final.glb', (gltf) => {
  modelo = gltf.scene;

  const box = new THREE.Box3().setFromObject(modelo);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 10) modelo.scale.setScalar(5 / maxDim);

  const center = box.getCenter(new THREE.Vector3());
  camera.position.set(center.x, center.y + 1, center.z + 1.94);
  camera.lookAt(center);
  scene.add(modelo);

  // Centrar el target de la luz al modelo y ajustar cámara de sombras al tamaño del modelo para más detalle
  const modelBox = new THREE.Box3().setFromObject(modelo);
  const modelCenter = modelBox.getCenter(new THREE.Vector3());
  const modelSize = modelBox.getSize(new THREE.Vector3());
  mainLight.target.position.copy(modelCenter);
  scene.add(mainLight.target);
  const extent = Math.max(modelSize.x, modelSize.z) * 0.6 + 4;
  mainLight.shadow.camera.left = -extent;
  mainLight.shadow.camera.right = extent;
  mainLight.shadow.camera.top = extent;
  mainLight.shadow.camera.bottom = -extent;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = modelSize.y + 30;

  // Recolectar mallas rojas para depuración
  redDebugMeshes = collectRedMeshes(modelo);
  console.log(`🔴 Mallas rojas detectadas (${redDebugMeshes.length}):`, redDebugMeshes.map(m => m.name));

  // Crear paneles con tamaño basado en configuración
  const dims = resolveCurtainDimensions(modelBox);
  const baseWidth = dims.width;
  const refHeight = dims.height;

  // Delantera
  if (cortinaDelantera) {
    const bb = new THREE.Box3().setFromObject(cortinaDelantera);
    const topCenter = bb.getCenter(new THREE.Vector3()); topCenter.y = bb.max.y;
    const sim = createCurtainPanelAt(topCenter, baseWidth * (curtainConfig.panelWidthScaleFront || 1), refHeight);
    cortinaDelanteraPanelPivot = sim.pivot;
    cortinaDelanteraPanel = sim.panel;
    cortinaDelanteraPanelMaxScaleY = sim.maxScaleY;
  } else {
    const topCenter = new THREE.Vector3(modelCenter.x, modelBox.max.y - 0.01, modelBox.max.z - 0.01);
    const sim = createCurtainPanelAt(topCenter, baseWidth * (curtainConfig.panelWidthScaleFront || 1), refHeight);
    cortinaDelanteraPanelPivot = sim.pivot;
    cortinaDelanteraPanel = sim.panel;
    cortinaDelanteraPanelMaxScaleY = sim.maxScaleY;
  }

  // Posición fija proporcionada por el usuario para la cortina delantera
  if (cortinaDelanteraPanelPivot) {
    cortinaDelanteraPanelPivot.position.set(-0.715, REAR_LOCKED_Y, 1.049);

    // Clonar el pivot completo (incluye el panel) para que coincida 1:1
    const clonedPivot = clonePivotWithMaterials(cortinaDelanteraPanelPivot);
    if (clonedPivot) {
      cortinaExtraPivot = clonedPivot;
      let panelClone = null;
      clonedPivot.traverse((c) => { if (!panelClone && c.isMesh) panelClone = c; });
      cortinaExtraPanel = panelClone;
      clonedPivot.position.z += 0.002;
      cortinaExtraMaxScaleY = cortinaDelanteraPanelMaxScaleY;
      // No tocar scale.y para que herede exactamente la misma altura y anclaje que la "LÍNEA delantera"
      // enableDragForPivot(cortinaExtraPivot); // Comentado: no necesitamos drag para cortina ancha trasera
      // UI compatible con panel (usa solo X/Y/Z y Ancho)
      initCurtainExtraUIForClone();
      console.log('✅ Cortina extra: clon 1:1 de la delantera');
    }
  }

  // Trasera
  if (cortinaTrasera) {
    const bb = new THREE.Box3().setFromObject(cortinaTrasera);
    const topCenter = bb.getCenter(new THREE.Vector3()); topCenter.y = bb.max.y;
    const sim = createCurtainPanelAt(topCenter, baseWidth * (curtainConfig.panelWidthScaleRear || 1), refHeight);
    cortinaTraseraPanelPivot = sim.pivot;
    cortinaTraseraPanel = sim.panel;
    cortinaTraseraPanelMaxScaleY = sim.maxScaleY;
  } else {
    const topCenter = new THREE.Vector3(modelCenter.x, modelBox.max.y - 0.01, modelBox.min.z + 0.01);
    const sim = createCurtainPanelAt(topCenter, baseWidth * (curtainConfig.panelWidthScaleRear || 1), refHeight);
    cortinaTraseraPanelPivot = sim.pivot;
    cortinaTraseraPanel = sim.panel;
    cortinaTraseraPanelMaxScaleY = sim.maxScaleY;
  }
  // Fijar X/Z bloqueados para trasera
  if (cortinaTraseraPanelPivot) {
    cortinaTraseraPanelPivot.position.x = REAR_LOCKED_X;
    cortinaTraseraPanelPivot.position.z = REAR_LOCKED_Z;
    cortinaTraseraPanelPivot.position.y = REAR_LOCKED_Y;
  }

  // Habilitar arrastre de ambos pivots
  // Bloquear delantera: no habilitamos drag para el pivot delantero
  // enableDragForPivot(cortinaDelanteraPanelPivot);
  // También desactivamos el arrastre de la trasera
  // enableDragForPivot(cortinaTraseraPanelPivot);

  // Utilidad: buscar por coincidencia parcial de nombre (case-insensitive)
  const findObjectByNameIncludes = (root, keywords) => {
    let result = null;
    const lowered = keywords.map(k => k.toLowerCase());
    root.traverse((child) => {
      if (result || !child.name) return;
      const name = child.name.toLowerCase();
      for (const kw of lowered) {
        if (name.includes(kw)) {
          result = child;
          break;
        }
      }
    });
    return result;
  };

  // Buscar el piso específicamente
  floorObject = modelo.getObjectByName("Cube.002");
  if (floorObject) {
    console.log("✅ Piso encontrado:", floorObject.name);
    if (floorObject.material) {
      floorObject.material.color.setHex(0x00ff00);
      floorObject.material.emissive.setHex(0x000000);
      floorObject.material.emissiveIntensity = 0;
      floorObject.material.metalness = 0.0;
      floorObject.material.roughness = 1.0;
    }
  } else {
    console.warn("❗ No se encontró el piso (Cube.002)");
  }

  // Renombrar cortinas en tiempo de carga para referencias más claras
  const renameCurtainNode = (oldName, newName) => {
    const node = modelo.getObjectByName(oldName);
    if (!node) return null;
    node.name = newName;
    // También renombrar el primer mesh descendiente para depurar mejor
    let meshChild = null;
    node.traverse((c) => { if (!meshChild && c.isMesh) meshChild = c; });
    if (meshChild) meshChild.name = `${newName}_Mesh`;
    console.log(`🔁 Renombrado '${oldName}' → '${newName}'`);
    return node;
  };
  renameCurtainNode('Cilindro.004', 'CortinaDelantera');
  renameCurtainNode('Cilindro.015', 'CortinaTrasera');

  // Buscar objetos por coincidencia parcial de nombre
  puerta =
    findObjectByNameIncludes(modelo, [
      "puerta principal",
      "puerta_principal",
      "puerta",
      "door",
      "main door",
      "front door"
    ]) || null;

  // Nuevo: Portón delantero
  portonDelantero =
    findObjectByNameIncludes(modelo, [
      "porton delantero",
      "portón delantero",
      "porton_delantero",
      "puerta delantera",
      "front gate",
      "front garage door",
      "delantero"
    ]) || null;

  // Nuevo: Portón trasero
  portonTrasero =
    findObjectByNameIncludes(modelo, [
      "porton trasero",
      "portón trasero",
      "porton_trasero",
      "puerta trasera",
      "back gate",
      "rear gate",
      "trasero"
    ]) || null;

  // Configurar pivots y rotaciones para los portones
  if (portonDelantero) {
    console.log("✅ Portón delantero encontrado:", portonDelantero.name);
    // Crear pivot para el portón delantero
    const parentDelantero = portonDelantero.parent;
    portonDelanteroPivot = new THREE.Group();
    parentDelantero.add(portonDelanteroPivot);
    
    // Posicionar pivot en la parte superior del portón
    const bboxDelantero = new THREE.Box3().setFromObject(portonDelantero);
    const centerDelantero = bboxDelantero.getCenter(new THREE.Vector3());
    const topCenterDelantero = new THREE.Vector3(centerDelantero.x, bboxDelantero.max.y, centerDelantero.z);
    parentDelantero.worldToLocal(topCenterDelantero);
    portonDelanteroPivot.position.copy(topCenterDelantero);
    
    // Mover el portón al pivot
    portonDelanteroPivot.attach(portonDelantero);
    
    // Configurar rotaciones
    portonDelanteroPivot.rotacionCerradaX = portonDelanteroPivot.rotation.x;
    portonDelanteroPivot.rotacionAbiertaX = portonDelanteroPivot.rotation.x - Math.PI / 2;
    portonDelanteroAbierto = false;
    
    console.log("✅ Pivot delantero configurado");
  }

  if (portonTrasero) {
    console.log("✅ Portón trasero encontrado:", portonTrasero.name);
    // Crear pivot para el portón trasero
    const parentTrasero = portonTrasero.parent;
    portonTraseroPivot = new THREE.Group();
    parentTrasero.add(portonTraseroPivot);
    
    // Posicionar pivot en la parte superior del portón
    const bboxTrasero = new THREE.Box3().setFromObject(portonTrasero);
    const centerTrasero = bboxTrasero.getCenter(new THREE.Vector3());
    const topCenterTrasero = new THREE.Vector3(centerTrasero.x, bboxTrasero.max.y, centerTrasero.z);
    parentTrasero.worldToLocal(topCenterTrasero);
    portonTraseroPivot.position.copy(topCenterTrasero);
    
    // Mover el portón al pivot
    portonTraseroPivot.attach(portonTrasero);
    
    // Configurar rotaciones (hacia afuera, dirección opuesta al delantero)
    portonTraseroPivot.rotacionCerradaX = portonTraseroPivot.rotation.x;
    portonTraseroPivot.rotacionAbiertaX = portonTraseroPivot.rotation.x + Math.PI / 2;
    portonTraseroAbierto = false;
    
    console.log("✅ Pivot trasero configurado");
  }



  // Configurar botón principal para la puerta principal (ya no toma el portón)
  puertaControl = puerta || null;
  if (!puertaControl) {
    console.warn("❗ No se encontró la puerta principal. Nombres disponibles:");
    modelo.traverse((child) => { if (child.isMesh) console.log("  -", child.name); });
  } else {
    // Guardar rotaciones de referencia en Y
    puertaControl.rotacionCerradaY = puertaControl.rotation.y;
    puertaControl.rotacionAbiertaY = puertaControl.rotation.y + Math.PI / 2;
    puertaControlAbierta = false;
    console.log("✅ Puerta principal:", puertaControl.name);

    // Actualizar texto del botón principal
    const btnPuertaEl = document.getElementById("btnPuerta");
    if (btnPuertaEl) setButtonLabel(btnPuertaEl, "Puerta 1");
  }

  // Configurar puertas interiores
  // Buscar dentro de Collection 1
  const collection1 = modelo.getObjectByName('Collection 1');
  if (collection1) {
    console.log("✅ Collection 1 encontrada, buscando puertas interiores...");
    
    // Buscar puerta_cuarto (primera puerta interior)
    puertaInterior1 = collection1.getObjectByName('puerta_cuarto');
    if (puertaInterior1) {
      puertaInterior1.rotacionCerradaY = puertaInterior1.rotation.y;
      puertaInterior1.rotacionAbiertaY = puertaInterior1.rotation.y + Math.PI / 2;
      puertaInterior1Abierta = false;
      console.log("✅ Puerta interior 1 encontrada:", puertaInterior1.name);
    } else {
      console.warn("❗ No se encontró la puerta interior 1 (puerta_cuarto)");
    }

    // Buscar puerta_baño (segunda puerta interior)
    puertaInterior2 = collection1.getObjectByName('puerta_baño');
    if (puertaInterior2) {
      puertaInterior2.rotacionCerradaY = puertaInterior2.rotation.y;
      puertaInterior2.rotacionAbiertaY = puertaInterior2.rotation.y + Math.PI / 2;
      puertaInterior2Abierta = false;
      console.log("✅ Puerta interior 2 encontrada:", puertaInterior2.name);
    } else {
      console.warn("❗ No se encontró la puerta interior 2 (puerta_baño)");
    }
  } else {
    console.warn("❗ No se encontró Collection 1, buscando puertas en el modelo raíz...");
    
    // Fallback: buscar en el modelo raíz
    puertaInterior1 = modelo.getObjectByName('puerta_cuarto');
    if (puertaInterior1) {
      puertaInterior1.rotacionCerradaY = puertaInterior1.rotation.y;
      puertaInterior1.rotacionAbiertaY = puertaInterior1.rotation.y + Math.PI / 2;
      puertaInterior1Abierta = false;
      console.log("✅ Puerta interior 1 encontrada en modelo raíz:", puertaInterior1.name);
    } else {
      console.warn("❗ No se encontró la puerta interior 1 (puerta_cuarto)");
    }

    puertaInterior2 = modelo.getObjectByName('puerta_baño');
    if (puertaInterior2) {
      puertaInterior2.rotacionCerradaY = puertaInterior2.rotation.y;
      puertaInterior2.rotacionAbiertaY = puertaInterior2.rotation.y + Math.PI / 2;
      puertaInterior2Abierta = false;
      console.log("✅ Puerta interior 2 encontrada en modelo raíz:", puertaInterior2.name);
    } else {
      console.warn("❗ No se encontró la puerta interior 2 (puerta_baño)");
    }
  }

  // Búsqueda adicional usando traverse como respaldo
  console.log("🔍 Búsqueda adicional con traverse...");
  let puertaCuartoEncontrada = null;
  let puertaBañoEncontrada = null;
  
  modelo.traverse((child) => {
    if (child.name === 'puerta_cuarto') {
      puertaCuartoEncontrada = child;
      console.log("✅ Encontrada puerta_cuarto en:", child.parent ? child.parent.name : "raíz");
    }
    if (child.name === 'puerta_baño') {
      puertaBañoEncontrada = child;
      console.log("✅ Encontrada puerta_baño en:", child.parent ? child.parent.name : "raíz");
    }
    // Debug: mostrar todas las puertas encontradas
    if (child.name && child.name.toLowerCase().includes('puerta')) {
      console.log("🔍 Puerta encontrada:", child.name, "en:", child.parent ? child.parent.name : "raíz");
    }
  });
  
  // Usar las puertas encontradas por traverse si no se encontraron por otros métodos
  if (!puertaInterior1 && puertaCuartoEncontrada) {
    puertaInterior1 = puertaCuartoEncontrada;
    puertaInterior1.rotacionCerradaY = puertaInterior1.rotation.y;
    puertaInterior1.rotacionAbiertaY = puertaInterior1.rotation.y + Math.PI / 2;
    puertaInterior1Abierta = false;
    console.log("✅ Puerta interior 1 asignada desde traverse:", puertaInterior1.name);
  }
  
  if (!puertaInterior2 && puertaBañoEncontrada) {
    puertaInterior2 = puertaBañoEncontrada;
    puertaInterior2.rotacionCerradaY = puertaInterior2.rotation.y;
    puertaInterior2.rotacionAbiertaY = puertaInterior2.rotation.y + Math.PI / 2;
    puertaInterior2Abierta = false;
    console.log("✅ Puerta interior 2 asignada desde traverse:", puertaInterior2.name);
  }

  if (garage) {
    garage.rotacionCerrada = garage.rotation.x;
    garage.rotacionAbierta = garage.rotation.x + Math.PI / 2;
    garageAbierto = false;
    console.log("✅ Garaje encontrado:", garage.name);
  } else {
    console.warn("❗ No se encontró el garaje. Nombres disponibles:");
    modelo.traverse((child) => { if (child.isMesh) console.log("  -", child.name); });
  }

  // Materiales mate para todo el modelo (excepto el piso, que ya es verde mate)
  modelo.traverse((child) => {
    if (child.isMesh) {
      child.material.metalness = 0.0;
      child.material.roughness = 0.9;
      child.material.emissive.setHex(0x000000);
      child.material.emissiveIntensity = 0;
      // Por defecto: solo reciben sombra
      child.castShadow = false;
      child.receiveShadow = true;
    }
  });

  // Activar proyección de sombra SOLO en puerta y portones
  disableCastEverywhere(modelo);
  setReceiveOnAll(modelo, true);
  setCastRecursively(puertaControl, true, true);
  // Buscar puertas interiores en Collection 1 para sombras
  const collection1ForShadows = modelo.getObjectByName('Collection 1');
  if (collection1ForShadows) {
    const puerta1ForShadows = collection1ForShadows.getObjectByName('puerta_cuarto');
    const puerta2ForShadows = collection1ForShadows.getObjectByName('puerta_baño');
    setCastRecursively(puerta1ForShadows, true, true);
    setCastRecursively(puerta2ForShadows, true, true);
  }
  setCastRecursively(puertaInterior1, true, true);
  setCastRecursively(puertaInterior2, true, true);
  setCastRecursively(portonDelanteroPivot || portonDelantero, true, true);
  setCastRecursively(portonTraseroPivot || portonTrasero, true, true);
  if (floorObject) floorObject.receiveShadow = true;

  // Configurar botones de luces basados en los objetos del modelo
  setupLightButtons(modelo);

  // Buscar cortinas por nombre EXACTO y asegurar que sean mallas
  const getMeshOrFirstChildMesh = (obj) => {
    if (!obj) return null;
    if (obj.isMesh) return obj;
    let mesh = null;
    obj.traverse((c) => { if (!mesh && c.isMesh) mesh = c; });
    return mesh || obj; // devolver el objeto si no hay mesh directo
  };

  const nodeDelantera = modelo.getObjectByName('CortinaDelantera') || modelo.getObjectByName('Cilindro.004');
  const nodeTrasera   = modelo.getObjectByName('CortinaTrasera')   || modelo.getObjectByName('Cilindro.015');
  cortinaDelantera = getMeshOrFirstChildMesh(nodeDelantera);
  cortinaTrasera   = getMeshOrFirstChildMesh(nodeTrasera);

  if (cortinaDelantera) {
    // Crear panel rojo simulador
    const sim = createCurtainPanelFor(cortinaDelantera);
    cortinaDelanteraPanelPivot = sim.pivot;
    cortinaDelanteraPanel = sim.panel;
    cortinaDelanteraPanelMaxScaleY = sim.maxScaleY;
    console.log('✅ Cortina delantera:', cortinaDelantera.name);
  } else {
    console.warn('❗ No se encontró la cortina delantera (CortinaDelantera/Cilindro.004). Usando ubicación heurística.');
    // const sim = createHeuristicCurtainPanel(modelBox, 'front');
    // cortinaDelanteraPanelPivot = sim.pivot;
    // cortinaDelanteraPanel = sim.panel;
    // cortinaDelanteraPanelMaxScaleY = sim.maxScaleY;
  }
  if (cortinaTrasera) {
    const sim = createCurtainPanelFor(cortinaTrasera);
    cortinaTraseraPanelPivot = sim.pivot;
    cortinaTraseraPanel = sim.panel;
    cortinaTraseraPanelMaxScaleY = sim.maxScaleY;
    console.log('✅ Cortina trasera:', cortinaTrasera.name);
  } else {
    console.warn('❗ No se encontró la cortina trasera (CortinaTrasera/Cilindro.015). Usando ubicación heurística.');
    // const sim = createHeuristicCurtainPanel(modelBox, 'back');
    // cortinaTraseraPanelPivot = sim.pivot;
    // cortinaTraseraPanel = sim.panel;
    // cortinaTraseraPanelMaxScaleY = sim.maxScaleY;
  }

  // Actualizar labels con el nombre real si existe
  const btnCortinaDelanteraEl = document.getElementById('btnCortinaDelantera');
  if (btnCortinaDelanteraEl && cortinaDelantera) {
  setButtonLabel(btnCortinaDelanteraEl, `${cortinaDelantera.name}`);
  }
  const btnCortinaTraseraEl = document.getElementById('btnCortinaTrasera');
  if (btnCortinaTraseraEl && cortinaTrasera) {
  setButtonLabel(btnCortinaTraseraEl, `${cortinaTrasera.name}`);
  }

  // Si no hay cortina delantera, intentar encontrar una tercera directamente
  if (!cortinaDelantera) {
    // Fallback a heurística previa si no hay cortina delantera
    const nodeExtra = findCurtain(modelo, [
      'CortinaExtra', 'CortinaTercera', 'Cortina3', 'Cortina Central', 'Cortina Media',
      'cortina extra', 'cortina tercera', 'cortina 3', 'central', 'media'
    ]);
    if (nodeExtra) {
      const bb = new THREE.Box3().setFromObject(nodeExtra);
      const topCenter = bb.getCenter(new THREE.Vector3()); topCenter.y = bb.max.y;
      const dims = resolveCurtainDimensions(modelBox);
      createCurtainExtraAt(topCenter, Math.min(1.2, dims.width * 0.6), Math.min(1.8, dims.height));
      // enableDragForPivot(cortinaExtraPivot); // Comentado: no necesitamos drag para cortina 
      initCurtainExtraUI();
      console.log('✅ Cortina extra detectada:', nodeExtra.name);
    } else {
      // spawnCurtainExtraNear(modelBox);
      console.warn('ℹ️ No se encontró cortina delantera ni tercera; se omitió la creación de línea extra.');
    }
  }

  // Listar todos los nombres de objetos para debug
  console.log("🔍 Todos los objetos en el modelo:");
  modelo.traverse((child) => {
    if (child.name) {
      console.log("  -", child.name, "(tipo:", child.type + ")");
    }
  });

  // Debug específico para Collection 1 y puertas
  console.log("🔍 Debug específico para puertas interiores:");
  const debugCollection1 = modelo.getObjectByName('Collection 1');
  console.log("  - Collection 1 encontrada:", !!debugCollection1);
  if (debugCollection1) {
    console.log("  - Collection 1 nombre:", debugCollection1.name);
    console.log("  - Collection 1 tipo:", debugCollection1.type);
    console.log("  - Collection 1 hijos:", debugCollection1.children.length);
    debugCollection1.children.forEach((child, index) => {
      console.log("    - Hijo", index, ":", child.name, "(tipo:", child.type + ")");
    });
    
    const debugPuerta1 = debugCollection1.getObjectByName('puerta_cuarto');
    const debugPuerta2 = debugCollection1.getObjectByName('puerta_baño');
    console.log("  - puerta_cuarto encontrada:", !!debugPuerta1);
    console.log("  - puerta_baño encontrada:", !!debugPuerta2);
  }

  // Verificación final y debug
  console.log("🔍 Verificación final de puertas interiores:");
  console.log("  - puertaInterior1:", puertaInterior1 ? puertaInterior1.name : "null");
  console.log("  - puertaInterior2:", puertaInterior2 ? puertaInterior2.name : "null");
  console.log("  - puertaInterior1Abierta:", puertaInterior1Abierta);
  console.log("  - puertaInterior2Abierta:", puertaInterior2Abierta);
  
  // Debug adicional para verificar propiedades de rotación
  if (puertaInterior1) {
    console.log("🔍 puertaInterior1 propiedades:");
    console.log("  - rotacionCerradaY:", puertaInterior1.rotacionCerradaY);
    console.log("  - rotacionAbiertaY:", puertaInterior1.rotacionAbiertaY);
    console.log("  - rotation.y actual:", puertaInterior1.rotation.y);
  }
  if (puertaInterior2) {
    console.log("🔍 puertaInterior2 propiedades:");
    console.log("  - rotacionCerradaY:", puertaInterior2.rotacionCerradaY);
    console.log("  - rotacionAbiertaY:", puertaInterior2.rotacionAbiertaY);
    console.log("  - rotation.y actual:", puertaInterior2.rotation.y);
  }

  // Configurar event listeners de puertas interiores DESPUÉS de cargar el modelo
  const btnPuertaCuarto = document.getElementById("btnPuertaCuarto");
  if (btnPuertaCuarto) {
    const config = buttonConfig.puertaCuarto;
    if (puertaInterior1) {
      // Establecer el texto fijo una sola vez
      setButtonLabel(btnPuertaCuarto, config.texto);
      btnPuertaCuarto.classList.add(puertaInterior1Abierta ? config.icono2 : config.icono1); // Icono inicial
      btnPuertaCuarto.disabled = false;
      btnPuertaCuarto.style.opacity = "1";
      btnPuertaCuarto.addEventListener("click", () => {
        if (!puertaInterior1 || animacionActiva) return;
        const destino = puertaInterior1Abierta ? puertaInterior1.rotacionCerradaY : puertaInterior1.rotacionAbiertaY;
        rotarSuave(puertaInterior1, destino, () => {
          puertaInterior1Abierta = !puertaInterior1Abierta;
          // Solo actualizar el icono
          btnPuertaCuarto.classList.remove(config.icono1, config.icono2);
          btnPuertaCuarto.classList.add(puertaInterior1Abierta ? config.icono2 : config.icono1);
        });
      });
      console.log("✔ Event listener configurado para puerta cuarto");
    } else {
      setButtonLabel(btnPuertaCuarto, "Puerta cuarto no encontrada");
      btnPuertaCuarto.disabled = true;
      btnPuertaCuarto.style.opacity = "0.5";
    }
  }

  const btnPuertaBaño = document.getElementById("btnPuertaBaño");
  if (btnPuertaBaño) {
    const config = buttonConfig.puertaBaño;
    if (puertaInterior2) {
      // Establecer el texto fijo una sola vez
      setButtonLabel(btnPuertaBaño, config.texto);
      btnPuertaBaño.classList.add(puertaInterior2Abierta ? config.icono2 : config.icono1); // Icono inicial
      btnPuertaBaño.disabled = false;
      btnPuertaBaño.style.opacity = "1";
      btnPuertaBaño.addEventListener("click", () => {
        if (!puertaInterior2 || animacionActiva) return;
        const destino = puertaInterior2Abierta ? puertaInterior2.rotacionCerradaY : puertaInterior2.rotacionAbiertaY;
        rotarSuave(puertaInterior2, destino, () => {
          puertaInterior2Abierta = !puertaInterior2Abierta;
          // Solo actualizar el icono
          btnPuertaBaño.classList.remove(config.icono1, config.icono2);
          btnPuertaBaño.classList.add(puertaInterior2Abierta ? config.icono2 : config.icono1);
        });
      });
    }
  }


}, undefined, (error) => {
  console.error("❌ Error al cargar el modelo:", error);
});

// Botón de puerta con toggle sincronizado (solo puerta principal)
const btnPuerta = document.getElementById("btnPuerta");
if (btnPuerta) {
  const config = buttonConfig.puertaPrincipal;
  // Establecer el texto fijo una sola vez
  setButtonLabel(btnPuerta, config.texto);
  // Actualizar el icono según el estado inicial
  btnPuerta.classList.add(puertaControlAbierta ? config.icono2 : config.icono1);
  
  btnPuerta.addEventListener("click", () => {
    if (!puertaControl || animacionActiva) return;

    let destino = puertaControlAbierta ? puertaControl.rotacionCerradaY : puertaControl.rotacionAbiertaY;

    rotarSuave(puertaControl, destino, () => {
      puertaControlAbierta = !puertaControlAbierta;
      // Actualizar solo el icono
      btnPuerta.classList.remove(config.icono1, config.icono2);
      btnPuerta.classList.add(puertaControlAbierta ? config.icono2 : config.icono1);
    });
  });
}

// Los event listeners de puertas interiores se configurarán después de cargar el modelo

// Botón de portón delantero (usa pivot para rotar desde la parte de arriba)
const btnPortonDelantero = document.getElementById("btnPortonDelantero");
if (btnPortonDelantero) {
  const config = buttonConfig.portonDelantero;
  if (portonDelantero) {
    setButtonLabel(btnPortonDelantero, config.texto1);
    btnPortonDelantero.classList.add(config.icono1); // Icono inicial
  }
  btnPortonDelantero.addEventListener("click", () => {
    if (!portonDelanteroPivot || animacionActiva) return;
    const destino = portonDelanteroAbierto ? portonDelanteroPivot.rotacionCerradaX : portonDelanteroPivot.rotacionAbiertaX;
    rotarGarageSuave(portonDelanteroPivot, destino, () => {
      portonDelanteroAbierto = !portonDelanteroAbierto;
      const isAbrir = !portonDelanteroAbierto;
      // Mantener el texto fijo
      btnPortonDelantero.classList.remove(config.icono1, config.icono2);
      btnPortonDelantero.classList.add(isAbrir ? config.icono1 : config.icono2);
    });
  });
}

// Botón de portón trasero (usa pivot para rotar desde la parte de arriba)
const btnPortonTrasero = document.getElementById("btnPortonTrasero");
if (btnPortonTrasero) {
  const config = buttonConfig.portonTrasero;
  if (portonTrasero) {
    // Establecer el texto fijo una sola vez
    setButtonLabel(btnPortonTrasero, config.texto);
    // Actualizar el icono según el estado inicial
    btnPortonTrasero.classList.add(portonTraseroAbierto ? config.icono2 : config.icono1);
  }
  btnPortonTrasero.addEventListener("click", () => {
    if (!portonTraseroPivot || animacionActiva) return;
    const destino = portonTraseroAbierto ? portonTraseroPivot.rotacionCerradaX : portonTraseroPivot.rotacionAbiertaX;
    rotarGarageSuave(portonTraseroPivot, destino, () => {
      portonTraseroAbierto = !portonTraseroAbierto;
      // Solo actualizar el icono
      btnPortonTrasero.classList.remove(config.icono1, config.icono2);
      btnPortonTrasero.classList.add(portonTraseroAbierto ? config.icono2 : config.icono1);
    });
  });
}

// Controles de cortinas (toggle cerrar/abrir)
const btnCortinaDelantera = document.getElementById('btnCortinaDelantera');
if (btnCortinaDelantera) {
  const config = buttonConfig.cortinaDelantera;
  // Establecer el texto fijo una sola vez
  setButtonLabel(btnCortinaDelantera, config.texto);
  // Actualizar solo el icono según el estado
  const updateIcon = () => {
    btnCortinaDelantera.classList.remove(config.icono1, config.icono2);
    btnCortinaDelantera.classList.add(cortinaDelanteraCerrada ? config.icono1 : config.icono2);
  };
  updateIcon();
  btnCortinaDelantera.addEventListener('click', () => {
    if (!cortinaDelanteraPanel) { console.warn('Cortina habitación 2 (panel) no lista'); return; }
    const objetivo = cortinaDelanteraCerrada ? 0.001 : cortinaDelanteraPanelMaxScaleY;
    animatePanel(cortinaDelanteraPanel, objetivo, 350, () => {
      cortinaDelanteraCerrada = !cortinaDelanteraCerrada;
      updateIcon();
    });
  });
}

const btnCortinaTrasera = document.getElementById('btnCortinaTrasera');
if (btnCortinaTrasera) {
  const config = buttonConfig.cortinaTrasera;
  // Establecer el texto fijo una sola vez
  setButtonLabel(btnCortinaTrasera, config.texto);
  // Actualizar solo el icono según el estado
  const updateIcon = () => {
    btnCortinaTrasera.classList.remove(config.icono1, config.icono2);
    btnCortinaTrasera.classList.add(cortinaTraseraCerrada ? config.icono1 : config.icono2);
  };
  updateIcon();
  btnCortinaTrasera.addEventListener('click', () => {
    if (!cortinaTraseraPanel) { console.warn('Cortina cocina (panel) no lista'); return; }
    const objetivo = cortinaTraseraCerrada ? 0.001 : cortinaTraseraPanelMaxScaleY;
    animatePanel(cortinaTraseraPanel, objetivo, 350, () => {
      cortinaTraseraCerrada = !cortinaTraseraCerrada;
      updateIcon();
      const p = cortinaTraseraPanelPivot.position;
      console.log('📌 Trasera pivot:', { x: p.x.toFixed(3), y: p.y.toFixed(3), z: p.z.toFixed(3) });
});
});
}

// Botón de depuración: bajar objetos seleccionados en pasos
const btnDebugBajar = document.getElementById('btnDebugBajar');
if (btnDebugBajar) {
  const hardStep = 5.0 // bajada brusca por clic
  const counters = new Map();

  const getCount = (key) => counters.get(key) || 0;
  const incCount = (key) => counters.set(key, getCount(key) + 1);

  btnDebugBajar.addEventListener('click', () => {
    const moved = [];

    const dropHard = (obj, label) => {
      if (!obj) return;
      obj.position.y -= hardStep;
      incCount(label);
      const wp = new THREE.Vector3();
      obj.getWorldPosition(wp);
      moved.push(`${label}: ${getCount(label)} clicks, worldY=${wp.y.toFixed(2)}`);
    };

    // Objetos principales (cortinas y pivots)
    dropHard(cortinaDelantera, 'cortinaDelantera');
    dropHard(cortinaDelanteraPivot, 'cortinaDelanteraPivot');
    dropHard(cortinaTrasera, 'cortinaTrasera');
    dropHard(cortinaTraseraPivot, 'cortinaTraseraPivot');

    // Nodos exactos por nombre por si falló el enlace
    const nodeC004 = modelo?.getObjectByName('Cilindro.004');
    const nodeC015 = modelo?.getObjectByName('Cilindro.015');
    dropHard(nodeC004, 'Cilindro.004');
    dropHard(nodeC015, 'Cilindro.015');

    // Todas las mallas rojas detectadas
    if (redDebugMeshes && redDebugMeshes.length) {
      redDebugMeshes.forEach((m, i) => dropHard(m, `redMesh[${i}]-${m.name || 'unnamed'}`));
    }

    if (moved.length) {
      console.log('⬇️ Bajar brusco (debug):', moved.join(' | '));
    } else {
      console.warn('Nada para mover. Asegúrate de que el modelo cargó.');
    }
  });
}

// Nuevo botón para cortina extra (fijo)
const btnFixed = document.getElementById('btnCortinaExtraFixed');


// Indicador visual de zoom de cámara 3D
let zoomIndicator3D = document.getElementById('zoom-indicator-3d');
if (!zoomIndicator3D) {
  zoomIndicator3D = document.createElement('div');
  zoomIndicator3D.id = 'zoom-indicator-3d';
  zoomIndicator3D.style.position = 'fixed';
  zoomIndicator3D.style.top = '0';
  zoomIndicator3D.style.left = '50%';
  zoomIndicator3D.style.transform = 'translateX(-50%)';
  zoomIndicator3D.style.padding = '10px 8px';
  zoomIndicator3D.style.background = 'rgba(0,0,0,0.85)';
  zoomIndicator3D.style.color = '#fff';
  zoomIndicator3D.style.fontSize = '22px';
  zoomIndicator3D.style.fontWeight = 'bold';
  zoomIndicator3D.style.zIndex = '10001';
  zoomIndicator3D.style.borderRadius = '0 0 16px 16px';
  zoomIndicator3D.style.pointerEvents = 'none';
  zoomIndicator3D.style.userSelect = 'none';
  zoomIndicator3D.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
  zoomIndicator3D.style.letterSpacing = '1px';
  document.body.appendChild(zoomIndicator3D);
}

// Centro de la casa para medir distancia (ajustar si tu centro es otro)
let zoomTarget = new THREE.Vector3(0, 0, 0);
if (typeof modelo !== 'undefined' && modelo) {
  // Si tienes un objeto principal, usa su centro
  const bbox = new THREE.Box3().setFromObject(modelo);
  bbox.getCenter(zoomTarget);
}



// Fijar el zoom de la cámara a 2.71 al inicio
window.addEventListener('DOMContentLoaded', () => {
  // Usar controls.target si existe, si no, usar el centro (0,0,0)
  let target = (controls && controls.target) ? controls.target : new THREE.Vector3(0,0,0);
  // Vector dirección cámara->target
  const dir = new THREE.Vector3().subVectors(camera.position, target).normalize();
  // Nueva posición a distancia 2.44 del target
  camera.position.copy(target).add(dir.multiplyScalar(2.44));
  camera.updateProjectionMatrix();
});
// Camera rotation with arrow keys
document.addEventListener('keydown', (event) => {
  const rotateAngle = 0.05; // Rotation angle in radians

  // Obtener el target de los controles, o el centro de la escena si no está disponible
  const target = controls.target || new THREE.Vector3(0, 0, 0);
  
  // Vector desde el target a la cámara
  const offset = new THREE.Vector3().subVectors(camera.position, target);

  switch (event.key) {
    case 'ArrowLeft':
      // Rotar el offset alrededor del eje Y
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotateAngle);
      break;
    case 'ArrowRight':
      // Rotar el offset alrededor del eje Y en la otra dirección
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotateAngle);
      break;
    default:
      return; // Salir si no es una flecha de dirección
  }

  // Calcular la nueva posición de la cámara y apuntar al target
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  // Eliminar la llamada a updateZoomIndicator3D que no está definida
}
animate();
