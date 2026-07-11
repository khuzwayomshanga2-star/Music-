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
const submissionId = req.body.submissionId || req.query.submissionId;

if (!userId) return res.status(400).send("Missing userId");
if (!submissionId) return res.status(400).send("Missing submissionId");

const publicId = `music_image_${userId}_${submissionId}`;

const result = await cloudinary.uploader.upload(file.path, {
  folder: "music_image",
  public_id: publicId,
  overwrite: true,
  invalidate: true,
});

fs.unlinkSync(file.path);

const { error } = await supabase
  .from("music_submissions")
  .update({
    image_url: result.secure_url,
    image_public_id: publicId,
  })
  .eq("id", submissionId)
  .eq("user_id", userId);

if (error) {
  return res.status(500).send("Database error: " + error.message);
}

return res.status(200).json({
  image_url: result.secure_url,
  image_public_id: publicId,
  id: submissionId,
  user_id: userId,
});

} catch (err) {
console.error(err);
return res.status(500).send("Server error: " + err.message);
}
}
