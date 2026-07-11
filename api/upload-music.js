// /api/video.js
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: "ephvzvey",
  api_key: "753366248515268",
  api_secret: "_J_Yc8JdcZzsvGApdimJR74DmN8",
});

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "music";
  const resource_type = "raw";

  const signature = cloudinary.utils.api_sign_request(
    { folder, resource_type, timestamp },
    cloudinary.config().api_secret
  );

  res.status(200).json({
    signature,
    timestamp,
    apiKey: cloudinary.config().api_key,
    cloudName: cloudinary.config().cloud_name,
    folder,
    resourceType: resource_type,
  });
}
