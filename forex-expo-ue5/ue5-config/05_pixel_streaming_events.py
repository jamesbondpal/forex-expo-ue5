"""
Forex Expo Dubai — Step 5: Pixel Streaming Event Setup
========================================================
Run via: Tools → Execute Python Script

This script does TWO things automatically:
  1. Tags all trigger volumes with identifiers so Blueprints can detect them
  2. Prints complete Blueprint wiring instructions for the event handler

NO Blueprint assets are created by this script (avoids UE5 Python API
limitations with certain parent classes). All Blueprint work is manual
and documented in the output log.

Data channel protocol (matches signalling server + browser client):
  Browser → UE5:  { "type": "command", "action": "<name>", "data": { ... } }
  UE5 → Browser:  { "type": "event",   "name": "<name>",   "data": { ... } }
"""

import unreal

log_prefix = "[ForexExpo:PixelStreaming]"
def log(msg): unreal.log(f"{log_prefix} {msg}")

ell = unreal.EditorLevelLibrary


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
            actor.tags = tag_map[label]
            tagged += 1
            log(f"  Tagged: {label} → {tag_map[label]}")

    log(f"  Tagged {tagged} trigger volumes")
    return tagged


# ============================================================================
# Plugin checklist
# ============================================================================

def print_plugin_checklist():
    log("")
    log("  ╔══════════════════════════════════════════════════════╗")
    log("  ║  REQUIRED PLUGINS — verify these are enabled:       ║")
    log("  ╠══════════════════════════════════════════════════════╣")
    log("  ║  1. Pixel Streaming                                  ║")
    log("  ║     (Edit → Plugins → search 'Pixel Streaming')     ║")
    log("  ║     Provides: PixelStreamingInput component          ║")
    log("  ║               SendPixelStreamingResponse function    ║")
    log("  ║                                                      ║")
    log("  ║  2. Json Blueprint Utilities (optional)              ║")
    log("  ║     Provides: JSON parse/create nodes in Blueprints  ║")
    log("  ║     Alternative: use Format Text (see Appendix)      ║")
    log("  ║                                                      ║")
    log("  ║  3. Enhanced Input (enabled by default in UE5.3+)    ║")
    log("  ╚══════════════════════════════════════════════════════╝")
    log("")


# ============================================================================
# Blueprint wiring instructions — Character setup
# ============================================================================

def print_character_setup():
    log("")
    log("  ══════════════════════════════════════════════════════════════")
    log("  STEP 1: BP_ExpoVisitor — Component Setup")
    log("  ══════════════════════════════════════════════════════════════")
    log("")
    log("  Open BP_ExpoVisitor in the Blueprint Editor.")
    log("")
    log("  Components panel — add these:")
    log("")
    log("    PixelStreamingInput  (search 'PixelStreamingInput')")
    log("      No properties to change — just add it.")
    log("")
    log("  Verify existing components:")
    log("    CapsuleComponent (root)")
    log("      Half Height: 96,  Radius: 34")
    log("    FirstPersonCamera (child of capsule)")
    log("      Location: (0, 0, 80)")
    log("      Use Pawn Control Rotation: ✓")
    log("    CharacterMovement")
    log("      Max Walk Speed: 300")
    log("")


# ============================================================================
# Blueprint wiring — Receiving browser messages
# ============================================================================

