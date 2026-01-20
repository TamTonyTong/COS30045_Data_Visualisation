/**
 * Fines Enforcement Heat Map
 * Visualizes enforcement outcomes (fines, arrests, charges) by jurisdiction with year filtering
 */

class FinesEnforcementHeatMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // Default configuration
        this.config = {
            margin: { top: 80, right: 20, bottom: 60, left: 20 },
            width: 1200,
            height: 700,
            ...options
        };

        this.data = null;
        this.selectedYear = null;
        this.selectedMetric = 'FINES'; // 'FINES', 'ARRESTS', 'CHARGES'
        this.svg = null;
        this.tooltip = null;
        this.geoData = null;
        
        // State/Territory name mappings
        this.stateNameMap = {
            'NSW': 'New South Wales',
            'VIC': 'Victoria',
            'QLD': 'Queensland',
            'WA': 'Western Australia',
            'SA': 'South Australia',
            'TAS': 'Tasmania',
            'NT': 'Northern Territory',
            'ACT': 'Australian Capital Territory'
        };

        // Metric colors
        this.metricColors = {
            'FINES': d3.interpolateBlues,
            'ARRESTS': d3.interpolateReds,
            'CHARGES': d3.interpolateOranges
        };
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
                fines: +d.FINES || 0,
                arrests: +d.ARRESTS || 0,
                charges: +d.CHARGES || 0,
                startDate: d.START_DATE || '',
                endDate: d.END_DATE || ''
            }));

            // Set default year to most recent
            this.selectedYear = d3.max(this.data, d => d.year);
            
            console.log(`✓ Loaded ${this.data.length} records for enforcement heat map`);
            
            // Load Australia GeoJSON
            await this.loadGeoJSON();
            
            return this.data;
        } catch (error) {
            console.error('Error loading CSV:', error);
            throw error;
        }
    }

    /**
     * Load Australia GeoJSON data
     */
    async loadGeoJSON() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/rowanhogan/australian-states/master/states.geojson');
            this.geoData = await response.json();
            console.log('✓ Loaded Australia GeoJSON data');
        } catch (error) {
            console.warn('Could not load GeoJSON from external source, using fallback');
            this.geoData = this.createFallbackGeoJSON();
        }
    }

    /**
     * Create fallback GeoJSON if external source fails
     */
    createFallbackGeoJSON() {
        return {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": { "name": "Australia" },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [113, -10], [153, -10], [153, -44], [113, -44], [113, -10]
                    ]]
                }
            }]
        };
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
            .attr('class', 'fines-heatmap-container');

        // Add controls
        this.createControls(chartContainer);

        // Create SVG container
        const svgContainer = chartContainer
            .append('div')
            .attr('class', 'map-svg-container')
            .style('text-align', 'center');

        this.svg = svgContainer
            .append('svg')
            .attr('width', this.config.width)
            .attr('height', this.config.height)
            .append('g')
            .attr('transform', `translate(${this.config.margin.left},${this.config.margin.top})`);

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on('zoom', (event) => {
                this.svg.attr('transform', `translate(${this.config.margin.left},${this.config.margin.top}) ${event.transform}`);
            });

        d3.select(svgContainer.node().querySelector('svg')).call(zoom);

        // Add zoom controls
        this.addZoomControls(svgContainer, zoom);

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
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');

        return this;
    }

    /**
     * Add zoom controls
     */
    addZoomControls(container, zoom) {
        const controlsDiv = container
            .append('div')
            .attr('class', 'zoom-controls')
            .style('position', 'absolute')
            .style('top', '100px')
            .style('right', '30px')
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('gap', '10px')
            .style('z-index', '10');

        // Zoom in button
        controlsDiv.append('button')
            .style('width', '40px')
            .style('height', '40px')
            .style('background', 'white')
            .style('border', '2px solid #cbd5e1')
            .style('border-radius', '8px')
            .style('cursor', 'pointer')
            .style('font-size', '20px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.1)')
            .html('+')
            .on('click', () => {
                d3.select(container.node().querySelector('svg'))
                    .transition()
                    .call(zoom.scaleBy, 1.3);
            });

        // Zoom out button
        controlsDiv.append('button')
            .style('width', '40px')
            .style('height', '40px')
            .style('background', 'white')
            .style('border', '2px solid #cbd5e1')
            .style('border-radius', '8px')
            .style('cursor', 'pointer')
            .style('font-size', '20px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.1)')
            .html('−')
            .on('click', () => {
                d3.select(container.node().querySelector('svg'))
                    .transition()
                    .call(zoom.scaleBy, 0.7);
            });

        // Reset zoom button
        controlsDiv.append('button')
            .style('width', '40px')
            .style('height', '40px')
            .style('background', 'white')
            .style('border', '2px solid #cbd5e1')
            .style('border-radius', '8px')
            .style('cursor', 'pointer')
            .style('font-size', '16px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.1)')
            .html('⟲')
            .on('click', () => {
                d3.select(container.node().querySelector('svg'))
                    .transition()
                    .call(zoom.transform, d3.zoomIdentity);
            });
    }

    /**
     * Create control filters
     */
    createControls(container) {
        const controlsContainer = container
            .append('div')
            .attr('class', 'controls-container')
            .style('margin-bottom', '30px')
            .style('padding', '20px')
            .style('background', '#f8fafc')
            .style('border-radius', '12px')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.08)');

        // Year filter
        const yearSection = controlsContainer
            .append('div')
            .style('margin-bottom', '20px')
            .style('text-align', 'center');

        yearSection
            .append('div')
            .style('font-size', '16px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('margin-bottom', '15px')
            .html('📅 Select Year');

        const years = [...new Set(this.data.map(d => d.year))].sort((a, b) => a - b);

        const yearDisplay = yearSection
            .append('div')
            .attr('id', 'fines-year-display')
            .style('font-size', '32px')
            .style('font-weight', '900')
            .style('color', '#3b82f6')
            .style('margin-bottom', '15px')
            .text(this.selectedYear);

        const slider = yearSection
            .append('input')
            .attr('type', 'range')
            .attr('min', years[0])
            .attr('max', years[years.length - 1])
            .attr('value', this.selectedYear)
            .attr('step', 1)
            .style('width', '80%')
            .style('height', '8px')
            .style('cursor', 'pointer')
            .on('input', (event) => {
                this.selectedYear = +event.target.value;
                yearDisplay.text(this.selectedYear);
                this.render();
            });

        // Metric selector
        const metricSection = controlsContainer
            .append('div')
            .style('text-align', 'center');

        metricSection
            .append('div')
            .style('font-size', '16px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('margin-bottom', '15px')
            .html('📊 Select Metric');

        const metricButtons = metricSection
            .append('div')
            .style('display', 'flex')
            .style('gap', '10px')
            .style('justify-content', 'center')
            .style('flex-wrap', 'wrap');

        const metrics = [
            { key: 'FINES', label: '💰 Fines', icon: '💰' },
            { key: 'ARRESTS', label: '🚔 Arrests', icon: '🚔' },
            { key: 'CHARGES', label: '⚖️ Charges', icon: '⚖️' }
        ];

        metrics.forEach(metric => {
            const button = metricButtons
                .append('button')
                .attr('class', `metric-btn metric-${metric.key}`)
                .text(metric.label)
                .style('padding', '10px 20px')
                .style('border', '2px solid #3b82f6')
                .style('border-radius', '8px')
                .style('background', this.selectedMetric === metric.key ? '#3b82f6' : 'white')
                .style('color', this.selectedMetric === metric.key ? 'white' : '#3b82f6')
                .style('font-weight', '700')
                .style('font-size', '14px')
                .style('cursor', 'pointer')
                .style('transition', 'all 0.2s ease')
                .on('click', (event) => {
                    this.selectedMetric = metric.key;
                    // Update button styles
                    metricButtons.selectAll('button')
                        .style('background', 'white')
                        .style('color', '#3b82f6');
                    d3.select(event.target)
                        .style('background', '#3b82f6')
                        .style('color', 'white');
                    // Re-render the map
                    this.render();
                })
                .on('mouseover', function() {
                    if (d3.select(this).style('background-color') !== 'rgb(59, 130, 246)') {
                        d3.select(this).style('background', '#eff6ff');
                    }
                })
                .on('mouseout', function() {
                    if (d3.select(this).style('background-color') !== 'rgb(59, 130, 246)') {
                        d3.select(this).style('background', 'white');
                    }
                });
        });
    }

    /**
     * Render the heat map
     */
    render() {
        if (!this.data || !this.geoData) {
            console.warn('Data not loaded yet');
            return;
        }

        // Clear previous map
        this.svg.selectAll('*').remove();

        // Filter data for selected year
        const yearData = this.data.filter(d => d.year === this.selectedYear);
        
        if (yearData.length === 0) {
            this.svg.append('text')
                .attr('x', (this.config.width - this.config.margin.left - this.config.margin.right) / 2)
                .attr('y', (this.config.height - this.config.margin.top - this.config.margin.bottom) / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '18px')
                .style('fill', '#64748b')
                .text(`No data available for ${this.selectedYear}`);
            return;
        }

        const width = this.config.width - this.config.margin.left - this.config.margin.right;
        const height = this.config.height - this.config.margin.top - this.config.margin.bottom;

        // Create projection
        const projection = d3.geoMercator()
            .center([133, -28])
            .scale(900)
            .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);

        // Get metric value
        const getMetricValue = (d) => {
            switch(this.selectedMetric) {
                case 'FINES': return d.fines;
                case 'ARRESTS': return d.arrests;
                case 'CHARGES': return d.charges;
                default: return 0;
            }
        };

        // Create color scale
        const maxValue = d3.max(yearData, d => getMetricValue(d));
        const colorScale = d3.scaleSequential()
            .domain([0, maxValue])
            .interpolator(this.metricColors[this.selectedMetric]);

        const opacityScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([0.3, 0.85]);

        // Add title
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', -40)
            .attr('text-anchor', 'middle')
            .style('font-size', '20px')
            .style('font-weight', '700')
            .style('fill', '#0f172a')
            .text(`${this.selectedMetric}: ${this.selectedYear}`);

        // Draw Australia map base layer
        this.svg.append('g')
            .attr('class', 'map-base')
            .selectAll('path')
            .data(this.geoData.features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('fill', '#f8fafc')
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 1.5);

        // Create data map
        const dataByState = {};
        yearData.forEach(d => {
            const fullName = this.stateNameMap[d.jurisdiction];
            if (fullName) {
                dataByState[fullName] = d;
            }
            // Also map by abbreviated jurisdiction code
            dataByState[d.jurisdiction] = d;
        });

        // Draw heat overlays
        this.svg.append('g')
            .attr('class', 'heat-layer')
            .selectAll('path')
            .data(this.geoData.features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('fill', d => {
                const stateName = d.properties.STATE_NAME || d.properties.name || '';
                const data = dataByState[stateName] || dataByState[this.getStateCode(stateName)];
                return data ? colorScale(getMetricValue(data)) : '#f8fafc';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('opacity', 0)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                const stateName = d.properties.STATE_NAME || d.properties.name || '';
                const data = dataByState[stateName] || dataByState[this.getStateCode(stateName)];
                if (data) {
                    d3.select(event.currentTarget)
                        .style('opacity', 1)
                        .attr('stroke-width', 3);
                    this.showTooltip(event, data);
                }
            })
            .on('mouseout', (event, d) => {
                const stateName = d.properties.STATE_NAME || d.properties.name || '';
                const data = dataByState[stateName] || dataByState[this.getStateCode(stateName)];
                if (data) {
                    d3.select(event.currentTarget)
                        .style('opacity', opacityScale(getMetricValue(data)))
                        .attr('stroke-width', 2);
                    this.hideTooltip();
                }
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .transition()
            .duration(800)
            .style('opacity', d => {
                const stateName = d.properties.STATE_NAME || d.properties.name || '';
                const data = dataByState[stateName] || dataByState[this.getStateCode(stateName)];
                return data ? opacityScale(getMetricValue(data)) : 0;
            });

        // Add state labels
        this.geoData.features.forEach(feature => {
            const stateName = feature.properties.STATE_NAME || feature.properties.name || '';
            const data = dataByState[stateName] || dataByState[this.getStateCode(stateName)];
            if (data) {
                const centroid = path.centroid(feature);
                const stateCode = this.getStateCode(stateName);
                
                const label = this.svg.append('g')
                    .attr('transform', `translate(${centroid[0]}, ${centroid[1]})`);

                label.append('text')
                    .attr('text-anchor', 'middle')
                    .style('font-size', '14px')
                    .style('font-weight', '700')
                    .style('fill', '#1e293b')
                    .style('pointer-events', 'none')
                    .text(stateCode);

                label.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '1.2em')
                    .style('font-size', '12px')
                    .style('font-weight', '600')
                    .style('fill', '#475569')
                    .style('pointer-events', 'none')
                    .text(getMetricValue(data).toLocaleString());
            }
        });

        // Add legend
        this.addLegend(colorScale, maxValue);

        // Add ranking panel
        this.addRankingPanel(yearData);
    }

    /**
     * Get state code from full state name
     */
    getStateCode(fullName) {
        for (const [code, name] of Object.entries(this.stateNameMap)) {
            if (name === fullName) return code;
        }
        const upperName = fullName.toUpperCase();
        if (upperName.includes('NEW SOUTH WALES') || upperName.includes('NSW')) return 'NSW';
        if (upperName.includes('VICTORIA') || upperName.includes('VIC')) return 'VIC';
        if (upperName.includes('QUEENSLAND') || upperName.includes('QLD')) return 'QLD';
        if (upperName.includes('WESTERN AUSTRALIA') || upperName.includes('WA')) return 'WA';
        if (upperName.includes('SOUTH AUSTRALIA') || upperName.includes('SA')) return 'SA';
        if (upperName.includes('TASMANIA') || upperName.includes('TAS')) return 'TAS';
        if (upperName.includes('NORTHERN TERRITORY') || upperName.includes('NT')) return 'NT';
        if (upperName.includes('CAPITAL TERRITORY') || upperName.includes('ACT')) return 'ACT';
        return null;
    }

    /**
     * Add color legend
     */
    addLegend(colorScale, maxValue) {
        const legendWidth = 300;
        const legendHeight = 20;
        const legendX = (this.config.width - this.config.margin.left - this.config.margin.right - legendWidth) / 2;
        const legendY = this.config.height - this.config.margin.top - this.config.margin.bottom + 20;

        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${legendX}, ${legendY})`);

        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'fines-legend-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%');

        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            gradient.append('stop')
                .attr('offset', `${t * 100}%`)
                .attr('stop-color', colorScale(t * maxValue));
        }

        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('rx', 4)
            .style('fill', 'url(#fines-legend-gradient)')
            .style('stroke', '#64748b')
            .style('stroke-width', 1);

        legend.append('text')
            .attr('x', 0)
            .attr('y', legendHeight + 18)
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('fill', '#475569')
            .text('0');

        legend.append('text')
            .attr('x', legendWidth)
            .attr('y', legendHeight + 18)
            .attr('text-anchor', 'end')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('fill', '#475569')
            .text(maxValue.toLocaleString());

        legend.append('text')
            .attr('x', legendWidth / 2)
            .attr('y', -8)
            .attr('text-anchor', 'middle')
            .style('font-size', '13px')
            .style('font-weight', '700')
            .style('fill', '#1e293b')
            .text(`Number of ${this.selectedMetric}`);
    }

    /**
     * Add ranking panel
     */
    addRankingPanel(yearData) {
        const getMetricValue = (d) => {
            switch(this.selectedMetric) {
                case 'FINES': return d.fines;
                case 'ARRESTS': return d.arrests;
                case 'CHARGES': return d.charges;
                default: return 0;
            }
        };

        const sorted = [...yearData].sort((a, b) => getMetricValue(b) - getMetricValue(a));
        
        const panel = this.svg.append('g')
            .attr('class', 'ranking-panel')
            .attr('transform', `translate(20, 20)`);

        panel.append('rect')
            .attr('width', 220)
            .attr('height', 30 + sorted.length * 32)
            .attr('rx', 8)
            .attr('fill', 'rgba(255, 255, 255, 0.95)')
            .attr('stroke', '#e5e7eb')
            .attr('stroke-width', 1);

        panel.append('text')
            .attr('x', 110)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('fill', '#1e293b')
            .text('🏆 Rankings');

        sorted.forEach((d, i) => {
            const row = panel.append('g')
                .attr('transform', `translate(10, ${40 + i * 32})`);

            const medals = ['🥇', '🥈', '🥉'];
            const rankDisplay = i < 3 ? medals[i] : `${i + 1}.`;

            row.append('text')
                .attr('x', 0)
                .attr('y', 12)
                .style('font-size', '13px')
                .style('font-weight', '700')
                .style('fill', '#1e293b')
                .text(rankDisplay);

            row.append('text')
                .attr('x', 35)
                .attr('y', 12)
                .style('font-size', '13px')
                .style('font-weight', '700')
                .style('fill', '#475569')
                .text(d.jurisdiction);

            row.append('text')
                .attr('x', 200)
                .attr('y', 12)
                .attr('text-anchor', 'end')
                .style('font-size', '12px')
                .style('font-weight', '600')
                .style('fill', '#64748b')
                .text(getMetricValue(d).toLocaleString());
        });
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data) {
        const getMetricValue = (d) => {
            switch(this.selectedMetric) {
                case 'FINES': return d.fines;
                case 'ARRESTS': return d.arrests;
                case 'CHARGES': return d.charges;
                default: return 0;
            }
        };

        const rank = [...this.data.filter(d => d.year === this.selectedYear)]
            .sort((a, b) => getMetricValue(b) - getMetricValue(a))
            .findIndex(d => d.jurisdiction === data.jurisdiction) + 1;

        const tooltipContent = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px; color: #3b82f6;">
                ${data.jurisdiction} - ${this.selectedYear}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>💰 Fines:</strong> ${data.fines.toLocaleString()}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>🚔 Arrests:</strong> ${data.arrests.toLocaleString()}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>⚖️ Charges:</strong> ${data.charges.toLocaleString()}
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">
                <strong>Rank (${this.selectedMetric}):</strong> #${rank}
            </div>
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
