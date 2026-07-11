import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

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
    return res.status(405).send("Use POST only");
  }

  try {
    const file = await multerMiddleware(req, res);
    if (!file) return res.status(400).send("No file uploaded");

    const userId = req.body.userId || req.query.userId;
    let submissionId = req.body.submissionId || req.query.submissionId;

    if (!userId) {
      fs.unlinkSync(file.path); // Clean up file if failing early
      return res.status(400).send("Missing userId");
    }

    // --- NEW LOGIC: Check acceptance or create new row ---
    if (submissionId) {
      // 1. Existing submission: Check if it's already accepted
      const { data: existingRow, error: fetchError } = await supabase
        .from("music_submissions")
        .select("acceptance")
        .eq("id", submissionId)
        .eq("user_id", userId)
        .single();

      if (fetchError || !existingRow) {
        fs.unlinkSync(file.path);
        return res.status(404).send("Submission not found or unauthorized");
      }

      if (existingRow.acceptance === true) {
        fs.unlinkSync(file.path);
        return res.status(403).send("Submission is already accepted and cannot be updated");
      }
    } else {
      // 2. New submission: Insert a blank row to generate an ID
      const { data: newRow, error: insertError } = await supabase
        .from("music_submissions")
        .insert([{ user_id: userId, acceptance: false }])
        .select("id")
        .single();

      if (insertError) {
        fs.unlinkSync(file.path);
        return res.status(500).send("Database error: " + insertError.message);
      }
      
      submissionId = newRow.id;
    }
    // ------------------------------------------------------

    // Now proceed with Cloudinary upload using the guaranteed submissionId
    const publicId = `music_image_${userId}_${submissionId}`;

    const result = await cloudinary.uploader.upload(file.path, {
      folder: "music_image",
      public_id: publicId,
      overwrite: true,
      invalidate: true,
    });

    // Clean up local temp file
    fs.unlinkSync(file.path);

    // Update the row with the newly uploaded image details
    const { error: updateError } = await supabase
      .from("music_submissions")
      .update({
        image_url: result.secure_url,
        image_public_id: publicId,
      })
      .eq("id", submissionId)
      .eq("user_id", userId);

    if (updateError) {
      return res.status(500).send("Database error: " + updateError.message);
    }

    return res.status(200).json({
      image_url: result.secure_url,
      image_public_id: publicId,
      id: submissionId,
      user_id: userId,
    });

  } catch (err) {
    console.error(err);
    // Attempt to clean up temp file if a generic error occurs
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).send("Server error: " + err.message);
  }
}