def print_receive_instructions():
    log("")
    log("  ══════════════════════════════════════════════════════════════")
    log("  STEP 2: EventGraph — Receiving Browser → UE5 Messages")
    log("  ══════════════════════════════════════════════════════════════")
    log("")
    log("  In BP_ExpoVisitor → EventGraph tab:")
    log("")
    log("  ┌─────────────────────────────────────────────────────────┐")
    log("  │  Right-click → search 'OnInputReceived'                 │")
    log("  │  Select the event from PixelStreamingInput component    │")
    log("  └─────────────────────────────────────────────────────────┘")
    log("")
    log("  Wire the following node chain:")
    log("")
    log("     OnInputReceived (String: Descriptor)")
    log("       │")
    log("       ├→ [DEBUG] Print String (Descriptor)")
    log("       │")
    log("       ├→ Parse JSON String as Object  (Descriptor)")
    log("       │    Returns: JsonObject (or use 'Construct Json Object')")
    log("       │")
    log("       ├→ Get String Field ('action') → local var 'Action'")
    log("       │")
    log("       └→ Switch on String (Action):")
    log("           │")
    log("           ├ 'openBooth':")
    log("           │   Get String Field 'brokerId' from data →")
    log("           │   Print String ('Walk to booth: ' + brokerId)")
    log("           │   [Later: play walk animation / move to booth]")
    log("           │")
    log("           ├ 'meetingBooked':")
    log("           │   Get String Field 'brokerId' from data →")
    log("           │   Print String ('Meeting booked: ' + brokerId)")
    log("           │   [Later: play agent celebration anim]")
    log("           │")
    log("           ├ 'seminarQuestion':")
    log("           │   Get String Field 'question' from data →")
    log("           │   Print String ('Q: ' + question)")
    log("           │   [Later: spawn 3D floating text in auditorium]")
    log("           │")
    log("           ├ 'input':")
    log("           │   Get String Field 'key' from data →")
    log("           │   See SECTION D below for movement logic")
    log("           │")
    log("           └ Default:")
    log("               Print Warning ('Unknown action: ' + Action)")
    log("")
    log("  ──────────────────────────────────────────────────────────")
    log("  NOTE: If Json Blueprint Utilities plugin is NOT enabled,")
    log("  you can parse manually with string operations:")
    log("")
    log("    Find Substring '\"action\":\"' → offset + length →")
    log("    Get Substring (from offset to next '\"') = action name")
    log("")
    log("  But we strongly recommend enabling the Json BP plugin.")
    log("")


# ============================================================================
# Blueprint wiring — Sending events to browser
# ============================================================================

def print_send_instructions():
    log("")
    log("  ══════════════════════════════════════════════════════════════")
    log("  STEP 3: EventGraph — Sending UE5 → Browser Messages")
    log("  ══════════════════════════════════════════════════════════════")
    log("")
    log("  Use 'Send Pixel Streaming Response' node.")
    log("  (Drag from PixelStreamingInput component → SendPixelStreamingResponse)")
    log("")
    log("  Build JSON strings using Format Text node.")
    log("  Create these as Blueprint Macro or Function for reuse:")
    log("")
    log("  ──────────────────────────────────────────────────────────")
    log("  FUNCTION: SendBrokerProximity")
    log("    Inputs: brokerId (String), distance (Float)")
    log("  ──────────────────────────────────────────────────────────")
    log("    Format Text node:")
    log('      Format: {{"type":"event","name":"brokerProximity",')
    log('               "data":{{"brokerId":"{brokerId}","distance":{distance}}}}}')
    log("")
    log("      Note: double {{ }} to escape literal braces in Format Text.")
    log("")
    log("    Wire pins:")
    log("      {brokerId} ← brokerId input")
    log("      {distance} ← distance input (Float auto-converts)")
    log("")
    log("    → To String → Send Pixel Streaming Response")
    log("")
    log("  ──────────────────────────────────────────────────────────")
    log("  FUNCTION: SendZoneChange")
    log("    Input: zoneName (String)")
    log("  ──────────────────────────────────────────────────────────")
    log("    Format Text:")
    log('      {{"type":"event","name":"zone","data":{{"zone":"{zone}"}}}}')
    log("")
    log("    → To String → Send Pixel Streaming Response")
    log("")
    log("  ──────────────────────────────────────────────────────────")
    log("  FUNCTION: SendPlayerCount")
    log("    Input: count (Integer)")
    log("  ──────────────────────────────────────────────────────────")
    log("    Format Text:")
    log('      {{"type":"event","name":"playerCount","data":{{"count":{count}}}}}')
    log("")
    log("    → To String → Send Pixel Streaming Response")
    log("")
    log("  ──────────────────────────────────────────────────────────")
    log("  FUNCTION: SendSeminarTrigger  (no inputs)")
    log("  ──────────────────────────────────────────────────────────")
    log("    Make Literal String:")
    log('      {"type":"event","name":"seminarTrigger","data":{}}')
    log("")
    log("    → Send Pixel Streaming Response")
    log("")


