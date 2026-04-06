"""
Forex Expo Dubai -- Step 8: Prospectus-Spec Booth Rebuild
==========================================================
Run via: Tools -> Execute Python Script

Rebuilds ALL broker booths from scratch to match the official Forex Expo Dubai
prospectus specifications. Creates fully furnished booths with:

  TITANIUM ($75,000) - Pepperstone
    8m W x 6m D x 4m H = 48sqm, Premium Built Fully Customizable
    2 counters, 4 bar stools, 1 round table, 4 sofas, 50" TV
    2 brochure stands, 2 roll-ups, ceiling banner, award trophy

  DIAMOND ($45,000) - Capital.com
    6m W x 5m D x 3.5m H = 30sqm, Premium Built Fully Customizable
    2 counters, 4 bar stools, 1 round table, 3 sofas, 50" TV
    2 brochure stands, 2 roll-ups, ceiling banner, award trophy

  GOLD ($20,000) - Base Markets
    4m W x 3m D x 2.5m H = 12sqm, Standard Shell Scheme
    1 counter, 2 bar stools, 1 round table, 0 sofas (2 chairs), 42" TV
    1 brochure stand, 1 roll-up

Plus branding opportunities: Networking Lounge, Registration Desk,
Welcome Arch, Photo Wall, and Water Kiosks.

All distances in centimetres (UE5 convention).
"""

import unreal
import math

# ============================================================================
# Logging
# ============================================================================

P = "[ForexExpo:Prospectus]"


def log(msg):
    unreal.log(f"{P} {msg}")


# ============================================================================
# UE5 API shortcuts
# ============================================================================

mel = unreal.MaterialEditingLibrary
eal = unreal.EditorAssetLibrary
ell = unreal.EditorLevelLibrary
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

MAT_DIR = "/Game/ForexExpo/Materials/"

# ============================================================================
# Booth definitions -- Prospectus spec
# ============================================================================

BOOTHS = [
    {
        "id": "pepperstone",
        "name": "Pepperstone",
        "tier": "TITANIUM",
        "price": 75000,
        "color": (0.91, 0.10, 0.17),
        "pos": (-2200, -1500),
        "w": 800,
        "d": 600,
        "h": 400,
        "counters": 2,
        "barstools": 4,
        "roundtables": 1,
        "sofas": 4,
        "chairs": 0,
        "tvsize": 50,
        "brochure_stands": 2,
        "rollups": 2,
        "ceiling_banner": True,
        "trophy": True,
    },
    {
        "id": "capital",
        "name": "Capital.com",
        "tier": "DIAMOND",
        "price": 45000,
        "color": (0.0, 0.83, 0.67),
        "pos": (0, -1500),
        "w": 600,
        "d": 500,
        "h": 350,
        "counters": 2,
        "barstools": 4,
        "roundtables": 1,
        "sofas": 3,
        "chairs": 0,
        "tvsize": 50,
        "brochure_stands": 2,
        "rollups": 2,
        "ceiling_banner": True,
        "trophy": True,
    },
    {
        "id": "basemarkets",
        "name": "Base Markets",
        "tier": "GOLD",
        "price": 20000,
        "color": (1.0, 0.84, 0.0),
        "pos": (2200, -1500),
        "w": 400,
        "d": 300,
        "h": 250,
        "counters": 1,
        "barstools": 2,
        "roundtables": 1,
        "sofas": 0,
        "chairs": 2,
        "tvsize": 42,
        "brochure_stands": 1,
        "rollups": 1,
        "ceiling_banner": False,
        "trophy": False,
    },
]

# ============================================================================
# Water kiosk / branding positions
# ============================================================================

WATER_KIOSK_POSITIONS = [
    (-1500, 0),
    (1500, 0),
    (-1500, 800),
    (1500, 800),
]

# ============================================================================
# Counters for summary
# ============================================================================

STATS = {
    "booths_built": 0,
    "furniture_placed": 0,
    "materials_created": 0,
    "lights_placed": 0,
    "branding_built": 0,
    "actors_removed": 0,
}


# ============================================================================
# Utility helpers (same patterns as build_expo_hall.py / 07_final_dramatic.py)
# ============================================================================

def ensure_dir(path):
    """Create content browser directory if it does not exist."""
    if not eal.does_directory_exist(path):
        eal.make_directory(path)


def make_mat(name):
    """Delete-and-recreate a material asset by name under MAT_DIR."""
    path = MAT_DIR + name
    if eal.does_asset_exist(path):
        eal.delete_asset(path)
    f = unreal.MaterialFactoryNew()
    mat = asset_tools.create_asset(name, MAT_DIR[:-1], unreal.Material, f)
    if mat:
        STATS["materials_created"] += 1
    return mat


def apply_mat(actor, mat):
    """Apply material to slot 0 of any static mesh actor."""
    if not actor or not mat:
        return
    if hasattr(actor, "static_mesh_component") and actor.static_mesh_component:
        actor.static_mesh_component.set_material(0, mat)
    else:
        comps = actor.get_components_by_class(unreal.StaticMeshComponent)
        if comps:
            comps[0].set_material(0, mat)


def lc(r, g, b, a=1.0):
    """Shorthand for unreal.LinearColor."""
    return unreal.LinearColor(r, g, b, a)


def vec(x, y, z):
    """Shorthand for unreal.Vector."""
    return unreal.Vector(x, y, z)


def rot(pitch, yaw, roll):
    """Shorthand for unreal.Rotator."""
    return unreal.Rotator(pitch, yaw, roll)


def color_from_tuple(t):
    """Convert (r,g,b) float tuple to unreal.Color (0-255)."""
    return unreal.Color(
        int(min(t[0], 1.0) * 255),
        int(min(t[1], 1.0) * 255),
        int(min(t[2], 1.0) * 255),
        255,
    )


