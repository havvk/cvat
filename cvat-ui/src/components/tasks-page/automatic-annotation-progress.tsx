// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import Progress from 'antd/lib/progress';
import Modal from 'antd/lib/modal';
import { useTranslation } from 'react-i18next';

import CVATTooltip from 'components/common/cvat-tooltip';
import { RQStatus } from 'cvat-core-wrapper';
import { ActiveInference } from 'reducers';

interface Props {
    activeInference: ActiveInference | null;
    cancelAutoAnnotation(): void;
}

export default function AutomaticAnnotationProgress(props: Props): JSX.Element | null {
    const { activeInference, cancelAutoAnnotation } = props;
    const { t } = useTranslation();
    if (!activeInference) return null;

    let textType: 'success' | 'danger' = 'success';
    if ([RQStatus.FAILED, RQStatus.UNKNOWN].includes(activeInference.status)) {
        textType = 'danger';
    }

    return (
        <Row justify='space-between' align='bottom'>
            <Col span={22} className='cvat-task-item-progress-wrapper'>
                <div>
                    <Text
                        type={activeInference.status === RQStatus.QUEUED ? undefined : textType}
                        strong
                    >
                        {((): JSX.Element => {
                            if (activeInference.status === RQStatus.QUEUED) {
                                return (
                                    <>
                                        {t('automaticAnnotationRequestQueued')}
                                        <LoadingOutlined />
                                    </>
                                );
                            }

                            if (activeInference.status === RQStatus.STARTED) {
                                return (
                                    <>
                                        {t('automaticAnnotationInProgress')}
                                        <LoadingOutlined />
                                    </>
                                );
                            }

                            if (activeInference.status === RQStatus.FAILED) {
                                return (<>{t('automaticAnnotationFailed')}</>);
                            }

                            if (activeInference.status === RQStatus.UNKNOWN) {
                                return (<>{t('unknownStatusReceived')}</>);
                            }

                            return <>{t('automaticAnnotationAccomplished')}</>;
                        })()}
                    </Text>
                </div>
                <Progress
                    percent={Math.floor(activeInference.progress)}
                    strokeColor={{
                        from: '#108ee9',
                        to: '#87d068',
                    }}
                    showInfo={false}
                    size='small'
                />
            </Col>
            <Col span={1} className='close-auto-annotation-icon'>
                { activeInference.status !== RQStatus.FAILED && (
                    <CVATTooltip title={t('cancelAutomaticAnnotation')}>
                        <CloseOutlined
                            onClick={() => {
                                Modal.confirm({
                                    title: t('cancelAutomaticAnnotationConfirmTitle'),
                                    content: t('cancelAutomaticAnnotationConfirmContent'),
                                    okButtonProps: {
                                        type: 'primary',
                                        danger: true,
                                    },
                                    onOk() {
                                        cancelAutoAnnotation();
                                    },
                                });
                            }}
                        />
                    </CVATTooltip>
                )}
            </Col>
        </Row>
    );
}