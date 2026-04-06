"""
Forex Expo Dubai — UE5 Exhibition Hall Builder
================================================
Run via: Tools → Execute Python Script (or paste into UE5 Python console)

Builds a photorealistic 80×40m exhibition hall with:
  - Marble reflective floor with Nanite-ready material
  - 6m-high walls with dark panels and accent trim
  - High ceiling with exposed track lighting (48 spot/rect lights)
  - Lumen GI + reflections for photorealistic bounce light
  - 3 broker booths: Pepperstone (red), Capital.com (teal), Base Markets (gold)
  - Entrance arch with "FOREX EXPO DUBAI" signage
  - Seminar stage area at the far end
  - Ambient skylight + directional fill
  - Proximity trigger volumes on each booth (fires brokerProximity events)
  - Zone trigger volumes for HUD zone labels
  - Player start at the entrance

All distances in centimetres (UE5 convention). 80m = 8000cm, 40m = 4000cm.
"""

import unreal
import math

# ============================================================================
# Configuration
# ============================================================================

HALL_LENGTH = 8000.0    # 80m (X axis)
HALL_WIDTH  = 4000.0    # 40m (Y axis)
HALL_HEIGHT = 600.0     # 6m walls
CEILING_H   = 620.0    # ceiling panel slightly above walls
FLOOR_THICK = 20.0
WALL_THICK  = 30.0

# Broker booth configs — positions in metres converted to cm
BOOTHS = [
    {
        "id": "pepperstone",
        "name": "Pepperstone",
        "tier": "TITANIUM",
        "color": unreal.LinearColor(0.91, 0.10, 0.17, 1.0),  # #e8192c
        "accent": unreal.LinearColor(0.04, 0.19, 0.38, 1.0),  # #0a3161
        "pos": unreal.Vector(-2200.0, -1500.0, 0.0),
        "size_x": 800.0,  # 8m
        "size_y": 600.0,  # 6m
        "wall_height": 350.0,
    },
    {
        "id": "capital",
        "name": "Capital.com",
        "tier": "PLATINUM",
        "color": unreal.LinearColor(0.0, 0.83, 0.67, 1.0),   # #00d4aa
        "accent": unreal.LinearColor(0.10, 0.10, 0.18, 1.0),  # #1a1a2e
        "pos": unreal.Vector(0.0, -1500.0, 0.0),
        "size_x": 600.0,  # 6m
        "size_y": 500.0,  # 5m
        "wall_height": 320.0,
    },
    {
        "id": "basemarkets",
        "name": "Base Markets",
        "tier": "GOLD",
        "color": unreal.LinearColor(1.0, 0.84, 0.0, 1.0),    # #ffd700
        "accent": unreal.LinearColor(0.05, 0.11, 0.16, 1.0),  # #0d1b2a
        "pos": unreal.Vector(2200.0, -1500.0, 0.0),
        "size_x": 500.0,  # 5m
        "size_y": 400.0,  # 4m
        "wall_height": 300.0,
    },
]

# ============================================================================
# Utility helpers
# ============================================================================

editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
material_edit_lib = unreal.MaterialEditingLibrary

ELL = unreal.EditorLevelLibrary
EAL = unreal.EditorAssetLibrary

CONTENT_DIR = "/Game/ForexExpo/"


def log(msg):
    unreal.log(f"[ForexExpo] {msg}")


def spawn_static_mesh_cube(name, location, scale, material=None, folder=""):
    """Spawn a cube static mesh actor (Engine built-in Cube) at given location/scale."""
    # Use the built-in cube mesh
    cube_mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")
    if not cube_mesh:
        log(f"WARNING: Could not load /Engine/BasicShapes/Cube")
        return None

    actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
        cube_mesh, location
    )
    if not actor:
        log(f"WARNING: Could not spawn actor {name}")
        return None

    actor.set_actor_label(name)
    actor.set_actor_scale3d(scale)
    if folder:
        actor.set_folder_path(folder)

    if material:
        comp = actor.static_mesh_component
        if comp:
            comp.set_material(0, material)

    return actor


def spawn_plane(name, location, scale, material=None, folder=""):
    """Spawn a plane mesh for floor/ceiling."""
    plane_mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Plane")
    if not plane_mesh:
        log("WARNING: Could not load /Engine/BasicShapes/Plane")
        return None

    actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
        plane_mesh, location
    )
    if not actor:
        return None

    actor.set_actor_label(name)
    actor.set_actor_scale3d(scale)
    if folder:
        actor.set_folder_path(folder)

    if material:
        comp = actor.static_mesh_component
        if comp:
            comp.set_material(0, material)

    return actor


def spawn_point_light(name, location, intensity=50000.0, color=None,
                      attenuation=1500.0, folder=""):
    """Spawn a point light."""
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.PointLight, location
    )
    if not actor:
        return None

    actor.set_actor_label(name)
    if folder:
        actor.set_folder_path(folder)

    light = actor.point_light_component
    light.set_editor_property("intensity", intensity)
    light.set_editor_property("attenuation_radius", attenuation)
    if color:
        light.set_editor_property("light_color", color)
    light.set_editor_property("cast_shadows", True)

    return actor


