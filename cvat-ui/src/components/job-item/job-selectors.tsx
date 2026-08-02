// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation } from 'react-i18next';
import Select from 'antd/lib/select';
import { JobStage, JobState } from 'cvat-core-wrapper';
import { handleDropdownKeyDown } from 'utils/dropdown-utils';

interface JobStateSelectorProps {
    value: JobState | null;
    onSelect: (newValue: JobState) => void;
}

export function JobStateSelector({ value, onSelect }: Readonly<JobStateSelectorProps>): JSX.Element {
    const { t } = useTranslation();
    return (
        <Select
            className='cvat-job-item-state'
            popupClassName='cvat-job-item-state-dropdown'
            value={value}
            onChange={onSelect}
            onKeyDown={handleDropdownKeyDown}
            placeholder={t('selectState')}
        >
            <Select.Option value={JobState.NEW}>{t('new')}</Select.Option>
            <Select.Option value={JobState.IN_PROGRESS}>{t('inProgress')}</Select.Option>
            <Select.Option value={JobState.REJECTED}>{t('rejected')}</Select.Option>
            <Select.Option value={JobState.COMPLETED}>{t('completed')}</Select.Option>
        </Select>
    );
}

interface JobStageSelectorProps {
    value: JobStage | null;
    onSelect: (newValue: JobStage) => void;
}

export function JobStageSelector({ value, onSelect }: Readonly<JobStageSelectorProps>): JSX.Element {
    const { t } = useTranslation();
    return (
        <Select
            className='cvat-job-item-stage'
            popupClassName='cvat-job-item-stage-dropdown'
            value={value}
            onChange={onSelect}
            onKeyDown={handleDropdownKeyDown}
            placeholder={t('selectStage')}
        >
            <Select.Option value={JobStage.ANNOTATION}>
                {t('annotation')}
            </Select.Option>
            <Select.Option value={JobStage.VALIDATION}>
                {t('validation')}
            </Select.Option>
            <Select.Option value={JobStage.ACCEPTANCE}>
                {t('acceptance')}
            </Select.Option>
        </Select>
    );
}
