/**
 * Drug Type Composition Bar Chart
 * Shows the distribution of detected substances in positive drug tests
 */

class DrugTypeBarChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.data = [];
        this.margin = { top: 40, right: 60, bottom: 100, left: 80 };
        this.width = 900 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
        
        // Color scheme for different drug types
        this.colorScale = {
            'AMPHETAMINE': '#ef4444',
            'CANNABIS': '#10b981',
            'COCAINE': '#3b82f6',
            'ECSTASY': '#f59e0b',
            'METHYLAMPHETAMINE': '#8b5cf6',
            'OTHER': '#6b7280'
        };
    }

    async loadData(csvPath) {
        try {
            this.data = await d3.csv(csvPath, d => ({
                drugType: d.DRUG_TYPE,
                count: +d['Sum(COUNT)']
            }));
            // Sort by count descending
            this.data.sort((a, b) => b.count - a.count);
            console.log('Drug type composition data loaded:', this.data);
        } catch (error) {
            console.error('Error loading drug type data:', error);
            throw error;
        }
    }

    init() {
        const container = d3.select(`#${this.containerId}`);
        container.selectAll('*').remove();

        // Create container div with relative positioning
        const chartContainer = container
            .append('div')
            .style('position', 'relative')
            .style('width', '100%');

        // Create SVG
        this.svg = chartContainer
            .append('svg')
            .attr('width', '100%')
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .attr('viewBox', `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Create tooltip
        this.tooltip = chartContainer
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'white')
            .style('border', '2px solid #8b5cf6')
            .style('border-radius', '8px')
            .style('padding', '12px')
            .style('pointer-events', 'none')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
            .style('z-index', '1000');
    }

    render() {
        // Clear previous content
        this.svg.selectAll('*').remove();

        const totalCases = d3.sum(this.data, d => d.count);

        // Create scales
        const xScale = d3.scaleBand()
            .domain(this.data.map(d => d.drugType))
            .range([0, this.width])
            .padding(0.5); // 50% spacing for optimal readability

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.count) * 1.15]) // Start at zero, add 15% headroom for labels
            .range([this.height, 0]);

        // Create axes
        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d => {
                // Format drug names for better display
                return d.charAt(0) + d.slice(1).toLowerCase();
            });

        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => d.toLocaleString());

        // Add minimal horizontal gridlines only
        this.svg.append('g')
            .attr('class', 'grid')
            .style('stroke', '#e5e7eb')
            .style('stroke-opacity', 0.3)
            .style('stroke-dasharray', '2,4')
            .call(d3.axisLeft(yScale)
                .tickSize(-this.width)
                .tickFormat('')
                .ticks(4)
            );

        // Add X axis
        this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(xAxis)
            .selectAll('text')
            .style('text-anchor', 'end')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        // Add Y axis
        this.svg.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);

        // Add Y axis label
        this.svg.append('text')
            .attr('class', 'axis-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -60)
            .style('font-size', '14px')
            .style('font-weight', '600')
            .style('fill', '#4b5563')
            .text('Number of Detections');

        // Find max count for highlighting
        const maxCount = d3.max(this.data, d => d.count);

        // Add bars with highlighting for highest value
        this.svg.selectAll('.bar')
            .data(this.data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.drugType))
            .attr('y', d => yScale(d.count))
            .attr('width', xScale.bandwidth())
            .attr('height', d => this.height - yScale(d.count))
            .attr('fill', d => this.colorScale[d.drugType] || '#6b7280')
            .attr('opacity', 1)
            .attr('stroke', d => d.count === maxCount ? '#0f172a' : 'none') // Highlight top value
            .attr('stroke-width', d => d.count === maxCount ? 3 : 0)
            .attr('rx', 4) // Rounded corners
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr('opacity', 1)
                    .attr('y', yScale(d.count) - 5)
                    .attr('height', this.height - yScale(d.count) + 5);

                const percentage = ((d.count / totalCases) * 100).toFixed(1);

                this.tooltip
                    .style('opacity', 1)
                    .html(`
                        <div style="font-weight: 700; color: ${this.colorScale[d.drugType]}; font-size: 16px; margin-bottom: 8px;">
                            ${d.drugType.charAt(0) + d.drugType.slice(1).toLowerCase()}
                        </div>
                        <div style="color: #374151; font-size: 14px; margin-bottom: 4px;">
                            <strong>Detections:</strong> ${d.count.toLocaleString()}
                        </div>
                        <div style="color: #6b7280; font-size: 13px;">
                            <strong>Percentage:</strong> ${percentage}% of total
                        </div>
                    `);
            })
            .on('mousemove', (event) => {
                const containerRect = d3.select(`#${this.containerId}`).node().getBoundingClientRect();
                this.tooltip
                    .style('left', (event.clientX - containerRect.left + 15) + 'px')
                    .style('top', (event.clientY - containerRect.top - 15) + 'px');
            })
            .on('mouseout', (event, d) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr('opacity', 0.85)
                    .attr('y', yScale(d.count))
                    .attr('height', this.height - yScale(d.count));

                this.tooltip.style('opacity', 0);
            });

        // Add value labels outside bars (above) for maximum clarity
        this.svg.selectAll('.value-label')
            .data(this.data)
            .enter()
            .append('text')
            .attr('class', 'value-label')
            .attr('x', d => xScale(d.drugType) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.count) - 10) // Positioned outside above bar
            .attr('text-anchor', 'middle')
            .style('font-size', '13px')
            .style('font-weight', '700')
            .style('fill', '#0f172a') // High contrast for accessibility
            .text(d => d.count.toLocaleString());

        // Add statistics panel
        const mostCommon = this.data[0];
        const leastCommon = this.data[this.data.length - 1];

        

        // Add breakdown table
        const breakdownPanel = d3.select(`#${this.containerId}`)
            .append('div')
            .style('margin-top', '15px')
            .style('padding', '15px')
            .style('background', 'white')
            .style('border-radius', '8px')
            .style('border', '1px solid #e5e7eb');

        
        // Add key insight
        const insightPanel = d3.select(`#${this.containerId}`)
            .append('div')
            .style('margin-top', '15px')
            .style('padding', '15px')
            .style('background', '#fef3c7')
            .style('border-left', '4px solid #f59e0b')
            .style('border-radius', '6px');

        insightPanel.html(`
            <div style="font-weight: 700; color: #92400e; font-size: 14px; margin-bottom: 6px;">
                📌 Key Insight
            </div>
            <div style="color: #78350f; font-size: 13px; line-height: 1.6;">
                <strong>${mostCommon.drugType.charAt(0) + mostCommon.drugType.slice(1).toLowerCase()}</strong> is the most commonly detected substance, 
                accounting for <strong>${((mostCommon.count/totalCases)*100).toFixed(1)}%</strong> of all positive drug tests. 
                This is followed by <strong>${this.data[1].drugType.charAt(0) + this.data[1].drugType.slice(1).toLowerCase()}</strong> at 
                <strong>${((this.data[1].count/totalCases)*100).toFixed(1)}%</strong>. Together, these two substances represent over 
                <strong>${(((mostCommon.count + this.data[1].count)/totalCases)*100).toFixed(1)}%</strong> of all detections.
            </div>
        `);
    }
}
