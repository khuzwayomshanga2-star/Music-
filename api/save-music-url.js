import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({ error: "Use POST" });
}

try {
const { submissionId, userId, musicUrl } = req.body;

if (!submissionId) {
  return res.status(400).json({ error: "Missing submissionId" });
}

if (!userId) {
  return res.status(400).json({ error: "Missing userId" });
}

if (!musicUrl) {
  return res.status(400).json({ error: "Missing musicUrl" });
}

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

const { error: updateError } = await supabase
  .from("music_submissions")
  .update({
    music_url: musicUrl,
  })
  .eq("id", submissionId)
  .eq("user_id", userId);

if (updateError) {
  return res.status(500).json({ error: updateError.message });
}

return res.status(200).json({
  success: true,
  submissionId,
  userId,
  musicUrl,
});

} catch (err) {
console.error(err);
return res.status(500).json({ error: "Server error: " + err.message });
}
                            }
