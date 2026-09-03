import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const delay = ms => new Promise(res => setTimeout(res, ms));

    const login = async (email, password) => {
        await page.goto('http://localhost:5173/login');
        await delay(1000);
        await page.type('input[type="email"]', email);
        await page.type('input[type="password"]', password);
        await page.keyboard.press('Enter');
        await delay(2000);
    };

    console.log("Taking landing page...");
    await page.goto('http://localhost:5173/');
    await delay(1000);
    await page.screenshot({ path: 'C:/TerraNode/latex-report/figures/fig_landing_page.png' });

    console.log("Taking register page...");
    await page.goto('http://localhost:5173/register');
    await delay(1000);
    await page.screenshot({ path: 'C:/TerraNode/latex-report/figures/fig_register_page.png' });

    console.log("Taking login page...");
    await page.goto('http://localhost:5173/login');
    await delay(1000);
    await page.screenshot({ path: 'C:/TerraNode/latex-report/figures/fig_login_page.png' });

    // Farmer
    console.log("Logging in as Farmer...");
    await login('iskartommy117@gmail.com', 'TerraNode2026!');
    console.log("Taking farmer dashboard...");
    await page.goto('http://localhost:5173/farmer');
    await delay(2000);
    await page.screenshot({ path: 'C:/TerraNode/latex-report/figures/fig_farmer_dashboard.png' });
    
    console.log("Taking telemetry page...");
    await page.goto('http://localhost:5173/farmer/telemetry');
    await delay(1000);
    await page.screenshot({ path: 'C:/TerraNode/latex-report/figures/fig_telemetry_page.png' });
    
    console.log("Taking batches page...");
    await page.goto('http://localhost:5173/farmer/batches');
    await delay(1000);
    await page.screenshot({ path: 'C:/TerraNode/latex-report/figures/fig_mint_batch_page.png' });

    console.log("Logging out...");
    // Just clear localStorage to log out
    await page.evaluate(() => localStorage.clear());

    // Logistics
    console.log("Logging in as Logistics...");
    await login('logistics@terranode.agri', 'TerraNode2026!');
    console.log("Taking logistics dashboard...");
    await page.goto('http://localhost:5173/logistics');
    await delay(2000);
    await page.screenshot({ path: 'C:/TerraNode/latex-report/figures/fig_logistics_dashboard.png' });
    
    console.log("Taking transfer page...");
    await page.goto('http://localhost:5173/logistics/transfer');
    await delay(1000);
    await page.screenshot({ path: 'C:/TerraNode/latex-report/figures/fig_transfer_page.png' });

    console.log("Logging out...");
    await page.evaluate(() => localStorage.clear());

    // Admin
    console.log("Logging in as Admin...");
    await login('admin@terranode.agri', 'TerraNode2026!');
    console.log("Taking admin dashboard...");
    await page.goto('http://localhost:5173/admin');
    await delay(2000);
    await page.screenshot({ path: 'C:/TerraNode/latex-report/figures/fig_admin_dashboard.png' });
    
    console.log("Taking audit logs page...");
    await page.goto('http://localhost:5173/admin/logs');
    await delay(1000);
    await page.screenshot({ path: 'C:/TerraNode/latex-report/figures/fig_audit_logs_page.png' });

    await browser.close();
    console.log("Done.");
})();
