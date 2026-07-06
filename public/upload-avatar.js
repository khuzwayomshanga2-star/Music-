<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Google Sign In</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-slate-900 flex items-center justify-center min-h-screen p-4 text-white">

  <button
    id="googleBtn"
    class="flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-3 px-6 rounded-xl hover:bg-slate-100 transition cursor-pointer shadow-md"
  >
    Continue with Google
  </button>

  <script type="module">
    import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

    const supabase = createClient(
      "https://vixrjkcyrlbwxgegihcm.supabase.co",
      "sb_publishable_k4gygyuumSWF1k50bYxzlA_ns1iY3lQ"
    );

    const googleBtn = document.getElementById("googleBtn");

    async function saveProfile(user) {
      if (!user) return;

      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.email ||
        null;

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        updated_at: new Date().toISOString()
      });

      if (error) {
        alert("Profile saving error:\n" + JSON.stringify(error, null, 2));
      }
    }

    async function deleteAvatar(userId) {
      const publicId = `profiles/avatar_${userId}`;

      const response = await fetch("/api/delete-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          publicId
        })
      });

      if (!response.ok) {
        const text = await response.text();
        alert("Delete error:\n" + text);
        return;
      }

      const result = await response.json();
      alert("Deleted:\n" + JSON.stringify(result, null, 2));
    }

    async function handleSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await saveProfile(session.user);
        await deleteAvatar(session.user.id);
      }
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await saveProfile(session.user);
        await deleteAvatar(session.user.id);
      }
    });

    googleBtn.addEventListener("click", async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });

      if (error) {
        alert("OAuth error:\n" + JSON.stringify(error, null, 2));
      }
    });

    handleSession();
  </script>
</body>
</html>
