"""
Forex Expo Dubai — Step 7: Final Dramatic Overhaul
====================================================
Run via: Tools → Execute Python Script

One comprehensive script that fixes everything:
  1. Dark polished navy floor (applied to ALL "Floor" actors)
  2. Stylized cylinder+sphere people (no mannequin dependency)
  3. Massive overhead booth lights + volumetric fog
  4. Black sky sphere background
  5. Cinematic screenshot with all editor icons hidden
"""

import unreal
import random
import math

P = "[ForexExpo:Final]"
def log(msg): unreal.log(f"{P} {msg}")

mel = unreal.MaterialEditingLibrary
eal = unreal.EditorAssetLibrary
ell = unreal.EditorLevelLibrary
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

MAT_DIR = "/Game/ForexExpo/Materials/"

BOOTHS = [
    {"id": "pepperstone", "name": "PEPPERSTONE", "display": "Pepperstone",
     "color": unreal.LinearColor(0.91, 0.10, 0.17, 1.0),
     "cb": unreal.Color(232, 25, 44, 255),
     "pos": unreal.Vector(-2200, -1500, 0), "sx": 800, "sy": 600, "wh": 350},
    {"id": "capital", "name": "CAPITAL.COM", "display": "Capital.com",
     "color": unreal.LinearColor(0.0, 0.83, 0.67, 1.0),
     "cb": unreal.Color(0, 212, 170, 255),
     "pos": unreal.Vector(0, -1500, 0), "sx": 600, "sy": 500, "wh": 320},
    {"id": "basemarkets", "name": "BASE MARKETS", "display": "Base Markets",
     "color": unreal.LinearColor(1.0, 0.84, 0.0, 1.0),
     "cb": unreal.Color(255, 215, 0, 255),
     "pos": unreal.Vector(2200, -1500, 0), "sx": 500, "sy": 400, "wh": 300},
]


def ensure_dir(p):
    if not eal.does_directory_exist(p):
        eal.make_directory(p)


def make_mat(name):
    """Delete-and-recreate a material by name."""
    path = MAT_DIR + name
    if eal.does_asset_exist(path):
        eal.delete_asset(path)
    f = unreal.MaterialFactoryNew()
    return asset_tools.create_asset(name, MAT_DIR[:-1], unreal.Material, f)


def apply_mat(actor, mat):
    """Apply material to slot 0 of any static mesh actor."""
    if not actor or not mat:
        return
    if hasattr(actor, 'static_mesh_component') and actor.static_mesh_component:
        actor.static_mesh_component.set_material(0, mat)
    else:
        comps = actor.get_components_by_class(unreal.StaticMeshComponent)
        if comps:
            comps[0].set_material(0, mat)


def exec_cmd(cmd):
    """Execute a console command."""
    unreal.SystemLibrary.execute_console_command(None, cmd)


# ============================================================================
# 1. DARK POLISHED NAVY FLOOR
# ============================================================================

