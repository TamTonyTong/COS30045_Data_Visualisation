/**
 * Stacked Bar Chart Component
 * Creates stacked bar charts using D3.js
 * Used for: Detection methods by test type, substance breakdown, etc.
 */

class StackedBarChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 40, right: 120, bottom: 80, left: 80 },
            width: 1000,
            height: 400,
            xField: 'category',
            stackFields: ['stack1', 'stack2', 'stack3'], // Fields to stack
            xLabel: 'Category',
            yLabel: 'Value',
            title: 'Stacked Bar Chart',
            colors: d3.schemeCategory10,
            showGrid: true,
            showLegend: true,
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

        // Stack the data
        const stack = d3.stack()
            .keys(this.config.stackFields);

        const stackedData = stack(data);

        // Create scales
        const xScale = d3.scaleBand()
            .domain(data.map(d => d[this.config.xField]))
            .range([0, width])
            .padding(0.2);

        // Calculate max total for y scale
        const maxTotal = d3.max(data, d => 
            d3.sum(this.config.stackFields, key => +d[key] || 0)
        );

        const yScale = d3.scaleLinear()
            .domain([0, maxTotal * 1.1])
            .range([height, 0]);

        const colorScale = d3.scaleOrdinal()
            .domain(this.config.stackFields)
            .range(this.config.colors);

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

        // Add stacked bars
        const layers = this.svg.selectAll('.layer')
            .data(stackedData)
            .enter()
            .append('g')
            .attr('class', 'layer')
            .attr('fill', d => colorScale(d.key));

        layers.selectAll('rect')
            .data(d => d)
            .enter()
            .append('rect')
            .attr('x', d => xScale(d.data[this.config.xField]))
            .attr('width', xScale.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('mousemove', (event) => this.moveTooltip(event))
            .transition()
            .duration(800)
            .attr('y', d => yScale(d[1]))
            .attr('height', d => yScale(d[0]) - yScale(d[1]));

        // Add legend
        if (this.config.showLegend) {
            const legend = this.svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${width + 20}, 0)`);

            this.config.stackFields.forEach((field, i) => {
                const legendRow = legend.append('g')
                    .attr('transform', `translate(0, ${i * 25})`);

                legendRow.append('rect')
                    .attr('width', 15)
                    .attr('height', 15)
                    .attr('fill', colorScale(field));

                legendRow.append('text')
                    .attr('x', 20)
                    .attr('y', 12)
                    .style('font-size', '12px')
                    .text(field);
            });
        }

        return this;
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data) {
        if (!this.tooltip) return;

        // Get the parent layer key
        const layer = d3.select(event.currentTarget.parentNode).datum();
        const value = data[1] - data[0];

        const tooltipContent = `
            <strong>${data.data[this.config.xField]}</strong><br/>
            ${layer.key}: ${value.toLocaleString()}
        `;

        this.tooltip
            .html(tooltipContent)
            .style('visibility', 'visible');
    }

    /**
     * Move tooltip
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
     * Update chart
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
    module.exports = { StackedBarChart };
}
