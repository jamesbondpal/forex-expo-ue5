"""
Forex Expo Dubai — Step 4: First-Person Character Setup
========================================================
Run via: Tools → Execute Python Script

Creates a first-person character Blueprint with:
  - Walking speed tuned for expo hall (300 cm/s walk, 500 cm/s jog)
  - Mouse-look camera
  - Collision capsule sized for a person
  - Camera at eye height (170cm)
  - Sprint via Shift key
  - Smooth camera (no head bob for streaming)

Also creates the GameMode Blueprint and sets it as the default.
"""

import unreal

log_prefix = "[ForexExpo:Character]"
def log(msg): unreal.log(f"{log_prefix} {msg}")

eal = unreal.EditorAssetLibrary
ell = unreal.EditorLevelLibrary
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

BP_DIR = "/Game/ForexExpo/Blueprints/"


def ensure_dir(path):
    if not eal.does_directory_exist(path):
        eal.make_directory(path)


# ============================================================================
# Create First-Person Character Blueprint
# ============================================================================

def create_character_blueprint():
    """
    Create BP_ExpoVisitor — a first-person Character Blueprint.
    Since Blueprint node graphs can't be fully constructed from Python,
    we create the Blueprint asset with correct components, then provide
    the EventGraph instructions for manual wiring.
    """
    log("Creating BP_ExpoVisitor character Blueprint...")

    bp_path = BP_DIR + "BP_ExpoVisitor"

    if eal.does_asset_exist(bp_path):
        log("  BP_ExpoVisitor already exists, loading...")
        return eal.load_asset(bp_path)

    # Create Blueprint from Character parent class
    factory = unreal.BlueprintFactory()
    factory.set_editor_property("parent_class", unreal.Character)

    bp = asset_tools.create_asset(
        "BP_ExpoVisitor",
        BP_DIR[:-1],
        unreal.Blueprint,
        factory
    )

    if not bp:
        log("  ERROR: Could not create BP_ExpoVisitor")
        return None

    # Get the generated class default object to set properties
    bp_gc = unreal.EditorAssetLibrary.load_asset(bp_path)

    log("  BP_ExpoVisitor created at " + bp_path)
    log("")
    log("  ╔══════════════════════════════════════════════════════╗")
    log("  ║  MANUAL SETUP REQUIRED — Open BP_ExpoVisitor        ║")
    log("  ╚══════════════════════════════════════════════════════╝")
    log("")
    log("  1. COMPONENTS (in Components panel):")
    log("     a. Select CapsuleComponent (root)")
    log("        - Capsule Half Height: 96")
    log("        - Capsule Radius: 34")
    log("")
    log("     b. Add component: Camera (name it 'FirstPersonCamera')")
    log("        - Location: (0, 0, 80)   ← eye height relative to capsule")
    log("        - Use Pawn Control Rotation: ✓ CHECKED")
    log("        - Field of View: 90")
    log("")
    log("     c. Select CharacterMovement component")
    log("        - Max Walk Speed: 300")
    log("        - Max Walk Speed Crouched: 150")
    log("        - Jump Z Velocity: 0 (no jumping)")
    log("        - Air Control: 0")
    log("        - Use Controller Rotation Yaw: ✓ CHECKED")
    log("        - Orient Rotation to Movement: ✗ UNCHECKED")
    log("")
    log("     d. Add component: PixelStreamingInput")
    log("        (Plugin: Pixel Streaming — must be enabled)")
    log("")
    log("  2. CLASS DEFAULTS (click 'Class Defaults' button):")
    log("     - Auto Possess Player: Player 0")
    log("     - Use Controller Rotation Yaw: ✓ CHECKED")
    log("     - Use Controller Rotation Pitch: ✓ CHECKED")
    log("")
    log("  3. EVENT GRAPH — paste these nodes:")
    log("     (See Step 5 script for the Pixel Streaming event handler)")
    log("")

    return bp


# ============================================================================
# Create GameMode Blueprint
# ============================================================================

def create_gamemode_blueprint():
    """Create BP_ExpoGameMode that uses BP_ExpoVisitor as default pawn."""
    log("Creating BP_ExpoGameMode...")

    bp_path = BP_DIR + "BP_ExpoGameMode"

    if eal.does_asset_exist(bp_path):
        log("  BP_ExpoGameMode already exists")
        return eal.load_asset(bp_path)

    factory = unreal.BlueprintFactory()
    factory.set_editor_property("parent_class", unreal.GameModeBase)

    bp = asset_tools.create_asset(
        "BP_ExpoGameMode",
        BP_DIR[:-1],
        unreal.Blueprint,
        factory
    )

    if not bp:
        log("  ERROR: Could not create BP_ExpoGameMode")
        return None

    log("  BP_ExpoGameMode created at " + bp_path)
    log("")
    log("  ╔══════════════════════════════════════════════════════╗")
    log("  ║  MANUAL SETUP REQUIRED — Open BP_ExpoGameMode      ║")
    log("  ╚══════════════════════════════════════════════════════╝")
    log("")
    log("  1. Click 'Class Defaults'")
    log("  2. Set 'Default Pawn Class' → BP_ExpoVisitor")
    log("  3. Set 'Player Controller Class' → PlayerController")
    log("")

    return bp


# ============================================================================
# Set World Settings
# ============================================================================