def create_dark_floor_material():
    """
    Dark navy polished floor — simple but beautiful.
    Base color: #0d1428 with subtle noise variation
    Roughness: 0.06 (mirror-like polish)
    Specular: 0.9 (strong reflections under Lumen)
    """
    log("Creating dark polished floor material...")
    mat = make_mat("M_DarkNavyFloor")
    if not mat:
        return None

    # World-position UVs for tiling
    wpos = mel.create_material_expression(mat, unreal.MaterialExpressionWorldPosition, -1400, 0)
    scale = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -1400, 100)
    scale.constant = unreal.LinearColor(0.005, 0.005, 0.0, 1.0)
    uv = mel.create_material_expression(mat, unreal.MaterialExpressionMultiply, -1200, 50)
    mel.connect_material_expressions(wpos, "", uv, "A")
    mel.connect_material_expressions(scale, "", uv, "B")

    # Noise for subtle colour variation
    noise = mel.create_material_expression(mat, unreal.MaterialExpressionNoise, -1000, 50)
    noise.set_editor_property("scale", 1.0)
    noise.set_editor_property("quality", 2)
    noise.set_editor_property("noise_function", unreal.NoiseFunction.NOISEFUNCTION_GRADIENT_ALU)
    noise.set_editor_property("output_min", 0.85)
    noise.set_editor_property("output_max", 1.0)
    mel.connect_material_expressions(uv, "", noise, "Position")

    # Base navy color #0d1428 = (0.05, 0.08, 0.16)
    navy = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -800, -50)
    navy.constant = unreal.LinearColor(0.05, 0.08, 0.16, 1.0)

    # Modulate with noise
    base_final = mel.create_material_expression(mat, unreal.MaterialExpressionMultiply, -600, 0)
    mel.connect_material_expressions(navy, "", base_final, "A")
    mel.connect_material_expressions(noise, "", base_final, "B")
    mel.connect_material_property(base_final, "", unreal.MaterialProperty.MP_BASE_COLOR)

    # Metallic: 0
    metallic = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -600, 120)
    metallic.r = 0.0
    mel.connect_material_property(metallic, "", unreal.MaterialProperty.MP_METALLIC)

    # Roughness: 0.06 — very polished
    rough = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -600, 200)
    rough.r = 0.06
    mel.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

    # Specular: 0.9 — strong reflections
    spec = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -600, 280)
    spec.r = 0.9
    mel.connect_material_property(spec, "", unreal.MaterialProperty.MP_SPECULAR)

    mel.recompile_material(mat)
    log("  Dark navy floor: roughness 0.06, specular 0.9")
    return mat


def apply_floor_material(mat):
    """Apply to ALL actors with 'Floor' in their label."""
    log("Applying floor material to all floor actors...")
    count = 0
    for actor in ell.get_all_level_actors():
        label = actor.get_actor_label()
        if "Floor" in label or "CounterTop" in label:
            apply_mat(actor, mat)
            count += 1
            log(f"  Applied to: {label}")
    log(f"  Total: {count} actors")


# ============================================================================
# 2. STYLIZED CYLINDER PEOPLE
# ============================================================================

def create_person_mat(name, color):
    """Simple coloured material for person figures."""
    mat = make_mat(f"M_Fig_{name}")
    if not mat:
        return None
    base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -400, 0)
    base.constant = color
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)
    rough = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -400, 100)
    rough.r = 0.5
    mel.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)
    mel.recompile_material(mat)
    return mat


def spawn_figure(name, pos, yaw, body_mat, head_mat, folder):
    """
    Spawn a stylized person: tall cylinder body + sphere head.
    Body: 30cm diameter, 160cm tall
    Head: 22cm sphere on top
    """
    cyl = eal.load_asset("/Engine/BasicShapes/Cylinder")
    sph = eal.load_asset("/Engine/BasicShapes/Sphere")
    if not cyl or not sph:
        return 0

    placed = 0

    # Body — cylinder default is 100 diameter × 100 tall (unit cube-ish)
    # Scale: X/Y = 0.30 (30cm diameter), Z = 1.60 (160cm tall)
    body = ell.spawn_actor_from_object(cyl, unreal.Vector(pos.x, pos.y, 80.0))
    if body:
        body.set_actor_label(f"{name}_body")
        body.set_actor_scale3d(unreal.Vector(0.30, 0.30, 1.60))
        body.set_actor_rotation(unreal.Rotator(0, yaw, 0), False)
        body.set_folder_path(folder)
        if body_mat:
            apply_mat(body, body_mat)
        placed += 1

    # Head — sphere on top
    head = ell.spawn_actor_from_object(sph, unreal.Vector(pos.x, pos.y, 175.0))
    if head:
        head.set_actor_label(f"{name}_head")
        head.set_actor_scale3d(unreal.Vector(0.22, 0.22, 0.22))
        head.set_actor_rotation(unreal.Rotator(0, yaw, 0), False)
        head.set_folder_path(folder)
        if head_mat:
            apply_mat(head, head_mat)
        placed += 1

    return placed


def remove_old_people():
    """Remove any previously placed figures from script 06."""
    removed = 0
    for actor in ell.get_all_level_actors():
        label = actor.get_actor_label()
        if (label.startswith("Agent_") or label.startswith("Visitor_") or
            label.startswith("Fig_")):
            ell.destroy_actor(actor)
            removed += 1
    if removed:
        log(f"  Cleaned up {removed} old figure actors")


