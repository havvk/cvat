// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Row, Col } from 'antd/lib/grid';
import { PercentageOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import Input from 'antd/lib/input';
import Space from 'antd/lib/space';
import Switch from 'antd/lib/switch';
import Tooltip from 'antd/lib/tooltip';
import Radio from 'antd/lib/radio';
import Checkbox from 'antd/lib/checkbox';
import Form, { FormInstance, RuleObject, RuleRender } from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import { Store } from 'antd/lib/form/interface';
import CVATTooltip from 'components/common/cvat-tooltip';
import patterns from 'utils/validation-patterns';
import { isInteger } from 'utils/validation';
import SourceStorageField from 'components/storage/source-storage-field';
import TargetStorageField from 'components/storage/target-storage-field';

import {
    getCore, Storage, StorageData, StorageLocation,
} from 'cvat-core-wrapper';

const core = getCore();

export enum SortingMethod {
    LEXICOGRAPHICAL = 'lexicographical',
    NATURAL = 'natural',
    PREDEFINED = 'predefined',
    RANDOM = 'random',
}

export interface AdvancedConfiguration {
    bugTracker?: string;
    imageQuality?: number;
    overlapSize?: number;
    segmentSize?: number;
    startFrame?: number;
    stopFrame?: number;
    frameFilter?: string;
    useZipChunks: boolean;
    dataChunkSize?: number;
    useCache: boolean;
    copyData?: boolean;
    sortingMethod: SortingMethod;
    useProjectSourceStorage: boolean;
    useProjectTargetStorage: boolean;
    consensusReplicas: number;
    sourceStorage: StorageData;
    targetStorage: StorageData;
}

const initialValues: AdvancedConfiguration = {
    imageQuality: 70,
    useZipChunks: true,
    useCache: true,
    copyData: false,
    sortingMethod: SortingMethod.LEXICOGRAPHICAL,
    useProjectSourceStorage: true,
    useProjectTargetStorage: true,
    consensusReplicas: 0,

    sourceStorage: {
        location: StorageLocation.LOCAL,
        cloudStorageId: undefined,
    },
    targetStorage: {
        location: StorageLocation.LOCAL,
        cloudStorageId: undefined,
    },
};

interface Props {
    onSubmit(values: AdvancedConfiguration): Promise<void>;
    onChangeUseProjectSourceStorage(value: boolean): void;
    onChangeUseProjectTargetStorage(value: boolean): void;
    onChangeSourceStorageLocation: (value: StorageLocation) => void;
    onChangeTargetStorageLocation: (value: StorageLocation) => void;
    onChangeSortingMethod(value: SortingMethod): void;
    projectId: number | null;
    useProjectSourceStorage: boolean;
    useProjectTargetStorage: boolean;
    activeFileManagerTab: string;
    sourceStorageLocation: StorageLocation;
    targetStorageLocation: StorageLocation;
}

const AdvancedConfigurationForm = forwardRef((props: Props, ref: React.Ref<any>) => {
    const { t } = useTranslation();
    const formRef = useRef<FormInstance>(null);

    const {
        onSubmit,
        projectId,
        activeFileManagerTab,
        onChangeSortingMethod,
        onChangeUseProjectSourceStorage,
        onChangeUseProjectTargetStorage,
        onChangeSourceStorageLocation,
        onChangeTargetStorageLocation,
        useProjectSourceStorage,
        useProjectTargetStorage,
        sourceStorageLocation,
        targetStorageLocation,
    } = props;

    const validateURL = (_: RuleObject, value: string): Promise<void> => {
        if (value && !patterns.validateURL.pattern.test(value)) {
            return Promise.reject(new Error(t('urlIsNotValid')));
        }
        return Promise.resolve();
    };

    const validateOverlapSize: RuleRender = ({ getFieldValue }): RuleObject => ({
        validator(_: RuleObject, value?: string | number): Promise<void> => {
            if (typeof value !== 'undefined' && value !== '') {
                const segmentSize = getFieldValue('segmentSize');
                if (typeof segmentSize !== 'undefined' && segmentSize !== '') {
                    if (+segmentSize <= +value) {
                        return Promise.reject(new Error(t('segmentSizeGreaterThanOverlap')));
                    }
                }
            }
            return Promise.resolve();
        },
    });

    const validateStopFrame: RuleRender = ({ getFieldValue }): RuleObject => ({
        validator(_: RuleObject, value?: string | number): Promise<void> => {
            if (typeof value !== 'undefined' && value !== '') {
                const startFrame = getFieldValue('startFrame');
                if (typeof startFrame !== 'undefined' && startFrame !== '') {
                    if (+startFrame > +value) {
                        return Promise.reject(new Error(t('startFrameGreaterThanStopFrame')));
                    }
                }
            }
            return Promise.resolve();
        },
    });

    useImperativeHandle(ref, () => ({
        submit(): Promise<void> {
            if (formRef.current) {
                if (projectId) {
                    return Promise.all([
                        core.projects.get({ id: projectId }),
                        formRef.current.validateFields(),
                    ]).then(([getProjectResponse, values]) => {
                        const [project] = getProjectResponse;
                        const frameFilter = values.frameStep ? `step=${values.frameStep}` : undefined;
                        const entries = Object.entries(values).filter(
                            (entry: [string, unknown]): boolean => entry[0] !== frameFilter,
                        );

                        return onSubmit({
                            ...((Object.fromEntries(entries) as any) as AdvancedConfiguration),
                            frameFilter,
                            sourceStorage: values.useProjectSourceStorage ?
                                new Storage(project.sourceStorage || { location: StorageLocation.LOCAL }) :
                                new Storage(values.sourceStorage),
                            targetStorage: values.useProjectTargetStorage ?
                                new Storage(project.targetStorage || { location: StorageLocation.LOCAL }) :
                                new Storage(values.targetStorage),
                        });
                    });
                }

                return formRef.current.validateFields()
                    .then(
                        (values: Store): Promise<void> => {
                            const frameFilter = values.frameStep ? `step=${values.frameStep}` : undefined;
                            const entries = Object.entries(values).filter(
                                (entry: [string, unknown]): boolean => entry[0] !== frameFilter,
                            );

                            return onSubmit({
                                ...((Object.fromEntries(entries) as any) as AdvancedConfiguration),
                                frameFilter,
                                sourceStorage: new Storage(values.sourceStorage),
                                targetStorage: new Storage(values.targetStorage),
                            });
                        },
                    );
            }

            return Promise.reject(new Error(t('formRefIsEmpty')));
        },
        resetFields(): void {
            if (formRef.current) {
                formRef.current.resetFields();
            }
        },
    }));

    const renderCopyDataChechbox = (): JSX.Element => (
        <Form.Item
            help={t('copyDataHelpText')}
            name='copyData'
            valuePropName='checked'
        >
            <Checkbox>
                <Text className='cvat-text-color'>{t('copyDataIntoCVAT')}</Text>
            </Checkbox>
        </Form.Item>
    );

    const renderSortingMethodRadio = (): JSX.Element => (
        <Form.Item
            label={t('sortingMethod')}
            name='sortingMethod'
            rules={[
                {
                    required: true,
                    message: t('theFieldIsRequired'),
                },
            ]}
            help={t('sortingMethodHelpText')}
        >
            <Radio.Group buttonStyle='solid' onChange={(e) => onChangeSortingMethod(e.target.value)}>
                <Radio.Button value={SortingMethod.LEXICOGRAPHICAL} key={SortingMethod.LEXICOGRAPHICAL}>
                    {t('lexicographical')}
                </Radio.Button>
                <Radio.Button value={SortingMethod.NATURAL} key={SortingMethod.NATURAL}>{t('natural')}</Radio.Button>
                <Radio.Button value={SortingMethod.PREDEFINED} key={SortingMethod.PREDEFINED}>
                    {t('predefined')}
                </Radio.Button>
                <Radio.Button value={SortingMethod.RANDOM} key={SortingMethod.RANDOM}>{t('random')}</Radio.Button>
            </Radio.Group>
        </Form.Item>
    );

    const renderImageQuality = (): JSX.Element => (
        <CVATTooltip title={t('imageQualityTooltip')}>
            <Form.Item
                label={t('imageQuality')}
                name='imageQuality'
                rules={[
                    {
                        required: true,
                        message: t('theFieldIsRequired'),
                    },
                    { validator: isInteger({ min: 5, max: 100 }) },
                ]}
            >
                <Input size='large' type='number' min={5} max={100} suffix={<PercentageOutlined />} />
            </Form.Item>
        </CVATTooltip>
    );

    const renderOverlap = (): JSX.Element => (
        <CVATTooltip title={t('overlapSizeTooltip')}>
            <Form.Item
                label={t('overlapSize')}
                name='overlapSize'
                dependencies={['segmentSize']}
                rules={[{ validator: isInteger({ min: 0 }) }, validateOverlapSize]}
            >
                <Input size='large' type='number' min={0} />
            </Form.Item>
        </CVATTooltip>
    );

    const renderSegmentSize = (): JSX.Element => (
        <CVATTooltip title={t('segmentSizeTooltip')}>
            <Form.Item label={t('segmentSize')} name='segmentSize' rules={[{ validator: isInteger({ min: 1 }) }]}>
                <Input size='large' type='number' min={1} />
            </Form.Item>
        </CVATTooltip>
    );

    const renderStartFrame = (): JSX.Element => (
        <Form.Item label={t('startFrame')} name='startFrame' rules={[{ validator: isInteger({ min: 0 }) }]}>
            <Input size='large' type='number' min={0} step={1} />
        </Form.Item>
    );

    const renderStopFrame = (): JSX.Element => (
        <Form.Item
            label={t('stopFrame')}
            name='stopFrame'
            dependencies={['startFrame']}
            rules={[{ validator: isInteger({ min: 0 }) }, validateStopFrame]}
        >
            <Input size='large' type='number' min={0} step={1} />
        </Form.Item>
    );

    const renderFrameStep = (): JSX.Element => (
        <Form.Item label={t('frameStep')} name='frameStep' rules={[{ validator: isInteger({ min: 1 }) }]}>
            <Input size='large' type='number' min={1} step={1} />
        </Form.Item>
    );

    const renderBugTracker = (): JSX.Element => (
        <Form.Item
            hasFeedback
            name='bugTracker'
            label={t('issueTracker')}
            extra={t('issueTrackerExtra')}
            rules={[{ validator: validateURL }]}
        >
            <Input size='large' />
        </Form.Item>
    );

    const renderUzeZipChunks = (): JSX.Element => (
        <Space>
            <Form.Item
                name='useZipChunks'
                valuePropName='checked'
                className='cvat-settings-switch'
            >
                <Switch />
            </Form.Item>
            <Text className='cvat-text-color'>{t('preferZipChunks')}</Text>
            <Tooltip title={t('zipChunksTooltip')}>
                <QuestionCircleOutlined style={{ opacity: 0.5 }} />
            </Tooltip>
        </Space>
    );

    const renderCreateTaskMethod = (): JSX.Element => (
        <Space>
            <Form.Item
                name='useCache'
                valuePropName='checked'
                className='cvat-settings-switch'
            >
                <Switch defaultChecked />
            </Form.Item>
            <Text className='cvat-text-color'>{t('useCache')}</Text>
            <Tooltip title={t('usingCacheTooltip')}>
                <QuestionCircleOutlined style={{ opacity: 0.5 }} />
            </Tooltip>
        </Space>
    );

    const renderChunkSize = (): JSX.Element => (
        <CVATTooltip
            title={t('chunkSizeTooltip')}
        >
            <Form.Item label={t('chunkSize')} name='dataChunkSize' rules={[{ validator: isInteger({ min: 1 }) }]}>
                <Input size='large' type='number' />
            </Form.Item>
        </CVATTooltip>
    );

    const renderConsensusReplicas = (): JSX.Element => (
        <Form.Item
            label={t('consensusReplicas')}
            name='consensusReplicas'
            rules={[
                {
                    validator: isInteger({
                        min: 0,
                        max: 10,
                        filter: (intValue: number): boolean => intValue !== 1,
                    }),
                },
            ]}
        >
            <Input
                size='large'
                type='number'
                min={0}
                max={10}
                step={1}
            />
        </Form.Item>
    );

    const renderSourceStorage = (): JSX.Element => (
        <SourceStorageField
            instanceId={projectId}
            locationValue={sourceStorageLocation}
            switchDescription={t('useProjectSourceStorage')}
            storageDescription={t('sourceStorageDescription')}
            useDefaultStorage={useProjectSourceStorage}
            onChangeUseDefaultStorage={onChangeUseProjectSourceStorage}
            onChangeLocationValue={onChangeSourceStorageLocation}
        />
    );

    const renderTargetStorage = (): JSX.Element => (
        <TargetStorageField
            instanceId={projectId}
            locationValue={targetStorageLocation}
            switchDescription={t('useProjectTargetStorage')}
            storageDescription={t('targetStorageDescription')}
            useDefaultStorage={useProjectTargetStorage}
            onChangeUseDefaultStorage={onChangeUseProjectTargetStorage}
            onChangeLocationValue={onChangeTargetStorageLocation}
        />
    );

    return (
        <Form initialValues={initialValues} ref={formRef} layout='vertical'>
            <Row>
                <Col>{renderSortingMethodRadio()}</Col>
            </Row>
            {activeFileManagerTab === 'share' ? (
                <Row>
                    <Col>{renderCopyDataChechbox()}</Col>
                </Row>
            ) : null}
            <Row>
                <Col span={12}>{renderUzeZipChunks()}</Col>
                <Col span={12}>{renderCreateTaskMethod()}</Col>
            </Row>
            <Row justify='start'>
                <Col span={7}>{renderImageQuality()}</Col>
                <Col span={7} offset={1}>
                    {renderOverlap()}
                </Col>
                <Col span={7} offset={1}>
                    {renderSegmentSize()}
                </Col>
            </Row>

            <Row justify='start'>
                <Col span={7}>{renderStartFrame()}</Col>
                <Col span={7} offset={1}>
                    {renderStopFrame()}
                </Col>
                <Col span={7} offset={1}>
                    {renderFrameStep()}
                </Col>
            </Row>

            <Row justify='start'>
                <Col span={7}>{renderChunkSize()}</Col>
            </Row>
            <Row justify='start'>
                <Col span={7}>
                    {renderConsensusReplicas()}
                </Col>
            </Row>

            <Row>
                <Col span={24}>{renderBugTracker()}</Col>
            </Row>
            <Row justify='space-between'>
                <Col span={11}>
                    {renderSourceStorage()}
                </Col>
                <Col span={11} offset={1}>
                    {renderTargetStorage()}
                </Col>
            </Row>
        </Form>
    );
});

export default AdvancedConfigurationForm;
