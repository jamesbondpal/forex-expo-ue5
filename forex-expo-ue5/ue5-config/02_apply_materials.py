"""
Forex Expo Dubai — Step 2: Apply PBR Materials
================================================
Run AFTER build_expo_hall.py via: Tools → Execute Python Script

Creates proper PBR materials with texture-based detail and applies them
to all hall structure actors. Adds Fresnel, noise-based marble veining,
and roughness variation for photorealism under Lumen lighting.
"""

import unreal
import math

log_prefix = "[ForexExpo:Materials]"
def log(msg): unreal.log(f"{log_prefix} {msg}")

mel = unreal.MaterialEditingLibrary
eal = unreal.EditorAssetLibrary
ell = unreal.EditorLevelLibrary
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

CONTENT_DIR = "/Game/ForexExpo/"
MAT_DIR     = "/Game/ForexExpo/Materials/"


# ============================================================================
# Helpers
# ============================================================================

def ensure_dir(path):
    if not eal.does_directory_exist(path):
        eal.make_directory(path)


def get_or_create_material(name):
    """Load existing or create new Material asset."""
    path = MAT_DIR + name
    if eal.does_asset_exist(path):
        existing = eal.load_asset(path)
        if existing:
            return existing
    factory = unreal.MaterialFactoryNew()
    return asset_tools.create_asset(name, MAT_DIR[:-1], unreal.Material, factory)


def find_actors_by_label(pattern):
    """Find all actors whose label contains `pattern`."""
    all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
    return [a for a in all_actors if pattern in a.get_actor_label()]


def set_actor_material(actor, material, slot=0):
    """Apply material to a StaticMeshActor."""
    if not actor or not material:
        return
    comp = None
    if hasattr(actor, 'static_mesh_component'):
        comp = actor.static_mesh_component
    else:
        comps = actor.get_components_by_class(unreal.StaticMeshComponent)
        if comps:
            comp = comps[0]
    if comp:
        comp.set_material(slot, material)


# ============================================================================
# Material: Polished Marble Floor
# ============================================================================