def place_all_people():
    """Place 20 stylized cylinder+sphere people."""
    log("Placing stylized people...")
    remove_old_people()

    mat_agent = create_person_mat("Agent", unreal.LinearColor(0.9, 0.9, 0.92, 1.0))     # white
    mat_visitor = create_person_mat("Visitor", unreal.LinearColor(0.12, 0.25, 0.55, 1.0)) # blue
    mat_seated = create_person_mat("Seated", unreal.LinearColor(0.10, 0.18, 0.40, 1.0))   # dark blue
    mat_head = create_person_mat("Head", unreal.LinearColor(0.75, 0.60, 0.48, 1.0))       # skin tone

    total = 0
    random.seed(42)

    # --- 3 agents at each booth (9 total) ---
    for b in BOOTHS:
        bx, by = b["pos"].x, b["pos"].y
        offsets = [(-120, 80), (0, 80), (120, 80)]
        for i, (ox, oy) in enumerate(offsets):
            n = spawn_figure(
                f"Fig_Agent_{b['id']}_{i}",
                unreal.Vector(bx + ox, by + oy, 0),
                180.0,  # facing forward toward visitors
                mat_agent, mat_head,
                f"ExpoHall/People/Agents"
            )
            total += n

    log(f"  Placed 9 booth agents (white), actors: {total}")

    # --- 4 visitors in main hall ---
    hall_spots = [
        (-900, -300, 45), (500, 100, -30), (-1400, 600, 120), (1600, -500, -60),
    ]
    for i, (hx, hy, hyaw) in enumerate(hall_spots):
        n = spawn_figure(
            f"Fig_Visitor_{i}",
            unreal.Vector(hx, hy, 0),
            hyaw,
            mat_visitor, mat_head,
            f"ExpoHall/People/Visitors"
        )
        total += n

    log(f"  Placed 4 hall visitors (blue), actors: {total}")

    # --- 7 seated in seminar area (shorter bodies) ---
    seat_spots = [
        (-300, 1100), (-100, 1100), (100, 1100), (300, 1100),
        (-200, 1000), (0, 1000), (200, 1000),
    ]

    cyl = eal.load_asset("/Engine/BasicShapes/Cylinder")
    sph = eal.load_asset("/Engine/BasicShapes/Sphere")

    for i, (sx_pos, sy_pos) in enumerate(seat_spots):
        # Seated = shorter body
        body = ell.spawn_actor_from_object(cyl, unreal.Vector(sx_pos, sy_pos, 50.0))
        if body:
            body.set_actor_label(f"Fig_Seated_{i}_body")
            body.set_actor_scale3d(unreal.Vector(0.28, 0.28, 1.0))  # shorter
            body.set_actor_rotation(unreal.Rotator(0, 90, 0), False)  # facing stage
            body.set_folder_path("ExpoHall/People/Seminar")
            apply_mat(body, mat_seated)
            total += 1

        head = ell.spawn_actor_from_object(sph, unreal.Vector(sx_pos, sy_pos, 115.0))
        if head:
            head.set_actor_label(f"Fig_Seated_{i}_head")
            head.set_actor_scale3d(unreal.Vector(0.20, 0.20, 0.20))
            head.set_folder_path("ExpoHall/People/Seminar")
            apply_mat(head, mat_head)
            total += 1

    log(f"  Placed 7 seminar audience (seated), total actors: {total}")
    return total


# ============================================================================
# 3. MASSIVE OVERHEAD BOOTH LIGHTS + BOOST EXISTING
# ============================================================================

