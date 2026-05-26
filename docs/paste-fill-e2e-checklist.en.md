# Fill From Pasted Text E2E Manual Verification Checklist

## Prerequisites

- Open the target ticket page and make sure the latest `dist/` version of the extension is loaded.
- In the Popup, click "Scan" and confirm that fields are detected correctly.
- Paste the sample text below and run "Fill from pasted text".

## Case 1: One Phone Number Fills Two Fields

- The input text contains only one phone number.
- Expected:
  - `Incoming phone number` is filled.
  - `Registered phone number` is filled and equals `Incoming phone number`.

## Case 2: Conservative Strategy for Multiple Phone Numbers

- The input text contains 3 phone numbers, including a collection phone number.
- Expected:
  - `Incoming phone number` is filled with the most credible phone number.
  - `Registered phone number` may remain empty if it cannot be distinguished. It must not be incorrectly filled with the collection phone number.

## Case 3: Product-to-Funder Linkage

- The text contains product and funder tokens.
- Expected:
  - In the first phase, `Product name` is filled first.
  - After linkage, the plugin tries to fill `Funder`, but only fills it when a valid option is matched.
  - If no valid option is matched, the field remains empty instead of selecting randomly.

## Case 4: Issue Type & Category Stop Level

- The text contains both "violent collection" and "contacting family or friends".
- Expected:
  - Classification reaches at least level 3 (`... > Collection complaint`).
  - If level-4 leaf categories conflict, the selection stops at level 3 instead of forcing a leaf option.

## Case 5: Level-4 Match for Negotiated Repayment

- The text contains semantics such as "negotiated repayment / stop collection / already agreed to execute".
- Expected:
  - The classification path can match level 4: `Overdue negotiated repayment`.

## Case 6: Prefer Empty Over Wrong Regression

- The text is missing source, port, and funder information.
- Expected:
  - The corresponding fields remain empty.
  - High-confidence fields such as content and phone numbers are still filled.
