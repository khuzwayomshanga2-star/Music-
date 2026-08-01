import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST only" });
  }

  let filePath;

  try {
    const file = await multerMiddleware(req, res);
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    filePath = file.path;

    const userId = req.body.userId || req.query.userId;
    const submissionId = req.body.submissionId || req.query.submissionId;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (!submissionId) {
      return res.status(400).json({ error: "Missing submissionId" });
    }

    const { data: existingRow, error: fetchError } = await supabase
      .from("submissions")
      .select("id, user_id")
      .eq("id", submissionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({ error: "Database error: " + fetchError.message });
    }

    if (!existingRow) {
      return res.status(404).json({ error: "Submission row not found" });
    }

    const publicId = `artist_file_${userId}_${submissionId}`;

    const result = await cloudinary.uploader.upload(filePath, {
      folder: "artist_file",
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      transformation: [
        { width: 800, height: 800, crop: "fill", gravity: "auto" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        picture: result.secure_url,
      })
      .eq("id", submissionId)
      .eq("user_id", userId);

    if (updateError) {
      return res.status(500).json({ error: "Database error: " + updateError.message });
    }

    return res.status(200).json({
      id: submissionId,
      user_id: userId,
      picture: result.secure_url,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error: " + err.message });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
  }
      }
