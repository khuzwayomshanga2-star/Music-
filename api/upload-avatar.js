import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

// Cloudinary
cloudinary.config({
  cloud_name: "ephvzvey",
  api_key: "291888853851945",
  api_secret: "ShdORDimizbj79uuiipldWnWWMs"
});

// Paste your service role key here
const SUPABASE_URL = "https://vixrjkcyrlbwxgegihcm.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpeHJqa2N5cmxid3hnZWdpaGNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzA5OTkzNiwiZXhwIjoyMDk4Njc1OTM2fQ.CNYIJXooqe9WuLWWIdmFRt8zNKPCA5kofIg2Mh5o50c";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Multer
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
      .upsert({
        id: userId,
        avatar_url: result.secure_url,
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      return res.status(500).json({
        error: "Cloudinary upload succeeded, but database update failed",
        details: dbError
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
