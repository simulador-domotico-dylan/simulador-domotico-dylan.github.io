// Estado y referencias compartidas
let modelo = null;
let puerta = null, garage = null, portonDelantero = null, portonTrasero = null;
let puertaAbierta = false;
let garageAbierto = false;
let animacionActiva = false;
let portonDelanteroAbierto = false;
let portonTraseroAbierto = false;
let portonTraseroPivot = null;
let portonDelanteroPivot = null;
let puertaControl = null;
let puertaControlAbierta = false;
let puertaInterior1 = null, puertaInterior1Abierta = false;
let puertaInterior2 = null, puertaInterior2Abierta = false;
let floorObject = null;

// Cortinas
let cortinaDelantera = null;
let cortinaTrasera = null;
let cortinaDelanteraPanelPivot = null;
let cortinaTraseraPanelPivot = null;
let cortinaDelanteraPanel = null;
let cortinaTraseraPanel = null;
let cortinaDelanteraPanelMaxScaleY = 1;
let cortinaTraseraPanelMaxScaleY = 1;
let cortinaDelanteraCerrada = false;
let cortinaTraseraCerrada = false;

// Extras cortina
let cortinaExtraPivot = null;
let cortinaExtraPanel = null;
let cortinaExtraMaxScaleY = 1;
let cortinaExtraCerrada = false;
let cortinaExtraInitialized = false;
let cortinaExtraOpenHeight = 0;
let cortinaExtraNode = null;

// Drag
let dragState = { active: false, target: null, offset: null, mode: 'xy', pointerId: null };

export {
  modelo, puerta, garage, portonDelantero, portonTrasero,
  puertaAbierta, garageAbierto, animacionActiva, portonDelanteroAbierto, portonTraseroAbierto,
  portonTraseroPivot, portonDelanteroPivot, puertaControl, puertaControlAbierta,
  puertaInterior1, puertaInterior1Abierta, puertaInterior2, puertaInterior2Abierta,
  floorObject,
  cortinaDelantera, cortinaTrasera, cortinaDelanteraPanelPivot, cortinaTraseraPanelPivot,
  cortinaDelanteraPanel, cortinaTraseraPanel, cortinaDelanteraPanelMaxScaleY, cortinaTraseraPanelMaxScaleY,
  cortinaDelanteraCerrada, cortinaTraseraCerrada,
  cortinaExtraPivot, cortinaExtraPanel, cortinaExtraMaxScaleY, cortinaExtraCerrada, cortinaExtraInitialized,
  cortinaExtraOpenHeight, cortinaExtraNode,
  dragState
};


