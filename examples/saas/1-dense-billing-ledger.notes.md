# Dense billing ledger

**Idea:** Table-first home for the finance analyst who checks everything every morning: a five-number strip, MRR trend beside its movement bridge, failed payments and renewals side by side, and the top-10 customer table, all at 40px rows so nothing needs a scroll to compare.

**Critic notes:**

- R4/R12: failed-payments table wrapped every cell into two lines at 7/12 width; merged invoice id into the customer cell, shortened "next retry", set nowrap so rows hold the 40px dashboard row height.
- R2: seven accent "Retry" links made the table the most orange thing on the page; replaced with neutral bordered row buttons so the accent stays on Export, active nav, MRR figure and the section links.
- R4: renewal dates wrapped ("Nov / 21"); widened the date column and stopped wrapping so dates, names and ARR sit on three clean lines.
- R3/R4: MRR chart card had dead space under the chart and the last x-label "Nov" was clipped; chart now fills the card height to match the movement table and has right padding.
- R5: sidebar user line shortened to "Finance lead" (wrapped before).
- R4: after nowrap the failed table overflowed into the renewals card; both card rows now share one 8/4 split (one set of vertical lines), invoice ids dropped from this summary, next-step copy shortened, renewal notes dropped so date/name/ARR fit the narrow column.
- R12: starting MRR moved into the movement header to keep all 10 customer rows on a 1400px screen.

