import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Changed to GET since we are only requesting a signature
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: "Missing Cloudinary environment variables" });
  }

  // Because this is a GET request, we read from the URL query parameters
  const userId = req.query.userId;
  let submissionId = req.query.submissionId;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    // --- DATABASE LOGIC: Check acceptance or create new row ---
    if (submissionId) {
      // 1. Existing submission: Check if it's already accepted
      const { data: existingRow, error: fetchError } = await supabase
        .from("music_submissions")
        .select("acceptance")
        .eq("id", submissionId)
        .eq("user_id", userId)
        .single();

      if (fetchError || !existingRow) {
        return res.status(404).json({ error: "Submission not found or unauthorized" });
      }

      if (existingRow.acceptance === true) {
        return res.status(403).json({ error: "Submission is already accepted and cannot be updated" });
      }
    } else {
      // 2. New submission: Insert a blank row to generate an ID
      const { data: newRow, error: insertError } = await supabase
        .from("music_submissions")
        .insert([{ user_id: userId, acceptance: false }])
        .select("id")
        .single();

      if (insertError) {
        return res.status(500).json({ error: "Database error: " + insertError.message });
      }
      
      submissionId = newRow.id;
    }
    // ------------------------------------------------------

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "music_image"; 
    const publicId = `music_image_${userId}_${submissionId}`;

    // Generate the signature locking in the folder and public_id
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp, public_id: publicId },
      apiSecret
    );

    return res.status(200).json({
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      publicId,
      submissionId,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
