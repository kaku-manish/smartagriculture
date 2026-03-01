import math
import datetime

class GeoSpatialEngine:
    def __init__(self):
        self.EARTH_RADIUS_M = 6371000

    def generate_heatmap(self, field_boundary, scan_points, options=None):
        options = options or {}
        cell_size = options.get("cellSize", 10)

        tiles = self.create_tiles(field_boundary, cell_size)
        tiles_with_data = self.assign_scans_to_tiles(tiles, scan_points)
        scored_tiles = self.compute_tile_scores(tiles_with_data)
        clusters = self.detect_clusters(scored_tiles)

        return {
            "heatmap": self.to_geojson(scored_tiles),
            "zones": self.clusters_to_geojson(clusters)
        }

    def create_tiles(self, field_boundary, cell_size_m):
        polygon = field_boundary.get("polygon", [])
        if not polygon: return []
        
        lats = [p[0] for p in polygon]
        lngs = [p[1] for p in polygon]
        
        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)

        lat_delta = cell_size_m / 111000.0
        avg_lat = (min_lat + max_lat) / 2
        lng_delta = cell_size_m / (111000.0 * math.cos(avg_lat * math.pi / 180))

        tiles = []
        tile_id = 0

        lat = min_lat
        while lat < max_lat:
            lng = min_lng
            while lng < max_lng:
                center = [lat + lat_delta / 2, lng + lng_delta / 2]
                if self.point_in_polygon(center, polygon):
                    tiles.append({
                        "tile_id": tile_id,
                        "bounds": [
                            [lat, lng],
                            [lat + lat_delta, lng],
                            [lat + lat_delta, lng + lng_delta],
                            [lat, lng + lng_delta],
                            [lat, lng]
                        ],
                        "center": center,
                        "scans": [],
                        "detections": []
                    })
                    tile_id += 1
                lng += lng_delta
            lat += lat_delta
            
        return tiles

    def assign_scans_to_tiles(self, tiles, scan_points):
        for scan in scan_points:
            for tile in tiles:
                if self.is_inside_bounds(scan, tile["bounds"]):
                    tile["scans"].append(scan)
                    if scan.get("detections"):
                        tile["detections"].extend(scan["detections"])
                    break
        return tiles

    def is_inside_bounds(self, scan, bounds):
        min_lat, max_lat = bounds[0][0], bounds[2][0]
        min_lng, max_lng = bounds[0][1], bounds[2][1]
        lat = scan.get("gps_lat", 0)
        lng = scan.get("gps_lng", 0)
        return min_lat <= lat <= max_lat and min_lng <= lng <= max_lng

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

    def compute_tile_scores(self, tiles):
        for tile in tiles:
            dets = tile["detections"]
            if not dets:
                tile.update({"score": 0, "severity": "none", "detection_count": 0})
                continue

            count = len(dets)
            avg_conf = sum(d.get("confidence", 0) for d in dets) / count
            avg_area = sum(d.get("bbox_area_percent", 0) for d in dets) / count

            raw_score = (avg_area * 15) + (count * 5)
            score = min(round(raw_score * avg_conf), 100)

            severity = "high" if score > 60 else "moderate" if score > 30 else "low"

            counts = {}
            for d in dets:
                cls = d.get("class_name") or "unknown"
                counts[cls] = counts.get(cls, 0) + 1
            
            dominant = max(counts, key=counts.get) if counts else "none"

            tile.update({
                "score": score,
                "severity": severity,
                "dominant_disease": dominant,
                "detection_count": count,
                "avg_area_percent": avg_area
            })
        return tiles

    def detect_clusters(self, tiles):
        threshold = 30
        high_risk = [t for t in tiles if t.get("score", 0) >= threshold]
        
        clusters = []
        visited = set()
        search_dist_m = 20

        for tile in high_risk:
            tid = tile["tile_id"]
            if tid in visited: continue
            
            cluster = [tile]
            visited.add(tid)
            queue = [tile]
            
            while queue:
                current = queue.pop(0)
                neighbors = [n for n in high_risk if n["tile_id"] not in visited and self.distance(current["center"], n["center"]) <= search_dist_m]
                
                for n in neighbors:
                    visited.add(n["tile_id"])
                    cluster.append(n)
                    queue.append(n)
                    
            clusters.append(cluster)
            
        return clusters

    def clusters_to_geojson(self, clusters):
        features = []
        for idx, cluster in enumerate(clusters):
            lats = [t["center"][0] for t in cluster]
            lngs = [t["center"][1] for t in cluster]
            min_lat, max_lat = min(lats), max(lats)
            min_lng, max_lng = min(lngs), max(lngs)
            
            padding = 0.00005
            
            score = round(sum(t.get("score", 0) for t in cluster) / len(cluster)) if cluster else 0
            
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [min_lng - padding, min_lat - padding],
                        [max_lng + padding, min_lat - padding],
                        [max_lng + padding, max_lat + padding],
                        [min_lng - padding, max_lat + padding],
                        [min_lng - padding, min_lat - padding]
                    ]]
                },
                "properties": {
                    "zone_id": idx + 1,
                    "score": score,
                    "tile_count": len(cluster),
                    "disease": cluster[0].get("dominant_disease") if cluster else "none",
                    "area_m2": len(cluster) * 100
                }
            })
            
        return {"type": "FeatureCollection", "features": features}

    def generate_stats(self, tiles):
        total_tiles = len(tiles)
        if total_tiles == 0:
            return {"infected_area_percent": 0.0, "dominant_disease": "none", "hotspots": [], "total_area_scanned_m2": 0}
            
        infected = [t for t in tiles if t.get("score", 0) > 20]
        infected_pct = round((len(infected) / total_tiles) * 100, 1)
        
        counts = {}
        for t in infected:
            d = t.get("dominant_disease")
            if d: counts[d] = counts.get(d, 0) + 1
            
        dominant = max(counts, key=counts.get) if counts else "none"
        
        sorted_tiles = sorted(tiles, key=lambda x: x.get("score", 0), reverse=True)[:5]
        hotspots = [{"id": t.get("tile_id"), "score": t.get("score"), "location": t.get("center")} for t in sorted_tiles if t.get("score", 0) > 0]
        
        return {
            "infected_area_percent": infected_pct,
            "dominant_disease": dominant,
            "hotspots": hotspots,
            "total_area_scanned_m2": total_tiles * 100
        }

    def calculate_spread(self, scan_points, disease_class=None):
        data = scan_points
        if disease_class:
            data = [s for s in data if any(d.get("class_name") == disease_class for d in s.get("detections", []))]
            
        groups = {}
        for s in data:
            date_str = str(s.get("timestamp", ""))[:10]
            if date_str not in groups:
                groups[date_str] = {"latSum": 0, "lngSum": 0, "count": 0}
            groups[date_str]["latSum"] += s.get("gps_lat", 0)
            groups[date_str]["lngSum"] += s.get("gps_lng", 0)
            groups[date_str]["count"] += 1
            
        centroids = []
        for date_str in sorted(groups.keys()):
            g = groups[date_str]
            if g["count"] > 0:
                centroids.append({
                    "date": date_str,
                    "lat": g["latSum"] / g["count"],
                    "lng": g["lngSum"] / g["count"]
                })
                
        if len(centroids) < 2: return None
        
        vectors = []
        for i in range(len(centroids) - 1):
            curr = centroids[i]
            nxt = centroids[i+1]
            dist = self.distance([curr["lat"], curr["lng"]], [nxt["lat"], nxt["lng"]])
            bearing = self.bearing([curr["lat"], curr["lng"]], [nxt["lat"], nxt["lng"]])
            vectors.append({
                "from_date": curr["date"],
                "to_date": nxt["date"],
                "start": [curr["lat"], curr["lng"]],
                "end": [nxt["lat"], nxt["lng"]],
                "distance_m": dist,
                "bearing_deg": bearing
            })
            
        return {"disease": disease_class or "all", "vectors": vectors, "centroids": centroids}

    def analyze_progression(self, field_boundary, all_scans, options=None):
        options = options or {}
        window_days = options.get("days", 7)
        disease_class = options.get("disease", None)
        
        relevant_scans = all_scans
        if disease_class and disease_class != "all":
            relevant_scans = [s for s in relevant_scans if any(d.get("class_name") == disease_class for d in s.get("detections", []))]
            
        now = datetime.datetime.now()
        split_point = now - datetime.timedelta(days=window_days)
        start_point = now - datetime.timedelta(days=window_days * 2)
        
        curr_scans = []
        prev_scans = []
        
        for s in relevant_scans:
            try:
                date_val = datetime.datetime.fromisoformat(s.get("timestamp", "2000-01-01").replace("Z", "+00:00"))
                # Using timezone unaware to be simple
                date_val = date_val.replace(tzinfo=None)
                if date_val >= split_point:
                    curr_scans.append(s)
                elif start_point <= date_val < split_point:
                    prev_scans.append(s)
            except:
                curr_scans.append(s)
                
        curr_map = self.generate_heatmap(field_boundary, curr_scans, {"cellSize": 10})
        prev_map = self.generate_heatmap(field_boundary, prev_scans, {"cellSize": 10})
        
        def get_centroid(features):
            sum_lat, sum_lng, total_score = 0, 0, 0
            for f in features:
                score = f["properties"].get("score", 0)
                if score > 20:
                    geom = f["geometry"]["coordinates"]
                    lng, lat = geom[0][0][0], geom[0][0][1]
                    sum_lat += lat * score
                    sum_lng += lng * score
                    total_score += score
            return [sum_lat / total_score, sum_lng / total_score] if total_score > 0 else None
            
        c1 = get_centroid(curr_map["heatmap"]["features"])
        c2 = get_centroid(prev_map["heatmap"]["features"])
        
        def get_infected_area(features):
            return sum(1 for f in features if f["properties"].get("score", 0) > 20) * 100
            
        curr_area = get_infected_area(curr_map["heatmap"]["features"])
        prev_area = get_infected_area(prev_map["heatmap"]["features"])
        
        delta_area = curr_area - prev_area
        status = "EXPANDING" if delta_area > 0 else "SHRINKING" if delta_area < 0 else "STABLE"
        
        prev_infected_ids = {f["properties"].get("id") for f in prev_map["heatmap"]["features"] if f["properties"].get("score", 0) > 20}
        
        new_infections = []
        for f in curr_map["heatmap"]["features"]:
            if f["properties"].get("score", 0) > 20 and f["properties"].get("id") not in prev_infected_ids:
                new_infections.append({
                    "tile_id": f["properties"].get("id"),
                    "score": f["properties"].get("score"),
                    "coordinates": f["geometry"]["coordinates"][0][0]
                })
                
        spread_vector = None
        if c1 and c2:
            dist = self.distance(c2, c1)
            bearing = self.bearing(c2, c1)
            spread_vector = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[c2[1], c2[0]], [c1[1], c1[0]]]
                },
                "properties": {
                    "from_date": start_point.strftime("%Y-%m-%d"),
                    "to_date": now.strftime("%Y-%m-%d"),
                    "distance_m": round(dist),
                    "bearing_deg": round(bearing),
                    "direction": self.get_cardinal_direction(bearing)
                }
            }
            
        return {
            "window_days": window_days,
            "disease": disease_class or "all",
            "status": status,
            "metrics": {
                "current_infected_area_m2": curr_area,
                "previous_infected_area_m2": prev_area,
                "area_change_m2": delta_area,
                "growth_pct": round((delta_area / prev_area) * 100) if prev_area > 0 else 100
            },
            "spread_vector": spread_vector,
            "centroid_shift": {"previous": c2, "current": c1},
            "new_hotspots": new_infections,
            "timeline": [
                {"date": start_point.strftime("%Y-%m-%d"), "area": prev_area},
                {"date": split_point.strftime("%Y-%m-%d"), "area": curr_area}
            ]
        }

    def distance(self, p1, p2):
        lat1, lon1 = p1
        lat2, lon2 = p2
        dlat = (lat2 - lat1) * math.pi / 180
        dlon = (lon2 - lon1) * math.pi / 180
        a = math.sin(dlat/2)**2 + math.cos(lat1*math.pi/180) * math.cos(lat2*math.pi/180) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return self.EARTH_RADIUS_M * c
        
    def bearing(self, p1, p2):
        lat1, lon1 = p1[0]*math.pi/180, p1[1]*math.pi/180
        lat2, lon2 = p2[0]*math.pi/180, p2[1]*math.pi/180
        dlon = lon2 - lon1
        y = math.sin(dlon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        brng = math.atan2(y, x) * 180 / math.pi
        return (brng + 360) % 360

    def get_cardinal_direction(self, deg):
        dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        return dirs[int(round(deg / 45)) % 8]

    def to_geojson(self, tiles):
        features = [{
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[ [p[1], p[0]] for p in t["bounds"] ]]
            },
            "properties": {
                "id": t.get("tile_id"),
                "score": t.get("score"),
                "severity": t.get("severity"),
                "disease": t.get("dominant_disease"),
                "count": t.get("detection_count")
            }
        } for t in tiles]
        return {"type": "FeatureCollection", "features": features}

geo_spatial_engine = GeoSpatialEngine()
