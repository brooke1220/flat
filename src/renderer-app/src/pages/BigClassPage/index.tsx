import React from "react";
import { message } from "antd";
import classNames from "classnames";
import { RoomPhase, ViewMode } from "white-web-sdk";

import PageError from "../../PageError";
import LoadingPage from "../../LoadingPage";

import InviteButton from "../../components/InviteButton";
import { TopBar, TopBarDivider } from "../../components/TopBar";
import { TopBarRightBtn } from "../../components/TopBarRightBtn";
import { RealtimePanel } from "../../components/RealtimePanel";
import { ChatPanel } from "../../components/ChatPanel";
import { BigClassAvatar } from "./BigClassAvatar";
import { NetworkStatus } from "../../components/NetworkStatus";
import { RecordButton } from "../../components/RecordButton";
import { ClassStatus } from "../../components/ClassStatus";
import { withWhiteboardRoute, WithWhiteboardRouteProps } from "../../components/Whiteboard";
import { withRtcRoute, WithRtcRouteProps } from "../../components/Rtc";
import { withRtmRoute, WithRtmRouteProps } from "../../components/Rtm";
import { RTMUser } from "../../components/ChatPanel/ChatUser";

import { RtcChannelType } from "../../apiMiddleware/Rtc";
import { getRoom, Identity } from "../../utils/localStorage/room";
import { ipcAsyncByMain } from "../../utils/ipc";

import "./BigClassPage.less";
import { TopBarRoundBtn } from "../../components/TopBarRoundBtn";

export enum ClassStatusType {
    idle,
    started,
    paused,
    stopped,
}

export type BigClassPageState = {
    isRealtimeSideOpen: boolean;
    classStatus: ClassStatusType;
    speakingJoiner?: RTMUser;
    mainSpeaker?: RTMUser;
};

export type BigClassPageProps = WithWhiteboardRouteProps & WithRtcRouteProps & WithRtmRouteProps;

class BigClassPage extends React.Component<BigClassPageProps, BigClassPageState> {
    public constructor(props: BigClassPageProps) {
        super(props);

        const speakingJoiner = this.props.rtm.speakingJoiners[0];

        this.state = {
            isRealtimeSideOpen: true,
            classStatus: ClassStatusType.idle,
            speakingJoiner,
            mainSpeaker: speakingJoiner,
        };

        ipcAsyncByMain("set-win-size", {
            width: 1200,
            height: 700,
        });

        const room = getRoom(props.match.params.uuid);
        if (room?.roomName) {
            document.title = room.roomName;
        }
    }

    public componentDidMount() {
        if (this.props.match.params.identity !== Identity.creator) {
            // join rtc room to listen to creator events
            const { isCalling, toggleCalling } = this.props.rtc;
            if (!isCalling) {
                toggleCalling();
            }
        }
    }

    public componentDidUpdate(prevProps: BigClassPageProps): void {
        const { speakingJoiners } = this.props.rtm;
        if (prevProps.rtm.speakingJoiners !== speakingJoiners) {
            const user = speakingJoiners[0];
            const speak = user && (user.camera || user.mic);
            this.setState(
                speak
                    ? { speakingJoiner: user, mainSpeaker: user }
                    : { speakingJoiner: undefined, mainSpeaker: undefined },
                () => {
                    if (this.props.match.params.userId === user?.uuid) {
                        const { rtcEngine, channelType } = this.props.rtc.rtc;
                        if (channelType === RtcChannelType.Broadcast) {
                            rtcEngine.setClientRole(speak ? 1 : 2);
                        }
                    }
                },
            );
        }
    }

    public render(): React.ReactNode {
        const { room, phase } = this.props.whiteboard;

        if (!room) {
            return <LoadingPage />;
        }

        switch (phase) {
            case RoomPhase.Connecting ||
                RoomPhase.Disconnecting ||
                RoomPhase.Reconnecting ||
                RoomPhase.Reconnecting: {
                return <LoadingPage />;
            }
            case RoomPhase.Disconnected: {
                return <PageError />;
            }
            default: {
                return this.renderWhiteBoard();
            }
        }
    }

