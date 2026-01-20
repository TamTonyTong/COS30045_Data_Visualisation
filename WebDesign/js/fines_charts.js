// js/fines_charts.js

// Path to the Excel file
const FINES_DATA_URL = 'data/police_enforcement_2024_fines_TAMTONG.xlsx';

// Load Excel file and convert to JSON array
async function loadFinesData() {
    const response = await fetch(FINES_DATA_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch Excel file: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON, keeping empty cells as null
    const json = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    // Expected columns:
    // YEAR, START_DATE, END_DATE, JURISDICTION, LOCATION,
    // AGE_GROUP, METRIC, DETECTION_METHOD, FINES, ARRESTS, CHARGES

    // Clean / coerce numeric fields
    return json.map(row => ({
        YEAR: row.YEAR != null ? +row.YEAR : null,
        START_DATE: row.START_DATE,
        END_DATE: row.END_DATE,
        JURISDICTION: row.JURISDICTION,
        LOCATION: row.LOCATION,
        AGE_GROUP: row.AGE_GROUP,
        METRIC: row.METRIC,
        DETECTION_METHOD: row.DETECTION_METHOD,
        FINES: row.FINES != null ? +row.FINES : 0,
        ARRESTS: row.ARRESTS != null ? +row.ARRESTS : 0,
        CHARGES: row.CHARGES != null ? +row.CHARGES : 0
    }));
}

// Generic helper: show an error in all chart containers
function showFinesError(message) {
    const ids = [
        'offense-distribution-chart',
        'trends-chart',
        'detection-method-chart',
        'age-group-chart'
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #ef4444;">
                    <h3>⚠️ Unable to load fines data</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    });
}

function getOrCreateTooltip() {
    let tooltip = d3.select('body').select('.chart-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'rgba(0,0,0,0.9)')
            .style('color', '#ffffff')
            .style('padding', '12px 16px')
            .style('border-radius', '8px')
            .style('font-size', '13px')
            .style('pointer-events', 'none')
            .style('z-index', 1000)
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.35)')
            .style('max-width', '260px');
    }
    return tooltip;
}

// =================== CHART 1: Offense Type Distribution ===================

