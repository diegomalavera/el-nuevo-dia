const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Rutas
const htmlPath = path.join(__dirname, 'index.html');
const outputPath = path.join(__dirname, 'index-webp.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

const domain = 'http://localhost:3000/';
const regex = /<(img|source)\b[^>]*?\b(src|data-srcset)=["']([^"']+)["']/gi;

let updatedHtml = html;
const converted = new Set();

console.log("🔄 Procesando imágenes...\n");

let match;
while ((match = regex.exec(html)) !== null) {
  const fullTag = match[0];
  const attr = match[2]; // src o data-srcset
  const originalUrl = match[3];

  // Solo procesar imágenes locales con el dominio especificado
  if (!originalUrl.startsWith(domain)) continue;

  const cleanUrl = originalUrl.split('?')[0]; // quitar query string
  const relativePath = decodeURIComponent(cleanUrl.replace(domain, '')).replace(/^\//, '');
  const absPath = path.join(__dirname, relativePath);

  if (!fs.existsSync(absPath)) {
    console.warn(`⚠️ Imagen no encontrada: ${relativePath}`);
    continue;
  }

  const ext = path.extname(relativePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue; // solo imágenes comunes

  const webpRelativePath = relativePath.replace(ext, '.webp');
  const webpAbsPath = path.join(__dirname, webpRelativePath);
  const webpUrl = domain + webpRelativePath;

  // Convertir imagen si aún no ha sido procesada
  if (!converted.has(relativePath)) {
    if (!fs.existsSync(webpAbsPath)) {
      try {
        fs.mkdirSync(path.dirname(webpAbsPath), { recursive: true });
        sharp(absPath).toFile(webpAbsPath);
        console.log(`✔️ ${relativePath} → ${webpRelativePath}`);
      } catch (err) {
        console.error(`❌ Error al convertir ${relativePath}:`, err.message);
        continue;
      }
    } else {
      console.log(`⏭️ Ya existe: ${webpRelativePath}`);
    }
    converted.add(relativePath);
  }

  // Reemplazar la ruta original por la .webp en el HTML
  const escapedUrl = originalUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const attrRegex = new RegExp(`(${attr}=["'])${escapedUrl}(["'])`, 'g');
  updatedHtml = updatedHtml.replace(attrRegex, `$1${webpUrl}$2`);
}

fs.writeFileSync(outputPath, updatedHtml, 'utf-8');
console.log(`\n✅ HTML actualizado guardado como: ${path.basename(outputPath)}`);