    private handleRoomController = (): void => {
        const { room } = this.props.whiteboard;
        if (!room) {
            return;
        }
        if (room.state.broadcastState.mode !== ViewMode.Broadcaster) {
            room.setViewMode(ViewMode.Broadcaster);
            message.success("其他用户将跟随您的视角");
        } else {
            room.setViewMode(ViewMode.Freedom);
            message.success("其他用户将停止跟随您的视角");
        }
    };

    private handleSideOpenerSwitch = (): void => {
        this.setState(state => ({ isRealtimeSideOpen: !state.isRealtimeSideOpen }));
    };

    private onVideoAvatarExpand = (): void => {
        this.setState(state => ({
            mainSpeaker:
                state.mainSpeaker?.uuid === this.props.rtm.creator?.uuid
                    ? state.speakingJoiner
                    : this.props.rtm.creator,
        }));
    };

    private toggleCalling = (): void => {
        this.props.rtc.toggleCalling(() => {
            const { userId } = this.props.match.params;
            const { isCalling } = this.props.rtc;
            const { speakingJoiners, onSpeak } = this.props.rtm;
            const speakConfigs: Array<{ userUUID: string; speak: boolean }> = [
                { userUUID: userId, speak: isCalling },
            ];
            if (isCalling) {
                this.setState({ isRealtimeSideOpen: true });
            } else {
                speakConfigs.push(
                    ...speakingJoiners.map(user => ({ userUUID: user.uuid, speak: false })),
                );
            }
            onSpeak(speakConfigs);
        });
    };

    private startClass = (): void => {
        this.setState({ classStatus: ClassStatusType.started });
    };

    private pauseClass = (): void => {
        this.setState({ classStatus: ClassStatusType.paused });
    };

    private resumeClass = (): void => {
        this.setState({ classStatus: ClassStatusType.started });
    };

    private stopClass = (): void => {
        this.setState({ classStatus: ClassStatusType.stopped });
    };

    private onCameraClick = (user: RTMUser) => {
        this.props.rtm.updateDeviceState(user.uuid, !user.camera, user.mic);
    };

    private onMicClick = (user: RTMUser) => {
        this.props.rtm.updateDeviceState(user.uuid, user.camera, !user.mic);
    };

    private openReplayPage = () => {
        // @TODO 打开到当前的录制记录中
        const { uuid, identity, userId } = this.props.match.params;
        this.props.history.push(`/replay/${identity}/${uuid}/${userId}/`);
    };

    private renderWhiteBoard(): React.ReactNode {
        return (
            <div className="realtime-box">
                <TopBar
                    left={this.renderTopBarLeft()}
                    center={this.renderTopBarCenter()}
                    right={this.renderTopBarRight()}
                />
                <div className="realtime-content">
                    {this.props.whiteboard.whiteboardElement}
                    {this.renderRealtimePanel()}
                </div>
            </div>
        );
    }

    private renderTopBarLeft(): React.ReactNode {
        const { identity } = this.props.match.params;
        const { classStatus } = this.state;

        return (
            <>
                <NetworkStatus />
                {identity === Identity.joiner && (
                    <ClassStatus isClassBegin={classStatus === ClassStatusType.started} />
                )}
            </>
        );
    }

    private renderTopBarCenter(): React.ReactNode {
        const { identity } = this.props.match.params;
        const { classStatus } = this.state;

        if (identity !== Identity.creator) {
            return null;
        }

        switch (classStatus) {
            case ClassStatusType.started:
                return (
                    <>
                        <TopBarRoundBtn iconName="class-pause" onClick={this.pauseClass}>
                            暂停上课
                        </TopBarRoundBtn>
                        <TopBarRoundBtn iconName="class-stop" onClick={this.stopClass}>
                            结束上课
                        </TopBarRoundBtn>
                    </>
                );
            case ClassStatusType.paused:
                return (
                    <>
                        <TopBarRoundBtn iconName="class-pause" onClick={this.resumeClass}>
                            恢复上课
                        </TopBarRoundBtn>
                        <TopBarRoundBtn iconName="class-stop" onClick={this.stopClass}>
                            结束上课
                        </TopBarRoundBtn>
                    </>
                );
            default:
                return (
                    <TopBarRoundBtn iconName="class-begin" onClick={this.startClass}>
                        开始上课
                    </TopBarRoundBtn>
                );
        }
    }

