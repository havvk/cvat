// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link } from 'react-router-dom';

import { Row, Col } from 'antd/lib/grid';

import Card from 'antd/lib/card';
import Text from 'antd/lib/typography/Text';
import Progress from 'antd/lib/progress';
import { MoreOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';

import { RQStatus, Request } from 'cvat-core-wrapper';

import moment from 'moment';
import { getMomentLocale } from 'i18n';
import StatusMessage from './request-status';
import RequestActionsComponent from './actions-menu';

export interface Props {
    request: Request;
    cancelled: boolean;
    selected?: boolean;
    onClick?: (event?: React.MouseEvent) => void;
}

function constructLink(request: Request): string | null {
    const {
        type, target, jobID, taskID, projectID,
    } = request.operation;

    if (request.status === RQStatus.FAILED && type.includes('create')) {
        return null;
    }

    if (target === 'project' && projectID) {
        return `/projects/${projectID}`;
    }
    if (target === 'task' && taskID) {
        return `/tasks/${taskID}`;
    }
    if (target === 'job' && jobID) {
        return `/tasks/${taskID}/jobs/${jobID}`;
    }
    return null;
}

function constructName(operation: Request['operation'], t: TFunction): string | null {
    const {
        target, jobID, taskID, projectID,
    } = operation;

    if (target === 'project' && projectID) {
        return t('projectNumber', { id: projectID });
    }
    if (target === 'task' && taskID) {
        return t('taskNumber', { id: taskID });
    }
    if (target === 'job' && jobID) {
        return t('jobNumber', { id: jobID });
    }
    return null;
}

function constructOperationName(type: string, t: TFunction): string {
    const termKeys: Record<string, string> = {
        create: 'requestActionCreate',
        export: 'requestActionExport',
        import: 'requestActionImport',
        autoannotate: 'requestActionAutoAnnotate',
        project: 'project',
        task: 'task',
        job: 'job',
        dataset: 'requestResourceDataset',
        backup: 'requestResourceBackup',
        annotations: 'requestResourceAnnotations',
    };

    return type.split(':')
        .map((word) => (termKeys[word] ? t(termKeys[word]) : word.charAt(0).toUpperCase() + word.slice(1)))
        .join(' ');
}

function constructTimestamps(request: Request, t: TFunction, language: string): JSX.Element {
    const momentLocale = getMomentLocale(language);
    const started = moment(request.startedDate).locale(momentLocale).format('lll');
    const finished = moment(request.finishedDate).locale(momentLocale).format('lll');
    const created = moment(request.createdDate).locale(momentLocale).format('lll');
    const expired = moment(request.expiryDate).locale(momentLocale).format('lll');
    const { operation: { type }, url } = request;

    switch (request.status) {
        case RQStatus.FINISHED: {
            const exportToCloudStorage = type.includes('export') && !url;
            if (request.expiryDate && !type.includes('create') && !type.includes('import') && !exportToCloudStorage) {
                return (
                    <>
                        <Row>
                            <Text type='secondary'>{t('startedByOn', { username: request.owner.username, date: started })}</Text>
                        </Row>
                        <Row>
                            <Text type='secondary'>{t('expiresOn', { date: expired })}</Text>
                        </Row>
                    </>
                );
            }
            return (
                <>
                    <Row>
                        <Text type='secondary'>{t('startedByOn', { username: request.owner.username, date: started })}</Text>
                    </Row>
                    <Row>
                        <Text type='secondary'>{t('finishedOn', { date: finished })}</Text>
                    </Row>
                </>
            );
        }
        case RQStatus.FAILED: {
            return (request.startedDate ? (
                <Row>
                    <Text type='secondary'>{t('startedByOn', { username: request.owner.username, date: started })}</Text>
                </Row>
            ) : (
                <Row>
                    <Text type='secondary'>{t('enqueuedByOn', { username: request.owner.username, date: created })}</Text>
                </Row>
            ));
        }
        case RQStatus.STARTED: {
            return (
                <>
                    <Row>
                        <Text type='secondary'>{t('enqueuedByOn', { username: request.owner.username, date: created })}</Text>
                    </Row>
                    <Row>
                        <Text type='secondary'>{t('startedOn', { date: started })}</Text>
                    </Row>
                </>
            );
        }
        default: {
            return (
                <Row>
                    <Text type='secondary'>{t('enqueuedByOn', { username: request.owner.username, date: created })}</Text>
                </Row>
            );
        }
    }
}

const dimensions = {
    xs: 6,
    sm: 6,
    md: 8,
    lg: 8,
    xl: 8,
    xxl: 6,
};

function RequestCard(props: Readonly<Props>): JSX.Element {
    const { t, i18n } = useTranslation();
    const {
        request, cancelled, selected, onClick,
    } = props;
    const { operation } = request;
    const { type } = operation;

    const linkToEntity = constructLink(request);
    const percent = request.status === RQStatus.FINISHED ? 100 : (request.progress ?? 0) * 100;
    const timestamps = constructTimestamps(request, t, i18n.language);

    const name = constructName(operation, t);

    const percentProgress = (request.status === RQStatus.FAILED || !percent) ? '' : `${percent.toFixed(2)}%`;

    const style: React.CSSProperties = {};
    if (cancelled) {
        style.pointerEvents = 'none';
        style.opacity = 0.5;
    }

    return (
        <RequestActionsComponent
            requestInstance={request}
            dropdownTrigger={['contextMenu']}
            triggerElement={(
                <Card
                    className={
                        `cvat-requests-card${selected ? ' cvat-item-selected' : ''}`
                    }
                    style={style}
                    onClick={onClick}
                >
                    <Row justify='space-between'>
                        <Col span={12}>
                            <Row style={{ paddingBottom: [RQStatus.FAILED].includes(request.status) ? '10px' : '0' }}>
                                <Col className='cvat-requests-type' {...dimensions}>
                                    <Text>
                                        {constructOperationName(type, t)}
                                        {' '}
                                    </Text>
                                </Col>
                                {name && (
                                    <Col className='cvat-requests-name'>
                                        {linkToEntity ?
                                            (<Link to={linkToEntity}>{name}</Link>) :
                                            <Text>{name}</Text>}
                                    </Col>
                                )}
                            </Row>
                            {timestamps}
                        </Col>
                        <Col span={10} className='cvat-request-item-progress-wrapper'>
                            <Row>
                                <Col span={21}>
                                    <Row />
                                    <StatusMessage
                                        message={request.message}
                                        status={request.status}
                                        cancelled={cancelled}
                                    />
                                    <Row>
                                        <Col span={18} className='cvat-requests-progress'>
                                            {
                                                request.status !== RQStatus.FAILED ? (
                                                    <Progress
                                                        percent={percent}
                                                        strokeColor={{
                                                            from: '#108ee9',
                                                            to: '#87d068',
                                                        }}
                                                        showInfo={false}
                                                        strokeWidth={5}
                                                        size='small'
                                                    />
                                                ) : null
                                            }
                                        </Col>
                                        <Col span={2} className='cvat-requests-percent'>
                                            {percentProgress}
                                        </Col>
                                    </Row>
                                    {
                                        operation?.format ? (
                                            <Row>
                                                <Col className='cvat-format-name'>
                                                    <Text type='secondary'>{operation.format}</Text>
                                                </Col>
                                            </Row>
                                        ) : null
                                    }
                                    {
                                        operation?.lightweight ? (
                                            <Row>
                                                <Col className='cvat-lightweight-label'>
                                                    <Text type='secondary'>{t('lightweightBackup')}</Text>
                                                </Col>
                                            </Row>
                                        ) : null
                                    }
                                </Col>
                                <Col span={3} style={{ display: 'flex', justifyContent: 'end' }}>
                                    <RequestActionsComponent
                                        requestInstance={request}
                                        renderTriggerIfEmpty={false}
                                        triggerElement={(
                                            <Button
                                                type='link'
                                                size='middle'
                                                className='cvat-requests-page-actions-button cvat-actions-menu-button'
                                                icon={<MoreOutlined className='cvat-menu-icon' />}
                                            />
                                        )}
                                    />
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Card>
            )}
        />

    );
}

export default React.memo(RequestCard);