def spawn_cube(name, location, scale, material=None, folder=""):
    """Spawn a cube static mesh actor at given location/scale."""
    cube_mesh = eal.load_asset("/Engine/BasicShapes/Cube")
    if not cube_mesh:
        log("WARNING: Could not load /Engine/BasicShapes/Cube")
        return None
    actor = ell.spawn_actor_from_object(cube_mesh, location)
    if not actor:
        log(f"WARNING: Could not spawn cube {name}")
        return None
    actor.set_actor_label(name)
    actor.set_actor_scale3d(scale)
    if folder:
        actor.set_folder_path(folder)
    if material:
        apply_mat(actor, material)
    STATS["furniture_placed"] += 1
    return actor


def spawn_cylinder(name, location, scale, material=None, folder=""):
    """Spawn a cylinder static mesh actor at given location/scale."""
    cyl_mesh = eal.load_asset("/Engine/BasicShapes/Cylinder")
    if not cyl_mesh:
        log("WARNING: Could not load /Engine/BasicShapes/Cylinder")
        return None
    actor = ell.spawn_actor_from_object(cyl_mesh, location)
    if not actor:
        log(f"WARNING: Could not spawn cylinder {name}")
        return None
    actor.set_actor_label(name)
    actor.set_actor_scale3d(scale)
    if folder:
        actor.set_folder_path(folder)
    if material:
        apply_mat(actor, material)
    STATS["furniture_placed"] += 1
    return actor


def spawn_sphere(name, location, scale, material=None, folder=""):
    """Spawn a sphere static mesh actor at given location/scale."""
    sph_mesh = eal.load_asset("/Engine/BasicShapes/Sphere")
    if not sph_mesh:
        log("WARNING: Could not load /Engine/BasicShapes/Sphere")
        return None
    actor = ell.spawn_actor_from_object(sph_mesh, location)
    if not actor:
        log(f"WARNING: Could not spawn sphere {name}")
        return None
    actor.set_actor_label(name)
    actor.set_actor_scale3d(scale)
    if folder:
        actor.set_folder_path(folder)
    if material:
        apply_mat(actor, material)
    STATS["furniture_placed"] += 1
    return actor


def spawn_spot_light(name, location, rotation, intensity=80000.0,
                     inner_angle=22.0, outer_angle=35.0,
                     attenuation=2000.0, color=None, folder=""):
    """Spawn a spot light."""
    actor = ell.spawn_actor_from_class(unreal.SpotLight, location)
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
    if color:
        light.set_editor_property("light_color", color)
    STATS["lights_placed"] += 1
    return actor


def spawn_point_light(name, location, intensity=50000.0, color=None,
                      attenuation=1500.0, folder=""):
    """Spawn a point light."""
    actor = ell.spawn_actor_from_class(unreal.PointLight, location)
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
    STATS["lights_placed"] += 1
    return actor


def spawn_text(name, location, rotation, text, world_size=60.0,
               color=None, material=None, folder=""):
    """Spawn a TextRenderActor with given text."""
    actor = ell.spawn_actor_from_class(unreal.TextRenderActor, location)
    if not actor:
        return None
    actor.set_actor_label(name)
    actor.set_actor_rotation(rotation, False)
    if folder:
        actor.set_folder_path(folder)
    tc = actor.text_render
    tc.set_editor_property("text", text)
    tc.set_editor_property("world_size", world_size)
    tc.set_editor_property("horizontal_alignment",
                           unreal.HorizTextAligment.EHTA_CENTER)
    tc.set_editor_property("vertical_alignment",
                           unreal.VerticalTextAligment.EVRTA_TEXT_CENTER)
    if color:
        tc.set_editor_property("text_render_color", color)
    if material:
        tc.set_material(0, material)
    return actor


# ============================================================================
# Material creation
# ============================================================================

def create_wall_material(booth_id, color_tuple):
    """Dark wall material: broker colour * 0.12, roughness 0.7."""
    name = f"M_BoothWall_{booth_id}"
    mat = make_mat(name)
    if not mat:
        return None
    r, g, b = color_tuple
    base = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 0)
    base.constant = lc(r * 0.12, g * 0.12, b * 0.12)
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    rough = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 100)
    rough.r = 0.7
    mel.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

    mel.recompile_material(mat)
    return mat


def create_accent_material(booth_id, color_tuple):
    """Accent material: full broker colour, roughness 0.3, specular 0.6."""
    name = f"M_BoothAccent_{booth_id}"
    mat = make_mat(name)
    if not mat:
        return None
    r, g, b = color_tuple
    base = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 0)
    base.constant = lc(r, g, b)
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    rough = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 100)
    rough.r = 0.3
    mel.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

    spec = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 200)
    spec.r = 0.6
    mel.connect_material_property(spec, "", unreal.MaterialProperty.MP_SPECULAR)

    mel.recompile_material(mat)
    return mat


def create_emissive_material(booth_id, color_tuple, multiplier=8.0):
    """Emissive material: broker colour with glow multiplier."""
    name = f"M_BoothEmissive_{booth_id}"
    mat = make_mat(name)
    if not mat:
        return None
    r, g, b = color_tuple
    base = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, -100)
    base.constant = lc(min(r * 1.2, 1.0), min(g * 1.2, 1.0), min(b * 1.2, 1.0))
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    em = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 100)
    em.constant = lc(r * multiplier, g * multiplier, b * multiplier)
    mel.connect_material_property(em, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)

    rough = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 200)
    rough.r = 0.1
    mel.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

    mel.recompile_material(mat)
    return mat


def create_tv_screen_material():
    """Emissive blue-white TV screen material."""
    name = "M_TVScreen"
    mat = make_mat(name)
    if not mat:
        return None
    mat.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)

    base = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 0)
    base.constant = lc(0.7, 0.85, 1.0)
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    em = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 150)
    em.constant = lc(0.7 * 6.0, 0.85 * 6.0, 1.0 * 6.0)
    mel.connect_material_property(em, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)

    mel.recompile_material(mat)
    return mat


