// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import { MoreOutlined } from '@ant-design/icons';
import Progress from 'antd/lib/progress';
import Badge from 'antd/lib/badge';
import moment from 'moment';
import { withTranslation, WithTranslation } from 'react-i18next';
import { Task, RQStatus, Request } from 'cvat-core-wrapper';
import Preview from 'components/common/preview';
import { ActiveInference, PluginComponent } from 'reducers';
import StatusMessage from 'components/requests-page/request-status';
import AutomaticAnnotationProgress from './automatic-annotation-progress';
import TaskActionsComponent from './actions-menu';

export interface TaskItemProps {
    taskInstance: any;
    deleted: boolean;
    activeInference: ActiveInference | null;
    activeRequest: Request | null;
    ribbonPlugins: PluginComponent[];
    cancelAutoAnnotation(): void;
    updateTaskInState(task: Task): void;
    selected: boolean;
    onClick: () => void;
}

interface State {
    importingState: {
        state: RQStatus | null;
        message: string;
        progress: number;
    } | null;
}

class TaskItemComponent extends React.PureComponent<TaskItemProps & RouteComponentProps & WithTranslation, State> {
    #isUnmounted: boolean;

    constructor(props: TaskItemProps & RouteComponentProps & WithTranslation) {
        super(props);
        const { taskInstance, t } = props;
        this.#isUnmounted = false;
        this.state = {
            importingState: taskInstance.size > 0 ? null : {
                state: null,
                message: t('Request current progress'),
                progress: 0,
            },
        };
    }

    public componentDidMount(): void {
        const { taskInstance, updateTaskInState, activeRequest } = this.props;
        const { importingState } = this.state;

        if (importingState !== null && activeRequest !== null) {
            if (!this.#isUnmounted) {
                this.setState({
                    importingState: {
                        message: activeRequest.message,
                        progress: Math.floor(activeRequest.progress * 100),
                        state: activeRequest.status,
                    },
                });
            }
            taskInstance.listenToCreate(activeRequest.id, {
                callback: (request: Request) => {
                    if (!this.#isUnmounted) {
                        this.setState({
                            importingState: {
                                message: request.message,
                                progress: Math.floor(request.progress * 100),
                                state: request.status,
                            },
                        });
                    }
                },
                initialRequest: activeRequest,
            },
            ).then((createdTask: Task) => {
                if (!this.#isUnmounted) {
                    this.setState({ importingState: null });

                    setTimeout(() => {
                        if (!this.#isUnmounted) {
                            // check again, because the component may be unmounted to this moment
                            const { taskInstance: currentTaskInstance } = this.props;
                            if (currentTaskInstance.size !== createdTask.size) {
                                // update state only if it was not updated anywhere else
                                // for example in createTaskAsync
                                updateTaskInState(createdTask);
                            }
                        }
                    }, 1000);
                }
            }).catch(() => {});
        }
    }

    public componentWillUnmount(): void {
        this.#isUnmounted = true;
    }

    private renderPreview(): JSX.Element {
        const { taskInstance } = this.props;
        return (
            <Col span={4}>
                <Preview
                    task={taskInstance}
                    loadingClassName='cvat-task-item-loading-preview'
                    emptyPreviewClassName='cvat-task-item-empty-preview'
                    previewWrapperClassName='cvat-task-item-preview-wrapper'
                    previewClassName='cvat-task-item-preview'
                />
            </Col>
        );
    }

    private renderDescription(): JSX.Element {
        // Task info
        const { taskInstance, t, i18n } = this.props;
        const { id } = taskInstance;
        const owner = taskInstance.owner ? taskInstance.owner.username : null;
        const updated = moment(taskInstance.updatedDate).locale(i18n.language).fromNow();
        const created = moment(taskInstance.createdDate).format('L');

        return (
            <Col span={10} className='cvat-task-item-description'>
                <Text ellipsis={{ tooltip: taskInstance.name }}>
                    <Text strong type='secondary' className='cvat-item-task-id'>{`#${id}: `}</Text>
                    <Text strong className='cvat-item-task-name'>
                        {taskInstance.name}
                    </Text>
                </Text>
                <br />
                {owner && (
                    <>
                        <Text type='secondary'>{t('Created by {{owner}} on {{date}}', { owner, date: created })}</Text>
                        <br />
                    </>
                )}
                <Text type='secondary'>{t('Last updated {{updated}}', { updated })}</Text>
            </Col>
        );
    }

