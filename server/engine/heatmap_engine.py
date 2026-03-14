import math
import datetime

class HeatmapEngine:
    def __init__(self):
        self.EARTH_RADIUS_M = 6371000

    def generate_heatmap(self, field_boundary, scan_points, options=None):
        options = options or {}
        cell_size = options.get("cellSize", 10)
        tile_type = options.get("tileType", "grid")

        tiles = self.create_tiles(field_boundary, cell_size, tile_type)
        tiles_with_data = self.assign_scans_to_tiles(tiles, scan_points)
        scored_tiles = self.compute_tile_scores(tiles_with_data)
        clustered = self.detect_clusters(scored_tiles)
        return self.to_geojson(clustered)

    def create_tiles(self, field_boundary, cell_size_m, tile_type):
        polygon = field_boundary.get("polygon", [])
        if not polygon:
            return []

        lats = [p[0] for p in polygon]
        lngs = [p[1] for p in polygon]

        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)

        lat_delta = cell_size_m / 111000.0
        lng_delta = cell_size_m / (111000.0 * math.cos(min_lat * math.pi / 180.0))

        tiles = []
        tile_id = 0

        lat = min_lat
        while lat < max_lat:
            lng = min_lng
            while lng < max_lng:
                tile_bounds = [
                    [lat, lng],
                    [lat + lat_delta, lng],
                    [lat + lat_delta, lng + lng_delta],
                    [lat, lng + lng_delta],
                    [lat, lng]
                ]

                center = [lat + lat_delta / 2, lng + lng_delta / 2]

                if self.point_in_polygon(center, polygon):
                    tiles.append({
                        "tile_id": tile_id,
                        "bounds": tile_bounds,
                        "center": center,
                        "scans": [],
                        "detections": []
                    })
                    tile_id += 1
                lng += lng_delta
            lat += lat_delta

        return tiles

    def point_in_polygon(self, point, polygon):
        x, y = point
        inside = False
        j = len(polygon) - 1
        for i in range(len(polygon)):
            xi, yi = polygon[i]
            xj, yj = polygon[j]

            intersect = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
            if intersect:
                inside = not inside
            j = i
        return inside

    def assign_scans_to_tiles(self, tiles, scan_points):
        for scan in scan_points:
            point = [scan.get("gps_lat"), scan.get("gps_lng")]
            
            for tile in tiles:
                if self.point_in_polygon(point, tile["bounds"]):
                    tile["scans"].append(scan)
                    if scan.get("detections"):
                        tile["detections"].extend(scan["detections"])
                    break
        return tiles

    def compute_tile_scores(self, tiles):
        scored = []
        for tile in tiles:
            if not tile["detections"]:
                tile.update({
                    "cell_disease_score": 0,
                    "dominant_disease_class": None,
                    "severity": "none",
                    "last_seen": None,
                    "detection_count": 0
                })
                scored.append(tile)
                continue

            total_confidence = sum(d.get("confidence", 0) for d in tile["detections"])
            avg_confidence = total_confidence / len(tile["detections"])

            total_area = sum(d.get("bbox_area_percent", 1) for d in tile["detections"])
            density_score = min(len(tile["detections"]) * 15, 100)
            area_score = min(total_area * 5, 100)
            
            score = (area_score * 0.6 + density_score * 0.4) * avg_confidence

            disease_counts = {}
            for d in tile["detections"]:
                disease = d.get("class_name") or d.get("class") or "unknown"
                disease_counts[disease] = disease_counts.get(disease, 0) + 1

            dominant = max(disease_counts, key=disease_counts.get)

            severity = "mild"
            if score > 70: severity = "severe"
            elif score > 40: severity = "moderate"

            timestamps = []
            for s in tile["scans"]:
                try:
                    timestamps.append(datetime.datetime.fromisoformat(s["timestamp"].replace("Z", "+00:00")))
                except:
                    timestamps.append(datetime.datetime.now())
                    
            last_seen = max(timestamps) if timestamps else datetime.datetime.now()

            tile.update({
                "cell_disease_score": round(score),
                "dominant_disease_class": dominant,
                "severity": severity,
                "last_seen": last_seen.isoformat(),
                "detection_count": len(tile["detections"])
            })
            scored.append(tile)
            
        return scored

    def detect_clusters(self, tiles):
        high_risk_tiles = [t for t in tiles if t.get("cell_disease_score", 0) >= 40]
        if not high_risk_tiles:
            return tiles

        clusters = []
        visited = set()

        for tile in high_risk_tiles:
            if tile["tile_id"] in visited:
                continue

            cluster = {
                "zone_id": len(clusters) + 1,
                "tiles": [tile["tile_id"]],
                "avg_score": tile["cell_disease_score"],
                "dominant_disease": tile["dominant_disease_class"]
            }

            neighbors = [t for t in high_risk_tiles if t["tile_id"] not in visited and self.distance_between_points(tile["center"], t["center"]) < 30]

            for n in neighbors:
                cluster["tiles"].append(n["tile_id"])
                visited.add(n["tile_id"])

            visited.add(tile["tile_id"])
            clusters.append(cluster)

        for tile in tiles:
            zone_id = None
            for c in clusters:
                if tile["tile_id"] in c["tiles"]:
                    zone_id = c["zone_id"]
                    break
            tile["zone_id"] = zone_id

        return tiles

    def distance_between_points(self, p1, p2):
        lat1, lon1 = p1
        lat2, lon2 = p2

        dlat = (lat2 - lat1) * math.pi / 180
        dlon = (lon2 - lon1) * math.pi / 180

        a = math.sin(dlat / 2)**2 + math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return self.EARTH_RADIUS_M * c

    def to_geojson(self, tiles):
        features = []
        for tile in tiles:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [tile["bounds"]]
                },
                "properties": {
                    "tile_id": tile.get("tile_id"),
                    "score": tile.get("cell_disease_score", 0),
                    "disease": tile.get("dominant_disease_class"),
                    "severity": tile.get("severity", "none"),
                    "last_seen": tile.get("last_seen"),
                    "detection_count": tile.get("detection_count", 0),
                    "zone_id": tile.get("zone_id"),
                    "center_lat": tile["center"][0],
                    "center_lng": tile["center"][1]
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }

heatmap_engine = HeatmapEngine()
