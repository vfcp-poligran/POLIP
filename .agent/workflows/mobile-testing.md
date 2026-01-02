---
description: Cómo ejecutar pruebas de layout mobile usando los parámetros del Motorola G84
---
# Workflow: Pruebas Mobile (Motorola G84)

## Dispositivo de Referencia
**Motorola G84**
- Pantalla: 6.55" pOLED
- Resolución física: 2400 x 1080 px
- Device Pixel Ratio: ~2.6
- **CSS Pixels (para pruebas en navegador):**
  - Portrait: **412 x 915**
  - Landscape: **915 x 412**

## Pasos para Pruebas en Navegador

### 1. Abrir Chrome DevTools o Browser Testing
```
// turbo
ionic serve
```

### 2. Configurar Viewport en DevTools
- Abrir DevTools (F12)
- Click en "Toggle device toolbar" (Ctrl+Shift+M)
- Seleccionar "Edit..." en el menú de dispositivos
- Agregar dispositivo personalizado:
  - **Name**: Motorola G84
  - **Width**: 412
  - **Height**: 915
  - **Device pixel ratio**: 2.6
  - **User agent**: (dejar por defecto)

### 3. Verificar Layout
Checklist de verificación:
- [ ] Header visible en la parte superior
- [ ] Sin solapamiento header/contenido
- [ ] Tab bar inferior visible
- [ ] FAB accesible
- [ ] Contenido scrolleable

### 4. Probar Landscape
- Rotar el dispositivo en DevTools (icono de rotación)
- Verificar que el layout se adapte correctamente

## Parámetros para Browser Subagent
Cuando uses el browser_subagent para pruebas mobile, usar estos valores:
```json
{
  "Width": 412,
  "Height": 915,
  "DeviceName": "Motorola G84 Portrait"
}
```

Para landscape:
```json
{
  "Width": 915,
  "Height": 412,
  "DeviceName": "Motorola G84 Landscape"
}
```
