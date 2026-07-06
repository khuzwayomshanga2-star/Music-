import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import fs from "fs";

export const config = { api: { bodyParser: false } };

// Configure Cloudinary with your active credentials
cloudinary.config({
  cloud_name: "ephvzvey",
  api_key: "291888853851945",
  api_secret: "ShdORDimizbj79uuiipldWnWWMs"
});

// Multer setup for Vercel's temporary directory
const upload = multer({ dest: "/tmp/" });

function multerMiddleware(req, res) {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (err) => {
      if (err) reject(err);
      else resolve(req.file);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Use POST only");

  try {
    const file = await multerMiddleware(req, res);
    if (!file) return res.status(400).send("No file uploaded");

    const userId = req.body.userId || req.query.userId;
    if (!userId) return res.status(400).send("Missing userId");

    const publicId = `avatar_${userId}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "profiles",
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      transformation: [
        { width: 800, height: 800, crop: "fill", gravity: "face" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ]
    });

    // Clean up the temporary file
    fs.unlinkSync(file.path);

    res.status(200).json({ url: result.secure_url, publicId });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error: " + err.message);
  }
}
