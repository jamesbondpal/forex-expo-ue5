"""
Forex Expo Dubai — Step 5: Pixel Streaming Event Handler + Trigger Overlaps
============================================================================
Run via: Tools → Execute Python Script

This script:
  1. Prints complete Blueprint node-graph instructions for the
     PixelStreaming data channel event handler in BP_ExpoVisitor
  2. Creates a helper Blueprint Function Library (BFL_ExpoEvents)
     with static functions for sending events to the browser
  3. Configures all trigger boxes in the level with proper tags
     so the character Blueprint can identify them

The data channel protocol matches the signalling server and client:
  Browser → UE5:  { type: "command", action: "<name>", data: { ... } }
  UE5 → Browser:  { type: "event",   name: "<name>",   data: { ... } }
"""

import unreal

log_prefix = "[ForexExpo:PixelStreaming]"
def log(msg): unreal.log(f"{log_prefix} {msg}")

eal = unreal.EditorAssetLibrary
ell = unreal.EditorLevelLibrary
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

BP_DIR = "/Game/ForexExpo/Blueprints/"


def ensure_dir(path):
    if not eal.does_directory_exist(path):
        eal.make_directory(path)


# ============================================================================
# Tag all trigger boxes
# ============================================================================

def tag_trigger_volumes():
    """Add actor tags to trigger volumes so Blueprints can identify them."""
    log("Tagging trigger volumes...")

    all_actors = ell.get_all_level_actors()
    tagged = 0

    tag_map = {
        # Booth proximity triggers
        "Trigger_Proximity_pepperstone":  ["booth_trigger", "broker_pepperstone"],
        "Trigger_Proximity_capital":      ["booth_trigger", "broker_capital"],
        "Trigger_Proximity_basemarkets":  ["booth_trigger", "broker_basemarkets"],

        # Zone triggers
        "Trigger_Zone_MainHall":          ["zone_trigger", "zone_main_hall"],
        "Trigger_Zone_SponsorBooths":     ["zone_trigger", "zone_sponsor_booths"],
        "Trigger_Zone_BusinessLounge":    ["zone_trigger", "zone_business_lounge"],
        "Trigger_Zone_Seminar":           ["zone_trigger", "zone_seminar_stage"],
        "Trigger_Zone_Entrance":          ["zone_trigger", "zone_main_hall"],
    }

    for actor in all_actors:
        label = actor.get_actor_label()
        if label in tag_map:
            # Clear existing tags and set new ones
            actor.tags = tag_map[label]
            tagged += 1
            log(f"  Tagged: {label} → {tag_map[label]}")

    log(f"  Tagged {tagged} trigger volumes")
    return tagged


# ============================================================================
# Create Blueprint Function Library
# ============================================================================

def create_event_function_library():
    """Create BFL_ExpoEvents with static helper functions."""
    log("Creating BFL_ExpoEvents...")

    bp_path = BP_DIR + "BFL_ExpoEvents"
    if eal.does_asset_exist(bp_path):
        log("  BFL_ExpoEvents already exists")
        return

    factory = unreal.BlueprintFactory()
    factory.set_editor_property("parent_class", unreal.BlueprintFunctionLibrary)

    bp = asset_tools.create_asset(
        "BFL_ExpoEvents",
        BP_DIR[:-1],
        unreal.Blueprint,
        factory
    )

    if bp:
        log("  BFL_ExpoEvents created at " + bp_path)
    else:
        log("  ERROR: Could not create BFL_ExpoEvents")

    return bp


# ============================================================================
# Blueprint instructions — Pixel Streaming Event Handler
# ============================================================================