def spawn_spot_light(name, location, rotation, intensity=80000.0,
                     inner_angle=22.0, outer_angle=35.0,
                     attenuation=2000.0, color=None, folder=""):
    """Spawn a spot light (track lighting)."""
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.SpotLight, location
    )
    if not actor:
        return None

    actor.set_actor_label(name)
    actor.set_actor_rotation(rotation, False)
    if folder:
        actor.set_folder_path(folder)

    light = actor.spot_light_component
    light.set_editor_property("intensity", intensity)
    light.set_editor_property("inner_cone_angle", inner_angle)
    light.set_editor_property("outer_cone_angle", outer_angle)
    light.set_editor_property("attenuation_radius", attenuation)
    light.set_editor_property("cast_shadows", True)
    light.set_editor_property("use_temperature", True)
    light.set_editor_property("temperature", 5200.0)  # warm white
    if color:
        light.set_editor_property("light_color", color)

    return actor


def spawn_rect_light(name, location, rotation, width=200.0, height=100.0,
                     intensity=60000.0, color=None, folder=""):
    """Spawn a rectangular area light."""
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.RectLight, location
    )
    if not actor:
        return None

    actor.set_actor_label(name)
    actor.set_actor_rotation(rotation, False)
    if folder:
        actor.set_folder_path(folder)

    light = actor.rect_light_component
    light.set_editor_property("intensity", intensity)
    light.set_editor_property("source_width", width)
    light.set_editor_property("source_height", height)
    light.set_editor_property("attenuation_radius", 1800.0)
    light.set_editor_property("cast_shadows", True)
    light.set_editor_property("use_temperature", True)
    light.set_editor_property("temperature", 5000.0)
    if color:
        light.set_editor_property("light_color", color)

    return actor


def spawn_text_render(name, location, rotation, text, size=72.0,
                      color=None, folder=""):
    """Spawn a TextRenderActor for signage."""
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.TextRenderActor, location
    )
    if not actor:
        return None

    actor.set_actor_label(name)
    actor.set_actor_rotation(rotation, False)
    if folder:
        actor.set_folder_path(folder)

    text_comp = actor.text_render
    text_comp.set_editor_property("text", text)
    text_comp.set_editor_property("world_size", size)
    text_comp.set_editor_property("horizontal_alignment",
                                   unreal.HorizTextAligment.EHTA_CENTER)
    text_comp.set_editor_property("vertical_alignment",
                                   unreal.VerticalTextAligment.EVRTA_TEXT_CENTER)
    if color:
        text_comp.set_editor_property("text_render_color",
                                       color.to_rgbe())

    return actor


def spawn_trigger_box(name, location, extent, folder=""):
    """Spawn a TriggerBox actor."""
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.TriggerBox, location
    )
    if not actor:
        return None

    actor.set_actor_label(name)
    actor.set_actor_scale3d(unreal.Vector(
        extent.x / 50.0,  # default box is 100cm, scale = extent/50
        extent.y / 50.0,
        extent.z / 50.0,
    ))
    if folder:
        actor.set_folder_path(folder)

    return actor


# ============================================================================
# Material creation
# ============================================================================

def ensure_package_dir():
    """Make sure /Game/ForexExpo/ exists."""
    if not EAL.does_directory_exist(CONTENT_DIR):
        EAL.make_directory(CONTENT_DIR)


def create_material_instance(name, parent_path=None):
    """Create a material in /Game/ForexExpo/."""
    mat_path = CONTENT_DIR + name
    if EAL.does_asset_exist(mat_path):
        return unreal.EditorAssetLibrary.load_asset(mat_path)

    factory = unreal.MaterialFactoryNew()
    mat = asset_tools.create_asset(name, "/Game/ForexExpo", unreal.Material, factory)
    return mat


def create_marble_floor_material():
    """Create a polished marble floor material with high metallic/specular."""
    log("Creating marble floor material...")
    mat = create_material_instance("M_MarbleFloor")
    if not mat:
        return None

    # Set material properties for polished marble
    # Base Color: light cream/white marble
    material_edit_lib.set_material_instance_vector_parameter_value if hasattr(material_edit_lib, 'set_material_instance_vector_parameter_value') else None

    # Use material property overrides
    mat.set_editor_property("two_sided", False)

    # Create expression nodes via the material editing library
    # Base Color — cream marble
    base_color_node = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant4Vector, -400, -200
    )
    base_color_node.constant = unreal.LinearColor(0.85, 0.82, 0.78, 1.0)
    material_edit_lib.connect_material_property(
        base_color_node, "RGBA", unreal.MaterialProperty.MP_BASE_COLOR
    )

    # Metallic — low for marble
    metallic_node = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, -100
    )
    metallic_node.r = 0.02
    material_edit_lib.connect_material_property(
        metallic_node, "", unreal.MaterialProperty.MP_METALLIC
    )

    # Roughness — very smooth/polished
    roughness_node = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 0
    )
    roughness_node.r = 0.08
    material_edit_lib.connect_material_property(
        roughness_node, "", unreal.MaterialProperty.MP_ROUGHNESS
    )

    # Specular — high
    specular_node = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 100
    )
    specular_node.r = 0.8
    material_edit_lib.connect_material_property(
        specular_node, "", unreal.MaterialProperty.MP_SPECULAR
    )

    # Compile
    material_edit_lib.recompile_material(mat)
    log("  Marble floor material created")
    return mat


