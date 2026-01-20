/**
 * Tests by State Ranking Bar Chart
 * Shows ranking of jurisdictions by total tests conducted
 * Filter by year to see how rankings change over time
 */

class TestingStateRankingChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 60, right: 40, bottom: 80, left: 120 },
            colors: {
                'ACT': '#e74c3c',
                'NSW': '#3498db',
                'NT': '#f39c12',
                'QLD': '#9b59b6',
                'SA': '#1abc9c',
                'TAS': '#e67e22',
                'VIC': '#2ecc71',
                'WA': '#34495e'
            },
            defaultColor: '#3b82f6',
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
            margin = { top: 50, right: 20, bottom: 80, left: 100 }; // Increased left margin
        } else if (containerWidth < 768) {
            width = containerWidth - 30;
            height = 450;
            margin = { top: 55, right: 30, bottom: 80, left: 120 }; // Increased left margin
        } else if (containerWidth < 992) {
            width = containerWidth - 40;
            height = 500;
            margin = { top: 60, right: 40, bottom: 80, left: 140 }; // Increased left margin
        } else {
            width = Math.min(containerWidth - 40, 1200);
            height = 550;
            margin = { top: 60, right: 40, bottom: 80, left: 140 }; // Increased left margin
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

            console.log(`✓ Loaded ${this.data.length} records for state ranking chart`);
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
        const filterExists = this.container.select('.ranking-filter-controls').node();
        
        if (!filterExists) {
            this.createFilterControls();
        }

        if (!this.tooltip) {
            this.tooltip = d3.select('body')
                .append('div')
                .attr('class', 'chart-tooltip ranking-chart-tooltip')
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
        const filterContainer = this.container
            .append('div')
            .attr('class', 'ranking-filter-controls')
            .style('margin-bottom', '20px')
            .style('padding', '16px')
            .style('background', '#f8fafc')
            .style('border-radius', '8px')
            .style('border', '1px solid #e2e8f0')
            .style('display', 'flex')
            .style('gap', '20px')
            .style('align-items', 'center')
            .style('flex-wrap', 'wrap');

        // Year Filter
        const yearContainer = filterContainer
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '10px');

        yearContainer.append('label')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('white-space', 'nowrap')
            .html(' Year:');

        const yearSelect = yearContainer
            .append('select')
            .attr('id', 'year-ranking-filter')
            .style('padding', '8px 12px')
            .style('background', 'white')
            .style('border', '2px solid #cbd5e1')
            .style('border-radius', '6px')
            .style('font-weight', '600')
            .style('font-size', '14px')
            .style('color', '#1e293b')
            .style('cursor', 'pointer')
            .style('min-width', '150px')
            .on('change', (event) => {
                this.selectedYear = event.target.value;
                this.updateClearButton();
                this.render();
            });

        yearSelect.append('option')
            .attr('value', 'all')
            .text('All Years (Total)');

        this.availableYears.forEach(year => {
            yearSelect.append('option')
                .attr('value', year)
                .text(year);
        });

        // Info text
        const infoText = filterContainer
            .append('div')
            .style('color', '#64748b')
            .style('font-size', '13px')
            .style('font-style', 'italic')
            .html('💡 States ranked by total testing volume');

        // Clear filter button
        filterContainer
            .append('button')
            .attr('class', 'clear-ranking-filter-btn')
            .style('padding', '8px 16px')
            .style('background', '#ef4444')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('font-weight', '600')
            .style('cursor', 'pointer')
            .style('transition', 'all 0.2s')
            .style('white-space', 'nowrap')
            .style('display', 'none')
            .text('Clear Filter')
            .on('mouseover', function() {
                d3.select(this).style('background', '#dc2626');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#ef4444');
            })
            .on('click', () => {
                this.selectedYear = 'all';
                d3.select('#year-ranking-filter').property('value', 'all');
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
        d3.select('.clear-ranking-filter-btn')
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
                    totalTests: 0,
                    alcoholTests: 0,
                    drugTests: 0
                });
            }
            
            const jurisdictionData = jurisdictionMap.get(jurisdiction);
            jurisdictionData.totalTests += d.count;

            // Categorize by test type
            if (d.metric && d.metric.toLowerCase().includes('breath_tests_conducted')) {
                jurisdictionData.alcoholTests += d.count;
            } else if (d.metric && d.metric.toLowerCase().includes('drug_tests_conducted')) {
                jurisdictionData.drugTests += d.count;
            }
        });

        // Convert to array and sort by total tests (descending)
        const result = Array.from(jurisdictionMap.values())
            .sort((a, b) => b.totalTests - a.totalTests)
            .map((d, index) => ({
                ...d,
                rank: index + 1
            }));

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
            barLabel: isMobile ? '10px' : '12px',
            rank: isMobile ? '14px' : '16px'
        };

        // Create scales
        const yScale = d3.scaleBand()
            .domain(chartData.map(d => d.jurisdiction))
            .range([0, height])
            .padding(0.2);

        const xScale = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d.totalTests) * 1.1])
            .range([0, width])
            .nice();

        // Add grid
        this.svg.append('g')
            .attr('class', 'grid')
            .style('stroke', '#e5e7eb')
            .style('stroke-opacity', 0.7)
            .style('stroke-dasharray', '3,3')
            .call(d3.axisBottom(xScale)
                .tickSize(height)
                .tickFormat('')
                .ticks(isMobile ? 5 : 8)
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
                .tickFormat(d => {
                    if (isMobile && d >= 1000000) {
                        return (d / 1000000).toFixed(1) + 'M';
                    } else if (isMobile && d >= 1000) {
                        return (d / 1000).toFixed(0) + 'K';
                    }
                    return d.toLocaleString();
                })
                .ticks(isMobile ? 5 : 8)
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
            .text('Total Tests Conducted');

        // Add title
        const titleText = `Tests by State - Ranking${this.getChartSubtitle()}`;

        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', -30)
            .attr('text-anchor', 'middle')
            .style('font-size', fontSize.title)
            .style('font-weight', '700')
            .style('fill', '#0f172a')
            .text(titleText);

        // Draw bars
        const bars = this.svg.selectAll('.bar')
            .data(chartData)
            .enter()
            .append('g')
            .attr('class', 'bar-group');

        bars.append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => yScale(d.jurisdiction))
            .attr('height', yScale.bandwidth())
            .attr('width', 0)
            .attr('fill', d => this.config.colors[d.jurisdiction] || this.config.defaultColor)
            .attr('rx', 4)
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
            .duration(1000)
            .delay((d, i) => i * 100)
            .attr('width', d => xScale(d.totalTests));

        // Add rank badges - positioned to the left of y-axis
        bars.append('circle')
            .attr('cx', -55) // Moved further left
            .attr('cy', d => yScale(d.jurisdiction) + yScale.bandwidth() / 2)
            .attr('r', isMobile ? 12 : 14) // Slightly smaller
            .attr('fill', d => {
                if (d.rank === 1) return '#f59e0b'; // Gold
                if (d.rank === 2) return '#9ca3af'; // Silver
                if (d.rank === 3) return '#d97706'; // Bronze
                return '#64748b'; // Default
            })
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('opacity', 0)
            .transition()
            .duration(800)
            .delay((d, i) => i * 100 + 500)
            .style('opacity', 1);

        bars.append('text')
            .attr('class', 'rank-text')
            .attr('x', -55) // Moved further left to match circle
            .attr('y', d => yScale(d.jurisdiction) + yScale.bandwidth() / 2 + 4)
            .attr('text-anchor', 'middle')
            .style('font-size', isMobile ? '12px' : '14px') // Slightly smaller
            .style('font-weight', '700')
            .style('fill', 'white')
            .style('opacity', 0)
            .text(d => d.rank)
            .transition()
            .duration(800)
            .delay((d, i) => i * 100 + 500)
            .style('opacity', 1);

        // Add value labels on bars
        bars.append('text')
            .attr('class', 'bar-label')
            .attr('x', d => xScale(d.totalTests) + 5)
            .attr('y', d => yScale(d.jurisdiction) + yScale.bandwidth() / 2 + 4)
            .style('font-size', fontSize.barLabel)
            .style('font-weight', '700')
            .style('fill', '#475569')
            .style('opacity', 0)
            .text(d => {
                if (isMobile && d.totalTests >= 1000000) {
                    return (d.totalTests / 1000000).toFixed(1) + 'M';
                } else if (isMobile && d.totalTests >= 1000) {
                    return (d.totalTests / 1000).toFixed(0) + 'K';
                }
                return d.totalTests.toLocaleString();
            })
            .transition()
            .duration(800)
            .delay((d, i) => i * 100 + 700)
            .style('opacity', 1);
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data) {
        const alcoholPercentage = ((data.alcoholTests / data.totalTests) * 100).toFixed(1);
        const drugPercentage = ((data.drugTests / data.totalTests) * 100).toFixed(1);

        const tooltipContent = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 24px; height: 24px; background: ${data.rank === 1 ? '#f59e0b' : data.rank === 2 ? '#9ca3af' : data.rank === 3 ? '#d97706' : '#64748b'}; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 14px;">
                    ${data.rank}
                </span>
                ${data.jurisdiction}
            </div>
            ${this.selectedYear !== 'all' ? `
                <div style="margin-bottom: 4px;">
                    <strong>Year:</strong> ${this.selectedYear}
                </div>
            ` : ''}
            <div style="margin-bottom: 4px;">
                <strong>Total Tests:</strong> ${data.totalTests.toLocaleString()}
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                <div style="margin-bottom: 4px;">
                    <strong>Alcohol Tests:</strong> ${data.alcoholTests.toLocaleString()} (${alcoholPercentage}%)
                </div>
                <div>
                    <strong>Drug Tests:</strong> ${data.drugTests.toLocaleString()} (${drugPercentage}%)
                </div>
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
    module.exports = { TestingStateRankingChart };
}