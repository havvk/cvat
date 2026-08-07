// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import { useDispatch, useSelector } from 'react-redux';
import { getCloudStorageStatusAsync } from 'actions/cloud-storage-actions';
import { CombinedState, CloudStorage } from 'reducers';
import { StorageStatuses } from '../../utils/enums';

interface Props {
    cloudStorage: CloudStorage;
}

export default function Status({ cloudStorage }: Props): JSX.Element {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const status = useSelector((state: CombinedState) => state.cloudStorages.statuses[cloudStorage.id]);

    useEffect(() => {
        if (status === undefined) {
            dispatch(getCloudStorageStatusAsync(cloudStorage));
        }
    }, [status]);

    let message: JSX.Element;
    if (!status || (status && status.fetching)) {
        message = <Text type='warning'>{t('loading')}</Text>;
    } else if (status.initialized && !status.status) {
        message = <Text type='danger'>{t('error')}</Text>;
    } else {
        message = <Text type={status.status === StorageStatuses.AVAILABLE ? 'success' : 'danger'}>{status.status}</Text>;
    }

    return (
        <Paragraph>
            <Text type='secondary'>
                {t('Status')}
:
                {' '}
            </Text>
            {message}
        </Paragraph>
    );
}