    private renderTopBarRight(): React.ReactNode {
        const { viewMode, toggleDocCenter } = this.props.whiteboard;
        const { isCalling, isRecording, toggleRecording } = this.props.rtc;
        const { isRealtimeSideOpen } = this.state;
        const { uuid, identity } = this.props.match.params;
        const isCreator = identity === Identity.creator;

        return (
            <>
                {isCreator && (
                    <RecordButton
                        // @TODO 待填充逻辑
                        disabled={false}
                        isRecording={isRecording}
                        onClick={() => toggleRecording()}
                    />
                )}
                {isCreator && (
                    <TopBarRightBtn
                        title="Call"
                        icon="phone"
                        active={isCalling}
                        onClick={this.toggleCalling}
                    />
                )}
                <TopBarRightBtn
                    title="Vision control"
                    icon="follow"
                    active={viewMode === ViewMode.Broadcaster}
                    onClick={this.handleRoomController}
                />
                <TopBarRightBtn title="Docs center" icon="folder" onClick={toggleDocCenter} />
                <InviteButton uuid={uuid} />
                {/* @TODO implement Options menu */}
                <TopBarRightBtn title="Options" icon="options" onClick={() => {}} />
                <TopBarDivider />
                <TopBarRightBtn
                    title="Open side panel"
                    icon="hide-side"
                    active={isRealtimeSideOpen}
                    onClick={this.handleSideOpenerSwitch}
                />
            </>
        );
    }

    private renderRealtimePanel(): React.ReactNode {
        const { uuid, userId, identity } = this.props.match.params;
        const { isCalling, rtc } = this.props.rtc;
        const { creator, updateDeviceState } = this.props.rtm;
        const { isRealtimeSideOpen, speakingJoiner, mainSpeaker } = this.state;
        const isVideoOn = identity === Identity.creator ? isCalling : !!creator?.isSpeak;

        return (
            <RealtimePanel
                isShow={isRealtimeSideOpen}
                isVideoOn={isVideoOn}
                videoSlot={
                    creator &&
                    isVideoOn && (
                        <div
                            className={classNames("whiteboard-rtc-box", {
                                "with-small": speakingJoiner,
                            })}
                        >
                            <div
                                className={classNames("whiteboard-rtc-avatar", {
                                    "is-small": mainSpeaker && mainSpeaker.uuid !== creator.uuid,
                                })}
                            >
                                <BigClassAvatar
                                    identity={identity}
                                    userId={userId}
                                    avatarUser={creator}
                                    rtcEngine={rtc.rtcEngine}
                                    updateDeviceState={updateDeviceState}
                                    small={mainSpeaker && mainSpeaker.uuid !== creator.uuid}
                                    onExpand={this.onVideoAvatarExpand}
                                />
                            </div>
                            {speakingJoiner && (
                                <div
                                    className={classNames("whiteboard-rtc-avatar", {
                                        "is-small": mainSpeaker !== speakingJoiner,
                                    })}
                                >
                                    <BigClassAvatar
                                        avatarUser={speakingJoiner}
                                        identity={identity}
                                        userId={userId}
                                        rtcEngine={rtc.rtcEngine}
                                        updateDeviceState={updateDeviceState}
                                        small={mainSpeaker !== speakingJoiner}
                                        onExpand={this.onVideoAvatarExpand}
                                    />
                                </div>
                            )}
                        </div>
                    )
                }
                chatSlot={
                    <ChatPanel
                        userId={userId}
                        channelID={uuid}
                        identity={identity}
                        rtm={this.props.rtm}
                        allowMultipleSpeakers={false}
                    ></ChatPanel>
                }
            />
        );
    }
}

export default withWhiteboardRoute(
    withRtcRoute({
        recordingConfig: {
            channelType: RtcChannelType.Broadcast,
            transcodingConfig: {
                width: 288,
                height: 216,
                // https://docs.agora.io/cn/cloud-recording/recording_video_profile
                fps: 15,
                bitrate: 280,
            },
            subscribeUidGroup: 0,
        },
    })(withRtmRoute(BigClassPage)),
);
