import React, { useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { User } from "./ChatUser";

import sendSVG from "../../assets/image/send.svg";
import banChatSVG from "../../assets/image/ban-chat.svg";
import banChatActiveSVG from "../../assets/image/ban-chat-active.svg";
import handSVG from "../../assets/image/hand.svg";
import handActiveSVG from "../../assets/image/hand-active.svg";
import { useSafePromise } from "../../utils/hooks/lifecycle";

export interface ChatTypeBoxProps {
    /** Only room owner can ban chatting. */
    isCreator: boolean;
    isBan: boolean;
    currentUser?: User | null;
    disableHandRaising?: boolean;
    onBanChange: () => void;
    onMessageSend: (text: string) => Promise<void>;
    onRaiseHandChange: () => void;
}

export interface ChatTypeBoxState {
    text: string;
    isSending: boolean;
}

export const ChatTypeBox = observer<ChatTypeBoxProps>(function ChatTypeBox({
    isCreator,
    isBan,
    currentUser,
    disableHandRaising,
    onBanChange,
    onMessageSend,
    onRaiseHandChange,
}) {
    const sp = useSafePromise();
    const inputRef = useRef<HTMLInputElement>(null);
    const [text, updateText] = useState("");
    const [isSending, updateSending] = useState(false);

    const trimmedText = useMemo(() => text.trim(), [text]);

    async function sendMessage(): Promise<void> {
        if (isSending || trimmedText.length <= 0) {
            return;
        }

        updateSending(true);

        try {
            await sp(onMessageSend(text));
            updateText("");
            inputRef.current?.focus();
        } catch (e) {
            console.warn(e);
        }

        updateSending(false);
    }

    return (
        <div className="chat-typebox">
            {isCreator ? (
                <button className="chat-typebox-icon" title="禁言" onClick={onBanChange}>
                    <img src={isBan ? banChatActiveSVG : banChatSVG} />
                </button>
            ) : (
                !disableHandRaising && (
                    <button className="chat-typebox-icon" title="举手" onClick={onRaiseHandChange}>
                        <img src={currentUser?.isRaiseHand ? handActiveSVG : handSVG} />
                    </button>
                )
            )}
            {!isCreator && isBan ? (
                <span className="chat-typebox-ban-input" title="全员禁言中">
                    全员禁言中
                </span>
            ) : (
                <input
                    className="chat-typebox-input"
                    type="text"
                    placeholder="说点什么…"
                    ref={inputRef}
                    value={text}
                    onChange={e => updateText(e.currentTarget.value.slice(0, 200))}
                    onKeyPress={e => {
                        if (e.key === "Enter") {
                            sendMessage();
                        }
                    }}
                />
            )}
            <button
                className="chat-typebox-send"
                title="发送"
                onClick={sendMessage}
                disabled={isBan || isSending || trimmedText.length <= 0}
            >
                <img src={sendSVG} />
            </button>
        </div>
    );
});

export default ChatTypeBox;
