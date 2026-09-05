from app.schemas.design_request import DesignRequest


def generate_layout(bundle: dict, request: DesignRequest) -> str:
    """
    Stage 4b of the pipeline: produce a simple 2D SVG schematic of the room
    with the selected fixtures placed as labeled rectangles, roughly to scale.

    This is intentionally simple (grid/zone placement, not real spatial
    optimization) — the goal is a legible, to-scale visual, not a CAD tool.
    """
    px_per_ft = 40
    width_px = int(request.room_width_ft * px_per_ft)
    depth_px = int(request.room_depth_ft * px_per_ft)

    svg_parts = [
        f'<svg viewBox="0 0 {width_px} {depth_px}" xmlns="http://www.w3.org/2000/svg">',
        f'<rect x="0" y="0" width="{width_px}" height="{depth_px}" '
        f'fill="none" stroke="black" stroke-width="2"/>',
    ]

    # TODO: replace with real placement logic once fixture footprints
    # (width_in/depth_in) are populated by the catalog enrichment pass
    x_cursor = 10
    for category, selection in bundle.get("selections", {}).items():
        svg_parts.append(
            f'<rect x="{x_cursor}" y="10" width="60" height="40" '
            f'fill="lightgray" stroke="black"/>'
        )
        svg_parts.append(
            f'<text x="{x_cursor + 5}" y="30" font-size="8">{category}</text>'
        )
        x_cursor += 70

    svg_parts.append("</svg>")
    return "".join(svg_parts)