def create_marble_floor():
    """
    Polished marble with procedural vein pattern.
    - Base: warm cream-white (0.85, 0.82, 0.78)
    - Veins: darker grey-brown via noise
    - Roughness: 0.05-0.12 range (highly polished)
    - Specular: 0.7 (dielectric reflections)
    - Metallic: 0.0
    """
    log("Creating polished marble floor material...")
    mat = get_or_create_material("M_MarbleFloor_PBR")
    mat.set_editor_property("two_sided", False)

    # --- Base color: lerp between cream marble and dark vein ---

    # Cream base
    cream = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -800, -300)
    cream.constant = unreal.LinearColor(0.87, 0.84, 0.80, 1.0)

    # Vein colour (dark grey-brown)
    vein_color = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -800, -200)
    vein_color.constant = unreal.LinearColor(0.25, 0.22, 0.20, 1.0)

    # Noise for veining pattern — use world-space UVs
    world_pos = mel.create_material_expression(mat, unreal.MaterialExpressionWorldPosition, -1400, -100)

    # Scale world position for tiling
    scale_vec = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -1400, 0)
    scale_vec.constant = unreal.LinearColor(0.003, 0.003, 0.0, 1.0)  # tile every ~3m

    multiply_uv = mel.create_material_expression(mat, unreal.MaterialExpressionMultiply, -1200, -50)
    mel.connect_material_expressions(world_pos, "", multiply_uv, "A")
    mel.connect_material_expressions(scale_vec, "", multiply_uv, "B")

    # Noise node for marble veining
    noise = mel.create_material_expression(mat, unreal.MaterialExpressionNoise, -1000, -50)
    noise.set_editor_property("scale", 1.0)
    noise.set_editor_property("quality", 2)
    noise.set_editor_property("noise_function", unreal.NoiseFunction.NOISEFUNCTION_GRADIENT_ALU)
    noise.set_editor_property("output_min", 0.0)
    noise.set_editor_property("output_max", 1.0)
    mel.connect_material_expressions(multiply_uv, "", noise, "Position")

    # Power to sharpen veins
    power_node = mel.create_material_expression(mat, unreal.MaterialExpressionPower, -800, -50)
    mel.connect_material_expressions(noise, "", power_node, "Base")
    power_exp = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -900, 50)
    power_exp.r = 3.0
    mel.connect_material_expressions(power_exp, "", power_node, "Exp")

    # Lerp cream ↔ vein based on noise
    lerp_base = mel.create_material_expression(mat, unreal.MaterialExpressionLinearInterpolate, -600, -250)
    mel.connect_material_expressions(cream, "", lerp_base, "A")
    mel.connect_material_expressions(vein_color, "", lerp_base, "B")
    mel.connect_material_expressions(power_node, "", lerp_base, "Alpha")

    mel.connect_material_property(lerp_base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    # --- Metallic: 0.0 ---
    metallic = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -600, -100)
    metallic.r = 0.0
    mel.connect_material_property(metallic, "", unreal.MaterialProperty.MP_METALLIC)

    # --- Roughness: slight variation 0.05–0.12 ---
    rough_base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -800, 100)
    rough_base.r = 0.05

    rough_var = mel.create_material_expression(mat, unreal.MaterialExpressionMultiply, -700, 150)
    mel.connect_material_expressions(noise, "", rough_var, "A")
    rough_scale = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -800, 200)
    rough_scale.r = 0.07
    mel.connect_material_expressions(rough_scale, "", rough_var, "B")

    rough_add = mel.create_material_expression(mat, unreal.MaterialExpressionAdd, -600, 100)
    mel.connect_material_expressions(rough_base, "", rough_add, "A")
    mel.connect_material_expressions(rough_var, "", rough_add, "B")

    mel.connect_material_property(rough_add, "", unreal.MaterialProperty.MP_ROUGHNESS)

    # --- Specular: high for polished stone ---
    specular = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -600, 250)
    specular.r = 0.7
    mel.connect_material_property(specular, "", unreal.MaterialProperty.MP_SPECULAR)

    # --- Normal: subtle bump from noise for micro-surface ---
    normal_strength = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -800, 350)
    normal_strength.r = 0.15
    # Flatten normal from noise — approximate with a FlattenNormal-like multiply
    normal_noise = mel.create_material_expression(mat, unreal.MaterialExpressionNoise, -1000, 350)
    normal_noise.set_editor_property("scale", 8.0)
    normal_noise.set_editor_property("quality", 1)
    normal_noise.set_editor_property("output_min", -1.0)
    normal_noise.set_editor_property("output_max", 1.0)
    mel.connect_material_expressions(multiply_uv, "", normal_noise, "Position")

    mel.recompile_material(mat)
    log("  Marble floor PBR material created")
    return mat


# ============================================================================
# Material: Dark Wall Panels
# ============================================================================

def create_wall_panels():
    """
    Dark charcoal acoustic-panel look.
    - Base: very dark grey (0.04, 0.04, 0.05)
    - Roughness: 0.7 (matte brushed)
    - Subtle vertical groove pattern via noise
    """
    log("Creating wall panel material...")
    mat = get_or_create_material("M_WallPanel_PBR")

    # Base colour — dark charcoal
    base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -600, -200)
    base.constant = unreal.LinearColor(0.04, 0.04, 0.05, 1.0)

    # Slight colour variation via noise for panel texture
    world_pos = mel.create_material_expression(mat, unreal.MaterialExpressionWorldPosition, -1000, -100)
    scale = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -1000, 0)
    scale.constant = unreal.LinearColor(0.002, 0.01, 0.0, 1.0)  # stretch vertically = grooves

    mul = mel.create_material_expression(mat, unreal.MaterialExpressionMultiply, -850, -50)
    mel.connect_material_expressions(world_pos, "", mul, "A")
    mel.connect_material_expressions(scale, "", mul, "B")

    noise = mel.create_material_expression(mat, unreal.MaterialExpressionNoise, -700, -50)
    noise.set_editor_property("scale", 1.0)
    noise.set_editor_property("output_min", 0.8)
    noise.set_editor_property("output_max", 1.0)
    mel.connect_material_expressions(mul, "", noise, "Position")

    # Modulate base colour
    base_mod = mel.create_material_expression(mat, unreal.MaterialExpressionMultiply, -500, -150)
    mel.connect_material_expressions(base, "", base_mod, "A")
    mel.connect_material_expressions(noise, "", base_mod, "B")

    mel.connect_material_property(base_mod, "", unreal.MaterialProperty.MP_BASE_COLOR)

    # Metallic: slight
    metallic = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -500, 0)
    metallic.r = 0.05
    mel.connect_material_property(metallic, "", unreal.MaterialProperty.MP_METALLIC)

    # Roughness: matte with groove variation
    rough_base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -700, 100)
    rough_base.r = 0.65

    rough_var = mel.create_material_expression(mat, unreal.MaterialExpressionMultiply, -600, 150)
    mel.connect_material_expressions(noise, "", rough_var, "A")
    rough_s = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -700, 200)
    rough_s.r = 0.15
    mel.connect_material_expressions(rough_s, "", rough_var, "B")

    rough_final = mel.create_material_expression(mat, unreal.MaterialExpressionAdd, -500, 100)
    mel.connect_material_expressions(rough_base, "", rough_final, "A")
    mel.connect_material_expressions(rough_var, "", rough_final, "B")
    mel.connect_material_property(rough_final, "", unreal.MaterialProperty.MP_ROUGHNESS)

    mel.recompile_material(mat)
    log("  Wall panel PBR material created")
    return mat