def build_massive_booth_lights():
    """Add huge coloured rect lights above each booth + boost existing spots."""
    log("Adding massive overhead booth lights...")

    # Remove old dramatic signage if re-running
    for actor in ell.get_all_level_actors():
        label = actor.get_actor_label()
        if label.startswith("Massive_") or label.startswith("LightBeam_") or label.startswith("BeamSpot_"):
            ell.destroy_actor(actor)

    for b in BOOTHS:
        pos = b["pos"]
        folder = f"ExpoHall/Booths/{b['display']}/Drama"

        # Massive coloured rect light overhead (2m × 4m)
        rl = ell.spawn_actor_from_class(unreal.RectLight,
            unreal.Vector(pos.x, pos.y, 590.0))
        if rl:
            rl.set_actor_label(f"Massive_RectLight_{b['id']}")
            rl.set_actor_rotation(unreal.Rotator(-90, 0, 0), False)  # pointing down
            rl.set_folder_path(folder)
            c = rl.rect_light_component
            c.set_editor_property("intensity", 100000.0)
            c.set_editor_property("source_width", 200.0)   # 2m
            c.set_editor_property("source_height", 400.0)  # 4m
            c.set_editor_property("attenuation_radius", 1500.0)
            c.set_editor_property("light_color", b["cb"])
            c.set_editor_property("cast_shadows", True)
            c.set_editor_property("use_temperature", False)

        # Secondary warm fill from above (white, wide)
        fl = ell.spawn_actor_from_class(unreal.RectLight,
            unreal.Vector(pos.x, pos.y + 100, 580.0))
        if fl:
            fl.set_actor_label(f"Massive_FillLight_{b['id']}")
            fl.set_actor_rotation(unreal.Rotator(-90, 0, 0), False)
            fl.set_folder_path(folder)
            c = fl.rect_light_component
            c.set_editor_property("intensity", 40000.0)
            c.set_editor_property("source_width", 300.0)
            c.set_editor_property("source_height", 200.0)
            c.set_editor_property("attenuation_radius", 1200.0)
            c.set_editor_property("light_color", unreal.Color(255, 245, 230, 255))
            c.set_editor_property("cast_shadows", False)
            c.set_editor_property("use_temperature", True)
            c.set_editor_property("temperature", 4500.0)

        log(f"  {b['name']}: 100K coloured rect + 40K warm fill")

    # Boost all existing spot lights to 50000
    boosted = 0
    for actor in ell.get_all_level_actors():
        if isinstance(actor, unreal.SpotLight):
            sl = actor.spot_light_component
            current = sl.get_editor_property("intensity")
            if current < 50000:
                sl.set_editor_property("intensity", 50000.0)
                boosted += 1
    log(f"  Boosted {boosted} spot lights to 50000 lumens")


# ============================================================================
# 4. DRAMATIC SIGNAGE (text + light columns + floor strips)
# ============================================================================

def create_emissive_mat(name, color, multiplier=8.0):
    """Emissive material for signs and strips."""
    mat = make_mat(f"M_Emit_{name}")
    if not mat:
        return None
    base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -400, -100)
    base.constant = unreal.LinearColor(min(color.r*1.2,1), min(color.g*1.2,1), min(color.b*1.2,1), 1)
    mel.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    em = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -400, 100)
    em.constant = unreal.LinearColor(color.r*multiplier, color.g*multiplier, color.b*multiplier, 1)
    mel.connect_material_property(em, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)

    r = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -400, 200)
    r.r = 0.1
    mel.connect_material_property(r, "", unreal.MaterialProperty.MP_ROUGHNESS)

    mel.recompile_material(mat)
    return mat


def create_beam_mat(name, color):
    """Additive translucent beam material."""
    mat = make_mat(f"M_Beam2_{name}")
    if not mat:
        return None
    mat.set_editor_property("blend_mode", unreal.BlendMode.BLEND_ADDITIVE)
    mat.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)

    em = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -400, 0)
    em.constant = unreal.LinearColor(color.r*4.0, color.g*4.0, color.b*4.0, 1)
    mel.connect_material_property(em, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)

    op = mel.create_material_expression(mat, unreal.MaterialExpressionConstant, -400, 150)
    op.r = 0.06
    mel.connect_material_property(op, "", unreal.MaterialProperty.MP_OPACITY)

    mel.recompile_material(mat)
    return mat


