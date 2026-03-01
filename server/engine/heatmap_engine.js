/**
 * Heatmap Engine for Disease Detection Spatial Analysis
 * Converts GPS-tagged drone detections into a gridded/tiled risk map
 */

class HeatmapEngine {
    constructor() {
        this.EARTH_RADIUS_M = 6371000; // meters
    }

    /**
     * Main function: Generate heatmap from field boundary and scan points
     * @param {Object} fieldBoundary - { polygon: [[lat,lng],...] }
     * @param {Array} scanPoints - [{ gps_lat, gps_lng, detections: [], timestamp }]
     * @param {Object} options - { cellSize: 10, tileType: 'grid' }
     */
    generateHeatmap(fieldBoundary, scanPoints, options = {}) {
        const cellSize = options.cellSize || 10; // meters
        const tileType = options.tileType || 'grid'; // 'grid' or 'hex'

        // 1. Create grid/tiles covering the field
        const tiles = this.createTiles(fieldBoundary, cellSize, tileType);

        // 2. Assign scan points to tiles
        const tilesWithData = this.assignScansToTiles(tiles, scanPoints);

        // 3. Compute scores per tile
        const scoredTiles = this.computeTileScores(tilesWithData);

        // 4. Cluster neighboring high-risk tiles
        const clustered = this.detectClusters(scoredTiles);

        // 5. Convert to GeoJSON
        return this.toGeoJSON(clustered);
    }

    /**
     * Create grid tiles covering the field
     */
    createTiles(fieldBoundary, cellSizeM, type) {
        const polygon = fieldBoundary.polygon;

        // Calculate bounding box
        const lats = polygon.map(p => p[0]);
        const lngs = polygon.map(p => p[1]);

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        // Convert cell size from meters to degrees (approximate)
        // At equator, 1 degree lat ≈ 111km
        const latDelta = cellSizeM / 111000;
        const lngDelta = cellSizeM / (111000 * Math.cos(minLat * Math.PI / 180));

        const tiles = [];
        let tileId = 0;

        // Generate grid
        for (let lat = minLat; lat < maxLat; lat += latDelta) {
            for (let lng = minLng; lng < maxLng; lng += lngDelta) {
                const tileBounds = [
                    [lat, lng],
                    [lat + latDelta, lng],
                    [lat + latDelta, lng + lngDelta],
                    [lat, lng + lngDelta],
                    [lat, lng]
                ];

                // Check if tile intersects with field boundary
                const center = [lat + latDelta / 2, lng + lngDelta / 2];

                if (this.pointInPolygon(center, polygon)) {
                    tiles.push({
                        tile_id: tileId++,
                        bounds: tileBounds,
                        center: center,
                        scans: [],
                        detections: []
                    });
                }
            }
        }

        return tiles;
    }

    /**
     * Point-in-polygon test (Ray casting algorithm)
     */
    pointInPolygon(point, polygon) {
        const [x, y] = point;
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
    }

    /**
     * Assign scan points to their corresponding tiles
     */
    assignScansToTiles(tiles, scanPoints) {
        scanPoints.forEach(scan => {
            const point = [scan.gps_lat, scan.gps_lng];

            // Find which tile contains this point
            const tile = tiles.find(t => this.pointInPolygon(point, t.bounds));

            if (tile) {
                tile.scans.push(scan);
                if (scan.detections) {
                    tile.detections.push(...scan.detections);
                }
            }
        });

        return tiles;
    }

    /**
     * Compute disease score for each tile
     */
    computeTileScores(tiles) {
        return tiles.map(tile => {
            if (tile.detections.length === 0) {
                return {
                    ...tile,
                    cell_disease_score: 0,
                    dominant_disease_class: null,
                    severity: 'none',
                    last_seen: null
                };
            }

            // Score calculation: similar to DSS logic
            const totalConfidence = tile.detections.reduce((sum, d) => sum + (d.confidence || 0), 0);
            const avgConfidence = totalConfidence / tile.detections.length;

            // Area-based score
            const totalArea = tile.detections.reduce((sum, d) => sum + (d.bbox_area_percent || 1), 0);

            // Density factor
            const densityScore = Math.min(tile.detections.length * 15, 100);

            // Combined score
            const areaScore = Math.min(totalArea * 5, 100);
            const score = (areaScore * 0.6 + densityScore * 0.4) * avgConfidence;

            // Dominant disease
            const diseaseCounts = {};
            tile.detections.forEach(d => {
                const disease = d.class_name || d.class || 'unknown';
                diseaseCounts[disease] = (diseaseCounts[disease] || 0) + 1;
            });

            const dominant = Object.keys(diseaseCounts).reduce((a, b) =>
                diseaseCounts[a] > diseaseCounts[b] ? a : b
            );

            // Severity classification
            let severity = 'mild';
            if (score > 70) severity = 'severe';
            else if (score > 40) severity = 'moderate';

            // Last seen timestamp
            const timestamps = tile.scans.map(s => new Date(s.timestamp));
            const lastSeen = new Date(Math.max(...timestamps));

            return {
                ...tile,
                cell_disease_score: Math.round(score),
                dominant_disease_class: dominant,
                severity,
                last_seen: lastSeen.toISOString(),
                detection_count: tile.detections.length
            };
        });
    }

    /**
     * Cluster neighboring high-risk tiles into "infected zones"
     */
    detectClusters(tiles) {
        const highRiskTiles = tiles.filter(t => t.cell_disease_score >= 40);

        if (highRiskTiles.length === 0) return tiles;

        // Simple clustering: Group tiles that are within 2 cell distances
        const clusters = [];
        const visited = new Set();

        highRiskTiles.forEach(tile => {
            if (visited.has(tile.tile_id)) return;

            const cluster = {
                zone_id: clusters.length + 1,
                tiles: [tile.tile_id],
                avg_score: tile.cell_disease_score,
                dominant_disease: tile.dominant_disease_class
            };

            // Find neighbors
            const neighbors = highRiskTiles.filter(t =>
                !visited.has(t.tile_id) &&
                this.distanceBetweenPoints(tile.center, t.center) < 30 // meters
            );

            neighbors.forEach(n => {
                cluster.tiles.push(n.tile_id);
                visited.add(n.tile_id);
            });

            visited.add(tile.tile_id);
            clusters.push(cluster);
        });

        // Assign zone_ids to tiles
        return tiles.map(tile => {
            const cluster = clusters.find(c => c.tiles.includes(tile.tile_id));
            return {
                ...tile,
                zone_id: cluster ? cluster.zone_id : null
            };
        });
    }

    /**
     * Calculate distance between two lat/lng points (Haversine)
     */
    distanceBetweenPoints(p1, p2) {
        const [lat1, lon1] = p1;
        const [lat2, lon2] = p2;

        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return this.EARTH_RADIUS_M * c;
    }

    /**
     * Convert to GeoJSON format
     */
    toGeoJSON(tiles) {
        const features = tiles.map(tile => {
            // Create polygon coordinates (close the ring)
            const coordinates = [tile.bounds];

            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: coordinates
                },
                properties: {
                    tile_id: tile.tile_id,
                    score: tile.cell_disease_score || 0,
                    disease: tile.dominant_disease_class,
                    severity: tile.severity || 'none',
                    last_seen: tile.last_seen,
                    detection_count: tile.detection_count || 0,
                    zone_id: tile.zone_id,
                    center_lat: tile.center[0],
                    center_lng: tile.center[1]
                }
            };
        });

        return {
            type: 'FeatureCollection',
            features: features
        };
    }
}

module.exports = new HeatmapEngine();
