// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation } from 'react-i18next';
import Text from 'antd/lib/typography/Text';
import { BaseType } from 'antd/es/typography/Base';
import LoadingOutlined from '@ant-design/icons/lib/icons/LoadingOutlined';
import { RQStatus } from 'cvat-core-wrapper';

function statusMessage(message: string, defaultMessage: string, postfix?: JSX.Element): JSX.Element {
    if (message) {
        return (
            <>
                {message}
                {postfix || null}
            </>
        );
    }

    return (
        <>
            {defaultMessage}
            {postfix || null}
        </>
    );
}

export interface Props {
    status: RQStatus | null;
    message: string | null;
    cancelled: boolean;
}

function StatusMessage(props: Props): JSX.Element {
    const { t } = useTranslation();
    const { cancelled } = props;
    let { status, message } = props;
    message = message || '';
    status = status || RQStatus.FINISHED;

    const [textType, classHelper] = ((_status: RQStatus) => {
        if (cancelled) {
            return [undefined, 'cancelled'];
        }

        if (_status === RQStatus.FINISHED) {
            return ['success', 'success'];
        }

        if (_status === RQStatus.QUEUED) {
            return ['warning', 'queued'];
        }

        if (_status === RQStatus.STARTED) {
            return [undefined, 'started'];
        }

        return ['danger', 'failed'];
    })(status);

    return (
        <Text
            className={`cvat-request-item-progress-message cvat-request-item-progress-${classHelper}`}
            type={textType as BaseType | undefined}
            strong
        >
            {((): JSX.Element => {
                if (cancelled) {
                    return statusMessage(message, t('requestCancelled'));
                }

                if (status === RQStatus.FINISHED) {
                    return statusMessage(message, t('finished'));
                }

                if ([RQStatus.QUEUED].includes(status)) {
                    return statusMessage(message, t('requestQueued'), <LoadingOutlined />);
                }

                if ([RQStatus.STARTED].includes(status)) {
                    return statusMessage(message, t('inProgress'), <LoadingOutlined />);
                }

                if (status === RQStatus.FAILED) {
                    return statusMessage(message, t('requestFailed'));
                }

                if (status === RQStatus.UNKNOWN) {
                    return statusMessage(message, t('unknownStatusReceived'));
                }

                return statusMessage(message, t('unknownStatusReceived'));
            })()}
        </Text>
    );
}

export default React.memo(StatusMessage);
