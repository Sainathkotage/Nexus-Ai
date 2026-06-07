import os

search_dir = r"c:\Users\srush\Desktop\Nexus AI\nexus-ai\src"
target_words = ["project_members", "workspace_members", "projects", "workspaces", "workspace_invites", "invitations"]

results = {word: [] for word in target_words}

for root, dirs, files in os.walk(search_dir):
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for word in target_words:
                        if word in content:
                            results[word].append(os.path.relpath(path, search_dir))
            except Exception as e:
                pass

print("=== Search Results ===")
for word, occurrences in results.items():
    print(f"{word}: found in {len(occurrences)} files: {occurrences[:10]}")
