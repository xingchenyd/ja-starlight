# JA governance implementation plan

## Goal

Make JA operations enforce the agreed review ownership in both API behavior and the console UI.

## Work items

1. Define and test publisher ownership rules: JA registrations belong only to `ja:*`; enterprise registrations belong only to the exact enterprise owner.
2. Restrict the JA publication review queues to JA activities, enterprise activities, and enterprise content. Jobs and JA-authored content never enter those queues.
3. Add a dedicated JA activity-registration workspace with status/search filters, accessible detail review, batch decisions, rejection reasons, and UTF-8 CSV export.
4. Route student registration notifications to the correct reviewer and create certified growth experiences only after the rightful publisher approves.
5. Verify JA routes, build/lint, and browser behavior before the final three-role regression.
