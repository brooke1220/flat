import { makeAutoObservable, observable } from "mobx";
import {
    createPlugins,
    DefaultHotKeys,
    DeviceType,
    Room,
    RoomPhase,
    RoomState,
    ViewMode,
    WhiteWebSdk,
} from "white-web-sdk";
import { videoPlugin } from "@netless/white-video-plugin";
import { audioPlugin } from "@netless/white-audio-plugin";
import { CursorTool } from "@netless/cursor-tool";
import { NETLESS, NODE_ENV } from "../constants/Process";
import { globalStore } from "./GlobalStore";
import { isMobile, isWindows } from "react-device-detect";

export class WhiteboardStore {
    room: Room | null = null;
    phase: RoomPhase = RoomPhase.Connecting;
    viewMode: ViewMode | null = null;
    isWritable: boolean;
    isShowPreviewPanel: boolean = false;
    isFileOpen: boolean = false;

    /** is room Creator */
    readonly isCreator: boolean;

    constructor(config: { isCreator: boolean }) {
        this.isCreator = config.isCreator;
        this.isWritable = config.isCreator;

        makeAutoObservable(this, {
            room: observable.ref,
        });
    }

    updateRoom = (room: Room): void => {
        this.room = room;
    };

    updatePhase = (phase: RoomPhase): void => {
        this.phase = phase;
    };

    updateViewMode = (viewMode: ViewMode): void => {
        this.viewMode = viewMode;
    };

    updateWritable = async (isWritable: boolean): Promise<void> => {
        const oldWritable = this.isWritable;

        this.isWritable = isWritable;

        if (oldWritable !== isWritable && this.room) {
            await this.room.setWritable(isWritable);
            this.room.disableDeviceInputs = !isWritable;
            if (isWritable) {
                this.room.disableSerialization = false;
            }
        }
    };

    setFileOpen = (open: boolean): void => {
        this.isFileOpen = open;
    };

    toggleFileOpen = (): void => {
        this.isFileOpen = !this.isFileOpen;
    };

    showPreviewPanel = (): void => {
        this.isShowPreviewPanel = true;
    };

    setPreviewPanel = (show: boolean): void => {
        this.isShowPreviewPanel = show;
    };

    async joinWhiteboardRoom(): Promise<void> {
        if (!globalStore.userUUID) {
            throw new Error("Missing userUUID");
        }

        if (!globalStore.whiteboardRoomUUID || !globalStore.whiteboardRoomToken) {
            throw new Error("Missing Whiteboard UUID and Token");
        }

        const plugins = createPlugins({ video: videoPlugin, audio: audioPlugin });
        const contextIdentity = this.isCreator ? "host" : "";
        plugins.setPluginContext("video", { identity: contextIdentity });
        plugins.setPluginContext("audio", { identity: contextIdentity });

        let deviceType: DeviceType;
        if (isWindows) {
            deviceType = DeviceType.Surface;
        } else {
            if (isMobile) {
                deviceType = DeviceType.Touch;
            } else {
                deviceType = DeviceType.Desktop;
            }
        }
        const whiteWebSdk = new WhiteWebSdk({
            appIdentifier: NETLESS.APP_IDENTIFIER,
            plugins: plugins,
            deviceType: deviceType,
            pptParams: {
                useServerWrap: true,
            },
        });

        const cursorName = globalStore.userInfo?.name;
        const cursorAdapter = new CursorTool();

        const room = await whiteWebSdk.joinRoom(
            {
                uuid: globalStore.whiteboardRoomUUID,
                roomToken: globalStore.whiteboardRoomToken,
                cursorAdapter: cursorAdapter,
                userPayload: {
                    userId: globalStore.userUUID,
                    cursorName,
                },
                floatBar: true,
                isWritable: this.isWritable,
                disableNewPencil: false,
                hotKeys: {
                    ...DefaultHotKeys,
                    changeToSelector: "s",
                    changeToLaserPointer: "z",
                    changeToPencil: "p",
                    changeToRectangle: "r",
                    changeToEllipse: "c",
                    changeToEraser: "e",
                    changeToText: "t",
                    changeToStraight: "l",
                    changeToArrow: "a",
                    changeToHand: "h",
                },
            },
            {
                onPhaseChanged: phase => {
                    this.updatePhase(phase);
                },
                onRoomStateChanged: (modifyState: Partial<RoomState>): void => {
                    if (modifyState.broadcastState) {
                        this.updateViewMode(modifyState.broadcastState.mode);
                    }
                },
                onDisconnectWithError: error => {
                    console.error(error);
                },
            },
        );

        room.disableDeviceInputs = !this.isWritable;

        cursorAdapter.setRoom(room);

        if (this.isCreator) {
            room.setMemberState({
                pencilOptions: {
                    disableBezier: false,
                    sparseHump: 1.0,
                    sparseWidth: 1.0,
                    enableDrawPoint: false,
                },
            });
        }

        if (room.state.broadcastState) {
            this.updateViewMode(room.state.broadcastState.mode);
        }

        this.updateRoom(room);

        if (NODE_ENV === "development") {
            (window as any).room = room;
        }
    }

    destroy(): void {
        if (this.room) {
            this.room.callbacks.off();
        }
        if (NODE_ENV === "development") {
            (window as any).room = null;
        }
        console.log(`Whiteboard unloaded: ${globalStore.whiteboardRoomUUID}`);
    }
}
