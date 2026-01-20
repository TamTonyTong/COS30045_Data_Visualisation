/**
 * Alcohol vs Drug Test Share Stacked Percentage Chart
 * Shows the percentage breakdown of alcohol vs drug tests by jurisdiction
 * Filter by year to see how the composition changes over time
 */

class TestingStackedPercentageChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 60, right: 120, bottom: 80, left: 100 },
            colors: {
                alcohol: '#3498db',
                drug: '#e74c3c'
            },
            ...options
        };

        this.data = null;
        this.svg = null;
        this.tooltip = null;
        this.selectedYear = 'all';
        this.availableYears = [];
        
        // Bind resize handler
        this.resizeHandler = this.handleResize.bind(this);
    }

    /**
     * Get responsive dimensions based on container width
     */
    getResponsiveDimensions() {
        const containerWidth = this.container.node().getBoundingClientRect().width;
        
        let width, height, margin;
        
        if (containerWidth < 576) {
            width = containerWidth - 20;
            height = 400;
            margin = { top: 50, right: 20, bottom: 100, left: 80 }; // Increased bottom margin for legend
        } else if (containerWidth < 768) {
            width = containerWidth - 30;
            height = 450;
            margin = { top: 55, right: 80, bottom: 100, left: 90 }; // Reduced right margin, increased bottom
        } else if (containerWidth < 992) {
            width = containerWidth - 40;
            height = 500;
            margin = { top: 60, right: 80, bottom: 100, left: 100 }; // Reduced right margin from 160 to 80
        } else {
            width = Math.min(containerWidth - 40, 1200);
            height = 550;
            margin = { top: 60, right: 80, bottom: 100, left: 100 }; // Reduced right margin from 160 to 80
        }
        
        return { width, height, margin };
    }

    /**
     * Handle window resize
     */
    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            if (this.data) {
                this.render();
            }
        }, 250);
    }

    /**
     * Load Excel data
     */
    async loadData(excelPath) {
        try {
            const workbook = await this.loadExcelFile(excelPath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet);
            
            // Process data
            this.data = rawData.map(d => ({
                jurisdiction: d.JURISDICTION,
                year: +d.YEAR,
                metric: d.METRIC,
                count: +d.COUNT || 0
            }));

            // Extract available years and sort
            this.availableYears = [...new Set(this.data.map(d => d.year))].sort((a, b) => a - b);

            console.log(`✓ Loaded ${this.data.length} records for stacked percentage chart`);
            console.log(`✓ Available years: ${this.availableYears.join(', ')}`);
            return this.data;
        } catch (error) {
            console.error('Error loading Excel file:', error);
            throw error;
        }
    }

    /**
     * Load Excel file using SheetJS
     */
    async loadExcelFile(path) {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        return XLSX.read(arrayBuffer, { type: 'array' });
    }

    /**
     * Initialize the chart
     */
    init() {
        const filterExists = this.container.select('.stacked-filter-controls').node();
        
        if (!filterExists) {
            this.createFilterControls();
        }

        if (!this.tooltip) {
            this.tooltip = d3.select('body')
                .append('div')
                .attr('class', 'chart-tooltip stacked-chart-tooltip')
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
        }

        window.addEventListener('resize', this.resizeHandler);

        return this;
    }

    /**
     * Create filter controls
     */
    createFilterControls() {
        const isMobile = window.innerWidth < 768;
        
        const filterContainer = this.container
            .append('div')
            .attr('class', 'stacked-filter-controls')
            .style('margin-bottom', '20px')
            .style('padding', isMobile ? '12px' : '16px')
            .style('background', '#f8fafc')
            .style('border-radius', '8px')
            .style('border', '1px solid #e2e8f0')
            .style('display', 'flex')
            .style('gap', isMobile ? '12px' : '20px')
            .style('align-items', 'center')
            .style('flex-wrap', 'wrap');

        // Year Filter
        const yearContainer = filterContainer
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '10px')
            .style('width', isMobile ? '100%' : 'auto');

        yearContainer.append('label')
            .style('font-size', isMobile ? '13px' : '14px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('white-space', 'nowrap')
            .html('Year:');

        const yearSelect = yearContainer
            .append('select')
            .attr('id', 'year-stacked-filter')
            .style('padding', isMobile ? '6px 10px' : '8px 12px')
            .style('background', 'white')
            .style('border', '2px solid #cbd5e1')
            .style('border-radius', '6px')
            .style('font-weight', '600')
            .style('font-size', isMobile ? '13px' : '14px')
            .style('color', '#1e293b')
            .style('cursor', 'pointer')
            .style('min-width', isMobile ? 'auto' : '150px')
            .style('flex', isMobile ? '1' : 'none')
            .on('change', (event) => {
                this.selectedYear = event.target.value;
                this.updateClearButton();
                this.render();
            });

        yearSelect.append('option')
            .attr('value', 'all')
            .text('All Years (Average)');

        this.availableYears.forEach(year => {
            yearSelect.append('option')
                .attr('value', year)
                .text(year);
        });

        // Info text
        if (!isMobile) {
            filterContainer
                .append('div')
                .style('color', '#64748b')
                .style('font-size', '13px')
                .style('font-style', 'italic')
                .html('100% stacked - shows percentage composition');
        }

        // Clear filter button
        filterContainer
            .append('button')
            .attr('class', 'clear-stacked-filter-btn')
            .style('padding', isMobile ? '6px 12px' : '8px 16px')
            .style('background', '#ef4444')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('font-weight', '600')
            .style('font-size', isMobile ? '12px' : '14px')
            .style('cursor', 'pointer')
            .style('transition', 'all 0.2s')
            .style('white-space', 'nowrap')
            .style('display', 'none')
            .style('width', isMobile ? '100%' : 'auto')
            .text('Clear Filter')
            .on('mouseover', function() {
                d3.select(this).style('background', '#dc2626');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#ef4444');
            })
            .on('click', () => {
                this.selectedYear = 'all';
                d3.select('#year-stacked-filter').property('value', 'all');
                this.updateClearButton();
                this.render();
            });

        this.updateClearButton();
    }

    /**
     * Update clear button visibility
     */
    updateClearButton() {
        const hasFilter = this.selectedYear !== 'all';
        d3.select('.clear-stacked-filter-btn')
            .style('display', hasFilter ? 'block' : 'none');
    }

    /**
     * Aggregate data by jurisdiction
     */
    aggregateData() {
        if (!this.data) return [];

        // Filter by year if selected
        let filteredData = this.data;
        if (this.selectedYear !== 'all') {
            filteredData = filteredData.filter(d => d.year === +this.selectedYear);
        }

        // Group by jurisdiction
        const jurisdictionMap = new Map();

        filteredData.forEach(d => {
            const jurisdiction = d.jurisdiction;
            
            if (!jurisdictionMap.has(jurisdiction)) {
                jurisdictionMap.set(jurisdiction, {
                    jurisdiction: jurisdiction,
                    alcoholTests: 0,
                    drugTests: 0
                });
            }
            
            const jurisdictionData = jurisdictionMap.get(jurisdiction);

            // Categorize by test type
            if (d.metric && d.metric.toLowerCase().includes('breath_tests_conducted')) {
                jurisdictionData.alcoholTests += d.count;
            } else if (d.metric && d.metric.toLowerCase().includes('drug_tests_conducted')) {
                jurisdictionData.drugTests += d.count;
            }
        });

        // Convert to array and calculate percentages
        const result = Array.from(jurisdictionMap.values())
            .map(d => {
                const total = d.alcoholTests + d.drugTests;
                return {
                    jurisdiction: d.jurisdiction,
                    alcoholTests: d.alcoholTests,
                    drugTests: d.drugTests,
                    total: total,
                    alcoholPercentage: total > 0 ? (d.alcoholTests / total) * 100 : 0,
                    drugPercentage: total > 0 ? (d.drugTests / total) * 100 : 0
                };
            })
            .filter(d => d.total > 0) // Remove jurisdictions with no data
            .sort((a, b) => b.alcoholPercentage - a.alcoholPercentage); // Sort by alcohol percentage

        return result;
    }

    /**
     * Get chart subtitle
     */
    getChartSubtitle() {
        if (this.selectedYear !== 'all') {
            return ` (Year: ${this.selectedYear})`;
        }
        return ' (All Years Combined)';
    }

    /**
     * Render the chart
     */
    render() {
        if (!this.data) {
            console.error('No data loaded');
            return;
        }

        // Remove existing SVG
        this.container.select('svg').remove();

        const dimensions = this.getResponsiveDimensions();
        const margin = dimensions.margin;
        const width = dimensions.width - margin.left - margin.right;
        const height = dimensions.height - margin.top - margin.bottom;

        // Create SVG
        this.svg = this.container
            .append('svg')
            .attr('width', dimensions.width)
            .attr('height', dimensions.height)
            .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Get aggregated data
        const chartData = this.aggregateData();

        if (chartData.length === 0) {
            this.svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '16px')
                .style('fill', '#64748b')
                .text('No data available for selected year');
            return;
        }

        // Responsive font sizes
        const isMobile = dimensions.width < 576;
        const fontSize = {
            axis: isMobile ? '10px' : '12px',
            axisLabel: isMobile ? '12px' : '14px',
            title: isMobile ? '16px' : '20px',
            legend: isMobile ? '12px' : '14px',
            barLabel: isMobile ? '10px' : '11px'
        };

        // Create scales
        const yScale = d3.scaleBand()
            .domain(chartData.map(d => d.jurisdiction))
            .range([0, height])
            .padding(0.2);

        const xScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, width]);

        // Add grid
        this.svg.append('g')
            .attr('class', 'grid')
            .style('stroke', '#e5e7eb')
            .style('stroke-opacity', 0.7)
            .style('stroke-dasharray', '3,3')
            .call(d3.axisBottom(xScale)
                .tickSize(height)
                .tickFormat('')
                .ticks(10)
            );

        // Add axes
        const yAxis = this.svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        yAxis.selectAll('text')
            .style('font-size', fontSize.axis)
            .style('font-weight', '700')
            .style('fill', '#1e293b');

        const xAxis = this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale)
                .tickFormat(d => d + '%')
                .ticks(10)
            );

        xAxis.selectAll('text')
            .style('font-size', fontSize.axis)
            .style('font-weight', '500');

        // Add axis label
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + (isMobile ? 60 : 55))
            .attr('text-anchor', 'middle')
            .style('font-size', fontSize.axisLabel)
            .style('font-weight', '600')
            .style('fill', '#1e293b')
            .text('Percentage (%)');

        // Add title
        const titleText = `Alcohol vs Drug Test Share${this.getChartSubtitle()}`;

        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', -30)
            .attr('text-anchor', 'middle')
            .style('font-size', fontSize.title)
            .style('font-weight', '700')
            .style('fill', '#0f172a')
            .text(titleText);

        // Prepare stack data
        const stackData = chartData.map(d => ({
            jurisdiction: d.jurisdiction,
            alcohol: d.alcoholPercentage,
            drug: d.drugPercentage,
            alcoholTests: d.alcoholTests,
            drugTests: d.drugTests,
            total: d.total
        }));

        // Draw bars
        const bars = this.svg.selectAll('.bar-group')
            .data(stackData)
            .enter()
            .append('g')
            .attr('class', 'bar-group')
            .attr('transform', d => `translate(0,${yScale(d.jurisdiction)})`);

        // Alcohol bars (left side)
        bars.append('rect')
            .attr('class', 'alcohol-bar')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', yScale.bandwidth())
            .attr('width', 0)
            .attr('fill', this.config.colors.alcohol)
            .attr('rx', 4)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.target).style('opacity', 0.8);
                this.showTooltip(event, d, 'alcohol');
            })
            .on('mouseout', (event) => {
                d3.select(event.target).style('opacity', 1);
                this.hideTooltip();
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .transition()
            .duration(1000)
            .delay((d, i) => i * 100)
            .attr('width', d => xScale(d.alcohol));

        // Drug bars (right side, stacked on alcohol)
        bars.append('rect')
            .attr('class', 'drug-bar')
            .attr('x', d => xScale(d.alcohol))
            .attr('y', 0)
            .attr('height', yScale.bandwidth())
            .attr('width', 0)
            .attr('fill', this.config.colors.drug)
            .attr('rx', 4)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.target).style('opacity', 0.8);
                this.showTooltip(event, d, 'drug');
            })
            .on('mouseout', (event) => {
                d3.select(event.target).style('opacity', 1);
                this.hideTooltip();
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .transition()
            .duration(1000)
            .delay((d, i) => i * 100 + 500)
            .attr('width', d => xScale(d.drug));

        // Add invisible wider hover areas for small drug bars
        bars.append('rect')
            .attr('class', 'drug-bar-hover')
            .attr('x', d => {
                // If drug percentage is very small, extend hover area to the left
                if (d.drug < 5) {
                    return Math.max(0, xScale(d.alcohol) - 20);
                }
                return xScale(d.alcohol);
            })
            .attr('y', 0)
            .attr('height', yScale.bandwidth())
            .attr('width', d => {
                // Make hover area wider for small percentages
                if (d.drug < 5) {
                    return xScale(d.drug) + 20;
                }
                return xScale(d.drug);
            })
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                // Highlight the actual drug bar
                d3.select(event.target.parentNode).select('.drug-bar')
                    .style('opacity', 0.8)
                    .style('stroke', '#fff')
                    .style('stroke-width', 2);
                this.showTooltip(event, d, 'drug');
            })
            .on('mouseout', (event) => {
                d3.select(event.target.parentNode).select('.drug-bar')
                    .style('opacity', 1)
                    .style('stroke', 'none');
                this.hideTooltip();
            })
            .on('mousemove', (event) => this.moveTooltip(event));

        // Add percentage labels on bars
        bars.append('text')
            .attr('class', 'alcohol-label')
            .attr('x', d => xScale(d.alcohol) / 2)
            .attr('y', yScale.bandwidth() / 2 + 4)
            .attr('text-anchor', 'middle')
            .style('font-size', fontSize.barLabel)
            .style('font-weight', '700')
            .style('fill', 'white')
            .style('opacity', 0)
            .text(d => d.alcohol > 5 ? d.alcohol.toFixed(1) + '%' : '')
            .transition()
            .duration(800)
            .delay((d, i) => i * 100 + 800)
            .style('opacity', 1);

        // Drug labels - show for smaller percentages too with adjusted positioning
        bars.append('text')
            .attr('class', 'drug-label')
            .attr('x', d => {
                if (d.drug < 5) {
                    // Position to the right of the bar for very small percentages
                    return xScale(100) + 5;
                }
                return xScale(d.alcohol) + xScale(d.drug) / 2;
            })
            .attr('y', yScale.bandwidth() / 2 + 4)
            .attr('text-anchor', d => d.drug < 5 ? 'start' : 'middle')
            .style('font-size', fontSize.barLabel)
            .style('font-weight', '700')
            .style('fill', d => d.drug < 5 ? '#e74c3c' : 'white')
            .style('opacity', 0)
            .text(d => d.drug.toFixed(1) + '%')
            .transition()
            .duration(800)
            .delay((d, i) => i * 100 + 1200)
            .style('opacity', 1);

        // Add legend - positioned at the bottom of the chart
        if (!isMobile) {
            const legend = this.svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${width / 2 - 100}, ${height + 40})`); // Moved to bottom center

            // Legend background
            legend.append('rect')
                .attr('x', -10)
                .attr('y', -5)
                .attr('width', 210) // Wider to fit horizontally
                .attr('height', 32) // Shorter height
                .attr('fill', '#f8fafc')
                .attr('stroke', '#e2e8f0')
                .attr('stroke-width', 1)
                .attr('rx', 6);

            // Alcohol legend
            legend.append('rect')
                .attr('x', 0)
                .attr('y', 5)
                .attr('width', 16)
                .attr('height', 12)
                .attr('fill', this.config.colors.alcohol)
                .attr('rx', 2);

            legend.append('text')
                .attr('x', 22)
                .attr('y', 15)
                .style('font-size', '11px')
                .style('font-weight', '600')
                .style('fill', '#1e293b')
                .text('Alcohol Tests');

            // Drug legend - positioned to the right
            legend.append('rect')
                .attr('x', 110) // Horizontal positioning
                .attr('y', 5)
                .attr('width', 16)
                .attr('height', 12)
                .attr('fill', this.config.colors.drug)
                .attr('rx', 2);

            legend.append('text')
                .attr('x', 132) // Horizontal positioning
                .attr('y', 15)
                .style('font-size', '11px')
                .style('font-weight', '600')
                .style('fill', '#1e293b')
                .text('Drug Tests');
        }
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data, type) {
        const testType = type === 'alcohol' ? 'Alcohol (Breath) Tests' : 'Drug Tests';
        const percentage = type === 'alcohol' ? data.alcohol : data.drug;
        const count = type === 'alcohol' ? data.alcoholTests : data.drugTests;
        const color = type === 'alcohol' ? this.config.colors.alcohol : this.config.colors.drug;

        const tooltipContent = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px; color: ${color};">
                ${testType}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Jurisdiction:</strong> ${data.jurisdiction}
            </div>
            ${this.selectedYear !== 'all' ? `
                <div style="margin-bottom: 4px;">
                    <strong>Year:</strong> ${this.selectedYear}
                </div>
            ` : ''}
            <div style="margin-bottom: 4px;">
                <strong>Percentage:</strong> ${percentage.toFixed(1)}%
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Total Tests:</strong> ${count.toLocaleString()}
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 12px; color: rgba(255,255,255,0.8);">
                Total Combined: ${data.total.toLocaleString()} tests
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
        window.removeEventListener('resize', this.resizeHandler);
        
        if (this.tooltip) {
            this.tooltip.remove();
        }
        this.container.selectAll('*').remove();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestingStackedPercentageChart };
}