def create_wall_material():
    """Create dark charcoal wall panels."""
    log("Creating wall material...")
    mat = create_material_instance("M_WallPanel")
    if not mat:
        return None

    base_color = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant4Vector, -400, -200
    )
    base_color.constant = unreal.LinearColor(0.08, 0.08, 0.10, 1.0)
    material_edit_lib.connect_material_property(
        base_color, "RGBA", unreal.MaterialProperty.MP_BASE_COLOR
    )

    metallic = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, -100
    )
    metallic.r = 0.1
    material_edit_lib.connect_material_property(
        metallic, "", unreal.MaterialProperty.MP_METALLIC
    )

    roughness = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 0
    )
    roughness.r = 0.6
    material_edit_lib.connect_material_property(
        roughness, "", unreal.MaterialProperty.MP_ROUGHNESS
    )

    material_edit_lib.recompile_material(mat)
    log("  Wall material created")
    return mat


def create_ceiling_material():
    """Create matte dark ceiling."""
    log("Creating ceiling material...")
    mat = create_material_instance("M_Ceiling")
    if not mat:
        return None

    base_color = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant4Vector, -400, -200
    )
    base_color.constant = unreal.LinearColor(0.03, 0.03, 0.04, 1.0)
    material_edit_lib.connect_material_property(
        base_color, "RGBA", unreal.MaterialProperty.MP_BASE_COLOR
    )

    roughness = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 0
    )
    roughness.r = 0.95
    material_edit_lib.connect_material_property(
        roughness, "", unreal.MaterialProperty.MP_ROUGHNESS
    )

    material_edit_lib.recompile_material(mat)
    log("  Ceiling material created")
    return mat


def create_booth_material(name, color_linear):
    """Create a satin booth wall material with given accent colour."""
    log(f"Creating booth material: {name}...")
    mat = create_material_instance(f"M_Booth_{name}")
    if not mat:
        return None

    base_color = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant4Vector, -400, -200
    )
    base_color.constant = color_linear
    material_edit_lib.connect_material_property(
        base_color, "RGBA", unreal.MaterialProperty.MP_BASE_COLOR
    )

    metallic = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, -100
    )
    metallic.r = 0.15
    material_edit_lib.connect_material_property(
        metallic, "", unreal.MaterialProperty.MP_METALLIC
    )

    roughness = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 0
    )
    roughness.r = 0.35
    material_edit_lib.connect_material_property(
        roughness, "", unreal.MaterialProperty.MP_ROUGHNESS
    )

    material_edit_lib.recompile_material(mat)
    log(f"  Booth material {name} created")
    return mat


def create_booth_back_material(name, color_linear):
    """Dark booth back panel."""
    log(f"Creating booth back material: {name}...")
    mat = create_material_instance(f"M_BoothBack_{name}")
    if not mat:
        return None

    # Darken the colour significantly
    dark = unreal.LinearColor(
        color_linear.r * 0.15,
        color_linear.g * 0.15,
        color_linear.b * 0.15,
        1.0
    )
    base_color = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant4Vector, -400, -200
    )
    base_color.constant = dark
    material_edit_lib.connect_material_property(
        base_color, "RGBA", unreal.MaterialProperty.MP_BASE_COLOR
    )

    roughness = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 0
    )
    roughness.r = 0.7
    material_edit_lib.connect_material_property(
        roughness, "", unreal.MaterialProperty.MP_ROUGHNESS
    )

    material_edit_lib.recompile_material(mat)
    return mat


def create_accent_stripe_material(name, color_linear):
    """Emissive accent stripe for booth edges."""
    log(f"Creating accent stripe: {name}...")
    mat = create_material_instance(f"M_Stripe_{name}")
    if not mat:
        return None

    base_color = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant4Vector, -400, -200
    )
    base_color.constant = color_linear
    material_edit_lib.connect_material_property(
        base_color, "RGBA", unreal.MaterialProperty.MP_BASE_COLOR
    )

    # Emissive glow
    emissive = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant4Vector, -400, 200
    )
    emissive.constant = unreal.LinearColor(
        color_linear.r * 3.0,
        color_linear.g * 3.0,
        color_linear.b * 3.0,
        1.0
    )
    material_edit_lib.connect_material_property(
        emissive, "RGBA", unreal.MaterialProperty.MP_EMISSIVE_COLOR
    )

    roughness = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 0
    )
    roughness.r = 0.2
    material_edit_lib.connect_material_property(
        roughness, "", unreal.MaterialProperty.MP_ROUGHNESS
    )

    material_edit_lib.recompile_material(mat)
    return mat


def create_stage_material():
    """Create a stage platform material — dark wood look."""
    mat = create_material_instance("M_Stage")
    if not mat:
        return None

    base_color = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant4Vector, -400, -200
    )
    base_color.constant = unreal.LinearColor(0.12, 0.08, 0.05, 1.0)
    material_edit_lib.connect_material_property(
        base_color, "RGBA", unreal.MaterialProperty.MP_BASE_COLOR
    )

    roughness = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 0
    )
    roughness.r = 0.55
    material_edit_lib.connect_material_property(
        roughness, "", unreal.MaterialProperty.MP_ROUGHNESS
    )

    material_edit_lib.recompile_material(mat)
    return mat


