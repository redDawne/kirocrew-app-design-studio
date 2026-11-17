# Next habit first

**Idea:** A focused screen: the one habit due next fills a card with its progress, streak and a single Mark as done button, the rest of today is a short timed list, and a habits-by-day grid gives the week at a glance; assumes habits have a due time.

**Critic notes:**

Bug: four rows of the week grid had 8 cells and wrapped into broken squares -> every row is exactly 7 days, today open shown as an outlined cell. R12: screen overflowed under the bottom nav -> card padding 16px, Skip moved to a text link beside the overline so Mark as done is the single full-width primary, grid rows 20px. R11: Later-today circles border-muted inside 44px buttons. Status time no longer mono. Wrapper: dropped mx-auto (headless 500px-wide render bug).
