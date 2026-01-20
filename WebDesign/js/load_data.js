/**
 * Data Loading Utility
 * Handles loading and parsing Excel files for Australian Road Safety Enforcement visualization
 */

class DataLoader {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Load Excel file using SheetJS (xlsx) library
     * @param {string} filePath - Path to the Excel file
     * @param {string} sheetName - Optional sheet name to load
     * @returns {Promise<Array>} Parsed data as array of objects
     */
    async loadExcel(filePath, sheetName = null) {
        // Check cache first
        const cacheKey = `${filePath}:${sheetName}`;
        if (this.cache.has(cacheKey)) {
            console.log(`Loading ${filePath} from cache`);
            return this.cache.get(cacheKey);
        }

        try {
            console.log(`Loading ${filePath}...`);
            
            // Fetch the file
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            
            // Parse with SheetJS
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Get sheet name
            const sheet = sheetName || workbook.SheetNames[0];
            
            if (!workbook.Sheets[sheet]) {
                throw new Error(`Sheet "${sheet}" not found in ${filePath}`);
            }

            // Convert to JSON
            const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);
            
            console.log(`✓ Loaded ${data.length} rows from ${filePath}`);
            
            // Cache the data
            this.cache.set(cacheKey, data);
            
            return data;
        } catch (error) {
            console.error(`Error loading ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Load all datasets for the project
     * @returns {Promise<Object>} Object containing all datasets
     */
    async loadAllDatasets() {
        const datasets = {};
        
        try {
            // Load fines dataset
            datasets.fines = await this.loadExcel(
                'data/police_enforcement_2024_fines.xlsx'
            );

            // Load total tests dataset
            datasets.totalTests = await this.loadExcel(
                'data/police_enforcement_2024_alcohol_drug_tests_TAMTONG.xlsx'
            );

            // Load positive breath tests dataset
            datasets.positiveBreath = await this.loadExcel(
                'data/police_enforcement_2024_positive_breath_tests.xlsx'
            );

            // Load positive drug tests dataset
            datasets.positiveDrug = await this.loadExcel(
                'data/police_enforcement_2024_positive_drug_tests.xlsx'
            );

            console.log('✓ All datasets loaded successfully');
            return datasets;
        } catch (error) {
            console.error('Error loading datasets:', error);
            throw error;
        }
    }

    /**
     * Filter data by field value
     * @param {Array} data - Data array to filter
     * @param {string} field - Field name to filter on
     * @param {*} value - Value to match
     * @returns {Array} Filtered data
     */
    filterBy(data, field, value) {
        return data.filter(d => d[field] === value);
    }

    /**
     * Group data by field and aggregate
     * @param {Array} data - Data array to group
     * @param {string} groupField - Field to group by
     * @param {string} valueField - Field to aggregate
     * @param {string} aggregation - Type of aggregation ('sum', 'count', 'avg')
     * @returns {Array} Grouped data
     */
    groupBy(data, groupField, valueField = null, aggregation = 'sum') {
        const grouped = new Map();

        data.forEach(row => {
            const key = row[groupField];
            if (!grouped.has(key)) {
                grouped.set(key, { [groupField]: key, values: [] });
            }
            
            if (valueField) {
                grouped.get(key).values.push(parseFloat(row[valueField]) || 0);
            } else {
                grouped.get(key).values.push(1);
            }
        });

        // Aggregate
        const result = [];
        grouped.forEach((group, key) => {
            let aggregatedValue;
            
            switch (aggregation) {
                case 'sum':
                    aggregatedValue = group.values.reduce((a, b) => a + b, 0);
                    break;
                case 'count':
                    aggregatedValue = group.values.length;
                    break;
                case 'avg':
                    aggregatedValue = group.values.reduce((a, b) => a + b, 0) / group.values.length;
                    break;
                default:
                    aggregatedValue = group.values.reduce((a, b) => a + b, 0);
            }

            result.push({
                [groupField]: key,
                value: aggregatedValue
            });
        });

        return result;
    }

    /**
     * Parse date field
     * @param {string} dateString - Date string to parse
     * @returns {Date} Parsed date
     */
    parseDate(dateString) {
        return new Date(dateString);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Cache cleared');
    }
}

// Create global instance
const dataLoader = new DataLoader();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataLoader, dataLoader };
}