def create_carpet_material():
    """Carpet runner material — dark navy."""
    mat = create_material_instance("M_Carpet")
    if not mat:
        return None

    base_color = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant4Vector, -400, -200
    )
    base_color.constant = unreal.LinearColor(0.02, 0.04, 0.08, 1.0)
    material_edit_lib.connect_material_property(
        base_color, "RGBA", unreal.MaterialProperty.MP_BASE_COLOR
    )

    roughness = material_edit_lib.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 0
    )
    roughness.r = 0.92
    material_edit_lib.connect_material_property(
        roughness, "", unreal.MaterialProperty.MP_ROUGHNESS
    )

    material_edit_lib.recompile_material(mat)
    return mat


# ============================================================================
# Hall structure
# ============================================================================

def build_floor(mat):
    """Build the exhibition hall floor."""
    log("Building floor...")
    # Floor is a scaled cube (flat)
    floor = spawn_static_mesh_cube(
        "Hall_Floor",
        unreal.Vector(0, 0, -FLOOR_THICK / 2.0),
        unreal.Vector(HALL_LENGTH / 100.0, HALL_WIDTH / 100.0, FLOOR_THICK / 100.0),
        material=mat,
        folder="ExpoHall/Structure"
    )
    return floor


def build_walls(mat):
    """Build 4 hall walls."""
    log("Building walls...")
    half_l = HALL_LENGTH / 2.0
    half_w = HALL_WIDTH / 2.0
    wall_h = HALL_HEIGHT / 2.0

    walls = []

    # North wall (back, +Y)
    walls.append(spawn_static_mesh_cube(
        "Wall_North",
        unreal.Vector(0, half_w, wall_h),
        unreal.Vector(HALL_LENGTH / 100.0, WALL_THICK / 100.0, HALL_HEIGHT / 100.0),
        material=mat, folder="ExpoHall/Structure"
    ))

    # South wall (front/entrance, -Y)
    walls.append(spawn_static_mesh_cube(
        "Wall_South",
        unreal.Vector(0, -half_w, wall_h),
        unreal.Vector(HALL_LENGTH / 100.0, WALL_THICK / 100.0, HALL_HEIGHT / 100.0),
        material=mat, folder="ExpoHall/Structure"
    ))

    # East wall (+X)
    walls.append(spawn_static_mesh_cube(
        "Wall_East",
        unreal.Vector(half_l, 0, wall_h),
        unreal.Vector(WALL_THICK / 100.0, HALL_WIDTH / 100.0, HALL_HEIGHT / 100.0),
        material=mat, folder="ExpoHall/Structure"
    ))

    # West wall (-X)
    walls.append(spawn_static_mesh_cube(
        "Wall_West",
        unreal.Vector(-half_l, 0, wall_h),
        unreal.Vector(WALL_THICK / 100.0, HALL_WIDTH / 100.0, HALL_HEIGHT / 100.0),
        material=mat, folder="ExpoHall/Structure"
    ))

    return walls


def build_ceiling(mat):
    """Build the ceiling."""
    log("Building ceiling...")
    ceiling = spawn_static_mesh_cube(
        "Hall_Ceiling",
        unreal.Vector(0, 0, CEILING_H),
        unreal.Vector(HALL_LENGTH / 100.0, HALL_WIDTH / 100.0, 10.0 / 100.0),
        material=mat, folder="ExpoHall/Structure"
    )
    return ceiling


# ============================================================================
# Lighting
# ============================================================================

def build_track_lighting():
    """Create rows of track/spot lights on the ceiling pointing down."""
    log("Building track lighting (48 lights)...")

    lights = []
    rows_x = 8    # lights across the length
    rows_y = 6    # lights across the width

    x_start = -HALL_LENGTH / 2.0 + 500.0
    x_end   =  HALL_LENGTH / 2.0 - 500.0
    y_start = -HALL_WIDTH  / 2.0 + 400.0
    y_end   =  HALL_WIDTH  / 2.0 - 400.0

    x_step = (x_end - x_start) / (rows_x - 1)
    y_step = (y_end - y_start) / (rows_y - 1)

    warm_white = unreal.Color(255, 244, 229, 255)

    count = 0
    for xi in range(rows_x):
        for yi in range(rows_y):
            x = x_start + xi * x_step
            y = y_start + yi * y_step
            z = CEILING_H - 30.0  # just below ceiling

            # Alternate spot and rect lights for visual variety
            if (xi + yi) % 2 == 0:
                light = spawn_spot_light(
                    f"TrackLight_Spot_{count}",
                    unreal.Vector(x, y, z),
                    unreal.Rotator(-90, 0, 0),  # pointing straight down
                    intensity=60000.0,
                    inner_angle=18.0,
                    outer_angle=32.0,
                    attenuation=1200.0,
                    color=warm_white,
                    folder="ExpoHall/Lighting/Track"
                )
            else:
                light = spawn_rect_light(
                    f"TrackLight_Rect_{count}",
                    unreal.Vector(x, y, z),
                    unreal.Rotator(-90, 0, 0),
                    width=120.0, height=60.0,
                    intensity=40000.0,
                    color=warm_white,
                    folder="ExpoHall/Lighting/Track"
                )

            if light:
                lights.append(light)
            count += 1

    log(f"  Created {count} track lights")
    return lights


