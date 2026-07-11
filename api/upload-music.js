import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default function handler(req, res) {
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

const timestamp = Math.floor(Date.now() / 1000);
const folder = "music";

const signature = cloudinary.utils.api_sign_request(
{ folder, timestamp },
apiSecret
);

res.status(200).json({
signature,
timestamp,
apiKey,
cloudName,
folder,
resourceType: "raw",
});
  }
