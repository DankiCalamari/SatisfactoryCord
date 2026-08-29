#include "SatisfactoryCordChatTapModule.h"

#include "FGChatManager.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/PlayerState.h"
#include "Patching/NativeHookManager.h"

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

    ChatHookHandle = SUBSCRIBE_UOBJECT_METHOD_AFTER(AFGChatManager, BroadcastChatMessage, [](
        AFGChatManager*,
        const FChatMessageStruct& NewMessage,
        APlayerController* InstigatorPlayerController
    ) {
        if (NewMessage.MessageType != EFGChatMessageType::CMT_PlayerMessage)
        {
            return;
        }

        FString PlayerName = NewMessage.MessageSender.ToString();
        if (PlayerName.IsEmpty() && InstigatorPlayerController && InstigatorPlayerController->PlayerState)
        {
            PlayerName = InstigatorPlayerController->PlayerState->GetPlayerName();
        }

        FSatisfactoryCordChatTapModule::EmitChatLine(PlayerName, NewMessage.MessageText.ToString());
    });
}

void FSatisfactoryCordChatTapModule::ShutdownModule()
{
    if (ChatHookHandle.IsValid())
    {
        UNSUBSCRIBE_UOBJECT_METHOD(AFGChatManager, BroadcastChatMessage, ChatHookHandle);
    }

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