def build_ambient_lighting():
    """Add skylight and directional light for Lumen GI base."""
    log("Building ambient lighting...")

    # Skylight — provides ambient fill via Lumen
    skylight = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.SkyLight, unreal.Vector(0, 0, 500)
    )
    if skylight:
        skylight.set_actor_label("Hall_SkyLight")
        skylight.set_folder_path("ExpoHall/Lighting")
        sky_comp = skylight.sky_light_component
        sky_comp.set_editor_property("intensity", 1.5)
        sky_comp.set_editor_property("source_type",
                                      unreal.SkyLightSourceType.SLS_SPECIFIED_CUBEMAP)
        # Use lower hemisphere color for indoor look
        sky_comp.set_editor_property("lower_hemisphere_is_solid_color", True)
        sky_comp.set_editor_property("lower_hemisphere_color",
                                      unreal.LinearColor(0.01, 0.01, 0.02, 1.0))

    # Directional light — subtle fill simulating ambient bounce
    dir_light = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.DirectionalLight, unreal.Vector(0, 0, 500)
    )
    if dir_light:
        dir_light.set_actor_label("Hall_DirectionalFill")
        dir_light.set_actor_rotation(unreal.Rotator(-45, 30, 0), False)
        dir_light.set_folder_path("ExpoHall/Lighting")
        dcomp = dir_light.light_component
        dcomp.set_editor_property("intensity", 2.0)
        dcomp.set_editor_property("light_color", unreal.Color(200, 210, 240, 255))
        dcomp.set_editor_property("cast_shadows", False)  # fill only
        dcomp.set_editor_property("use_temperature", True)
        dcomp.set_editor_property("temperature", 6500.0)

    log("  Skylight + directional fill created")


# ============================================================================
# Broker booths
# ============================================================================

def build_booth(booth_cfg, accent_mat, back_mat, stripe_mat, floor_mat):
    """Build a single broker booth structure."""
    bid = booth_cfg["id"]
    bname = booth_cfg["name"]
    pos = booth_cfg["pos"]
    sx = booth_cfg["size_x"]
    sy = booth_cfg["size_y"]
    wh = booth_cfg["wall_height"]
    color = booth_cfg["color"]

    folder = f"ExpoHall/Booths/{bname}"
    log(f"Building booth: {bname} at ({pos.x}, {pos.y})")

    # --- Booth floor (raised platform, 10cm) ---
    spawn_static_mesh_cube(
        f"Booth_Floor_{bid}",
        unreal.Vector(pos.x, pos.y, 5.0),
        unreal.Vector(sx / 100.0, sy / 100.0, 10.0 / 100.0),
        material=floor_mat, folder=folder
    )

    # --- Back wall (facing visitor) ---
    spawn_static_mesh_cube(
        f"Booth_BackWall_{bid}",
        unreal.Vector(pos.x, pos.y - sy / 2.0 + 5.0, wh / 2.0 + 10.0),
        unreal.Vector(sx / 100.0, 8.0 / 100.0, wh / 100.0),
        material=back_mat, folder=folder
    )

    # --- Left side wall ---
    spawn_static_mesh_cube(
        f"Booth_LeftWall_{bid}",
        unreal.Vector(pos.x - sx / 2.0 + 5.0, pos.y, wh / 2.0 + 10.0),
        unreal.Vector(8.0 / 100.0, sy / 100.0, wh / 100.0),
        material=back_mat, folder=folder
    )

    # --- Right side wall ---
    spawn_static_mesh_cube(
        f"Booth_RightWall_{bid}",
        unreal.Vector(pos.x + sx / 2.0 - 5.0, pos.y, wh / 2.0 + 10.0),
        unreal.Vector(8.0 / 100.0, sy / 100.0, wh / 100.0),
        material=back_mat, folder=folder
    )

    # --- Accent stripe along top of back wall ---
    spawn_static_mesh_cube(
        f"Booth_Stripe_{bid}",
        unreal.Vector(pos.x, pos.y - sy / 2.0 + 5.0, wh + 15.0),
        unreal.Vector(sx / 100.0, 10.0 / 100.0, 8.0 / 100.0),
        material=stripe_mat, folder=folder
    )

    # --- Accent stripe along floor edge (front) ---
    spawn_static_mesh_cube(
        f"Booth_FloorStripe_{bid}",
        unreal.Vector(pos.x, pos.y + sy / 2.0 - 3.0, 3.0),
        unreal.Vector(sx / 100.0, 4.0 / 100.0, 6.0 / 100.0),
        material=stripe_mat, folder=folder
    )

    # --- Counter / reception desk ---
    spawn_static_mesh_cube(
        f"Booth_Counter_{bid}",
        unreal.Vector(pos.x, pos.y + sy / 4.0, 55.0),
        unreal.Vector((sx * 0.6) / 100.0, 40.0 / 100.0, 100.0 / 100.0),
        material=accent_mat, folder=folder
    )

    # --- Counter top (lighter) ---
    spawn_static_mesh_cube(
        f"Booth_CounterTop_{bid}",
        unreal.Vector(pos.x, pos.y + sy / 4.0, 107.0),
        unreal.Vector((sx * 0.62) / 100.0, 44.0 / 100.0, 4.0 / 100.0),
        material=floor_mat, folder=folder  # marble counter top
    )

    # --- Broker name text ---
    spawn_text_render(
        f"Booth_Name_{bid}",
        unreal.Vector(pos.x, pos.y - sy / 2.0 + 12.0, wh * 0.7 + 10.0),
        unreal.Rotator(0, 0, 0),
        bname,
        size=48.0,
        color=unreal.LinearColor(1, 1, 1, 1),
        folder=folder
    )

    # --- Tier badge text ---
    spawn_text_render(
        f"Booth_Tier_{bid}",
        unreal.Vector(pos.x, pos.y - sy / 2.0 + 12.0, wh * 0.7 - 30.0),
        unreal.Rotator(0, 0, 0),
        booth_cfg["tier"],
        size=20.0,
        color=color,
        folder=folder
    )

    # --- Booth spot lights (3 downlights in booth colour) ---
    for i in range(3):
        offset_x = (i - 1) * (sx * 0.35)
        spawn_spot_light(
            f"Booth_Spot_{bid}_{i}",
            unreal.Vector(pos.x + offset_x, pos.y, wh + 50.0),
            unreal.Rotator(-85, 0, 0),
            intensity=40000.0,
            inner_angle=20.0, outer_angle=35.0,
            attenuation=800.0,
            color=unreal.Color(
                int(color.r * 255),
                int(color.g * 255),
                int(color.b * 255),
                255
            ),
            folder=f"{folder}/Lighting"
        )

    # --- Proximity trigger volume ---
    spawn_trigger_box(
        f"Trigger_Proximity_{bid}",
        unreal.Vector(pos.x, pos.y + sy / 2.0 + 150.0, 100.0),
        unreal.Vector(sx * 0.8, 300.0, 200.0),
        folder=f"{folder}/Triggers"
    )

    log(f"  Booth {bname} complete")


