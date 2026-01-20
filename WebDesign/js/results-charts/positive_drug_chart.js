/**
 * Positive Drug Tests Over Time Chart
 * Line chart showing the trend of positive drug test cases by year
 */

class PositiveDrugChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 80, right: 100, bottom: 80, left: 100 },
            width: 1200,
            height: 550,
            color: '#2563eb', // WCAG AA compliant blue
            ...options
        };

        this.data = null;
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
                count: +d['Sum(COUNT)']
            })).sort((a, b) => a.year - b.year);

            console.log(`✓ Loaded ${this.data.length} records from positive drug test data`);
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
            .attr('class', 'positive-drug-chart-container');

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
     * Render the chart
     */
    render() {
        if (!this.data) {
            console.error('No data loaded');
            return;
        }

        // Clear previous chart elements
        this.svg.selectAll('*').remove();

        const width = this.config.width - this.config.margin.left - this.config.margin.right;
        const height = this.config.height - this.config.margin.top - this.config.margin.bottom;

        // Create scales
        this.xScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d.year))
            .range([0, width]);

        this.yScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.count) * 1.1])
            .range([height, 0])
            .nice();

        // Add grid (limit to 5-6 lines for clarity)
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
                .ticks(this.data.length));

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
            .text('Overall Positive Drug Tests Trend (All Jurisdictions)');

        // Line generator
        const line = d3.line()
            .x(d => this.xScale(d.year))
            .y(d => this.yScale(d.count))
            .curve(d3.curveMonotoneX);

        // Add area under line
        const area = d3.area()
            .x(d => this.xScale(d.year))
            .y0(height)
            .y1(d => this.yScale(d.count))
            .curve(d3.curveMonotoneX);

        // Draw area with gradient
        const gradient = this.svg.append('defs')
            .append('linearGradient')
            .attr('id', 'drug-area-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', this.config.color)
            .attr('stop-opacity', 0.3);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', this.config.color)
            .attr('stop-opacity', 0.05);

        this.svg.append('path')
            .datum(this.data)
            .attr('class', 'area')
            .attr('fill', 'url(#drug-area-gradient)')
            .attr('d', area)
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .style('opacity', 1);

        // Draw line
        const path = this.svg.append('path')
            .datum(this.data)
            .attr('class', 'line')
            .attr('fill', 'none')
            .attr('stroke', this.config.color)
            .attr('stroke-width', 3)
            .attr('d', line);

        // Animate line
        const totalLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0)
            .on('end', function() {
                d3.select(this).attr('stroke-dasharray', 'none');
            });

        // Add dots
        this.svg.selectAll('.dot')
            .data(this.data)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => this.xScale(d.year))
            .attr('cy', d => this.yScale(d.count))
            .attr('r', 6)
            .attr('fill', this.config.color)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('opacity', 0)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('mousemove', (event) => this.moveTooltip(event))
            .transition()
            .delay(1500)
            .duration(500)
            .style('opacity', 1);

        // Add key event annotations
        this.addAnnotations();

        // Add statistics box
        this.addStatistics();
    }

    /**
     * Add annotations for key insights
     */
    addAnnotations() {
        const width = this.config.width - this.config.margin.left - this.config.margin.right;
        const height = this.config.height - this.config.margin.top - this.config.margin.bottom;
        const peakData = this.data.reduce((max, d) => d.count > max.count ? d : max);
        const peakX = this.xScale(peakData.year);
        const peakY = this.yScale(peakData.count);

        // Determine annotation position to avoid statistics box
        // If peak is in right half, position annotation to the left
        const annotationOffset = peakX > width * 0.6 ? -150 : 0;
        
        // Add annotation line pointing to peak
        this.svg.append('line')
            .attr('x1', peakX)
            .attr('y1', peakY - 15)
            .attr('x2', peakX + annotationOffset)
            .attr('y2', -40)
            .style('stroke', '#2563eb')
            .style('stroke-width', 2)
            .style('stroke-dasharray', '5,3');

        // Add annotation text for peak
        const annotation = this.svg.append('g')
            .attr('transform', `translate(${peakX + annotationOffset}, -50)`);

        annotation.append('rect')
            .attr('x', -60)
            .attr('y', -25)
            .attr('width', 120)
            .attr('height', 50)
            .attr('rx', 6)
            .attr('fill', '#eff6ff')
            .attr('stroke', '#2563eb')
            .attr('stroke-width', 2);

        annotation.append('text')
            .attr('x', 0)
            .attr('y', -8)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', '700')
            .style('fill', '#1e3a8a')
            .text(`Peak: ${peakData.year}`);

        annotation.append('text')
            .attr('x', 0)
            .attr('y', 8)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', '800')
            .style('fill', '#1d4ed8')
            .text(peakData.count.toLocaleString());
    }

    /**
     * Add statistics box
     */
    addStatistics() {
        const width = this.config.width - this.config.margin.left - this.config.margin.right;
        
        const stats = this.svg.append('g')
            .attr('class', 'statistics')
            .attr('transform', `translate(0, -90)`);

        // Background
        stats.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 140)
            .attr('height', 85)
            .attr('rx', 6)
            .attr('fill', '#f8fafc')
            .attr('stroke', '#e5e7eb')
            .attr('stroke-width', 1);

        // Title
        stats.append('text')
            .attr('x', 70)
            .attr('y', 23)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('font-weight', '700')
            .style('fill', '#64748b')
            .text('STATISTICS');

        // Calculate stats
        const total = d3.sum(this.data, d => d.count);
        const max = d3.max(this.data, d => d.count);
        const min = d3.min(this.data, d => d.count);
        const avg = total / this.data.length;

        const statsData = [
            { label: 'Peak Year:', value: this.data.find(d => d.count === max).year },
            { label: 'Peak Count:', value: max.toLocaleString() },
            { label: 'Average:', value: Math.round(avg).toLocaleString() }
        ];

        statsData.forEach((stat, i) => {
            const y = 35 + (i * 20);
            
            stats.append('text')
                .attr('x', 8)
                .attr('y', y)
                .style('font-size', '9px')
                .style('font-weight', '600')
                .style('fill', '#475569')
                .text(stat.label);

            stats.append('text')
                .attr('x', 132)
                .attr('y', y)
                .attr('text-anchor', 'end')
                .style('font-size', '9px')
                .style('font-weight', '700')
                .style('fill', '#1e293b')
                .text(stat.value);
        });
    }

    /**
     * Show tooltip with enhanced formatting
     */
    showTooltip(event, data) {
        const percentChange = this.calculatePercentChange(data.year);
        const changeColor = percentChange > 0 ? '#ef4444' : '#10b981';
        const changeIcon = percentChange > 0 ? '📈' : '📉';
        const changeText = percentChange !== null 
            ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>${changeIcon}</span>
                    <strong>Year-over-year:</strong>
                    <span style="color: ${changeColor}; font-weight: 700;">${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%</span>
                </div>
               </div>`
            : '';

        const tooltipContent = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px; color: #2563eb;">
                📅 Year ${data.year}
            </div>
            <div style="margin-bottom: 6px; font-size: 14px;">
                <strong>Positive Tests:</strong> <span style="font-size: 18px; font-weight: 800; color: #2563eb;">${data.count.toLocaleString()}</span>
            </div>
            <div style="font-size: 11px; color: #cbd5e1; font-style: italic;">
                All Australian jurisdictions combined
            </div>
            ${changeText}
        `;

        this.tooltip
            .html(tooltipContent)
            .style('visibility', 'visible');

        this.moveTooltip(event);
    }

    /**
     * Calculate percent change from previous year
     */
    calculatePercentChange(year) {
        const currentIndex = this.data.findIndex(d => d.year === year);
        if (currentIndex <= 0) return null;
        
        const current = this.data[currentIndex].count;
        const previous = this.data[currentIndex - 1].count;
        
        return ((current - previous) / previous) * 100;
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
    module.exports = { PositiveDrugChart };
}
