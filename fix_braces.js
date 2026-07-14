#!/usr/bin/env node
// fix_braces.js - Insert missing } before <tags in JSX expressions

const fs = require('fs');
const path = require('path');

const files = [
    'c:/TerraNode/frontend/src/components/Common/EmptyState.tsx',
    'c:/TerraNode/frontend/src/components/Common/Toast.tsx',
    'c:/TerraNode/frontend/src/components/Layout/DashboardLayout.tsx',
    'c:/TerraNode/frontend/src/components/Layout/Sidebar.tsx',
    'c:/TerraNode/frontend/src/components/Layout/TopBar.tsx',
    'c:/TerraNode/frontend/src/guards/RoleGuard.tsx',
    'c:/TerraNode/frontend/src/pages/LoginPage.tsx',
    'c:/TerraNode/frontend/src/pages/RegisterPage.tsx',
    'c:/TerraNode/frontend/src/pages/farmer/FarmerDashboard.tsx',
    'c:/TerraNode/frontend/src/pages/logistics/LogisticsDashboard.tsx',
    'c:/TerraNode/frontend/src/pages/admin/AdminDashboard.tsx',
    'c:/TerraNode/frontend/src/components/Forms/LoginForm.tsx',
    'c:/TerraNode/frontend/src/components/Forms/RegisterForm.tsx',
    'c:/TerraNode/frontend/src/contexts/AuthContext.tsx',
    'c:/TerraNode/frontend/src/App.tsx',
];

for (const filepath of files) {
    if (!fs.existsSync(filepath)) {
        console.log('MISSING', filepath);
        continue;
    }
    let content = fs.readFileSync(filepath, 'utf8');
    const original = content;
    let changed = false;
    const lines = content.split('\n');
    const newLines = [];
    for (const line of lines) {
        // For each line, find JSX expressions like {varname followed by <tag> on same line
        // and insert } before the tag.
        // Pattern: {identifier< (immediate < after identifier, no closing brace)
        const exprMatch = line.match(/^(\s*\{)([a-zA-Z_$][a-zA-Z0-9_$.]*)((?:\??\&?\.?)*)(\s*)(<)/);
        if (exprMatch) {
            // Check there's NO closing } before the <
            const before = line.substring(0, exprMatch.index + exprMatch[0].length);
            // Count unclosed { in before
            let depth = 0;
            let hasClose = false;
            for (const ch of before) {
                if (ch === '{') depth++;
                else if (ch === '}') { depth--; if (depth === 0) hasClose = true; }
            }
            if (depth > 0 && !hasClose) {
                // Missing closing }
                // Insert } right before the <
                const insertAt = line.indexOf('<', exprMatch.index);
                const newLine = line.slice(0, insertAt) + '}' + line.slice(insertAt);
                newLines.push(newLine);
                changed = true;
                continue;
            }
        }
        newLines.push(line);
    }
    const newContent = newLines.join('\n');
    if (newContent !== original) {
        fs.writeFileSync(filepath, newContent, 'utf8');
        console.log('FIXED', path.basename(filepath));
    } else {
        console.log('OK', path.basename(filepath));
    }
}