# ============================================================================
# Blueprint wiring — Trigger overlaps
# ============================================================================

def print_trigger_overlap_instructions():
    log("")
    log("  ══════════════════════════════════════════════════════════════")
    log("  STEP 4: EventGraph — Trigger Overlap → Auto-send Events")
    log("  ══════════════════════════════════════════════════════════════")
    log("")
    log("  All trigger boxes are now tagged (this script did that).")
    log("  Tags applied:")
    log("    Booth triggers:  ['booth_trigger', 'broker_<id>']")
    log("    Zone triggers:   ['zone_trigger',  'zone_<name>']")
    log("")
    log("  Add these variables to BP_ExpoVisitor:")
    log("    bIsInBooth        (Boolean, default False)")
    log("    CurrentBrokerId   (String)")
    log("    CurrentBoothActor (Actor reference)")
    log("")
    log("  ──────────────────────────────────────────────────────────")
    log("  Event: ActorBeginOverlap")
    log("  ──────────────────────────────────────────────────────────")
    log("")
    log("    ActorBeginOverlap (OtherActor)")
    log("      │")
    log("      ├→ Branch: OtherActor → Actor Has Tag ('booth_trigger')")
    log("      │   TRUE →")
    log("      │     Set bIsInBooth = True")
    log("      │     Set CurrentBoothActor = OtherActor")
    log("      │     OtherActor → Get Tags → For Each Loop →")
    log("      │       Branch: Starts With 'broker_' →")
    log("      │         Right Chop (7 chars) → Set CurrentBrokerId")
    log("      │     Get Distance To (OtherActor) / 100 → distMetres")
    log("      │     Call SendBrokerProximity(CurrentBrokerId, distMetres)")
    log("      │")
    log("      └→ Branch: OtherActor → Actor Has Tag ('zone_trigger')")
    log("          TRUE →")
    log("            OtherActor → Get Tags → For Each Loop →")
    log("              Branch: Starts With 'zone_' →")
    log("                Right Chop (5 chars) → zoneName")
    log("                Call SendZoneChange(zoneName)")
    log("")
    log("  ──────────────────────────────────────────────────────────")
    log("  Event: ActorEndOverlap")
    log("  ──────────────────────────────────────────────────────────")
    log("")
    log("    ActorEndOverlap (OtherActor)")
    log("      │")
    log("      └→ Branch: OtherActor → Actor Has Tag ('booth_trigger')")
    log("          TRUE →")
    log("            Set bIsInBooth = False")
    log("            Call SendBrokerProximity(CurrentBrokerId, 999.0)")
    log("            (browser hides panel when distance > 8)")
    log("")
    log("  ──────────────────────────────────────────────────────────")
    log("  Event: Tick (optional — live distance while in booth)")
    log("  ──────────────────────────────────────────────────────────")
    log("")
    log("    Event Tick")
    log("      Branch: bIsInBooth")
    log("        TRUE →")
    log("          Get Distance To (CurrentBoothActor) / 100 → dist")
    log("          Call SendBrokerProximity(CurrentBrokerId, dist)")
    log("")
    log("    TIP: To reduce Tick overhead, use a Timer instead:")
    log("      Set Timer by Event (0.25s, looping) when entering booth")
    log("      Clear Timer when leaving booth")
    log("")


# ============================================================================
# Blueprint wiring — Mobile joystick input
# ============================================================================

