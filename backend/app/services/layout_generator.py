from app.schemas.design_request import DesignRequest
from typing import List, Dict


def generate_layout(products: Dict[str, object], request: DesignRequest) -> List[Dict]:
    """
    Stage 4b of the pipeline: produce structured placement data for 3D rendering.
    
    Given a dict of products keyed by category, places them in the room using
    a simple grid-based layout that respects fixture footprints (width_in/depth_in)
    and avoids overlaps.
    
    Returns a list of placement objects:
    [
        {
            "sku_code": "...",
            "category": "...",
            "model_name": "...",
            "x": <float>,  # inches from room origin
            "y": <float>,  # inches from room origin
            "width_in": <float>,
            "depth_in": <float>,
        },
        ...
    ]
    """
    # Convert room dimensions from feet to inches
    room_width_in = request.room_width_ft * 12
    room_depth_in = request.room_depth_ft * 12
    
    # Placement strategy: arrange products in a grid layout along one wall
    # with padding to avoid overlap. Start from one corner and place items
    # with a standard spacing.
    placements = []
    x_cursor = 12  # Start 1 foot from left wall (12 inches)
    y_cursor = 12  # Start 1 foot from back wall (12 inches)
    row_height = 0  # Track the tallest item in current row for multi-row layout
    
    # Sort products by category for consistent placement order
    sorted_categories = sorted(products.keys())
    
    PADDING = 6  # 6 inches spacing between items
    
    for category in sorted_categories:
        product = products[category]
        
        # Get fixture dimensions, use sensible defaults if missing
        width = getattr(product, 'width_in', None) or 24  # Default 2 feet
        depth = getattr(product, 'depth_in', None) or 24
        model_name = getattr(product, 'model_name', 'Unknown')
        sku_code = getattr(product, 'sku_code', f'SKU-{category}')
        prod_category = getattr(product, 'category', category)
        
        # Check if item fits in current row
        if x_cursor + width + PADDING > room_width_in:
            # Move to next row
            x_cursor = 12
            y_cursor += row_height + PADDING
            row_height = 0
        
        # Check if we're going past room depth
        if y_cursor + depth > room_depth_in:
            # Clamp to room boundary
            y_cursor = max(12, room_depth_in - depth - PADDING)
        
        # Record placement
        placements.append({
            "sku_code": sku_code,
            "category": prod_category,
            "model_name": model_name,
            "x": x_cursor,
            "y": y_cursor,
            "width_in": width,
            "depth_in": depth,
        })
        
        # Move cursor for next item
        x_cursor += width + PADDING
        row_height = max(row_height, depth)
    
    return placements
