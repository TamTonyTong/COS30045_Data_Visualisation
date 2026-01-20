/**
 * Testing Total Bar Chart
 * Visualizes total alcohol and drug tests conducted by police
 * Aggregates test counts by jurisdiction or year
 */

class TestingTotalBarChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 60, right: 40, bottom: 100, left: 80 },
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
        this.groupBy = 'jurisdiction';
        this.selectedYear = 'all';
        this.selectedSubstance = 'all';
        this.availableYears = [];
        
        // Bind resize handler
        this.resizeHandler = this.handleResize.bind(this);
    }

    /**
     * Get responsive dimensions based on container width
     */
    getResponsiveDimensions() {
        const containerWidth = this.container.node().getBoundingClientRect().width;
        
        // Adjust dimensions based on screen size
        let width, height, margin;
        
        if (containerWidth < 576) {
            // Mobile
            width = containerWidth - 20;
            height = 400;
            margin = { top: 50, right: 20, bottom: 120, left: 60 };
        } else if (containerWidth < 768) {
            // Small tablet
            width = containerWidth - 30;
            height = 450;
            margin = { top: 55, right: 30, bottom: 110, left: 70 };
        } else if (containerWidth < 992) {
            // Tablet
            width = containerWidth - 40;
            height = 500;
            margin = { top: 60, right: 40, bottom: 100, left: 80 };
        } else {
            // Desktop
            width = Math.min(containerWidth - 40, 1200);
            height = 500;
            margin = { top: 60, right: 40, bottom: 100, left: 80 };
        }
        
        return { width, height, margin };
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Debounce resize events
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
                location: d.LOCATION,
                ageGroup: d.AGEGROUP,
                metric: d.METRIC,
                detectionMethod: d.DETECTIONMETHOD,
                count: +d.COUNT || 0
            }));

            // Extract available years and sort
            this.availableYears = [...new Set(this.data.map(d => d.year))].sort((a, b) => a - b);

            console.log(`✓ Loaded ${this.data.length} records from testing data`);
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
        // Clear existing content (except filters if they exist)
        const filterExists = this.container.select('.filter-controls-container').node();
        
        if (!filterExists) {
            this.container.selectAll('*').remove();
            this.createFilterControls();
        }

        // Create tooltip
        if (!this.tooltip) {
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
        }

        // Add resize listener
        window.addEventListener('resize', this.resizeHandler);

        return this;
    }

    /**
     * Create filter controls
     */
    createFilterControls() {
        const filterContainer = this.container
            .append('div')
            .attr('class', 'filter-controls-container')
            .style('margin-bottom', '20px')
            .style('padding', '16px')
            .style('background', '#f8fafc')
            .style('border-radius', '8px')
            .style('border', '1px solid #e2e8f0')
            .style('display', 'flex')
            .style('gap', '20px')
            .style('align-items', 'center')
            .style('flex-wrap', 'wrap');

        // Year Filter Controls
        const yearFilterContainer = filterContainer
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '10px');

        yearFilterContainer.append('label')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('white-space', 'nowrap')
            .html(' Year:');

        // Year dropdown
        const yearSelect = yearFilterContainer
            .append('select')
            .attr('id', 'year-filter')
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

        // Add "All Years" option
        yearSelect.append('option')
            .attr('value', 'all')
            .text('All Years');

        // Add individual year options
        this.availableYears.forEach(year => {
            yearSelect.append('option')
                .attr('value', year)
                .text(year);
        });

        // Substance Filter Controls
        const substanceFilterContainer = filterContainer
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '10px');

        substanceFilterContainer.append('label')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('white-space', 'nowrap')
            .html(' Substance:');

        // Substance dropdown
        const substanceSelect = substanceFilterContainer
            .append('select')
            .attr('id', 'substance-filter')
            .style('padding', '8px 12px')
            .style('background', 'white')
            .style('border', '2px solid #cbd5e1')
            .style('border-radius', '6px')
            .style('font-weight', '600')
            .style('font-size', '14px')
            .style('color', '#1e293b')
            .style('cursor', 'pointer')
            .style('min-width', '180px')
            .on('change', (event) => {
                this.selectedSubstance = event.target.value;
                this.updateClearButton();
                this.render();
            });

        // Add substance options
        substanceSelect.append('option')
            .attr('value', 'all')
            .text('All Tests');

        substanceSelect.append('option')
            .attr('value', 'alcohol')
            .text('Alcohol (Breath Tests)');

        substanceSelect.append('option')
            .attr('value', 'drug')
            .text('Drug Tests');

        // Clear all filters button
        filterContainer
            .append('button')
            .attr('class', 'clear-all-filters-btn')
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
            .text('Clear All Filters')
            .on('mouseover', function() {
                d3.select(this).style('background', '#dc2626');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#ef4444');
            })
            .on('click', () => {
                this.selectedYear = 'all';
                this.selectedSubstance = 'all';
                d3.select('#year-filter').property('value', 'all');
                d3.select('#substance-filter').property('value', 'all');
                this.updateClearButton();
                this.render();
            });

        this.updateClearButton();
    }

    /**
     * Update clear button visibility
     */
    updateClearButton() {
        const hasFilters = this.selectedYear !== 'all' || this.selectedSubstance !== 'all';
        d3.select('.clear-all-filters-btn')
            .style('display', hasFilters ? 'block' : 'none');
    }

    /**
     * Get filtered data based on selected filters
     */
    getFilteredData() {
        if (!this.data) return [];
        
        let filteredData = this.data;

        // Filter by year
        if (this.selectedYear !== 'all') {
            filteredData = filteredData.filter(d => d.year === +this.selectedYear);
        }

        // Filter by substance
        if (this.selectedSubstance !== 'all') {
            if (this.selectedSubstance === 'alcohol') {
                filteredData = filteredData.filter(d => 
                    d.metric && d.metric.toLowerCase().includes('breath_tests_conducted')
                );
            } else if (this.selectedSubstance === 'drug') {
                filteredData = filteredData.filter(d => 
                    d.metric && d.metric.toLowerCase().includes('drug_tests_conducted')
                );
            }
        }
        
        return filteredData;
    }

    /**
     * Aggregate data based on grouping (always by jurisdiction now)
     */
    aggregateData() {
        const filteredData = this.getFilteredData();
        
        if (filteredData.length === 0) return [];

        const aggregationMap = new Map();

        filteredData.forEach(d => {
            const key = d.jurisdiction;
            
            if (!aggregationMap.has(key)) {
                aggregationMap.set(key, {
                    label: key,
                    count: 0
                });
            }
            
            aggregationMap.get(key).count += d.count;
        });

        // Convert to array and sort by count (descending)
        let result = Array.from(aggregationMap.values());
        result.sort((a, b) => b.count - a.count);

        return result;
    }

    /**
     * Get chart subtitle based on filters
     */
    getChartSubtitle() {
        const filters = [];
        
        if (this.selectedYear !== 'all') {
            filters.push(this.selectedYear);
        }
        
        if (this.selectedSubstance !== 'all') {
            filters.push(this.selectedSubstance === 'alcohol' ? 'Alcohol Tests' : 'Drug Tests');
        }
        
        return filters.length > 0 ? ` (${filters.join(', ')})` : '';
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

        // Get responsive dimensions
        const dimensions = this.getResponsiveDimensions();
        const margin = dimensions.margin;
        const width = dimensions.width - margin.left - margin.right;
        const height = dimensions.height - margin.top - margin.bottom;

        // Create SVG with responsive dimensions
        this.svg = this.container
            .append('svg')
            .attr('width', dimensions.width)
            .attr('height', dimensions.height)
            .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Aggregate data
        const chartData = this.aggregateData();

        if (chartData.length === 0) {
            this.svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '16px')
                .style('fill', '#64748b')
                .text('No data available for selected filters');
            return;
        }

        // Create scales
        const xScale = d3.scaleBand()
            .domain(chartData.map(d => d.label))
            .range([0, width])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d.count) * 1.1])
            .range([height, 0])
            .nice();

        // Responsive font sizes
        const isMobile = dimensions.width < 576;
        const fontSize = {
            axis: isMobile ? '10px' : '12px',
            axisLabel: isMobile ? '12px' : '14px',
            title: isMobile ? '16px' : '20px',
            barLabel: isMobile ? '9px' : '11px'
        };

        // Add grid
        this.svg.append('g')
            .attr('class', 'grid')
            .style('stroke', '#e5e7eb')
            .style('stroke-opacity', 0.7)
            .style('stroke-dasharray', '3,3')
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat('')
                .ticks(isMobile ? 5 : 8)
            );

        // Add axes
        const xAxis = this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        xAxis.selectAll('text')
            .style('font-size', fontSize.axis)
            .style('font-weight', '600')
            .style('fill', '#1e293b')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');

        const yAxis = this.svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale)
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

        yAxis.selectAll('text')
            .style('font-size', fontSize.axis)
            .style('font-weight', '500');

        // Add axis labels
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + (isMobile ? 100 : 80))
            .attr('text-anchor', 'middle')
            .style('font-size', fontSize.axisLabel)
            .style('font-weight', '600')
            .style('fill', '#1e293b')
            .text('Jurisdiction');

        this.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', isMobile ? -50 : -70)
            .attr('text-anchor', 'middle')
            .style('font-size', fontSize.axisLabel)
            .style('font-weight', '600')
            .style('fill', '#1e293b')
            .text(isMobile ? 'Total Tests' : 'Total Tests Conducted');

        // Add title with filter info
        const titleText = `Total Tests by Jurisdiction${this.getChartSubtitle()}`;

        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', -30)
            .attr('text-anchor', 'middle')
            .style('font-size', fontSize.title)
            .style('font-weight', '700')
            .style('fill', '#0f172a')
            .text(titleText);

        // Draw bars
        this.svg.selectAll('.bar')
            .data(chartData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.label))
            .attr('width', xScale.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', d => this.config.colors[d.label] || this.config.defaultColor)
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
            .duration(800)
            .delay((d, i) => i * 50)
            .attr('y', d => yScale(d.count))
            .attr('height', d => height - yScale(d.count));

        // Add value labels on bars (hide on very small screens)
        if (!isMobile || chartData.length <= 4) {
            this.svg.selectAll('.bar-label')
                .data(chartData)
                .enter()
                .append('text')
                .attr('class', 'bar-label')
                .attr('x', d => xScale(d.label) + xScale.bandwidth() / 2)
                .attr('y', d => yScale(d.count) - 5)
                .attr('text-anchor', 'middle')
                .style('font-size', fontSize.barLabel)
                .style('font-weight', '600')
                .style('fill', '#475569')
                .style('opacity', 0)
                .text(d => {
                    if (isMobile && d.count >= 1000000) {
                        return (d.count / 1000000).toFixed(1) + 'M';
                    } else if (isMobile && d.count >= 1000) {
                        return (d.count / 1000).toFixed(0) + 'K';
                    }
                    return d.count.toLocaleString();
                })
                .transition()
                .duration(800)
                .delay((d, i) => i * 50 + 400)
                .style('opacity', 1);
        }
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data) {
        const percentage = ((data.count / d3.sum(this.aggregateData(), d => d.count)) * 100).toFixed(1);

        const filterInfo = [];
        if (this.selectedYear !== 'all') {
            filterInfo.push(`<div style="margin-bottom: 4px;"><strong>Year:</strong> ${this.selectedYear}</div>`);
        }
        if (this.selectedSubstance !== 'all') {
            const substanceLabel = this.selectedSubstance === 'alcohol' ? 'Alcohol (Breath Tests)' : 'Drug Tests';
            filterInfo.push(`<div style="margin-bottom: 4px;"><strong>Substance:</strong> ${substanceLabel}</div>`);
        }

        const tooltipContent = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">
                ${data.label}
            </div>
            ${filterInfo.join('')}
            <div style="margin-bottom: 4px;">
                <strong>Total Tests:</strong> ${data.count.toLocaleString()}
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
        // Remove resize listener
        window.removeEventListener('resize', this.resizeHandler);
        
        if (this.tooltip) {
            this.tooltip.remove();
        }
        this.container.selectAll('*').remove();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestingTotalBarChart };
}