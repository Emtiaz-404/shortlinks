const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  const { slug } = event.queryStringParameters || {};

  if (!slug) {
    return {
      statusCode: 302,
      headers: { Location: "https://thedigita-2011.com" },
      body: "",
    };
  }

  try {
    const { data, error } = await supabase
      .from("links")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return {
        statusCode: 302,
        headers: { Location: "https://thedigita-2011.com?error=not_found" },
        body: "",
      };
    }

    if (data.password) {
      const providedPassword = event.queryStringParameters?.p;
      if (providedPassword !== data.password) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "text/html" },
          body: generatePasswordPage(slug),
        };
      }
    }

    supabase
      .from("links")
      .update({ clicks: (data.clicks || 0) + 1 })
      .eq("slug", slug)
      .then(() => {})
      .catch(() => {});

    return {
      statusCode: 301,
      headers: {
        Location: data.original_url,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: "",
    };
  } catch (err) {
    console.error("Redirect error:", err);
    return {
      statusCode: 302,
      headers: { Location: "https://thedigita-2011.com" },
      body: "",
    };
  }
};

function generatePasswordPage(slug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Protected Link - TheDigita</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 40px;
      width: 100%;
      max-width: 420px;
      text-align: center;
      margin: 20px;
    }
    .icon { font-size: 52px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    p { color: rgba(255,255,255,0.55); margin-bottom: 28px; font-size: 14px; }
    input {
      width: 100%;
      padding: 14px 16px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.07);
      color: #fff;
      font-size: 15px;
      margin-bottom: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus { border-color: #7c3aed; }
    input::placeholder { color: rgba(255,255,255,0.3); }
    button {
      width: 100%;
      padding: 14px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
    }
    button:hover { opacity: 0.9; transform: translateY(-1px); }
    .error {
      margin-top: 14px;
      padding: 10px;
      border-radius: 8px;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.2);
      color: #fca5a5;
      font-size: 13px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>Protected Link</h1>
    <p>This link requires a password to continue</p>
    <form onsubmit="unlock(event)">
      <input type="password" id="pwd" placeholder="Enter password" required autofocus />
      <button type="submit">Unlock &amp; Continue →</button>
    </form>
    <div class="error" id="errMsg">❌ Incorrect password, try again</div>
  </div>
  <script>
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('wrong') === '1') {
      document.getElementById('errMsg').style.display = 'block';
    }
    function unlock(e) {
      e.preventDefault();
      const pwd = document.getElementById('pwd').value;
      window.location.href = '/r/${slug}?p=' + encodeURIComponent(pwd);
    }
  </script>
</body>
</html>`;
}
