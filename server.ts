import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("arch_budget.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    material_type TEXT NOT NULL,
    model TEXT NOT NULL,
    price REAL NOT NULL,
    unit TEXT DEFAULT 'm²',
    supplier TEXT NOT NULL,
    rating REAL DEFAULT 4.5,
    reviews INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    characteristics TEXT,
    base_price_min REAL,
    base_price_max REAL,
    install_price_min REAL,
    install_price_max REAL
  );
`);

// Seed data if empty
const brandCount = db.prepare("SELECT count(*) as count FROM brands").get() as { count: number };
if (brandCount.count === 0) {
  const insertBrand = db.prepare("INSERT INTO brands (name, material_type, model, price, supplier, rating, reviews) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insertBrand.run("泰拉木业精品", "木地板", "北欧橡木 XL", 720, "泰拉木业", 4.9, 124);
  insertBrand.run("智木解决方案", "木地板", "北欧橡木 XL", 680, "智木科技", 4.7, 88);
  insertBrand.run("圣象地板", "木地板", "强化复合 S1", 280, "圣象集团", 4.8, 1500);
  insertBrand.run("诺贝尔瓷砖", "瓷砖", "大理石纹 800x800", 120, "诺贝尔", 4.6, 2100);
  insertBrand.run("立邦漆", "涂料", "竹炭净味 5合1", 45, "立邦中国", 4.9, 5000);
}

const materialCount = db.prepare("SELECT count(*) as count FROM materials").get() as { count: number };
if (materialCount.count === 0) {
  const insertMaterial = db.prepare("INSERT INTO materials (name, type, characteristics, base_price_min, base_price_max, install_price_min, install_price_max) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insertMaterial.run("优质橡木实木复合地板", "木地板", "E0级环保, 4mm耐磨层, 防潮性能, 哑光UV漆", 580, 820, 100, 150);
  insertMaterial.run("大理石纹抛釉砖", "瓷砖", "高硬度, 易清洁, 防滑, 镜面效果", 80, 150, 60, 100);
  insertMaterial.run("乳胶漆墙面", "涂料", "净味环保, 耐擦洗, 遮盖力强", 30, 60, 20, 40);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/brands", (req, res) => {
    const type = req.query.type as string;
    let brands;
    if (type) {
      brands = db.prepare("SELECT * FROM brands WHERE material_type = ?").all(type);
    } else {
      brands = db.prepare("SELECT * FROM brands").all();
    }
    res.json(brands);
  });

  app.get("/api/materials", (req, res) => {
    const materials = db.prepare("SELECT * FROM materials").all();
    res.json(materials);
  });

  app.post("/api/analyze", async (req, res) => {
    const { image, prompt, apiKey: clientApiKey, model: clientModel } = req.body;
    const apiKey = clientApiKey || process.env.QWEN_API_KEY;
    const model = clientModel || "qwen3.5-flash";

    if (!apiKey) {
      return res.status(500).json({ error: "QWEN_API_KEY is not set" });
    }

    try {
      const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: image } }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      if (data.error) {
        console.error("Qwen API error:", data.error);
        res.status(500).json({ error: data.error.message });
      } else {
        const content = data.choices[0].message.content;
        res.json(JSON.parse(content));
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  app.post("/api/generate-image", async (req, res) => {
    const { image, prompt, apiKey: clientApiKey, model: clientModel } = req.body;
    const apiKey = clientApiKey || process.env.QWEN_API_KEY;
    const model = clientModel || "qwen-image-2.0";

    if (!apiKey) {
      return res.status(500).json({ error: "QWEN_API_KEY is not set" });
    }

    try {
      // DashScope Image Synthesis API for qwen-image-2.0
      // Note: qwen-image-2.0 is primarily text-to-image. 
      // For "modifying" an image, we'll use the prompt and potentially the image as a reference if supported, 
      // but standard qwen-image-2.0 API is text-to-image.
      // However, I'll implement it as requested.
      
      const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable" // Image generation is often async
        },
        body: JSON.stringify({
          model: model,
          input: {
            prompt: prompt,
            // If the model supports image reference, it would go here. 
            // For now, we'll focus on the prompt which includes the context.
          },
          parameters: {
            size: "1024*1024",
            n: 1
          }
        })
      });

      const initialData = await response.json();
      
      if (initialData.error || (initialData.code && initialData.code !== "ok")) {
        return res.status(500).json({ error: initialData.message || "Image generation failed to start" });
      }

      const taskId = initialData.output.task_id;
      
      // Poll for completion
      let taskStatus = "PENDING";
      let resultData: any = null;
      
      for (let i = 0; i < 30; i++) { // Max 30 attempts (approx 60s)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusRes = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
          headers: { "Authorization": `Bearer ${apiKey}` }
        });
        
        resultData = await statusRes.json();
        taskStatus = resultData.output.task_status;
        
        if (taskStatus === "SUCCEEDED" || taskStatus === "FAILED") break;
      }

      if (taskStatus === "SUCCEEDED") {
        const imageUrl = resultData.output.results[0].url;
        // Fetch the image and convert to base64 to return to client
        const imgRes = await fetch(imageUrl);
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        res.json({ image: `data:image/png;base64,${base64}` });
      } else {
        res.status(500).json({ error: `Image generation ${taskStatus.toLowerCase()}` });
      }
    } catch (error) {
      console.error("Image generation failed:", error);
      res.status(500).json({ error: "Image generation failed" });
    }
  });

  app.post("/api/brands", (req, res) => {
    const { name, material_type, model, price, supplier, rating, reviews } = req.body;
    const info = db.prepare("INSERT INTO brands (name, material_type, model, price, supplier, rating, reviews) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(name, material_type, model, price, supplier, rating || 4.5, reviews || 0);
    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
