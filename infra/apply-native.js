/**
 * Se ejecuta en CI después de `npx cap add android`.
 * Inyecta el plugin nativo de biometría (PxBioPlugin) al proyecto Android:
 *  - copia MainActivity.java y PxBioPlugin.java al paquete generado
 *  - agrega la dependencia androidx.biometric
 * Y aplica el tema visual Android de la app:
 *  - colors.xml con los colores de marca (azul #12294b, verde #15803d)
 *  - styles.xml con barra de estado y de navegación en azul de marca y
 *    fondo de ventana azul, para que no haya destello blanco al abrir
 */
const fs = require("fs");
const path = require("path");

const PKG = "com/jrosal/pagomobilexpress";
const ROOT = path.join(__dirname, "..");
const ANDROID_APP = path.join(ROOT, "android", "app", "src", "main", "java", PKG);
const SRC = path.join(ROOT, "infra", "java", PKG);
const RES_VALUES = path.join(ROOT, "android", "app", "src", "main", "res", "values");

for (const f of ["MainActivity.java", "PxBioPlugin.java"]) {
  fs.copyFileSync(path.join(SRC, f), path.join(ANDROID_APP, f));
  console.log("copiado:", f);
}

// dependencia de androidx.biometric en app/build.gradle
const gradle = path.join(ROOT, "android", "app", "build.gradle");
let g = fs.readFileSync(gradle, "utf8");
if (!g.includes("androidx.biometric")) {
  g = g.replace(
    "dependencies {",
    "dependencies {\n    implementation 'androidx.biometric:biometric:1.1.0'"
  );
  fs.writeFileSync(gradle, g);
  console.log("gradle actualizado");
}

// tema visual Android (colores de marca)
fs.mkdirSync(RES_VALUES, { recursive: true });
fs.writeFileSync(path.join(RES_VALUES, "colors.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#12294b</color>
    <color name="colorPrimaryDark">#0d1f3a</color>
    <color name="colorAccent">#15803d</color>
</resources>
`);
console.log("colors.xml actualizado");
fs.writeFileSync(path.join(RES_VALUES, "styles.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Tema principal: barra de estado y navegación en azul de marca,
         fondo de ventana azul para evitar el destello blanco al abrir. -->
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:statusBarColor">@color/colorPrimary</item>
        <item name="android:navigationBarColor">@color/colorPrimary</item>
        <item name="android:windowBackground">@color/colorPrimary</item>
    </style>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:statusBarColor">@color/colorPrimary</item>
        <item name="android:navigationBarColor">@color/colorPrimary</item>
        <item name="android:windowBackground">@color/colorPrimary</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>
`);
console.log("styles.xml actualizado");
console.log("OK: plugin biometrico y tema instalados");
