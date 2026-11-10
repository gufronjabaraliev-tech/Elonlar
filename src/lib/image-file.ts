export async function fileToJpeg(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Faqat rasm tanlang");
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("Bu rasm ochilmadi. Boshqa rasm tanlang");
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Rasm tayyorlanmadi");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  if (!blob) throw new Error("Rasm tayyorlanmadi");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Rasm o'qilmadi"));
    reader.readAsDataURL(blob);
  });
  if (!dataUrl.startsWith("data:image/jpeg")) throw new Error("Rasm tayyorlanmadi");
  return dataUrl;
}
