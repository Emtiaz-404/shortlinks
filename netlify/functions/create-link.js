const { createClient } = require("@supabase/supabase-js");

// We use Supabase FREE tier as database (or see localStorage fallback below)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function generateSlug(length = 6) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "https://thedigita-2011.com",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { originalUrl, customSlug, password, adminKey } = body;

    // Simple admin protection
    if (adminKey !== process.env.ADMIN_KEY) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    // Validate URL
    if (!originalUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "URL is required" }),
      };
    }

    let url;
    try {
      url = new URL(originalUrl);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid URL format" }),
      };
    }

    const slug = customSlug
      ? customSlug.replace(/[^a-zA-Z0-9-_]/g, "")
      : generateSlug();

    if (!slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid slug" }),
      };
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("links")
      .select("slug")
      .eq("slug", slug)
      .single();

    if (existing) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: "Slug already exists, try another" }),
      };
    }

    // Save to database
    const { data, error } = await supabase
      .from("links")
      .insert([
        {
          slug,
          original_url: originalUrl,
          password: password || null,
          created_at: new Date().toISOString(),
          clicks: 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const shortUrl = `https://thedigita-2011.com/r/${slug}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        shortUrl,
        slug,
        originalUrl,
        createdAt: data.created_at,
      }),
    };
  } catch (err) {
    console.error("Create link error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error, please try again" }),
    };
  }
};