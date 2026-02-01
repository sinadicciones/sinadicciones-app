# 🌟 Sin Adicciones - Landing Page

## El primer paso a tu recuperación

Esta es la landing page promocional para la aplicación Sin Adicciones.

---

## 📁 Archivos incluidos

```
landing/
├── index.html      # Página principal
├── styles.css      # Estilos CSS
├── script.js       # JavaScript para interactividad
└── README.md       # Este archivo
```

---

## 🚀 Cómo usar

### 1. Actualizar la URL de la App

**IMPORTANTE:** Antes de subir a tu hosting, debes actualizar la URL de tu app desplegada en Emergent.

Abre `index.html` y busca estas líneas (alrededor de la línea 200):

```html
<!-- IMPORTANTE: Reemplaza esta URL con la URL de tu app desplegada en Emergent -->
<a href="TU_URL_DE_APP_EMERGENT_AQUI" class="btn btn-download btn-primary btn-lg" target="_blank">
```

Reemplaza `TU_URL_DE_APP_EMERGENT_AQUI` con la URL real de tu aplicación desplegada.

### 2. Subir a tu hosting

1. Conecta a tu servidor via FTP/SFTP
2. Sube los 3 archivos (`index.html`, `styles.css`, `script.js`) a la carpeta raíz o a una subcarpeta
3. ¡Listo! Tu landing page estará disponible

### 3. Personalización opcional

#### Cambiar el logo
El logo se carga desde sinadicciones.cl. Si quieres usar uno local:
1. Guarda tu logo en la misma carpeta
2. Cambia la URL en el HTML: `src="tu-logo.png"`

#### Cambiar colores
Los colores se definen en `styles.css` en las variables CSS:
```css
:root {
    --primary: #6c1cff;      /* Color principal (morado) */
    --secondary: #00d4aa;    /* Color secundario (verde) */
    --dark: #202125;         /* Fondo oscuro */
}
```

#### Cambiar estadísticas
Edita los números en el HTML:
```html
<span class="stat-number" data-count="1000">0</span>
```

---

## 📱 Características

- ✅ Diseño responsive (móvil, tablet, desktop)
- ✅ Animaciones suaves
- ✅ Navegación fluida
- ✅ Optimizado para SEO
- ✅ Botón de emergencia (línea 1412)
- ✅ Mockup de la app interactivo
- ✅ Contador animado de estadísticas

---

## 🔗 Links importantes

- **Sitio web principal:** https://sinadicciones.cl
- **Línea de ayuda:** 1412 (Chile)
- **Asesoría experta:** https://sinadicciones.cl/solicitar-asesoria-experta/

---

## 📞 Soporte

Si tienes dudas sobre la landing page o la aplicación, contacta a través de sinadicciones.cl

---

*"El primer paso a tu recuperación"* 💜