def create_trophy_material():
    """Gold metallic trophy material: #d4a853, metallic 0.9, roughness 0.2."""
    name = "M_Trophy"
    mat = make_mat(name)
    if not mat:
        return None
    # #d4a853 -> (212/255, 168/255, 83/255) = (0.831, 0.659, 0.325)
    base = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 0)
    base.constant = lc(0.831, 0.659, 0.325)
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    metallic = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 100)
    metallic.r = 0.9
    mel.connect_material_property(metallic, "", unreal.MaterialProperty.MP_METALLIC)

    rough = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 200)
    rough.r = 0.2
    mel.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

    mel.recompile_material(mat)
    return mat


def get_marble_material():
    """Load or reference the dark navy floor material for marble platforms."""
    path = "/Game/ForexExpo/Materials/M_DarkNavyFloor"
    if eal.does_asset_exist(path):
        mat = eal.load_asset(path)
        if mat:
            log("  Using existing M_DarkNavyFloor for marble surfaces")
            return mat
    # Fallback: create a simple dark marble-like material
    log("  M_DarkNavyFloor not found, creating M_Marble fallback")
    name = "M_Marble"
    mat = make_mat(name)
    if not mat:
        return None
    base = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 0)
    base.constant = lc(0.06, 0.08, 0.14)
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    rough = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 100)
    rough.r = 0.08
    mel.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

    spec = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 200)
    spec.r = 0.85
    mel.connect_material_property(spec, "", unreal.MaterialProperty.MP_SPECULAR)

    mel.recompile_material(mat)
    return mat


def create_simple_color_mat(name, r, g, b, roughness=0.5):
    """Simple solid-colour material."""
    mat = make_mat(name)
    if not mat:
        return None
    base = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 0)
    base.constant = lc(r, g, b)
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    rough = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 100)
    rough.r = roughness
    mel.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

    mel.recompile_material(mat)
    return mat


def create_generic_emissive_mat(name, r, g, b, multiplier=8.0):
    """Generic emissive material for branding elements."""
    mat = make_mat(name)
    if not mat:
        return None
    base = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, -100)
    base.constant = lc(min(r * 1.2, 1.0), min(g * 1.2, 1.0), min(b * 1.2, 1.0))
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    em = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 100)
    em.constant = lc(r * multiplier, g * multiplier, b * multiplier)
    mel.connect_material_property(em, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)

    rough = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 200)
    rough.r = 0.1
    mel.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

    mel.recompile_material(mat)
    return mat


# ============================================================================
# PHASE 1: Remove existing booth actors
# ============================================================================

def remove_existing_booths():
    """Remove all actors with 'Booth_' in their label to start fresh."""
    log("Removing existing booth actors...")
    removed = 0
    # Collect first to avoid mutating while iterating
    to_remove = []
    for actor in ell.get_all_level_actors():
        label = actor.get_actor_label()
        if "Booth_" in label:
            to_remove.append(actor)
    for actor in to_remove:
        label = actor.get_actor_label()
        ell.destroy_actor(actor)
        removed += 1
    STATS["actors_removed"] = removed
    log(f"  Removed {removed} existing booth actors")
    return removed


# ============================================================================
# PHASE 2: Build booth structures and furniture
# ============================================================================

def build_booth_walls(b, wall_mat, accent_mat, emissive_mat, marble_mat, folder):
    """Build the 3 walls + platform floor + accent stripe for one booth."""
    bx, by = b["pos"]
    w, d, h = b["w"], b["d"], b["h"]
    bid = b["id"]

    # UE5 cube default: 100x100x100cm at scale 1.0
    # Scale factors: divide desired cm by 100

    # -- Back wall (full width, along Y axis at back of booth)
    spawn_cube(
        f"Booth_{bid}_Wall_Back",
        vec(bx, by - d / 2.0, h / 2.0),
        vec(w / 100.0, 0.10, h / 100.0),
        material=wall_mat,
        folder=folder,
    )

    # -- Left side wall
    spawn_cube(
        f"Booth_{bid}_Wall_Left",
        vec(bx - w / 2.0, by, h / 2.0),
        vec(0.10, d / 100.0, h / 100.0),
        material=wall_mat,
        folder=folder,
    )

    # -- Right side wall
    spawn_cube(
        f"Booth_{bid}_Wall_Right",
        vec(bx + w / 2.0, by, h / 2.0),
        vec(0.10, d / 100.0, h / 100.0),
        material=wall_mat,
        folder=folder,
    )

    # -- Raised 10cm platform floor (marble)
    spawn_cube(
        f"Booth_{bid}_Platform",
        vec(bx, by, 5.0),
        vec(w / 100.0, d / 100.0, 0.10),
        material=marble_mat,
        folder=folder,
    )

    # -- Accent stripe along top of back wall (emissive, 15cm tall)
    spawn_cube(
        f"Booth_{bid}_AccentStripe",
        vec(bx, by - d / 2.0 + 3.0, h - 7.5),
        vec(w / 100.0, 0.03, 0.15),
        material=emissive_mat,
        folder=folder,
    )

    # -- Broker name text on back wall
    spawn_text(
        f"Booth_{bid}_NameText",
        vec(bx, by - d / 2.0 + 8.0, h * 0.65),
        rot(0, 0, 0),
        b["name"].upper(),
        world_size=min(h * 0.18, 70.0),
        color=color_from_tuple(b["color"]),
        material=emissive_mat,
        folder=folder,
    )

    # -- Tier badge text below name
    tier_label = f"{b['tier']} SPONSOR - ${b['price']:,}"
    spawn_text(
        f"Booth_{bid}_TierText",
        vec(bx, by - d / 2.0 + 8.0, h * 0.42),
        rot(0, 0, 0),
        tier_label,
        world_size=min(h * 0.07, 25.0),
        color=unreal.Color(220, 220, 220, 255),
        folder=folder,
    )


def build_booth_lighting(b, folder):
    """Place 3 accent spot lights above the booth in broker colour."""
    bx, by = b["pos"]
    w, d, h = b["w"], b["d"], b["h"]
    bid = b["id"]
    cb = color_from_tuple(b["color"])

    # 3 spots evenly spaced across the booth width, pointing down
    offsets = [-w / 3.0, 0.0, w / 3.0]
    for i, ox in enumerate(offsets):
        spawn_spot_light(
            f"Booth_{bid}_Spot_{i}",
            vec(bx + ox, by, h + 150.0),
            rot(-90, 0, 0),
            intensity=60000.0,
            inner_angle=18.0,
            outer_angle=35.0,
            attenuation=h + 400.0,
            color=cb,
            folder=folder,
        )


