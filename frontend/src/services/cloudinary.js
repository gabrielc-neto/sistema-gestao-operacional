// Upload de anexos via Cloudinary (grátis 25GB).
// Usado como storage temporário até migração pra Hostinger (VPS 400GB SSD).
// Ver [[project-firebase-storage-requer-blaze]] pro contexto.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "motoristas_docs";

export function cloudinaryConfigured() {
  return !!CLOUD_NAME;
}

// Sobe arquivo direto do browser via unsigned upload preset.
// Retorna { url, publicId, tipo, tamanho, nome } ou lança Error.
export async function uploadArquivo(file, { folder = "motoristas" } = {}) {
  if (!CLOUD_NAME) {
    throw new Error("Cloudinary não configurado. Defina VITE_CLOUDINARY_CLOUD_NAME no .env.");
  }
  if (!file) throw new Error("Nenhum arquivo selecionado.");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", folder);

  // PDF/ZIP vai como "raw" pra contornar bloqueio padrão de PDF delivery
  // no plano gratuito do Cloudinary. Imagem continua como "auto".
  const isPdfOuZip = file.type === "application/pdf" || file.type === "application/zip" || /\.(pdf|zip)$/i.test(file.name);
  const resourceType = isPdfOuZip ? "raw" : "auto";
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const resp = await fetch(endpoint, { method: "POST", body: fd, signal: controller.signal });
    clearTimeout(timeout);
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data?.error?.message || `Upload falhou (HTTP ${resp.status})`);
    }
    return {
      url: data.secure_url,
      publicId: data.public_id,
      tipo: data.resource_type + (data.format ? `/${data.format}` : ""),
      tamanho: data.bytes,
      nome: file.name,
      uploadedAt: new Date().toISOString(),
    };
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new Error("Timeout — arquivo grande demais ou internet lenta.");
    throw e;
  }
}
