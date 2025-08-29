import { THREE } from './core.js';

function isLikelyRedColor(col) {
  if (!col) return false;
  const r = col.r ?? 0, g = col.g ?? 0, b = col.b ?? 0;
  return r > 0.6 && g < 0.35 && b < 0.35;
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

function findByAnyName(root, namesOrKeywords) {
  for (const n of namesOrKeywords) {
    const exact = root.getObjectByName(n);
    if (exact) return exact;
  }
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

export {
  THREE,
  isLikelyRedColor,
  collectRedMeshes,
  findByAnyName,
  normalizeName,
  findCurtain,
  setReceiveOnAll,
  setCastRecursively,
  disableCastEverywhere
};