def build_counter_tables(b, accent_mat, marble_mat, folder):
    """Place counter tables: 120x50x100cm with 5cm marble top."""
    bx, by = b["pos"]
    w, d = b["w"], b["d"]
    bid = b["id"]
    count = b["counters"]

    if count == 0:
        return

    # Place counters along the front of the booth
    spacing = w / (count + 1.0)
    for i in range(count):
        cx = bx - w / 2.0 + spacing * (i + 1)
        cy = by + d / 4.0  # front quarter of booth

        # Counter body: 120x50x100cm -> scale 1.2, 0.5, 1.0
        spawn_cube(
            f"Booth_{bid}_Counter_{i}",
            vec(cx, cy, 50.0),
            vec(1.20, 0.50, 1.00),
            material=accent_mat,
            folder=folder,
        )
        # Marble counter top: 120x50x5cm -> scale 1.22, 0.52, 0.05
        spawn_cube(
            f"Booth_{bid}_CounterTop_{i}",
            vec(cx, cy, 100.0 + 2.5),
            vec(1.22, 0.52, 0.05),
            material=marble_mat,
            folder=folder,
        )


def build_bar_stools(b, accent_mat, folder):
    """Place bar stools: cylinder 30cm dia x 75cm tall + small seat disc."""
    bx, by = b["pos"]
    w, d = b["w"], b["d"]
    bid = b["id"]
    count = b["barstools"]

    if count == 0:
        return

    # Distribute stools in front of counters
    spacing = w / (count + 1.0)
    for i in range(count):
        sx = bx - w / 2.0 + spacing * (i + 1)
        sy = by + d / 4.0 + 60.0  # slightly in front of counters

        # Stool leg: cylinder 30cm dia x 75cm
        # UE5 cylinder default: 100 dia x 100 tall at scale 1.0
        # Scale: 0.30 x 0.30 x 0.75
        spawn_cylinder(
            f"Booth_{bid}_Stool_{i}_Leg",
            vec(sx, sy, 37.5),
            vec(0.30, 0.30, 0.75),
            material=accent_mat,
            folder=folder,
        )
        # Seat disc: cylinder 35cm dia x 5cm
        spawn_cylinder(
            f"Booth_{bid}_Stool_{i}_Seat",
            vec(sx, sy, 75.0 + 2.5),
            vec(0.35, 0.35, 0.05),
            material=accent_mat,
            folder=folder,
        )


def build_round_tables(b, accent_mat, folder):
    """Place round tables: cylinder 80cm dia x 75cm tall."""
    bx, by = b["pos"]
    d = b["d"]
    bid = b["id"]
    count = b["roundtables"]

    if count == 0:
        return

    # Place in the center-back area of the booth
    for i in range(count):
        rx = bx
        ry = by - d / 6.0

        # Table: cylinder 80cm dia x 75cm -> scale 0.80, 0.80, 0.75
        spawn_cylinder(
            f"Booth_{bid}_RoundTable_{i}",
            vec(rx, ry, 37.5),
            vec(0.80, 0.80, 0.75),
            material=accent_mat,
            folder=folder,
        )


def build_sofas(b, accent_mat, folder):
    """Place sofas: 140x60x45cm seat + 140x15x35cm backrest."""
    bx, by = b["pos"]
    w, d = b["w"], b["d"]
    bid = b["id"]
    count = b["sofas"]

    if count == 0:
        return

    # Arrange sofas around the round table area
    # Place them in an L or arc pattern
    positions = []
    cx, cy = bx, by - d / 6.0
    if count >= 1:
        positions.append((cx - w / 4.0, cy - 80.0, 0))    # left of table
    if count >= 2:
        positions.append((cx + w / 4.0, cy - 80.0, 0))    # right of table
    if count >= 3:
        positions.append((cx - w / 4.0, cy + 80.0, 180))  # left front
    if count >= 4:
        positions.append((cx + w / 4.0, cy + 80.0, 180))  # right front

    for i, (sx, sy, yaw) in enumerate(positions):
        # Seat: 140x60x45cm -> scale 1.40, 0.60, 0.45
        spawn_cube(
            f"Booth_{bid}_Sofa_{i}_Seat",
            vec(sx, sy, 22.5),
            vec(1.40, 0.60, 0.45),
            material=accent_mat,
            folder=folder,
        )
        # Backrest: 140x15x35cm -> scale 1.40, 0.15, 0.35
        # Offset behind the seat based on yaw
        back_offset_y = -30.0 if yaw == 0 else 30.0
        spawn_cube(
            f"Booth_{bid}_Sofa_{i}_Back",
            vec(sx, sy + back_offset_y, 45.0 + 17.5),
            vec(1.40, 0.15, 0.35),
            material=accent_mat,
            folder=folder,
        )


def build_chairs(b, accent_mat, folder):
    """Place chairs (GOLD tier): 45x45x45cm seat + 45x5x40cm backrest."""
    bx, by = b["pos"]
    d = b["d"]
    bid = b["id"]
    count = b.get("chairs", 0)

    if count == 0:
        return

    # Place chairs around round table
    cx, cy = bx, by - d / 6.0
    positions = []
    if count >= 1:
        positions.append((cx - 60.0, cy, 90))
    if count >= 2:
        positions.append((cx + 60.0, cy, -90))

    for i, (chx, chy, yaw) in enumerate(positions):
        # Seat: 45x45x45cm -> scale 0.45, 0.45, 0.45
        spawn_cube(
            f"Booth_{bid}_Chair_{i}_Seat",
            vec(chx, chy, 22.5),
            vec(0.45, 0.45, 0.45),
            material=accent_mat,
            folder=folder,
        )
        # Backrest: 45x5x40cm -> scale 0.45, 0.05, 0.40
        back_ox = -22.5 if yaw > 0 else 22.5
        spawn_cube(
            f"Booth_{bid}_Chair_{i}_Back",
            vec(chx + back_ox, chy, 45.0 + 20.0),
            vec(0.45, 0.05, 0.40),
            material=accent_mat,
            folder=folder,
        )


