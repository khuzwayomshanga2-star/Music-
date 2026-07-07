import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "ephvzvey",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Supabase admin client using service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Multer setup for Vercel temp storage
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

    fs.unlinkSync(file.path);

    const { error: dbError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          avatar_url: result.secure_url,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      );

    if (dbError) {
      console.error("Supabase update error:", dbError);
      return res.status(500).json({
        error: "Uploaded image, but profile update failed",
        details: dbError.message
      });
    }

    return res.status(200).json({
      url: result.secure_url,
      publicId
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error: " + err.message);
  }
      }
