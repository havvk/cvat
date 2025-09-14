// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { forwardRef } from 'react';
import Select from 'antd/lib/select';
import { JobStage, JobState } from 'cvat-core-wrapper';
import { handleDropdownKeyDown } from 'utils/dropdown-utils';

interface JobStateSelectorProps {
    value: JobState | null;
    onSelect: (newValue: JobState) => void;
}

export const JobStateSelector = forwardRef(({
    value, onSelect,
}: Readonly<JobStateSelectorProps>, ref: React.Ref<HTMLDivElement>): JSX.Element => (
    <div ref={ref}>
        <Select
            className='cvat-job-item-state'
            popupClassName='cvat-job-item-state-dropdown'
            value={value}
            onChange={onSelect}
            onKeyDown={handleDropdownKeyDown}
            placeholder='Select a state'
        >
            <Select.Option value={JobState.NEW}>{JobState.NEW}</Select.Option>
            <Select.Option value={JobState.IN_PROGRESS}>{JobState.IN_PROGRESS}</Select.Option>
            <Select.Option value={JobState.REJECTED}>{JobState.REJECTED}</Select.Option>
            <Select.Option value={JobState.COMPLETED}>{JobState.COMPLETED}</Select.Option>
        </Select>
    </div>
));

interface JobStageSelectorProps {
    value: JobStage | null;
    onSelect: (newValue: JobStage) => void;
}

export const JobStageSelector = forwardRef(({
    value, onSelect,
}: Readonly<JobStageSelectorProps>, ref: React.Ref<HTMLDivElement>): JSX.Element => (
    <div ref={ref}>
        <Select
            className='cvat-job-item-stage'
            popupClassName='cvat-job-item-stage-dropdown'
            value={value}
            onChange={onSelect}
            onKeyDown={handleDropdownKeyDown}
            placeholder='Select a stage'
        >
            <Select.Option value={JobStage.ANNOTATION}>
                {JobStage.ANNOTATION}
            </Select.Option>
            <Select.Option value={JobStage.VALIDATION}>
                {JobStage.VALIDATION}
            </Select.Option>
            <Select.Option value={JobStage.ACCEPTANCE}>
                {JobStage.ACCEPTANCE}
            </Select.Option>
        </Select>
    </div>
));