function renderOffenseDistribution(data) {
    console.log('Creating offense distribution chart with jurisdiction filter + tooltip...');

    const container = d3.select('#offense-distribution-chart');
    if (container.empty()) return;

    const jurisdictions = Array.from(
        new Set(
            data
                .map(d => d.JURISDICTION)
                .filter(d => d && d !== '')
        )
    ).sort();

    let selected = new Set(jurisdictions);

    container.html('');

    const filterCard = container
        .append('div')
        .attr('class', 'jurisdiction-filter-card');

    const filterHeader = filterCard
        .append('div')
        .attr('class', 'jurisdiction-filter-header');

    filterHeader
        .append('span')
        .attr('class', 'jurisdiction-filter-title')
        .text('Filter by Jurisdiction');

    const buttonsRow = filterCard
        .append('div')
        .attr('class', 'jurisdiction-filter-buttons');

    buttonsRow.append('button')
        .attr('type', 'button')
        .attr('class', 'jurisdiction-chip chip-select-all')
        .text('Select All')
        .on('click', () => {
            selected = new Set(jurisdictions);
            updateChipStates();
            renderChart();
        });

    buttonsRow.append('button')
        .attr('type', 'button')
        .attr('class', 'jurisdiction-chip chip-clear-all')
        .text('Clear All')
        .on('click', () => {
            selected = new Set();
            updateChipStates();
            renderChart();
        });

    const chipsRow = filterCard
        .append('div')
        .attr('class', 'jurisdiction-chip-row');

    const colorMap = {
        ACT: '#dc2626',
        NSW: '#2563eb',
        NT:  '#ea580c',
        QLD: '#7c3aed',
        SA:  '#059669',
        TAS: '#c026d3',
        VIC: '#0891b2',
        WA:  '#ca8a04'
    };

    const chips = chipsRow
        .selectAll('button.jurisdiction-chip.jur')
        .data(jurisdictions)
        .enter()
        .append('button')
        .attr('type', 'button')
        .attr('class', 'jurisdiction-chip jur active')
        .style('background-color', d => colorMap[d] || '#e5e7eb')
        .text(d => d)
        .on('click', function (event, d) {
            if (selected.has(d)) selected.delete(d);
            else selected.add(d);
            updateChipStates();
            renderChart();
        });

    function updateChipStates() {
        chips
            .classed('active', d => selected.has(d))
            .style('opacity', d => selected.has(d) ? 1 : 0.35);
    }

    const chartWrapper = container
        .append('div')
        .attr('class', 'jurisdiction-chart-wrapper');

    function renderChart() {
        chartWrapper.selectAll('*').remove();

        const filtered = data.filter(d =>
            selected.size === 0 ? false : selected.has(d.JURISDICTION)
        );

        const groupedMap = d3.rollup(
            filtered,
            v => d3.sum(v, d => +d.FINES || 0),
            d => d.METRIC
        );

        const grouped = Array.from(groupedMap, ([metric, value]) => ({ metric, value }))
            .filter(d => d.metric)
            .sort((a, b) => b.value - a.value);

        if (!grouped.length) {
            chartWrapper.append('div')
                .style('padding', '40px')
                .style('text-align', 'center')
                .style('color', '#6b7280')
                .text('No data to display. Select at least one jurisdiction.');
            return;
        }

        const margin = { top: 30, right: 150, bottom: 90, left: 80 };
        const width = 1000 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = chartWrapper
            .append('svg')
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(grouped.map(d => d.metric))
            .range([0, width])
            .padding(0.25);

        const y = d3.scaleLinear()
            .domain([0, d3.max(grouped, d => d.value) || 0])
            .nice()
            .range([height, 0]);

        svg.append('g')
            .call(
                d3.axisLeft(y)
                    .tickSize(-width)
                    .tickFormat('')
            )
            .selectAll('line')
            .attr('stroke', '#e5e7eb')
            .attr('stroke-dasharray', '3,3');

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-35)')
            .style('text-anchor', 'end')
            .style('font-size', '12px');

        svg.append('g')
            .call(d3.axisLeft(y).tickFormat(v => v.toLocaleString()));

        const palette = [
            '#2563eb', '#4f46e5', '#0ea5e9', '#22c55e',
            '#10b981', '#6366f1', '#38bdf8', '#f97316', '#fbbf24'
        ];
        const colorScale = d3.scaleOrdinal()
            .domain(grouped.map(d => d.metric))
            .range(palette);

        const total = d3.sum(grouped, d => d.value);
        const tooltip = getOrCreateTooltip();

        const bars = svg.selectAll('.bar')
            .data(grouped)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.metric))
            .attr('y', d => y(d.value))
            .attr('width', d => x.bandwidth())
            .attr('height', d => height - y(d.value))
            .attr('rx', 4)
            .attr('fill', d => colorScale(d.metric))
            .on('mouseover', function (event, d) {
                d3.select(this).attr('opacity', 0.9);
                const pct = total ? (d.value / total) * 100 : 0;
                const label = d.metric.replace(/_/g, ' ');
                tooltip.html(`
                    <div style="font-weight:700; margin-bottom:6px;">${label}</div>
                    <div><strong>Total fines:</strong> ${d.value.toLocaleString()}</div>
                    <div style="margin-top:4px; font-size:11px; color:#cbd5e1;">
                        Percentage of selected jurisdictions: ${pct.toFixed(1)}%
                    </div>
                `)
                .style('visibility', 'visible')
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 15) + 'px');
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 15) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).attr('opacity', 1);
                tooltip.style('visibility', 'hidden');
            });

        svg.selectAll('.bar-label')
            .data(grouped)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => x(d.metric) + x.bandwidth() / 2)
            .attr('y', d => y(d.value) - 8)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('fill', '#111827')
            .text(d => d.value.toLocaleString());

        const legend = svg.append('g')
            .attr('class', 'offense-legend')
            .attr('transform', `translate(${width + 20}, 10)`);

        legend.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .style('font-size', '12px')
            .style('font-weight', '700')
            .style('fill', '#111827')
            .text('Offense Types');

        const legendItems = legend.selectAll('.offense-legend-item')
            .data(grouped)
            .enter()
            .append('g')
            .attr('class', 'offense-legend-item')
            .attr('transform', (d, i) => `translate(0, ${18 + i * 18})`);

        legendItems.append('rect')
            .attr('x', 0)
            .attr('y', -10)
            .attr('width', 10)
            .attr('height', 10)
            .attr('rx', 2)
            .attr('fill', d => colorScale(d.metric));

        legendItems.append('text')
            .attr('x', 16)
            .attr('y', 0)
            .style('font-size', '11px')
            .style('fill', '#374151')
            .text(d => d.metric.replace(/_/g, ' '));
    }

    updateChipStates();
    renderChart();
}