# ============================================================================
# Seminar stage
# ============================================================================

def build_seminar_stage(stage_mat, carpet_mat):
    """Build the seminar stage at the back of the hall (+Y side)."""
    log("Building seminar stage...")
    folder = "ExpoHall/SeminarStage"

    # Stage platform (raised 40cm)
    spawn_static_mesh_cube(
        "Stage_Platform",
        unreal.Vector(0, 1500.0, 20.0),
        unreal.Vector(1200.0 / 100.0, 600.0 / 100.0, 40.0 / 100.0),
        material=stage_mat, folder=folder
    )

    # Stage back wall
    spawn_static_mesh_cube(
        "Stage_BackWall",
        unreal.Vector(0, 1800.0, 250.0),
        unreal.Vector(1300.0 / 100.0, 10.0 / 100.0, 400.0 / 100.0),
        material=None, folder=folder  # uses default
    )

    # Podium
    spawn_static_mesh_cube(
        "Stage_Podium",
        unreal.Vector(-200.0, 1450.0, 85.0),
        unreal.Vector(60.0 / 100.0, 50.0 / 100.0, 130.0 / 100.0),
        material=stage_mat, folder=folder
    )

    # "FOREX EXPO DUBAI" signage on stage back
    spawn_text_render(
        "Stage_Title",
        unreal.Vector(0, 1795.0, 350.0),
        unreal.Rotator(0, 0, 0),
        "FOREX EXPO DUBAI",
        size=64.0,
        color=unreal.LinearColor(0.9, 0.66, 0.33, 1.0),  # gold
        folder=folder
    )

    spawn_text_render(
        "Stage_Subtitle",
        unreal.Vector(0, 1795.0, 280.0),
        unreal.Rotator(0, 0, 0),
        "SEMINAR STAGE",
        size=28.0,
        color=unreal.LinearColor(0.7, 0.7, 0.7, 1.0),
        folder=folder
    )

    # Stage lighting — 5 warm spots
    for i in range(5):
        x_off = (i - 2) * 250.0
        spawn_spot_light(
            f"Stage_Spot_{i}",
            unreal.Vector(x_off, 1500.0, CEILING_H - 30.0),
            unreal.Rotator(-75, 0, 0),
            intensity=80000.0,
            inner_angle=15.0, outer_angle=30.0,
            attenuation=1500.0,
            color=unreal.Color(255, 240, 210, 255),
            folder=f"{folder}/Lighting"
        )

    # Carpet runner from centre aisle to stage
    spawn_static_mesh_cube(
        "Carpet_StageRunner",
        unreal.Vector(0, 800.0, 1.5),
        unreal.Vector(200.0 / 100.0, 1400.0 / 100.0, 3.0 / 100.0),
        material=carpet_mat, folder=folder
    )

    # Seminar zone trigger
    spawn_trigger_box(
        "Trigger_Zone_Seminar",
        unreal.Vector(0, 1300.0, 100.0),
        unreal.Vector(800.0, 600.0, 200.0),
        folder=f"{folder}/Triggers"
    )

    log("  Seminar stage complete")


# ============================================================================
# Entrance arch
# ============================================================================

