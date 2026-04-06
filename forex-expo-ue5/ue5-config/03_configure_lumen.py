"""
Forex Expo Dubai — Step 3: Configure Lumen + Rendering Settings
================================================================
Run via: Tools → Execute Python Script

Sets all rendering CVars for photorealistic Lumen GI, reflections,
Virtual Shadow Maps, Nanite, and Pixel Streaming-optimised quality.
Also configures the PostProcessVolume in the level.
"""

import unreal

log_prefix = "[ForexExpo:Lumen]"
def log(msg): unreal.log(f"{log_prefix} {msg}")

ell = unreal.EditorLevelLibrary


# ============================================================================
# Console Variable Settings
# ============================================================================

RENDERING_CVARS = {
    # --- Lumen Global Illumination ---
    "r.DynamicGlobalIlluminationMethod":     "1",   # 1 = Lumen
    "r.Lumen.DiffuseIndirect.Allow":         "1",
    "r.Lumen.Reflections.Allow":             "1",
    "r.Lumen.TraceMeshSDFs":                 "1",
    "r.Lumen.HardwareRayTracing":            "1",   # Use HW RT if available
    "r.Lumen.HardwareRayTracing.LightingMode": "0", # 0=SurfaceCache (faster)
    "r.Lumen.ScreenProbeGather.ScreenSpaceBentNormal": "1",

    # --- Lumen Reflections ---
    "r.ReflectionMethod":                    "1",   # 1 = Lumen
    "r.Lumen.Reflections.ScreenSpaceReflections": "1",

    # --- Virtual Shadow Maps ---
    "r.Shadow.Virtual.Enable":               "1",
    "r.Shadow.Virtual.MaxPhysicalPages":      "4096",
    "r.Shadow.Virtual.ResolutionLodBiasDirectional": "-0.5",

    # --- Nanite ---
    "r.Nanite":                              "1",

    # --- Anti-Aliasing ---
    "r.AntiAliasingMethod":                  "4",   # TSR
    "r.TSR.Quality":                         "3",   # High

    # --- Post-Processing ---
    "r.DefaultFeature.Bloom":                "True",
    "r.DefaultFeature.AmbientOcclusion":     "True",
    "r.DepthOfFieldQuality":                 "0",   # Off for streaming
    "r.MotionBlurQuality":                   "0",   # Off for streaming (input lag)

    # --- Streaming performance ---
    "r.ScreenPercentage":                    "100",
    "t.MaxFPS":                              "60",
    "r.VSync":                               "0",   # Pixel Streaming handles sync
}


def apply_cvars():
    """Apply all rendering console variables."""
    log("Applying rendering CVars...")
    for cvar, value in RENDERING_CVARS.items():
        unreal.SystemLibrary.execute_console_command(None, f"{cvar} {value}")
        log(f"  {cvar} = {value}")
    log(f"  Applied {len(RENDERING_CVARS)} CVars")


# ============================================================================
# Post-Process Volume configuration
# ============================================================================

