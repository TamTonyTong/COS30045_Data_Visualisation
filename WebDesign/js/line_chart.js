/**
 * Line Chart Component
 * Creates line charts for time series data using D3.js
 * Used for: Fines trends over time, positive test trends, etc.
 */

class LineChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 40, right: 120, bottom: 60, left: 80 },
            width: 1000,
            height: 400,
            xField: 'year',
            yField: 'value',
            lineField: null, // For multiple lines
            xLabel: 'Year',
            yLabel: 'Value',
            title: 'Line Chart',
            colors: d3.schemeCategory10,
            showGrid: true,
            showLegend: true,
            dateFormat: '%Y',
            showTooltip: true,
            ...options
        };

        this.svg = null;
        this.data = null;
        this.tooltip = null;
    }

    /**
     * Initialize the chart
     */
    init() {
        // Clear existing content
        this.container.selectAll('*').remove();

        // Calculate dimensions
        const width = this.config.width - this.config.margin.left - this.config.margin.right;
        const height = this.config.height - this.config.margin.top - this.config.margin.bottom;

        // Create SVG
        this.svg = this.container
            .append('svg')
            .attr('width', this.config.width)
            .attr('height', this.config.height)
            .append('g')
            .attr('transform', `translate(${this.config.margin.left},${this.config.margin.top})`);

        // Add title
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .text(this.config.title);

        // Create tooltip if enabled
        if (this.config.showTooltip) {
            this.tooltip = d3.select('body')
                .append('div')
                .attr('class', 'chart-tooltip')
                .style('position', 'absolute')
                .style('visibility', 'hidden')
                .style('background-color', 'rgba(0, 0, 0, 0.8)')
                .style('color', 'white')
                .style('padding', '10px')
                .style('border-radius', '5px')
                .style('font-size', '12px')
                .style('pointer-events', 'none')
                .style('z-index', '1000');
        }

        return this;
    }

    /**
     * Render the chart with data
     * @param {Array} data - Array of data objects
     */
    render(data) {
        this.data = data;
        const width = this.config.width - this.config.margin.left - this.config.margin.right;
        const height = this.config.height - this.config.margin.top - this.config.margin.bottom;

        // Process data based on whether we have multiple lines
        let processedData;
        let lines;

        if (this.config.lineField) {
            // Multiple lines - group by lineField
            const grouped = d3.group(data, d => d[this.config.lineField]);
            lines = Array.from(grouped.keys());
            processedData = grouped;
        } else {
            // Single line
            lines = ['data'];
            processedData = new Map([['data', data]]);
        }

        // Create scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(data, d => new Date(d[this.config.xField])))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => +d[this.config.yField]) * 1.1])
            .range([height, 0]);

        const colorScale = d3.scaleOrdinal()
            .domain(lines)
            .range(this.config.colors);

        // Add grid if enabled
        if (this.config.showGrid) {
            // Vertical grid
            this.svg.append('g')
                .attr('class', 'grid')
                .style('stroke', '#e0e0e0')
                .style('stroke-opacity', 0.7)
                .call(d3.axisLeft(yScale)
                    .tickSize(-width)
                    .tickFormat('')
                );
        }

        // Add axes
        const xAxis = this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat(this.config.dateFormat)));

        const yAxis = this.svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        // Add axis labels
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + 45)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .text(this.config.xLabel);

        this.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .text(this.config.yLabel);

        // Line generator
        const line = d3.line()
            .x(d => xScale(new Date(d[this.config.xField])))
            .y(d => yScale(+d[this.config.yField]))
            .curve(d3.curveMonotoneX);

        // Draw lines
        processedData.forEach((lineData, key) => {
            // Draw line
            this.svg.append('path')
                .datum(lineData)
                .attr('class', `line line-${key}`)
                .attr('fill', 'none')
                .attr('stroke', colorScale(key))
                .attr('stroke-width', 2.5)
                .attr('d', line)
                .style('opacity', 0)
                .transition()
                .duration(1000)
                .style('opacity', 1);

            // Add dots
            this.svg.selectAll(`.dot-${key}`)
                .data(lineData)
                .enter()
                .append('circle')
                .attr('class', `dot dot-${key}`)
                .attr('cx', d => xScale(new Date(d[this.config.xField])))
                .attr('cy', d => yScale(+d[this.config.yField]))
                .attr('r', 4)
                .attr('fill', colorScale(key))
                .style('opacity', 0)
                .on('mouseover', (event, d) => this.showTooltip(event, d, key))
                .on('mouseout', () => this.hideTooltip())
                .transition()
                .duration(1000)
                .style('opacity', 1);
        });

        // Add legend if enabled and multiple lines
        if (this.config.showLegend && this.config.lineField) {
            const legend = this.svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${width + 20}, 0)`);

            lines.forEach((line, i) => {
                const legendRow = legend.append('g')
                    .attr('transform', `translate(0, ${i * 25})`);

                legendRow.append('rect')
                    .attr('width', 15)
                    .attr('height', 15)
                    .attr('fill', colorScale(line));

                legendRow.append('text')
                    .attr('x', 20)
                    .attr('y', 12)
                    .style('font-size', '12px')
                    .text(line);
            });
        }

        return this;
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data, lineName) {
        if (!this.tooltip) return;

        const tooltipContent = `
            <strong>${lineName || 'Value'}</strong><br/>
            ${this.config.xLabel}: ${data[this.config.xField]}<br/>
            ${this.config.yLabel}: ${(+data[this.config.yField]).toLocaleString()}
        `;

        this.tooltip
            .html(tooltipContent)
            .style('visibility', 'visible')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style('visibility', 'hidden');
        }
    }

    /**
     * Update chart with new data
     * @param {Array} newData - New data to render
     */
    update(newData) {
        this.render(newData);
        return this;
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
    module.exports = { LineChart };
}
