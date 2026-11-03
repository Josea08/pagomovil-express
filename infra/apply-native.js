/**
 * Se ejecuta en CI después de `npx cap add android`.
 * Inyecta el plugin nativo de biometría (PxBioPlugin) al proyecto Android:
 *  - copia MainActivity.java y PxBioPlugin.java al paquete generado
 *  - agrega la dependencia androidx.biometric
 */
const fs = require("fs");
const path = require("path");

const PKG = "com/jrosal/pagomobilexpress";
const ROOT = path.join(__dirname, "..");
const ANDROID_APP = path.join(ROOT, "android", "app", "src", "main", "java", PKG);
const SRC = path.join(ROOT, "infra", "java", PKG);

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
console.log("OK: plugin biometrico instalado");
