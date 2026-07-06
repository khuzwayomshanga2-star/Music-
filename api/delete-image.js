import cloudinary from "cloudinary";

// Configured with your active credentials
cloudinary.v2.config({
  cloud_name: "ephvzvey",
  api_key: "291888853851945",
  api_secret: "ShdORDimizbj79uuiipldWnWWMs"
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("POST only");
  }

  const { publicId } = req.body || {};

  if (!publicId) {
    return res.status(400).json({ success: false, error: "Missing publicId" });
  }

  try {
    const result = await cloudinary.v2.uploader.destroy(publicId);

    // Check Cloudinary response
    if (result.result !== "ok") {
      return res.status(400).json({
        success: false,
        error: "Delete failed",
        cloudinaryResult: result.result
      });
    }

    return res.status(200).json({
      success: true,
      deleted: publicId
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Delete failed",
      details: err.message
    });
  }
}
