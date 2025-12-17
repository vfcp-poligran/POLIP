#!/bin/bash
# build-all-platforms.sh
# Script para compilar en todas las plataformas

echo "🚀 Iniciando compilación multiplataforma..."

# 1. Limpiar builds anteriores
echo "🧹 Limpiando builds anteriores..."
rm -rf www/ 2>/dev/null

# 2. Build de producción
echo "📦 Construyendo aplicación para producción..."
ionic build --prod

if [ $? -ne 0 ]; then
    echo "❌ Error en build de producción"
    exit 1
fi

# 3. Sincronizar con plataformas nativas
echo "🔄 Sincronizando con plataformas nativas..."
npx cap sync

if [ $? -ne 0 ]; then
    echo "❌ Error en sincronización"
    exit 1
fi

# 4. Verificar archivos generados
echo "✅ Verificando archivos generados..."

if [ -d "www" ]; then
    echo "   ✅ Web PWA: www/ generado correctamente"
    echo "      📊 Tamaño: $(du -sh www/ | cut -f1)"
else
    echo "   ❌ Web PWA: www/ no encontrado"
fi

if [ -d "android/app/src/main/assets/public" ]; then
    echo "   ✅ Android: Código sincronizado"
    echo "      📁 Assets: android/app/src/main/assets/public/"
else
    echo "   ❌ Android: Assets no sincronizados"
fi

if [ -d "ios/App/App/public" ]; then
    echo "   ✅ iOS: Código sincronizado"
    echo "      📁 Assets: ios/App/App/public/"
else
    echo "   ❌ iOS: Assets no sincronizados"
fi

echo ""
echo "🎉 ¡Compilación multiplataforma completada!"
echo ""
echo "📱 Próximos pasos:"
echo "   🌐 Web PWA: Servir desde /www con servidor HTTPS"
echo "   🤖 Android: Abrir /android en Android Studio"
echo "   🍎 iOS: Abrir /ios/App/App.xcworkspace en Xcode"
echo ""
echo "📊 Estadísticas del build:"
echo "   📦 Archivos JS: $(find www -name "*.js" | wc -l)"
echo "   🎨 Archivos CSS: $(find www -name "*.css" | wc -l)"
echo "   🖼️ Archivos de assets: $(find www/assets -type f 2>/dev/null | wc -l)"