def build_tv_screen(b, tv_mat, folder):
    """Place HD TV: 50" = 127x5x72cm, 42" = 107x5x60cm, emissive."""
    bx, by = b["pos"]
    d, h = b["d"], b["h"]
    bid = b["id"]
    tvsize = b["tvsize"]

    # Mount on back wall at 60% height
    tz = h * 0.6
    ty = by - d / 2.0 + 8.0  # slightly in front of back wall

    if tvsize == 50:
        # 127cm x 5cm x 72cm -> scale 1.27, 0.05, 0.72
        spawn_cube(
            f"Booth_{bid}_TV",
            vec(bx, ty, tz),
            vec(1.27, 0.05, 0.72),
            material=tv_mat,
            folder=folder,
        )
    else:
        # 42": 107cm x 5cm x 60cm -> scale 1.07, 0.05, 0.60
        spawn_cube(
            f"Booth_{bid}_TV",
            vec(bx, ty, tz),
            vec(1.07, 0.05, 0.60),
            material=tv_mat,
            folder=folder,
        )


def build_brochure_stands(b, accent_mat, folder):
    """Place brochure stands: thin cylinder 20cm dia x 120cm + angled top."""
    bx, by = b["pos"]
    w, d = b["w"], b["d"]
    bid = b["id"]
    count = b["brochure_stands"]

    if count == 0:
        return

    # Place near the front edges of the booth
    positions = []
    if count >= 1:
        positions.append((bx - w / 3.0, by + d / 3.0))
    if count >= 2:
        positions.append((bx + w / 3.0, by + d / 3.0))

    for i, (bsx, bsy) in enumerate(positions):
        # Pole: cylinder 20cm dia x 120cm -> scale 0.20, 0.20, 1.20
        spawn_cylinder(
            f"Booth_{bid}_BrochureStand_{i}_Pole",
            vec(bsx, bsy, 60.0),
            vec(0.20, 0.20, 1.20),
            material=accent_mat,
            folder=folder,
        )
        # Top display: small angled cube 25x20x2cm at top
        spawn_cube(
            f"Booth_{bid}_BrochureStand_{i}_Top",
            vec(bsx, bsy + 5.0, 120.0),
            vec(0.25, 0.20, 0.02),
            material=accent_mat,
            folder=folder,
        )


def build_rollup_banners(b, emissive_mat, folder):
    """Place roll-up banners: flat cube 85x5x200cm with broker-colour emissive."""
    bx, by = b["pos"]
    w, d = b["w"], b["d"]
    bid = b["id"]
    count = b["rollups"]

    if count == 0:
        return

    # Place at the front corners of the booth
    positions = []
    if count >= 1:
        positions.append((bx - w / 2.0 + 50.0, by + d / 2.0 - 20.0))
    if count >= 2:
        positions.append((bx + w / 2.0 - 50.0, by + d / 2.0 - 20.0))

    for i, (rx, ry) in enumerate(positions):
        # Banner: 85x5x200cm -> scale 0.85, 0.05, 2.00
        spawn_cube(
            f"Booth_{bid}_RollUp_{i}",
            vec(rx, ry, 100.0),
            vec(0.85, 0.05, 2.00),
            material=emissive_mat,
            folder=folder,
        )


def build_ceiling_banner(b, emissive_mat, folder):
    """Place ceiling banner: flat cube 200x200x5cm hanging from ceiling."""
    if not b["ceiling_banner"]:
        return

    bx, by = b["pos"]
    h = b["h"]
    bid = b["id"]

    # Hang slightly below booth wall height
    spawn_cube(
        f"Booth_{bid}_CeilingBanner",
        vec(bx, by, h + 50.0),
        vec(2.00, 2.00, 0.05),
        material=emissive_mat,
        folder=folder,
    )


def build_award_trophy(b, trophy_mat, folder):
    """Place award trophy: golden cylinder pedestal + sphere on top."""
    if not b["trophy"]:
        return

    bx, by = b["pos"]
    w, d = b["w"], b["d"]
    bid = b["id"]

    # Place near the front-center of the booth
    tx = bx
    ty = by + d / 6.0

    # Pedestal base: cylinder 25cm dia x 80cm -> scale 0.25, 0.25, 0.80
    spawn_cylinder(
        f"Booth_{bid}_Trophy_Pedestal",
        vec(tx, ty, 40.0),
        vec(0.25, 0.25, 0.80),
        material=trophy_mat,
        folder=folder,
    )
    # Trophy cup: cylinder 15cm dia x 20cm -> scale 0.15, 0.15, 0.20
    spawn_cylinder(
        f"Booth_{bid}_Trophy_Cup",
        vec(tx, ty, 80.0 + 10.0),
        vec(0.15, 0.15, 0.20),
        material=trophy_mat,
        folder=folder,
    )
    # Trophy ball: sphere 12cm -> scale 0.12, 0.12, 0.12
    spawn_sphere(
        f"Booth_{bid}_Trophy_Ball",
        vec(tx, ty, 80.0 + 20.0 + 8.0),
        vec(0.12, 0.12, 0.12),
        material=trophy_mat,
        folder=folder,
    )


