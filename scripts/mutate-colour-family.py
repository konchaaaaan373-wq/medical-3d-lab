"""Apply one deliberate break to a brain colour family, and prove it landed.

    python3 scripts/mutate-colour-family.py temporal chroma 38

Step 2 of the self-improvement loop is "break it" and step 3 is "watch it go
red". A string replace that silently matches nothing skips both while looking
like step 3 passed, which is how a live guard was nearly recorded as dead
(docs/verification-lessons.md L-53). So this edits the line by regex and
asserts that the line changed before writing anything.
"""
import re
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(__doc__)
key, field, value = sys.argv[1], sys.argv[2], sys.argv[3]

path = Path('src/data/brainAnatomy.js')
source = path.read_text()
block = re.search(r'const DETAIL_COLOR_FAMILY = \{.*?\n\};', source, re.S)
assert block, 'DETAIL_COLOR_FAMILY not found'
line = re.search(rf'^  {re.escape(key)}: \{{[^}}]*\}},$', block.group(0), re.M)
assert line, f'no colour family called {key}'
edited = re.sub(rf'\b{re.escape(field)}: -?\d+', f'{field}: {value}', line.group(0), count=1)
assert edited != line.group(0), f'{field} on {key} is already {value}, or is not a field'
path.write_text(source.replace(line.group(0), edited, 1))
print(f'applied: {edited.strip()}')
