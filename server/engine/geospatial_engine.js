/**
 * Geo-Spatial Disease Mapping Engine
 * Advanced spatial analysis for drone-based disease detection
 */
class GeoSpatialEngine {
    constructor() {
        this.EARTH_RADIUS_M = 6371000;
    }

    // --- Core: Tiling & Heatmap ---

    generateHeatmap(fieldBoundary, scanPoints, options = {}) {
        const cellSize = options.cellSize || 10;

        // 1. Grid Generation
        const tiles = this.createTiles(fieldBoundary, cellSize);

        // 2. Spatial Indexing & Assignment
        const tilesWithData = this.assignScansToTiles(tiles, scanPoints);

        // 3. Scoring
        const scoredTiles = this.computeTileScores(tilesWithData);

        // 4. Clustering (Infected Zones)
        const clusters = this.detectClusters(scoredTiles);

        return {
            heatmap: this.toGeoJSON(scoredTiles),
            zones: this.clustersToGeoJSON(clusters)
        };
    }

    createTiles(fieldBoundary, cellSizeM) {
        const polygon = fieldBoundary.polygon;
        const lats = polygon.map(p => p[0]);
        const lngs = polygon.map(p => p[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        // Deg delta approx
        const latDelta = cellSizeM / 111000;
        const avgLat = (minLat + maxLat) / 2;
        const lngDelta = cellSizeM / (111000 * Math.cos(avgLat * Math.PI / 180));

        const tiles = [];
        let tileId = 0;

        for (let lat = minLat; lat < maxLat; lat += latDelta) {
            for (let lng = minLng; lng < maxLng; lng += lngDelta) {
                const center = [lat + latDelta / 2, lng + lngDelta / 2];
                // Simple bounding box check first, then precise PIP
                if (this.pointInPolygon(center, polygon)) {
                    tiles.push({
                        tile_id: tileId++,
                        bounds: [
                            [lat, lng],
                            [lat + latDelta, lng],
                            [lat + latDelta, lng + lngDelta],
                            [lat, lng + lngDelta],
                            [lat, lng]
                        ],
                        center,
                        scans: [],
                        detections: []
                    });
                }
            }
        }
        return tiles;
    }

    assignScansToTiles(tiles, scanPoints) {
        // Optimization: In a real PostGIS DB, this is a spatial join.
        // Here we iterate. For large datasets, use a QuadTree (skipped for simplicity).
        scanPoints.forEach(scan => {
            // Find closest tile or containing tile
            const tile = tiles.find(t => this.isInsideBounds(scan, t.bounds));
            if (tile) {
                tile.scans.push(scan);
                if (scan.detections) tile.detections.push(...scan.detections);
            }
        });
        return tiles;
    }

    isInsideBounds(scan, bounds) {
        // Simple rectangle check for grid tiles (faster than general polygon)
        // bounds: [SW, NW, NE, SE, SW]
        const minLat = bounds[0][0];
        const maxLat = bounds[2][0];
        const minLng = bounds[0][1];
        const maxLng = bounds[2][1];
        return scan.gps_lat >= minLat && scan.gps_lat <= maxLat &&
            scan.gps_lng >= minLng && scan.gps_lng <= maxLng;
    }

    pointInPolygon(point, polygon) {
        const [x, y] = point;
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    computeTileScores(tiles) {
        return tiles.map(tile => {
            if (tile.detections.length === 0) return { ...tile, score: 0, severity: 'none', detection_count: 0 };

            // Metrics
            const count = tile.detections.length;
            const avgConf = tile.detections.reduce((s, d) => s + (d.confidence || 0), 0) / count;
            const avgArea = tile.detections.reduce((s, d) => s + (d.bbox_area_percent || 0), 0) / count;

            // Score Formula (0-100)
            // Weigh area heavily as it indicates severity
            let rawScore = (avgArea * 15) + (count * 5);
            let score = Math.min(Math.round(rawScore * avgConf), 100);

            let severity = score > 60 ? 'high' : score > 30 ? 'moderate' : 'low';

            // Dominant disease
            const counts = {};
            tile.detections.forEach(d => {
                const cls = d.class_name || 'unknown';
                counts[cls] = (counts[cls] || 0) + 1;
            });
            const dominant = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];

            return {
                ...tile,
                score,
                severity,
                dominant_disease: dominant,
                detection_count: count,
                avg_area_percent: avgArea
            };
        });
    }

    // --- Clustering (DBSCAN-like) ---

    detectClusters(tiles) {
        const threshold = 30; // Min score to be part of a cluster
        const highRisk = tiles.filter(t => t.score >= threshold);
        const clusters = [];
        const visited = new Set();
        const SEARCH_DIST_M = 20; // Neighbor distance

        highRisk.forEach(tile => {
            if (visited.has(tile.tile_id)) return;

            const cluster = [tile];
            visited.add(tile.tile_id);
            const queue = [tile];

            while (queue.length > 0) {
                const current = queue.shift();

                // Find neighbors in highRisk set
                const neighbors = highRisk.filter(n =>
                    !visited.has(n.tile_id) &&
                    this.distance(current.center, n.center) <= SEARCH_DIST_M
                );

                neighbors.forEach(n => {
                    visited.add(n.tile_id);
                    cluster.push(n);
                    queue.push(n);
                });
            }

            clusters.push(cluster);
        });

        return clusters;
    }

    clustersToGeoJSON(clusters) {
        return {
            type: 'FeatureCollection',
            features: clusters.map((cluster, idx) => {
                const lats = cluster.map(t => t.center[0]);
                const lngs = cluster.map(t => t.center[1]);
                const minLat = Math.min(...lats);
                const maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs);
                const maxLng = Math.max(...lngs);

                // Expand slightly to cover tile width (~0.0001 deg)
                const padding = 0.00005;

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [minLng - padding, minLat - padding],
                            [maxLng + padding, minLat - padding],
                            [maxLng + padding, maxLat + padding],
                            [minLng - padding, maxLat + padding],
                            [minLng - padding, minLat - padding]
                        ]]
                    },
                    properties: {
                        zone_id: idx + 1,
                        score: Math.round(cluster.reduce((a, b) => a + b.score, 0) / cluster.length),
                        tile_count: cluster.length,
                        disease: cluster[0].dominant_disease,
                        area_m2: cluster.length * 100 // approx 10x10m tiles
                    }
                };
            })
        };
    }

    generateStats(tiles) {
        const totalTiles = tiles.length;
        if (totalTiles === 0) return { infected_area_percent: 0, dominant_disease: 'none', hotspots: [] };

        const infectedTiles = tiles.filter(t => t.score > 20);
        const infectedAreaPct = ((infectedTiles.length / totalTiles) * 100).toFixed(1);

        const diseaseCounts = {};
        infectedTiles.forEach(t => {
            if (t.dominant_disease) diseaseCounts[t.dominant_disease] = (diseaseCounts[t.dominant_disease] || 0) + 1;
        });

        const dominant = Object.keys(diseaseCounts).sort((a, b) => diseaseCounts[b] - diseaseCounts[a])[0] || 'none';

        const hotspots = tiles
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(t => ({
                id: t.tile_id,
                score: t.score,
                location: t.center
            }));

        return {
            infected_area_percent: parseFloat(infectedAreaPct),
            dominant_disease: dominant,
            hotspots: hotspots,
            total_area_scanned_m2: totalTiles * 100
        };
    }

    // --- Spread Direction ---

    calculateSpread(scanPoints, diseaseClass = null) {
        // Filter
        let data = scanPoints;
        if (diseaseClass) {
            data = data.filter(s => s.detections.some(d => d.class_name === diseaseClass));
        }

        // Group by Date (YYYY-MM-DD)
        const groups = {};
        data.forEach(s => {
            const date = s.timestamp.split('T')[0];
            if (!groups[date]) groups[date] = { latSum: 0, lngSum: 0, count: 0, timestamp: s.timestamp };
            groups[date].latSum += s.gps_lat;
            groups[date].lngSum += s.gps_lng;
            groups[date].count++;
        });

        // Compute centroids
        const centroids = Object.keys(groups).sort().map(date => {
            const g = groups[date];
            return {
                date,
                lat: g.latSum / g.count,
                lng: g.lngSum / g.count
            };
        });

        if (centroids.length < 2) return null;

        // Compute vectors between consecutive days
        const vectors = [];
        for (let i = 0; i < centroids.length - 1; i++) {
            const curr = centroids[i];
            const next = centroids[i + 1];

            const dist = this.distance([curr.lat, curr.lng], [next.lat, next.lng]);
            const bearing = this.bearing([curr.lat, curr.lng], [next.lat, next.lng]);

            vectors.push({
                from_date: curr.date,
                to_date: next.date,
                start: [curr.lat, curr.lng],
                end: [next.lat, next.lng],
                distance_m: dist,
                bearing_deg: bearing
            });
        }

        return {
            disease: diseaseClass || 'all',
            vectors,
            centroids
        };
    }

    // --- Utils ---

    distance(p1, p2) {
        const R = 6371e3;
        const φ1 = p1[0] * Math.PI / 180;
        const φ2 = p2[0] * Math.PI / 180;
        const Δφ = (p2[0] - p1[0]) * Math.PI / 180;
        const Δλ = (p2[1] - p1[1]) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    bearing(p1, p2) {
        const λ1 = p1[1] * Math.PI / 180;
        const λ2 = p2[1] * Math.PI / 180;
        const φ1 = p1[0] * Math.PI / 180;
        const φ2 = p2[0] * Math.PI / 180;

        const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
        const θ = Math.atan2(y, x);
        const brng = (θ * 180 / Math.PI + 360) % 360;
        return brng;
    }

    toGeoJSON(tiles) {
        return {
            type: "FeatureCollection",
            features: tiles.map(t => ({
                type: "Feature",
                geometry: {
                    type: "Polygon",
                    coordinates: [t.bounds.map(p => [p[1], p[0]])] // GeoJSON is Lng,Lat
                },
                properties: {
                    id: t.tile_id,
                    score: t.score,
                    severity: t.severity,
                    disease: t.dominant_disease,
                    count: t.detection_count
                }
            }))
        };
    }

    // --- Advanced Progression Analysis ---

    analyzeProgression(fieldBoundary, allScans, options = {}) {
        const windowDays = options.days || 7;
        const diseaseClass = options.disease || null;

        // 1. Filter by Disease
        let relevantScans = allScans;
        if (diseaseClass && diseaseClass !== 'all') {
            relevantScans = relevantScans.filter(s =>
                s.detections.some(d => d.class_name === diseaseClass)
            );
        }

        // 2. Time Splitting
        const now = new Date();
        const splitPoint = new Date(now.getTime() - windowDays * 86400000);
        const startPoint = new Date(now.getTime() - 2 * windowDays * 86400000);

        const currentScans = relevantScans.filter(s => new Date(s.timestamp) >= splitPoint);
        const previousScans = relevantScans.filter(s => {
            const d = new Date(s.timestamp);
            return d >= startPoint && d < splitPoint;
        });

        // 3. Generate Maps for Comparison
        const gridOpts = { cellSize: 10 };
        const currMap = this.generateHeatmap(fieldBoundary, currentScans, gridOpts);
        const prevMap = this.generateHeatmap(fieldBoundary, previousScans, gridOpts);

        // 4. Calculate Centroids
        const getCentroid = (features) => {
            let sumLat = 0, sumLng = 0, totalScore = 0;
            features.forEach(f => {
                if (f.properties.score > 20) { // Only consider active infection
                    const [lng, lat] = f.geometry.type === 'Polygon'
                        ? f.geometry.coordinates[0][0] // simplistic center
                        : f.geometry.coordinates; // Point

                    const w = f.properties.score;
                    sumLat += lat * w;
                    sumLng += lng * w;
                    totalScore += w;
                }
            });
            return totalScore > 0 ? [sumLat / totalScore, sumLng / totalScore] : null;
        };

        const c1 = getCentroid(currMap.heatmap.features);
        const c2 = getCentroid(prevMap.heatmap.features);

        // 5. Compute Metrics
        const getInfectedArea = (features) => features.filter(f => f.properties.score > 20).length * 100; // m2
        const currArea = getInfectedArea(currMap.heatmap.features);
        const prevArea = getInfectedArea(prevMap.heatmap.features);

        const deltaArea = currArea - prevArea;
        const status = deltaArea > 0 ? "EXPANDING" : deltaArea < 0 ? "SHRINKING" : "STABLE";

        // 6. Identify New Hotspots (Tiles newly infected)
        const prevInfectedIds = new Set(
            prevMap.heatmap.features
                .filter(f => f.properties.score > 20)
                .map(f => f.properties.id)
        );

        const newInfections = currMap.heatmap.features
            .filter(f => f.properties.score > 20 && !prevInfectedIds.has(f.properties.id))
            .map(f => ({
                tile_id: f.properties.id,
                score: f.properties.score,
                coordinates: f.geometry.coordinates[0][0] // approx
            }));

        // 7. Spread Vector (GeoJSON Arrow)
        let spreadVector = null;
        if (c1 && c2) {
            const dist = this.distance(c2, c1); // prev -> curr
            const bearing = this.bearing(c2, c1);
            spreadVector = {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: [[c2[1], c2[0]], [c1[1], c1[0]]] // GeoJSON Lng,Lat
                },
                properties: {
                    from_date: startPoint.toISOString().split('T')[0],
                    to_date: now.toISOString().split('T')[0],
                    distance_m: Math.round(dist),
                    bearing_deg: Math.round(bearing),
                    direction: this.getCardinalDirection(bearing)
                }
            };
        }

        return {
            window_days: windowDays,
            disease: diseaseClass || 'all',
            status,
            metrics: {
                current_infected_area_m2: currArea,
                previous_infected_area_m2: prevArea,
                area_change_m2: deltaArea,
                growth_pct: prevArea > 0 ? Math.round((deltaArea / prevArea) * 100) : 100
            },
            spread_vector: spreadVector,
            centroid_shift: {
                previous: c2,
                current: c1
            },
            new_hotspots: newInfections,
            timeline: [
                { date: startPoint.toISOString().split('T')[0], area: prevArea },
                { date: splitPoint.toISOString().split('T')[0], area: currArea }
            ]
        };
    }

    getCardinalDirection(deg) {
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return dirs[Math.round(deg / 45) % 8];
    }
}

module.exports = new GeoSpatialEngine();
