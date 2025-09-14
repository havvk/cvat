// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Popover from 'antd/lib/popover';
import Icon from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import CVATTooltip from 'components/common/cvat-tooltip';

import { Canvas } from 'cvat-canvas-wrapper';
import { PointIcon } from 'icons';
import { ShapeType } from 'cvat-core-wrapper';

import DrawShapePopoverContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';
import withVisibilityHandling from './handle-popover-visibility';

export interface Props {
    canvasInstance: Canvas;
    isDrawing: boolean;
    disabled?: boolean;
}

const CustomPopover = withVisibilityHandling(Popover, 'draw-points');
function DrawPointsControl(props: Props): JSX.Element {
    const { t } = useTranslation();
    const { canvasInstance, isDrawing, disabled } = props;
    const dynamicPopoverProps = isDrawing ? {
        overlayStyle: {
            display: 'none',
        },
    } : {};

    const dynamicIconProps = isDrawing ? {
        className: 'cvat-draw-points-control cvat-active-canvas-control',
        onClick: (): void => {
            canvasInstance.draw({ enabled: false });
        },
    } : {
        className: 'cvat-draw-points-control',
    };

    return disabled ? (
        <CVATTooltip title={t('tooltipDrawPoints')} placement='right'>
            <Icon className='cvat-draw-points-control cvat-disabled-canvas-control' component={PointIcon} />
        </CVATTooltip>
    ) : (
        <CustomPopover
            {...dynamicPopoverProps}
            overlayClassName='cvat-draw-shape-popover'
            placement='right'
            content={<DrawShapePopoverContainer shapeType={ShapeType.POINTS} />}
        >
            <CVATTooltip title={t('tooltipDrawPoints')} placement='right'>
                <Icon {...dynamicIconProps} component={PointIcon} />
            </CVATTooltip>
        </CustomPopover>
    );
}

export default React.memo(DrawPointsControl);