// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation } from 'react-i18next';
import { QuestionCircleOutlined } from '@ant-design/icons/lib/icons';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import { Col, Row } from 'antd/lib/grid';
import Divider from 'antd/lib/divider';
import Form, { FormInstance } from 'antd/lib/form';
import Button from 'antd/lib/button';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ConsensusSettings } from 'cvat-core-wrapper';

interface Props {
    form: FormInstance;
    settings: ConsensusSettings;
    onSave: () => void;
}

export default function ConsensusSettingsForm(props: Readonly<Props>): JSX.Element | null {
    const { form, settings, onSave } = props;
    const { t } = useTranslation();

    const initialValues = {
        quorum: settings.quorum * 100,
        iouThreshold: settings.iouThreshold * 100,
    };

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
            {makeTooltipFragment(t('quorum'), settings.descriptions.quorum.replace(
                'required share of',
                'required percent of',
            ))}
        </>,
    );

    const shapeComparisonTooltip = makeTooltip(
        <>
            {makeTooltipFragment(t('minOverlapThresholdIoU'), settings.descriptions.iouThreshold)}
        </>,
    );

    return (
        <Form
            form={form}
            layout='vertical'
            className='cvat-consensus-settings-form'
            initialValues={initialValues}
        >
            <Row justify='end' className='cvat-consensus-settings-save-btn'>
                <Col>
                    <Button onClick={onSave} type='primary'>
                        {t('save')}
                    </Button>
                </Col>
            </Row>
            <Row className='cvat-consensus-settings-title'>
                <Text strong>{t('general')}</Text>
                <CVATTooltip
                    title={generalTooltip}
                    className='cvat-settings-tooltip'
                    overlayStyle={{ maxWidth: '500px' }}
                >
                    <QuestionCircleOutlined style={{ opacity: 0.5 }} />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={6}>
                    <Form.Item
                        name='quorum'
                        label={t('quorumPercentage')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-consensus-settings-title'>
                <Text strong>{t('shapeComparison')}</Text>
                <CVATTooltip
                    title={shapeComparisonTooltip}
                    className='cvat-settings-tooltip'
                    overlayStyle={{ maxWidth: '500px' }}
                >
                    <QuestionCircleOutlined style={{ opacity: 0.5 }} />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={6}>
                    <Form.Item
                        name='iouThreshold'
                        label={t('minOverlapPercentage')}
                        rules={[{ required: true, message: t('thisFieldIsRequired') }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
}
