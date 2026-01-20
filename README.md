# COS30045 Data Visualisation — Group 4

This repository contains the datasets, KNIME workflows, and a static web application used to explore and visualize Australian breath/drug test results and related fines.

## Overview
- Purpose: Explore trends in positive breath/drug tests, enforcement outcomes, fines, and jurisdictional differences.
- Workflow: Data preparation in KNIME → export cleaned CSVs → visualizations in a simple HTML/CSS/JS site.

## Tech Stack
- KNIME: Visual, reproducible data preparation and merging.
- Web: HTML, CSS, and JavaScript (custom chart scripts).
- Data: CSV files organized under `WebDesign/data`.

## Folder Structure
```
COS30045_Data_Visualisation/
├─ README.md
├─ total_positive_case_by_year.csv
├─ dataset/
├─ KNIME_Workflow/
│  ├─ BreathTests_TruongDangKien_104808648_Group4.knwf
│  ├─ DataExploration_FileBreathDrugTest_FileFines_Group4_TongDucTuTam.knwf
│  ├─ Drug_Test_Group_4_Dong_Nguyen_Gia_Huy.knwf
│  └─ MergedDataset_Group4_TongDucTuTam.knwf
└─ WebDesign/
	 ├─ index.html
	 ├─ fines.html
	 ├─ results.html
	 ├─ testing.html
	 ├─ README.md
	 ├─ PRESENTATION_QA_GUIDE.md
	 ├─ css/
	 │  └─ styles.css
	 ├─ data/
	 │  ├─ fines/
	 │  │  └─ enforcement_by_jurisdiction.csv
	 │  ├─ positive_cases/
	 │  │  ├─ total_fines_by_year_jurisdiction.csv
	 │  │  ├─ total_positive_case_by_age.csv
	 │  │  ├─ total_positive_case_by_year_by_jurisdiction.csv
	 │  │  ├─ total_positive_case_by_year.csv
	 │  │  └─ total_positive_case.csv
	 │  └─ positive_drug_cases/
	 │     ├─ drug_type_composition.csv
	 │     ├─ positive_cases_by_age.csv
	 │     ├─ sum_of_enforcement.csv
	 │     ├─ total_cases_by_year_jurisdiction.csv
	 │     ├─ total_cases_by_year.csv
	 │     └─ total_cases.csv
	 ├─ images/
	 └─ js/
			├─ bar_chart.js
			├─ fines_charts.js
			├─ fines_enforcement_heatmap.js
			├─ grouped_bar_chart.js
			├─ line_chart.js
			├─ load_data.js
			├─ main.js
			├─ pie_chart.js
			├─ stacked_bar_chart.js
			├─ testing_alcohol_vs_drug_line.js
			├─ testing_stacked_percentage.js
			├─ testing_state_ranking_bar.js
			├─ testing_total_bar_chart.js
			└─ results-charts/
				 ├─ age_bar_chart.js
				 ├─ australia_heatmap.js
				 ├─ drug_age_grouped_chart.js
				 ├─ drug_enforcement_stacked_chart.js
				 ├─ drug_type_bar_chart.js
				 ├─ enforcement_outcomes_chart.js
				 ├─ overall_positive_chart.js
				 ├─ positive_breath_chart.js
				 ├─ positive_drug_chart.js
				 ├─ positive_drug_jurisdiction_chart.js
				 └─ responsive_helper.js
```

## KNIME Workflows & Choice
- Workflows: Stored in `KNIME_Workflow` as `.knwf` packages for portability.
- Rationale for KNIME:
	- Visual, node-based ETL that is easy to review and share.
	- Reproducible pipelines for cleaning, merging, and transforming CSVs.
	- Smooth CSV import/export to feed the web visualizations.
	- Modular workflows enable quick iteration and merging across datasets.
- Opening: In KNIME Analytics Platform, use File → Open and select a `.knwf` file.

## Data
- Location: All inputs for the web app live under `WebDesign/data`.
- Groups:
	- `fines/`: Enforcement and fines by jurisdiction.
	- `positive_cases/`: Breath test positivity by age, year, and jurisdiction.
	- `positive_drug_cases/`: Drug test breakdowns by type, age, enforcement outcomes, and totals.
- Notes: Filenames are descriptive (e.g., `total_positive_case_by_year.csv`, `drug_type_composition.csv`).

## Web App
- Entry points: `WebDesign/index.html`, `WebDesign/fines.html`, `WebDesign/results.html`, `WebDesign/testing.html`.
- Styling: `WebDesign/css/styles.css`.
- Scripts: Chart logic in `WebDesign/js` and `WebDesign/js/results-charts` (each script focuses on one visualization).
- Data loading: `WebDesign/js/load_data.js` centralizes CSV loading for charts.

## Run Locally
Most browsers will block file-based CSV fetching; use a local server.

Option A: Python http.server
```
# From the repo root
python -m http.server 5500
# Then open http://localhost:5500/WebDesign/index.html
```

Option B: VS Code Live Server
- Open the `WebDesign` folder in VS Code.
- Use the Live Server extension to "Open with Live Server" on `index.html`.

## Workflow to Update Data
1. Edit/Run KNIME workflows in `KNIME_Workflow` to produce updated datasets.
2. Export cleaned CSVs and place them under the appropriate `WebDesign/data` subfolder.
3. Refresh the site; charts will reflect the new data.

## Contribution
- Add new datasets under `WebDesign/data` with clear, consistent naming.
- Implement new charts as separate JS modules in `WebDesign/js` or `WebDesign/js/results-charts`.
- Keep changes minimal and focused; update this README if structure evolves.

## Personal Contribution — Testing Results Page
- Scope: Implemented the testing results page to quickly compare and validate insights before finalizing charts.
- Files: `WebDesign/testing.html` and supporting scripts:
	- `WebDesign/js/testing_total_bar_chart.js`
	- `WebDesign/js/testing_state_ranking_bar.js`
	- `WebDesign/js/testing_alcohol_vs_drug_line.js`
	- `WebDesign/js/testing_stacked_percentage.js`
- Purpose: Provide a sandbox to experiment with chart types, scales, and data groupings for comparisons across years, jurisdictions, and case types.
- Data Sources: Uses CSVs from `WebDesign/data/positive_cases` and `WebDesign/data/positive_drug_cases`.

### Strengths
- Broad coverage of comparisons to surface patterns quickly.
- Modular scripts per chart to enable fast iteration.
- Clear separation of data loading and chart logic.

### Weak Points
- Too much information, may overload information that a person can perceive
- Lack of story telling
- Heatmap is not serving its purpose which is emphasizing
- There are too much interactions between charts
- Lack of complex chart

### Suggested Improvements
- Reduce information density per view; split into focused sections.
- Strengthen narrative: add context captions and guided sequences.
- Emphasize heatmap: refine color scales, add thresholds and annotations.
- Add smooth transitions for interactions (CSS transitions or D3 easing).
- Introduce more complex visuals where appropriate (stacked percentage, small multiples, ranking animations, Sankey for outcomes).

### Reference
- https://catalogue.data.infrastructure.gov.au/dataset/road-safety-enforcement-data