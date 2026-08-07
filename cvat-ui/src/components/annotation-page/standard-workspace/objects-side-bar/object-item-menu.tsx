// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from 'antd/lib/button';
import { MenuProps } from 'antd/lib/menu';
import Icon, {
    LinkOutlined, CopyOutlined, BlockOutlined, RetweetOutlined, DeleteOutlined, EditOutlined,
    FunctionOutlined,
} from '@ant-design/icons';

import {
    BackgroundIcon, ForegroundIcon, ResetPerspectiveIcon, ColorizeIcon, SliceIcon,
} from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ColorBy } from 'reducers';
import {
    DimensionType, Job, ObjectType, ShapeType,
} from 'cvat-core-wrapper';

interface Props {
    jobInstance: any;
    readonly: boolean;
    serverID: number | null;
    locked: boolean;
    shapeType: ShapeType;
    objectType: ObjectType;
    color: string;
    colorBy: ColorBy;
    changeColorShortcut: string;
    copyShortcut: string;
    pasteShortcut: string;
    propagateShortcut: string;
    toBackgroundShortcut: string;
    toForegroundShortcut: string;
    removeShortcut: string;
    sliceShortcut: string;
    runAnnotationsActionShortcut: string;
    changeColor(color: string): void;
    copy(): void;
    remove(): void;
    propagate(): void;
    createURL(): void;
    switchOrientation(): void;
    toBackground(): void;
    toForeground(): void;
    resetCuboidPerspective(): void;
    runAnnotationAction(): void;
    edit(): void;
    slice(): void;
    setColorPickerVisible(visible: boolean): void;
}

enum MenuKeys {
    CREATE_URL = 'create_url',
    COPY = 'copy',
    EDIT_MASK = 'edit_mask',
    SLICE_ITEM = 'slice_item',
    PROPAGATE = 'propagate',
    SWITCH_ORIENTATION = 'switch_orientation',
    RESET_PERSPECTIVE = 'reset_perspective',
    TO_BACKGROUND = 'to_background',
    TO_FOREGROUND = 'to_foreground',
    SWITCH_COLOR = 'switch_color',
    REMOVE_ITEM = 'remove_item',
    RUN_ANNOTATION_ACTION = 'run_annotation_action',
}

// ... (Props interface remains the same)

interface ItemProps {
    toolProps: Props;
    t: (s: string, o?: Record<string, any>) => string;
}

function CreateURLItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { serverID, createURL } = toolProps;
    return (
        <Button
            className='cvat-object-item-menu-create-url'
            disabled={!Number.isInteger(serverID)}
            type='link'
            icon={<LinkOutlined />}
            onClick={createURL}
        >
            {t('createObjectUrl')}
        </Button>
    );
}

function MakeCopyItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { copyShortcut, pasteShortcut, copy } = toolProps;
    return (
        <CVATTooltip title={t('copyPasteShortcut', { copyShortcut, pasteShortcut })}>
            <Button
                className='cvat-object-item-menu-make-copy'
                type='link'
                icon={<CopyOutlined />}
                onClick={copy}
            >
                {t('makeACopy')}
            </Button>
        </CVATTooltip>
    );
}

function EditMaskItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { edit } = toolProps;
    return (
        <CVATTooltip title={t('editMaskShortcut')}>
            <Button
                type='link'
                icon={<EditOutlined />}
                onClick={edit}
                className='cvat-object-item-menu-edit-object'
            >
                {t('edit')}
            </Button>
        </CVATTooltip>
    );
}

function SliceItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { slice, sliceShortcut } = toolProps;
    return (
        <CVATTooltip title={t('sliceShapeHelpText', { sliceShortcut })}>
            <Button
                type='link'
                icon={<Icon component={SliceIcon} />}
                onClick={slice}
                className='cvat-object-item-menu-slice-object'
            >
                {t('slice')}
            </Button>
        </CVATTooltip>
    );
}

function PropagateItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { propagateShortcut, propagate } = toolProps;
    return (
        <CVATTooltip title={propagateShortcut}>
            <Button
                type='link'
                icon={<BlockOutlined />}
                onClick={propagate}
                className='cvat-object-item-menu-propagate-item'
            >
                {t('propagate')}
            </Button>
        </CVATTooltip>
    );
}

function SwitchOrientationItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { switchOrientation } = toolProps;
    return (
        <Button
            type='link'
            icon={<RetweetOutlined />}
            onClick={switchOrientation}
            className='cvat-object-item-menu-switch-orientation'
        >
            {t('switchOrientation')}
        </Button>
    );
}

function ResetPerspectiveItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { resetCuboidPerspective } = toolProps;
    return (
        <Button
            type='link'
            onClick={resetCuboidPerspective}
            className='cvat-object-item-menu-reset-perspective'
        >
            <Icon component={ResetPerspectiveIcon} />
            {t('resetPerspective')}
        </Button>
    );
}

function ToBackgroundItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { toBackgroundShortcut, toBackground } = toolProps;
    return (
        <CVATTooltip title={toBackgroundShortcut}>
            <Button
                type='link'
                onClick={toBackground}
                className='cvat-object-item-menu-to-background'
            >
                <Icon component={BackgroundIcon} />
                {t('toBackground')}
            </Button>
        </CVATTooltip>
    );
}

function ToForegroundItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { toForegroundShortcut, toForeground } = toolProps;
    return (
        <CVATTooltip title={toForegroundShortcut}>
            <Button
                type='link'
                onClick={toForeground}
                className='cvat-object-item-menu-to-foreground'
            >
                <Icon component={ForegroundIcon} />
                {t('toForeground')}
            </Button>
        </CVATTooltip>
    );
}

function SwitchColorItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { changeColorShortcut, colorBy, setColorPickerVisible } = toolProps;

    return (
        <CVATTooltip title={changeColorShortcut}>
            <Button onClick={() => setColorPickerVisible(true)} type='link' className='cvat-object-item-menu-change-color'>
                <Icon component={ColorizeIcon} />
                {t('changeColorBy', { colorBy: colorBy.toLowerCase() })}
            </Button>
        </CVATTooltip>
    );
}

function RemoveItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { removeShortcut, remove } = toolProps;
    return (
        <CVATTooltip title={removeShortcut}>
            <Button
                type='link'
                icon={<DeleteOutlined />}
                onClick={remove}
                className='cvat-object-item-menu-remove-object'
            >
                {t('remove')}
            </Button>
        </CVATTooltip>
    );
}

function RunAnnotationActionItem(props: ItemProps): JSX.Element {
    const { toolProps, t } = props;
    const { runAnnotationsActionShortcut, runAnnotationAction } = toolProps;
    return (
        <CVATTooltip title={runAnnotationsActionShortcut}>
            <Button
                type='link'
                icon={<FunctionOutlined />}
                onClick={runAnnotationAction}
                className='cvat-object-item-menu-remove-object'
            >
                {t('runAnnotationAction')}
            </Button>
        </CVATTooltip>
    );
}

export default function ItemMenu(props: Props): MenuProps {
    const { t } = useTranslation();
    const {
        readonly, shapeType, objectType, colorBy, jobInstance,
    } = props;

    // ... (MenuKeys enum remains the same)

    const is2D = jobInstance.dimension === DimensionType.DIMENSION_2D;

    const items = [{
        key: MenuKeys.CREATE_URL,
        label: <CreateURLItem toolProps={props} t={t} />,
    }];

    if (!readonly && objectType !== ObjectType.TAG) {
        items.push({
            key: MenuKeys.COPY,
            label: <MakeCopyItem toolProps={props} t={t} />,
        });
    }

    if (!readonly && shapeType === ShapeType.MASK) {
        items.push({
            key: MenuKeys.EDIT_MASK,
            label: <EditMaskItem toolProps={props} t={t} />,
        });
    }

    if (!readonly && objectType === ObjectType.SHAPE && [ShapeType.MASK, ShapeType.POLYGON].includes(shapeType)) {
        items.push({
            key: MenuKeys.SLICE_ITEM,
            label: <SliceItem key={MenuKeys.SLICE_ITEM} toolProps={props} t={t} />,
        });
    }

    if (!readonly) {
        items.push({
            key: MenuKeys.PROPAGATE,
            label: <PropagateItem toolProps={props} t={t} />,
        });
    }

    if (is2D && !readonly && [ShapeType.POLYGON, ShapeType.POLYLINE, ShapeType.CUBOID].includes(shapeType)) {
        items.push({
            key: MenuKeys.SWITCH_ORIENTATION,
            label: <SwitchOrientationItem toolProps={props} t={t} />,
        });
    }

    if (is2D && !readonly && shapeType === ShapeType.CUBOID) {
        items.push({
            key: MenuKeys.RESET_PERSPECTIVE,
            label: <ResetPerspectiveItem toolProps={props} t={t} />,
        });
    }

    if (is2D && !readonly && objectType !== ObjectType.TAG) {
        items.push({
            key: MenuKeys.TO_BACKGROUND,
            label: <ToBackgroundItem toolProps={props} t={t} />,
        });

        items.push({
            key: MenuKeys.TO_FOREGROUND,
            label: <ToForegroundItem toolProps={props} t={t} />,
        });
    }

    if ([ColorBy.INSTANCE, ColorBy.GROUP].includes(colorBy)) {
        items.push({
            key: MenuKeys.SWITCH_COLOR,
            label: <SwitchColorItem toolProps={props} t={t} />,
        });
    }

    if (!readonly) {
        items.push({
            key: MenuKeys.REMOVE_ITEM,
            label: <RemoveItem toolProps={props} t={t} />,
        });
    }

    if (!readonly) {
        items.push({
            key: MenuKeys.RUN_ANNOTATION_ACTION,
            label: <RunAnnotationActionItem toolProps={props} t={t} />,
        });
    }

    return {
        items,
        selectable: false,
        className: 'cvat-object-item-menu',
    };
}
