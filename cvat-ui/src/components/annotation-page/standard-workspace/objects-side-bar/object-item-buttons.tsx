// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Row, Col } from 'antd/lib/grid';
import Icon, {
    UnlockOutlined,
    LockFilled,
    TeamOutlined,
    UserOutlined,
    PushpinFilled,
    PushpinOutlined,
    EyeInvisibleFilled,
    StarFilled,
    SelectOutlined,
    StarOutlined,
    EyeOutlined,
} from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';
import { ObjectType, ShapeType } from 'cvat-core-wrapper';
import {
    ObjectOutsideIcon, FirstIcon, LastIcon, PreviousIcon, NextIcon,
} from 'icons';

interface Props {
    readonly: boolean;
    parentID: number | null;
    objectType: ObjectType;
    shapeType: ShapeType;
    occluded: boolean;
    outside: boolean | undefined;
    locked: boolean;
    pinned: boolean;
    hidden: boolean;
    keyframe: boolean | undefined;
    outsideDisabled: boolean;
    hiddenDisabled: boolean;
    keyframeDisabled: boolean;
    switchOccludedShortcut: string;
    switchPinnedShortcut: string;
    switchOutsideShortcut: string;
    switchLockShortcut: string;
    switchHiddenShortcut: string;
    switchKeyFrameShortcut: string;
    nextKeyFrameShortcut: string;
    prevKeyFrameShortcut: string;

    navigateFirstKeyframe: null | (() => void);
    navigatePrevKeyframe: null | (() => void);
    navigateNextKeyframe: null | (() => void);
    navigateLastKeyframe: null | (() => void);

    setOccluded(): void;
    unsetOccluded(): void;
    setOutside(): void;
    unsetOutside(): void;
    setKeyframe(): void;
    unsetKeyframe(): void;
    lock(): void;
    unlock(): void;
    pin(): void;
    unpin(): void;
    hide(): void;
    show(): void;
}

const classes = {
    firstKeyFrame: { className: 'cvat-object-item-button-first-keyframe' },
    prevKeyFrame: { className: 'cvat-object-item-button-prev-keyframe' },
    nextKeyFrame: { className: 'cvat-object-item-button-next-keyframe' },
    lastKeyFrame: { className: 'cvat-object-item-button-last-keyframe' },
    outside: {
        enabled: { className: 'cvat-object-item-button-outside cvat-object-item-button-outside-enabled' },
        disabled: { className: 'cvat-object-item-button-outside' },
    },
    lock: {
        enabled: { className: 'cvat-object-item-button-lock cvat-object-item-button-lock-enabled' },
        disabled: { className: 'cvat-object-item-button-lock' },
    },
    occluded: {
        enabled: { className: 'cvat-object-item-button-occluded cvat-object-item-button-occluded-enabled' },
        disabled: { className: 'cvat-object-item-button-occluded' },
    },
    pinned: {
        enabled: { className: 'cvat-object-item-button-pinned cvat-object-item-button-pinned-enabled' },
        disabled: { className: 'cvat-object-item-button-pinned' },
    },
    hidden: {
        enabled: { className: 'cvat-object-item-button-hidden cvat-object-item-button-hidden-enabled' },
        disabled: { className: 'cvat-object-item-button-hidden' },
    },
    keyframe: {
        enabled: { className: 'cvat-object-item-button-keyframe cvat-object-item-button-keyframe-enabled' },
        disabled: { className: 'cvat-object-item-button-keyframe' },
    },
};