# ============================================================================
# Material: Matte Black Ceiling
# ============================================================================

def create_ceiling():
    """
    Matte black ceiling — near-zero reflectivity, absorbs light.
    - Base: 0.015 (very dark)
    - Roughness: 0.97
    - No metallic, no specular
    """
    log("Creating matte ceiling material...")
    mat = get_or_create_material("M_Ceiling_PBR")

    base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -500, -200)
    base.constant = unreal.LinearColor(0.015, 0.015, 0.018, 1.0)
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    metallic = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -500, 0)
    metallic.r = 0.0
    mel.connect_material_property(metallic, "", unreal.MaterialProperty.MP_METALLIC)

    roughness = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -500, 100)
    roughness.r = 0.97
    mel.connect_material_property(roughness, "", unreal.MaterialProperty.MP_ROUGHNESS)

    specular = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -500, 200)
    specular.r = 0.02
    mel.connect_material_property(specular, "", unreal.MaterialProperty.MP_SPECULAR)

    mel.recompile_material(mat)
    log("  Ceiling PBR material created")
    return mat


# ============================================================================
# Material: Booth Accent (coloured satin)
# ============================================================================

def create_booth_accent(name, color):
    """Satin-finish booth wall in brand colour."""
    log(f"Creating booth accent material: {name}...")
    mat = get_or_create_material(f"M_Booth_{name}_PBR")

    base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -500, -200)
    base.constant = color
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    metallic = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -500, 0)
    metallic.r = 0.12
    mel.connect_material_property(metallic, "", unreal.MaterialProperty.MP_METALLIC)

    roughness = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -500, 100)
    roughness.r = 0.3
    mel.connect_material_property(roughness, "", unreal.MaterialProperty.MP_ROUGHNESS)

    specular = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -500, 200)
    specular.r = 0.6
    mel.connect_material_property(specular, "", unreal.MaterialProperty.MP_SPECULAR)

    mel.recompile_material(mat)
    return mat


# ============================================================================
# Material: Booth Back Wall (dark brand)
# ============================================================================

def create_booth_back(name, color):
    """Dark version of brand colour for booth back walls."""
    log(f"Creating booth back material: {name}...")
    mat = get_or_create_material(f"M_BoothBack_{name}_PBR")

    dark = unreal.LinearColor(color.r * 0.12, color.g * 0.12, color.b * 0.12, 1.0)
    base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -500, -200)
    base.constant = dark
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    roughness = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -500, 100)
    roughness.r = 0.75
    mel.connect_material_property(roughness, "", unreal.MaterialProperty.MP_ROUGHNESS)

    mel.recompile_material(mat)
    return mat


# ============================================================================
# Material: Emissive Accent Stripe
# ============================================================================

def create_emissive_stripe(name, color):
    """Glowing accent stripe in brand colour."""
    log(f"Creating emissive stripe: {name}...")
    mat = get_or_create_material(f"M_Stripe_{name}_PBR")

    base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -500, -200)
    base.constant = color
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    # Emissive — 5× colour for visible glow
    emissive = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -500, 200)
    emissive.constant = unreal.LinearColor(color.r * 5.0, color.g * 5.0, color.b * 5.0, 1.0)
    mel.connect_material_property(emissive, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)

    roughness = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -500, 100)
    roughness.r = 0.15
    mel.connect_material_property(roughness, "", unreal.MaterialProperty.MP_ROUGHNESS)

    mel.recompile_material(mat)
    return mat


