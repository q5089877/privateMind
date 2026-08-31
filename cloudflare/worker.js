/**
 * Mind Harbor / Thought Router - Cloudflare Worker Reverse Proxy
 * 安全轉發前端請求至 Google Gemini API，完全隱藏 GEMINI_API_KEY
 */
export default {
  async fetch(request, env) {
    // 1. CORS 白名單 (支援本地開發與 GitHub Pages)
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "https://q5089877.github.io/privateMind" // 可替換為你的 GitHub Pages 網址
    ];

    const origin = request.headers.get("Origin") || "";
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith(".github.io");
    const corsHeaders = {
      "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    // 2. 處理 OPTIONS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. 檢查 API Key 配置
    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured in Cloudflare Worker Secrets." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const reqData = await request.json();
      const model = reqData.model || "gemini-3.6-flash";

      // 4. 組合 Google Gemini API 請求 (使用 X-goog-api-key Header)
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const geminiPayload = {
        contents: reqData.contents,
        systemInstruction: reqData.systemInstruction,
        generationConfig: {
          temperature: reqData.generationConfig?.temperature ?? reqData.temperature ?? 0.2,
          topP: reqData.generationConfig?.topP ?? reqData.topP,
          responseMimeType: reqData.generationConfig?.responseMimeType || reqData.responseMimeType || "application/json",
          responseSchema: reqData.generationConfig?.responseSchema || reqData.responseSchema || undefined,
        },
      };

      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify(geminiPayload),
      });

      const data = await geminiRes.text();
      return new Response(data, {
        status: geminiRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
