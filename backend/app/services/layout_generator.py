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
    
    custom = getattr(request, 'custom_layout', None)
    
    # --- Place Toilets ---
    toilet_x = WALL_OFFSET
    toilet_y = WALL_OFFSET
    toilet_positions = {}  # Track toilet positions for seat alignment
    
    for toilet in toilets:
        width = getattr(toilet, 'width_in', None) or 16
        depth = getattr(toilet, 'depth_in', None) or 24
        
        if custom and isinstance(custom, dict) and 'toilet' in custom:
            cx = float(custom['toilet'].get('x', toilet_x))
            cy = float(custom['toilet'].get('y', toilet_y))
        else:
            if toilet_y + depth > available_depth:
                toilet_y = WALL_OFFSET
                toilet_x += width + ITEM_SPACING
            cx = toilet_x
            cy = toilet_y
            toilet_y += depth + ITEM_SPACING
        
        m_name = getattr(toilet, 'model_name', 'Toilet')
        sku = getattr(toilet, 'sku_code', '')
        is_reach = "reach" in m_name.lower() or "29172" in sku.lower() or "29173" in sku.lower() or "29278" in sku.lower()
        
        rot = float(custom.get('toilet', {}).get('rot', 0)) if custom and isinstance(custom, dict) else 0
        position = {
            "sku_code": sku,
            "category": "toilet",
            "model_name": m_name,
            "x": cx,
            "y": cy,
            "width_in": width,
            "depth_in": depth,
            "height_in": getattr(toilet, 'height_in', None) or TOILET_HEIGHT,
            "rotation_deg": rot,
            "obj_file_path": getattr(toilet, 'obj_file_path', None),
            "has_3d_model": getattr(toilet, 'has_3d_model', False),
            "seat_included": is_reach,
            "seat_note": "Quiet-Close Seat Included" if is_reach else None,
        }
        placements.append(position)
        toilet_positions[sku] = position
    
    # --- Place Toilet Seats (aligned on top of matching toilet) ---
    for seat in toilet_seats:
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
            # If the toilet is a Reach model, disable separate 3D seat rendering (seat is integrated in 3D OBJ model)
            if matched_toilet.get("seat_included"):
                continue
            
            toilet_height = matched_toilet.get("height_in", TOILET_HEIGHT)
            toilet_w = matched_toilet.get("width_in", 16)
            toilet_d = matched_toilet.get("depth_in", 24)
            
            # Align seat dimensions so they fit cleanly inside the toilet bowl rim
            seat_w_raw = getattr(seat, 'width_in', None) or 14.5
            seat_d_raw = getattr(seat, 'depth_in', None) or 19.5
            seat_width = min(seat_w_raw, toilet_w * 0.95)
            seat_depth = min(seat_d_raw, toilet_d * 0.90)
            
            placements.append({
                "sku_code": getattr(seat, 'sku_code', ''),
                "category": "toilet_seat",
                "model_name": getattr(seat, 'model_name', 'Toilet Seat'),
                "x": matched_toilet["x"] + (toilet_w - seat_width) / 2,
                "y": matched_toilet["y"] + (toilet_d - seat_depth) / 2,
                "width_in": seat_width,
                "depth_in": seat_depth,
                "rotation_deg": matched_toilet.get("rotation_deg", 0),
                "platform_height_offset": toilet_height * 0.95,  # Rest on top rim of toilet bowl
                "obj_file_path": getattr(seat, 'obj_file_path', None),
                "has_3d_model": getattr(seat, 'has_3d_model', False),
            })
    
    # --- Place Wash Basins on top of Platform ---
    basin_x = max(room_width_in - WALL_OFFSET - 24, WALL_OFFSET + 36)  # Right side of room
    basin_y = WALL_OFFSET
    
    for basin in wash_basins:
        basin_w_default = getattr(basin, 'width_in', None) or 20
        basin_d_default = getattr(basin, 'depth_in', None) or 16
        
        sink_rot = float(custom.get('washbasin', {}).get('rot', 0)) if custom and isinstance(custom, dict) else 0
        if custom and isinstance(custom, dict) and 'washbasin' in custom:
            bw = float(custom['washbasin'].get('w', basin_w_default))
            bd = float(custom['washbasin'].get('h', basin_d_default))
            # Cabinet must be at MINIMUM 3 inches bigger than the sink on EACH side (6 inches total margin)
            min_cab_w = bw + 6
            min_cab_d = bd + 6
            
            cab_w = max(min_cab_w, float(custom.get('cabinet', {}).get('w', min_cab_w)))
            cab_d = max(min_cab_d, float(custom.get('cabinet', {}).get('h', min_cab_d)))
            
            cab_x = float(custom['washbasin'].get('x', basin_x))
            cab_y = float(custom['washbasin'].get('y', basin_y))
            
            # Center sink on top of cabinet
            sink_x = cab_x + (cab_w - bw) / 2
            sink_y = cab_y + (cab_d - bd) / 2
        else:
            bw = basin_w_default
            bd = basin_d_default
            cab_w = bw + 6  # Minimum 3" margin on each side
            cab_d = bd + 6
            if basin_y + bd > available_depth:
                basin_y = WALL_OFFSET
                basin_x -= cab_w + ITEM_SPACING
            cab_x = basin_x
            cab_y = basin_y
            sink_x = cab_x + 3
            sink_y = cab_y + 3
            basin_y += bd + ITEM_SPACING
        
        # Black countertop platform pedestal under sink
        placements.append({
            "sku_code": f"{getattr(basin, 'sku_code', '')}_platform",
            "category": "sink_platform",
            "model_name": "Counter Platform",
            "x": cab_x,
            "y": cab_y,
            "width_in": cab_w,
            "depth_in": cab_d,
            "height_in": SINK_PLATFORM_HEIGHT,
            "rotation_deg": sink_rot,
            "is_platform": True,
            "obj_file_path": None,
        })
        
        # Vessel sink sitting on top of platform
        placements.append({
            "sku_code": getattr(basin, 'sku_code', ''),
            "category": "washbasin",
            "model_name": getattr(basin, 'model_name', 'Wash Basin'),
            "x": sink_x,
            "y": sink_y,
            "width_in": bw,
            "depth_in": bd,
            "rotation_deg": sink_rot,
            "platform_height_offset": SINK_PLATFORM_HEIGHT,
            "obj_file_path": getattr(basin, 'obj_file_path', None),
            "has_3d_model": getattr(basin, 'has_3d_model', False),
        })
    
    # --- Add bathtub placeholder (reserved clear zone) ---
    bt_x = WALL_OFFSET
    bt_y = max(room_depth_in - bathtub_depth, 0)
    bt_w = 60
    bt_d = bathtub_depth
    bt_rot = float(custom.get('bathtub', {}).get('rot', 0)) if custom and isinstance(custom, dict) else 0
    if custom and isinstance(custom, dict) and 'bathtub' in custom:
        bt_x = float(custom['bathtub'].get('x', bt_x))
        bt_y = float(custom['bathtub'].get('y', bt_y))
        bt_w = float(custom['bathtub'].get('w', bt_w))
        bt_d = float(custom['bathtub'].get('h', bt_d))

    placements.append({
        "sku_code": "bathtub_area",
        "category": "bathtub",
        "model_name": "Reserved Bathtub Zone",
        "x": bt_x,
        "y": bt_y,
        "width_in": bt_w,
        "depth_in": bt_d,
        "rotation_deg": bt_rot,
        "is_placeholder": True,
        "obj_file_path": None,
    })
    
    # --- Add custom Window, Mirror & Door placements ---
    if custom and isinstance(custom, dict):
        if 'window' in custom:
            placements.append({
                "sku_code": "custom_window",
                "category": "window",
                "model_name": "Bathroom Window",
                "x": float(custom['window'].get('x', room_width_in / 2 - 20)),
                "y": 0,
                "width_in": float(custom['window'].get('w', 40)),
                "depth_in": 2,
                "rotation_deg": float(custom['window'].get('rot', 0)),
                "is_custom_feature": True,
            })
        if 'mirror' in custom:
            placements.append({
                "sku_code": "custom_mirror",
                "category": "mirror",
                "model_name": "Vanity Mirror",
                "x": float(custom['mirror'].get('x', room_width_in / 2 - 12)),
                "y": 0,
                "width_in": float(custom['mirror'].get('w', 24)),
                "height_in": float(custom['mirror'].get('h', 32)),
                "depth_in": 2,
                "rotation_deg": float(custom['mirror'].get('rot', 0)),
                "is_custom_feature": True,
            })
        if 'door' in custom:
            placements.append({
                "sku_code": "custom_door",
                "category": "door",
                "model_name": "Bathroom Door",
                "x": float(custom['door'].get('x', room_width_in / 2 - 16)),
                "y": float(custom['door'].get('y', room_depth_in - 4)),
                "width_in": float(custom['door'].get('w', 32)),
                "depth_in": float(custom['door'].get('h', 4)),
                "rotation_deg": float(custom['door'].get('rot', 0)),
                "is_custom_feature": True,
            })
    else:
        placements.append({
            "sku_code": "default_door",
            "category": "door",
            "model_name": "Bathroom Door",
            "x": max(2, room_width_in / 2 - 16),
            "y": max(0, room_depth_in - 4),
            "width_in": 32,
            "depth_in": 4,
            "rotation_deg": 0,
            "is_custom_feature": True,
        })

    return placements
