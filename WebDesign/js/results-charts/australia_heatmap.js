/**
 * Australia Heat Map Chart
 * Visualizes positive breath tests by jurisdiction on an Australia map with year filtering
 */

class AustraliaHeatMap {
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
                count: +d.COUNT,
                metric: d.METRIC,
                startDate: d.START_DATE || '',
                endDate: d.END_DATE || ''
            }));

            // Set default year to most recent
            this.selectedYear = d3.max(this.data, d => d.year);
            
            console.log(`✓ Loaded ${this.data.length} records for heat map`);
            
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
            // Using a simplified Australia GeoJSON from public source
            const response = await fetch('https://raw.githubusercontent.com/rowanhogan/australian-states/master/states.geojson');
            this.geoData = await response.json();
            console.log('✓ Loaded Australia GeoJSON data');
        } catch (error) {
            console.warn('Could not load GeoJSON from external source, using fallback');
            // Create a simple fallback boundary for Australia
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
            .attr('class', 'australia-heatmap-container');

        // Add year filter
        this.createYearFilter(chartContainer);

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
                this.svg.attr('transform', 
                    `translate(${this.config.margin.left + event.transform.x},${this.config.margin.top + event.transform.y}) scale(${event.transform.k})`
                );
            });

        // Apply zoom to the parent SVG
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
            .attr('class', 'zoom-btn zoom-in')
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
            .style('transition', 'all 0.2s ease')
            .html('+')
            .on('click', () => {
                const svg = d3.select(container.node().querySelector('svg'));
                svg.transition().duration(300).call(zoom.scaleBy, 1.3);
            })
            .on('mouseover', function() {
                d3.select(this)
                    .style('background', '#f1f5f9')
                    .style('border-color', '#94a3b8');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('background', 'white')
                    .style('border-color', '#cbd5e1');
            });

        // Zoom out button
        controlsDiv.append('button')
            .attr('class', 'zoom-btn zoom-out')
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
            .style('transition', 'all 0.2s ease')
            .html('−')
            .on('click', () => {
                const svg = d3.select(container.node().querySelector('svg'));
                svg.transition().duration(300).call(zoom.scaleBy, 0.7);
            })
            .on('mouseover', function() {
                d3.select(this)
                    .style('background', '#f1f5f9')
                    .style('border-color', '#94a3b8');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('background', 'white')
                    .style('border-color', '#cbd5e1');
            });

        // Reset zoom button
        controlsDiv.append('button')
            .attr('class', 'zoom-btn zoom-reset')
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
            .style('transition', 'all 0.2s ease')
            .html('⟲')
            .on('click', () => {
                const svg = d3.select(container.node().querySelector('svg'));
                svg.transition().duration(500).call(
                    zoom.transform,
                    d3.zoomIdentity
                );
            })
            .on('mouseover', function() {
                d3.select(this)
                    .style('background', '#f1f5f9')
                    .style('border-color', '#94a3b8');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('background', 'white')
                    .style('border-color', '#cbd5e1');
            });

        // Add help text
        controlsDiv.append('div')
            .style('margin-top', '10px')
            .style('padding', '8px 10px')
            .style('background', 'rgba(255, 255, 255, 0.95)')
            .style('border', '2px solid #cbd5e1')
            .style('border-radius', '8px')
            .style('font-size', '11px')
            .style('color', '#64748b')
            .style('text-align', 'center')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.1)')
            .style('font-weight', '600')
            .html('Scroll or<br/>drag to zoom');
    }

    /**
     * Create year filter controls
     */
    createYearFilter(container) {
        const filterContainer = container
            .append('div')
            .attr('class', 'year-filter')
            .style('margin-bottom', '30px')
            .style('padding', '20px')
            .style('background', '#f8fafc')
            .style('border-radius', '12px')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.08)')
            .style('text-align', 'center');

        // Filter title
        const titleDiv = filterContainer
            .append('div')
            .style('font-size', '16px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('margin-bottom', '15px')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('gap', '8px');

        // Add calendar SVG icon
        titleDiv.append('div')
            .style('width', '24px')
            .style('height', '24px')
            .style('display', 'inline-flex')
            .html('<svg height="24" version="1.1" width="24" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0 -1028.4)"><path d="m5 1032.4c-1.1046 0-2 0.9-2 2v14c0 1.1 0.8954 2 2 2h6 2 6c1.105 0 2-0.9 2-2v-14c0-1.1-0.895-2-2-2h-6-2-6z" fill="#bdc3c7"/><path d="m5 3c-1.1046 0-2 0.8954-2 2v14c0 1.105 0.8954 2 2 2h6 2 6c1.105 0 2-0.895 2-2v-14c0-1.1046-0.895-2-2-2h-6-2-6z" fill="#ecf0f1" transform="translate(0 1028.4)"/><path d="m5 1031.4c-1.1046 0-2 0.9-2 2v3h18v-3c0-1.1-0.895-2-2-2h-6-2-6z" fill="#e74c3c"/><path d="m7 5.5a1.5 1.5 0 1 1 -3 0 1.5 1.5 0 1 1 3 0z" fill="#c0392b" transform="translate(.5 1028.4)"/><path d="m6 1c-0.5523 0-1 0.4477-1 1v3c0 0.5523 0.4477 1 1 1s1-0.4477 1-1v-3c0-0.5523-0.4477-1-1-1z" fill="#bdc3c7" transform="translate(0 1028.4)"/><path d="m7 5.5a1.5 1.5 0 1 1 -3 0 1.5 1.5 0 1 1 3 0z" fill="#c0392b" transform="translate(12.5 1028.4)"/><path d="m18 1029.4c-0.552 0-1 0.4-1 1v3c0 0.5 0.448 1 1 1s1-0.5 1-1v-3c0-0.6-0.448-1-1-1z" fill="#bdc3c7"/><rect fill="#c0392b" height="1" transform="translate(0 1028.4)" width="18" x="3" y="8"/><path d="m8 1039.4v1h2c0.552 0 1 0.4 1 1 0 0.5-0.448 1-1 1h-1v1h1c0.552 0 1 0.4 1 1 0 0.5-0.448 1-1 1h-2v1h2c1.105 0 2-0.9 2-2 0-0.6-0.268-1.2-0.688-1.5 0.42-0.4 0.688-0.9 0.688-1.5 0-1.1-0.895-2-2-2h-2z" fill="#95a5a6"/><path d="m13 1039.4v1h1v5h-1v1h1 1 1v-1h-1v-6h-1-1z" fill="#95a5a6"/></g></svg>');

        // Add text label
        titleDiv.append('span')
            .text('Select Year');

        // Get unique years
        const years = [...new Set(this.data.map(d => d.year))].sort((a, b) => b - a); // Sort descending (newest first)

        // Dropdown container
        const dropdownContainer = filterContainer
            .append('div')
            .style('max-width', '400px')
            .style('margin', '0 auto')
            .style('padding', '0 20px');

        // Year dropdown
        const dropdown = dropdownContainer
            .append('select')
            .attr('id', 'year-dropdown')
            .style('width', '100%')
            .style('padding', '12px 20px')
            .style('font-size', '18px')
            .style('font-weight', '700')
            .style('color', '#1e293b')
            .style('background', 'white')
            .style('border', '2px solid #3b82f6')
            .style('border-radius', '8px')
            .style('cursor', 'pointer')
            .style('outline', 'none')
            .style('appearance', 'none')
            .style('background-image', 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%233b82f6\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")')
            .style('background-repeat', 'no-repeat')
            .style('background-position', 'right 12px center')
            .style('background-size', '20px')
            .style('padding-right', '45px')
            .style('transition', 'all 0.2s ease')
            .on('change', (event) => {
                this.selectedYear = +event.target.value;
                this.render();
            })
            .on('mouseover', function() {
                d3.select(this)
                    .style('border-color', '#2563eb')
                    .style('box-shadow', '0 0 0 3px rgba(59, 130, 246, 0.1)');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('border-color', '#3b82f6')
                    .style('box-shadow', 'none');
            });

        // Add options to dropdown
        years.forEach(year => {
            dropdown.append('option')
                .attr('value', year)
                .property('selected', year === this.selectedYear)
                .text(year);
        });

        // Add description text
        dropdownContainer
            .append('div')
            .style('margin-top', '12px')
            .style('font-size', '12px')
            .style('color', '#64748b')
            .style('text-align', 'center')
            .style('font-weight', '500')
            .text(`Select from ${years[years.length - 1]} to ${years[0]}`);
    }

    /**
     * Render the heat map
     */
    render() {
        if (!this.data || !this.geoData) {
            console.error('No data loaded');
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
                .text('No data available for selected year');
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

        // Add glow effect definition
        const defs = this.svg.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'glow');
        
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '5')
            .attr('result', 'coloredBlur');
        
        const feMerge1 = filter.append('feMerge');
        feMerge1.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge1.append('feMergeNode').attr('in', 'SourceGraphic');

        // Create color and opacity scales
        const maxCount = d3.max(yearData, d => d.count);
        const colorScale = d3.scaleSequential()
            .domain([0, maxCount])
            .interpolator(d3.interpolateYlOrRd);

        const opacityScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([0.3, 0.85]);

        // Add title
        this.svg.append('text')
            .attr('x', width / 2)
            .attr('y', -40)
            .attr('text-anchor', 'middle')
            .style('font-size', '20px')
            .style('font-weight', '700')
            .style('fill', '#0f172a')
            .text(`Australia: Positive Breath Tests by Jurisdiction (${this.selectedYear})`);

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
            .attr('stroke-width', 1.5)
            .style('opacity', 1);

        // Add glow filter for heat effect
        const glowFilter = defs.append('filter')
            .attr('id', 'heat-glow');
        
        glowFilter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');
        
        const feMerge2 = glowFilter.append('feMerge');
        feMerge2.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge2.append('feMergeNode').attr('in', 'SourceGraphic');

        // Create a map of data by state name
        const dataByState = {};
        yearData.forEach(d => {
            const fullName = this.stateNameMap[d.jurisdiction];
            dataByState[fullName] = d;
            // Also try abbreviated version
            dataByState[d.jurisdiction] = d;
        });

        // Draw heat overlays using actual jurisdiction boundaries
        this.svg.append('g')
            .attr('class', 'heat-layer')
            .selectAll('path')
            .data(this.geoData.features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', d => {
                const stateName = d.properties.STATE_NAME || d.properties.name || '';
                return `heat-region heat-${stateName.replace(/\s+/g, '-')}`;
            })
            .attr('fill', d => {
                const stateName = d.properties.STATE_NAME || d.properties.name || '';
                const stateData = dataByState[stateName] || dataByState[this.getStateCode(stateName)];
                return stateData ? colorScale(stateData.count) : '#e2e8f0';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('opacity', 0)
            .style('cursor', 'pointer')
            .attr('filter', 'url(#heat-glow)')
            .on('mouseover', (event, d) => {
                const stateName = d.properties.STATE_NAME || d.properties.name || '';
                const stateData = dataByState[stateName] || dataByState[this.getStateCode(stateName)];
                if (stateData) {
                    d3.select(event.target)
                        .style('opacity', 0.95)
                        .attr('stroke-width', 3);
                    this.showTooltip(event, stateData);
                }
            })
            .on('mouseout', (event, d) => {
                const stateName = d.properties.STATE_NAME || d.properties.name || '';
                const stateData = dataByState[stateName] || dataByState[this.getStateCode(stateName)];
                if (stateData) {
                    d3.select(event.target)
                        .style('opacity', opacityScale(stateData.count))
                        .attr('stroke-width', 2);
                    this.hideTooltip();
                }
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .transition()
            .duration(800)
            .style('opacity', d => {
                const stateName = d.properties.STATE_NAME || d.properties.name || '';
                const stateData = dataByState[stateName] || dataByState[this.getStateCode(stateName)];
                return stateData ? opacityScale(stateData.count) : 0;
            });

        // Add state labels with counts
        this.geoData.features.forEach(feature => {
            const stateName = feature.properties.STATE_NAME || feature.properties.name || '';
            const stateData = dataByState[stateName] || dataByState[this.getStateCode(stateName)];
            
            if (stateData) {
                const centroid = path.centroid(feature);
                
                const labelGroup = this.svg.append('g')
                    .attr('class', `label-${stateData.jurisdiction}`)
                    .style('pointer-events', 'none');

                // State code label
                labelGroup.append('text')
                    .attr('x', centroid[0])
                    .attr('y', centroid[1] - 8)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '18px')
                    .style('font-weight', '900')
                    .style('fill', '#1e293b')
                    .style('text-shadow', '0 0 4px white, 0 0 4px white, 0 0 4px white, 0 0 8px white')
                    .style('opacity', 0)
                    .text(stateData.jurisdiction)
                    .transition()
                    .duration(800)
                    .style('opacity', 1);

                // Count label
                labelGroup.append('text')
                    .attr('x', centroid[0])
                    .attr('y', centroid[1] + 12)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '14px')
                    .style('font-weight', '700')
                    .style('fill', '#1e293b')
                    .style('text-shadow', '0 0 3px white, 0 0 3px white, 0 0 3px white')
                    .style('opacity', 0)
                    .text(stateData.count.toLocaleString())
                    .transition()
                    .duration(800)
                    .style('opacity', 1);
            }
        });

        // Add legend
        this.addLegend(colorScale, maxCount);

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
        // Try to match partial names
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
    addLegend(colorScale, maxCount) {
        const legendWidth = 300;
        const legendHeight = 20;
        const legendX = (this.config.width - this.config.margin.left - this.config.margin.right - legendWidth) / 2;
        const legendY = this.config.height - this.config.margin.top - this.config.margin.bottom + 20;

        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${legendX}, ${legendY})`);

        // Create gradient
        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'legend-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%');

        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            gradient.append('stop')
                .attr('offset', `${(i / steps) * 100}%`)
                .attr('stop-color', colorScale((maxCount / steps) * i));
        }

        // Legend rectangle
        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('rx', 4)
            .style('fill', 'url(#legend-gradient)')
            .style('stroke', '#64748b')
            .style('stroke-width', 1);

        // Legend labels
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
            .text(maxCount.toLocaleString());

        legend.append('text')
            .attr('x', legendWidth / 2)
            .attr('y', -8)
            .attr('text-anchor', 'middle')
            .style('font-size', '13px')
            .style('font-weight', '700')
            .style('fill', '#1e293b')
            .text('Number of Positive Breath Tests');
    }

    /**
     * Add ranking panel
     */
    addRankingPanel(yearData) {
        const sorted = [...yearData].sort((a, b) => b.count - a.count);
        
        const panel = this.svg.append('g')
            .attr('class', 'ranking-panel')
            .attr('transform', `translate(20, 20)`);

        // Background
        panel.append('rect')
            .attr('width', 200)
            .attr('height', 30 + sorted.length * 32)
            .attr('rx', 8)
            .attr('fill', 'rgba(255, 255, 255, 0.95)')
            .attr('stroke', '#e5e7eb')
            .attr('stroke-width', 1);

        // Title
        panel.append('text')
            .attr('x', 100)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('fill', '#1e293b')
            .text('Rankings');

        // Rankings
        sorted.forEach((d, i) => {
            const y = 40 + i * 32;
            const rank = panel.append('g')
                .attr('transform', `translate(10, ${y})`);

            // Rank number
            rank.append('text')
                .attr('x', 15)
                .attr('y', 12)
                .attr('text-anchor', 'middle')
                .style('font-size', '13px')
                .style('font-weight', '700')
                .style('fill', i === 0 ? '#f59e0b' : '#64748b')
                .text(`#${i + 1}`);

            // Jurisdiction
            rank.append('text')
                .attr('x', 40)
                .attr('y', 12)
                .style('font-size', '13px')
                .style('font-weight', '700')
                .style('fill', '#1e293b')
                .text(d.jurisdiction);

            // Count
            rank.append('text')
                .attr('x', 175)
                .attr('y', 12)
                .attr('text-anchor', 'end')
                .style('font-size', '12px')
                .style('font-weight', '600')
                .style('fill', '#475569')
                .text(d.count.toLocaleString());
        });
    }

    /**
     * Show tooltip
     */
    showTooltip(event, data) {
        const rank = [...this.data.filter(d => d.year === this.selectedYear)]
            .sort((a, b) => b.count - a.count)
            .findIndex(d => d.jurisdiction === data.jurisdiction) + 1;

        const tooltipContent = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px; color: #3b82f6;">
                ${data.jurisdiction}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Year:</strong> ${data.year}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Positive Tests:</strong> ${data.count.toLocaleString()}
            </div>
            <div style="margin-bottom: 4px;">
                <strong>Rank:</strong> #${rank} of ${this.data.filter(d => d.year === this.selectedYear).length}
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AustraliaHeatMap };
}
