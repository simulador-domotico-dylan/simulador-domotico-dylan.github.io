// Escalado proporcional de la barra superior (botones e iconos)
// Cambia este valor (por ejemplo: 1 para 100%, 0.8 para 80%, 1.2 para 120%)
export const topBarScale = 1;
// Configuración de tamaño para las líneas/cortinas simuladas
// Puedes modificar estos valores y recargar la página.

export const curtainConfig = {
  // Cómo calcular el ANCHO de la línea
  // 'garageWidth'  -> usa el ancho del portón del garaje
  // 'modelWidth'   -> usa el ancho total del modelo
  // 'absolute'     -> usa un valor fijo en unidades de la escena (widthValue)
  widthMode: 'garageWidth',
  widthScale: .11,        // antes 1.0 → más angosto en X
  widthValue: 1.2,        // usado solo si widthMode === 'absolute'

  // Cómo calcular la ALTURA MÁXIMA (cuánto baja la línea)
  // 'garageHeight' -> usa el alto del portón del garaje
  // 'modelHeight'  -> usa el alto total del modelo
  // 'absolute'     -> usa un valor fijo (heightValue)
  heightMode: 'garageHeight',
  heightScale: .45,      // multiplicador (si heightMode != 'absolute')
  heightValue: 1.0,       // usado solo si heightMode === 'absolute'

  // Límites mínimos para evitar tamaños cero
  minWidth: 0.05,
  minHeight: 0.05,
};

// Configuración de botones

export const buttonConfig = {
  portonDelantero: {
    texto: "Portón 1",
    icono1: "garage-open",
    icono2: "garage-closed",
  },
  portonTrasero: {
    texto: "Portón 2",
    icono1: "garage-open",
    icono2: "garage-closed",
  },
  puertaPrincipal: {
    texto: "Puerta 1",
    icono1: "door-open",
    icono2: "door-closed",
  },
  puertaCuarto: {
    texto: "Puerta 2",
    icono1: "door-open",
    icono2: "door-closed",
  },
  puertaBaño: {
    texto: "Puerta 3",
    icono1: "door-open",
    icono2: "door-closed",
  },
  cortinaDelantera: {
    texto: "Cortina 1",
    // icono1 = estado CERRADA, icono2 = estado ABIERTA
    icono1: "curtains-closed",
    icono2: "curtains",
  },
  cortinaTrasera: {
    texto: "Cortina 2",
    // icono1 = estado CERRADA, icono2 = estado ABIERTA
    icono1: "curtains-closed",
    icono2: "curtains",
  },
  cortinaExtra: {
    texto: "Cortina 3",
    icono1: "curtains-closed",
    icono2: "curtains",
  },
  luzIzquierda: {
    texto: "Luz Izquierda",
    icono1: "light-on",
    icono2: "light-off",
  },
  luzDerecha: {
    texto: "Luz Derecha",
    icono1: "light-on",
    icono2: "light-off",
  },
  luzTrasera: {
    texto: "Luz Trasera",
    icono1: "light-on",
    icono2: "light-off",
  },
  luzCocina: {
    texto: "Luz Cocina",
    icono1: "light-on",
    icono2: "light-off",
  },
};
