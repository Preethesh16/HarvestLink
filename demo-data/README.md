# Upload data

Participant, harvest and consumption rows are **synthetic**. CSV histories are generated with seed 42. No real farmers or restaurants are represented. Run `make demo-data` to regenerate dates relative to today.

| File | Import into | Meaning |
| --- | --- | --- |
| farmer-harvest.csv | Farmer / harvest import | Available kilograms, asking price, variety, grade and dates |
| r1-inventory.csv | The Green Table / inventory | Batches currently on hand |
| r2-inventory.csv | Coastal Kitchen / inventory | Batches currently on hand |
| r3-inventory.csv | Roots & Grains / inventory | Batches currently on hand |
| r1-consumption.csv (and r2/r3) | Corresponding restaurant / consumption | Ninety completed days of ingredient use, distinct from waste |

Units are kilograms; asking prices are INR per kg. Dates use YYYY-MM-DD. `stockout` accepts true/false or 1/0. A stockout flag means measured usage may underestimate demand. `usable_until` is an inventory planning estimate, not certification that food is safe.

Imports validate every row before saving any. By default harvest and inventory imports append; consumption rejects duplicate crop/date pairs. The preloaded demo already contains these histories, so importing the same full history again without replacement will correctly fail. Restaurant imports support an explicit replace option to replace that workspace’s inventory or history atomically; invalid rows preserve the previous dataset. Downloadable templates contain fresh sample rows and current dates. Never import the same inventory repeatedly unless you intend to add additional physical stock.

Forecasting currently demonstrates Tomato; additional crop listings and inventory are supported, but per-crop forecast expansion is not claimed. See the main README for operating modes.

## Excel upload and official reference

`farmer-harvest.xlsx` contains four harvest rows: Tomato, Cucumber, Okra and Brinjal. Open it in Excel or LibreOffice, then upload through **My harvest → Import Excel / CSV**. Preview the rows, then choose **Validate & import**. Templates can be downloaded inside either role. Workbooks must contain values only with exact template headers; formulas, macros, extra columns and over 1,000 rows are rejected. Imports append harvest lots, so avoid uploading the same physical stock twice.

`government-prices.json` is **not synthetic**: it records the public [Agmarknet homepage](https://agmarknet.gov.in/home) table retrieved in the browser on21 October 2026. Its latest reporting date is19 October 2026. Filters cover all states/markets and FAQ grade. The 24 published commodities are national dashboard aggregates, not local Mangaluru quotations. Original prices are INR/quintal; the UI divides by 100 for INR/kg. Cucumber, Okra and Brinjal were absent and are shown as unavailable. This checked-in snapshot does not automatically refresh; the page links to the government’s latest report.