    private renderProgress(): JSX.Element {
        const { taskInstance, activeInference, cancelAutoAnnotation, t } = this.props;
        const { importingState } = this.state;

        if (importingState) {
            return (
                <Col span={7}>
                    <Row>
                        <Col span={24} className='cvat-task-item-progress-wrapper'>
                            <div>
                                <StatusMessage status={importingState.state} message={importingState.message} />
                            </div>
                            {
                                importingState.state !== RQStatus.FAILED ? (
                                    <Progress
                                        percent={importingState.progress}
                                        strokeColor='#1890FF'
                                        size='small'
                                    />
                                ) : null
                            }
                        </Col>
                    </Row>
                </Col>
            );
        }
        // Count number of jobs and performed jobs
        const numOfJobs = taskInstance.progress.totalJobs;
        const numOfCompleted = taskInstance.progress.completedJobs;
        const numOfValidation = taskInstance.progress.validationJobs;
        const numOfAnnotation = taskInstance.progress.annotationJobs;

        // Progress appearance depends on number of jobs
        const jobsProgress = ((numOfCompleted + numOfValidation) * 100) / numOfJobs;

        return (
            <Col span={7}>
                <Row>
                    <Col span={24} className='cvat-task-item-progress-wrapper'>
                        <div>
                            { numOfCompleted > 0 && (
                                <Text strong className='cvat-task-completed-progress'>
                                    {t('{{count}} done', { count: numOfCompleted })}
                                </Text>
                            )}

                            { numOfValidation > 0 && (
                                <Text strong className='cvat-task-validation-progress'>
                                    {t('{{count}} on review', { count: numOfValidation })}
                                </Text>
                            )}

                            { numOfAnnotation > 0 && (
                                <Text strong className='cvat-task-annotation-progress'>
                                    {t('{{count}} annotating', { count: numOfAnnotation })}
                                </Text>
                            )}
                            <Text strong type='secondary'>
                                {t('{{count}} total', { count: numOfJobs })}
                            </Text>
                        </div>
                        <Progress
                            percent={jobsProgress}
                            success={{
                                percent: (numOfCompleted * 100) / numOfJobs,
                            }}
                            strokeColor='#1890FF'
                            showInfo={false}
                            size='small'
                        />
                    </Col>
                </Row>
                <AutomaticAnnotationProgress
                    activeInference={activeInference}
                    cancelAutoAnnotation={cancelAutoAnnotation}
                />
            </Col>
        );
    }

    private renderNavigation(): JSX.Element {
        const { importingState } = this.state;
        const { taskInstance, history, t } = this.props;
        const { id } = taskInstance;

        return (
            <Col span={3}>
                <Row justify='end'>
                    <Col>
                        <Button
                            disabled={!!importingState}
                            className='cvat-item-open-task-button'
                            type='primary'
                            size='large'
                            ghost
                            href={`/tasks/${id}`}
                            onClick={(e: React.MouseEvent): void => {
                                e.preventDefault();
                                history.push(`/tasks/${id}`);
                            }}
                        >
                            {t('Open')}
                        </Button>
                    </Col>
                </Row>
                <Row justify='end'>
                    <Col className='cvat-item-open-task-actions'>
                        <TaskActionsComponent
                            taskInstance={taskInstance}
                            triggerElement={(
                                <div className='cvat-task-item-actions-button cvat-actions-menu-button'>
                                    <Text className='cvat-text-color'>{t('Actions')}</Text>
                                    <MoreOutlined className='cvat-menu-icon' />
                                </div>
                            )}
                        />
                    </Col>
                </Row>
            </Col>
        );
    }

    public render(): JSX.Element {
        const {
            deleted, ribbonPlugins, selected, onClick, taskInstance,
        } = this.props;
        const style: React.CSSProperties = {};
        if (deleted) {
            style.pointerEvents = 'none';
            style.opacity = 0.5;
        }

        const ribbonItems = ribbonPlugins
            .filter((plugin) => plugin.data.shouldBeRendered(this.props, this.state))
            .map((plugin) => ({ component: plugin.component, weight: plugin.data.weight }));

        return (
            <Badge.Ribbon
                style={{ visibility: ribbonItems.length ? 'visible' : 'hidden' }}
                className='cvat-task-item-ribbon'
                placement='start'
                text={(
                    <div>
                        {ribbonItems.sort((item1, item2) => item1.weight - item2.weight)
                            .map((item) => item.component).map((Component, index) => (
                                <Component key={index} targetProps={this.props} targetState={this.state} />
                            ))}
                    </div>
                )}
            >
                <TaskActionsComponent
                    taskInstance={taskInstance}
                    dropdownTrigger={['contextMenu']}
                    triggerElement={(
                        <Row
                            className={`cvat-tasks-list-item${selected ? ' cvat-item-selected' : ''}`}
                            justify='center'
                            align='top'
                            style={style}
                            onClick={onClick}
                        >
                            {this.renderPreview()}
                            {this.renderDescription()}
                            {this.renderProgress()}
                            {this.renderNavigation()}
                        </Row>
                    )}
                />
            </Badge.Ribbon>
        );
    }
}

export default withRouter(withTranslation()(TaskItemComponent));
