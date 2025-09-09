// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef, useEffect } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon, { DeleteOutlined, PlusCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Checkbox from 'antd/lib/checkbox';
import Select from 'antd/lib/select';
import Tag from 'antd/lib/tag';
import Form, { FormInstance } from 'antd/lib/form';
import Badge from 'antd/lib/badge';
import Modal from 'antd/lib/modal';
import { Store } from 'antd/lib/form/interface';
import { useTranslation } from 'react-i18next';

import { SerializedAttribute, LabelType } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import ColorPicker from 'components/annotation-page/standard-workspace/objects-side-bar/color-picker';
import { ColorizeIcon } from 'icons';
import patterns from 'utils/validation-patterns';
import config from 'config';
import {
    equalArrayHead, idGenerator, LabelOptColor, SkeletonConfiguration,
} from './common';

export enum AttributeType {
    SELECT = 'SELECT',
    RADIO = 'RADIO',
    CHECKBOX = 'CHECKBOX',
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
}

interface Props {
    label: LabelOptColor | null;
    labelNames: string[];
    onSubmit: (label: LabelOptColor) => void;
    onSkeletonSubmit?: () => SkeletonConfiguration | null;
    resetSkeleton?: () => void;
    onCancel: () => void;
}

function LabelForm(props: Props): JSX.Element {
    const {
        label, labelNames, onSubmit, onSkeletonSubmit, resetSkeleton, onCancel,
    } = props;

    const { t } = useTranslation();
    const formRef = useRef<FormInstance>(null);
    const inputNameRef = useRef<Input>(null);

    const focus = (): void => {
        inputNameRef.current?.focus({
            cursor: 'end',
        });
    };

    useEffect(() => {
        if (formRef.current && label && label.attributes.length) {
            const convertedAttributes = label.attributes.map(
                (attribute: SerializedAttribute): Store => ({
                    ...attribute,
                    values:
                        attribute.input_type.toUpperCase() === 'NUMBER' ? attribute.values.join(';') : attribute.values,
                    type: attribute.input_type.toUpperCase(),
                }),
            );

            for (const attr of convertedAttributes) {
                delete attr.input_type;
            }

            formRef.current.setFieldsValue({ attributes: convertedAttributes });
        }

        focus();
    }, [label]);

    const handleSubmit = (values: Store): void => {
        if (!values.name) {
            onCancel();
            return;
        }

        let skeletonConfiguration: SkeletonConfiguration | null = null;
        if (onSkeletonSubmit) {
            skeletonConfiguration = onSkeletonSubmit();
            if (!skeletonConfiguration) {
                return;
            }
        }

        onSubmit({
            name: values.name,
            id: label ? label.id : idGenerator(),
            color: values.color,
            type: values.type || label?.type || LabelType.ANY,
            attributes: (values.attributes || []).map((attribute: Store) => {
                let attrValues: string | string[] = attribute.values;
                if (!Array.isArray(attrValues)) {
                    if (attribute.type === AttributeType.NUMBER) {
                        attrValues = attrValues.split(';');
                    } else {
                        attrValues = [attrValues];
                    }
                }
                attrValues = attrValues.map((value: string) => value.trim());

                return {
                    ...attribute,
                    values: attrValues,
                    default_value: attribute.default_value && attrValues.includes(attribute.default_value) ?
                        attribute.default_value : attrValues[0],
                    input_type: attribute.type.toLowerCase(),
                };
            }),
            ...(skeletonConfiguration || {}),
        });

        if (formRef.current) {
            // resetFields does not remove existed attributes
            formRef.current.setFieldsValue({ attributes: undefined });
            formRef.current.resetFields();
            if (resetSkeleton) {
                resetSkeleton();
            }

            if (!label) {
                focus();
            }
        }
    };

    const addAttribute = (): void => {
        if (formRef.current) {
            const attributes = formRef.current.getFieldValue('attributes');
            formRef.current.setFieldsValue({
                attributes: [
                    ...(attributes || []),
                    {
                        id: idGenerator(),
                        type: AttributeType.SELECT,
                        name: '',
                        values: [],
                        mutable: false,
                    },
                ],
            });
        }
    };

    const removeAttribute = (key: number): void => {
        if (formRef.current) {
            const attributes = formRef.current.getFieldValue('attributes');
            formRef.current.setFieldsValue({
                attributes: attributes.filter((_: any, id: number) => id !== key),
            });
        }
    };

    const renderAttributeNameInput = (fieldInstance: any, attr: any): JSX.Element => {
        const { key } = fieldInstance;
        const attrNames = formRef.current?.getFieldValue('attributes')
            .filter((_attr: any) => _attr.id !== attr.id).map((_attr: any) => _attr.name);

        return (
            <Form.Item
                hasFeedback
                name={[key, 'name']}
                rules={[
                    {
                        required: true,
                        message: t('pleaseSpecifyAName'),
                    },
                    {
                        pattern: patterns.validateAttributeName.pattern,
                        message: patterns.validateAttributeName.message,
                    },
                    {
                        validator: (_rule: any, attrName: string) => {
                            if (attrNames.includes(attrName) && attr.name !== attrName) {
                                return Promise.reject(new Error(t('attributeNameUnique')));
                            }
                            return Promise.resolve();
                        },
                    },
                ]}
            >
                <Input className='cvat-attribute-name-input' placeholder={t('name')} />
            </Form.Item>
        );
    };

    const renderAttributeTypeInput = (fieldInstance: any, attr: any): JSX.Element => {
        const { key } = fieldInstance;
        const locked = attr.id as number >= 0;

        return (
            <CVATTooltip title={t('anHTMLElementRepresentingTheAttribute')}>
                <Form.Item name={[key, 'type']}>
                    <Select
                        className='cvat-attribute-type-input'
                        disabled={locked}
                        onChange={(value: AttributeType) => {
                            const attrs = formRef.current?.getFieldValue('attributes');
                            if (value === AttributeType.CHECKBOX) {
                                attrs[key].values = ['false'];
                            } else if (value === AttributeType.TEXT && !attrs[key].values.length) {
                                attrs[key].values = '';
                            } else if (value === AttributeType.NUMBER || attr.type === AttributeType.CHECKBOX) {
                                attrs[key].values = [];
                            }
                            formRef.current?.setFieldsValue({
                                attributes: attrs,
                            });
                        }}
                    >
                        <Select.Option value={AttributeType.SELECT} className='cvat-attribute-type-input-select'>
                            {t('Select')}
                        </Select.Option>
                        <Select.Option value={AttributeType.RADIO} className='cvat-attribute-type-input-radio'>
                            {t('Radio')}
                        </Select.Option>
                        <Select.Option value={AttributeType.CHECKBOX} className='cvat-attribute-type-input-checkbox'>
                            {t('Checkbox')}
                        </Select.Option>
                        <Select.Option value={AttributeType.TEXT} className='cvat-attribute-type-input-text'>
                            {t('Text')}
                        </Select.Option>
                        <Select.Option value={AttributeType.NUMBER} className='cvat-attribute-type-input-number'>
                            {t('Number')}
                        </Select.Option>
                    </Select>
                </Form.Item>
            </CVATTooltip>
        );
    };

    const renderAttributeValuesInput = (fieldInstance: any, attr: any): JSX.Element => {
        const { key } = fieldInstance;
        const locked = attr.id as number >= 0;
        const existingValues = attr.values;

        const validator = (_: any, values: string[]): Promise<void> => {
            if (locked && existingValues) {
                if (!equalArrayHead(existingValues, values)) {
                    return Promise.reject(new Error(t('youCanOnlyAppendNewValues')));
                }
            }

            for (const value of values) {
                if (!patterns.validateAttributeValue.pattern.test(value)) {
                    return Promise.reject(new Error(t('Invalid attribute value: "{{value}}"', { value })));
                }
            }

            return Promise.resolve();
        };

        return (
            <CVATTooltip title={t('pressEnterToAddAValue')}>
                <Form.Item
                    name={[key, 'values']}
                    rules={[
                        {
                            required: true,
                            message: t('pleaseSpecifyValues'),
                        },
                        {
                            validator,
                        },
                    ]}
                >
                    <Select
                        className='cvat-attribute-values-input'
                        mode='tags'
                        placeholder={t('attributeValues')}
                        dropdownStyle={{ display: 'none' }}
                        tagRender={(selectProps) => {
                            const attrs = formRef.current?.getFieldValue('attributes');
                            const isDefault = selectProps.value === attrs[key].default_value;
                            return (
                                <CVATTooltip
                                    placement='bottom'
                                    title={isDefault ? t('thisIsDefaultValue') : t('clickToSetDefaultValue')}
                                >
                                    <Tag
                                        visible
                                        onMouseEnter={() => {
                                            const parent = window.document.getElementsByClassName('cvat-attribute-values-input')[0];
                                            if (parent) {
                                                parent.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
                                            }
                                        }}
                                        color={isDefault ? 'blue' : undefined}
                                        onClose={() => {
                                            if (isDefault) {
                                                attrs[key].default_value = undefined;
                                            }
                                            selectProps.onClose();
                                        }}
                                        onClick={() => {
                                            attrs[key].default_value = selectProps.value;
                                            formRef.current?.setFieldsValue({
                                                attributes: attrs,
                                            });
                                        }}
                                        closable={selectProps.closable}
                                    >
                                        {selectProps.label}
                                    </Tag>
                                </CVATTooltip>
                            );
                        }}
                    />
                </Form.Item>
            </CVATTooltip>
        );
    };

    const renderBooleanValueInput = (fieldInstance: any): JSX.Element => {
        const { key } = fieldInstance;

        return (
            <CVATTooltip title={t('specifyADefaultValue')}>
                <Form.Item
                    rules={[
                        {
                            required: true,
                            message: t('pleaseSpecifyADefaultValue'),
                        }]}
                    name={[key, 'values']}
                >
                    <Select className='cvat-attribute-values-input'>
                        <Select.Option value='false'>{t('False')}</Select.Option>
                        <Select.Option value='true'>{t('True')}</Select.Option>
                    </Select>
                </Form.Item>
            </CVATTooltip>
        );
    };

    const renderNumberRangeInput = (fieldInstance: any, attr: any): JSX.Element => {
        const { key } = fieldInstance;
        const locked = attr.id as number >= 0;

        const validator = (_: any, strNumbers: string): Promise<void> => {
            if (typeof strNumbers !== 'string') return Promise.resolve();

            const numbers = strNumbers.split(';').map((number): number => Number.parseFloat(number));
            if (numbers.length !== 3) {
                return Promise.reject(new Error(t('threeNumbersAreExpected')));
            }

            for (const number of numbers) {
                if (Number.isNaN(number)) {
                    return Promise.reject(new Error(t('"{{number}}" is not a number', { number })));
                }
            }

            const [min, max, step] = numbers;

            if (min >= max) {
                return Promise.reject(new Error(t('minimumMustBeLessThanMaximum')));
            }

            if (max - min < step) {
                return Promise.reject(new Error(t('stepLessThanMinMax')));
            }

            if (step <= 0) {
                return Promise.reject(new Error(t('stepMustBeAPositiveNumber')));
            }

            return Promise.resolve();
        };

        return (
            <Form.Item
                name={[key, 'values']}
                rules={[
                    {
                        required: true,
                        message: t('pleaseSetARange'),
                    },
                    {
                        validator,
                    },
                ]}
            >
                <Input className='cvat-attribute-values-input' disabled={locked} placeholder={t('min;max;step')} />
            </Form.Item>
        );
    };

    const renderDefaultValueInput = (fieldInstance: any): JSX.Element => {
        const { key } = fieldInstance;

        return (
            <Form.Item name={[key, 'values']}>
                <Input.TextArea className='cvat-attribute-values-input' placeholder={t('defaultValue')} />
            </Form.Item>
        );
    };

    const renderMutableAttributeInput = (fieldInstance: any, attr: any): JSX.Element => {
        const { key } = fieldInstance;
        const locked = attr.id as number >= 0;

        return (
            <CVATTooltip title={t('canThisAttributeBeChangedFrameToFrame')}>
                <Form.Item
                    name={[key, 'mutable']}
                    valuePropName='checked'
                >
                    <Checkbox className='cvat-attribute-mutable-checkbox' disabled={locked}>
                        {t('Mutable')}
                    </Checkbox>
                </Form.Item>
            </CVATTooltip>
        );
    };

    const renderDeleteAttributeButton = (fieldInstance: any, attr: any): JSX.Element => {
        const { key } = fieldInstance;

        return (
            <CVATTooltip title={t('deleteTheAttribute')}>
                <Form.Item>
                    <Button
                        disabled={attr.id >= 0} // temporary disabled, does not work on the server
                        type='link'
                        className='cvat-delete-attribute-button'
                        onClick={(): void => {
                            if (attr.id >= 0) {
                                Modal.confirm({
                                    className: 'cvat-modal-delete-label-attribute',
                                    icon: <ExclamationCircleOutlined />,
                                    title: t('confirmRemoveAttribute', { attrName: attr.name }),
                                    content: t('deleteAttributeWarning'),
                                    type: 'warning',
                                    okButtonProps: { type: 'primary', danger: true },
                                    onOk: () => {
                                        removeAttribute(key);
                                        setTimeout(() => {
                                            formRef.current?.submit();
                                        });
                                    },
                                });
                            } else {
                                removeAttribute(key);
                            }
                        }}
                    >
                        <DeleteOutlined />
                    </Button>
                </Form.Item>
            </CVATTooltip>
        );
    };

    const renderAttribute = (fieldInstance: any): JSX.Element | null => {
        const { key } = fieldInstance;
        const attr = formRef.current?.getFieldValue('attributes')[key];

        return attr ? (
            <Form.Item noStyle key={key} shouldUpdate>
                {() => (
                    <Row
                        justify='space-between'
                        align='top'
                        cvat-attribute-id={attr.id}
                        className='cvat-attribute-inputs-wrapper'
                    >
                        <Col span={5}>{renderAttributeNameInput(fieldInstance, attr)}</Col>
                        <Col span={4}>{renderAttributeTypeInput(fieldInstance, attr)}</Col>
                        <Col span={6}>
                            {((): JSX.Element => {
                                const currentFieldValue = formRef.current?.getFieldValue('attributes')[key];
                                const type = currentFieldValue.type || AttributeType.SELECT;
                                let element = null;
                                if ([AttributeType.SELECT, AttributeType.RADIO].includes(type)) {
                                    element = renderAttributeValuesInput(fieldInstance, attr);
                                } else if (type === AttributeType.CHECKBOX) {
                                    element = renderBooleanValueInput(fieldInstance);
                                } else if (type === AttributeType.NUMBER) {
                                    element = renderNumberRangeInput(fieldInstance, attr);
                                } else {
                                    element = renderDefaultValueInput(fieldInstance);
                                }

                                return element;
                            })()}
                        </Col>
                        <Col span={5}>{renderMutableAttributeInput(fieldInstance, attr)}</Col>
                        <Col span={2}>{renderDeleteAttributeButton(fieldInstance, attr)}</Col>
                    </Row>
                )}
            </Form.Item>
        ) : null;
    };

    const renderLabelNameInput = (): JSX.Element => (
        <Form.Item
            hasFeedback
            name='name'
            rules={[
                {
                    required: true,
                    message: t('pleaseSpecifyAName'),
                },
                {
                    pattern: patterns.validateAttributeName.pattern,
                    message: patterns.validateAttributeName.message,
                },
                {
                    validator: (_rule: any, labelName: string) => {
                        if (labelNames.includes(labelName) && label?.name !== labelName) {
                            return Promise.reject(new Error(t('labelNameMustBeUnique')));
                        }
                        return Promise.resolve();
                    },
                },
            ]}
        >
            <Input
                ref={inputNameRef}
                placeholder={t('labelName')}
                className='cvat-label-name-input'
                onKeyUp={(event): void => {
                    if (event.key === 'Escape' || event.key === 'Esc' || event.keyCode === 27) {
                        onCancel();
                    }
                }}
                autoComplete='off'
            />
        </Form.Item>
    );

    const renderLabelTypeInput = (): JSX.Element => {
        const isSkeleton = !!onSkeletonSubmit;
        const types = Object.values(LabelType)
            .filter((type: string) => type !== LabelType.SKELETON);
        const locked = !!label?.has_parent;

        return (
            <Form.Item name='type'>
                <Select className='cvat-label-type-input' disabled={isSkeleton || locked} showSearch={false}>
                    {isSkeleton ? (
                        <Select.Option
                            className='cvat-label-type-option-skeleton'
                            value='skeleton'
                        >
                            {t('skeleton')}
                        </Select.Option>
                    ) : types.map((type: string): JSX.Element => (
                        <Select.Option className={`cvat-label-type-option-${type}`} key={type} value={type}>
                            {`${type[0].toUpperCase()}${type.slice(1)}`}
                        </Select.Option>
                    ))}
                </Select>
            </Form.Item>
        );
    };

    const renderNewAttributeButton = (): JSX.Element => (
        <Form.Item>
            <Button onClick={addAttribute} className='cvat-new-attribute-button'>
                {t('addAnAttribute')}
                <PlusCircleOutlined />
            </Button>
        </Form.Item>
    );

    const renderSaveButton = (): JSX.Element => {
        const tooltipTitle = label ? t('saveLabelAndReturn') : t('saveLabelAndCreateMore');
        const buttonText = label ? t('Done') : t('Continue');

        return (
            <CVATTooltip title={tooltipTitle}>
                <Button
                    className='cvat-submit-new-label-button'
                    style={{ width: '150px' }}
                    type='primary'
                    htmlType='submit'
                >
                    {buttonText}
                </Button>
            </CVATTooltip>
        );
    };

    const renderCancelButton = (): JSX.Element => (
        <CVATTooltip title={t('doNotSaveAndReturn')}>
            <Button
                className='cvat-cancel-new-label-button'
                type='primary'
                danger
                style={{ width: '150px' }}
                onClick={(): void => {
                    onCancel();
                }}
            >
                {t('Cancel')}
            </Button>
        </CVATTooltip>
    );

    const renderChangeColorButton = (): JSX.Element => (
        <Form.Item noStyle shouldUpdate>
            {() => (
                <Form.Item name='color'>
                    <ColorPicker placement='bottom'>
                        <CVATTooltip title={t('changeLabelColor')}>
                            <Button type='default' className='cvat-change-task-label-color-button'>
                                <Badge
                                    className='cvat-change-task-label-color-badge'
                                    color={formRef.current?.getFieldValue('color') || config.NEW_LABEL_COLOR}
                                    text={<Icon component={ColorizeIcon} />}
                                />
                            </Button>
                        </CVATTooltip>
                    </ColorPicker>
                </Form.Item>
            )}
        </Form.Item>
    );

    const renderAttributes = (): JSX.Element[] => {
        const form = formRef.current;
        if (!form) {
            return [];
        }
        const attributes = form.getFieldValue('attributes');
        return attributes.map((attr: any, index: number) => renderAttribute({ key: index, name: index }, attr));
    };

    const isSkeleton = !!onSkeletonSubmit;

    return (
        <Form
            initialValues={{
                name: label?.name || '',
                type: label?.type || (isSkeleton ? LabelType.SKELETON : LabelType.ANY),
                color: label?.color || undefined,
                attributes: (label?.attributes || []).map((attr) => ({
                    id: attr.id,
                    name: attr.name,
                    type: attr.input_type,
                    values: attr.values,
                    mutable: attr.mutable,
                    default_value: attr.default_value,
                })),
            }}
            onFinish={handleSubmit}
            layout='vertical'
            ref={formRef}
        >
            <Row justify='start' align='top'>
                <Col span={8}>{renderLabelNameInput()}</Col>
                <Col span={3} offset={1}>{renderLabelTypeInput()}</Col>
                <Col span={3} offset={1}>
                    {renderChangeColorButton()}
                </Col>
                <Col offset={1}>
                    {renderNewAttributeButton()}
                </Col>
            </Row>
            <Row justify='start' align='top'>
                <Col span={24}>
                    <Form.List name='attributes'>{renderAttributes}</Form.List>
                </Col>
            </Row>
            <Row justify='start' align='middle'>
                <Col>{renderSaveButton()}</Col>
                <Col offset={1}>{renderCancelButton()}</Col>
            </Row>
        </Form>
    );
}

export default LabelForm;
