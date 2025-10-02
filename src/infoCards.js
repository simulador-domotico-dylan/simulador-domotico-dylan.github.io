import { THREE, camera, renderer } from './core.js';

// Sistema de carteles informativos
let activeCards = new Map(); // deviceId -> {card, line, targetObject, updateFunction}
let cardContainer = null;
let animationFrameId = null;

// Crear contenedor para carteles
function createCardContainer() {
  if (cardContainer) return cardContainer;
  
  cardContainer = document.createElement('div');
  cardContainer.id = 'info-cards-container';
  cardContainer.style.position = 'fixed';
  cardContainer.style.top = '0';
  cardContainer.style.left = '0';
  cardContainer.style.width = '100%';
  cardContainer.style.height = '100%';
  cardContainer.style.pointerEvents = 'none';
  cardContainer.style.zIndex = '1000';
  document.body.appendChild(cardContainer);
  
  return cardContainer;
}

// Convertir posición 3D a coordenadas de pantalla
function worldToScreen(worldPosition) {
  const vector = worldPosition.clone();
  vector.project(camera);
  
  const x = (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
  const y = (vector.y * -0.5 + 0.5) * renderer.domElement.clientHeight;
  
  return { x, y };
}

// Crear cartel informativo
function createInfoCard(deviceName, deviceType, worldPosition, targetObject = null) {
  const container = createCardContainer();
  
  // Remover cartel existente si ya existe
  const existingCardData = activeCards.get(deviceName);
  if (existingCardData) {
    if (existingCardData.card) existingCardData.card.remove();
    if (existingCardData.line) existingCardData.line.remove();
  }
  
  const card = document.createElement('div');
  card.className = 'info-card';
  card.style.position = 'absolute';
  card.style.background = 'rgba(60, 60, 60, 0.95)';
  card.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  card.style.borderRadius = '8px';
  card.style.padding = '12px 16px';
  card.style.color = '#ffffff';
  card.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  card.style.fontSize = '14px';
  card.style.fontWeight = '500';
  card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  card.style.backdropFilter = 'blur(8px)';
  card.style.pointerEvents = 'auto';
  card.style.maxWidth = '200px';
  card.style.minWidth = '120px';
  
  // Contenido del cartel
  const title = document.createElement('div');
  title.textContent = deviceName;
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '8px';
  title.style.fontSize = '16px';
  
  const info = document.createElement('div');
  info.textContent = `${deviceType} activado`;
  info.style.fontSize = '12px';
  info.style.opacity = '0.8';
  
  card.appendChild(title);
  card.appendChild(info);
  
  // Línea de conexión más gruesa y punteada
  const connectionLine = document.createElement('div');
  connectionLine.className = 'connection-line';
  connectionLine.style.position = 'absolute';
  connectionLine.style.background = 'rgba(100, 150, 255, 0.8)';
  connectionLine.style.height = '4px';
  connectionLine.style.borderTop = '4px dashed rgba(100, 150, 255, 0.8)';
  connectionLine.style.background = 'transparent';
  connectionLine.style.pointerEvents = 'none';
  connectionLine.style.zIndex = '999';
  
  container.appendChild(card);
  container.appendChild(connectionLine);
  
  // Posicionar cartel
  updateCardPosition(card, connectionLine, worldPosition);
  
  // Función para actualizar posición del objeto
  const updatePosition = () => {
    if (targetObject && targetObject.position) {
      updateCardPosition(card, connectionLine, targetObject.position);
    }
  };
  
  // Guardar referencia con datos completos
  activeCards.set(deviceName, {
    card: card,
    line: connectionLine,
    targetObject: targetObject,
    updateFunction: updatePosition
  });
  
  // Iniciar loop de actualización si no está activo
  if (!animationFrameId) {
    startUpdateLoop();
  }
  
  return card;
}

// Actualizar posición del cartel
function updateCardPosition(card, connectionLine, worldPosition) {
  const screenPos = worldToScreen(worldPosition);
  
  // Posición del cartel (evitar que se salga de la pantalla)
  const cardWidth = 200;
  const cardHeight = 80;
  let cardX = screenPos.x - cardWidth / 2;
  let cardY = screenPos.y - cardHeight - 20;
  
  // Ajustar si se sale de la pantalla
  if (cardX < 10) cardX = 10;
  if (cardX > window.innerWidth - cardWidth - 10) cardX = window.innerWidth - cardWidth - 10;
  if (cardY < 10) cardY = screenPos.y + 20;
  if (cardY > window.innerHeight - cardHeight - 10) cardY = window.innerHeight - cardHeight - 10;
  
  card.style.left = cardX + 'px';
  card.style.top = cardY + 'px';
  
  // Calcular línea de conexión
  const lineStartX = screenPos.x;
  const lineStartY = screenPos.y;
  const lineEndX = cardX + cardWidth / 2;
  const lineEndY = cardY + cardHeight;
  
  const lineLength = Math.sqrt(
    Math.pow(lineEndX - lineStartX, 2) + Math.pow(lineEndY - lineStartY, 2)
  );
  const lineAngle = Math.atan2(lineEndY - lineStartY, lineEndX - lineStartX) * 180 / Math.PI;
  
  connectionLine.style.left = lineStartX + 'px';
  connectionLine.style.top = lineStartY + 'px';
  connectionLine.style.width = lineLength + 'px';
  connectionLine.style.transform = `rotate(${lineAngle}deg)`;
  connectionLine.style.transformOrigin = '0 0';
}

// Ocultar cartel
function hideInfoCard(deviceName) {
  const cardData = activeCards.get(deviceName);
  if (cardData) {
    if (cardData.card) {
      cardData.card.style.transition = 'opacity 0.3s ease';
      cardData.card.style.opacity = '0';
    }
    if (cardData.line) {
      cardData.line.style.transition = 'opacity 0.3s ease';
      cardData.line.style.opacity = '0';
    }
    setTimeout(() => {
      if (cardData.card && cardData.card.parentNode) {
        cardData.card.parentNode.remove();
      }
      if (cardData.line && cardData.line.parentNode) {
        cardData.line.parentNode.remove();
      }
      activeCards.delete(deviceName);
      
      // Detener loop si no hay más carteles
      if (activeCards.size === 0 && animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }, 300);
  }
}

// Loop de actualización para seguir el movimiento
function startUpdateLoop() {
  function updateLoop() {
    activeCards.forEach((cardData, deviceName) => {
      if (cardData.updateFunction) {
        cardData.updateFunction();
      }
    });
    
    if (activeCards.size > 0) {
      animationFrameId = requestAnimationFrame(updateLoop);
    }
  }
  
  animationFrameId = requestAnimationFrame(updateLoop);
}

// Mostrar cartel para dispositivo específico
function showDeviceInfo(deviceName, deviceType, worldPosition, targetObject = null) {
  if (!worldPosition) {
    console.warn('Posición 3D no proporcionada para', deviceName);
    return;
  }
  
  createInfoCard(deviceName, deviceType, worldPosition, targetObject);
}

// Actualizar posiciones de todos los carteles (para cuando cambie la cámara)
function updateAllCardPositions() {
  activeCards.forEach((card, deviceName) => {
    // Aquí podrías obtener la posición 3D del dispositivo
    // Por ahora, solo actualizamos si hay cambios de cámara
  });
}

// Limpiar todos los carteles
function clearAllCards() {
  activeCards.forEach((cardData) => {
    if (cardData.card && cardData.card.parentNode) {
      cardData.card.parentNode.remove();
    }
    if (cardData.line && cardData.line.parentNode) {
      cardData.line.parentNode.remove();
    }
  });
  activeCards.clear();
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

export { 
  showDeviceInfo, 
  hideInfoCard, 
  updateAllCardPositions, 
  clearAllCards,
  createCardContainer 
};
