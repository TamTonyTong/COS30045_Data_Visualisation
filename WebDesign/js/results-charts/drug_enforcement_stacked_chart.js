/**
 * Drug Enforcement Stacked Bar Chart
 * Shows enforcement outcomes (positive tests and charges) by jurisdiction for 2023 and 2024
 */

class DrugEnforcementStackedChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.data = [];
        this.margin = { top: 40, right: 150, bottom: 60, left: 80 };
        this.width = 900 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
        
        // Color scheme for metrics
        this.colorScale = {
            'Positive Tests': '#8b5cf6',
            'Charges': '#f59e0b'
        };
        
        this.selectedYear = 'both'; // 'both', '2023', or '2024'
    }

    async loadData(csvPath) {
        try {
            this.rawData = await d3.csv(csvPath, d => ({
                year: +d.YEAR,
                jurisdiction: d.JURISDICTION,
                positiveTests: +d['Sum(COUNT)'],
                charges: +d['Sum(CHARGES)']
            }));
            
            this.processData();
            console.log('Drug enforcement data loaded:', this.data);
        } catch (error) {
            console.error('Error loading drug enforcement data:', error);
            throw error;
        }
    }

    processData() {
        // Group data based on selected year
        if (this.selectedYear === 'both') {
            // Aggregate both years
            const aggregated = d3.rollup(
                this.rawData,
                v => ({
                    positiveTests: d3.sum(v, d => d.positiveTests),
                    charges: d3.sum(v, d => d.charges)
                }),
                d => d.jurisdiction
            );
            
            this.data = Array.from(aggregated, ([jurisdiction, values]) => ({
                jurisdiction,
                ...values
            })).sort((a, b) => (b.positiveTests + b.charges) - (a.positiveTests + a.charges)); // Sort by total value
        } else {
            // Filter by specific year and sort by total value
            this.data = this.rawData
                .filter(d => d.year === +this.selectedYear)
                .sort((a, b) => (b.positiveTests + b.charges) - (a.positiveTests + a.charges));
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

        // Add year filter buttons
        const filterContainer = chartContainer
            .append('div')
            .style('margin-bottom', '20px')
            .style('text-align', 'center');

        const years = ['both', '2023', '2024'];
        const yearLabels = { 'both': 'Both Years (2023-2024)', '2023': '2023 Only', '2024': '2024 Only' };

        years.forEach(year => {
            filterContainer
                .append('button')
                .text(yearLabels[year])
                .style('margin', '0 5px')
                .style('padding', '8px 16px')
                .style('border', '2px solid #8b5cf6')
                .style('border-radius', '6px')
                .style('background', this.selectedYear === year ? '#8b5cf6' : 'white')
                .style('color', this.selectedYear === year ? 'white' : '#8b5cf6')
                .style('font-weight', '600')
                .style('cursor', 'pointer')
                .style('font-size', '13px')
                .on('click', () => {
                    this.selectedYear = year;
                    this.processData();
                    this.render();
                });
        });

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

        // Prepare stack data
        const keys = ['charges', 'positiveTests'];
        const stack = d3.stack()
            .keys(keys)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        const series = stack(this.data);

        // Create scales
        const xScale = d3.scaleBand()
            .domain(this.data.map(d => d.jurisdiction))
            .range([0, this.width])
            .padding(0.5); // 50% spacing for optimal readability

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(series, d => d3.max(d, d => d[1])) * 1.15]) // Start at zero, add headroom
            .range([this.height, 0]);

        // Create axes
        const xAxis = d3.axisBottom(xScale);
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
            .style('font-size', '12px')
            .style('font-weight', '600');

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
            .text('Number of Cases');

        // Color mapping for keys
        const colorMap = {
            'charges': this.colorScale['Charges'],
            'positiveTests': this.colorScale['Positive Tests']
        };

        // Add stacked bars
        const layers = this.svg.selectAll('.layer')
            .data(series)
            .enter()
            .append('g')
            .attr('class', 'layer')
            .attr('fill', d => colorMap[d.key]);

        layers.selectAll('rect')
            .data(d => d)
            .enter()
            .append('rect')
            .attr('x', d => xScale(d.data.jurisdiction))
            .attr('y', d => yScale(d[1]))
            .attr('height', d => yScale(d[0]) - yScale(d[1]))
            .attr('width', xScale.bandwidth())
            .attr('rx', 4) // Rounded corners
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .style('opacity', 1);

                const value = d[1] - d[0];
                const layer = d3.select(event.currentTarget.parentNode).datum();
                const metricName = layer.key === 'charges' ? 'Charges' : 'Positive Tests';
                const color = colorMap[layer.key];
                const chargeRate = d.data.charges > 0 ? ((d.data.charges / d.data.positiveTests) * 100).toFixed(1) : '0.0';

                this.tooltip
                    .style('opacity', 1)
                    .html(`
                        <div style="font-weight: 700; color: ${color}; font-size: 16px; margin-bottom: 8px;">
                            ${d.data.jurisdiction} - ${metricName}
                        </div>
                        <div style="color: #374151; font-size: 14px; margin-bottom: 4px;">
                            <strong>${metricName}:</strong> ${value.toLocaleString()}
                        </div>
                        <div style="color: #6b7280; font-size: 13px; padding-top: 8px; border-top: 1px solid #e5e7eb; margin-top: 8px;">
                            <strong>Total Positive Tests:</strong> ${d.data.positiveTests.toLocaleString()}<br>
                            <strong>Total Charges:</strong> ${d.data.charges.toLocaleString()}<br>
                            <strong>Charge Rate:</strong> ${chargeRate}%
                        </div>
                    `);
            })
            .on('mousemove', (event) => {
                const containerRect = d3.select(`#${this.containerId}`).node().getBoundingClientRect();
                this.tooltip
                    .style('left', (event.clientX - containerRect.left + 15) + 'px')
                    .style('top', (event.clientY - containerRect.top - 15) + 'px');
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .style('opacity', 0.85);

                this.tooltip.style('opacity', 0);
            });

        // Add legend
        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width + 20}, 0)`);

        const legendData = [
            { label: 'Positive Tests', color: this.colorScale['Positive Tests'] },
            { label: 'Charges', color: this.colorScale['Charges'] }
        ];

        legendData.forEach((item, i) => {
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * 25})`);

            legendRow.append('rect')
                .attr('width', 18)
                .attr('height', 18)
                .attr('rx', 3)
                .style('fill', item.color)
                .style('opacity', 0.85);

            legendRow.append('text')
                .attr('x', 25)
                .attr('y', 13)
                .style('font-size', '13px')
                .style('font-weight', '600')
                .style('fill', '#374151')
                .text(item.label);
        });

        legend.append('text')
            .attr('x', 0)
            .attr('y', -15)
            .style('font-size', '12px')
            .style('font-weight', '700')
            .style('fill', '#6b7280')
            .text('Metrics');

        // Add statistics summary
        const totalPositiveTests = d3.sum(this.data, d => d.positiveTests);
        const totalCharges = d3.sum(this.data, d => d.charges);
        const chargeRate = totalPositiveTests > 0 ? ((totalCharges / totalPositiveTests) * 100).toFixed(1) : '0';
        
        const topJurisdiction = [...this.data].sort((a, b) => b.positiveTests - a.positiveTests)[0];
        const highestChargeRateJurisdiction = [...this.data]
            .filter(d => d.positiveTests > 0)
            .sort((a, b) => (b.charges / b.positiveTests) - (a.charges / a.positiveTests))[0];

        // const statsPanel = d3.select(`#${this.containerId}`)
        //     .append('div')
        //     .style('margin-top', '20px')
        //     .style('padding', '20px')
        //     .style('background', 'linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)')
        //     .style('border-radius', '12px')
        //     .style('border', '2px solid #e9d5ff');

        const yearLabel = this.selectedYear === 'both' ? '2023-2024' : this.selectedYear;

        // // statsPanel.html(`
            
        // `);

        // Add jurisdiction comparison table

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
                In ${yearLabel}, <strong>${totalPositiveTests.toLocaleString()}</strong> positive drug tests were recorded, 
                resulting in <strong>${totalCharges.toLocaleString()}</strong> charges—a charge rate of <strong>${chargeRate}%</strong>. 
                <strong>${topJurisdiction.jurisdiction}</strong> had the highest number of positive tests, while 
                <strong>${highestChargeRateJurisdiction.jurisdiction}</strong> had the highest charge rate at 
                <strong>${((highestChargeRateJurisdiction.charges / highestChargeRateJurisdiction.positiveTests) * 100).toFixed(1)}%</strong>. 
                This variation reflects different enforcement policies across jurisdictions.
            </div>
        `);
    }
}
