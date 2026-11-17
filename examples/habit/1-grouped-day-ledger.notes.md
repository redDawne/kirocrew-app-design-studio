# Grouped day ledger

**Idea:** A utilitarian checklist grouped by time of day, with a 7-day completion strip and right-aligned streak counts, for people who just want to tick and go; assumes habits carry a time-of-day slot.

**Critic notes:**

R11: open check circles were border-line (barely visible on white) -> border-muted, and each check is now a 44px button with focus ring. R5/R7: '23 d' streak column was cryptic -> small Lucide flame icon + mono number. Weekly strip: added a 4px completion bar under each day's fraction so the week scans without reading numbers. Status bar time no longer mono. Wrapper: dropped mx-auto because headless render is 500px wide and centring shifted the screen 55px right (tool bug).
