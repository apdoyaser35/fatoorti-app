const CLOUDINARY_IMAGE_URL = 'https://api.cloudinary.com/v1_1/duko0m0wz/image/upload';
const CLOUDINARY_RAW_URL = 'https://api.cloudinary.com/v1_1/duko0m0wz/raw/upload';
const UPLOAD_PRESET = 'invoice_upload';

/**
 * Uploads a file (image or pdf) to Cloudinary using unsigned upload.
 * @param file The File object to upload
 * @returns A promise that resolves to the secure_url of the uploaded document
 */
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  // Use raw endpoint for PDFs, image endpoint otherwise
  const isPdf = file.type === 'application/pdf';
  const endpoint = isPdf ? CLOUDINARY_RAW_URL : CLOUDINARY_IMAGE_URL;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('فشل رفع الملف، حاول مرة أخرى');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('فشل رفع الملف، حاول مرة أخرى');
  }
};
