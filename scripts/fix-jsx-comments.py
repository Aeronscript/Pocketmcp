import re
import sys

files = [
    "/home/z/my-project/src/components/pocketmcp/dashboard.tsx",
    "/home/z/my-project/src/components/pocketmcp/setup-guide.tsx",
    "/home/z/my-project/src/components/pocketmcp/tools.tsx",
    "/home/z/my-project/src/components/pocketmcp/bridge.tsx",
    "/home/z/my-project/src/components/pocketmcp/faq.tsx",
    "/home/z/my-project/src/components/pocketmcp/hero.tsx",
]

for fpath in files:
    with open(fpath, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        stripped = line.lstrip()
        # Only wrap if it's a // comment that's NOT a URL (no ://)
        if stripped.startswith('//') and '://' not in stripped and not stripped.startswith('///'):
            indent = line[:len(line) - len(stripped)]
            new_lines.append(f'{indent}{{"{stripped}"}}')
        else:
            new_lines.append(line)
    
    with open(fpath, 'w') as f:
        f.write('\n'.join(new_lines))

print("done")
