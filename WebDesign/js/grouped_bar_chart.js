/**
 * Grouped Bar Chart Component
 * Creates grouped bar charts using D3.js
 * Used for: Jurisdiction comparison (fines, arrests, charges), etc.
 */

class GroupedBarChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 40, right: 120, bottom: 80, left: 80 },
            width: 1000,
            height: 400,
            xField: 'category',
            groups: ['group1', 'group2', 'group3'], // Array of field names to group
            xLabel: 'Category',
            yLabel: 'Value',
            title: 'Grouped Bar Chart',
            colors: d3.schemeCategory10,
            showGrid: true,
            showLegend: true,
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

        // Create scales
        const x0 = d3.scaleBand()
            .domain(data.map(d => d[this.config.xField]))
            .range([0, width])
            .padding(0.2);

        const x1 = d3.scaleBand()
            .domain(this.config.groups)
            .range([0, x0.bandwidth()])
            .padding(0.05);

        // Get max value across all groups
        const maxValue = d3.max(data, d => 
            d3.max(this.config.groups, key => +d[key] || 0)
        );

        const y = d3.scaleLinear()
            .domain([0, maxValue * 1.1])
            .range([height, 0]);

        const color = d3.scaleOrdinal()
            .domain(this.config.groups)
            .range(this.config.colors);

        // Add grid
        if (this.config.showGrid) {
            this.svg.append('g')
                .attr('class', 'grid')
                .style('stroke', '#e0e0e0')
                .style('stroke-opacity', 0.7)
                .call(d3.axisLeft(y)
                    .tickSize(-width)
                    .tickFormat('')
                );
        }

        // Add axes
        this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x0))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');

        this.svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(y));

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
        const barGroups = this.svg.selectAll('.bar-group')
            .data(data)
            .enter()
            .append('g')
            .attr('class', 'bar-group')
            .attr('transform', d => `translate(${x0(d[this.config.xField])},0)`);

        barGroups.selectAll('rect')
            .data(d => this.config.groups.map(key => ({
                key: key,
                value: +d[key] || 0,
                category: d[this.config.xField]
            })))
            .enter()
            .append('rect')
            .attr('x', d => x1(d.key))
            .attr('width', x1.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', d => color(d.key))
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('mousemove', (event) => this.moveTooltip(event))
            .transition()
            .duration(800)
            .attr('y', d => y(d.value))
            .attr('height', d => height - y(d.value));

        // Add legend
        if (this.config.showLegend) {
            const legend = this.svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${width + 20}, 0)`);

            this.config.groups.forEach((group, i) => {
                const legendRow = legend.append('g')
                    .attr('transform', `translate(0, ${i * 25})`);

                legendRow.append('rect')
                    .attr('width', 15)
                    .attr('height', 15)
                    .attr('fill', color(group));

                legendRow.append('text')
                    .attr('x', 20)
                    .attr('y', 12)
                    .style('font-size', '12px')
                    .text(group);
            });
        }

        return this;
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data) {
        if (!this.tooltip) return;

        const tooltipContent = `
            <strong>${data.category}</strong><br/>
            ${data.key}: ${data.value.toLocaleString()}
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
    module.exports = { GroupedBarChart };
}
