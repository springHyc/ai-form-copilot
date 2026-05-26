# Fill From Pasted Text Baseline Record

English | [简体中文](./paste-fill-baseline-record.md)

> Goal: validate the "prefer leaving fields empty over filling incorrectly" strategy on real target pages, and keep a comparable baseline.
> Record date: 2026-04-23

## Metrics

- Auto-fill rate = number of auto-filled fields / total number of mapped fields
- Skipped rate = number of skipped fields / total number of mapped fields
- Incorrect-fill rate = number of fields judged incorrect by manual review / number of auto-filled fields
- Classification hit level = the actual auto-selected level for `Issue type & category` (levels 1 to 4)

## Environment

- Page: create ticket page (complaint scenario)
- Browser: Chrome (extension loaded locally)
- Extension version: current unreleased workspace version

## Regression Sample Records (Backfilled)

| Sample ID | Text Type | Auto-fill Rate | Incorrect-fill Rate | Classification Level | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| S1 | Multiple phone numbers, including a collection phone number, plus source port and product/funder information | 5/9 (55.56%) | Not recorded | Not recorded | Summary: average confidence 54%, 4 low-confidence items. Top 3 skip reasons: source, port, and product did not match. |
| S2 | Single phone number, ID-card string, complaint, source port, and product/funder information | 5/9 (55.56%) | Not recorded | Not recorded | Summary: average confidence 51%, 5 low-confidence items. Top 3 skip reasons: source, port, and product did not match. |
| S3 | Single phone number plus structured key-value data for ticket source, port, product, and funder | 5/9 (55.56%) | Not recorded | Not recorded | Summary: average confidence 54%, 4 low-confidence items. Top 3 skip reasons: source, port, and product did not match. |
| S4 | Single phone number plus semantic hints about collection consultation / stopping collection and structured key-value data | 5/9 (55.56%) | Not recorded | Not recorded | Summary: average confidence 54%, 4 low-confidence items. Top 3 skip reasons: source, port, and product did not match. |

## Initial Baseline Conclusion (Real Page Data Backfilled)

- Automated tests: `npm test` passed (53/53)
- Build verification: `build:background`, `build:popup`, and `build:content` passed
- Real page baseline: 4 sample groups were executed and backfilled

## Post-regression Conclusion (This Round)

- Average auto-fill rate: 5/9 (55.56%)
- Average incorrect-fill rate: not recorded. Add manual review counts in the next round.
- Average classification stop level: not recorded. Record the exact level in future regressions.
- Top 3 skip reasons: source candidate did not match a valid option; port candidate did not match a valid option; product candidate did not match a valid option
- Average confidence: 53.25%
- Whether it satisfies "prefer leaving fields empty over filling incorrectly": preliminarily yes. The observed behavior is stable skipping rather than aggressive incorrect filling.

## Iteration Log (Paste Fill / Select)

### 2026-04-23: Product Name Searchable Select in antd@4: Fix for "Looks Filled but Is Not Selected"

- **Symptom from user screenshot**: the form item is a searchable **Select**. Text such as "Letong Installment" appeared in the control, but the red border and "Please select" validation remained. In other words, **search input state is not the same as selecting an option**, and the form value had not been submitted.
- **Cause summary**: when only the search term has been typed, dispatching **Enter** to `rc-select` / antd@4 may close the dropdown too early. If the dropdown **menu item** is not actually clicked to submit the selection, the field can look filled while validation still treats it as unselected.
- **Implementation changes** (`src/content/antd-adapter.ts`):
  - **`tryTypeSelectSearch`**: now only writes the search term into the search box and triggers `input` / `change` events with `setNativeValue`. It no longer simulates Enter during search.
  - **`fillSelect`**: after each candidate click, it polls the real selected value via **`.ant-select-selection-item`** (antd 5) or **`.ant-select-selection-selected-value`** (antd 4). The value must be non-placeholder text and match the target value. In `random` mode, it must leave the placeholder state. If the condition is not met, the function waits or retries instead of returning success too early.
  - **antd 4 dropdowns**: prefer clicking **`.ant-select-dropdown-menu-item-content`**. Highlighted item paths also converge to this target, matching real user selection more closely.
- **Automation**: `src/__tests__/failure-cases.test.ts` added regressions such as "antd4 searchable Select must click menu-item to submit". The workspace **`npm test` passed**.
- **Build**: **`npm run build:content`** passed. The extension needs to be reloaded or the page refreshed before retesting on a real page.
- **Manual retest**: user feedback was **"This works now"**. Product name and other searchable Select fields can now be reliably selected and submitted, instead of stopping with only search-box text.
