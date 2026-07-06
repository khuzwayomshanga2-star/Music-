<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Profile Avatar</title>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <!-- Cropper JS CSS -->
  <link href="https://cdn.jsdelivr.net/npm/cropperjs@1.5.13/dist/cropper.min.css" rel="stylesheet"/>

  <style>
    /* Ensure the preview image plays nicely with Cropper.js */
    #previewContainer img {
      display: block;
      max-width: 100%;
    }
  </style>
</head>
<body class="bg-slate-900 flex items-center justify-center min-h-screen p-4 text-slate-900">

  <!-- Processing Overlay -->
  <div id="processingOverlay" class="fixed inset-0 bg-black/70 hidden items-center justify-center z-50 flex-col text-white">
    <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white mb-4"></div>
    <p id="overlayText" class="text-lg font-semibold">Processing Image...</p>
  </div>

  <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-slate-900">Edit Profile Picture</h1>
      <p id="status" class="text-sm text-slate-500 mt-1">Checking session...</p>
    </div>

    <!-- Upload & Edit Interface (Hidden until logged in) -->
    <div id="upload-container" class="hidden space-y-6">
      
      <!-- Avatar Preview / Cropper Area -->
      <div id="previewContainer" class="flex justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden p-2 min-h-[200px] items-center">
        <img id="preview-img" class="w-full h-auto max-h-64 object-contain hidden rounded-lg" alt="Avatar Preview" />
        <svg id="placeholder-icon" class="w-16 h-16 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      </div>

      <!-- File Input -->
      <div>
        <input 
          type="file" 
          id="avatar-input" 
          accept="image/png, image/jpeg, image/webp"
          class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-xl"
        >
      </div>

      <!-- Initial Actions (Show when file is selected) -->
      <div id="action-buttons" class="hidden flex gap-2">
        <button id="editBtn" class="flex-1 bg-slate-700 text-white font-semibold py-2 rounded-xl hover:bg-slate-800 transition">Crop / Edit</button>
        <button id="discardBtn" class="flex-1 bg-rose-100 text-rose-700 font-semibold py-2 rounded-xl hover:bg-rose-200 transition">Discard</button>
      </div>

      <!-- Crop Controls (Hidden until editing) -->
      <div id="cropControls" class="hidden space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div class="flex justify-center gap-2">
          <button id="rotateLeft" class="px-3 py-1 bg-slate-300 rounded hover:bg-slate-400 font-bold">⟲</button>
          <button id="rotateRight" class="px-3 py-1 bg-slate-300 rounded hover:bg-slate-400 font-bold">⟳</button>
          <button id="applyCrop" class="px-4 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-semibold">Apply Crop</button>
        </div>
        <div class="flex justify-center gap-2 text-sm">
          <button data-ratio="free" class="px-2 py-1 bg-white border rounded hover:bg-slate-100">Free</button>
          <button data-ratio="1" class="px-2 py-1 bg-white border rounded hover:bg-slate-100">1:1</button>
          <button data-ratio="1.777" class="px-2 py-1 bg-white border rounded hover:bg-slate-100">16:9</button>
          <button data-ratio="0.8" class="px-2 py-1 bg-white border rounded hover:bg-slate-100">4:5</button>
        </div>
      </div>
      
      <!-- Upload Button -->
      <button 
        id="upload-btn" 
        class="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition cursor-pointer hidden flex justify-center items-center gap-2"
      >
        Upload & Save Profile
      </button>
    </div>

  </div>

  <!-- Cropper JS -->
  <script src="https://cdn.jsdelivr.net/npm/cropperjs@1.5.13/dist/cropper.min.js"></script>
  
  <script type="module">
    import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

    const supabase = createClient(
      "https://vixrjkcyrlbwxgegihcm.supabase.co", 
      "sb_publishable_k4gygyuumSWF1k50bYxzlA_ns1iY3lQ"
    );

    // UI Elements
    const statusEl = document.getElementById("status");
    const uploadContainer = document.getElementById("upload-container");
    const previewImg = document.getElementById("preview-img");
    const placeholderIcon = document.getElementById("placeholder-icon");
    const fileInput = document.getElementById("avatar-input");
    
    // Buttons & Controls
    const actionButtons = document.getElementById("action-buttons");
    const editBtn = document.getElementById("editBtn");
    const discardBtn = document.getElementById("discardBtn");
    const uploadBtn = document.getElementById("upload-btn");
    const cropControls = document.getElementById("cropControls");
    const applyCrop = document.getElementById("applyCrop");
    const rotateLeft = document.getElementById("rotateLeft");
    const rotateRight = document.getElementById("rotateRight");
    
    // Overlay
    const overlay = document.getElementById("processingOverlay");
    const overlayText = document.getElementById("overlayText");

    let currentUser = null;
    let cropper = null;
    let originalImageSrc = null;

    /* 1. AUTHENTICATION CHECK */
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        currentUser = session.user;
        statusEl.innerText = "Ready to upload.";
        statusEl.classList.replace("text-slate-500", "text-emerald-600");
        uploadContainer.classList.remove("hidden");
        fetchExistingProfile();
      } else {
        statusEl.innerText = "Error: You must be logged in.";
        statusEl.classList.replace("text-slate-500", "text-rose-500");
      }
    }

    async function fetchExistingProfile() {
      const { data } = await supabase.from('profiles').select('avatar_url').eq('id', currentUser.id).single();
      if (data?.avatar_url) {
        previewImg.src = data.avatar_url;
        previewImg.classList.remove("hidden");
        placeholderIcon.classList.add("hidden");
        originalImageSrc = data.avatar_url;
      }
    }

    /* 2. HANDLE FILE SELECTION (Local Preview) */
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Create a local URL for the image to allow cropping before uploading
      const objectUrl = URL.createObjectURL(file);
      previewImg.src = objectUrl;
      previewImg.classList.remove("hidden");
      placeholderIcon.classList.add("hidden");

      actionButtons.classList.remove("hidden");
      uploadBtn.classList.remove("hidden");
      
      // Auto-start cropper for convenience
      editBtn.click();
    });

    /* 3. CROPPER LOGIC */
    editBtn.onclick = () => {
      if (!previewImg.src) return;
      actionButtons.classList.add("hidden");
      cropControls.classList.remove("hidden");
      uploadBtn.classList.add("hidden");

      if (cropper) cropper.destroy();
      cropper = new Cropper(previewImg, { 
        aspectRatio: 1, // Default to 1:1 for avatars
        viewMode: 1, 
        dragMode: "move", 
        autoCropArea: 1, 
        responsive: true 
      });
    };

    rotateLeft.onclick = () => cropper && cropper.rotate(-90);
    rotateRight.onclick = () => cropper && cropper.rotate(90);

    document.querySelectorAll("[data-ratio]").forEach(btn => {
      btn.onclick = () => {
        if (!cropper) return;
        const ratio = btn.dataset.ratio;
        cropper.setAspectRatio(ratio === "free" ? NaN : parseFloat(ratio));
      };
    });

    applyCrop.onclick = () => {
      if (!cropper) return;
      // Get the cropped image as a high quality Data URL
      const canvas = cropper.getCroppedCanvas({ maxWidth: 1200, maxHeight: 1200 });
      previewImg.src = canvas.toDataURL("image/jpeg", 0.9);
      
      cropper.destroy();
      cropper = null;
      
      cropControls.classList.add("hidden");
      actionButtons.classList.remove("hidden");
      uploadBtn.classList.remove("hidden");
    };

    /* 4. DISCARD CHANGES */
    discardBtn.onclick = () => {
      fileInput.value = "";
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      cropControls.classList.add("hidden");
      actionButtons.classList.add("hidden");
      uploadBtn.classList.add("hidden");

      // Revert to existing profile picture if they had one
      if (originalImageSrc) {
        previewImg.src = originalImageSrc;
      } else {
        previewImg.src = "";
        previewImg.classList.add("hidden");
        placeholderIcon.classList.remove("hidden");
      }
    };

    /* 5. UPLOAD TO CLOUDINARY & SAVE TO SUPABASE */
    uploadBtn.onclick = async () => {
      overlayText.innerText = "Uploading to Cloudinary...";
      overlay.classList.remove("hidden");
      overlay.classList.add("flex");

      try {
        // Convert the current preview (which is cropped) back into a File Blob
        const res = await fetch(previewImg.src);
        const blob = await res.blob();
        
        // Give the blob a filename so Multer can read it
        const fileToUpload = new File([blob], `avatar_${currentUser.id}.jpg`, { type: "image/jpeg" });

        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("userId", currentUser.id);

        // 1. Upload to your API
        const apiResponse = await fetch("/api/upload-avatar", {
          method: "POST",
          body: formData
        });

        if (!apiResponse.ok) throw new Error(await apiResponse.text());
        
        const data = await apiResponse.json();
        const newAvatarUrl = data.url;

        overlayText.innerText = "Saving to Database...";

        // 2. Save the new Cloudinary URL to Supabase profiles
        const { error: dbError } = await supabase
          .from('profiles')
          .update({ avatar_url: newAvatarUrl })
          .eq('id', currentUser.id);

        if (dbError) throw dbError;

        // Success Cleanup
        originalImageSrc = newAvatarUrl;
        actionButtons.classList.add("hidden");
        uploadBtn.classList.add("hidden");
        fileInput.value = "";
        
        statusEl.innerText = "Profile picture updated successfully!";
        statusEl.classList.replace("text-slate-500", "text-emerald-600");

      } catch (err) {
        console.error(err);
        alert("Upload Error: " + err.message);
      } finally {
        overlay.classList.add("hidden");
        overlay.classList.remove("flex");
      }
    };

    // Initialize Page
    checkSession();
  </script>
</body>
</html>
