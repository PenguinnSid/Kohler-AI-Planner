from app.schemas.design_request import DesignRequest
from typing import List, Dict, Optional


def generate_layout(products: Dict[str, object], request: DesignRequest) -> List[Dict]:
    """
    Stage 4b of the pipeline: produce structured placement data for 3D rendering.
    
    Arranges bathroom fixtures in a traditional bathroom layout:
    - Toilets along left wall
    - Toilet seats aligned directly on top of their toilets
    - Wash basins sitting on top of white platform pedestals (sink width/depth + 2 inches)
    - Space reserved for future bathtub placement
    - Faucets excluded from visual 3D scene
    
    Returns a list of placement objects including platform pedestals.
    """
    room_width_in = request.room_width_ft * 12
    room_depth_in = request.room_depth_ft * 12
    
    placements = []
    WALL_OFFSET = 2  # Fixtures flush against walls (2-inch clearance for wall mounting)
    ITEM_SPACING = 18  # Spacing between items
    SINK_PLATFORM_HEIGHT = 12  # Height of platform under vessel sink
    TOILET_HEIGHT = 16  # Height of toilet bowl for seat placement
    SINK_GAP = 1  # 1-inch gap around washbasin on platform (width/depth + 2 inches total)
    
    # Reserve bathtub area: 30" wide x 60" deep at back of room
    bathtub_depth = 60
    available_depth = max(room_depth_in - bathtub_depth - WALL_OFFSET, 36)
    
    # Separate products by category
    toilets = []
    toilet_seats = []
    wash_basins = []
    
    for category_key, product in products.items():
        cat = getattr(product, 'category', '').lower()
        
        if cat == 'toilet':
            toilets.append(product)
        elif cat == 'toilet_seat':
            toilet_seats.append(product)
        elif cat in ('washbasin', 'wash_basin'):
            wash_basins.append(product)
        # Faucets are explicitly excluded from 3D visual rendering
    
    # --- Place Toilets along left wall ---
    toilet_x = WALL_OFFSET
    toilet_y = WALL_OFFSET
    toilet_positions = {}  # Track toilet positions for seat alignment
    
    for toilet in toilets:
        width = getattr(toilet, 'width_in', None) or 16
        depth = getattr(toilet, 'depth_in', None) or 24
        
        if toilet_y + depth > available_depth:
            toilet_y = WALL_OFFSET
            toilet_x += width + ITEM_SPACING
        
        position = {
            "sku_code": getattr(toilet, 'sku_code', ''),
            "category": "toilet",
            "model_name": getattr(toilet, 'model_name', 'Toilet'),
            "x": toilet_x,
            "y": toilet_y,
            "width_in": width,
            "depth_in": depth,
            "height_in": getattr(toilet, 'height_in', None) or TOILET_HEIGHT,
            "obj_file_path": getattr(toilet, 'obj_file_path', None),
            "has_3d_model": getattr(toilet, 'has_3d_model', False),
        }
        placements.append(position)
        toilet_positions[getattr(toilet, 'sku_code', '')] = position
        
        toilet_y += depth + ITEM_SPACING
    
    # --- Place Toilet Seats (aligned on top of matching toilet) ---
    for seat in toilet_seats:
        seat_width = getattr(seat, 'width_in', None) or 16
        seat_depth = getattr(seat, 'depth_in', None) or 20
        
        # Find matching toilet by model name or use first available toilet
        seat_model = getattr(seat, 'model_name', '').lower()
        matched_toilet = None
        
        for toilet_sku, toilet_pos in toilet_positions.items():
            toilet_obj = products.get(toilet_sku)
            toilet_model = getattr(toilet_obj, 'model_name', '').lower() if toilet_obj else ''
            s_parts = seat_model.split()
            t_parts = toilet_model.split()
            if (s_parts and s_parts[0] in toilet_model) or (t_parts and t_parts[0] in seat_model):
                matched_toilet = toilet_pos
                break
        
        if not matched_toilet and toilet_positions:
            matched_toilet = list(toilet_positions.values())[0]
        
        if matched_toilet:
            toilet_height = matched_toilet.get("height_in", TOILET_HEIGHT)
            placements.append({
                "sku_code": getattr(seat, 'sku_code', ''),
                "category": "toilet_seat",
                "model_name": getattr(seat, 'model_name', 'Toilet Seat'),
                "x": matched_toilet["x"],
                "y": matched_toilet["y"],
                "width_in": seat_width,
                "depth_in": seat_depth,
                "platform_height_offset": toilet_height * 0.9,  # Rest on top of toilet bowl
                "obj_file_path": getattr(seat, 'obj_file_path', None),
                "has_3d_model": getattr(seat, 'has_3d_model', False),
            })
    
    # --- Place Wash Basins on top of Platform ---
    basin_x = max(room_width_in - WALL_OFFSET - 24, WALL_OFFSET + 36)  # Right side of room
    basin_y = WALL_OFFSET
    
    for basin in wash_basins:
        basin_width = getattr(basin, 'width_in', None) or 20
        basin_depth = getattr(basin, 'depth_in', None) or 16
        
        if basin_y + basin_depth > available_depth:
            basin_y = WALL_OFFSET
            basin_x -= basin_width + ITEM_SPACING + 12
        
        # Platform dimensions: 1 inch gap on all sides (width/depth + 2 inches)
        platform_width = basin_width + (2 * SINK_GAP)
        platform_depth = basin_depth + (2 * SINK_GAP)
        
        # White box platform/counter pedestal under sink
        placements.append({
            "sku_code": f"{getattr(basin, 'sku_code', '')}_platform",
            "category": "sink_platform",
            "model_name": "Counter Platform",
            "x": basin_x - SINK_GAP,
            "y": basin_y - SINK_GAP,
            "width_in": platform_width,
            "depth_in": platform_depth,
            "height_in": SINK_PLATFORM_HEIGHT,
            "is_platform": True,
            "obj_file_path": None,
        })
        
        # Vessel sink sitting on top of platform
        placements.append({
            "sku_code": getattr(basin, 'sku_code', ''),
            "category": "washbasin",
            "model_name": getattr(basin, 'model_name', 'Wash Basin'),
            "x": basin_x,
            "y": basin_y,
            "width_in": basin_width,
            "depth_in": basin_depth,
            "platform_height_offset": SINK_PLATFORM_HEIGHT,
            "obj_file_path": getattr(basin, 'obj_file_path', None),
            "has_3d_model": getattr(basin, 'has_3d_model', False),
        })
        
        basin_y += basin_depth + ITEM_SPACING
    
    # --- Add bathtub placeholder (reserved clear zone) ---
    placements.append({
        "sku_code": "bathtub_area",
        "category": "bathtub",
        "model_name": "Reserved Bathtub Zone",
        "x": WALL_OFFSET,
        "y": max(room_depth_in - bathtub_depth, 0),
        "width_in": max(room_width_in - (2 * WALL_OFFSET), 36),
        "depth_in": bathtub_depth,
        "is_placeholder": True,
        "obj_file_path": None,
    })
    
    return placements