# ============================================================================
# Material: Stage Platform (dark wood)
# ============================================================================

def create_stage():
    log("Creating stage material...")
    mat = get_or_create_material("M_Stage_PBR")

    base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -500, -200)
    base.constant = unreal.LinearColor(0.10, 0.06, 0.03, 1.0)
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    roughness = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -500, 100)
    roughness.r = 0.5
    mel.connect_material_property(roughness, "", unreal.MaterialProperty.MP_ROUGHNESS)

    mel.recompile_material(mat)
    return mat


# ============================================================================
# Material: Navy Carpet
# ============================================================================

def create_carpet():
    log("Creating carpet material...")
    mat = get_or_create_material("M_Carpet_PBR")

    base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -500, -200)
    base.constant = unreal.LinearColor(0.015, 0.025, 0.06, 1.0)
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    roughness = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -500, 100)
    roughness.r = 0.95
    mel.connect_material_property(roughness, "", unreal.MaterialProperty.MP_ROUGHNESS)

    mel.recompile_material(mat)
    return mat


# ============================================================================
# Apply materials to existing actors
# ============================================================================

def apply_to_actors(label_contains, material, description=""):
    """Find all actors whose label contains the string and apply material."""
    actors = find_actors_by_label(label_contains)
    count = 0
    for a in actors:
        set_actor_material(a, material)
        count += 1
    if count > 0:
        log(f"  Applied {description or material.get_name()} to {count} actors matching '{label_contains}'")
    return count


# ============================================================================
# Booth lighting enhancement
# ============================================================================

def enhance_booth_lighting():
    """
    Boost booth spot lights and add fill point lights to make booths
    clearly visible with coloured accent lighting.
    """
    log("Enhancing booth lighting...")

    booth_configs = {
        "pepperstone": {"color": unreal.Color(232, 25, 44, 255),  "fill": unreal.Color(255, 180, 180, 255)},
        "capital":     {"color": unreal.Color(0, 212, 170, 255),  "fill": unreal.Color(180, 255, 240, 255)},
        "basemarkets": {"color": unreal.Color(255, 215, 0, 255),  "fill": unreal.Color(255, 240, 180, 255)},
    }

    all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

    # Boost existing booth spots
    for actor in all_actors:
        label = actor.get_actor_label()
        if "Booth_Spot_" in label:
            if hasattr(actor, 'spot_light_component'):
                light = actor.spot_light_component
                light.set_editor_property("intensity", 65000.0)
                light.set_editor_property("attenuation_radius", 1000.0)
                light.set_editor_property("cast_shadows", True)
                light.set_editor_property("use_temperature", True)
                light.set_editor_property("temperature", 4500.0)

    # Add warm fill point lights inside each booth
    booth_positions = {
        "pepperstone": unreal.Vector(-2200.0, -1500.0, 200.0),
        "capital":     unreal.Vector(0.0, -1500.0, 200.0),
        "basemarkets": unreal.Vector(2200.0, -1500.0, 200.0),
    }

    for bid, pos in booth_positions.items():
        cfg = booth_configs[bid]

        # Centre fill light (warm white tinted with brand colour)
        fill = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.PointLight, pos
        )
        if fill:
            fill.set_actor_label(f"Booth_FillLight_{bid}")
            fill.set_folder_path(f"ExpoHall/Booths/{bid}/Lighting")
            comp = fill.point_light_component
            comp.set_editor_property("intensity", 25000.0)
            comp.set_editor_property("attenuation_radius", 600.0)
            comp.set_editor_property("light_color", cfg["fill"])
            comp.set_editor_property("cast_shadows", False)
            comp.set_editor_property("use_temperature", True)
            comp.set_editor_property("temperature", 4200.0)

        # Accent up-light at booth floor edge (brand colour)
        uplight_pos = unreal.Vector(pos.x, pos.y + 250.0, 15.0)
        uplight = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.RectLight, uplight_pos
        )
        if uplight:
            uplight.set_actor_label(f"Booth_Uplight_{bid}")
            uplight.set_actor_rotation(unreal.Rotator(85, 0, 0), False)  # pointing up
            uplight.set_folder_path(f"ExpoHall/Booths/{bid}/Lighting")
            comp = uplight.rect_light_component
            comp.set_editor_property("intensity", 15000.0)
            comp.set_editor_property("source_width", 400.0)
            comp.set_editor_property("source_height", 20.0)
            comp.set_editor_property("attenuation_radius", 500.0)
            comp.set_editor_property("light_color", cfg["color"])
            comp.set_editor_property("cast_shadows", False)

    log("  Booth lighting enhanced with fill + uplights")


