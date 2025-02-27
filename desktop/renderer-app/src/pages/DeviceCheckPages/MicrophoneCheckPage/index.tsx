import infoSVG from "../../../assets/image/info.svg";
import successSVG from "../../../assets/image/success.svg";
import "./index.less";

import React, { useEffect, useState } from "react";
import { Button, Modal } from "antd";
import { observer } from "mobx-react-lite";
import { DeviceSelect } from "../../../components/DeviceSelect";
import { Device } from "../../../types/Device";
import { useRTCEngine } from "../../../utils/hooks/useRTCEngine";
import { DeviceCheckLayoutContainer } from "../DeviceCheckLayoutContainer";
import { useHistory, useLocation } from "react-router-dom";
import { DeviceCheckResults, DeviceCheckState } from "../utils";
import { routeConfig } from "../../../route-config";

interface SpeakerVolumeProps {
    percent: number;
}

const SpeakerVolume = observer<SpeakerVolumeProps>(function SpeakerVolume({ percent }) {
    return (
        <div className="speaker-audio-wrapper">
            <div className="speaker-audio-volume" style={{ width: `${percent}%` }} />
            <div className="speaker-audio-mask" />
        </div>
    );
});

export const MicrophoneCheckPage = (): React.ReactElement => {
    const rtcEngine = useRTCEngine();
    const [devices, setDevices] = useState<Device[]>([]);
    const [currentDeviceID, setCurrentDeviceID] = useState<string | null>(null);
    const [currentVolume, setCurrentVolume] = useState(0);
    const [resultModalVisible, showResultModal] = useState(false);
    const [micCheckState, setMicCheckState] = useState<DeviceCheckState>();
    const location = useLocation<DeviceCheckResults | undefined>();
    const history = useHistory<DeviceCheckResults>();

    const { systemCheck, cameraCheck, speakerCheck } = location.state || {};

    const isSuccess =
        // also checked undefined
        systemCheck?.hasError === false &&
        cameraCheck?.hasError === false &&
        speakerCheck?.hasError === false &&
        micCheckState?.hasError === false;

    useEffect(() => {
        setDevices(rtcEngine.getAudioRecordingDevices() as Device[]);

        const onAudioDeviceStateChanged = (): void => {
            setDevices(rtcEngine.getVideoDevices() as Device[]);
        };

        rtcEngine.on("audioDeviceStateChanged", onAudioDeviceStateChanged);

        return () => {
            rtcEngine.off("audioDeviceStateChanged", onAudioDeviceStateChanged);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rtcEngine]);

    useEffect(() => {
        if (devices.length !== 0) {
            setCurrentDeviceID(devices[0].deviceid);
        }
    }, [devices]);

    useEffect(() => {
        const groupAudioVolumeIndication = (
            _speakers: any,
            _speakerNumber: any,
            totalVolume: number,
        ): void => {
            // totalVolume value max 255
            setCurrentVolume(Math.ceil((totalVolume / 255) * 100));
        };

        if (currentDeviceID) {
            rtcEngine.setAudioRecordingDevice(currentDeviceID);
            rtcEngine.on("groupAudioVolumeIndication", groupAudioVolumeIndication);
            rtcEngine.startAudioRecordingDeviceTest(300);
        }

        return () => {
            rtcEngine.removeListener("groupAudioVolumeIndication", groupAudioVolumeIndication);
            rtcEngine.stopAudioRecordingDeviceTest();
        };
    }, [currentDeviceID, rtcEngine]);

    return (
        <DeviceCheckLayoutContainer>
            <div className="speaker-check-container">
                <p>麦克风</p>
                <DeviceSelect
                    devices={devices}
                    currentDeviceID={currentDeviceID}
                    onChange={setCurrentDeviceID}
                />
                <p>试听声音</p>
                <SpeakerVolume percent={currentVolume} />
                <div className="speaker-check-btn-container">
                    <Button
                        onClick={() => {
                            setMicCheckState({ hasError: true });
                            showResultModal(true);
                        }}
                    >
                        不能听到
                    </Button>
                    <Button
                        type="primary"
                        onClick={() => {
                            setMicCheckState({ hasError: false });
                            showResultModal(true);
                        }}
                    >
                        能听到
                    </Button>
                </div>
                <Modal
                    width={368}
                    className="check-result-modal"
                    visible={resultModalVisible}
                    destroyOnClose
                    title={renderTitle()}
                    footer={renderFooter()}
                    onOk={() => showResultModal(false)}
                    onCancel={() => showResultModal(false)}
                >
                    <div className="table">
                        <div className="left">系统检测</div>{" "}
                        <div className="middle">{renderDescription("systemCheck")}</div>
                        <div className="right">{renderSummary("systemCheck")}</div>
                        <div className="left">摄像头检测</div>{" "}
                        <div className="middle">{renderDescription("cameraCheck")}</div>
                        <div className="right">{renderSummary("cameraCheck")}</div>
                        <div className="left">扬声器检测</div>{" "}
                        <div className="middle">{renderDescription("speakerCheck")}</div>
                        <div className="right">{renderSummary("speakerCheck")}</div>
                        <div className="left">麦克风检测</div>{" "}
                        <div className="middle">{renderDescription("microphoneCheck")}</div>
                        <div className="right">{renderSummary("microphoneCheck")}</div>
                    </div>
                </Modal>
            </div>
        </DeviceCheckLayoutContainer>
    );

    function resetCheck(): void {
        history.push(routeConfig.SystemCheckPage.path);
    }

    function renderTitle(): React.ReactNode {
        if (isSuccess) {
            return (
                <div className="device-check-modal-title">
                    <img src={successSVG} alt="success" />
                    设备检测成功
                </div>
            );
        } else {
            return (
                <div className="device-check-modal-title">
                    <img src={infoSVG} alt="info" />
                    设备检测异常
                </div>
            );
        }
    }

    function renderFooter(): React.ReactNode {
        if (!isSuccess) {
            return (
                <Button type="primary" onClick={resetCheck} className="device-check-modal-btn">
                    重新检测
                </Button>
            );
        } else {
            return (
                <Button
                    type="primary"
                    onClick={() => showResultModal(false)}
                    className="device-check-modal-btn"
                >
                    完成
                </Button>
            );
        }
    }

    function renderDescription(key: keyof DeviceCheckResults): React.ReactNode {
        const deviceCheckState: DeviceCheckState | undefined =
            key === "microphoneCheck" ? micCheckState : location.state?.[key];

        if (!deviceCheckState) {
            return <span className="red">未检测</span>;
        }

        if (deviceCheckState.hasError) {
            return <span className="red">{deviceCheckState.content || "检测失败"}</span>;
        }

        return <span className="success">{deviceCheckState.content}</span>;
    }

    function renderSummary(key: keyof DeviceCheckResults): React.ReactNode {
        const deviceCheckState: DeviceCheckState | undefined =
            key === "microphoneCheck" ? micCheckState : location.state?.[key];

        if (!deviceCheckState || deviceCheckState.hasError) {
            return <span className="red">异常</span>;
        }
        return <span className="green">正常</span>;
    }
};
