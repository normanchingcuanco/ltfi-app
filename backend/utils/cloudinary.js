const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Cloudinary credentials missing, skipping delete for', publicId);
    return;
  }
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?public_ids[]=${encodeURIComponent(publicId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Basic ${auth}` }
      }
    );
    if (!res.ok) {
      console.error('Cloudinary delete failed', publicId, await res.text());
    }
  } catch (err) {
    console.error('Cloudinary delete error', publicId, err.message);
  }
};

module.exports = { deleteCloudinaryImage };