def print_mobile_input_instructions():
    log("")
    log("  ══════════════════════════════════════════════════════════════")
    log("  STEP 5: Handle Mobile Joystick Input from Browser")
    log("  ══════════════════════════════════════════════════════════════")
    log("")
    log("  The browser sends: { type:'command', action:'input', data:{key:'w'} }")
    log("")
    log("  In the 'input' case of your Switch on String:")
    log("")
    log("    Get String Field 'key' from data → local var 'Key'")
    log("    Switch on String (Key):")
    log("      'w' → Get Actor Forward Vector → Add Movement Input (scale  1.0)")
    log("      's' → Get Actor Forward Vector → Add Movement Input (scale -1.0)")
    log("      'a' → Get Actor Right Vector   → Add Movement Input (scale -1.0)")
    log("      'd' → Get Actor Right Vector   → Add Movement Input (scale  1.0)")
    log("")
    log("  This lets the on-screen WASD joystick (mobile fallback UI)")
    log("  control the character via the Pixel Streaming data channel.")
    log("")


# ============================================================================
# Quick-reference summary
# ============================================================================

def print_message_reference():
    log("")
    log("  ══════════════════════════════════════════════════════════════")
    log("  DATA CHANNEL MESSAGE REFERENCE")
    log("  ══════════════════════════════════════════════════════════════")
    log("")
    log("  UE5 → Browser (send via SendPixelStreamingResponse):")
    log("  ─────────────────────────────────────────────────────")
    log('    brokerProximity  {"type":"event","name":"brokerProximity",')
    log('                      "data":{"brokerId":"pepperstone","distance":3.2}}')
    log("")
    log('    zone             {"type":"event","name":"zone",')
    log('                      "data":{"zone":"main_hall"}}')
    log("")
    log('    playerCount      {"type":"event","name":"playerCount",')
    log('                      "data":{"count":42}}')
    log("")
    log('    seminarTrigger   {"type":"event","name":"seminarTrigger","data":{}}')
    log("")
    log("  Browser → UE5 (received via OnInputReceived):")
    log("  ─────────────────────────────────────────────────────")
    log('    openBooth        {"type":"command","action":"openBooth",')
    log('                      "data":{"brokerId":"pepperstone"}}')
    log("")
    log('    meetingBooked    {"type":"command","action":"meetingBooked",')
    log('                      "data":{"brokerId":"capital","slot":"10:00 AM"}}')
    log("")
    log('    seminarQuestion  {"type":"command","action":"seminarQuestion",')
    log('                      "data":{"question":"What is risk management?"}}')
    log("")
    log('    input            {"type":"command","action":"input",')
    log('                      "data":{"key":"w"}}')
    log("")


# ============================================================================
# MAIN
# ============================================================================

def main():
    log("=" * 70)
    log("  PIXEL STREAMING EVENT HANDLER SETUP")
    log("=" * 70)

    # === Automated: tag triggers ===
    tagged = tag_trigger_volumes()

    # === Print all instructions ===
    print_plugin_checklist()
    print_character_setup()
    print_receive_instructions()
    print_send_instructions()
    print_trigger_overlap_instructions()
    print_mobile_input_instructions()
    print_message_reference()

    log("=" * 70)
    log("  SETUP COMPLETE")
    log("=" * 70)
    log("")
    log("  Done automatically:")
    log(f"    ✓ Tagged {tagged} trigger volumes with booth/zone identifiers")
    log("")
    log("  Manual Blueprint work (see instructions above):")
    log("    1. Add PixelStreamingInput component to BP_ExpoVisitor")
    log("    2. Wire OnInputReceived → parse JSON → Switch on action")
    log("    3. Create SendBrokerProximity / SendZoneChange functions")
    log("       (use Format Text nodes — no extra plugin needed)")
    log("    4. Wire ActorBeginOverlap / ActorEndOverlap → auto-send")
    log("    5. Wire mobile joystick 'input' action → AddMovementInput")
    log("=" * 70)


main()
