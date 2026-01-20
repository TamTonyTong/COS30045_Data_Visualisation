/**
 * Bar Chart Component
 * Creates bar charts using D3.js
 * Used for: Offense distribution, jurisdiction comparison, detection methods, etc.
 */

class BarChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 40, right: 40, bottom: 80, left: 80 },
            width: 1000,
            height: 400,
            xField: 'category',
            yField: 'value',
            xLabel: 'Category',
            yLabel: 'Value',
            title: 'Bar Chart',
            color: '#2563eb',
            showGrid: true,
            showTooltip: true,
            orientation: 'vertical', // 'vertical' or 'horizontal'
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

        // Create tooltip
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

        if (this.config.orientation === 'vertical') {
            this.renderVertical(data, width, height);
        } else {
            this.renderHorizontal(data, width, height);
        }

        return this;
    }

    /**
     * Render vertical bar chart
     */
    renderVertical(data, width, height) {
        // Create scales
        const xScale = d3.scaleBand()
            .domain(data.map(d => d[this.config.xField]))
            .range([0, width])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => +d[this.config.yField]) * 1.1])
            .range([height, 0]);

        // Add grid
        if (this.config.showGrid) {
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
        this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');

        this.svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        // Add axis labels
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + 60)
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

        // Add bars
        this.svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d[this.config.xField]))
            .attr('width', xScale.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', this.config.color)
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('mousemove', (event) => this.moveTooltip(event))
            .transition()
            .duration(800)
            .attr('y', d => yScale(+d[this.config.yField]))
            .attr('height', d => height - yScale(+d[this.config.yField]));
    }

    /**
     * Render horizontal bar chart
     */
    renderHorizontal(data, width, height) {
        // Create scales
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => +d[this.config.yField]) * 1.1])
            .range([0, width]);

        const yScale = d3.scaleBand()
            .domain(data.map(d => d[this.config.xField]))
            .range([0, height])
            .padding(0.2);

        // Add grid
        if (this.config.showGrid) {
            this.svg.append('g')
                .attr('class', 'grid')
                .style('stroke', '#e0e0e0')
                .style('stroke-opacity', 0.7)
                .call(d3.axisBottom(xScale)
                    .tickSize(height)
                    .tickFormat('')
                );
        }

        // Add axes
        this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        this.svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        // Add axis labels
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + 40)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .text(this.config.yLabel);

        this.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .text(this.config.xLabel);

        // Add bars
        this.svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('y', d => yScale(d[this.config.xField]))
            .attr('height', yScale.bandwidth())
            .attr('x', 0)
            .attr('width', 0)
            .attr('fill', this.config.color)
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('mousemove', (event) => this.moveTooltip(event))
            .transition()
            .duration(800)
            .attr('width', d => xScale(+d[this.config.yField]));
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data) {
        if (!this.tooltip) return;

        const tooltipContent = `
            <strong>${data[this.config.xField]}</strong><br/>
            ${this.config.yLabel}: ${(+data[this.config.yField]).toLocaleString()}
        `;

        this.tooltip
            .html(tooltipContent)
            .style('visibility', 'visible');
    }

    /**
     * Move tooltip with cursor
     */
    moveTooltip(event) {
        if (!this.tooltip) return;
        
        this.tooltip
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
     */
    update(newData) {
        this.render(newData);
        return this;
    }

    /**
     * Destroy chart
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
    module.exports = { BarChart };
}
