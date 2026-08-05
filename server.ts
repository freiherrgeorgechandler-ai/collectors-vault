import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  registerUser,
  loginUser,
  changePassword,
  logoutSession,
  getUserFromToken,
  readVault,
  writeVault,
  authMiddleware,
} from "./vaultDb";
import { lookupIcon, getCachedIconFile } from "./iconLookup";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON limit for base64 images
app.use(express.json({ limit: "25mb" }));

// Allow Capacitor / mobile WebView origins to call the API when online
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.error("Failed to initialize Gemini AI client:", err);
  }
}

function bearerToken(req: express.Request): string | null {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

// ---------- Local account + central vault (no Firebase required) ----------
app.post("/api/auth/register", (req, res) => {
  try {
    const { username, password, displayName } = req.body || {};
    const result = registerUser(String(username || ""), String(password || ""), displayName);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Registration failed." });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = loginUser(String(username || ""), String(password || ""));
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Login failed." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  logoutSession(bearerToken(req));
  res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  const user = getUserFromToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });
  res.json({ user });
});

app.post("/api/auth/change-password", authMiddleware, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const vaultUser = (req as any).vaultUser;
    const user = changePassword(
      String(vaultUser.id),
      String(currentPassword || ""),
      String(newPassword || "")
    );
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to change password." });
  }
});

app.get("/api/vault/items", authMiddleware, (req, res) => {
  const user = (req as any).vaultUser;
  res.json({ items: readVault(user.id) });
});

app.put("/api/vault/items", authMiddleware, (req, res) => {
  try {
    const user = (req as any).vaultUser;
    const items = req.body?.items;
    writeVault(user.id, items);
    res.json({ success: true, count: Array.isArray(items) ? items.length : 0 });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to save vault." });
  }
});

// Helper endpoint to check AI status
app.get("/api/ai/status", (_req, res) => {
  res.json({ available: !!ai });
});

// ---------- Icon / logo lookup + local cache ----------
app.post("/api/icons/lookup", async (req, res) => {
  try {
    const { query, brand, category, forceRefresh } = req.body || {};
    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ found: false, error: "query is required." });
    }

    const result = await lookupIcon({
      query: String(query),
      brand: typeof brand === "string" ? brand : undefined,
      category: typeof category === "string" ? category : undefined,
      forceRefresh: !!forceRefresh,
    });

    return res.json(result);
  } catch (err: any) {
    console.warn("Icon lookup error:", err?.message || err);
    // Graceful failure — callers keep their placeholder / mark pending
    return res.json({
      found: false,
      error: err?.message || "Icon lookup failed.",
    });
  }
});

app.get("/api/icons/:id", (req, res) => {
  try {
    const cached = getCachedIconFile(String(req.params.id || ""));
    if (!cached) {
      return res.status(404).json({ error: "Icon not found." });
    }
    res.setHeader("Content-Type", cached.mimeType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(cached.filePath);
  } catch (err: any) {
    console.warn("Icon serve error:", err?.message || err);
    return res.status(500).json({ error: "Failed to serve icon." });
  }
});

// AI Detail Extraction & Auto-Identify Endpoint
app.post("/api/gemini/analyze", async (req, res) => {
  if (!ai) {
    return res.status(503).json({
      error: "Gemini API key is not configured or unavailable.",
    });
  }

  try {
    const { category, title, image, prompt } = req.body;

    if (!category) {
      return res.status(400).json({ error: "Category is required." });
    }

    const contentsParts: any[] = [];

    if (image && typeof image === "string") {
      if (image.startsWith("data:image/")) {
        const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          contentsParts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          });
        }
      } else if (image.startsWith("http://") || image.startsWith("https://")) {
        try {
          const imgRes = await fetch(image);
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
            contentsParts.push({
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: mimeType.split(";")[0],
              },
            });
          }
        } catch (fetchErr) {
          console.warn("Could not fetch HTTP image URL for Gemini analysis:", fetchErr);
        }
      }
    }

    const userPrompt = prompt || title
      ? `Analyze this item for the category "${category}". Additional user context: "${title || prompt}". Extract accurate details in JSON format.`
      : `Analyze this image for a collector's item in the category "${category}". Extract all identifiable details in JSON format.`;

    contentsParts.push({ text: userPrompt });

    const systemInstruction = `You are an expert appraiser and curator for high-end personal collections across Vinyl, Painting, CD, DVD, Blu-ray, Cassette, Chinese Tea, Wine, and Teapots.
Your goal is to inspect the given text/image and return a JSON object with guessed or detected metadata relevant to the category "${category}".
Fields to extract based on category:
- vinyl / cd / dvd / bluray / cassette: title, artistOrDirector, genre, format, year, country, estimatedPrice, notes, condition
- chinese_tea: title (tea name), teaType (Puer Sheng, Puer Shou, Oolong, Green, White, Black, Dark, Rock Tea), vintageYear, origin (region/country), weightGrams, factoryOrBrand, storageCondition, tastingNotes, optimalSteeping, estimatedPrice
- wine: title (wine name), wineType (Red, White, Rosé, Sparkling, Dessert), vintageYear, region, winery, grapeVariety, abvPercent, drinkingWindow, tastingNotes, estimatedPrice
- teapot: title (teapot name), clayType (Zini, Zhuni, Duanni, Dahongpao, Yixing Zisha, etc.), makerArtist, capacityMl, eraYear, craftStyle, dedicatedTeaType, estimatedPrice, notes
- painting: title, artistName, medium (Oil, Acrylic, Ink, Watercolor, Mixed Media), dimensions, creationYear, framingStatus, signatureLocation, country, estimatedPrice, notes

Return JSON matching this schema:
{
  "title": string,
  "artistOrDirector": string (or maker/winery/brand),
  "genreOrSubtype": string (genre / teaType / wineType / clayType / medium),
  "year": string or number,
  "countryOrOrigin": string,
  "estimatedPrice": number or null,
  "format": string,
  "detectedCategory": string ("cd", "vinyl", "tea", "wine", "yixing", "art", "dvd", "bluray", "cassette"),
  "condition": string,
  "tastingOrNotes": string,
  "extraDetails": object (key value pairs for custom fields)
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts: contentsParts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    let parsedData = {};
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch {
      parsedData = { notes: responseText };
    }

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze item." });
  }
});

// AI Receipt OCR & Auto-Categorization Endpoint
app.post("/api/gemini/analyze-receipt", async (req, res) => {
  if (!ai) {
    return res.status(503).json({
      error: "Gemini API key is not configured or unavailable.",
    });
  }

  try {
    const { image, text } = req.body;

    if (!image && !text) {
      return res.status(400).json({ error: "Please provide a receipt image or text." });
    }

    const contentsParts: any[] = [];

    if (image && typeof image === "string") {
      if (image.startsWith("data:image/")) {
        const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          contentsParts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          });
        }
      } else if (image.startsWith("http://") || image.startsWith("https://")) {
        try {
          const imgRes = await fetch(image);
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
            contentsParts.push({
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: mimeType.split(";")[0],
              },
            });
          }
        } catch (fetchErr) {
          console.warn("Could not fetch HTTP image URL for receipt analysis:", fetchErr);
        }
      }
    }

    const receiptPrompt = `You are performing BULK ADD from a purchase receipt for a collector's vault.

