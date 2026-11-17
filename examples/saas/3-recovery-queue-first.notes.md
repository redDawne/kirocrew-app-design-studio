# Recovery queue first

**Idea:** Focused on the one job that loses money if ignored: failed payments open as a selectable queue with retry and card-update actions and a detail panel for the selected invoice, while MRR movement is compressed to a one-line context bar and customers sit below.

**Critic notes:**

- R4/R12: MRR context bar wrapped ("Net new, / Nov", "-" split from "$6,310"); cut it to MRR+sparkline, net new, gained, lost, all nowrap.
- R4: tabs and bulk actions shared one row, so "Failed payments", "Upcoming renewals" and "Retry now" all wrapped to two lines; split into a tab row and a toolbar row (sort note left, selection + actions right).
- R11: selected checkbox was a filled accent square with no tick; added an inline SVG check so selection does not rely on colour alone.
- R3/R5: queue card had ~120px of dead space next to the taller detail panel; added a recovery footer (recovered $41,870 of $65,288 failed, 64%) which is real context for a dunning queue.
- R5: sidebar user line shortened to "Finance lead".
- R1: recovery footer text was broken into gappy flex items; now one sentence.

