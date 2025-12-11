# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.5.0] - 2025-10-27

### Eliminado
- ❌ **Funcionalidad de Evaluación**: Eliminada la opción "Evaluar" del contenedor de Rúbricas en la página de Configuración
- ❌ **Método abrirEvaluacion()**: Removido método y dependencia Router asociada
- ❌ **Iconos no utilizados**: Limpieza de iconos como `clipboardOutline`
- ❌ **Importaciones innecesarias**: Optimización de imports de componentes Ionic

### Cambiado
- 🔄 **Interfaz de Configuración**: Contenedor renombrado de "Rúbricas y Evaluación" a solo "Rúbricas"
- 🔄 **Estructura HTML**: Refactorización completa para eliminar errores de sintaxis
- 🔄 **Enfoque de Rúbricas**: Simplificación para centrarse únicamente en gestión de criterios

### Agregado
- ✅ **Método importarDatos()**: Placeholder para futura funcionalidad de importación CSV
- ✅ **Documentación**: Mejora en comentarios y estructura del código

### Técnico
- 🛠️ **Compilación**: Corregidos todos los errores de sintaxis HTML
- 🛠️ **Optimización**: Eliminación de dependencias no utilizadas
- 🛠️ **Estructura**: Mejor organización de componentes Ionic

## [3.0.0] - 2025-10-XX

### Agregado
- ✅ **Navegación por Tabs**: Sistema de pestañas independientes para Cursos y Configuración
- ✅ **Contenedores Horizontales**: Layout moderno con distribución horizontal de funcionalidades
- ✅ **Información del Sistema**: Display completo del stack tecnológico y características técnicas
- ✅ **Botones Cuadrados**: Diseño modernizado con botones de estilo cuadrado

### Cambiado
- 🔄 **Arquitectura de Navegación**: Migración de menú lateral a sistema de tabs
- 🔄 **Página de Configuración**: Centralización de todas las herramientas administrativas
- 🔄 **UI/UX**: Mejora significativa en la experiencia de usuario

---

### Leyenda de Iconos
- ✅ Agregado
- 🔄 Cambiado  
- ❌ Eliminado
- 🛠️ Técnico
- 🐛 Corrección de bugs
- 📝 Documentación