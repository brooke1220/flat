import React from "react";
import { Observer, observer } from "mobx-react-lite";
import classNames from "classnames";
import { VideoAvatar, VideoAvatarProps } from "../../components/VideoAvatar";

import "./OneToOneAvatar.less";

export interface OneToOneAvatarProps extends Omit<VideoAvatarProps, "children"> {}

export const OneToOneAvatar = observer<OneToOneAvatarProps>(function OneToOneAvatar({
    avatarUser,
    ...restProps
}) {
    return (
        <VideoAvatar {...restProps} avatarUser={avatarUser}>
            {(canvas, ctrlBtns) => (
                <Observer>
                    {() => (
                        <section className="one-to-one-avatar-wrap">
                            {canvas}
                            {!avatarUser.camera && (
                                <div className="one-to-one-avatar-background">
                                    <div
                                        className="video-avatar-background"
                                        style={{
                                            backgroundImage: `url(${avatarUser.avatar})`,
                                        }}
                                    ></div>
                                    <img src={avatarUser.avatar} alt="no camera" />
                                </div>
                            )}
                            <div
                                className={classNames("one-to-one-avatar-ctrl-layer", {
                                    "with-video": avatarUser.camera,
                                })}
                            >
                                <h1 className="one-to-one-avatar-title">{avatarUser.name}</h1>
                                {ctrlBtns}
                            </div>
                        </section>
                    )}
                </Observer>
            )}
        </VideoAvatar>
    );
});

export default OneToOneAvatar;