def build_signage():
    """Build dramatic signage for all booths."""
    log("Building booth signage...")

    cube = eal.load_asset("/Engine/BasicShapes/Cube")
    if not cube:
        log("  ERROR: No cube mesh")
        return

    # Remove old signage
    for actor in ell.get_all_level_actors():
        label = actor.get_actor_label()
        if (label.startswith("Sign_Big") or label.startswith("FloorStrip_") or
            label.startswith("LightBeam2_") or label.startswith("BeamSpot2_")):
            ell.destroy_actor(actor)

    for b in BOOTHS:
        pos = b["pos"]
        sx, sy, wh = b["sx"], b["sy"], b["wh"]
        color = b["color"]
        folder = f"ExpoHall/Booths/{b['display']}/Signage"

        sign_mat = create_emissive_mat(b["id"], color, 10.0)
        strip_mat = create_emissive_mat(f"{b['id']}_strip", color, 6.0)
        beam_mat = create_beam_mat(b["id"], color)

        # --- Large emissive name text ---
        txt = ell.spawn_actor_from_class(unreal.TextRenderActor,
            unreal.Vector(pos.x, pos.y - sy/2.0 + 18, wh + 100))
        if txt:
            txt.set_actor_label(f"Sign_BigName2_{b['id']}")
            txt.set_actor_rotation(unreal.Rotator(0, 0, 0), False)
            txt.set_folder_path(folder)
            tc = txt.text_render
            tc.set_editor_property("text", b["name"])
            tc.set_editor_property("world_size", 85.0)
            tc.set_editor_property("horizontal_alignment", unreal.HorizTextAligment.EHTA_CENTER)
            tc.set_editor_property("vertical_alignment", unreal.VerticalTextAligment.EVRTA_TEXT_CENTER)
            tc.set_editor_property("text_render_color", b["cb"])
            if sign_mat:
                tc.set_material(0, sign_mat)

        # --- Light beam columns (left + right) ---
        for side in [-1, 1]:
            bx = pos.x + side * (sx/2.0 + 25)
            beam = ell.spawn_actor_from_object(cube, unreal.Vector(bx, pos.y, 310))
            if beam:
                beam.set_actor_label(f"LightBeam2_{b['id']}_{('L' if side<0 else 'R')}")
                beam.set_actor_scale3d(unreal.Vector(0.12, 0.12, 6.2))
                beam.set_folder_path(folder)
                if beam_mat:
                    apply_mat(beam, beam_mat)

            # Narrow spot at top for dramatic beam
            sl = ell.spawn_actor_from_class(unreal.SpotLight,
                unreal.Vector(bx, pos.y, 610))
            if sl:
                sl.set_actor_label(f"BeamSpot2_{b['id']}_{('L' if side<0 else 'R')}")
                sl.set_actor_rotation(unreal.Rotator(-90, 0, 0), False)
                sl.set_folder_path(folder)
                c = sl.spot_light_component
                c.set_editor_property("intensity", 60000.0)
                c.set_editor_property("light_color", b["cb"])
                c.set_editor_property("inner_cone_angle", 3.0)
                c.set_editor_property("outer_cone_angle", 8.0)
                c.set_editor_property("attenuation_radius", 1200.0)
                c.set_editor_property("cast_shadows", True)

        # --- Glowing floor perimeter strips ---
        strips = [
            (f"Front", pos.x, pos.y + sy/2.0, sx/100.0, 0.04),
            (f"Back",  pos.x, pos.y - sy/2.0, sx/100.0, 0.04),
            (f"Left",  pos.x - sx/2.0, pos.y, 0.04, sy/100.0),
            (f"Right", pos.x + sx/2.0, pos.y, 0.04, sy/100.0),
        ]
        for s_name, s_x, s_y, s_sx, s_sy in strips:
            s = ell.spawn_actor_from_object(cube, unreal.Vector(s_x, s_y, 3.0))
            if s:
                s.set_actor_label(f"FloorStrip_{b['id']}_{s_name}")
                s.set_actor_scale3d(unreal.Vector(s_sx, s_sy, 0.04))
                s.set_folder_path(folder)
                if strip_mat:
                    apply_mat(s, strip_mat)

        log(f"  {b['name']}: sign + 2 beams + 2 beam spots + 4 floor strips")


# ============================================================================
# 5. BLACK SKY + VOLUMETRIC FOG
# ============================================================================

