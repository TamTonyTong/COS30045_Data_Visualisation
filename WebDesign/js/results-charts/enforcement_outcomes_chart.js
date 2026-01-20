/**
 * Enforcement Outcomes Chart
 * Visualizes fines, arrests, and Charges by jurisdiction over time
 */

class EnforcementOutcomesChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration with accessible colors
        this.config = {
            margin: { top: 60, right: 150, bottom: 80, left: 80 },
            width: 1200,
            height: 500,
            colors: {
                'Fines': '#ea580c',    // Strong orange (accessible)
                'Arrests': '#dc2626',  // Strong red (accessible)
                'Charges': '#7c3aed'   // Strong purple (accessible)
            },
            jurisdictionColors: {
                'ACT': '#dc2626',
                'NSW': '#2563eb',
                'NT': '#ea580c',
                'QLD': '#7c3aed',
                'SA': '#db2777',
                'TAS': '#059669',
                'VIC': '#0891b2',
                'WA': '#ca8a04'
            },
            ...options
        };

        this.data = null;
        this.selectedJurisdictions = [];
        this.selectedMetric = 'Fines'; // Single metric selection
        this.svg = null;
        this.tooltip = null;
    }

    /**
     * Load CSV data
     */
    async loadData(csvPath) {
        try {
            const rawData = await d3.csv(csvPath);
            
            // Process and aggregate data by year and jurisdiction
            // Sum all Fines, arrests, Charges across all age groups and locations
            const aggregationMap = new Map();
            
            rawData.forEach(row => {
                const year = +row.YEAR;
                const jurisdiction = row.JURISDICTION;
                const key = `${year}-${jurisdiction}`;
                
                if (!aggregationMap.has(key)) {
                    aggregationMap.set(key, {
                        year,
                        jurisdiction,
                        Fines: 0,
                        arrests: 0,
                        Charges: 0,
                        count: 0
                    });
                }
                
                const entry = aggregationMap.get(key);
                entry.Fines += +row.Fines;
                entry.arrests += +row.Arrests;
                entry.Charges += +row.Charges;
                entry.count += +row.COUNT;
            });
            
            // Convert map to array and filter to 2023-2024 only
            this.data = Array.from(aggregationMap.values()).filter(d => d.year >= 2023);

            // Get unique jurisdictions and calculate totals to select top 5 by default
            const jurisdictionTotals = d3.rollup(
                this.data,
                v => d3.sum(v, d => d.Fines + d.arrests + d.Charges),
                d => d.jurisdiction
            );
            
            const top3 = Array.from(jurisdictionTotals.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(d => d[0]);
            
            this.selectedJurisdictions = top3;
            
            console.log(`✓ Loaded and aggregated ${this.data.length} records for enforcement outcomes chart (2023-2024)`);
            console.log(`✓ Default showing top 3 jurisdictions: ${top3.join(', ')}`);
            console.log('Sample aggregated data:', this.data.slice(0, 3));
            return this.data;
        } catch (error) {
            console.error('Error loading CSV:', error);
            throw error;
        }
    }

    /**
     * Initialize the chart
     */
    init() {
        // Clear existing content
        this.container.selectAll('*').remove();

        // Create main container
        const chartContainer = this.container
            .append('div')
            .attr('class', 'enforcement-chart-container');

        // Add filters
        this.createFilters(chartContainer);

        // Create SVG container
        const svgContainer = chartContainer
            .append('div')
            .attr('class', 'chart-svg-container');

        const width = this.config.width - this.config.margin.left - this.config.margin.right;
        const height = this.config.height - this.config.margin.top - this.config.margin.bottom;

        this.svg = svgContainer
            .append('svg')
            .attr('width', this.config.width)
            .attr('height', this.config.height)
            .append('g')
            .attr('transform', `translate(${this.config.margin.left},${this.config.margin.top})`);

        // Create tooltip
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '12px 16px')
            .style('border-radius', '8px')
            .style('font-size', '13px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');

        return this;
    }

    /**
     * Create filter controls
     */
    createFilters(container) {
        const filterContainer = container
            .append('div')
            .attr('class', 'enforcement-filters')
            .style('margin-bottom', '20px')
            .style('padding', '20px')
            .style('background', '#f8fafc')
            .style('border-radius', '12px')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.08)');

        // Add data availability notice
        filterContainer.append('div')
            .style('padding', '10px')
            .style('background', '#fef3c7')
            .style('border-left', '4px solid #f59e0b')
            .style('border-radius', '6px')
            .style('font-size', '12px')
            .style('color', '#92400e')
            .style('margin-bottom', '20px')
            .html('⚠️ <strong>Note:</strong> Detailed enforcement outcome data (Fines, Arrests, Charges) is only available for 2023 and 2024.');

        // Metric filter section - RADIO BUTTONS (single selection)
        const metricSection = filterContainer
            .append('div')
            .style('margin-bottom', '20px');

        metricSection.append('div')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('margin-bottom', '10px')
            .html('Select ONE Enforcement Metric');

        const metricButtons = metricSection
            .append('div')
            .style('display', 'flex')
            .style('gap', '10px')
            .style('flex-wrap', 'wrap');

        ['Fines', 'Arrests', 'Charges'].forEach(metric => {
            metricButtons.append('button')
                .attr('class', 'metric-filter-btn')
                .attr('data-metric', metric)
                .style('padding', '10px 20px')
                .style('background', this.config.colors[metric])
                .style('color', 'white')
                .style('border', '3px solid white')
                .style('border-radius', '6px')
                .style('cursor', 'pointer')
                .style('font-weight', '700')
                .style('font-size', '13px')
                .style('transition', 'all 0.2s ease')
                .text(metric)
                .on('click', () => this.selectMetric(metric));
        });

        // Jurisdiction filter section
        const jurisdictionSection = filterContainer
            .append('div');

        jurisdictionSection.append('div')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('margin-bottom', '8px')
            .html('Filter by Jurisdiction');

        // Helper text
        jurisdictionSection.append('div')
            .style('font-size', '12px')
            .style('color', '#64748b')
            .style('margin-bottom', '10px')
            .style('font-style', 'italic')
            .html('💡 Tip: Select 3-5 jurisdictions for optimal clarity. Top 3 shown by default.');

        const jurisdictionButtonContainer = jurisdictionSection
            .append('div')
            .style('display', 'flex')
            .style('gap', '10px')
            .style('flex-wrap', 'wrap')
            .style('align-items', 'center');

        // Select All / Clear All buttons
        jurisdictionButtonContainer.append('button')
            .attr('class', 'jurisdiction-btn-all')
            .style('padding', '8px 16px')
            .style('background', '#3b82f6')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-weight', '600')
            .style('font-size', '13px')
            .text('Select All')
            .on('click', () => this.selectAllJurisdictions());

        jurisdictionButtonContainer.append('button')
            .attr('class', 'jurisdiction-btn-clear')
            .style('padding', '8px 16px')
            .style('background', '#64748b')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-weight', '600')
            .style('font-size', '13px')
            .text('Clear All')
            .on('click', () => this.clearAllJurisdictions());

        // Jurisdiction buttons
        const jurisdictions = [...new Set(this.data.map(d => d.jurisdiction))].sort();

        jurisdictions.forEach(jurisdiction => {
            jurisdictionButtonContainer.append('button')
                .attr('class', 'jurisdiction-filter-btn')
                .attr('data-jurisdiction', jurisdiction)
                .style('padding', '8px 16px')
                .style('background', this.config.jurisdictionColors[jurisdiction] || '#94a3b8')
                .style('color', 'white')
                .style('border', '2px solid white')
                .style('border-radius', '6px')
                .style('cursor', 'pointer')
                .style('font-weight', '600')
                .style('font-size', '13px')
                .style('transition', 'all 0.2s ease')
                .text(jurisdiction)
                .on('click', () => this.toggleJurisdiction(jurisdiction));
        });
    }

    /**
     * Select single metric (radio button behavior)
     */
    selectMetric(metric) {
        this.selectedMetric = metric;
        this.updateMetricButtons();
        this.render();
    }

    /**
     * Toggle jurisdiction selection
     */
    toggleJurisdiction(jurisdiction) {
        const index = this.selectedJurisdictions.indexOf(jurisdiction);
        if (index > -1) {
            this.selectedJurisdictions.splice(index, 1);
        } else {
            this.selectedJurisdictions.push(jurisdiction);
        }
        this.updateJurisdictionButtons();
        this.render();
    }

    /**
     * Select all jurisdictions
     */
    selectAllJurisdictions() {
        this.selectedJurisdictions = [...new Set(this.data.map(d => d.jurisdiction))].sort();
        this.updateJurisdictionButtons();
        this.render();
    }

    /**
     * Clear all jurisdictions
     */
    clearAllJurisdictions() {
        this.selectedJurisdictions = [];
        this.updateJurisdictionButtons();
        this.render();
    }

    /**
     * Update metric button styles (radio behavior)
     */
    updateMetricButtons() {
        d3.selectAll('.metric-filter-btn').each((d, i, nodes) => {
            const btn = d3.select(nodes[i]);
            const metric = btn.attr('data-metric');
            const isSelected = metric === this.selectedMetric;
            btn.style('opacity', isSelected ? '1' : '0.4')
               .style('border-width', isSelected ? '3px' : '2px')
               .style('transform', isSelected ? 'scale(1.05)' : 'scale(1)');
        });
    }

    /**
     * Update jurisdiction button styles
     */
    updateJurisdictionButtons() {
        d3.selectAll('.jurisdiction-filter-btn').each((d, i, nodes) => {
            const btn = d3.select(nodes[i]);
            const jurisdiction = btn.attr('data-jurisdiction');
            btn.style('opacity', this.selectedJurisdictions.includes(jurisdiction) ? '1' : '0.3')
               .style('border-color', this.selectedJurisdictions.includes(jurisdiction) ? 'white' : 'transparent');
        });
    }

    /**
     * Render the chart
     */
    render() {
        if (!this.data) {
            console.error('No data loaded');
            return;
        }

        // Clear previous chart
        this.svg.selectAll('*').remove();

        if (this.selectedJurisdictions.length === 0) {
            this.svg.append('text')
                .attr('x', (this.config.width - this.config.margin.left - this.config.margin.right) / 2)
                .attr('y', (this.config.height - this.config.margin.top - this.config.margin.bottom) / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '18px')
                .style('fill', '#64748b')
                .text('Select jurisdictions to view data');
            return;
        }

        // Warning if too many jurisdictions selected (more than 5)
        if (this.selectedJurisdictions.length > 5) {
            this.svg.append('text')
                .attr('x', (this.config.width - this.config.margin.left - this.config.margin.right) / 2)
                .attr('y', 20)
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('font-weight', '700')
                .style('fill', '#ea580c')
                .text(`⚠️ ${this.selectedJurisdictions.length} jurisdictions selected. Consider limiting to 3-5 for better readability.`);
        }

        const width = this.config.width - this.config.margin.left - this.config.margin.right;
        const height = this.config.height - this.config.margin.top - this.config.margin.bottom;

        // Prepare data - single metric, grouped by year and jurisdiction
        const chartData = [];
        const metric = this.selectedMetric;
        
        this.selectedJurisdictions.forEach(jurisdiction => {
            const jurisdictionData = this.data.filter(d => d.jurisdiction === jurisdiction);
            
            jurisdictionData.forEach(d => {
                const value = metric === 'Fines' ? d.Fines : 
                             metric === 'Arrests' ? d.arrests : d.Charges;
                
                chartData.push({
                    year: d.year,
                    jurisdiction,
                    value,
                    key: `${d.year}-${jurisdiction}`
                });
            });
        });

        // Group data by year for simpler grouping
        const years = [...new Set(chartData.map(d => d.year))].sort();
        
        // Create scales - simplified to 2 levels
        const x0 = d3.scaleBand()
            .domain(years.map(y => y.toString()))
            .range([0, width])
            .padding(0.3);

        const x1 = d3.scaleBand()
            .domain(this.selectedJurisdictions)
            .range([0, x0.bandwidth()])
            .padding(0.1);

        const maxValue = d3.max(chartData, d => d.value);
        const yScale = d3.scaleLinear()
            .domain([0, maxValue * 1.1])
            .range([height, 0])
            .nice();

        // Add grid with better styling
        this.svg.append('g')
            .attr('class', 'grid')
            .style('stroke', '#e5e7eb')
            .style('stroke-opacity', 0.4)
            .style('stroke-dasharray', '2,4')
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat('')
                .ticks(5)
            );

        // Add axes
        const xAxis = this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x0));

        xAxis.selectAll('text')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('fill', '#1e293b');

        const yAxis = this.svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale).tickFormat(d => d.toLocaleString()));

        yAxis.selectAll('text')
            .style('font-size', '12px')
            .style('font-weight', '500');

        // Add axis labels
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + 60)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .style('fill', '#1e293b')
            .text('Year');

        this.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .style('fill', '#1e293b')
            .text('Count');

        // Add title with current metric
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', -30)
            .attr('text-anchor', 'middle')
            .style('font-size', '20px')
            .style('font-weight', '700')
            .style('fill', '#0f172a')
            .text(`${this.selectedMetric} by Jurisdiction (2023-2024)`);

        // Draw simplified grouped bars (year → jurisdiction only)
        years.forEach(year => {
            const yearGroup = this.svg.append('g')
                .attr('transform', `translate(${x0(year.toString())},0)`);

            this.selectedJurisdictions.forEach(jurisdiction => {
                const dataPoint = chartData.find(d => 
                    d.year === year && 
                    d.jurisdiction === jurisdiction
                );

                if (dataPoint && dataPoint.value > 0) {
                    yearGroup.append('rect')
                        .attr('x', x1(jurisdiction))
                        .attr('width', x1.bandwidth())
                        .attr('y', height)
                        .attr('height', 0)
                        .attr('fill', this.config.jurisdictionColors[jurisdiction])
                        .attr('rx', 3)
                        .style('cursor', 'pointer')
                        .on('mouseover', (event) => {
                            d3.select(event.target).style('opacity', 0.8);
                            this.showTooltip(event, dataPoint);
                        })
                        .on('mouseout', (event) => {
                            d3.select(event.target).style('opacity', 1);
                            this.hideTooltip();
                        })
                        .on('mousemove', (event) => this.moveTooltip(event))
                        .transition()
                        .duration(800)
                        .attr('y', yScale(dataPoint.value))
                        .attr('height', height - yScale(dataPoint.value));

                    // Add value labels on top of bars
                    if (dataPoint.value > maxValue * 0.03) {
                        yearGroup.append('text')
                            .attr('x', x1(jurisdiction) + x1.bandwidth() / 2)
                            .attr('y', yScale(dataPoint.value) - 5)
                            .attr('text-anchor', 'middle')
                            .style('font-size', '11px')
                            .style('font-weight', '700')
                            .style('fill', '#0f172a')
                            .style('opacity', 0)
                            .text(dataPoint.value.toLocaleString())
                            .transition()
                            .duration(800)
                            .style('opacity', 1);
                    }
                }
            });
        });

        // Add simplified legend - only jurisdictions
        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width + 20}, 0)`);
            
        legend.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .style('font-size', '13px')
            .style('font-weight', '700')
            .style('fill', '#1e293b')
            .text('Jurisdictions:');

        this.selectedJurisdictions.forEach((jurisdiction, i) => {
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${20 + i * 25})`);

            legendRow.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', 18)
                .attr('height', 18)
                .attr('rx', 3)
                .attr('fill', this.config.jurisdictionColors[jurisdiction]);

            legendRow.append('text')
                .attr('x', 25)
                .attr('y', 13)
                .style('font-size', '12px')
                .style('font-weight', '600')
                .style('fill', '#1e293b')
                .text(jurisdiction);
        });
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data) {
        const tooltipContent = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px; color: ${this.config.jurisdictionColors[data.jurisdiction]};">
                ${data.jurisdiction}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Year:</strong> ${data.year}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>${this.selectedMetric}:</strong> ${data.value.toLocaleString()}
            </div>
        `;

        this.tooltip
            .html(tooltipContent)
            .style('visibility', 'visible');

        this.moveTooltip(event);
    }

    /**
     * Move tooltip
     */
    moveTooltip(event) {
        this.tooltip
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px');
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        this.tooltip.style('visibility', 'hidden');
    }

    /**
     * Destroy chart and cleanup
     */
    destroy() {
        this.container.selectAll('*').remove();
        if (this.tooltip) {
            this.tooltip.remove();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnforcementOutcomesChart };
}
