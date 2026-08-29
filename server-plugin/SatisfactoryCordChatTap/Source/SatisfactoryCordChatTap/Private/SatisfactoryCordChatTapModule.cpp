#include "SatisfactoryCordChatTapModule.h"

#define LOCTEXT_NAMESPACE "FSatisfactoryCordChatTapModule"

DEFINE_LOG_CATEGORY(LogSatisfactoryCordChatTap);

namespace
{
FString EscapeLogField(const FString& Value)
{
    FString Escaped = Value;
    Escaped.ReplaceInline(TEXT("\\"), TEXT("\\\\"));
    Escaped.ReplaceInline(TEXT("\""), TEXT("\\\""));
    Escaped.ReplaceInline(TEXT("\r"), TEXT(" "));
    Escaped.ReplaceInline(TEXT("\n"), TEXT(" "));
    return Escaped.Left(500);
}
}

void FSatisfactoryCordChatTapModule::StartupModule()
{
    UE_LOG(LogSatisfactoryCordChatTap, Display, TEXT("SatisfactoryCordChatTap loaded."));
}

void FSatisfactoryCordChatTapModule::ShutdownModule()
{
    UE_LOG(LogSatisfactoryCordChatTap, Display, TEXT("SatisfactoryCordChatTap unloaded."));
}

void FSatisfactoryCordChatTapModule::EmitChatLine(const FString& PlayerName, const FString& Message)
{
    const FString SafePlayerName = EscapeLogField(PlayerName).Left(64);
    const FString SafeMessage = EscapeLogField(Message);

    UE_LOG(
        LogSatisfactoryCordChatTap,
        Display,
        TEXT("SatisfactoryCordChatTap: [SC_CHAT] player=\"%s\" message=\"%s\""),
        *SafePlayerName,
        *SafeMessage
    );
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FSatisfactoryCordChatTapModule, SatisfactoryCordChatTap)