def setup_black_sky():
    """Create a black sky sphere to kill all ambient outdoor light."""
    log("Setting up black sky background...")

    # Remove any existing sky sphere/dome
    for actor in ell.get_all_level_actors():
        label = actor.get_actor_label().lower()
        cls = actor.get_class().get_name().lower()
        if "skysphere" in label or "skydome" in label or "bp_sky_sphere" in cls:
            ell.destroy_actor(actor)
            log(f"  Removed: {actor.get_actor_label()}")

    # Create a large black sphere encompassing the hall
    sphere = eal.load_asset("/Engine/BasicShapes/Sphere")
    if sphere:
        sky = ell.spawn_actor_from_object(sphere, unreal.Vector(0, 0, 0))
        if sky:
            sky.set_actor_label("BlackSkySphere")
            sky.set_actor_scale3d(unreal.Vector(200, 200, 200))  # 200m radius
            sky.set_folder_path("ExpoHall/Environment")

            # Black material
            mat = make_mat("M_BlackSky")
            if mat:
                mat.set_editor_property("two_sided", True)
                mat.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
                base = mel.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -400, 0)
                base.constant = unreal.LinearColor(0.0, 0.0, 0.0, 1.0)
                mel.connect_material_property(base, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
                mel.recompile_material(mat)
                apply_mat(sky, mat)

            log("  Black sky sphere placed (200m radius)")

    # Reduce skylight intensity to near zero (indoor only)
    for actor in ell.get_all_level_actors():
        if isinstance(actor, unreal.SkyLight):
            c = actor.sky_light_component
            c.set_editor_property("intensity", 0.3)
            c.set_editor_property("lower_hemisphere_is_solid_color", True)
            c.set_editor_property("lower_hemisphere_color", unreal.LinearColor(0.005, 0.005, 0.01, 1))
            log(f"  Reduced skylight to 0.3")


def setup_volumetric_fog():
    """Add exponential height fog with volumetric fog for visible light beams."""
    log("Setting up volumetric fog...")

    # Remove existing fog
    for actor in ell.get_all_level_actors():
        if isinstance(actor, unreal.ExponentialHeightFog):
            ell.destroy_actor(actor)

    fog = ell.spawn_actor_from_class(unreal.ExponentialHeightFog, unreal.Vector(0, 0, 100))
    if fog:
        fog.set_actor_label("Hall_VolumetricFog")
        fog.set_folder_path("ExpoHall/Environment")
        c = fog.component
        c.set_editor_property("fog_density", 0.015)  # subtle — not obscuring
        c.set_editor_property("fog_height_falloff", 0.5)
        c.set_editor_property("fog_inscattering_color", unreal.LinearColor(0.02, 0.04, 0.12, 1.0))  # deep blue
        c.set_editor_property("volumetric_fog", True)
        c.set_editor_property("volumetric_fog_scattering_distribution", 0.8)
        c.set_editor_property("volumetric_fog_albedo", unreal.Color(13, 20, 48, 255))  # #050a1e-ish
        c.set_editor_property("volumetric_fog_emissive", unreal.LinearColor(0.0, 0.0, 0.0, 1.0))
        c.set_editor_property("volumetric_fog_extinction_scale", 1.5)
        c.set_editor_property("volumetric_fog_distance", 10000.0)

        # Enable volumetric fog on all spot lights for visible beams
        exec_cmd("r.VolumetricFog 1")
        exec_cmd("r.VolumetricFog.GridPixelSize 8")

        log("  Volumetric fog enabled: density 0.015, deep blue albedo")
        log("  Light beams should now be visible in fog")


# ============================================================================
# 6. CINEMATIC SCREENSHOT
# ============================================================================

def take_cinematic_screenshot():
    """
    Hide all editor icons, move camera, take high-res screenshot.
    """
    log("Preparing cinematic screenshot...")

    # Hide editor visual noise
    exec_cmd("DisableAllScreenMessages")
    exec_cmd("show Icons 0")         # hide actor icons
    exec_cmd("show Grid 0")          # hide grid
    exec_cmd("show Sprites 0")       # hide sprite billboards
    exec_cmd("show Volumes 0")       # hide trigger volumes
    exec_cmd("show BSPSplit 0")      # hide BSP edges
    exec_cmd("show Bounds 0")        # hide bounding boxes
    exec_cmd("show NavigationNodes 0")
    exec_cmd("show Collision 0")
    exec_cmd("show Wireframe 0")
    exec_cmd("r.MotionBlurQuality 0")
    exec_cmd("r.DepthOfFieldQuality 0")

    log("  Editor icons/gizmos hidden")

    # Move viewport camera to dramatic angle
    # Looking from entrance down the main hall
    # EditorLevelLibrary doesn't have a set_viewport_camera,
    # so we use the console command
    # Teleport: X=-3000 (near entrance), Y=0 (centre), Z=200 (eye height)
    # Looking forward: Pitch=-5 (slight down), Yaw=90 (into hall)
    exec_cmd("Teleport -3000 0 200")

    log("  Camera positioned at entrance looking into hall")

    # Small delay for Lumen to converge (force a few frames)
    # Not a true delay but triggers rendering
    exec_cmd("r.Lumen.ScreenProbeGather.FullResolutionJitterWidth 0")

    # Take high-res screenshot
    log("  Taking HighResShot 2...")
    exec_cmd("HighResShot 2")

    log("  Screenshot triggered!")
    log("  Location: <YourProject>/Saved/Screenshots/")
    log("")
    log("  After verifying, restore editor visibility with:")
    log("    show Icons 1")
    log("    show Grid 1")
    log("    show Sprites 1")
    log("    show Volumes 1")


# ============================================================================
# MAIN
# ============================================================================

def main():
    log("")
    log("=" * 70)
    log("  FOREX EXPO DUBAI — FINAL DRAMATIC OVERHAUL")
    log("=" * 70)

    ensure_dir(MAT_DIR)

    # Phase 1: Floor
    log("\n" + "-" * 50)
    log(" PHASE 1: Dark Polished Navy Floor")
    log("-" * 50)
    floor_mat = create_dark_floor_material()
    if floor_mat:
        apply_floor_material(floor_mat)

    # Phase 2: People
    log("\n" + "-" * 50)
    log(" PHASE 2: Stylized People (cylinder+sphere)")
    log("-" * 50)
    people = place_all_people()

    # Phase 3: Massive booth lights
    log("\n" + "-" * 50)
    log(" PHASE 3: Massive Overhead Booth Lights")
    log("-" * 50)
    build_massive_booth_lights()

    # Phase 4: Signage
    log("\n" + "-" * 50)
    log(" PHASE 4: Dramatic Booth Signage")
    log("-" * 50)
    build_signage()

    # Phase 5: Environment
    log("\n" + "-" * 50)
    log(" PHASE 5: Black Sky + Volumetric Fog")
    log("-" * 50)
    setup_black_sky()
    setup_volumetric_fog()

    # Phase 6: Screenshot
    log("\n" + "-" * 50)
    log(" PHASE 6: Cinematic Screenshot")
    log("-" * 50)
    take_cinematic_screenshot()

    # Summary
    log("\n" + "=" * 70)
    log("  DRAMATIC OVERHAUL COMPLETE")
    log("=" * 70)
    log("")
    log("  ✓ Dark navy polished floor (roughness 0.06, specular 0.9)")
    log("    Applied to all Floor + CounterTop actors")
    log("")
    log(f"  ✓ {people} figure actors placed (cylinder+sphere people)")
    log("    9 white agents at booths")
    log("    4 blue visitors in hall")
    log("    7 dark blue seated at seminar")
    log("")
    log("  ✓ 3 massive 100K coloured rect lights (2m×4m) over booths")
    log("    + 3 warm 40K fill lights")
    log("    + all spot lights boosted to 50K lumens")
    log("")
    log("  ✓ Dramatic signage per booth:")
    log("    85cm emissive name text (10× glow)")
    log("    2 additive light beam columns")
    log("    2 narrow beam spot lights (3°/8°)")
    log("    4 glowing floor perimeter strips (6× glow)")
    log("")
    log("  ✓ Pure black sky sphere (200m radius)")
    log("    Skylight reduced to 0.3 intensity")
    log("")
    log("  ✓ Volumetric fog (density 0.015, deep blue #050a1e)")
    log("    Light beams now visible in fog")
    log("")
    log("  ✓ Cinematic screenshot taken (2× resolution)")
    log("    All editor icons/gizmos hidden")
    log("    Camera at entrance (-3000, 0, 200)")
    log("")
    log("  To restore editor icons: show Icons 1 | show Grid 1")
    log("=" * 70)


main()