def configure_world_settings():
    """Set the GameMode override in World Settings."""
    log("Configuring World Settings...")

    bp_path = BP_DIR + "BP_ExpoGameMode"
    if not eal.does_asset_exist(bp_path):
        log("  WARNING: BP_ExpoGameMode not found, create it first")
        return

    log("")
    log("  ╔══════════════════════════════════════════════════════╗")
    log("  ║  MANUAL STEP — Set GameMode in World Settings       ║")
    log("  ╚══════════════════════════════════════════════════════╝")
    log("")
    log("  1. Open World Settings (Window → World Settings)")
    log("  2. Under 'Game Mode':")
    log("     - GameMode Override: BP_ExpoGameMode")
    log("     - Default Pawn Class: BP_ExpoVisitor (auto-filled)")
    log("")
    log("  OR set in DefaultEngine.ini:")
    log('  [/Script/EngineSettings.GameMapsSettings]')
    log('  GlobalDefaultGameMode=/Game/ForexExpo/Blueprints/BP_ExpoGameMode.BP_ExpoGameMode_C')
    log("")


# ============================================================================
# Input mappings
# ============================================================================

def setup_input_mappings():
    """
    Set up Enhanced Input mappings for WASD + mouse look.
    Prints the DefaultInput.ini entries and Blueprint instructions.
    """
    log("Input Mapping Configuration...")
    log("")
    log("  ╔══════════════════════════════════════════════════════╗")
    log("  ║  INPUT SETUP — Enhanced Input (UE5.3+)              ║")
    log("  ╚══════════════════════════════════════════════════════╝")
    log("")
    log("  OPTION A: Enhanced Input (Recommended for UE5.3+)")
    log("  ─────────────────────────────────────────────────")
    log("  1. Create Input Actions (Content Browser → right-click → Input):")
    log("")
    log("     IA_Move          Type: Axis2D (Vector2D)")
    log("     IA_Look          Type: Axis2D (Vector2D)")
    log("     IA_Sprint        Type: Digital (Bool)")
    log("     IA_Interact      Type: Digital (Bool)")
    log("")
    log("  2. Create Input Mapping Context: IMC_ExpoVisitor")
    log("     Mappings:")
    log("       IA_Move:")
    log("         W → (Y=1.0)  modifiers: [Swizzle(YXZ)]")
    log("         S → (Y=-1.0) modifiers: [Swizzle(YXZ), Negate]")
    log("         A → (X=-1.0)")
    log("         D → (X=1.0)")
    log("       IA_Look:")
    log("         Mouse XY 2D → no modifier")
    log("       IA_Sprint:")
    log("         Left Shift → pressed")
    log("       IA_Interact:")
    log("         E → pressed")
    log("")
    log("  3. In BP_ExpoVisitor EventGraph:")
    log("")
    log("     BeginPlay →")
    log("       Get Controller → Cast to PlayerController →")
    log("       Get Enhanced Input Local Player Subsystem →")
    log("       Add Mapping Context (IMC_ExpoVisitor, Priority=0)")
    log("")
    log("     IA_Move (Triggered) →")
    log("       Get Action Value (Axis2D) →")
    log("       Get Control Rotation → Break Rotator → Make Rotator (0, Yaw, 0) →")
    log("       Get Forward Vector (for Y) / Get Right Vector (for X) →")
    log("       Add Movement Input (Forward * Y)")
    log("       Add Movement Input (Right * X)")
    log("")
    log("     IA_Look (Triggered) →")
    log("       Get Action Value (Axis2D) →")
    log("       Add Controller Yaw Input (X * 0.5)")
    log("       Add Controller Pitch Input (Y * -0.5)")
    log("")
    log("     IA_Sprint (Started) →")
    log("       Get Character Movement → Set Max Walk Speed (500)")
    log("     IA_Sprint (Completed) →")
    log("       Get Character Movement → Set Max Walk Speed (300)")
    log("")
    log("  ─────────────────────────────────────────────────")
    log("  OPTION B: Legacy Input (simpler, works everywhere)")
    log("  ─────────────────────────────────────────────────")
    log("  Already configured in ue5-config/Config/DefaultInput.ini")
    log("  In BP_ExpoVisitor EventGraph:")
    log("")
    log("     InputAxis MoveForward → Add Movement Input")
    log("       (Get Actor Forward Vector, Scale=AxisValue)")
    log("     InputAxis MoveRight → Add Movement Input")
    log("       (Get Actor Right Vector, Scale=AxisValue)")
    log("     InputAxis Turn → Add Controller Yaw Input")
    log("     InputAxis LookUp → Add Controller Pitch Input")
    log("")


# ============================================================================
# MAIN
# ============================================================================

def main():
    log("=" * 60)
    log("  SETTING UP FIRST-PERSON CHARACTER")
    log("=" * 60)

    ensure_dir(BP_DIR)

    create_character_blueprint()
    create_gamemode_blueprint()
    configure_world_settings()
    setup_input_mappings()

    log("\n" + "=" * 60)
    log("  CHARACTER SETUP COMPLETE")
    log("=" * 60)
    log("  Created:")
    log("    - BP_ExpoVisitor   (First-person character)")
    log("    - BP_ExpoGameMode  (GameMode using BP_ExpoVisitor)")
    log("  Location: " + BP_DIR)
    log("")
    log("  Remaining manual steps:")
    log("  1. Open BP_ExpoVisitor → add Camera + PixelStreamingInput")
    log("  2. Open BP_ExpoGameMode → set Default Pawn Class")
    log("  3. World Settings → set GameMode Override")
    log("  4. Set up input actions (Enhanced or Legacy)")
    log("  5. Wire EventGraph (see instructions above)")
    log("=" * 60)


main()
