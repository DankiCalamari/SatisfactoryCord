using UnrealBuildTool;

public class SatisfactoryCordChatTap : ModuleRules
{
    public SatisfactoryCordChatTap(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "FactoryGame",
            "SML"
        });

        PrivateDependencyModuleNames.AddRange(new[]
        {
            "Projects"
        });
    }
}