def configure_post_process_volume():
    """Find or create the PostProcessVolume and set photorealistic settings."""
    log("Configuring PostProcessVolume...")

    ppv = None
    all_actors = ell.get_all_level_actors()
    for actor in all_actors:
        if isinstance(actor, unreal.PostProcessVolume):
            ppv = actor
            break

    if not ppv:
        log("  No PostProcessVolume found, creating one...")
        ppv = ell.spawn_actor_from_class(
            unreal.PostProcessVolume, unreal.Vector(0, 0, 300)
        )
        if ppv:
            ppv.set_actor_label("Hall_PostProcess")
            ppv.set_folder_path("ExpoHall/Lighting")

    if not ppv:
        log("  ERROR: Could not create PostProcessVolume")
        return

    ppv.set_editor_property("unbound", True)  # Infinite extent

    s = ppv.settings

    # --- Exposure ---
    s.set_editor_property("override_auto_exposure_method", True)
    s.set_editor_property("auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL)
    s.set_editor_property("override_auto_exposure_bias", True)
    s.set_editor_property("auto_exposure_bias", 0.0)

    # --- Bloom ---
    s.set_editor_property("override_bloom_intensity", True)
    s.set_editor_property("bloom_intensity", 0.25)
    s.set_editor_property("override_bloom_threshold", True)
    s.set_editor_property("bloom_threshold", 1.2)

    # --- Ambient Occlusion (Lumen screen-trace AO) ---
    s.set_editor_property("override_ambient_occlusion_intensity", True)
    s.set_editor_property("ambient_occlusion_intensity", 0.5)
    s.set_editor_property("override_ambient_occlusion_radius", True)
    s.set_editor_property("ambient_occlusion_radius", 200.0)

    # --- Vignette ---
    s.set_editor_property("override_vignette_intensity", True)
    s.set_editor_property("vignette_intensity", 0.2)

    # --- Color Grading ---
    s.set_editor_property("override_color_saturation", True)
    s.set_editor_property("color_saturation", unreal.Vector4(1.08, 1.08, 1.08, 1.0))
    s.set_editor_property("override_color_contrast", True)
    s.set_editor_property("color_contrast", unreal.Vector4(1.1, 1.1, 1.1, 1.0))
    s.set_editor_property("override_color_gain", True)
    s.set_editor_property("color_gain", unreal.Vector4(1.0, 0.98, 0.95, 1.0))  # slight warm tint

    # --- Film grain (very subtle for realism) ---
    s.set_editor_property("override_film_grain_intensity", True)
    s.set_editor_property("film_grain_intensity", 0.02)

    # --- Chromatic Aberration (off for clean stream) ---
    s.set_editor_property("override_scene_fringe_intensity", True)
    s.set_editor_property("scene_fringe_intensity", 0.0)

    # --- Lumen-specific PPV settings ---
    s.set_editor_property("override_lumen_scene_lighting_quality", True)
    s.set_editor_property("lumen_scene_lighting_quality", 3.0)  # High
    s.set_editor_property("override_lumen_scene_detail", True)
    s.set_editor_property("lumen_scene_detail", 2.0)  # High detail
    s.set_editor_property("override_lumen_scene_view_distance", True)
    s.set_editor_property("lumen_scene_view_distance", 20000.0)
    s.set_editor_property("override_lumen_final_gather_quality", True)
    s.set_editor_property("lumen_final_gather_quality", 3.0)
    s.set_editor_property("override_lumen_max_trace_distance", True)
    s.set_editor_property("lumen_max_trace_distance", 15000.0)
    s.set_editor_property("override_lumen_reflection_quality", True)
    s.set_editor_property("lumen_reflection_quality", 3.0)

    ppv.settings = s
    log("  PostProcessVolume configured for photorealistic rendering")
    log("  Lumen quality: High, manual exposure, subtle bloom + vignette")


# ============================================================================
# Skylight recapture
# ============================================================================

def recapture_skylight():
    """Tell any existing skylight to recapture."""
    log("Recapturing skylight...")
    all_actors = ell.get_all_level_actors()
    for actor in all_actors:
        if isinstance(actor, unreal.SkyLight):
            comp = actor.sky_light_component
            comp.set_editor_property("source_type",
                                      unreal.SkyLightSourceType.SLS_CAPTURED_SCENE)
            comp.set_editor_property("intensity", 2.0)
            comp.recapture_sky()
            log(f"  Recaptured skylight: {actor.get_actor_label()}")
            return
    log("  No skylight found to recapture")


# ============================================================================
# MAIN
# ============================================================================

def main():
    log("=" * 60)
    log("  CONFIGURING LUMEN + RENDERING")
    log("=" * 60)

    apply_cvars()
    configure_post_process_volume()
    recapture_skylight()

    log("\n" + "=" * 60)
    log("  LUMEN CONFIGURATION COMPLETE")
    log("=" * 60)
    log("  Lumen GI:          Enabled (HW Ray Tracing if available)")
    log("  Lumen Reflections: Enabled (SSR + trace)")
    log("  Shadow Maps:       Virtual Shadow Maps")
    log("  Nanite:            Enabled")
    log("  Anti-Aliasing:     TSR (High)")
    log("  PostProcess:       Manual exposure, bloom, AO, vignette")
    log("  Motion Blur:       OFF (Pixel Streaming)")
    log("  DOF:               OFF (Pixel Streaming)")
    log("")
    log("  IMPORTANT: For these settings to persist across sessions,")
    log("  ensure DefaultEngine.ini contains the matching values.")
    log("  (Already provided in ue5-config/Config/DefaultEngine.ini)")
    log("=" * 60)


main()
