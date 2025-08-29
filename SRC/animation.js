import { THREE } from './core.js';

export let animating = false;

function animatePanel(panel, targetScaleY, durationMs, onDone) {
  if (!panel) return;
  const start = performance.now();
  const startScale = panel.scale.y;
  const endScale = targetScaleY;
  function step(t) {
    const p = Math.min(1, (t - start) / durationMs);
    panel.scale.y = startScale + (endScale - startScale) * p;
    panel.position.y = -panel.scale.y / 2;
    if (p < 1) requestAnimationFrame(step); else if (onDone) onDone();
  }
  requestAnimationFrame(step);
}

function rotarSuave(objeto, destinoY, alFinalizar) {
  if (!objeto || animating) return;
  animating = true;
  const velocidad = 0.05;
  function animar() {
    const actual = objeto.rotation.y;
    const diferencia = destinoY - actual;
    const siguiente = actual + velocidad * Math.sign(diferencia);
    if (Math.sign(destinoY - siguiente) !== Math.sign(diferencia)) {
      objeto.rotation.y = destinoY;
      animating = false;
      if (alFinalizar) alFinalizar();
      return;
    }
    objeto.rotation.y = siguiente;
    requestAnimationFrame(animar);
  }
  animar();
}

function rotarGarageSuave(objeto, destinoRotacion, alFinalizar) {
  if (!objeto || animating) return;
  animating = true;
  const velocidadRotacion = 0.02;
  function animar() {
    const rotacionActual = objeto.rotation.x;
    const diferenciaRotacion = destinoRotacion - rotacionActual;
    const siguienteRotacion = rotacionActual + velocidadRotacion * Math.sign(diferenciaRotacion);
    if (Math.sign(destinoRotacion - siguienteRotacion) !== Math.sign(diferenciaRotacion)) {
      objeto.rotation.x = destinoRotacion;
      animating = false;
      if (alFinalizar) alFinalizar();
      return;
    }
    objeto.rotation.x = siguienteRotacion;
    requestAnimationFrame(animar);
  }
  animar();
}

export { animatePanel, rotarSuave, rotarGarageSuave };


