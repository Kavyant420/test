import fetch from "node-fetch";
import { JSDOM } from "jsdom";

export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("Missing ?url parameter");
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ProxyClean/2.0"
      }
    });

    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Collect <video> and <source> tags
    let sources = [];

    const videoTags = [...doc.querySelectorAll("video")];
    videoTags.forEach(v => {
      if (v.src) sources.push(v.src);
      v.querySelectorAll("source").forEach(s => {
        if (s.src) sources.push(s.src);
      });
    });

    // Fallback: look for .m3u8 or .mp4 in raw HTML
    const regex = /(https?:\/\/[^\s"']+\.(m3u8|mp4))/gi;
    let matches;
    while ((matches = regex.exec(html)) !== null) {
      sources.push(matches[1]);
    }

    sources = [...new Set(sources)]; // dedupe

    if (sources.length === 0) {
      return res.status(404).send("No video sources found 😢");
    }

    // Build a clean player HTML
    const playerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Clean Video Player</title>
        <style>
          body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
          video { width: 100%; height: auto; max-height: 100vh; }
        </style>
      </head>
      <body>
        <video controls autoplay>
          ${sources.map(src => `<source src="${src}" />`).join("\n")}
        </video>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(playerHtml);
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error: " + err.message);
  }
            }