def build_entrance(stripe_mat_red):
    """Build entrance arch at the south side (-Y)."""
    log("Building entrance arch...")
    folder = "ExpoHall/Entrance"

    south_y = -HALL_WIDTH / 2.0 + 50.0

    # Left pillar
    spawn_static_mesh_cube(
        "Entrance_PillarL",
        unreal.Vector(-200.0, south_y, HALL_HEIGHT / 2.0),
        unreal.Vector(40.0 / 100.0, 40.0 / 100.0, HALL_HEIGHT / 100.0),
        material=None, folder=folder
    )

    # Right pillar
    spawn_static_mesh_cube(
        "Entrance_PillarR",
        unreal.Vector(200.0, south_y, HALL_HEIGHT / 2.0),
        unreal.Vector(40.0 / 100.0, 40.0 / 100.0, HALL_HEIGHT / 100.0),
        material=None, folder=folder
    )

    # Top beam
    spawn_static_mesh_cube(
        "Entrance_Beam",
        unreal.Vector(0, south_y, HALL_HEIGHT - 20.0),
        unreal.Vector(500.0 / 100.0, 40.0 / 100.0, 40.0 / 100.0),
        material=None, folder=folder
    )

    # Entrance accent stripe
    spawn_static_mesh_cube(
        "Entrance_Stripe",
        unreal.Vector(0, south_y, HALL_HEIGHT - 50.0),
        unreal.Vector(500.0 / 100.0, 6.0 / 100.0, 6.0 / 100.0),
        material=stripe_mat_red, folder=folder
    )

    # Entrance title
    spawn_text_render(
        "Entrance_Title",
        unreal.Vector(0, south_y + 20.0, HALL_HEIGHT - 80.0),
        unreal.Rotator(0, 0, 0),
        "FOREX EXPO DUBAI 2026",
        size=56.0,
        color=unreal.LinearColor(0.9, 0.66, 0.33, 1.0),
        folder=folder
    )

    # Welcome text below
    spawn_text_render(
        "Entrance_Welcome",
        unreal.Vector(0, south_y + 20.0, HALL_HEIGHT - 150.0),
        unreal.Rotator(0, 0, 0),
        "Welcome to the Virtual Exhibition Hall",
        size=24.0,
        color=unreal.LinearColor(0.7, 0.7, 0.7, 1.0),
        folder=folder
    )

    # Entrance zone trigger
    spawn_trigger_box(
        "Trigger_Zone_Entrance",
        unreal.Vector(0, -HALL_WIDTH / 2.0 + 300.0, 100.0),
        unreal.Vector(500.0, 300.0, 200.0),
        folder=f"{folder}/Triggers"
    )

    log("  Entrance complete")


# ============================================================================
# Zone triggers
# ============================================================================

def build_zone_triggers():
    """Create zone trigger volumes for HUD zone labels."""
    log("Building zone triggers...")
    folder = "ExpoHall/Triggers"

    # Main hall centre
    spawn_trigger_box(
        "Trigger_Zone_MainHall",
        unreal.Vector(0, 0, 100.0),
        unreal.Vector(2000.0, 800.0, 200.0),
        folder=folder
    )

    # Sponsor booths area
    spawn_trigger_box(
        "Trigger_Zone_SponsorBooths",
        unreal.Vector(0, -1200.0, 100.0),
        unreal.Vector(3500.0, 600.0, 200.0),
        folder=folder
    )

    # Business lounge area (east side)
    spawn_trigger_box(
        "Trigger_Zone_BusinessLounge",
        unreal.Vector(3000.0, 500.0, 100.0),
        unreal.Vector(800.0, 800.0, 200.0),
        folder=folder
    )

    log("  Zone triggers created")


# ============================================================================
# Player start
# ============================================================================

def place_player_start():
    """Place the player start at the entrance."""
    log("Placing player start...")

    player_start = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.PlayerStart,
        unreal.Vector(0, -HALL_WIDTH / 2.0 + 250.0, 100.0)
    )
    if player_start:
        player_start.set_actor_label("PlayerStart_Entrance")
        player_start.set_actor_rotation(unreal.Rotator(0, 90, 0), False)  # facing into hall
        player_start.set_folder_path("ExpoHall")

    log("  Player start placed at entrance")


# ============================================================================
# Aisle decorations
# ============================================================================

def build_centre_aisle(carpet_mat, stripe_red_mat):
    """Build centre aisle carpet runner and column accents."""
    log("Building centre aisle...")
    folder = "ExpoHall/Aisles"

    # Main carpet runner down the centre
    spawn_static_mesh_cube(
        "Carpet_MainRunner",
        unreal.Vector(0, -200.0, 1.5),
        unreal.Vector(250.0 / 100.0, 3000.0 / 100.0, 3.0 / 100.0),
        material=carpet_mat, folder=folder
    )

    # Decorative columns along the aisle (6 per side)
    for i in range(6):
        y_pos = -1200.0 + i * 500.0
        for side in [-1, 1]:
            x_pos = side * 350.0
            spawn_static_mesh_cube(
                f"Column_{i}_{('L' if side < 0 else 'R')}",
                unreal.Vector(x_pos, y_pos, 200.0),
                unreal.Vector(20.0 / 100.0, 20.0 / 100.0, 400.0 / 100.0),
                material=None, folder=folder
            )
            # Column accent light
            spawn_point_light(
                f"ColumnLight_{i}_{('L' if side < 0 else 'R')}",
                unreal.Vector(x_pos, y_pos, 420.0),
                intensity=8000.0,
                color=unreal.Color(255, 200, 150, 255),
                attenuation=400.0,
                folder=f"{folder}/Lighting"
            )

    log("  Centre aisle complete")


# ============================================================================
# Post-processing volume
# ============================================================================

