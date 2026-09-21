"""Apply one deliberate break to a brain colour family, and prove it landed.

    python3 scripts/mutate-colour-family.py temporal lightness 60

Step 2 of the self-improvement loop is "break it", and step 3 is "watch it go
red". A string replace that silently matches nothing skips both while looking
like step 3 passed — which is how a live guard was nearly recorded as dead
(docs/verification-lessons.md L-53). So this asserts that the edit changed the
line, and prints what it wrote.
"""
import re, sys
from pathlib import Path
key, field, value = sys.argv[1], sys.argv[2], sys.argv[3]
p = Path('src/data/brainAnatomy.js'); s = p.read_text()
block = re.search(r'const DETAIL_COLOR_FAMILY = \{.*?\n\};', s, re.S).group(0)
line = re.search(rf'^  {key}: \{{[^}}]*\}},$', block, re.M)
assert line, f'no {key} line'
edited = re.sub(rf'{field}: -?\d+', f'{field}: {value}', line.group(0), count=1)
assert edited != line.group(0), f'{field} on {key} did not change'
p.write_text(s.replace(line.group(0), edited, 1))
print(f'  applied: {edited.strip()}')
import re, sys
from pathlib import Path
key, field, value = sys.argv[1], sys.argv[2], sys.argv[3]
p = Path('src/data/brainAnatomy.js'); s = p.read_text()
block = re.search(r'const DETAIL_COLOR_FAMILY = \{.*?\n\};', s, re.S).group(0)
line = re.search(rf'^  {key}: \{{[^}}]*\}},$', block, re.M)
assert line, f'no {key} line'
edited = re.sub(rf'{field}: -?\d+', f'{field}: {value}', line.group(0), count=1)
assert edited != line.group(0), f'{field} on {key} did not change'
p.write_text(s.replace(line.group(0), edited, 1))
print(f'  applied: {edited.strip()}')
