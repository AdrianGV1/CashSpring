const CLOUD_NAME = 'dentngtqt';
const UPLOAD_PRESET = 'cashspring_uploads';

/**
 * Sube un archivo de imagen a Cloudinary y devuelve la URL segura.
 * @param {File} file - Archivo de imagen a subir
 * @returns {Promise<string>} URL segura de la imagen en Cloudinary
 */
export const uploadToCloudinary = async (file) => {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', UPLOAD_PRESET);
  data.append('cloud_name', CLOUD_NAME);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: data }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al subir imagen a Cloudinary');
  }

  const json = await res.json();
  return json.secure_url;
};
