// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useTranslation } from 'react-i18next';
import React, { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import Checkbox from 'antd/lib/checkbox';
import Collapse from 'antd/lib/collapse';
import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';
import message from 'antd/lib/message';
import Icon from '@ant-design/icons';
import { MenuProps } from 'antd/lib/menu';

import { MainMenuIcon } from 'icons';
import { Job, JobState } from 'cvat-core-wrapper';

import CVATTooltip from 'components/common/cvat-tooltip';
import { openAnnotationsActionModal } from 'components/annotation-page/annotations-actions/annotations-actions-modal';
import { CombinedState } from 'reducers';
import {
    updateCurrentJobAsync, finishCurrentJobAsync,
    removeAnnotationsAsync as removeAnnotationsAsyncAction,
} from 'actions/annotation-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';

export enum Actions {
    LOAD_JOB_ANNO = 'load_job_anno',
    EXPORT_JOB_DATASET = 'export_job_dataset',
    REMOVE_ANNOTATIONS = 'remove_annotations',
    RUN_ACTIONS = 'run_actions',
    OPEN_TASK = 'open_task',
    FINISH_JOB = 'finish_job',
}

function AnnotationMenuComponent(): JSX.Element {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const history = useHistory();
    const jobInstance = useSelector((state: CombinedState) => state.annotation.job.instance as Job);
    const [jobState, setJobState] = useState(jobInstance.state);
    const { stopFrame } = jobInstance;

    const exportDataset = useCallback(() => {
        dispatch(exportActions.openExportDatasetModal(jobInstance));
    }, [jobInstance]);

    const finishJob = useCallback(() => {
        dispatch(finishCurrentJobAsync(() => {
            message.open({
                duration: 1,
                type: 'success',
                content: t('jobFinishedSuccess'),
                className: 'cvat-annotation-job-finished-success',
            });
        }));
    }, []);

    const openTask = useCallback(() => {
        history.push(`/tasks/${jobInstance.taskId}`);
    }, [jobInstance.taskId]);

    const uploadAnnotations = useCallback(() => {
        dispatch(importActions.openImportDatasetModal(jobInstance));
    }, [jobInstance]);

    const changeState = useCallback((state: JobState) => {
        dispatch(updateCurrentJobAsync({ state })).then(() => {
            message.info(t('jobStateUpdated'), 2);
            setJobState(jobInstance.state);
        });
    }, [jobInstance]);

    const changeJobState = useCallback((state: JobState) => () => {
        Modal.confirm({
            title: t('updateJobStateTitle'),
            content: t('updateJobStateContent', { state }),
            okText: t('Continue'),
            cancelText: t('Cancel'),
            className: 'cvat-modal-content-change-job-state',
            onOk: () => changeState(state),
        });
    }, [changeState]);

    const computeClassName = (menuItemState: string): string => {
        if (menuItemState === jobState) return 'cvat-submenu-current-job-state-item';
        return '';
    };

    const menuItems: NonNullable<MenuProps['items']> = [];

    menuItems.push({
        key: Actions.LOAD_JOB_ANNO,
        label: t('Upload annotations'),
        onClick: uploadAnnotations,
    });

    menuItems.push({
        key: Actions.EXPORT_JOB_DATASET,
        label: t('exportJobDataset'),
        onClick: exportDataset,
    });

    menuItems.push({
        key: Actions.REMOVE_ANNOTATIONS,
                    label: t('removeAnnotations'),
        onClick: () => {
            let removeFrom: number | undefined;
            let removeUpTo: number | undefined;
            let removeOnlyKeyframes = false;
            Modal.confirm({
                title: t('removeAnnotationsTitle'),
                content: (
                    <div>
                        <Text>{t('removeAnnotationsContent')}</Text>
                        <br />
                        <br />
                        <Collapse
                            bordered={false}
                            items={[{
                                key: 1,
                                label: <Text>{t('selectRange')}</Text>,
                                children: (
                                    <>
                                        <Text>{t('from')}</Text>
                                        <InputNumber
                                            min={0}
                                            max={stopFrame}
                                            onChange={(value) => {
                                                removeFrom = value;
                                            }}
                                        />
                                        <Text>{t('to')}</Text>
                                        <InputNumber
                                            min={0}
                                            max={stopFrame}
                                            onChange={(value) => {
                                                removeUpTo = value;
                                            }}
                                        />
                                        <CVATTooltip title={t('applicableOnlyForAnnotationsInRange')}>
                                            <br />
                                            <br />
                                            <Checkbox
                                                onChange={(check) => {
                                                    removeOnlyKeyframes = check.target.checked;
                                                }}
                                            >
                                                {t('deleteOnlyKeyframes')}
                                            </Checkbox>
                                        </CVATTooltip>
                                    </>
                                ),
                            }]}
                        />
                    </div>
                ),
                className: 'cvat-modal-confirm-remove-annotation',
                onOk: () => {
                    dispatch(removeAnnotationsAsyncAction(removeFrom, removeUpTo, removeOnlyKeyframes));
                },
                okButtonProps: {
                    type: 'primary',
                    danger: true,
                },
                okText: t('Delete'),
            });
        },
    });

    menuItems.push({
        key: Actions.RUN_ACTIONS,
        label: t('runActions'),
        onClick: () => {
            openAnnotationsActionModal();
        },
    });

    menuItems.push({
        key: Actions.OPEN_TASK,
                    label: t('openTheTask'),
        onClick: openTask,
    });

    menuItems.push({
        key: 'job-state-submenu',
        popupClassName: 'cvat-annotation-menu-job-state-submenu',
        label: t('changeJobState'),
        children: [{
            key: `state:${JobState.NEW}`,
            label: JobState.NEW,
            className: computeClassName(JobState.NEW),
            onClick: changeJobState(JobState.NEW),
        }, {
            key: `state:${JobState.IN_PROGRESS}`,
            label: JobState.IN_PROGRESS,
            className: computeClassName(JobState.IN_PROGRESS),
            onClick: changeJobState(JobState.IN_PROGRESS),
        }, {
            key: `state:${JobState.REJECTED}`,
            label: JobState.REJECTED,
            className: computeClassName(JobState.REJECTED),
            onClick: changeJobState(JobState.REJECTED),
        }, {
            key: `state:${JobState.COMPLETED}`,
            label: JobState.COMPLETED,
            className: computeClassName(JobState.COMPLETED),
            onClick: changeJobState(JobState.COMPLETED),
        }],
    });

    menuItems.push({
        key: Actions.FINISH_JOB,
        label: t('finishTheJob'),
        onClick: () => {
            Modal.confirm({
                title: t('finishJobTitle'),
                content: t('finishJobContent'),
                okText: t('Continue'),
                cancelText: t('Cancel'),
                className: 'cvat-modal-content-finish-job',
                onOk: finishJob,
            });
        },
    });

    return (
        <Dropdown
            trigger={['click']}
            destroyPopupOnHide
            menu={{
                items: menuItems,
                triggerSubMenuAction: 'click',
                className: 'cvat-annotation-menu',
            }}
        >
            <Button type='link' className='cvat-annotation-header-menu-button cvat-annotation-header-button'>
                <Icon component={MainMenuIcon} />
                {t('Menu')}
            </Button>
        </Dropdown>
    );
}

export default React.memo(AnnotationMenuComponent);
