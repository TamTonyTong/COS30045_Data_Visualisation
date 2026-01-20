/**
 * Positive Drug Tests by Jurisdiction Line Chart
 * Multi-line chart showing drug test trends across different Australian jurisdictions
 */

class PositiveDrugJurisdictionChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration with WCAG AA compliant colors
        this.config = {
            margin: { top: 60, right: 150, bottom: 80, left: 100 },
            width: 1200,
            height: 500,
            colors: {
                'ACT': '#dc2626',  // Strong red (accessible)
                'NSW': '#2563eb',  // Strong blue (accessible)
                'NT': '#ea580c',   // Strong orange (accessible)
                'QLD': '#7c3aed',  // Strong purple (accessible)
                'SA': '#059669',   // Strong green (accessible)
                'TAS': '#c026d3',  // Strong magenta (accessible)
                'VIC': '#0891b2',  // Strong cyan (accessible)
                'WA': '#ca8a04'    // Strong amber (accessible)
            },
            lineStyles: {
                'ACT': 'solid',
                'NSW': 'solid',
                'NT': 'dashed',
                'QLD': 'solid',
                'SA': 'dashed',
                'TAS': 'dotted',
                'VIC': 'solid',
                'WA': 'dashed'
            },
            ...options
        };

        this.data = null;
        this.filteredData = null;
        this.selectedJurisdictions = [];
        this.svg = null;
        this.tooltip = null;
        this.xScale = null;
        this.yScale = null;
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
                count: +d['Sum(COUNT)'],
                startDate: d.START_DATE || '',
                endDate: d.END_DATE || ''
            }));

            // Calculate top 5 jurisdictions by total count
            const jurisdictionTotals = d3.rollup(
                this.data,
                v => d3.sum(v, d => d.count),
                d => d.jurisdiction
            );
            
            const top5 = Array.from(jurisdictionTotals.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(d => d[0]);
            
            // Default to showing top 5 jurisdictions for clarity
            this.selectedJurisdictions = top5;
            
            console.log(`✓ Loaded ${this.data.length} records from positive drug tests by jurisdiction data`);
            console.log(`✓ Default showing top 5 jurisdictions: ${top5.join(', ')}`);
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
            .attr('class', 'positive-drug-jurisdiction-chart-container');

        // Add filter controls
        this.createFilterControls(chartContainer);

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
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
            .style('max-width', '250px');

        return this;
    }

    /**
     * Create filter controls
     */
    createFilterControls(container) {
        const filterContainer = container
            .append('div')
            .attr('class', 'chart-filters')
            .style('margin-bottom', '20px')
            .style('padding', '20px')
            .style('background', '#f8fafc')
            .style('border-radius', '12px')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.08)');

        // Filter title
        filterContainer
            .append('div')
            .style('font-size', '16px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('margin-bottom', '8px')
            .html('Filter by Jurisdiction');

        // Helper text about optimal line count
        filterContainer
            .append('div')
            .style('font-size', '12px')
            .style('color', '#64748b')
            .style('margin-bottom', '15px')
            .style('font-style', 'italic')
            .html('💡 Tip: Select 5-7 jurisdictions for optimal readability. Top 5 shown by default.');

        // Button container
        const buttonContainer = filterContainer
            .append('div')
            .attr('class', 'filter-buttons')
            .style('display', 'flex')
            .style('flex-wrap', 'wrap')
            .style('gap', '10px')
            .style('align-items', 'center');

        // Select All button
        buttonContainer
            .append('button')
            .attr('class', 'filter-btn-all')
            .style('padding', '8px 16px')
            .style('background', '#3b82f6')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-weight', '600')
            .style('font-size', '13px')
            .style('transition', 'all 0.2s ease')
            .text('Select All')
            .on('click', () => this.selectAllJurisdictions())
            .on('mouseover', function() {
                d3.select(this).style('background', '#2563eb');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#3b82f6');
            });

        // Clear All button
        buttonContainer
            .append('button')
            .attr('class', 'filter-btn-clear')
            .style('padding', '8px 16px')
            .style('background', '#64748b')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-weight', '600')
            .style('font-size', '13px')
            .style('transition', 'all 0.2s ease')
            .text('Clear All')
            .on('click', () => this.clearAllJurisdictions())
            .on('mouseover', function() {
                d3.select(this).style('background', '#475569');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#64748b');
            });

        // Jurisdiction buttons
        const jurisdictions = [...new Set(this.data.map(d => d.jurisdiction))].sort();
        
        jurisdictions.forEach(jurisdiction => {
            const btn = buttonContainer
                .append('button')
                .attr('class', `filter-btn-jurisdiction`)
                .attr('data-jurisdiction', jurisdiction)
                .style('padding', '8px 16px')
                .style('background', this.config.colors[jurisdiction] || '#94a3b8')
                .style('color', 'white')
                .style('border', '2px solid transparent')
                .style('border-radius', '6px')
                .style('cursor', 'pointer')
                .style('font-weight', '600')
                .style('font-size', '13px')
                .style('transition', 'all 0.2s ease')
                .style('opacity', '1')
                .text(jurisdiction)
                .on('click', () => this.toggleJurisdiction(jurisdiction))
                .on('mouseover', function() {
                    d3.select(this).style('transform', 'scale(1.05)');
                })
                .on('mouseout', function() {
                    d3.select(this).style('transform', 'scale(1)');
                });
        });
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

        this.updateFilterButtons();
        this.render();
    }

    /**
     * Select all jurisdictions
     */
    selectAllJurisdictions() {
        this.selectedJurisdictions = [...new Set(this.data.map(d => d.jurisdiction))];
        this.updateFilterButtons();
        this.render();
    }

    /**
     * Clear all jurisdictions
     */
    clearAllJurisdictions() {
        this.selectedJurisdictions = [];
        this.updateFilterButtons();
        this.render();
    }

    /**
     * Update filter button styles
     */
    updateFilterButtons() {
        d3.selectAll('.filter-btn-jurisdiction').each((d, i, nodes) => {
            const btn = d3.select(nodes[i]);
            const jurisdiction = btn.attr('data-jurisdiction');
            const isSelected = this.selectedJurisdictions.includes(jurisdiction);
            
            btn.style('opacity', isSelected ? '1' : '0.3')
               .style('border-color', isSelected ? 'white' : 'transparent');
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

        // Filter data based on selected jurisdictions
        this.filteredData = this.data.filter(d => 
            this.selectedJurisdictions.includes(d.jurisdiction)
        );

        // Clear previous chart elements
        this.svg.selectAll('*').remove();

        if (this.filteredData.length === 0) {
            // Show "No data" message
            this.svg.append('text')
                .attr('x', (this.config.width - this.config.margin.left - this.config.margin.right) / 2)
                .attr('y', (this.config.height - this.config.margin.top - this.config.margin.bottom) / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '18px')
                .style('fill', '#64748b')
                .text('Select jurisdictions to view data');
            return;
        }

        const width = this.config.width - this.config.margin.left - this.config.margin.right;
        const height = this.config.height - this.config.margin.top - this.config.margin.bottom;

        // Group data by jurisdiction
        const groupedData = d3.group(this.filteredData, d => d.jurisdiction);

        // Create scales
        const years = [...new Set(this.filteredData.map(d => d.year))].sort();
        
        this.xScale = d3.scaleLinear()
            .domain(d3.extent(years))
            .range([0, width]);

        this.yScale = d3.scaleLinear()
            .domain([0, d3.max(this.filteredData, d => d.count) * 1.1])
            .range([height, 0])
            .nice();

        // Add simplified grid (fewer lines for clarity)
        this.svg.append('g')
            .attr('class', 'grid')
            .style('stroke', '#e5e7eb')
            .style('stroke-opacity', 0.4)
            .style('stroke-dasharray', '2,4')
            .call(d3.axisLeft(this.yScale)
                .tickSize(-width)
                .tickFormat('')
                .ticks(5)
            );

        // Add axes
        const xAxis = this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(this.xScale)
                .tickFormat(d3.format('d'))
                .ticks(Math.min(years.length, 10)));

        xAxis.selectAll('text')
            .style('font-size', '12px')
            .style('font-weight', '500');

        const yAxis = this.svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(this.yScale)
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
            .text('Year');

        this.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -70)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .style('fill', '#1e293b')
            .text('Number of Positive Drug Tests');

        // Add title
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', -30)
            .attr('text-anchor', 'middle')
            .style('font-size', '20px')
            .style('font-weight', '700')
            .style('fill', '#0f172a')
            .text('Positive Drug Tests by Jurisdiction');

        // Line generator
        const line = d3.line()
            .x(d => this.xScale(d.year))
            .y(d => this.yScale(d.count))
            .curve(d3.curveMonotoneX);

        // Draw lines for each jurisdiction
        groupedData.forEach((values, jurisdiction) => {
            const sortedValues = values.sort((a, b) => a.year - b.year);
            const color = this.config.colors[jurisdiction] || '#94a3b8';
            const lineStyle = this.config.lineStyles[jurisdiction] || 'solid';
            
            // Draw line with appropriate style
            const path = this.svg.append('path')
                .datum(sortedValues)
                .attr('class', `line line-${jurisdiction}`)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 2.5)
                .attr('d', line)
                .style('opacity', 0);

            // Apply line style
            if (lineStyle === 'dashed') {
                path.style('stroke-dasharray', '8,4');
            } else if (lineStyle === 'dotted') {
                path.style('stroke-dasharray', '2,4');
            }

            // Animate line
            const totalLength = path.node().getTotalLength();
            path
                .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
                .attr('stroke-dashoffset', totalLength)
                .transition()
                .duration(1500)
                .ease(d3.easeLinear)
                .attr('stroke-dashoffset', 0)
                .style('opacity', 0.9)
                .on('end', function() {
                    // Restore line style after animation
                    if (lineStyle === 'dashed') {
                        d3.select(this).attr('stroke-dasharray', '8,4');
                    } else if (lineStyle === 'dotted') {
                        d3.select(this).attr('stroke-dasharray', '2,4');
                    } else {
                        d3.select(this).attr('stroke-dasharray', 'none');
                    }
                });

            // Add dots (only show every other year if too many data points)
            const displayValues = sortedValues.length > 12 ? 
                sortedValues.filter((d, i) => i % 2 === 0 || i === sortedValues.length - 1) : 
                sortedValues;
                
            this.svg.selectAll(`.dot-${jurisdiction}`)
                .data(displayValues)
                .enter()
                .append('circle')
                .attr('class', `dot dot-${jurisdiction}`)
                .attr('cx', d => this.xScale(d.year))
                .attr('cy', d => this.yScale(d.count))
                .attr('r', 4)
                .attr('fill', color)
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .style('opacity', 0)
                .style('cursor', 'pointer')
                .on('mouseover', (event, d) => this.showTooltip(event, d, jurisdiction))
                .on('mouseout', () => this.hideTooltip())
                .on('mousemove', (event) => this.moveTooltip(event))
                .transition()
                .delay(1500)
                .duration(500)
                .style('opacity', 1);

            // Add direct label at the end of each line
            const lastValue = sortedValues[sortedValues.length - 1];
            this.svg.append('text')
                .attr('class', `line-label line-label-${jurisdiction}`)
                .attr('x', this.xScale(lastValue.year) + 8)
                .attr('y', this.yScale(lastValue.count) + 4)
                .style('font-size', '12px')
                .style('font-weight', '700')
                .style('fill', color)
                .style('opacity', 0)
                .text(jurisdiction)
                .transition()
                .delay(1500)
                .duration(500)
                .style('opacity', 1);
        });

        // Add legend
        this.addLegend(groupedData);
    }

    /**
     * Add legend with line style indicators
     */
    addLegend(groupedData) {
        const width = this.config.width - this.config.margin.left - this.config.margin.right;
        
        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width + 20}, 0)`);

        let yOffset = 0;
        
        groupedData.forEach((values, jurisdiction) => {
            const color = this.config.colors[jurisdiction] || '#94a3b8';
            const lineStyle = this.config.lineStyles[jurisdiction] || 'solid';
            
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${yOffset})`)
                .style('cursor', 'pointer')
                .on('click', () => this.toggleJurisdiction(jurisdiction))
                .on('mouseover', function() {
                    d3.select(this).style('opacity', 0.7);
                })
                .on('mouseout', function() {
                    d3.select(this).style('opacity', 1);
                });

            // Draw line sample with appropriate style
            const lineSample = legendRow.append('line')
                .attr('x1', 0)
                .attr('y1', 9)
                .attr('x2', 20)
                .attr('y2', 9)
                .attr('stroke', color)
                .attr('stroke-width', 3);

            if (lineStyle === 'dashed') {
                lineSample.attr('stroke-dasharray', '6,3');
            } else if (lineStyle === 'dotted') {
                lineSample.attr('stroke-dasharray', '2,3');
            }

            legendRow.append('text')
                .attr('x', 28)
                .attr('y', 14)
                .style('font-size', '13px')
                .style('font-weight', '600')
                .style('fill', '#1e293b')
                .text(jurisdiction);

            yOffset += 28;
        });
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data, jurisdiction) {
        const tooltipContent = `
            <div style="font-weight: 700; margin-bottom: 6px; font-size: 14px; color: ${this.config.colors[jurisdiction]};">
                ${jurisdiction}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Year:</strong> ${data.year}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Positive Drug Tests:</strong> ${data.count.toLocaleString()}
            </div>
            ${data.startDate && data.endDate ? `
            <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px;">
                ${data.startDate} to ${data.endDate}
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
        this.container.selectAll('*').remove();
        if (this.tooltip) {
            this.tooltip.remove();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PositiveDrugJurisdictionChart };
}
