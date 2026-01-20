/**
 * Alcohol vs Drug Tests Over Time Line Chart
 * Compare trends between alcohol and drug testing over years
 * Filter by jurisdiction to see state-specific patterns
 */

class AlcoholVsDrugLineChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 60, right: 120, bottom: 80, left: 80 },
            colors: {
                alcohol: '#3498db',
                drug: '#e74c3c',
                alcoholLight: '#5dade2',
                drugLight: '#ec7063'
            },
            ...options
        };

        this.data = null;
        this.svg = null;
        this.tooltip = null;
        this.selectedJurisdiction = 'all';
        this.selectedSubstance = 'both'; // 'both', 'alcohol', or 'drug'
        this.availableJurisdictions = [];
        
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
            height = 350;
            margin = { top: 50, right: 20, bottom: 100, left: 60 };
        } else if (containerWidth < 768) {
            width = containerWidth - 30;
            height = 400;
            margin = { top: 55, right: 60, bottom: 90, left: 70 };
        } else if (containerWidth < 992) {
            width = containerWidth - 40;
            height = 450;
            margin = { top: 60, right: 100, bottom: 80, left: 80 };
        } else {
            width = Math.min(containerWidth - 40, 1200);
            height = 500;
            margin = { top: 60, right: 120, bottom: 80, left: 80 };
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

            // Extract available jurisdictions
            this.availableJurisdictions = [...new Set(this.data.map(d => d.jurisdiction))].sort();

            console.log(`✓ Loaded ${this.data.length} records for line chart`);
            console.log(`✓ Available jurisdictions: ${this.availableJurisdictions.join(', ')}`);
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
        const filterExists = this.container.select('.line-filter-controls').node();
        
        if (!filterExists) {
            this.createFilterControls();
        }

        if (!this.tooltip) {
            this.tooltip = d3.select('body')
                .append('div')
                .attr('class', 'chart-tooltip line-chart-tooltip')
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
            .attr('class', 'line-filter-controls')
            .style('margin-bottom', '20px')
            .style('padding', '16px')
            .style('background', '#f8fafc')
            .style('border-radius', '8px')
            .style('border', '1px solid #e2e8f0')
            .style('display', 'flex')
            .style('gap', '20px')
            .style('align-items', 'center')
            .style('flex-wrap', 'wrap');

        // Jurisdiction Filter
        const jurisdictionContainer = filterContainer
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '10px');

        jurisdictionContainer.append('label')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('white-space', 'nowrap')
            .html('Jurisdiction:');

        const jurisdictionSelect = jurisdictionContainer
            .append('select')
            .attr('id', 'jurisdiction-line-filter')
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
                this.selectedJurisdiction = event.target.value;
                this.updateClearButton();
                this.render();
            });

        jurisdictionSelect.append('option')
            .attr('value', 'all')
            .text('All Jurisdictions (National)');

        this.availableJurisdictions.forEach(jurisdiction => {
            jurisdictionSelect.append('option')
                .attr('value', jurisdiction)
                .text(jurisdiction);
        });

        // Substance Type Filter
        const substanceContainer = filterContainer
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '10px');

        substanceContainer.append('label')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('white-space', 'nowrap')
            .html('Show:');

        const substanceSelect = substanceContainer
            .append('select')
            .attr('id', 'substance-line-filter')
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

        substanceSelect.append('option')
            .attr('value', 'both')
            .text('Both (Compare)');

        substanceSelect.append('option')
            .attr('value', 'alcohol')
            .text('Alcohol Tests Only');

        substanceSelect.append('option')
            .attr('value', 'drug')
            .text('Drug Tests Only');

        // Clear filter button
        filterContainer
            .append('button')
            .attr('class', 'clear-line-filter-btn')
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
            .text('Clear Filters')
            .on('mouseover', function() {
                d3.select(this).style('background', '#dc2626');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#ef4444');
            })
            .on('click', () => {
                this.selectedJurisdiction = 'all';
                this.selectedSubstance = 'both';
                d3.select('#jurisdiction-line-filter').property('value', 'all');
                d3.select('#substance-line-filter').property('value', 'both');
                this.updateClearButton();
                this.render();
            });

        this.updateClearButton();
    }

    /**
     * Update clear button visibility
     */
    updateClearButton() {
        const hasFilter = this.selectedJurisdiction !== 'all' || this.selectedSubstance !== 'both';
        d3.select('.clear-line-filter-btn')
            .style('display', hasFilter ? 'block' : 'none');
    }

    /**
     * Aggregate data by year and substance type
     */
    aggregateData() {
        if (!this.data) return [];

        // Filter by jurisdiction
        let filteredData = this.data;
        if (this.selectedJurisdiction !== 'all') {
            filteredData = filteredData.filter(d => d.jurisdiction === this.selectedJurisdiction);
        }

        // Group by year and test type
        const yearMap = new Map();

        filteredData.forEach(d => {
            const year = d.year;
            const isAlcohol = d.metric && d.metric.toLowerCase().includes('breath_tests_conducted');
            const isDrug = d.metric && d.metric.toLowerCase().includes('drug_tests_conducted');

            if (!yearMap.has(year)) {
                yearMap.set(year, {
                    year: year,
                    alcohol: 0,
                    drug: 0
                });
            }

            const yearData = yearMap.get(year);
            if (isAlcohol) {
                yearData.alcohol += d.count;
            } else if (isDrug) {
                yearData.drug += d.count;
            }
        });

        // Convert to array and sort by year
        const result = Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
        return result;
    }

    /**
     * Get chart subtitle based on filters
     */
    getChartSubtitle() {
        const parts = [];
        
        if (this.selectedJurisdiction !== 'all') {
            parts.push(this.selectedJurisdiction);
        } else {
            parts.push('National');
        }
        
        if (this.selectedSubstance === 'alcohol') {
            parts.push('Alcohol Tests Only');
        } else if (this.selectedSubstance === 'drug') {
            parts.push('Drug Tests Only');
        }
        
        return parts.length > 0 ? ` (${parts.join(' - ')})` : '';
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
                .text('No data available for selected filters');
            return;
        }

        // Responsive font sizes
        const isMobile = dimensions.width < 576;
        const fontSize = {
            axis: isMobile ? '10px' : '12px',
            axisLabel: isMobile ? '12px' : '14px',
            title: isMobile ? '16px' : '20px',
            legend: isMobile ? '12px' : '14px'
        };

        // Determine which lines to show
        const showAlcohol = this.selectedSubstance === 'both' || this.selectedSubstance === 'alcohol';
        const showDrug = this.selectedSubstance === 'both' || this.selectedSubstance === 'drug';

        // Create scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(chartData, d => d.year))
            .range([0, width]);

        let maxValue = 0;
        if (showAlcohol) maxValue = Math.max(maxValue, d3.max(chartData, d => d.alcohol));
        if (showDrug) maxValue = Math.max(maxValue, d3.max(chartData, d => d.drug));

        const yScale = d3.scaleLinear()
            .domain([0, maxValue * 1.1])
            .range([height, 0])
            .nice();

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
            .call(d3.axisBottom(xScale)
                .tickFormat(d3.format('d'))
                .ticks(isMobile ? 5 : chartData.length)
            );

        xAxis.selectAll('text')
            .style('font-size', fontSize.axis)
            .style('font-weight', '600')
            .style('fill', '#1e293b');

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
            .attr('y', height + (isMobile ? 70 : 60))
            .attr('text-anchor', 'middle')
            .style('font-size', fontSize.axisLabel)
            .style('font-weight', '600')
            .style('fill', '#1e293b')
            .text('Year');

        this.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', isMobile ? -45 : -60)
            .attr('text-anchor', 'middle')
            .style('font-size', fontSize.axisLabel)
            .style('font-weight', '600')
            .style('fill', '#1e293b')
            .text(isMobile ? 'Tests' : 'Number of Tests');

        // Add title
        const titleText = `Alcohol vs Drug Tests Over Time${this.getChartSubtitle()}`;

        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', -30)
            .attr('text-anchor', 'middle')
            .style('font-size', fontSize.title)
            .style('font-weight', '700')
            .style('fill', '#0f172a')
            .text(titleText);

        // Create line generators
        const alcoholLine = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.alcohol))
            .curve(d3.curveMonotoneX);

        const drugLine = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.drug))
            .curve(d3.curveMonotoneX);

        // Draw alcohol line and points
        if (showAlcohol) {
            // Add area for alcohol
            const alcoholArea = d3.area()
                .x(d => xScale(d.year))
                .y0(height)
                .y1(d => yScale(d.alcohol))
                .curve(d3.curveMonotoneX);

            this.svg.append('path')
                .datum(chartData)
                .attr('fill', this.config.colors.alcoholLight)
                .attr('opacity', 0.1)
                .attr('d', alcoholArea);

            // Draw line
            const alcoholPath = this.svg.append('path')
                .datum(chartData)
                .attr('class', 'line alcohol-line')
                .attr('fill', 'none')
                .attr('stroke', this.config.colors.alcohol)
                .attr('stroke-width', 3)
                .attr('d', alcoholLine);

            // Animate line
            const alcoholLength = alcoholPath.node().getTotalLength();
            alcoholPath
                .attr('stroke-dasharray', alcoholLength)
                .attr('stroke-dashoffset', alcoholLength)
                .transition()
                .duration(1500)
                .ease(d3.easeLinear)
                .attr('stroke-dashoffset', 0);

            // Add data points
            this.svg.selectAll('.alcohol-dot')
                .data(chartData)
                .enter()
                .append('circle')
                .attr('class', 'alcohol-dot')
                .attr('cx', d => xScale(d.year))
                .attr('cy', d => yScale(d.alcohol))
                .attr('r', isMobile ? 4 : 5)
                .attr('fill', this.config.colors.alcohol)
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .style('opacity', 0)
                .on('mouseover', (event, d) => {
                    d3.select(event.target).attr('r', isMobile ? 6 : 8);
                    this.showTooltip(event, d, 'alcohol');
                })
                .on('mouseout', (event) => {
                    d3.select(event.target).attr('r', isMobile ? 4 : 5);
                    this.hideTooltip();
                })
                .on('mousemove', (event) => this.moveTooltip(event))
                .transition()
                .delay((d, i) => 1500 + i * 100)
                .duration(400)
                .style('opacity', 1);
        }

        // Draw drug line and points
        if (showDrug) {
            // Add area for drug
            const drugArea = d3.area()
                .x(d => xScale(d.year))
                .y0(height)
                .y1(d => yScale(d.drug))
                .curve(d3.curveMonotoneX);

            this.svg.append('path')
                .datum(chartData)
                .attr('fill', this.config.colors.drugLight)
                .attr('opacity', 0.1)
                .attr('d', drugArea);

            // Draw line
            const drugPath = this.svg.append('path')
                .datum(chartData)
                .attr('class', 'line drug-line')
                .attr('fill', 'none')
                .attr('stroke', this.config.colors.drug)
                .attr('stroke-width', 3)
                .attr('d', drugLine);

            // Animate line
            const drugLength = drugPath.node().getTotalLength();
            drugPath
                .attr('stroke-dasharray', drugLength)
                .attr('stroke-dashoffset', drugLength)
                .transition()
                .duration(1500)
                .ease(d3.easeLinear)
                .attr('stroke-dashoffset', 0);

            // Add data points
            this.svg.selectAll('.drug-dot')
                .data(chartData)
                .enter()
                .append('circle')
                .attr('class', 'drug-dot')
                .attr('cx', d => xScale(d.year))
                .attr('cy', d => yScale(d.drug))
                .attr('r', isMobile ? 4 : 5)
                .attr('fill', this.config.colors.drug)
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .style('opacity', 0)
                .on('mouseover', (event, d) => {
                    d3.select(event.target).attr('r', isMobile ? 6 : 8);
                    this.showTooltip(event, d, 'drug');
                })
                .on('mouseout', (event) => {
                    d3.select(event.target).attr('r', isMobile ? 4 : 5);
                    this.hideTooltip();
                })
                .on('mousemove', (event) => this.moveTooltip(event))
                .transition()
                .delay((d, i) => 1500 + i * 100)
                .duration(400)
                .style('opacity', 1);
        }

        // Add legend
        if (!isMobile) {
            const legend = this.svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${width - 100}, 20)`);

            let legendY = 0;

            if (showAlcohol) {
                legend.append('line')
                    .attr('x1', 0)
                    .attr('x2', 30)
                    .attr('y1', legendY)
                    .attr('y2', legendY)
                    .attr('stroke', this.config.colors.alcohol)
                    .attr('stroke-width', 3);

                legend.append('text')
                    .attr('x', 40)
                    .attr('y', legendY + 5)
                    .style('font-size', fontSize.legend)
                    .style('font-weight', '600')
                    .style('fill', '#1e293b')
                    .text('Alcohol Tests');

                legendY += 25;
            }

            if (showDrug) {
                legend.append('line')
                    .attr('x1', 0)
                    .attr('x2', 30)
                    .attr('y1', legendY)
                    .attr('y2', legendY)
                    .attr('stroke', this.config.colors.drug)
                    .attr('stroke-width', 3);

                legend.append('text')
                    .attr('x', 40)
                    .attr('y', legendY + 5)
                    .style('font-size', fontSize.legend)
                    .style('font-weight', '600')
                    .style('fill', '#1e293b')
                    .text('Drug Tests');
            }
        }
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data, type) {
        const testType = type === 'alcohol' ? 'Alcohol (Breath) Tests' : 'Drug Tests';
        const count = type === 'alcohol' ? data.alcohol : data.drug;
        const color = type === 'alcohol' ? this.config.colors.alcohol : this.config.colors.drug;

        const showBoth = this.selectedSubstance === 'both';

        const tooltipContent = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px; color: ${color};">
                ${testType}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Year:</strong> ${data.year}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Total Tests:</strong> ${count.toLocaleString()}
            </div>
            ${this.selectedJurisdiction !== 'all' ? `
                <div style="margin-bottom: 4px;">
                    <strong>Jurisdiction:</strong> ${this.selectedJurisdiction}
                </div>
            ` : ''}
            ${showBoth ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 12px; color: rgba(255,255,255,0.8);">
                    Alcohol: ${data.alcohol.toLocaleString()} | Drug: ${data.drug.toLocaleString()}
                </div>
            ` : ''}
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
    module.exports = { AlcoholVsDrugLineChart };
}