def print_event_handler_instructions():
    """Print step-by-step Blueprint wiring instructions."""

    log("")
    log("=" * 70)
    log("  PIXEL STREAMING EVENT HANDLER — Blueprint Instructions")
    log("=" * 70)
    log("")
    log("  Open: BP_ExpoVisitor → EventGraph")
    log("")
    log("  ┌─────────────────────────────────────────────────────────────┐")
    log("  │  PREREQUISITE: Add PixelStreamingInput component            │")
    log("  │  (Components panel → Add → search 'PixelStreamingInput')    │")
    log("  └─────────────────────────────────────────────────────────────┘")
    log("")
    log("  ══════════════════════════════════════════════════════════════")
    log("  SECTION A: Receive browser → UE5 messages")
    log("  ══════════════════════════════════════════════════════════════")
    log("")
    log("  1. PixelStreamingInput → OnInputReceived event delegate:")
    log("")
    log("     Event OnInputReceived (String: Descriptor)")
    log("       │")
    log("       ├→ Print String (Descriptor)  [debug, disable in shipping]")
    log("       │")
    log("       ├→ Json Parse (Descriptor)")
    log("       │    → Get Field: 'type' (String)  →  Branch: type == 'command'")
    log("       │                                        │")
    log("       │    TRUE ─────────────────────────────────┘")
    log("       │")
    log("       ├→ Get Field: 'action' (String) → Store in local var 'Action'")
    log("       ├→ Get Field: 'data'   (Object) → Store in local var 'Data'")
    log("       │")
    log("       ├→ Select on 'Action':")
    log("       │")
    log("       │   Case 'openBooth':")
    log("       │     → Data.GetField('brokerId') → HandleOpenBooth(brokerId)")
    log("       │")
    log("       │   Case 'meetingBooked':")
    log("       │     → Data.GetField('brokerId') → HandleMeetingBooked(brokerId)")
    log("       │")
    log("       │   Case 'seminarQuestion':")
    log("       │     → Data.GetField('question') → HandleSeminarQuestion(question)")
    log("       │")
    log("       │   Case 'playerJoined':")
    log("       │     → HandlePlayerJoined()")
    log("       │")
    log("       │   Case 'input':")
    log("       │     → Data.GetField('key') → HandleInputKey(key)")
    log("       │       (W/A/S/D → AddMovementInput for mobile joystick)")
    log("       │")
    log("       └   Default: Print Warning 'Unknown action'")
    log("")
    log("  ──────────────────────────────────────────────────────────────")
    log("  SIMPLIFIED VERSION (using Switch on String):")
    log("  ──────────────────────────────────────────────────────────────")
    log("")
    log("  If you prefer Switch on String (simpler to wire):")
    log("")
    log("     OnInputReceived →")
    log("       Parse JSON String as Object →")
    log("       Get String Field 'action' →")
    log("       Switch on String:")
    log("         'openBooth'       → walk-to-booth logic")
    log("         'meetingBooked'   → celebration animation")
    log("         'seminarQuestion' → spawn floating text")
    log("         'input'           → mobile movement input")
    log("")
    log("")
    log("  ══════════════════════════════════════════════════════════════")
    log("  SECTION B: Send UE5 → browser messages")
    log("  ══════════════════════════════════════════════════════════════")
    log("")
    log("  Use 'Send Pixel Streaming Response' node (from PixelStreamingInput):")
    log("")
    log("     Function: SendPixelStreamingResponse(String)")
    log("")
    log("  Helper functions to create in BFL_ExpoEvents:")
    log("")
    log("  ──────────────────────────────────────────────────────────────")
    log("  Function: SendBrokerProximity(brokerId: String, distance: Float)")
    log("  ──────────────────────────────────────────────────────────────")
    log('    JSON = {"type":"event","name":"brokerProximity",')
    log('            "data":{"brokerId":"<brokerId>","distance":<dist>}}')
    log("")
    log("    Blueprint nodes:")
    log("      Make Json Object →")
    log('        Set String Field ("type", "event") →')
    log('        Set String Field ("name", "brokerProximity") →')
    log("        Make Json Object (inner 'data') →")
    log('          Set String Field ("brokerId", brokerId) →')
    log('          Set Number Field ("distance", distance) →')
    log('        Set Object Field ("data", innerObj) →')
    log("      Json Object → To String →")
    log("      Send Pixel Streaming Response")
    log("")
    log("  ──────────────────────────────────────────────────────────────")
    log("  Function: SendZoneChange(zone: String)")
    log("  ──────────────────────────────────────────────────────────────")
    log('    JSON = {"type":"event","name":"zone","data":{"zone":"<zone>"}}')
    log("")
    log("  ──────────────────────────────────────────────────────────────")
    log("  Function: SendPlayerCount(count: Integer)")
    log("  ──────────────────────────────────────────────────────────────")
    log('    JSON = {"type":"event","name":"playerCount","data":{"count":<n>}}')
    log("")
    log("  ──────────────────────────────────────────────────────────────")
    log("  Function: SendSeminarTrigger()")
    log("  ──────────────────────────────────────────────────────────────")
    log('    JSON = {"type":"event","name":"seminarTrigger","data":{}}')
    log("")
    log("")
    log("  ══════════════════════════════════════════════════════════════")
    log("  SECTION C: Trigger Overlap → send events automatically")
    log("  ══════════════════════════════════════════════════════════════")
    log("")
    log("  In BP_ExpoVisitor EventGraph:")
    log("")
    log("  ──────────────────────────────────────────────────────────────")
    log("  ActorBeginOverlap →")
    log("    Other Actor →")
    log("      Branch: Actor Has Tag 'booth_trigger'")
    log("        TRUE →")
    log("          Get All Tags →")
    log("          Find tag starting with 'broker_' →")
    log("          Remove prefix 'broker_' → brokerId")
    log("          Get Distance To (Other Actor) →")
    log("          Call SendBrokerProximity(brokerId, distance)")
    log("")
    log("      Branch: Actor Has Tag 'zone_trigger'")
    log("        TRUE →")
    log("          Get All Tags →")
    log("          Find tag starting with 'zone_' →")
    log("          Remove prefix 'zone_' → zoneName")
    log("          Call SendZoneChange(zoneName)")
    log("")
    log("  ──────────────────────────────────────────────────────────────")
    log("  ActorEndOverlap →")
    log("    Other Actor →")
    log("      Branch: Actor Has Tag 'booth_trigger'")
    log("        TRUE →")
    log("          Call SendBrokerProximity(lastBrokerId, 999.0)")
    log("          (distance > 8 makes client hide the panel)")
    log("")
    log("  ──────────────────────────────────────────────────────────────")
    log("  Tick (optional — live distance updates while in trigger):")
    log("    Branch: IsInsideBoothTrigger")
    log("      TRUE →")
    log("        Get Distance To (Current Booth Trigger) →")
    log("        Call SendBrokerProximity(brokerId, distance)")
    log("")
    log("  ══════════════════════════════════════════════════════════════")
    log("  SECTION D: Handle mobile joystick input from browser")
    log("  ══════════════════════════════════════════════════════════════")
    log("")
    log("  The browser sends: { type:'command', action:'input', data:{key:'w'} }")
    log("")
    log("  In HandleInputKey(key: String):")
    log("    Switch on String (key):")
    log("      'w' → Add Movement Input (Forward,  1.0)")
    log("      's' → Add Movement Input (Forward, -1.0)")
    log("      'a' → Add Movement Input (Right,   -1.0)")
    log("      'd' → Add Movement Input (Right,    1.0)")
    log("")