def build_single_booth(b, shared_mats):
    """Build one complete booth with all furniture and signage."""
    bid = b["id"]
    bname = b["name"]
    tier = b["tier"]
    color = b["color"]
    folder = f"ExpoHall/Booths/{bname}"

    log(f"  Building {tier} booth: {bname} (${b['price']:,})")
    log(f"    Size: {b['w']/100.0:.0f}m W x {b['d']/100.0:.0f}m D x "
        f"{b['h']/100.0:.1f}m H = {b['w']*b['d']/10000:.0f}sqm")

    # Create booth-specific materials
    wall_mat = create_wall_material(bid, color)
    accent_mat = create_accent_material(bid, color)
    emissive_mat = create_emissive_material(bid, color)

    # Shared materials
    tv_mat = shared_mats["tv"]
    trophy_mat = shared_mats["trophy"]
    marble_mat = shared_mats["marble"]

    # Build structure
    build_booth_walls(b, wall_mat, accent_mat, emissive_mat, marble_mat, folder)
    build_booth_lighting(b, folder)

    # Build furniture
    build_counter_tables(b, accent_mat, marble_mat, folder)
    build_bar_stools(b, accent_mat, folder)
    build_round_tables(b, accent_mat, folder)
    build_sofas(b, accent_mat, folder)
    build_chairs(b, accent_mat, folder)

    # Build displays
    build_tv_screen(b, tv_mat, folder)
    build_brochure_stands(b, accent_mat, folder)
    build_rollup_banners(b, emissive_mat, folder)
    build_ceiling_banner(b, emissive_mat, folder)
    build_award_trophy(b, trophy_mat, folder)

    furniture_list = []
    if b["counters"]:
        furniture_list.append(f"{b['counters']} counters")
    if b["barstools"]:
        furniture_list.append(f"{b['barstools']} bar stools")
    if b["roundtables"]:
        furniture_list.append(f"{b['roundtables']} round table")
    if b["sofas"]:
        furniture_list.append(f"{b['sofas']} sofas")
    if b.get("chairs", 0):
        furniture_list.append(f"{b['chairs']} chairs")
    furniture_list.append(f"{b['tvsize']}\" TV")
    if b["brochure_stands"]:
        furniture_list.append(f"{b['brochure_stands']} brochure stands")
    if b["rollups"]:
        furniture_list.append(f"{b['rollups']} roll-ups")
    if b["ceiling_banner"]:
        furniture_list.append("ceiling banner")
    if b["trophy"]:
        furniture_list.append("trophy")

    log(f"    Furniture: {', '.join(furniture_list)}")
    STATS["booths_built"] += 1


# ============================================================================
# PHASE 3: Branding opportunities
# ============================================================================

def build_networking_lounge(marble_mat):
    """Build Networking Lounge at (3000, 500, 0)."""
    log("  Building Networking Lounge...")
    folder = "ExpoHall/Branding/NetworkingLounge"
    lx, ly, lz = 3000.0, 500.0, 0.0

    lounge_mat = create_simple_color_mat("M_LoungeAccent", 0.15, 0.12, 0.25, 0.4)
    carpet_mat = create_simple_color_mat("M_LoungeCarpet", 0.08, 0.06, 0.14, 0.9)

    # Branded carpet: 500x500x2cm
    spawn_cube(
        "Booth_Lounge_Carpet",
        vec(lx, ly, 1.0),
        vec(5.00, 5.00, 0.02),
        material=carpet_mat,
        folder=folder,
    )

    # Central round table
    spawn_cylinder(
        "Booth_Lounge_Table",
        vec(lx, ly, 37.5),
        vec(0.80, 0.80, 0.75),
        material=lounge_mat,
        folder=folder,
    )

    # 4 sofas around the table
    sofa_positions = [
        (lx - 150.0, ly, 90),
        (lx + 150.0, ly, -90),
        (lx, ly - 150.0, 0),
        (lx, ly + 150.0, 180),
    ]
    for i, (sx, sy, yaw) in enumerate(sofa_positions):
        spawn_cube(
            f"Booth_Lounge_Sofa_{i}_Seat",
            vec(sx, sy, 22.5),
            vec(1.40, 0.60, 0.45),
            material=lounge_mat,
            folder=folder,
        )
        # Backrest facing away from table
        if yaw == 90:
            boff = (-30.0, 0.0)
        elif yaw == -90:
            boff = (30.0, 0.0)
        elif yaw == 0:
            boff = (0.0, -30.0)
        else:
            boff = (0.0, 30.0)
        spawn_cube(
            f"Booth_Lounge_Sofa_{i}_Back",
            vec(sx + boff[0], sy + boff[1], 62.5),
            vec(1.40, 0.15, 0.35),
            material=lounge_mat,
            folder=folder,
        )

    # "NETWORKING LOUNGE" text sign
    sign_mat = create_generic_emissive_mat("M_LoungeSign", 0.9, 0.75, 0.3, 6.0)
    spawn_text(
        "Booth_Lounge_Sign",
        vec(lx, ly, 250.0),
        rot(0, 0, 0),
        "NETWORKING LOUNGE",
        world_size=45.0,
        color=unreal.Color(230, 190, 75, 255),
        material=sign_mat,
        folder=folder,
    )

    # Warm point light
    spawn_point_light(
        "Booth_Lounge_WarmLight",
        vec(lx, ly, 300.0),
        intensity=40000.0,
        color=unreal.Color(255, 220, 160, 255),
        attenuation=800.0,
        folder=folder,
    )

    STATS["branding_built"] += 1
    log("    4 sofas, round table, branded carpet, sign, warm lighting")


def build_registration_desk():
    """Build Registration Desk at entrance (-200, -1900, 0)."""
    log("  Building Registration Desk...")
    folder = "ExpoHall/Branding/Registration"
    rx, ry, rz = -200.0, -1900.0, 0.0

    desk_mat = create_simple_color_mat("M_RegDesk", 0.10, 0.10, 0.15, 0.3)
    screen_mat = create_tv_screen_material()  # reuse TV screen mat

    # Long counter: 300x60x100cm -> scale 3.00, 0.60, 1.00
    spawn_cube(
        "Booth_Registration_Counter",
        vec(rx, ry, 50.0),
        vec(3.00, 0.60, 1.00),
        material=desk_mat,
        folder=folder,
    )

    # 2 screens on desk: small 60x5x35cm monitors
    for i, ox in enumerate([-80.0, 80.0]):
        spawn_cube(
            f"Booth_Registration_Screen_{i}",
            vec(rx + ox, ry - 20.0, 100.0 + 17.5),
            vec(0.60, 0.05, 0.35),
            material=screen_mat,
            folder=folder,
        )

    # "REGISTRATION" text
    reg_mat = create_generic_emissive_mat("M_RegSign", 0.9, 0.9, 1.0, 8.0)
    spawn_text(
        "Booth_Registration_Text",
        vec(rx, ry - 40.0, 160.0),
        rot(0, 0, 0),
        "REGISTRATION",
        world_size=50.0,
        color=unreal.Color(230, 230, 255, 255),
        material=reg_mat,
        folder=folder,
    )

    # Branded kiosk stands (2 flanking)
    kiosk_mat = create_simple_color_mat("M_RegKiosk", 0.08, 0.08, 0.12, 0.4)
    for i, kx in enumerate([-250.0, 100.0]):
        spawn_cube(
            f"Booth_Registration_Kiosk_{i}",
            vec(rx + kx, ry, 60.0),
            vec(0.40, 0.40, 1.20),
            material=kiosk_mat,
            folder=folder,
        )

    STATS["branding_built"] += 1
    log("    Long counter, 2 screens, REGISTRATION text, 2 kiosks")


