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
if (req.method !== "GET") {
return res.status(405).json({ error: "Use GET" });
}

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
return res.status(500).json({
error: "Missing Cloudinary environment variables",
});
}

const userId = req.query.userId;
const title = req.query.title;
const submissionId = req.query.submissionId || null;

if (!userId) {
return res.status(400).json({ error: "Missing userId" });
}

let rowId = submissionId;

try {
if (submissionId) {
const { data: existingRow, error: fetchError } = await supabase
.from("music_submissions")
.select("id, acceptance")
.eq("id", submissionId)
.eq("user_id", userId)
.maybeSingle();

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }

  if (!existingRow) {
    return res.status(404).json({ error: "Submission row not found" });
  }

  if (existingRow.acceptance === true) {
    return res.status(403).json({
      error: "This submission has already been accepted and cannot be changed",
    });
  }

  if (title) {
    const { error: updateTitleError } = await supabase
      .from("music_submissions")
      .update({ title })
      .eq("id", submissionId)
      .eq("user_id", userId);

    if (updateTitleError) {
      return res.status(500).json({ error: updateTitleError.message });
    }
  }
} else {
  if (!title) {
    return res.status(400).json({ error: "Missing title for new row" });
  }

  const { data: newRow, error: insertError } = await supabase
    .from("music_submissions")
    .insert({
      user_id: userId,
      title,
      music_url: "pending",
      acceptance: false,
      comment: null,
    })
    .select("id")
    .single();

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  rowId = newRow.id;
}

const timestamp = Math.floor(Date.now() / 1000);
const folder = "music";

const signature = cloudinary.utils.api_sign_request(
  { folder, timestamp },
  apiSecret
);

return res.status(200).json({
  signature,
  timestamp,
  apiKey,
  cloudName,
  folder,
  resourceType: "raw",
  submissionId: rowId,
  title: title || null,
  userId,
});

} catch (err) {
console.error(err);
return res.status(500).json({ error: "Server error: " + err.message });
}
  }