// =================== CHART 2: Trends Over Time ===================
function renderTrendsOverTime(data) {
    const containerId = 'trends-chart';
    const container = d3.select(`#${containerId}`);
    if (container.empty()) return;

    // ---- Prep data: sum FINES by YEAR ----
    const series = Array.from(
        d3.rollup(
            data.filter(d => d.YEAR != null),
            v => d3.sum(v, d => d.FINES),
            d => d.YEAR
        ),
        ([year, totalFines]) => ({ year: +year, totalFines })
    )
        .filter(d => !isNaN(d.year))
        .sort((a, b) => a.year - b.year);

    container.selectAll('*').remove();

    // ---- Layout (same as Overall Positive chart) ----
    const margin = { top: 60, right: 80, bottom: 80, left: 100 };
    const width = 1200 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = container
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // ---- Tooltip (floating black box) ----
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'chart-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'rgba(0,0,0,0.9)')
        .style('color', '#ffffff')
        .style('padding', '12px 16px')
        .style('border-radius', '8px')
        .style('font-size', '13px')
        .style('pointer-events', 'none')
        .style('z-index', 1000)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.35)')
        .style('max-width', '260px');

    // ---- Scales ----
    const x = d3.scaleLinear()
        .domain(d3.extent(series, d => d.year))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(series, d => d.totalFines) || 0])
        .nice()
        .range([height, 0]);

    // ---- Grid (dashed) ----
    svg.append('g')
        .attr('class', 'grid')
        .call(
            d3.axisLeft(y)
                .tickSize(-width)
                .tickFormat('')
        )
        .selectAll('line')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-opacity', 0.7)
        .attr('stroke-dasharray', '3,3');

    // ---- Axes ----
    const xAxis = svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(
            d3.axisBottom(x)
                .tickFormat(d3.format('d'))
                .ticks(series.length)
        );

    xAxis.selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500');

    const yAxis = svg.append('g')
        .attr('class', 'y-axis')
        .call(
            d3.axisLeft(y)
                .tickFormat(v => v.toLocaleString())
        );

    yAxis.selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500');

    // ---- Axis labels (separate from chart area) ----
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 50)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', '#1e293b')
        .text('Year');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -75)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', '#1e293b')
        .text('Total Fines');

    // ---- Gradient fill under line (blue area) ----
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
        .attr('id', 'finesTrendGradient')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');

    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#3b82f6')
        .attr('stop-opacity', 0.32);

    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#3b82f6')
        .attr('stop-opacity', 0.03);

    const area = d3.area()
        .x(d => x(d.year))
        .y0(height)
        .y1(d => y(d.totalFines))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(series)
        .attr('fill', 'url(#finesTrendGradient)')
        .attr('d', area);

    // ---- Line (smooth, rounded) ----
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.totalFines))
        .curve(d3.curveMonotoneX);

    const path = svg.append('path')
        .datum(series)
        .attr('fill', 'none')
        .attr('stroke', '#2563eb')
        .attr('stroke-width', 4)
        .attr('stroke-linecap', 'round')
        .attr('d', line);

    // Draw animation
    const totalLength = path.node().getTotalLength();
    path
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0)
        .on('end', function () {
            d3.select(this).attr('stroke-dasharray', 'none');
        });

    // ---- Stats box (Peak year, Peak count, Average) ----
    const total = d3.sum(series, d => d.totalFines);
    const max = d3.max(series, d => d.totalFines);
    const avg = total / series.length;
    const peakYear = series.find(d => d.totalFines === max)?.year;

    const stats = svg.append('g')
        .attr('class', 'statistics')
        .attr('transform', `translate(20, 20)`);

    // Background card
    stats.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 180)
        .attr('height', 120)
        .attr('rx', 8)
        .attr('fill', '#f8fafc')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1);

    // Title
    stats.append('text')
        .attr('x', 90)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '700')
        .style('fill', '#64748b')
        .text('STATISTICS');

    const statsData = [
        { label: 'Peak Year:', value: peakYear },
        { label: 'Peak Fines:', value: max.toLocaleString() },
        { label: 'Average:', value: Math.round(avg).toLocaleString() }
    ];

    statsData.forEach((stat, i) => {
        const yPos = 45 + (i * 25);

        stats.append('text')
            .attr('x', 10)
            .attr('y', yPos)
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('fill', '#475569')
            .text(stat.label);

        stats.append('text')
            .attr('x', 170)
            .attr('y', yPos)
            .attr('text-anchor', 'end')
            .style('font-size', '11px')
            .style('font-weight', '700')
            .style('fill', '#1e293b')
            .text(stat.value);
    });

    // ---- Helper: YoY % change ----
    function getPercentChange(year) {
        const i = series.findIndex(d => d.year === year);
        if (i <= 0) return null;
        const current = series[i].totalFines;
        const prev = series[i - 1].totalFines;
        if (!prev) return null;
        return ((current - prev) / prev) * 100;
    }

    // ---- Points + hover (tooltip + highlight) ----
    svg.selectAll('.trend-dot')
        .data(series)
        .enter()
        .append('circle')
        .attr('class', 'trend-dot')
        .attr('cx', d => x(d.year))
        .attr('cy', d => y(d.totalFines))
        .attr('r', 6)
        .attr('fill', '#3b82f6')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .style('opacity', 0)
        .style('cursor', 'pointer')
        .transition()
        .delay(1500)
        .duration(500)
        .style('opacity', 1);

    svg.selectAll('.trend-dot')
        .on('mouseover', function (event, d) {
            d3.select(this).attr('r', 7.5);

            const pct = getPercentChange(d.year);
            const changeHtml = pct !== null
                ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2);">
                        <strong>Year-over-year:</strong> ${pct > 0 ? '+' : ''}${pct.toFixed(1)}%
                   </div>`
                : '';

            const html = `
                <div style="font-weight:700; margin-bottom:6px; font-size:14px;">
                    Year ${d.year}
                </div>
                <div style="margin-bottom:4px;">
                    <strong>Total Fines:</strong> ${d.totalFines.toLocaleString()}
                </div>
                <div style="font-size:11px; color:#cbd5e1;">
                    Across all jurisdictions
                </div>
                ${changeHtml}
            `;

            tooltip.html(html).style('visibility', 'visible');
            tooltip
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 15) + 'px');
        })
        .on('mousemove', function (event) {
            tooltip
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 15) + 'px');
        })
        .on('mouseout', function () {
            d3.select(this).attr('r', 6);
            tooltip.style('visibility', 'hidden');
        });
}

/**
 * Chart 3: Jurisdiction Comparison (Grouped Bar Chart)
 */
function renderJurisdictionComparison(data) {
    console.log('Creating jurisdiction comparison chart...');

    // Group by jurisdiction and aggregate FINES, ARRESTS, CHARGES
    const jurisdictions = [...new Set(data.map(d => d.JURISDICTION))];
    
    const jurisdictionData = jurisdictions.map(jurisdiction => {
        const filtered = data.filter(d => d.JURISDICTION === jurisdiction);
        
        return {
            jurisdiction: jurisdiction,
            FINES: d3.sum(filtered, d => +d.FINES || 0),
            ARRESTS: d3.sum(filtered, d => +d.ARRESTS || 0),
            CHARGES: d3.sum(filtered, d => +d.CHARGES || 0)
        };
    });

    // Sort by total (FINES + ARRESTS + CHARGES)
    jurisdictionData.sort((a, b) => 
        (b.FINES + b.ARRESTS + b.CHARGES) - (a.FINES + a.ARRESTS + a.CHARGES)
    );

    // Create grouped bar chart
    const chart = new GroupedBarChart('jurisdiction-chart', {
        width: 1000,
        height: 400,
        xField: 'jurisdiction',
        groups: ['FINES', 'ARRESTS', 'CHARGES'],
        xLabel: 'Jurisdiction',
        yLabel: 'Count',
        title: 'Enforcement Outcomes by Jurisdiction',
        colors: ['#2563eb', '#f59e0b', '#ef4444'],
        showLegend: true
    });

    chart.init().render(jurisdictionData);
}
// =================== CHART 3: Detection Method Impact ===================

function renderDetectionMethodImpact(data) {
    console.log('Creating detection method impact chart with jurisdiction filter + tooltip...');

    const container = d3.select('#detection-method-chart');
    if (container.empty()) return;

    const jurisdictions = Array.from(
        new Set(
            data
                .map(d => d.JURISDICTION)
                .filter(d => d && d !== '')
        )
    ).sort();

    let selected = new Set(jurisdictions);

    container.html('');

    const filterCard = container.append('div')
        .attr('class', 'jurisdiction-filter-card');

    const filterHeader = filterCard.append('div')
        .attr('class', 'jurisdiction-filter-header');

    filterHeader.append('span')
        .attr('class', 'jurisdiction-filter-title')
        .text('Filter by Jurisdiction');

    const buttonsRow = filterCard.append('div')
        .attr('class', 'jurisdiction-filter-buttons');

    buttonsRow.append('button')
        .attr('type', 'button')
        .attr('class', 'jurisdiction-chip chip-select-all')
        .text('Select All')
        .on('click', () => {
            selected = new Set(jurisdictions);
            updateChipStates();
            renderChart();
        });

    buttonsRow.append('button')
        .attr('type', 'button')
        .attr('class', 'jurisdiction-chip chip-clear-all')
        .text('Clear All')
        .on('click', () => {
            selected = new Set();
            updateChipStates();
            renderChart();
        });

    const chipsRow = filterCard.append('div')
        .attr('class', 'jurisdiction-chip-row');

    const colorMap = {
        ACT: '#dc2626',
        NSW: '#2563eb',
        NT:  '#ea580c',
        QLD: '#7c3aed',
        SA:  '#059669',
        TAS: '#c026d3',
        VIC: '#0891b2',
        WA:  '#ca8a04'
    };

    const chips = chipsRow.selectAll('button.jurisdiction-chip.jur')
        .data(jurisdictions)
        .enter()
        .append('button')
        .attr('type', 'button')
        .attr('class', 'jurisdiction-chip jur active')
        .style('background-color', d => colorMap[d] || '#e5e7eb')
        .text(d => d)
        .on('click', function (event, d) {
            if (selected.has(d)) selected.delete(d);
            else selected.add(d);
            updateChipStates();
            renderChart();
        });

    function updateChipStates() {
        chips
            .classed('active', d => selected.has(d))
            .style('opacity', d => selected.has(d) ? 1 : 0.35);
    }

    const chartWrapper = container.append('div')
        .attr('class', 'jurisdiction-chart-wrapper');

    function renderChart() {
        chartWrapper.selectAll('*').remove();

        const filtered = data.filter(d =>
            selected.size === 0 ? false : selected.has(d.JURISDICTION)
        );

        const groupedMap = d3.rollup(
            filtered,
            v => d3.sum(v, d => (+d.FINES || 0) + (+d.ARRESTS || 0) + (+d.CHARGES || 0)),
            d => d.DETECTION_METHOD
        );

        const grouped = Array.from(groupedMap, ([method, value]) => ({ method, value }))
            .filter(d => d.method)
            .sort((a, b) => b.value - a.value);

        if (!grouped.length) {
            chartWrapper.append('div')
                .style('padding', '40px')
                .style('text-align', 'center')
                .style('color', '#6b7280')
                .text('No data to display. Select at least one jurisdiction.');
            return;
        }

        const margin = { top: 30, right: 150, bottom: 70, left: 80 };
        const width = 1000 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = chartWrapper.append('svg')
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(grouped.map(d => d.method))
            .range([0, width])
            .padding(0.25);

        const y = d3.scaleLinear()
            .domain([0, d3.max(grouped, d => d.value) || 0])
            .nice()
            .range([height, 0]);

        svg.append('g')
            .call(
                d3.axisLeft(y)
                    .tickSize(-width)
                    .tickFormat('')
            )
            .selectAll('line')
            .attr('stroke', '#e5e7eb')
            .attr('stroke-dasharray', '3,3');

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-20)')
            .style('text-anchor', 'end')
            .style('font-size', '12px');

        svg.append('g')
            .call(d3.axisLeft(y).tickFormat(v => v.toLocaleString()));

        const palette = [
            '#2563eb', '#4f46e5', '#0ea5e9', '#22c55e',
            '#10b981', '#6366f1', '#38bdf8', '#f97316', '#fbbf24'
        ];
        const colorScale = d3.scaleOrdinal()
            .domain(grouped.map(d => d.method))
            .range(palette);

        const total = d3.sum(grouped, d => d.value);
        const tooltip = getOrCreateTooltip();

        svg.selectAll('.bar')
            .data(grouped)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.method))
            .attr('y', d => y(d.value))
            .attr('width', d => x.bandwidth())
            .attr('height', d => height - y(d.value))
            .attr('rx', 4)
            .attr('fill', d => colorScale(d.method))
            .on('mouseover', function (event, d) {
                d3.select(this).attr('opacity', 0.9);
                const pct = total ? (d.value / total) * 100 : 0;
                tooltip.html(`
                    <div style="font-weight:700; margin-bottom:6px;">${d.method}</div>
                    <div><strong>Total outcomes:</strong> ${d.value.toLocaleString()}</div>
                    <div style="margin-top:4px; font-size:11px; color:#cbd5e1;">
                        (Fines + arrests + charges)<br/>
                        Percentage of selected jurisdictions: ${pct.toFixed(1)}%
                    </div>
                `)
                .style('visibility', 'visible')
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 15) + 'px');
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 15) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).attr('opacity', 1);
                tooltip.style('visibility', 'hidden');
            });

        svg.selectAll('.bar-label')
            .data(grouped)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => x(d.method) + x.bandwidth() / 2)
            .attr('y', d => y(d.value) - 8)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('fill', '#111827')
            .text(d => d.value.toLocaleString());

        const legend = svg.append('g')
            .attr('class', 'detection-legend')
            .attr('transform', `translate(${width + 20}, 10)`);

        legend.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .style('font-size', '12px')
            .style('font-weight', '700')
            .style('fill', '#111827')
            .text('Detection Methods');

        const legendItems = legend.selectAll('.detection-legend-item')
            .data(grouped)
            .enter()
            .append('g')
            .attr('class', 'detection-legend-item')
            .attr('transform', (d, i) => `translate(0, ${18 + i * 18})`);

        legendItems.append('rect')
            .attr('x', 0)
            .attr('y', -10)
            .attr('width', 10)
            .attr('height', 10)
            .attr('rx', 2)
            .attr('fill', d => colorScale(d.method));

        legendItems.append('text')
            .attr('x', 16)
            .attr('y', 0)
            .style('font-size', '11px')
            .style('fill', '#374151')
            .text(d => d.method);
    }

    updateChipStates();
    renderChart();
}

// =================== CHART 4: Age Group Analysis ===================
function renderAgeGroupAnalysis(data) {
    console.log('Creating age group analysis chart (no All ages bar) with jurisdiction filter + tooltip...');

    const container = d3.select('#age-group-chart');
    if (container.empty()) return;

    const jurisdictions = Array.from(
        new Set(
            data
                .map(d => d.JURISDICTION)
                .filter(d => d && d !== '')
        )
    ).sort();

    let selected = new Set(jurisdictions);

    container.html('');

    const filterCard = container.append('div')
        .attr('class', 'jurisdiction-filter-card');

    const filterHeader = filterCard.append('div')
        .attr('class', 'jurisdiction-filter-header');

    filterHeader.append('span')
        .attr('class', 'jurisdiction-filter-title')
        .text('Filter by Jurisdiction');

    const buttonsRow = filterCard.append('div')
        .attr('class', 'jurisdiction-filter-buttons');

    buttonsRow.append('button')
        .attr('type', 'button')
        .attr('class', 'jurisdiction-chip chip-select-all')
        .text('Select All')
        .on('click', () => {
            selected = new Set(jurisdictions);
            updateChipStates();
            renderChart();
        });

    buttonsRow.append('button')
        .attr('type', 'button')
        .attr('class', 'jurisdiction-chip chip-clear-all')
        .text('Clear All')
        .on('click', () => {
            selected = new Set();
            updateChipStates();
            renderChart();
        });

    const chipsRow = filterCard.append('div')
        .attr('class', 'jurisdiction-chip-row');

    const colorMap = {
        ACT: '#dc2626',
        NSW: '#2563eb',
        NT:  '#ea580c',
        QLD: '#7c3aed',
        SA:  '#059669',
        TAS: '#c026d3',
        VIC: '#0891b2',
        WA:  '#ca8a04'
    };

    const chips = chipsRow.selectAll('button.jurisdiction-chip.jur')
        .data(jurisdictions)
        .enter()
        .append('button')
        .attr('type', 'button')
        .attr('class', 'jurisdiction-chip jur active')
        .style('background-color', d => colorMap[d] || '#e5e7eb')
        .text(d => d)
        .on('click', function (event, d) {
            if (selected.has(d)) selected.delete(d);
            else selected.add(d);
            updateChipStates();
            renderChart();
        });

    function updateChipStates() {
        chips
            .classed('active', d => selected.has(d))
            .style('opacity', d => selected.has(d) ? 1 : 0.35);
    }

    const chartWrapper = container.append('div')
        .attr('class', 'jurisdiction-chart-wrapper');

    function renderChart() {
        chartWrapper.selectAll('*').remove();

        const filtered = data.filter(d =>
            selected.size === 0 ? false : selected.has(d.JURISDICTION)
        );

        const groupedMap = d3.rollup(
            filtered,
            v => d3.sum(v, d => +d.FINES || 0),
            d => d.AGE_GROUP
        );

        let grouped = Array.from(groupedMap, ([age, value]) => ({ age, value }))
            .filter(d => {
                if (!d.age) return false;
                const lower = String(d.age).toLowerCase();
                // ❌ Remove the All ages aggregate completely
                return lower !== 'all ages';
            });

        grouped.sort((a, b) => String(a.age).localeCompare(String(b.age)));

        if (!grouped.length) {
            chartWrapper.append('div')
                .style('padding', '40px')
                .style('text-align', 'center')
                .style('color', '#6b7280')
                .text('No data to display. Select at least one jurisdiction.');
            return;
        }

        const margin = { top: 30, right: 100, bottom: 90, left: 80 };
        const width = 1000 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = chartWrapper.append('svg')
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(grouped.map(d => d.age))
            .range([0, width])
            .padding(0.25);

        const y = d3.scaleLinear()
            .domain([0, d3.max(grouped, d => d.value)])
            .nice()
            .range([height, 0]);

        svg.append('g')
            .call(
                d3.axisLeft(y)
                    .tickSize(-width)
                    .tickFormat('')
            )
            .selectAll('line')
            .attr('stroke', '#e5e7eb')
            .attr('stroke-dasharray', '3,3');

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-25)')
            .style('text-anchor', 'end')
            .style('font-size', '12px');

        svg.append('g')
            .call(d3.axisLeft(y).tickFormat(v => v.toLocaleString()));

        const palette = [
            '#2563eb', '#4f46e5', '#0ea5e9', '#22c55e',
            '#10b981', '#6366f1', '#38bdf8', '#f97316', '#fbbf24'
        ];
        const colorScale = d3.scaleOrdinal()
            .domain(grouped.map(d => d.age))
            .range(palette);

        const total = d3.sum(grouped, d => d.value);
        const tooltip = getOrCreateTooltip();

        svg.selectAll('.bar')
            .data(grouped)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.age))
            .attr('y', d => y(d.value))
            .attr('width', d => x.bandwidth())
            .attr('height', d => height - y(d.value))
            .attr('rx', 4)
            .attr('fill', d => colorScale(d.age))
            .on('mouseover', function (event, d) {
                d3.select(this).attr('opacity', 0.9);
                const pct = total ? (d.value / total) * 100 : 0;
                tooltip.html(`
                    <div style="font-weight:700; margin-bottom:6px;">${d.age}</div>
                    <div><strong>Total fines:</strong> ${d.value.toLocaleString()}</div>
                    <div style="margin-top:4px; font-size:11px; color:#cbd5e1;">
                        Percentage of selected jurisdictions: ${pct.toFixed(1)}%
                    </div>
                `)
                .style('visibility', 'visible')
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 15) + 'px');
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 15) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).attr('opacity', 1);
                tooltip.style('visibility', 'hidden');
            });

        svg.selectAll('.bar-label')
            .data(grouped)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => x(d.age) + x.bandwidth() / 2)
            .attr('y', d => y(d.value) - 6)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('fill', '#111827')
            .text(d => d.value.toLocaleString());

        const legend = svg.append('g')
            .attr('class', 'age-legend')
            .attr('transform', `translate(${width + 20}, 10)`);

        legend.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .style('font-size', '12px')
            .style('font-weight', '700')
            .style('fill', '#111827')
            .text('Age Groups');

        const legendItems = legend.selectAll('.age-legend-item')
            .data(grouped)
            .enter()
            .append('g')
            .attr('class', 'age-legend-item')
            .attr('transform', (d, i) => `translate(0, ${18 + i * 18})`);

        legendItems.append('rect')
            .attr('x', 0)
            .attr('y', -10)
            .attr('width', 10)
            .attr('height', 10)
            .attr('rx', 2)
            .attr('fill', d => colorScale(d.age));

        legendItems.append('text')
            .attr('x', 16)
            .attr('y', 0)
            .style('font-size', '11px')
            .style('fill', '#374151')
            .text(d => d.age);
    }

    updateChipStates();
    renderChart();
}

// =================== INIT ===================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Loading fines Excel data…');
        const data = await loadFinesData();
        console.log(`Loaded ${data.length} fines records`);

        renderOffenseDistribution(data);
        renderTrendsOverTime(data);
        renderDetectionMethodImpact(data);
        renderAgeGroupAnalysis(data);
        // Jurisdiction comparison intentionally not implemented yet
    } catch (err) {
        console.error(err);
        showFinesError(err.message || 'Unknown error loading Excel file.');
    }
});
