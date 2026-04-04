const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/duko0m0wz/image/upload';
const UPLOAD_PRESET = 'invoice_upload';

/**
 * Uploads an image file to Cloudinary using unsigned upload.
 * @param file The File object to upload
 * @returns A promise that resolves to the secure_url of the uploaded image
 */
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('فشل رفع الصورة، حاول مرة أخرى');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('فشل رفع الصورة، حاول مرة أخرى');
  }
};
