#!/usr/bin/env python3
import re, os

files = [
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
    'c:/TerraNode/frontend/src/components/Common/LoadingSkeleton.tsx',
    'c:/TerraNode/frontend/src/components/Layout/DashboardLayout.css',
    'c:/TerraNode/frontend/src/components/Common/Toast.css',
    'c:/TerraNode/frontend/src/pages/AuthPage.css',
    'c:/TerraNode/frontend/src/components/Forms/LoginForm.css',
    'c:/TerraNode/frontend/src/components/Common/LoadingSkeleton.css',
    'c:/TerraNode/frontend/src/components/Common/EmptyState.css',
    'c:/TerraNode/frontend/src/components/Layout/Sidebar.css',
    'c:/TerraNode/frontend/src/components/Layout/TopBar.css',
    'c:/TerraNode/frontend/src/api/client.ts',
    'c:/TerraNode/frontend/src/api/auth.ts',
]

for path in files:
    if not os.path.exists(path):
        print('MISSING', path)
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    out = []
    i = 0
    n = len(content)
    changed = False
    while i < n:
        c = content[i]
        if c == '{':
            j = i + 1
            depth = 1
            while j < n and depth > 0:
                cj = content[j]
                if cj == '{':
                    depth += 1
                elif cj == '}':
                    depth -= 1
                j += 1
                if depth == 0:
                    break
            if depth == 0:
                out.append(content[i:j])
                i = j
                continue
            else:
                k = i + 1
                while k < n and content[k] != '<':
                    if content[k] != ' ' and content[k] != '\n' and content[k] != '\t':
                        pass
                    k += 1
                if k < n and content[k] == '<':
                    out.append(content[i:k])
                    out.append('}')   # < -- the missing closing brace
                    i = k
                    changed = True
                else:
                    out.append(content[i:])
                    i = n
        else:
            out.append(c)
            i += 1

    new_content = ''.join(out)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('FIXED', os.path.basename(path))
    else:
        print('OK', os.path.basename(path))