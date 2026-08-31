const fs = require('fs');
const path = require('path');
const { chromium } = require('c:/TerraNode/frontend/node_modules/playwright');

const figuresDir = path.resolve(__dirname);

const diagrams = [
  { svg: 'fig_conceptual_framework.svg', png: 'fig_conceptual_framework.png', width: 1240, height: 670 },
  { svg: 'fig_system_architecture.svg', png: 'fig_system_architecture.png', width: 1100, height: 860 },
  { svg: 'fig_dfd_level0.svg', png: 'fig_dfd_level0.png', width: 1100, height: 700 },
  { svg: 'fig_dfd_level1.svg', png: 'fig_dfd_level1.png', width: 1100, height: 780 },
  { svg: 'fig_er_diagram.svg', png: 'fig_er_diagram.png', width: 1100, height: 740 },
  { svg: 'fig_use_case.svg', png: 'fig_use_case.png', width: 1100, height: 760 },
  { svg: 'fig_batch_lifecycle.svg', png: 'fig_batch_lifecycle.png', width: 1100, height: 720 },
  { svg: 'fig_auth_flow.svg', png: 'fig_auth_flow.png', width: 1100, height: 740 },
  { svg: 'fig_prediction_analytics.svg', png: 'fig_prediction_analytics.png', width: 1100, height: 680 },
  { svg: 'fig_crypto_pipeline.svg', png: 'fig_crypto_pipeline.png', width: 1100, height: 640 },
  { svg: 'fig_blockchain_comparison.svg', png: 'fig_blockchain_comparison.png', width: 1100, height: 600 }
];

async function render() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });
  
  for (const item of diagrams) {
    const svgPath = path.join(figuresDir, item.svg);
    const pngPath = path.join(figuresDir, item.png);
    
    if (!fs.existsSync(svgPath)) {
      console.warn(`SVG not found: ${svgPath}`);
      continue;
    }
    
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #ffffff; display: flex; align-items: center; justify-content: center; width: ${item.width}px; height: ${item.height}px; overflow: hidden; }
          svg { width: 100%; height: 100%; display: block; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
      </html>
    `;
    
    const context = await browser.newContext({
      viewport: { width: item.width, height: item.height },
      deviceScaleFactor: 2 // Crisp 2x retina/print resolution
    });
    
    const page = await context.newPage();
    await page.setContent(html);
    await page.waitForTimeout(200);
    await page.screenshot({ path: pngPath, type: 'png' });
    console.log(`Successfully rendered: ${item.png} (${item.width * 2}x${item.height * 2}px)`);
    await context.close();
  }
  
  await browser.close();
  console.log('All diagrams successfully rendered to high-resolution PNG!');
}

render().catch(err => {
  console.error('Error rendering SVGs:', err);
  process.exit(1);
});
