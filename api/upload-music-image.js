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

let filePath;

try {
const file = await multerMiddleware(req, res);
if (!file) return res.status(400).send("No file uploaded");
filePath = file.path;

const userId = req.body.userId || req.query.userId;
const submissionId = req.body.submissionId || req.query.submissionId;

if (!userId) return res.status(400).send("Missing userId");

let rowId = submissionId;

if (submissionId) {
  const { data: existingRow, error: fetchError } = await supabase
    .from("music_submissions")
    .select("id, acceptance")
    .eq("id", submissionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    return res.status(500).send("Database error: " + fetchError.message);
  }

  if (!existingRow) {
    return res.status(404).send("Submission row not found");
  }

  if (existingRow.acceptance === true) {
    return res.status(403).send("This submission has already been accepted and cannot be changed");
  }
} else {
  const title = req.body.title || req.query.title;
  const musicUrl = req.body.musicUrl || req.body.music_url || req.query.musicUrl || req.query.music_url;

  if (!title) return res.status(400).send("Missing title for new row");
  if (!musicUrl) return res.status(400).send("Missing music_url for new row");

  const { data: newRow, error: insertError } = await supabase
    .from("music_submissions")
    .insert({
      user_id: userId,
      title,
      music_url: musicUrl,
      acceptance: false,
      comment: null,
    })
    .select("id")
    .single();

  if (insertError) {
    return res.status(500).send("Database error: " + insertError.message);
  }

  rowId = newRow.id;
}

const publicId = `music_image_${userId}_${rowId}`;

const result = await cloudinary.uploader.upload(filePath, {
  folder: "music_image",
  public_id: publicId,
  overwrite: true,
  invalidate: true,
});

const { error: updateError } = await supabase
  .from("music_submissions")
  .update({
    image_url: result.secure_url,
    image_public_id: publicId,
  })
  .eq("id", rowId)
  .eq("user_id", userId);

if (updateError) {
  return res.status(500).send("Database error: " + updateError.message);
}

return res.status(200).json({
  id: rowId,
  user_id: userId,
  image_url: result.secure_url,
  image_public_id: publicId,
});

} catch (err) {
console.error(err);
return res.status(500).send("Server error: " + err.message);
} finally {
if (filePath && fs.existsSync(filePath)) {
try {
fs.unlinkSync(filePath);
} catch {}
}
}
  }
