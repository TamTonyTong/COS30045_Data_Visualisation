/**
 * Age Bar Chart
 * Visualizes positive breath tests by age group with filtering
 */

class AgeBarChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 60, right: 30, bottom: 100, left: 80 },
            width: 1200,
            height: 500,
            colors: {
                '0-16': '#ef4444',
                '17-25': '#f59e0b',
                '26-39': '#10b981',
                '40-64': '#3b82f6',
                '65 and over': '#8b5cf6',
                'All ages': '#64748b',
                'Unknown': '#94a3b8'
            },
            ...options
        };

        this.data = null;
        this.selectedAgeGroups = [];
        this.selectedYear = null;
        this.svg = null;
        this.tooltip = null;
    }

    /**
     * Load CSV data
     */
    async loadData(csvPath) {
        try {
            const rawData = await d3.csv(csvPath);
            
            // Process data
            this.data = rawData.map(d => ({
                year: +d.YEAR,
                jurisdiction: d.JURISDICTION,
                ageGroup: d.AGE_GROUP,
                count: +d.COUNT,
                metric: d.METRIC
            }));

            // Set default year to 2023 (first year with detailed age breakdown)
            this.selectedYear = 2023;
            
            // Get unique age groups and select all by default (except "All ages" and "Unknown")
            const allAgeGroups = [...new Set(this.data.map(d => d.ageGroup))];
            console.log('All age groups in data:', allAgeGroups);
            
            this.selectedAgeGroups = allAgeGroups.filter(age => 
                age !== 'All ages' && age !== 'Unknown'
            );
            console.log('Selected age groups by default:', this.selectedAgeGroups);
            
            // Check data for 2023
            const data2023 = this.data.filter(d => d.year === 2023);
            console.log('Data available for 2023:', data2023.length, 'records');
            console.log('Sample 2023 data:', data2023.slice(0, 5));
            
            console.log(`✓ Loaded ${this.data.length} records for age bar chart`);
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
            .attr('class', 'age-bar-chart-container');

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
            .attr('class', 'age-filters')
            .style('margin-bottom', '20px')
            .style('padding', '20px')
            .style('background', '#f8fafc')
            .style('border-radius', '12px')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.08)');

        // Year filter
        const yearSection = filterContainer
            .append('div')
            .style('margin-bottom', '20px');

        yearSection.append('div')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('margin-bottom', '10px')
            .html('Select Year');

        // Add data availability notice
        yearSection.append('div')
            .style('padding', '10px')
            .style('background', '#fef3c7')
            .style('border-left', '4px solid #f59e0b')
            .style('border-radius', '6px')
            .style('font-size', '12px')
            .style('color', '#92400e')
            .style('margin-bottom', '10px')
            .html('⚠️ <strong>Note:</strong> Detailed age group breakdown is only available for 2023 and 2024. Prior years only contain "All ages" aggregate data.');

        const years = [...new Set(this.data.map(d => d.year))].filter(y => y >= 2023).sort((a, b) => a - b);
        const yearButtons = yearSection
            .append('div')
            .style('display', 'flex')
            .style('gap', '8px')
            .style('flex-wrap', 'wrap');

        years.forEach(year => {
            yearButtons.append('button')
                .attr('class', 'year-filter-btn')
                .attr('data-year', year)
                .style('padding', '8px 16px')
                .style('background', year === this.selectedYear ? '#3b82f6' : '#e2e8f0')
                .style('color', year === this.selectedYear ? 'white' : '#475569')
                .style('border', 'none')
                .style('border-radius', '6px')
                .style('cursor', 'pointer')
                .style('font-weight', '600')
                .style('font-size', '13px')
                .style('transition', 'all 0.2s ease')
                .text(year)
                .on('click', () => {
                    this.selectedYear = year;
                    this.updateYearButtons();
                    this.render();
                });
        });

        // Age group filter
        const ageSection = filterContainer
            .append('div');

        ageSection.append('div')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('margin-bottom', '10px')
            .html('Filter by Age Group');

        const ageButtonContainer = ageSection
            .append('div')
            .style('display', 'flex')
            .style('gap', '10px')
            .style('flex-wrap', 'wrap')
            .style('align-items', 'center');

        // Select All / Clear All buttons
        ageButtonContainer.append('button')
            .attr('class', 'age-btn-all')
            .style('padding', '8px 16px')
            .style('background', '#3b82f6')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-weight', '600')
            .style('font-size', '13px')
            .text('Select All')
            .on('click', () => this.selectAllAgeGroups());

        ageButtonContainer.append('button')
            .attr('class', 'age-btn-clear')
            .style('padding', '8px 16px')
            .style('background', '#64748b')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-weight', '600')
            .style('font-size', '13px')
            .text('Clear All')
            .on('click', () => this.clearAllAgeGroups());

        // Age group buttons (exclude 'All ages' and 'Unknown')
        const ageGroups = [...new Set(this.data.map(d => d.ageGroup))]
            .filter(age => age !== 'All ages' && age !== 'Unknown')
            .sort((a, b) => {
                // Custom sort order for specific age groups
                const order = ['0-16', '17-25', '26-39', '40-64', '65 and over'];
                return order.indexOf(a) - order.indexOf(b);
            });

        ageGroups.forEach(ageGroup => {
            ageButtonContainer.append('button')
                .attr('class', 'age-filter-btn')
                .attr('data-age', ageGroup)
                .style('padding', '8px 16px')
                .style('background', this.config.colors[ageGroup] || '#94a3b8')
                .style('color', 'white')
                .style('border', '2px solid transparent')
                .style('border-radius', '6px')
                .style('cursor', 'pointer')
                .style('font-weight', '600')
                .style('font-size', '13px')
                .style('transition', 'all 0.2s ease')
                .style('opacity', this.selectedAgeGroups.includes(ageGroup) ? '1' : '0.3')
                .text(ageGroup)
                .on('click', () => this.toggleAgeGroup(ageGroup));
        });
    }

    /**
     * Toggle age group selection
     */
    toggleAgeGroup(ageGroup) {
        const index = this.selectedAgeGroups.indexOf(ageGroup);
        if (index > -1) {
            this.selectedAgeGroups.splice(index, 1);
        } else {
            this.selectedAgeGroups.push(ageGroup);
        }
        this.updateAgeButtons();
        this.render();
    }

    /**
     * Select all age groups
     */
    selectAllAgeGroups() {
        const allAgeGroups = [...new Set(this.data.map(d => d.ageGroup))]
            .filter(age => age !== 'All ages' && age !== 'Unknown');
        this.selectedAgeGroups = allAgeGroups;
        this.updateAgeButtons();
        this.render();
    }

    /**
     * Clear all age groups
     */
    clearAllAgeGroups() {
        this.selectedAgeGroups = [];
        this.updateAgeButtons();
        this.render();
    }

    /**
     * Update year button styles
     */
    updateYearButtons() {
        d3.selectAll('.year-filter-btn').each((d, i, nodes) => {
            const btn = d3.select(nodes[i]);
            const year = +btn.attr('data-year');
            btn.style('background', year === this.selectedYear ? '#3b82f6' : '#e2e8f0')
               .style('color', year === this.selectedYear ? 'white' : '#475569');
        });
    }

    /**
     * Update age button styles
     */
    updateAgeButtons() {
        d3.selectAll('.age-filter-btn').each((d, i, nodes) => {
            const btn = d3.select(nodes[i]);
            const ageGroup = btn.attr('data-age');
            btn.style('opacity', this.selectedAgeGroups.includes(ageGroup) ? '1' : '0.3')
               .style('border-color', this.selectedAgeGroups.includes(ageGroup) ? 'white' : 'transparent');
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

        // Filter data
        const yearData = this.data.filter(d => 
            d.year === this.selectedYear && 
            this.selectedAgeGroups.includes(d.ageGroup)
        );

        console.log(`Filtered data for year ${this.selectedYear}:`, yearData.length, 'records');
        console.log('Selected age groups:', this.selectedAgeGroups);

        // Aggregate by age group (sum across all jurisdictions)
        const aggregated = d3.rollup(
            yearData,
            v => d3.sum(v, d => d.count),
            d => d.ageGroup
        );

        const chartData = Array.from(aggregated, ([ageGroup, count]) => ({
            ageGroup,
            count
        })).sort((a, b) => b.count - a.count); // Sort by value (largest to smallest)

        console.log('Chart data:', chartData);

        if (chartData.length === 0) {
            this.svg.append('text')
                .attr('x', (this.config.width - this.config.margin.left - this.config.margin.right) / 2)
                .attr('y', (this.config.height - this.config.margin.top - this.config.margin.bottom) / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '18px')
                .style('fill', '#64748b')
                .text('Select age groups to view data');
            return;
        }

        const width = this.config.width - this.config.margin.left - this.config.margin.right;
        const height = this.config.height - this.config.margin.top - this.config.margin.bottom;

        // Create scales
        const xScale = d3.scaleBand()
            .domain(chartData.map(d => d.ageGroup))
            .range([0, width])
            .padding(0.5); // 50% spacing between bars for optimal readability

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d.count) * 1.1])
            .range([height, 0])
            .nice();

        // Add minimal horizontal gridlines only (clean, focused design)
        this.svg.append('g')
            .attr('class', 'grid')
            .style('stroke', '#e5e7eb')
            .style('stroke-opacity', 0.3)
            .style('stroke-dasharray', '2,4')
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat('')
                .ticks(4)
            );

        // Add axes
        const xAxis = this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        xAxis.selectAll('text')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('fill', '#1e293b');

        const yAxis = this.svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale)
                .tickFormat(d => d.toLocaleString()));

        yAxis.selectAll('text')
            .style('font-size', '12px')
            .style('font-weight', '500');

        // Add axis labels
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + 50)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .style('fill', '#1e293b')
            .text('Age Group');

        this.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .style('fill', '#1e293b')
            .text('Number of Positive Breath Tests');

        // Add title
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', -30)
            .attr('text-anchor', 'middle')
            .style('font-size', '20px')
            .style('font-weight', '700')
            .style('fill', '#0f172a')
            .text(`Positive Breath Tests by Age Group (${this.selectedYear})`);

        // Find max value for highlighting
        const maxCount = d3.max(chartData, d => d.count);
        
        // Draw bars with highlighting for top value
        this.svg.selectAll('.bar')
            .data(chartData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.ageGroup))
            .attr('width', xScale.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', d => this.config.colors[d.ageGroup] || '#94a3b8')
            .attr('rx', 4)
            .attr('stroke', d => d.count === maxCount ? '#0f172a' : 'none') // Highlight highest value
            .attr('stroke-width', d => d.count === maxCount ? 3 : 0)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.target)
                    .style('opacity', 0.8);
                this.showTooltip(event, d);
            })
            .on('mouseout', (event) => {
                d3.select(event.target)
                    .style('opacity', 1);
                this.hideTooltip();
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .transition()
            .duration(800)
            .attr('y', d => yScale(d.count))
            .attr('height', d => height - yScale(d.count));

        // Add value labels outside bars (above) for clarity and readability
        this.svg.selectAll('.bar-label')
            .data(chartData)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => xScale(d.ageGroup) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.count) - 10) // Positioned outside above the bar
            .attr('text-anchor', 'middle')
            .style('font-size', '13px')
            .style('font-weight', '700')
            .style('fill', '#0f172a') // High contrast color for accessibility
            .style('opacity', 0)
            .text(d => d.count.toLocaleString())
            .transition()
            .duration(800)
            .style('opacity', 1);
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data) {
        const total = d3.sum(this.data.filter(d => 
            d.year === this.selectedYear && 
            this.selectedAgeGroups.includes(d.ageGroup)
        ), d => d.count);

        const percentage = ((data.count / total) * 100).toFixed(1);

        const tooltipContent = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px; color: ${this.config.colors[data.ageGroup]};">
                ${data.ageGroup}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Year:</strong> ${this.selectedYear}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Positive Tests:</strong> ${data.count.toLocaleString()}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Percentage:</strong> ${percentage}%
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
    module.exports = { AgeBarChart };
}