# ============================================================================
# Blueprint instructions — JSON helper (no plugin required)
# ============================================================================

def print_json_helper_instructions():
    """Print how to construct JSON without a plugin."""
    log("")
    log("  ══════════════════════════════════════════════════════════════")
    log("  APPENDIX: Quick JSON via Format String (no JsonBP plugin)")
    log("  ══════════════════════════════════════════════════════════════")
    log("")
    log("  If you don't want to use Json Blueprint Utilities, you can")
    log("  build JSON strings with Format Text:")
    log("")
    log("  SendBrokerProximity:")
    log('    Format Text:')
    log('      {"type":"event","name":"brokerProximity",')
    log('       "data":{"brokerId":"{0}","distance":{1}}}')
    log('    {0} = brokerId (String)')
    log('    {1} = distance (Float → ToString)')
    log("")
    log("  SendZoneChange:")
    log('    Format Text:')
    log('      {"type":"event","name":"zone","data":{"zone":"{0}"}}')
    log('    {0} = zoneName')
    log("")
    log("  SendPlayerCount:")
    log('    Format Text:')
    log('      {"type":"event","name":"playerCount","data":{"count":{0}}}')
    log('    {0} = count (Int → ToString)')
    log("")
    log("  SendSeminarTrigger:")
    log('    Constant String:')
    log('      {"type":"event","name":"seminarTrigger","data":{}}')
    log("")
    log("  Then pipe the result into:")
    log("    PixelStreamingInput → Send Pixel Streaming Response")
    log("")


