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
    texto1: "Abrir portón delantero",
    icono1: "garage-open",
    texto2: "Cerrar portón delantero",
    icono2: "garage-closed",
  },
  portonTrasero: {
    texto1: "Abrir portón trasero",
    icono1: "garage-open",
    texto2: "Cerrar portón trasero",
    icono2: "garage-closed",
  },
  puertaPrincipal: {
    texto1: "Abrir puerta principal",
    icono1: "door-open",
    texto2: "Cerrar puerta principal",
    icono2: "door-closed",
  },
  puertaCuarto: {
    texto1: "Abrir puerta cuarto",
    icono1: "door-open",
    texto2: "Cerrar puerta cuarto",
    icono2: "door-closed",
  },
  puertaBaño: {
    texto1: "Abrir puerta baño",
    icono1: "door-open",
    texto2: "Cerrar puerta baño",
    icono2: "door-closed",
  },
  cortinaDelantera: {
    texto1: "Abrir cortina delantera",
    icono1: "curtains",
    texto2: "Cerrar cortina delantera",
    icono2: "curtains-closed",
  },
  cortinaTrasera: {
    texto1: "Abrir cortina trasera",
    icono1: "curtains",
    texto2: "Cerrar cortina trasera",
    icono2: "curtains-closed",
  },
  cortinaExtra: {
    texto1: "Abrir cortina cocina",
    icono1: "curtains",
    texto2: "Cerrar cortina cocina",
    icono2: "curtains-closed",
  },
};