def setup_post_process():
    """Add a post-process volume for photorealistic tuning."""
    log("Setting up post-process volume...")

    ppv = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.PostProcessVolume, unreal.Vector(0, 0, 300)
    )
    if not ppv:
        log("  WARNING: Could not create PostProcessVolume")
        return

    ppv.set_actor_label("Hall_PostProcess")
    ppv.set_folder_path("ExpoHall/Lighting")
    ppv.set_editor_property("unbound", True)  # affects entire level

    settings = ppv.settings

    # Exposure
    settings.set_editor_property("auto_exposure_method",
                                  unreal.AutoExposureMethod.AEM_MANUAL)
    settings.set_editor_property("auto_exposure_bias", 0.5)

    # Bloom
    settings.set_editor_property("bloom_intensity", 0.3)
    settings.set_editor_property("bloom_threshold", 1.0)

    # Ambient Occlusion
    settings.set_editor_property("ambient_occlusion_intensity", 0.6)
    settings.set_editor_property("ambient_occlusion_radius", 150.0)

    # Vignette
    settings.set_editor_property("vignette_intensity", 0.25)

    # Color grading
    settings.set_editor_property("color_saturation",
                                  unreal.Vector4(1.05, 1.05, 1.05, 1.0))
    settings.set_editor_property("color_contrast",
                                  unreal.Vector4(1.08, 1.08, 1.08, 1.0))

    ppv.settings = settings

    log("  Post-process volume created")


# ============================================================================
# Lumen settings verification
# ============================================================================

def verify_lumen_settings():
    """Log Lumen/rendering info — these should already be set in DefaultEngine.ini."""
    log("Lumen GI & Reflections should be enabled in Project Settings:")
    log("  r.DynamicGlobalIlluminationMethod = 1 (Lumen)")
    log("  r.ReflectionMethod = 1 (Lumen)")
    log("  r.Shadow.Virtual.Enable = 1")
    log("  r.Nanite.Enabled = 1")
    log("  Check: Edit → Project Settings → Engine → Rendering")


# ============================================================================
# MAIN
# ============================================================================

def main():
    log("=" * 60)
    log("  FOREX EXPO DUBAI — Building Exhibition Hall")
    log("=" * 60)

    # Ensure content directory
    ensure_package_dir()

    # --- Create Materials ---
    log("\n--- PHASE 1: Materials ---")
    mat_marble = create_marble_floor_material()
    mat_wall = create_wall_material()
    mat_ceiling = create_ceiling_material()
    mat_carpet = create_carpet_material()
    mat_stage = create_stage_material()

    booth_materials = {}
    for b in BOOTHS:
        bid = b["id"]
        booth_materials[bid] = {
            "accent": create_booth_material(bid, b["color"]),
            "back": create_booth_back_material(bid, b["color"]),
            "stripe": create_accent_stripe_material(bid, b["color"]),
        }

    # --- Build Hall Structure ---
    log("\n--- PHASE 2: Hall Structure ---")
    build_floor(mat_marble)
    build_walls(mat_wall)
    build_ceiling(mat_ceiling)

    # --- Lighting ---
    log("\n--- PHASE 3: Lighting ---")
    build_track_lighting()
    build_ambient_lighting()
    setup_post_process()

    # --- Broker Booths ---
    log("\n--- PHASE 4: Broker Booths ---")
    for b in BOOTHS:
        bid = b["id"]
        build_booth(
            b,
            accent_mat=booth_materials[bid]["accent"],
            back_mat=booth_materials[bid]["back"],
            stripe_mat=booth_materials[bid]["stripe"],
            floor_mat=mat_marble,
        )

    # --- Seminar Stage ---
    log("\n--- PHASE 5: Seminar Stage ---")
    build_seminar_stage(mat_stage, mat_carpet)

    # --- Entrance ---
    log("\n--- PHASE 6: Entrance ---")
    # Reuse pepperstone's red stripe for entrance accent
    build_entrance(booth_materials["pepperstone"]["stripe"])

    # --- Aisles & Decoration ---
    log("\n--- PHASE 7: Aisles & Decoration ---")
    build_centre_aisle(mat_carpet, booth_materials["pepperstone"]["stripe"])

    # --- Zone Triggers ---
    log("\n--- PHASE 8: Zone Triggers ---")
    build_zone_triggers()

    # --- Player Start ---
    log("\n--- PHASE 9: Player Start ---")
    place_player_start()

    # --- Verify Lumen ---
    log("\n--- PHASE 10: Lumen Verification ---")
    verify_lumen_settings()

    # --- Summary ---
    log("\n" + "=" * 60)
    log("  BUILD COMPLETE")
    log("=" * 60)
    log(f"  Hall:    {HALL_LENGTH/100:.0f}m × {HALL_WIDTH/100:.0f}m × {HALL_HEIGHT/100:.0f}m")
    log(f"  Floor:   Polished marble (roughness 0.08)")
    log(f"  Walls:   Dark charcoal panels")
    log(f"  Ceiling: Matte black with 48 track lights")
    log(f"  Booths:  {len(BOOTHS)} broker booths built")
    for b in BOOTHS:
        log(f"    - {b['name']} ({b['tier']}) at ({b['pos'].x/100:.0f}m, {b['pos'].y/100:.0f}m)")
    log(f"  Stage:   Seminar stage with podium + 5 spots")
    log(f"  Entrance: Arch with FOREX EXPO DUBAI signage")
    log(f"  Lighting: 48 track + skylight + directional fill + PPV")
    log(f"  Triggers: 3 booth proximity + 4 zone triggers")
    log(f"  Materials saved to: {CONTENT_DIR}")
    log("")
    log("  Next steps:")
    log("  1. Verify Lumen is enabled in Project Settings → Rendering")
    log("  2. Add Pixel Streaming Input component to player Blueprint")
    log("  3. Wire trigger overlaps to send brokerProximity/zone events")
    log("  4. Package Shipping build and run with launch-linux.sh")
    log("=" * 60)


# Run
main()