function ItemButtonsComponent(props: Props): JSX.Element {
    const { t } = useTranslation();
    const {
        readonly,
        objectType,
        shapeType,
        parentID,
        occluded,
        outside,
        locked,
        pinned,
        hidden,
        keyframe,
        outsideDisabled,
        hiddenDisabled,
        keyframeDisabled,
        switchOccludedShortcut,
        switchPinnedShortcut,
        switchOutsideShortcut,
        switchLockShortcut,
        switchHiddenShortcut,
        switchKeyFrameShortcut,
        nextKeyFrameShortcut,
        prevKeyFrameShortcut,
        navigateFirstKeyframe,
        navigatePrevKeyframe,
        navigateNextKeyframe,
        navigateLastKeyframe,
        setOccluded,
        unsetOccluded,
        setOutside,
        unsetOutside,
        setKeyframe,
        unsetKeyframe,
        lock,
        unlock,
        pin,
        unpin,
        hide,
        show,
    } = props;

    const KeyframeNavigation = (): JSX.Element | null => (objectType === ObjectType.TRACK ? (
        <Row justify='space-around'>
            <Col>
                <CVATTooltip title={t('goToFirstKeyframe')}>
                    <Icon
                        {...classes.firstKeyFrame}
                        component={FirstIcon}
                        onClick={navigateFirstKeyframe || undefined}
                        style={!navigateFirstKeyframe ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                    />
                </CVATTooltip>
            </Col>
            <Col>
                <CVATTooltip title={t('goToPreviousKeyframe', { shortcut: prevKeyFrameShortcut })}>
                    <Icon
                        {...classes.prevKeyFrame}
                        component={PreviousIcon}
                        onClick={navigatePrevKeyframe || undefined}
                        style={!navigatePrevKeyframe ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                    />
                </CVATTooltip>
            </Col>
            <Col>
                <CVATTooltip title={t('goToNextKeyframe', { shortcut: nextKeyFrameShortcut })}>
                    <Icon
                        {...classes.nextKeyFrame}
                        component={NextIcon}
                        onClick={navigateNextKeyframe || undefined}
                        style={!navigateNextKeyframe ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                    />
                </CVATTooltip>
            </Col>
            <Col>
                <CVATTooltip title={t('goToLastKeyframe')}>
                    <Icon
                        {...classes.lastKeyFrame}
                        component={LastIcon}
                        onClick={navigateLastKeyframe || undefined}
                        style={!navigateLastKeyframe ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                    />
                </CVATTooltip>
            </Col>
        </Row>
    ) : null);

    const renderButtons = (): JSX.Element => {
        if (readonly) {
            return (
                <Row justify='space-around'>
                    <Col>
                        <CVATTooltip title={t('switchHiddenProperty', { shortcut: switchHiddenShortcut })}>
                            {hidden ? (
                                <EyeInvisibleFilled {...classes.hidden.enabled} onClick={show} />
                            ) : (
                                <EyeOutlined {...classes.hidden.disabled} onClick={hide} />
                            )}
                        </CVATTooltip>
                    </Col>
                </Row>
            );
        }

        const commonButtons = (
            <>
                <Col>
                    <CVATTooltip title={t('switchLockProperty', { shortcut: switchLockShortcut })}>
                        {locked ? (
                            <LockFilled {...classes.lock.enabled} onClick={unlock} />
                        ) : (
                            <UnlockOutlined {...classes.lock.disabled} onClick={lock} />
                        )}
                    </CVATTooltip>
                </Col>
                <Col>
                    <CVATTooltip title={t('switchOccludedProperty', { shortcut: switchOccludedShortcut })}>
                        {occluded ? (
                            <TeamOutlined {...classes.occluded.enabled} onClick={unsetOccluded} />
                        ) : (
                            <UserOutlined {...classes.occluded.disabled} onClick={setOccluded} />
                        )}
                    </CVATTooltip>
                </Col>
                <Col>
                    <CVATTooltip title={t('switchHiddenProperty', { shortcut: switchHiddenShortcut })}>
                        <div style={hiddenDisabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                            {hidden ? (
                                <EyeInvisibleFilled {...classes.hidden.enabled} onClick={show} />
                            ) : (
                                <EyeOutlined {...classes.hidden.disabled} onClick={hide} />
                            )}
                        </div>
                    </CVATTooltip>
                </Col>
                {shapeType !== ShapeType.POINTS && (
                    <Col>
                        <CVATTooltip title={t('switchPinnedProperty', { shortcut: switchPinnedShortcut })}>
                            {pinned ? (
                                <PushpinFilled {...classes.pinned.enabled} onClick={unpin} />
                            ) : (
                                <PushpinOutlined {...classes.pinned.disabled} onClick={pin} />
                            )}
                        </CVATTooltip>
                    </Col>
                )}
            </>
        );

        if (objectType === ObjectType.TRACK) {
            return (
                <Row justify='space-around'>
                    <Col>
                        <CVATTooltip title={t('switchOutsideProperty', { shortcut: switchOutsideShortcut })}>
                            <div style={outsideDisabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                                {outside ? (
                                    <Icon
                                        {...classes.outside.enabled}
                                        component={ObjectOutsideIcon}
                                        onClick={unsetOutside}
                                    />
                                ) : (
                                    <SelectOutlined {...classes.outside.disabled} onClick={setOutside} />
                                )}
                            </div>
                        </CVATTooltip>
                    </Col>
                    {commonButtons}
                    <Col>
                        <CVATTooltip title={t('switchKeyframeProperty', { shortcut: switchKeyFrameShortcut })}>
                            <div style={keyframeDisabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                                {keyframe ? (
                                    <StarFilled onClick={unsetKeyframe} {...classes.keyframe.enabled} />
                                ) : (
                                    <StarOutlined onClick={setKeyframe} {...classes.keyframe.disabled} />
                                )}
                            </div>
                        </CVATTooltip>
                    </Col>
                </Row>
            );
        }

        if (objectType === ObjectType.SHAPE) {
            return (
                <Row justify='space-around'>
                    {Number.isInteger(parentID) && (
                        <Col>
                            <CVATTooltip title={t('switchOutsideProperty', { shortcut: switchOutsideShortcut })}>
                                <div style={outsideDisabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                                    {outside ? (
                                        <Icon
                                            {...classes.outside.enabled}
                                            component={ObjectOutsideIcon}
                                            onClick={unsetOutside}
                                        />
                                    ) : (
                                        <SelectOutlined {...classes.outside.disabled} onClick={setOutside} />
                                    )}
                                </div>
                            </CVATTooltip>
                        </Col>
                    )}
                    {commonButtons}
                </Row>
            );
        }

        // TAG
        return (
            <Row justify='space-around'>
                <Col>
                    <CVATTooltip title={t('switchLockProperty', { shortcut: switchLockShortcut })}>
                        {locked ? (
                            <LockFilled {...classes.lock.enabled} onClick={unlock} />
                        ) : (
                            <UnlockOutlined {...classes.lock.disabled} onClick={lock} />
                        )}
                    </CVATTooltip>
                </Col>
            </Row>
        );
    };

    return (
        <Row align='middle' justify='space-around'>
            <Col span={20} style={{ textAlign: 'center' }}>
                <KeyframeNavigation />
                {renderButtons()}
            </Col>
        </Row>
    );
}

export default React.memo(ItemButtonsComponent);