CRITICAL RULES — READ CAREFULLY:
1. Extract EVERY purchased line item on the receipt. If there are 8 products, return 8 items. NEVER summarize into one item. NEVER skip media/collector titles.
2. Treat each CD, vinyl LP, DVD, Blu-ray, cassette, tea cake, wine bottle, teapot, or artwork as its OWN separate item — even if they share the same store or date.
3. Ignore non-product lines: tax, shipping, subtotal, total, change, payment method, store address, loyalty points — do NOT invent collection items from those.
4. Quantity: if a line says "Qty 2" of the same title, either emit 2 separate items OR one item with title noting qty; prefer separate items when titles are distinct collector pieces.
5. Categories must be EXACTLY one of:
   "vinyl", "painting", "cd", "dvd", "bluray", "cassette", "chinese_tea", "wine", "teapot"
   OR "unidentified" when you cannot confidently match.

CATEGORY HINTS:
- Vinyl / LP / 12" / 7" / record → vinyl
- Compact Disc / CD / SACD / album disc → cd
- DVD → dvd ; Blu-ray / 4K UHD → bluray ; Cassette / tape → cassette
- Puer / Oolong / tea cake → chinese_tea ; wine / champagne → wine
- Yixing / zisha / teapot → teapot ; painting / print / artwork → painting

PENDING RULES:
- If title is clear AND category is clear → isPending=false, confidence="high"
- If title exists but category is uncertain → category="unidentified", isPending=true, confidence="low"
- If line is gibberish / barcode-only / unreadable → category="unidentified", isPending=true, confidence="low", explain in reason

Additional pasted text (if any):
"""${text || ''}"""

Return ONLY valid JSON:
{
  "vendorName": string or null,
  "purchaseDate": string or null,
  "currency": string,
  "totalAmount": number or null,
  "items": [
    {
      "title": string,
      "price": number or null,
      "currency": string,
      "category": string,
      "isPending": boolean,
      "confidence": "high" | "medium" | "low",
      "reason": string,
      "artistOrMaker": string or null
    }
  ]
}

The "items" array MUST contain one object per product line. Empty items array is only allowed if the document is not a purchase receipt.`;

    contentsParts.push({ text: receiptPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts: contentsParts },
      config: {
        systemInstruction:
          "You are an expert multi-item receipt OCR engine for collectors. Always extract ALL product line items into the items array. Never collapse a multi-item receipt into a single item. Return strict JSON only.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendorName: { type: Type.STRING, nullable: true },
            purchaseDate: { type: Type.STRING, nullable: true },
            currency: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER, nullable: true },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  price: { type: Type.NUMBER, nullable: true },
                  currency: { type: Type.STRING },
                  category: { type: Type.STRING },
                  isPending: { type: Type.BOOLEAN },
                  confidence: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  artistOrMaker: { type: Type.STRING, nullable: true },
                },
                required: ["title", "category", "isPending", "confidence"],
              },
            },
          },
          required: ["items"],
        },
      },
    });

    const responseText = response.text || "{}";
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch {
      parsedData = { error: "Failed to parse receipt JSON output.", items: [] };
    }

    // Normalize: ensure items is always an array
    if (!Array.isArray(parsedData.items)) {
      parsedData.items = [];
    }

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Receipt analysis error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze receipt." });
  }
});

async function startServer() {
  // Vite middleware in non-production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Prefer Capacitor/web build output (www/), fall back to legacy dist/
    const wwwPath = path.join(process.cwd(), "www");
    const distPath = path.join(process.cwd(), "dist");
    const staticPath = fs.existsSync(path.join(wwwPath, "index.html"))
      ? wwwPath
      : distPath;
    app.use(express.static(staticPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
