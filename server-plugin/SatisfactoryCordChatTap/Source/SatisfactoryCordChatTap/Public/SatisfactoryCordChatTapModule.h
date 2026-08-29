#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

DECLARE_LOG_CATEGORY_EXTERN(LogSatisfactoryCordChatTap, Log, All);

class FSatisfactoryCordChatTapModule : public IModuleInterface
{
public:
    virtual void StartupModule() override;
    virtual void ShutdownModule() override;

    static void EmitChatLine(const FString& PlayerName, const FString& Message);
};
