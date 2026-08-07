// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QuestionCircleOutlined } from '@ant-design/icons/lib/icons';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import { Col, Row } from 'antd/lib/grid';
import Divider from 'antd/lib/divider';
import Form, { FormInstance } from 'antd/lib/form';
import Checkbox from 'antd/lib/checkbox/Checkbox';
import Select from 'antd/lib/select';
import CVATTooltip from 'components/common/cvat-tooltip';
import { QualitySettings, TargetMetric } from 'cvat-core-wrapper';
import { PointSizeBase } from 'cvat-core/src/quality-settings';
import { defaultVisibility, ResourceFilterHOC } from 'components/resource-sorting-filtering';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, config,
} from './jobs-filter-configuration';

interface Props {
    form: FormInstance;
    settings: QualitySettings;
    disabled: boolean;
    onSave: () => void;
}

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity,
);

export default function QualitySettingsForm(props: Readonly<Props>): JSX.Element | null {
    const { form, settings, disabled } = props;
    const { t } = useTranslation();

    const [visibility, setVisibility] = useState(defaultVisibility);

    const initialValues = {
        targetMetric: settings.targetMetric,
        targetMetricThreshold: settings.targetMetricThreshold * 100,

        maxValidationsPerJob: settings.maxValidationsPerJob,

        lowOverlapThreshold: settings.lowOverlapThreshold * 100,
        iouThreshold: settings.iouThreshold * 100,
        compareAttributes: settings.compareAttributes,
        emptyIsAnnotated: settings.emptyIsAnnotated,

        oksSigma: settings.oksSigma * 100,
        pointSizeBase: settings.pointSizeBase,

        lineThickness: settings.lineThickness * 100,
        lineOrientationThreshold: settings.lineOrientationThreshold * 100,
        compareLineOrientation: settings.compareLineOrientation,

        compareGroups: settings.compareGroups,
        groupMatchThreshold: settings.groupMatchThreshold * 100,

        checkCoveredAnnotations: settings.checkCoveredAnnotations,
        objectVisibilityThreshold: settings.objectVisibilityThreshold * 100,
        panopticComparison: settings.panopticComparison,

        jobFilter: settings.jobFilter,
    };

    const targetMetricDescription = `${settings.descriptions.targetMetric
        .replaceAll(/\* [a-z` -]+[A-Z]+/g, '')
        .replaceAll(/\n/g, '')
    }`;

    const pointSizeBaseDescription = `${settings.descriptions.pointSizeBase
        .substring(0, settings.descriptions.pointSizeBase.indexOf('\n\n\n'))
        .replaceAll(/\n/g, ' ')
    }`;

    const makeTooltipFragment = (metric: string, description: string): JSX.Element => (
        <div>
            <Text strong>{`${metric}:`}</Text>
            <Text>
                {description}
            </Text>
        </div>
    );

    const makeTooltip = (jsx: JSX.Element): JSX.Element => (
        <div className='cvat-settings-tooltip-inner'>
            {jsx}
        </div>
    );

    const generalTooltip = makeTooltip(
        <>
            {makeTooltipFragment(t('targetMetric'), targetMetricDescription)}
            {makeTooltipFragment(t('targetMetricThreshold'), settings.descriptions.targetMetricThreshold)}
            {makeTooltipFragment(t('compareAttributes'), settings.descriptions.compareAttributes)}
            {makeTooltipFragment(t('emptyFramesAreAnnotated'), settings.descriptions.emptyIsAnnotated)}
            {makeTooltipFragment(t('jobSelectionFilter'), settings.descriptions.jobFilter)}
        </>,
    );

    const jobValidationTooltip = makeTooltip(
        makeTooltipFragment(t('maxValidationsPerJob'), settings.descriptions.maxValidationsPerJob),
    );

    const shapeComparisonTooltip = makeTooltip(
        <>
            {makeTooltipFragment(t('minOverlapThresholdIoU'), settings.descriptions.iouThreshold)}
            {makeTooltipFragment(t('lowOverlapThreshold'), settings.descriptions.lowOverlapThreshold)}
        </>,
    );

    const keypointTooltip = makeTooltip(
        makeTooltipFragment(t('objectKeypointSimilarityOKS'), settings.descriptions.oksSigma),
    );

    const pointTooltip = makeTooltip(
        makeTooltipFragment(t('pointSizeBase'), pointSizeBaseDescription),
    );

    const linesTooltip = makeTooltip(
        <>
            {makeTooltipFragment(t('lineThickness'), settings.descriptions.lineThickness)}
            {makeTooltipFragment(t('checkOrientation'), settings.descriptions.compareLineOrientation)}
            {makeTooltipFragment(t('minSimilarityGain'), settings.descriptions.lineOrientationThreshold)}
        </>,
    );

    const groupTooltip = makeTooltip(
        <>
            {makeTooltipFragment(t('compareGroups'), settings.descriptions.compareGroups)}
            {makeTooltipFragment(t('minGroupMatchThreshold'), settings.descriptions.groupMatchThreshold)}
        </>,
    );

    const segmentationTooltip = makeTooltip(
        <>
            {makeTooltipFragment(t('checkObjectVisibility'), settings.descriptions.checkCoveredAnnotations)}
            {makeTooltipFragment(t('minVisibilityThreshold'), settings.descriptions.objectVisibilityThreshold)}
            {makeTooltipFragment(t('matchOnlyVisibleParts'), settings.descriptions.panopticComparison)}
        </>,
    );

    return (
        <Form
            form={form}
            layout='vertical'
            className={`cvat-quality-settings-form ${disabled ? 'cvat-quality-settings-form-disabled' : ''}`}
            initialValues={initialValues}
            disabled={disabled}
        >
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    {t('general')}
                </Text>
                <CVATTooltip title={generalTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='targetMetric'
                        label={t('targetMetric')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <Select
                            style={{ width: '70%' }}
                            virtual={false}
                        >
                            <Select.Option value={TargetMetric.ACCURACY}>
                                {t('accuracy')}
                            </Select.Option>
                            <Select.Option value={TargetMetric.PRECISION}>
                                {t('precision')}
                            </Select.Option>
                            <Select.Option value={TargetMetric.RECALL}>
                                {t('recall')}
                            </Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='targetMetricThreshold'
                        label={t('targetMetricThreshold')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='compareAttributes'
                        valuePropName='checked'
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>{t('compareAttributes')}</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='emptyIsAnnotated'
                        valuePropName='checked'
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>{t('emptyFramesAreAnnotated')}</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='jobFilter'
                        label={t('jobSelectionFilter')}
                        trigger='onApplyFilter'
                    >
                        {/* value and onApplyFilter will be automatically provided by Form.Item */}
                        <FilteringComponent
                            predefinedVisible={visibility.predefined}
                            builderVisible={visibility.builder}
                            recentVisible={visibility.recent}
                            onPredefinedVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, predefined: visible })
                            )}
                            onBuilderVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visible })
                            )}
                            onRecentVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visibility.builder, recent: visible })
                            )}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    {t('jobValidation')}
                </Text>
                <CVATTooltip title={jobValidationTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='maxValidationsPerJob'
                        label={t('maxValidationsPerJob')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <InputNumber
                            min={0}
                            max={100}
                            precision={0}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    {t('shapeComparison')}
                </Text>
                <CVATTooltip title={shapeComparisonTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='iouThreshold'
                        label={t('minOverlapThresholdPercentage')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='lowOverlapThreshold'
                        label={t('lowOverlapThresholdPercentage')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    {t('keypointComparison')}
                </Text>
                <CVATTooltip title={keypointTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='oksSigma'
                        label={t('oksSigmaBboxSidePercentage')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    {t('pointComparison')}
                </Text>
                <CVATTooltip title={pointTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='pointSizeBase'
                        label={t('pointSizeBase')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <Select
                            style={{ width: '70%' }}
                            virtual={false}
                        >
                            <Select.Option value={PointSizeBase.IMAGE_SIZE}>
                                {t('imageSize')}
                            </Select.Option>
                            <Select.Option value={PointSizeBase.GROUP_BBOX_SIZE}>
                                {t('groupBboxSize')}
                            </Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    {t('lineComparison')}
                </Text>
                <CVATTooltip title={linesTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='lineThickness'
                        label={t('relativeThicknessFrameSidePercentage')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <InputNumber min={0} max={1000} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='compareLineOrientation'
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                        valuePropName='checked'
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>{t('checkOrientation')}</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='lineOrientationThreshold'
                        label={t('minSimilarityGainPercentage')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    {t('groupComparison')}
                </Text>
                <CVATTooltip title={groupTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='compareGroups'
                        valuePropName='checked'
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>{t('compareGroups')}</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='groupMatchThreshold'
                        label={t('minGroupMatchThresholdPercentage')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    {t('segmentationComparison')}
                </Text>
                <CVATTooltip title={segmentationTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='checkCoveredAnnotations'
                        valuePropName='checked'
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>{t('checkObjectVisibility')}</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='objectVisibilityThreshold'
                        label={t('minVisibilityThresholdAreaPercentage')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='panopticComparison'
                        valuePropName='checked'
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>{t('matchOnlyVisibleParts')}</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
}