// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Popover from 'antd/lib/popover';
import Icon from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import CVATTooltip from 'components/common/cvat-tooltip';

import { Canvas } from 'cvat-canvas-wrapper';
import { RectangleIcon } from 'icons';
import { ShapeType } from 'cvat-core-wrapper';

import DrawShapePopoverContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';
import withVisibilityHandling from './handle-popover-visibility';

export interface Props {
    canvasInstance: Canvas;
    isDrawing: boolean;
    disabled?: boolean;
}

const CustomPopover = withVisibilityHandling(Popover, 'draw-rectangle');
function DrawRectangleControl(props: Props): JSX.Element {
    const { t } = useTranslation();
    const { canvasInstance, isDrawing, disabled } = props;
    const dynamicPopoverProps = isDrawing ? {
        overlayStyle: {
            display: 'none',
        },
    } : {};

    const dynamicIconProps = isDrawing ? {
        className: 'cvat-draw-rectangle-control cvat-active-canvas-control',
        onClick: (): void => {
            canvasInstance.draw({ enabled: false });
        },
    } : {
        className: 'cvat-draw-rectangle-control',
    };

    return disabled ? (
        <CVATTooltip title={t('tooltipDrawRectangle')} placement='right'>
            <Icon className='cvat-draw-rectangle-control cvat-disabled-canvas-control' component={RectangleIcon} />
        </CVATTooltip>
    ) : (
        <CustomPopover
            {...dynamicPopoverProps}
            overlayClassName='cvat-draw-shape-popover'
            placement='right'
            content={<DrawShapePopoverContainer shapeType={ShapeType.RECTANGLE} />}
        >
            <CVATTooltip title={t('tooltipDrawRectangle')} placement='right'>
                <Icon {...dynamicIconProps} component={RectangleIcon} />
            </CVATTooltip>
        </CustomPopover>
    );
}

export default React.memo(DrawRectangleControl);