def build_welcome_arch():
    """Build/enhance Welcome Arch at entrance (0, -1950, 0)."""
    log("  Building Welcome Arch...")
    folder = "ExpoHall/Branding/WelcomeArch"
    ax, ay = 0.0, -1950.0

    arch_mat = create_simple_color_mat("M_ArchPillar", 0.12, 0.12, 0.18, 0.3)
    gold_emissive = create_generic_emissive_mat("M_ArchGold", 0.831, 0.659, 0.325, 10.0)

    # Remove existing arch pieces if re-running
    for actor in ell.get_all_level_actors():
        label = actor.get_actor_label()
        if label.startswith("Booth_Arch_"):
            ell.destroy_actor(actor)

    # Left pillar: 40x40x450cm -> scale 0.40, 0.40, 4.50
    spawn_cube(
        "Booth_Arch_PillarLeft",
        vec(ax - 250.0, ay, 225.0),
        vec(0.40, 0.40, 4.50),
        material=arch_mat,
        folder=folder,
    )
    # Right pillar
    spawn_cube(
        "Booth_Arch_PillarRight",
        vec(ax + 250.0, ay, 225.0),
        vec(0.40, 0.40, 4.50),
        material=arch_mat,
        folder=folder,
    )
    # Top beam: 540x40x30cm -> scale 5.40, 0.40, 0.30
    spawn_cube(
        "Booth_Arch_TopBeam",
        vec(ax, ay, 450.0 + 15.0),
        vec(5.40, 0.40, 0.30),
        material=arch_mat,
        folder=folder,
    )

    # Gold emissive strips on pillars (vertical accent)
    for side, label in [(-250.0, "Left"), (250.0, "Right")]:
        spawn_cube(
            f"Booth_Arch_GoldStrip_{label}",
            vec(ax + side + 22.0, ay, 225.0),
            vec(0.03, 0.42, 4.50),
            material=gold_emissive,
            folder=folder,
        )

    # Gold emissive strip along top beam
    spawn_cube(
        "Booth_Arch_GoldStripTop",
        vec(ax, ay, 450.0 + 32.0),
        vec(5.40, 0.42, 0.04),
        material=gold_emissive,
        folder=folder,
    )

    # "FOREX EXPO DUBAI" text on the beam
    spawn_text(
        "Booth_Arch_Title",
        vec(ax, ay + 25.0, 450.0 + 15.0),
        rot(0, 0, 0),
        "FOREX EXPO DUBAI",
        world_size=55.0,
        color=unreal.Color(255, 215, 80, 255),
        material=gold_emissive,
        folder=folder,
    )

    STATS["branding_built"] += 1
    log("    2 pillars, top beam, gold emissive strips, title text")


def build_photo_wall():
    """Build Photo Wall at (-3000, 0, 0): 400x300cm panel with pattern."""
    log("  Building Photo Wall...")
    folder = "ExpoHall/Branding/PhotoWall"
    px, py, pz = -3000.0, 0.0, 0.0

    wall_mat = create_simple_color_mat("M_PhotoWall", 0.05, 0.05, 0.08, 0.5)
    text_mat = create_generic_emissive_mat("M_PhotoWallText", 0.831, 0.659, 0.325, 5.0)

    # Main panel: 400x5x300cm -> scale 4.00, 0.05, 3.00
    spawn_cube(
        "Booth_PhotoWall_Panel",
        vec(px, py, 150.0),
        vec(4.00, 0.05, 3.00),
        material=wall_mat,
        folder=folder,
    )

    # Repeated "FOREX EXPO DUBAI" text pattern (3 rows)
    for row in range(3):
        tz = 80.0 + row * 90.0
        spawn_text(
            f"Booth_PhotoWall_Text_{row}",
            vec(px, py + 5.0, tz),
            rot(0, 0, 0),
            "FOREX EXPO DUBAI",
            world_size=28.0,
            color=unreal.Color(200, 170, 60, 255),
            material=text_mat,
            folder=folder,
        )

    # 2 spot lights illuminating the wall
    for i, ox in enumerate([-120.0, 120.0]):
        spawn_spot_light(
            f"Booth_PhotoWall_Spot_{i}",
            vec(px, py + 250.0, 350.0),
            rot(-45, 180, 0),
            intensity=50000.0,
            inner_angle=20.0,
            outer_angle=40.0,
            attenuation=600.0,
            color=unreal.Color(255, 240, 200, 255),
            folder=folder,
        )

    STATS["branding_built"] += 1
    log("    400x300cm panel, 3 text rows, 2 spot lights")


