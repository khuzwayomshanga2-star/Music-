
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const { submissionId, userId, music_url, image_url, image_public_id } = req.body;

  if (!submissionId || !userId || !music_url) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Update the existing row with the data received from Cloudinary
    const { data, error } = await supabase
      .from("music_submissions")
      .update({
        music_url: music_url,
        image_url: image_url,
        image_public_id: image_public_id,
        // Optional: You could also mark it 'finished' here if needed
      })
      .eq("id", submissionId)
      .eq("user_id", userId);

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