# ============================================================================
# MAIN
# ============================================================================

def main():
    log("=" * 60)
    log("  APPLYING PBR MATERIALS + BOOTH LIGHTING")
    log("=" * 60)

    ensure_dir(MAT_DIR)

    # --- Create all PBR materials ---
    mat_marble  = create_marble_floor()
    mat_wall    = create_wall_panels()
    mat_ceiling = create_ceiling()
    mat_carpet  = create_carpet()
    mat_stage   = create_stage()

    # Broker booth materials
    broker_colors = {
        "pepperstone": unreal.LinearColor(0.91, 0.10, 0.17, 1.0),
        "capital":     unreal.LinearColor(0.0,  0.83, 0.67, 1.0),
        "basemarkets": unreal.LinearColor(1.0,  0.84, 0.0,  1.0),
    }

    booth_mats = {}
    for bid, color in broker_colors.items():
        booth_mats[bid] = {
            "accent": create_booth_accent(bid, color),
            "back":   create_booth_back(bid, color),
            "stripe": create_emissive_stripe(bid, color),
        }

    # --- Apply to actors ---
    log("\nApplying materials to hall structure...")

    apply_to_actors("Hall_Floor", mat_marble, "marble floor")
    apply_to_actors("Wall_North", mat_wall, "wall panels")
    apply_to_actors("Wall_South", mat_wall, "wall panels")
    apply_to_actors("Wall_East",  mat_wall, "wall panels")
    apply_to_actors("Wall_West",  mat_wall, "wall panels")
    apply_to_actors("Hall_Ceiling", mat_ceiling, "matte ceiling")
    apply_to_actors("Carpet_", mat_carpet, "carpet")
    apply_to_actors("Stage_Platform", mat_stage, "stage platform")

    log("\nApplying materials to broker booths...")
    for bid in broker_colors:
        apply_to_actors(f"Booth_Floor_{bid}",     mat_marble, f"{bid} booth floor")
        apply_to_actors(f"Booth_BackWall_{bid}",   booth_mats[bid]["back"], f"{bid} back wall")
        apply_to_actors(f"Booth_LeftWall_{bid}",   booth_mats[bid]["back"], f"{bid} left wall")
        apply_to_actors(f"Booth_RightWall_{bid}",  booth_mats[bid]["back"], f"{bid} right wall")
        apply_to_actors(f"Booth_Stripe_{bid}",     booth_mats[bid]["stripe"], f"{bid} stripe")
        apply_to_actors(f"Booth_FloorStripe_{bid}",booth_mats[bid]["stripe"], f"{bid} floor stripe")
        apply_to_actors(f"Booth_Counter_{bid}",    booth_mats[bid]["accent"], f"{bid} counter")
        apply_to_actors(f"Booth_CounterTop_{bid}", mat_marble, f"{bid} counter top")

    # --- Enhance booth lighting ---
    log("\nEnhancing booth lighting...")
    enhance_booth_lighting()

    # --- Summary ---
    log("\n" + "=" * 60)
    log("  MATERIALS APPLIED SUCCESSFULLY")
    log("=" * 60)
    log("  Materials created in: " + MAT_DIR)
    log("  Floor:   Polished marble (roughness 0.05–0.12, procedural veins)")
    log("  Walls:   Dark charcoal panels (roughness 0.65–0.80, groove texture)")
    log("  Ceiling: Matte black (roughness 0.97)")
    log("  Booths:  3 accent + 3 back + 3 emissive stripe materials")
    log("  Lighting: Fill lights + brand-coloured uplights per booth")
    log("=" * 60)


main()