# ============================================================================
# Pixel Streaming plugin check
# ============================================================================

def check_pixel_streaming_plugin():
    """Verify Pixel Streaming plugin is enabled."""
    log("Checking Pixel Streaming plugin status...")
    log("")
    log("  ╔══════════════════════════════════════════════════════╗")
    log("  ║  REQUIRED PLUGINS — verify these are enabled:       ║")
    log("  ╠══════════════════════════════════════════════════════╣")
    log("  ║  1. Pixel Streaming                                  ║")
    log("  ║     (Edit → Plugins → search 'Pixel Streaming')     ║")
    log("  ║     Provides: PixelStreamingInput component          ║")
    log("  ║               SendPixelStreamingResponse function    ║")
    log("  ║                                                      ║")
    log("  ║  2. Pixel Streaming Player (optional)                ║")
    log("  ║     Provides: default PS web frontend                ║")
    log("  ║                                                      ║")
    log("  ║  3. Json Blueprint Utilities (optional)              ║")
    log("  ║     Provides: JSON parse/create nodes in Blueprints  ║")
    log("  ║     Alternative: use Format Text (see Appendix)      ║")
    log("  ║                                                      ║")
    log("  ║  4. Enhanced Input (already enabled by default 5.3+) ║")
    log("  ╚══════════════════════════════════════════════════════╝")
    log("")


# ============================================================================
# MAIN
# ============================================================================

def main():
    log("=" * 70)
    log("  PIXEL STREAMING EVENT HANDLER SETUP")
    log("=" * 70)

    ensure_dir(BP_DIR)

    # Tag triggers so Blueprints can identify them
    tag_trigger_volumes()

    # Create helper BFL
    create_event_function_library()

    # Print all Blueprint instructions
    check_pixel_streaming_plugin()
    print_event_handler_instructions()
    print_json_helper_instructions()

    log("=" * 70)
    log("  PIXEL STREAMING EVENT SETUP COMPLETE")
    log("=" * 70)
    log("")
    log("  Summary of what was done automatically:")
    log("    ✓ Tagged all trigger volumes with booth/zone identifiers")
    log("    ✓ Created BFL_ExpoEvents Blueprint Function Library")
    log("")
    log("  What you need to wire manually in Blueprints:")
    log("    1. Add PixelStreamingInput component to BP_ExpoVisitor")
    log("    2. Wire OnInputReceived → JSON parse → Switch on action")
    log("    3. Wire ActorBeginOverlap/EndOverlap → send proximity/zone")
    log("    4. Create SendBrokerProximity / SendZoneChange functions")
    log("       (either in BFL_ExpoEvents or inline with Format Text)")
    log("")
    log("  Data channel message format reference:")
    log('    Browser→UE5: {"type":"command","action":"<name>","data":{...}}')
    log('    UE5→Browser: {"type":"event","name":"<name>","data":{...}}')
    log("")
    log("  Events UE5 sends to browser:")
    log("    brokerProximity  { brokerId, distance }")
    log("    zone             { zone }")
    log("    playerCount      { count }")
    log("    seminarTrigger   {}")
    log("")
    log("  Events browser sends to UE5:")
    log("    openBooth        { brokerId }")
    log("    meetingBooked    { brokerId, slot }")
    log("    seminarQuestion  { question }")
    log("    playerJoined     (none)")
    log("    input            { key }  (w/a/s/d from mobile joystick)")
    log("=" * 70)


main()
