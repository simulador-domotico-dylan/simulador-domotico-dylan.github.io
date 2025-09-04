import { buttonConfig } from "../config.js";

function setButtonLabel(btn, text) {
  if (!btn) return;
  let span = btn.querySelector('span');
  if (!span) {
    span = document.createElement('span');
    // Vaciar el contenido y adherir el span
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    btn.appendChild(span);
  }
  span.textContent = text;
  btn.title = text;
}

function configurarBoton(id, config) {
  const btn = document.getElementById(id);
  if (btn) {
    setButtonLabel(btn, config.texto);
    btn.className = "ui-button";
    btn.classList.add(config.icono1);

    let isIcono1 = true;

    btn.addEventListener("click", () => {
      isIcono1 = !isIcono1;
      // Mantener la clase ui-button y solo cambiar la clase del icono
      btn.classList.remove(config.icono1, config.icono2);
      btn.classList.add(isIcono1 ? config.icono1 : config.icono2);
    });
  } else {
    console.error(`Botón con id '${id}' no encontrado en el DOM.`);
  }
}

function inicializarBotones() {
  Object.entries(buttonConfig).forEach(([key, config]) => {
    const id = `btn${key.charAt(0).toUpperCase() + key.slice(1)}`;
    configurarBoton(id, config);
  });
}

export { inicializarBotones, setButtonLabel };
