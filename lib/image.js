"use client";
// Shrinks a photo in the browser before upload so it loads fast on mobile data.
export async function shrinkImage(file, maxSide = 1600, quality = 0.85) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Choose a photo (JPG, PNG or HEIC).");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That photo couldn't be opened. Try a JPG or PNG."));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    return await new Promise((resolve, reject) =>
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't prepare the photo."))), "image/jpeg", quality));
  } finally { URL.revokeObjectURL(url); }
}

// Square crop from the centre, for profile photos.
export async function squareAvatar(file, side = 400) {
  const blob = await shrinkImage(file, 1200, 0.9);
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement("canvas"); c.width = side; c.height = side;
    c.getContext("2d").drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, side, side);
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't prepare the photo."))), "image/jpeg", 0.88));
  } finally { URL.revokeObjectURL(url); }
}
