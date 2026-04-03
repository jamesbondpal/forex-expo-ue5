// Copyright Epic Games, Inc. All Rights Reserved.

using UnrealBuildTool;

public class ExpoVR : ModuleRules
{
	public ExpoVR(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
	
		PublicDependencyModuleNames.AddRange(new string[] { 
			"Core", 
			"CoreUObject", 
			"Engine", 
			"InputCore", 
			"EnhancedInput",
			"UMG"  // Add UMG for Widget Blueprints
		});

		PrivateDependencyModuleNames.AddRange(new string[] {
			"Slate",
			"SlateCore",  // Required for UMG
			// Uncomment if you are using online features
			// "OnlineSubsystem"
		});

		// To include OnlineSubsystemSteam, add it to the plugins section in your uproject file with the Enabled attribute set to true
	}
}
