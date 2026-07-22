const fs = require("fs");
const p = "src/pages/HomePage.tsx";
let c = fs.readFileSync(p, "utf8");

// 1. Remove @keyframes float block (inside <style>)
c = c.replace(
  /@keyframes float \{[^}]+\}[ \t]*\n?/,
  ""
);

// 2. Remove the three old ambient glow orbs (lines ~133 to ~159)
const orbComment = "/* Ambient glow orbs */}";
const liveBadge = "{/* Live badge */}";
const orbStart = c.indexOf(orbComment);
const liveStart = c.indexOf(liveBadge);
if (orbStart >= 0 && liveStart >= 0) {
  c = c.substring(0, orbStart) + c.substring(liveStart);
}

// 3. Add the two new glow divs right after the wrapper <div> opens (after first >)
// Find the opening of the main wrapper: position: "relative" ... >
const relPos = c.indexOf('position: "relative"');
const wrapperClose = c.indexOf(">", relPos) + 1;
const insertHTML = `{/* Ambient glow blobs */}
<div className="absolute top-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
<div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
`;
c = c.substring(0, wrapperClose) + insertHTML + c.substring(wrapperClose);

fs.writeFileSync(p, c);
console.log("Done!");
