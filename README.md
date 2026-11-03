# 💳 RectiPagos

App para Android que prepara tu **Pago Móvil** en un toque: guarda tu cédula, banco, teléfono y
cuenta **cifrados con AES-256 con tu PIN**, genera el mensaje listo para copiar o enviar
por WhatsApp, con historial de pagos y conversión Bs/USD con la tasa BCV. Incluye desbloqueo
por huella, lista nativa de bancos con buscador, lectura de QR con los datos del comercio y
modo oscuro según el sistema.

> ⚠️ Importante: esta app NO paga en puntos de venta con NFC. Eso requiere que el banco
> entregue un token oficial a Google Wallet, y ningún banco venezolano lo ofrece todavía.
> Lo que hace es acelerar el Pago Móvil, que es como se paga realmente en Venezuela.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La app completa (solo esto es necesario) |
| `manifest.webmanifest` | Hace que se instale como app en Android |
| `sw.js` | Funcionamiento offline |
| `icon-192.png` / `icon-512.png` | Ícono de la app |
| `make-icons.js` | Script que genera los íconos (puedes borrarlo) |

## Cómo generar el APK con GitHub Actions

1. Crea una cuenta en **github.com** (si no la tienes).
2. Pon **New repository** → nombre: `pagomovil-express` → **Public** (o Private si tienes plan) → Create.
3. En la página del repo pulsa **"uploading an existing file"** y arrastra **desde esta carpeta**:
   - la carpeta `www/` (con sus 5 archivos)
   - la carpeta `.github/` (con `workflows/build-apk.yml` dentro)
   - `package.json` y `capacitor.config.json`
   *(No subas el ZIP ni make-icons.js ni README.)*
4. En "Commit changes" escribe un mensaje y pulsa **Commit**.
5. Ve a la pestaña **Actions** → a la izquierda entra en **Build APK** → pulsa **Run workflow** → **Run workflow** (verde).
6. Espera ~5 minutos; al terminar, entra en el run y en la sección **Artifacts** descarga **pagomovil-express-apk** → contiene `app-debug.apk`.
7. Pásalo al teléfono e instálalo (activa "orígenes desconocidos").

## Cómo usarla en tu teléfono

1. **Prueba local:** abre `index.html` en Chrome de tu PC; ya puedes crear tu PIN y perfil.
2. **Instalarla en el teléfono como app real**, necesitas servir los archivos por **HTTPS**. Opciones fáciles y gratis:
   - Netlify Drop: entra a `app.netlify.com/drop` y arrastra la carpeta completa → te da un enlace HTTPS al instante.
   - GitHub Pages: sube la carpeta a un repo y activa Pages.
   - Surge.sh: `npx surge` dentro de la carpeta.
3. En tu Android, abre ese enlace en **Chrome**: menú ⋮ → **"Añadir a pantalla de inicio"**.
4. Listo: aparece como app con su ícono, funciona offline y los datos quedan solo en el teléfono.

## Seguridad

- Todo se cifra con AES-GCM 256 y PBKDF2 (150.000 iteraciones) derivado de tu PIN.
- El PIN no se guarda: si lo olvidas, hay que borrar los datos (botón en la pantalla de PIN o en Mi perfil → Seguridad).
- Limpia el historial o vacía la app en Mi perfil si vas a vender o prestar el teléfono.

## Idea de migración futura

Si algún día quieres APK nativo (con NFC para leer tarjetas físicas), el diseño/HTML es
reutilizable como base en un WebView Android o con Capacitor.
