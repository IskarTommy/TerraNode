import os
import glob

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = content
    for old, new in replacements:
        new_content = new_content.replace(old, new)
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

# Update .env and .env.example
env_files = ['backend/.env', 'backend/.env.example']
for f in env_files:
    path = os.path.join('c:\\TerraNode', f)
    if os.path.exists(path):
        replace_in_file(path, [
            ('postgres://postgres:postgres@localhost:5432/terranode', 'sqlite:///db.sqlite3'),
            ('postgres://neon_user:neon_password@ep-cold-shadow-123456.us-east-2.aws.neon.tech/neondb', 'sqlite:///db.sqlite3')
        ])

# Update .md files
md_files = glob.glob('c:\\TerraNode\\*.md')
md_replacements = [
    ('PostgreSQL', 'SQLite'),
    ('postgres', 'sqlite'),
    ('Postgres', 'SQLite')
]
for path in md_files:
    replace_in_file(path, md_replacements)

# Update artifacts
artifact_dir = r"C:\Users\Iskanda\.gemini\antigravity-ide\brain\5e7d807c-2232-43d4-80ac-446f64a1e4f5"
for path in glob.glob(os.path.join(artifact_dir, '*.md')):
    replace_in_file(path, md_replacements)

print("Finished swapping to SQLite.")
