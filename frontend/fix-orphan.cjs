const fs = require("fs");
const p = "src/pages/HomePage.tsx";
let c = fs.readFileSync(p, "utf8");

// Remove the two orphan lines left from deleted @keyframes float
// Lines 116-117: "  50% { transform: translateY(-18px); }" and " }"
c = c.replace(/^\s+50% \{ transform: translateY\(-18px\); \}\n\s+\}\n/m, "");

fs.writeFileSync(p, c);
console.log("Removed orphan float keyframe lines");
