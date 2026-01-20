/**
 * Drug Cases by Age Group Grouped Bar Chart
 * Compares positive drug test cases across age groups for 2023 and 2024
 */

class DrugAgeGroupedChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.data = [];
        this.margin = { top: 40, right: 150, bottom: 100, left: 80 };
        this.width = 900 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
        
        // Color scheme for years
        this.colorScale = {
            '2023': '#8b5cf6',
            '2024': '#10b981'
        };
    }

    async loadData(csvPath) {
        try {
            const rawData = await d3.csv(csvPath, d => ({
                year: d.YEAR,
                ageGroup: d.AGE_GROUP,
                count: +d['Sum(COUNT)']
            }));
            
            // Filter out 'All ages' and 'Unknown' categories for clearer visualization
            this.data = rawData.filter(d => 
                d.ageGroup !== 'All ages' && d.ageGroup !== 'Unknown'
            );
            
            // Group data by age group
            this.ageGroups = Array.from(new Set(this.data.map(d => d.ageGroup)));
            
            // Sort age groups by 2024 count (largest to smallest) for better comparison
            const counts2024 = {};
            this.data.filter(d => d.year === '2024').forEach(d => {
                counts2024[d.ageGroup] = d.count;
            });
            this.ageGroups.sort((a, b) => (counts2024[b] || 0) - (counts2024[a] || 0));
            
            console.log('Drug age group data loaded:', this.data);
        } catch (error) {
            console.error('Error loading drug age group data:', error);
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

        const years = ['2023', '2024'];

        // Create scales
        const x0Scale = d3.scaleBand()
            .domain(this.ageGroups)
            .range([0, this.width])
            .padding(0.4); // Grouped bars - slightly tighter spacing

        const x1Scale = d3.scaleBand()
            .domain(years)
            .range([0, x0Scale.bandwidth()])
            .padding(0.1); // Minimal padding between grouped bars

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.count) * 1.15]) // Start at zero, add headroom for labels
            .range([this.height, 0]);

        // Create axes
        const xAxis = d3.axisBottom(x0Scale);
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

        // Add X axis label
        this.svg.append('text')
            .attr('class', 'axis-label')
            .attr('text-anchor', 'middle')
            .attr('x', this.width / 2)
            .attr('y', this.height + 80)
            .style('font-size', '14px')
            .style('font-weight', '600')
            .style('fill', '#4b5563')
            .text('Age Group');

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
            .text('Number of Positive Drug Tests');

        // Create grouped bars
        const ageGroupBars = this.svg.selectAll('.age-group')
            .data(this.ageGroups)
            .enter()
            .append('g')
            .attr('class', 'age-group')
            .attr('transform', d => `translate(${x0Scale(d)},0)`);

        // Find max values for each year for highlighting
        const max2023 = d3.max(this.data.filter(d => d.year === '2023'), d => d.count);
        const max2024 = d3.max(this.data.filter(d => d.year === '2024'), d => d.count);

        years.forEach(year => {
            ageGroupBars.selectAll(`.bar-${year}`)
                .data(ageGroup => {
                    const dataPoint = this.data.find(d => d.ageGroup === ageGroup && d.year === year);
                    return dataPoint ? [dataPoint] : [];
                })
                .enter()
                .append('rect')
                .attr('class', `bar-${year}`)
                .attr('x', x1Scale(year))
                .attr('y', d => yScale(d.count))
                .attr('width', x1Scale.bandwidth())
                .attr('height', d => this.height - yScale(d.count))
                .attr('fill', this.colorScale[year])
                .attr('rx', 4) // Rounded corners
                .attr('stroke', d => (year === '2023' && d.count === max2023) || (year === '2024' && d.count === max2024) ? '#0f172a' : 'none') // Highlight top values
                .attr('stroke-width', d => (year === '2023' && d.count === max2023) || (year === '2024' && d.count === max2024) ? 2 : 0)
                .style('cursor', 'pointer')
                .on('mouseover', (event, d) => {
                    d3.select(event.currentTarget)
                        .transition()
                        .duration(200)
                        .style('opacity', 1)
                        .attr('y', yScale(d.count) - 5)
                        .attr('height', this.height - yScale(d.count) + 5);

                    // Calculate year-over-year change
                    const otherYear = year === '2023' ? '2024' : '2023';
                    const otherData = this.data.find(item => 
                        item.ageGroup === d.ageGroup && item.year === otherYear
                    );
                    
                    let changeText = '';
                    if (otherData) {
                        const change = d.count - otherData.count;
                        const percentChange = ((change / otherData.count) * 100).toFixed(1);
                        const changeColor = change > 0 ? '#ef4444' : '#10b981';
                        const changeSymbol = change > 0 ? '↑' : '↓';
                        changeText = `
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                                <strong>Year-over-year change:</strong><br>
                                <span style="color: ${changeColor}; font-weight: 700;">
                                    ${changeSymbol} ${Math.abs(change).toLocaleString()} (${percentChange > 0 ? '+' : ''}${percentChange}%)
                                </span>
                            </div>
                        `;
                    }

                    this.tooltip
                        .style('opacity', 1)
                        .html(`
                            <div style="font-weight: 700; color: ${this.colorScale[year]}; font-size: 16px; margin-bottom: 8px;">
                                ${d.ageGroup} - ${d.year}
                            </div>
                            <div style="color: #374151; font-size: 14px;">
                                <strong>Positive Tests:</strong> ${d.count.toLocaleString()}
                            </div>
                            ${changeText}
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
                        .style('opacity', 0.85)
                        .attr('y', yScale(d.count))
                        .attr('height', this.height - yScale(d.count));

                    this.tooltip.style('opacity', 0);
                });
        });

        // Add legend
        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width + 20}, 0)`);

        years.forEach((year, i) => {
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * 25})`);

            legendRow.append('rect')
                .attr('width', 18)
                .attr('height', 18)
                .attr('rx', 3)
                .style('fill', this.colorScale[year])
                .style('opacity', 0.85);

            legendRow.append('text')
                .attr('x', 25)
                .attr('y', 13)
                .style('font-size', '13px')
                .style('font-weight', '600')
                .style('fill', '#374151')
                .text(year);
        });

        legend.append('text')
            .attr('x', 0)
            .attr('y', -15)
            .style('font-size', '12px')
            .style('font-weight', '700')
            .style('fill', '#6b7280')
            .text('Year');

        // Calculate statistics
        const data2023 = this.data.filter(d => d.year === '2023');
        const data2024 = this.data.filter(d => d.year === '2024');
        
        const total2023 = d3.sum(data2023, d => d.count);
        const total2024 = d3.sum(data2024, d => d.count);
        const totalChange = total2024 - total2023;
        const percentChange = ((totalChange / total2023) * 100).toFixed(1);
        
        const top2023 = data2023.reduce((max, d) => d.count > max.count ? d : max);
        const top2024 = data2024.reduce((max, d) => d.count > max.count ? d : max);

      

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
                Between 2023 and 2024, positive drug tests ${totalChange > 0 ? 'increased' : 'decreased'} by 
                <strong>${Math.abs(totalChange).toLocaleString()}</strong> cases (<strong>${Math.abs(percentChange)}%</strong>). 
                The <strong>${top2024.ageGroup}</strong> age group consistently shows the highest number of positive tests, 
                with <strong>${top2024.count.toLocaleString()}</strong> cases in 2024. 
                This demographic pattern highlights the need for targeted road safety interventions across different age groups.
            </div>
        `);
    }
}
