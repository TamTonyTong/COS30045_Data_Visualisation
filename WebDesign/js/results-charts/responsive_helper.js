/**
 * Responsive Chart Helper for Results Page
 * Makes D3 charts responsive on mobile devices
 */

class ResponsiveChartHelper {
    /**
     * Get responsive width based on container and screen size
     * @param {string} containerId - The container element ID
     * @param {number} defaultWidth - Default width for desktop
     * @returns {number} Calculated responsive width
     */
    static getResponsiveWidth(containerId, defaultWidth = 1200) {
        const container = document.getElementById(containerId);
        if (!container) return defaultWidth;

        const containerWidth = container.offsetWidth || container.clientWidth;
        const screenWidth = window.innerWidth;

        // Mobile (iPhone and small devices)
        if (screenWidth <= 480) {
            return Math.max(containerWidth - 40, 320); // Min 320px, account for padding
        }
        // Tablet
        else if (screenWidth <= 768) {
            return Math.max(containerWidth - 40, 500);
        }
        // Small desktop
        else if (screenWidth <= 1024) {
            return Math.max(containerWidth - 40, 700);
        }
        // Desktop
        else {
            return Math.min(defaultWidth, containerWidth - 40);
        }
    }

    /**
     * Get responsive height based on screen size
     * @param {number} defaultHeight - Default height for desktop
     * @returns {number} Calculated responsive height
     */
    static getResponsiveHeight(defaultHeight = 500) {
        const screenWidth = window.innerWidth;

        // Mobile
        if (screenWidth <= 480) {
            return Math.min(defaultHeight * 0.6, 350);
        }
        // Tablet
        else if (screenWidth <= 768) {
            return Math.min(defaultHeight * 0.75, 450);
        }
        // Desktop
        else {
            return defaultHeight;
        }
    }

    /**
     * Get responsive margins
     * @param {object} defaultMargins - Default margins
     * @returns {object} Responsive margins
     */
    static getResponsiveMargins(defaultMargins = { top: 60, right: 150, bottom: 80, left: 80 }) {
        const screenWidth = window.innerWidth;

        // Mobile
        if (screenWidth <= 480) {
            return {
                top: Math.min(defaultMargins.top * 0.6, 40),
                right: Math.min(defaultMargins.right * 0.3, 40),
                bottom: Math.min(defaultMargins.bottom * 0.6, 50),
                left: Math.min(defaultMargins.left * 0.5, 40)
            };
        }
        // Tablet
        else if (screenWidth <= 768) {
            return {
                top: Math.min(defaultMargins.top * 0.75, 50),
                right: Math.min(defaultMargins.right * 0.5, 80),
                bottom: Math.min(defaultMargins.bottom * 0.75, 60),
                left: Math.min(defaultMargins.left * 0.7, 60)
            };
        }
        // Desktop
        else {
            return defaultMargins;
        }
    }

    /**
     * Apply responsive configuration to chart config
     * @param {string} containerId - Container ID
     * @param {object} config - Chart configuration
     * @returns {object} Responsive configuration
     */
    static applyResponsiveConfig(containerId, config) {
        const responsive = {
            ...config,
            width: this.getResponsiveWidth(containerId, config.width),
            height: this.getResponsiveHeight(config.height),
            margin: this.getResponsiveMargins(config.margin)
        };

        return responsive;
    }

    /**
     * Make chart container scrollable on mobile
     * @param {string} containerId - Container ID
     */
    static makeScrollable(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.style.overflowX = 'auto';
        container.style.overflowY = 'hidden';
        container.style.webkitOverflowScrolling = 'touch';
        container.style.width = '100%';
        container.style.maxWidth = '100%';
    }

    /**
     * Set up resize listener for charts
     * @param {Function} renderFunction - Function to call on resize
     * @param {number} debounceMs - Debounce delay in milliseconds
     */
    static setupResizeListener(renderFunction, debounceMs = 300) {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (typeof renderFunction === 'function') {
                    renderFunction();
                }
            }, debounceMs);
        });
    }

    /**
     * Check if device is mobile
     * @returns {boolean}
     */
    static isMobile() {
        return window.innerWidth <= 768;
    }

    /**
     * Check if device is iPhone
     * @returns {boolean}
     */
    static isIPhone() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    /**
     * Get font size scale for mobile
     * @returns {number} Scale factor
     */
    static getFontScale() {
        const screenWidth = window.innerWidth;
        if (screenWidth <= 480) return 0.75;
        if (screenWidth <= 768) return 0.85;
        return 1;
    }

    /**
     * Apply mobile-friendly SVG attributes
     * @param {d3.Selection} svg - D3 SVG selection
     */
    static makeSVGResponsive(svg) {
        if (!svg || !svg.node) return;

        svg.attr('preserveAspectRatio', 'xMidYMid meet')
           .style('max-width', '100%')
           .style('height', 'auto');
    }

    /**
     * Adjust text size for mobile
     * @param {d3.Selection} textElements - D3 text selection
     * @param {number} baseFontSize - Base font size
     */
    static adjustTextSize(textElements, baseFontSize = 12) {
        if (!textElements) return;

        const scale = this.getFontScale();
        const fontSize = Math.max(baseFontSize * scale, 8); // Minimum 8px

        textElements.style('font-size', `${fontSize}px`);
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ResponsiveChartHelper };
}
