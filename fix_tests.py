import re

with open('src/lib/__tests__/direct-auth.test.ts', 'r') as f:
    content = f.read()

# Replace .toBeUndefined() with .toBeNull() for localStorage assertions
# The pattern: ).toBeUndefined() -> ).toBeNull()
content = content.replace(').toBeUndefined()', ').toBeNull()')

with open('src/lib/__tests__/direct-auth.test.ts', 'w') as f:
    f.write(content)
print('Done')
