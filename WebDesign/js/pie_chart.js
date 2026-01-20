/**
 * Pie Chart Component
 * Creates pie/donut charts using D3.js
 * Used for: Substance distribution, demographic breakdowns, etc.
 */

class PieChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 40, right: 40, bottom: 40, left: 40 },
            width: 600,
            height: 400,
            labelField: 'label',
            valueField: 'value',
            title: 'Pie Chart',
            colors: d3.schemeCategory10,
            showLegend: true,
            showTooltip: true,
            showLabels: true,
            innerRadius: 0, // Set > 0 for donut chart
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
            .attr('transform', `translate(${this.config.width / 2},${this.config.height / 2})`);

        // Add title
        this.svg.append('text')
            .attr('x', 0)
            .attr('y', -(height / 2) - 10)
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

        const radius = Math.min(width, height) / 2;

        // Create color scale
        const colorScale = d3.scaleOrdinal()
            .domain(data.map(d => d[this.config.labelField]))
            .range(this.config.colors);

        // Create pie layout
        const pie = d3.pie()
            .value(d => +d[this.config.valueField])
            .sort(null);

        // Create arc generator
        const arc = d3.arc()
            .innerRadius(this.config.innerRadius)
            .outerRadius(radius);

        // Arc for labels (outside)
        const labelArc = d3.arc()
            .innerRadius(radius * 0.8)
            .outerRadius(radius * 0.8);

        // Create pie slices
        const arcs = this.svg.selectAll('.arc')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'arc');

        // Add paths
        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => colorScale(d.data[this.config.labelField]))
            .attr('stroke', 'white')
            .style('stroke-width', '2px')
            .style('opacity', 0)
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('mousemove', (event) => this.moveTooltip(event))
            .transition()
            .duration(1000)
            .style('opacity', 1)
            .attrTween('d', function(d) {
                const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
                return function(t) {
                    return arc(interpolate(t));
                };
            });

        // Add labels if enabled
        if (this.config.showLabels) {
            arcs.append('text')
                .attr('transform', d => `translate(${labelArc.centroid(d)})`)
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('opacity', 0)
                .text(d => {
                    const percent = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);
                    return percent > 5 ? `${percent}%` : '';
                })
                .transition()
                .delay(1000)
                .duration(500)
                .style('opacity', 1);
        }

        // Add legend if enabled
        if (this.config.showLegend) {
            const legend = this.svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${radius + 20}, ${-radius})`);

            data.forEach((d, i) => {
                const legendRow = legend.append('g')
                    .attr('transform', `translate(0, ${i * 25})`);

                legendRow.append('rect')
                    .attr('width', 15)
                    .attr('height', 15)
                    .attr('fill', colorScale(d[this.config.labelField]));

                legendRow.append('text')
                    .attr('x', 20)
                    .attr('y', 12)
                    .style('font-size', '12px')
                    .text(d[this.config.labelField]);
            });
        }

        return this;
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data) {
        if (!this.tooltip) return;

        const total = d3.sum(this.data, d => +d[this.config.valueField]);
        const percent = ((+data.data[this.config.valueField] / total) * 100).toFixed(1);

        const tooltipContent = `
            <strong>${data.data[this.config.labelField]}</strong><br/>
            Value: ${(+data.data[this.config.valueField]).toLocaleString()}<br/>
            Percentage: ${percent}%
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
    module.exports = { PieChart };
}
