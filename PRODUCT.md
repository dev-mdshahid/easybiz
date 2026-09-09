# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: a Bangladesh seller running a Pathao COD shop (one or more businesses), opening EasyBiz to check the books in Taka. Confirmed job on Dashboard: see period profit and whether the shop is solvent right now (cash, stock, unpaid loans) in the same glance.

## Product Purpose

EasyBiz turns Pathao paid-invoice CSVs plus opening cash/stock, recipes, expenses, and loans into a live picture of payout, profit, cash, inventory, and what is owed. Success is trusting the numbers enough to know whether the period made money and whether the shop can pay for stock, bills, and loans today.

## Positioning

Books that start from Pathao’s paid-invoice CSV and a cost recipe, then follow cash on a Dhaka calendar (payouts land two days after consignment date; stock leaves on consignment date). Neighboring generic accounting tools do not model that courier settlement.

## Operating Context

Authenticated web app with a sidebar, business switcher, and Dhaka timezone. Typical loop: upload a Pathao CSV, set opening cash and stock, maintain product-cost recipe in Settings, log expenses and loans, then read Dashboard. Currency is Bangladeshi Taka (৳).

## Capabilities and Constraints

- Dashboard must keep real figures accurate: operating profit, net payout, collected, Pathao fees, return fees, recipe costs, logged expenses, deliveries/returns counts, average collected, cash on hand, stock on hand, unpaid loans.
- Opening cash and opening stock remain editable; liabilities remain reachable.
- Period filters: All time, This month, Last 30 days.
- Empty states: no business yet, or no invoices yet.
- Duplicate Pathao vs Statement lists may be cut; recent uploads may be demoted or relocated.
- Do not invent customers, benchmarks, or claims the product does not compute.

## Brand Commitments

Product name: EasyBiz. Voice is plain operational English. No separate marketing identity was pinned. Dashboard layout and styles may change; other routes keep working with the existing app chrome.

## Evidence on Hand

Live tenant data (screenshot of Dashboard with Pathao payouts, cash, stock, loans). No testimonials, press, or marketing assets. Future work must not fabricate them.

## Product Principles

- Profit of the period and solvency of the shop are co-equal jobs; neither is a footer.
- Every number on Dashboard is a book figure the seller can trace, not a decorative KPI.
- Charts exist to explain mix, volume, and how profit was made — not to decorate empty space.
- Courier settlement rules (Pathao, Dhaka dates, recipe) stay visible in copy and math.
- Cut anything that duplicates a figure without earning a new decision.
