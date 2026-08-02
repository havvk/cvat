// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Result from 'antd/lib/result';
import { useTranslation } from 'react-i18next';

export const JobNotFoundComponent = React.memo((): JSX.Element => {
    const { t } = useTranslation();
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title={t('jobNotFound')}
            subTitle={t('checkInfoExistsAndAccess')}
        />
    );
});

export const TaskNotFoundComponent = React.memo((): JSX.Element => {
    const { t } = useTranslation();
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title={t('errorGettingTask')}
            subTitle={t('checkInfoExistsAndAccessible')}
        />
    );
});

export const ProjectNotFoundComponent = React.memo((): JSX.Element => {
    const { t } = useTranslation();
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title={t('errorGettingProject')}
            subTitle={t('checkInfoExistsAndAccessible')}
        />
    );
});

export const CloudStorageNotFoundComponent = React.memo((): JSX.Element => {
    const { t } = useTranslation();
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title={t('cloudStorageNotFound')}
            subTitle={t('checkIdExistsAndPermissions')}
        />
    );
});