def build_water_kiosks():
    """Build 4 water kiosks: small branded stands scattered through the hall."""
    log("  Building Water Kiosks...")
    folder = "ExpoHall/Branding/WaterKiosks"

    kiosk_mat = create_simple_color_mat("M_WaterKiosk", 0.12, 0.15, 0.25, 0.4)
    top_mat = create_generic_emissive_mat("M_WaterKioskTop", 0.0, 0.6, 0.9, 4.0)

    for i, (kx, ky) in enumerate(WATER_KIOSK_POSITIONS):
        # Body: cylinder 40cm dia x 120cm -> scale 0.40, 0.40, 1.20
        spawn_cylinder(
            f"Booth_WaterKiosk_{i}_Body",
            vec(kx, ky, 60.0),
            vec(0.40, 0.40, 1.20),
            material=kiosk_mat,
            folder=folder,
        )
        # Branded top: cylinder 45cm dia x 5cm
        spawn_cylinder(
            f"Booth_WaterKiosk_{i}_Top",
            vec(kx, ky, 120.0 + 2.5),
            vec(0.45, 0.45, 0.05),
            material=top_mat,
            folder=folder,
        )

    STATS["branding_built"] += 1
    log("    4 water kiosks placed at hall positions")


# ============================================================================
# MAIN
# ============================================================================

def main():
    log("")
    log("=" * 70)
    log("  FOREX EXPO DUBAI -- PROSPECTUS BOOTH REBUILD")
    log("  Step 08: Full Prospectus-Spec Booth & Branding Build")
    log("=" * 70)

    ensure_dir(MAT_DIR)

    # ------------------------------------------------------------------
    # PHASE 1: Clean slate
    # ------------------------------------------------------------------
    log("")
    log("-" * 50)
    log(" PHASE 1: Remove Existing Booth Actors")
    log("-" * 50)
    remove_existing_booths()

    # ------------------------------------------------------------------
    # PHASE 2: Create shared materials
    # ------------------------------------------------------------------
    log("")
    log("-" * 50)
    log(" PHASE 2: Create Shared Materials")
    log("-" * 50)

    tv_mat = create_tv_screen_material()
    log("  Created M_TVScreen (emissive blue-white)")

    trophy_mat = create_trophy_material()
    log("  Created M_Trophy (gold metallic #d4a853)")

    marble_mat = get_marble_material()
    log("  Marble/floor material ready")

    shared_mats = {
        "tv": tv_mat,
        "trophy": trophy_mat,
        "marble": marble_mat,
    }

    # ------------------------------------------------------------------
    # PHASE 3: Build all booths
    # ------------------------------------------------------------------
    log("")
    log("-" * 50)
    log(" PHASE 3: Build Prospectus-Spec Booths")
    log("-" * 50)

    for booth in BOOTHS:
        build_single_booth(booth, shared_mats)
        log("")

    # ------------------------------------------------------------------
    # PHASE 4: Branding opportunities
    # ------------------------------------------------------------------
    log("")
    log("-" * 50)
    log(" PHASE 4: Branding Opportunities")
    log("-" * 50)

    build_networking_lounge(marble_mat)
    build_registration_desk()
    build_welcome_arch()
    build_photo_wall()
    build_water_kiosks()

    # ------------------------------------------------------------------
    # SUMMARY
    # ------------------------------------------------------------------
    log("")
    log("=" * 70)
    log("  PROSPECTUS BOOTH REBUILD COMPLETE")
    log("=" * 70)
    log("")
    log(f"  Actors removed:     {STATS['actors_removed']}")
    log(f"  Booths built:       {STATS['booths_built']}")
    log(f"  Furniture placed:   {STATS['furniture_placed']}")
    log(f"  Materials created:  {STATS['materials_created']}")
    log(f"  Lights placed:      {STATS['lights_placed']}")
    log(f"  Branding features:  {STATS['branding_built']}")
    log("")
    log("  BOOTH DETAILS:")
    log("  -----------------------------------------------")
    for b in BOOTHS:
        sqm = b["w"] * b["d"] / 10000
        log(f"  {b['tier']:10s}  {b['name']:15s}  ${b['price']:>6,}  "
            f"{b['w']/100:.0f}x{b['d']/100:.0f}x{b['h']/100:.1f}m = {sqm:.0f}sqm")
        items = []
        if b["counters"]:
            items.append(f"{b['counters']} counters")
        if b["barstools"]:
            items.append(f"{b['barstools']} bar stools")
        if b["roundtables"]:
            items.append(f"{b['roundtables']} round table")
        if b["sofas"]:
            items.append(f"{b['sofas']} sofas")
        if b.get("chairs", 0):
            items.append(f"{b['chairs']} chairs")
        items.append(f"{b['tvsize']}\" TV")
        if b["brochure_stands"]:
            items.append(f"{b['brochure_stands']} brochure stands")
        if b["rollups"]:
            items.append(f"{b['rollups']} roll-ups")
        if b["ceiling_banner"]:
            items.append("ceiling banner")
        if b["trophy"]:
            items.append("award trophy")
        log(f"             {', '.join(items)}")
    log("")
    log("  BRANDING FEATURES:")
    log("  -----------------------------------------------")
    log("  Networking Lounge   @ (3000, 500)   - 4 sofas, table, carpet, sign")
    log("  Registration Desk   @ (-200, -1900) - counter, 2 screens, kiosks")
    log("  Welcome Arch        @ (0, -1950)    - pillars, beam, gold strips")
    log("  Photo Wall          @ (-3000, 0)    - 400x300cm panel, spot lights")
    log("  Water Kiosks (x4)   @ hall positions - branded cylinder stands")
    log("")
    log("  MATERIALS CREATED:")
    log("  -----------------------------------------------")
    log("  Per booth: M_BoothWall_{id}, M_BoothAccent_{id}, M_BoothEmissive_{id}")
    log("  Shared:    M_TVScreen, M_Trophy, M_Marble (or M_DarkNavyFloor)")
    log("  Branding:  M_LoungeAccent, M_LoungeCarpet, M_LoungeSign")
    log("             M_RegDesk, M_RegSign, M_RegKiosk")
    log("             M_ArchPillar, M_ArchGold")
    log("             M_PhotoWall, M_PhotoWallText")
    log("             M_WaterKiosk, M_WaterKioskTop")
    log("")
    log("  All booth actors use 'Booth_' prefix for easy cleanup.")
    log("  Organized under ExpoHall/Booths/ and ExpoHall/Branding/ folders.")
    log("=" * 70)


main()
