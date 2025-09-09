// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    RefObject,
    useRef,
    useImperativeHandle,
    forwardRef,
    useEffect,
} from 'react';
import { useTranslation } from 'react-i18next';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';
import Form, { FormInstance } from 'antd/lib/form';
import { QuestionCircleOutlined } from '@ant-design/icons';

export interface BaseConfiguration {
    name: string;
}

interface Props {
    onChange(values: BaseConfiguration): void;
    many: boolean;
    exampleMultiTaskName?: string;
}

// 使用 forwardRef 来接收来自父组件的 ref
const BasicConfigurationForm = forwardRef((props: Props, ref: RefObject<any>) => {
    const { many, exampleMultiTaskName, onChange } = props;
    const { t } = useTranslation(); // 使用 useTranslation hook
    const formRef = useRef<FormInstance>(null);
    const inputRef = useRef<Input>(null);

    const initialName = many ? '{{file_name}}' : '';

    // 使用 useImperativeHandle 将子组件的内部方法暴露给父组件的 ref
    useImperativeHandle(ref, () => ({
        submit(): Promise<void> {
            if (formRef.current) {
                return formRef.current.validateFields();
            }
            return Promise.reject(new Error('Form ref is empty'));
        },
        resetFields(): void {
            if (formRef.current) {
                formRef.current.resetFields();
            }
        },
        focus(): void {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        },
    }));

    // 使用 useEffect 来模拟 componentDidMount
    useEffect(() => {
        onChange({
            name: initialName,
        });
    }, []);

    const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>): void => {
        onChange({
            name: e.target.value,
        });
    };

    return (
        <Form ref={formRef} layout='vertical'>
            <Form.Item
                className={many ? 'cvat-task-name-field-has-tooltip' : ''}
                hasFeedback
                name='name'
                label={<span>{t('Name')}</span>} // 国际化 label
                rules={[
                    {
                        required: true,
                        message: t('Task name cannot be empty'), // 国际化 message
                    },
                ]}
                initialValue={initialName}
            >
                <Input
                    ref={inputRef}
                    onChange={handleChangeName}
                />
            </Form.Item>
            {many ? (
                <Text type='secondary'>
                    <Tooltip title={() => (
                        <>
                            {t('youCanUseInTheTemplate')}
                            <ul>
                                <li>
                                    {t('someTextAnyText')}
                                </li>
                                <li>
                                    {t('indexFileInSet')}
                                </li>
                                <li>
                                    {t('nameOfFile')}
                                </li>
                            </ul>
                            {t('example')}
                            &nbsp;
                            <i>
                                {exampleMultiTaskName || 'Task name 1 - video_1.mp4'}
                            </i>
                        </>
                    )}
                    >
                        {t('whenFormingTheName')}
                        {' '}
                        <QuestionCircleOutlined />
                    </Tooltip>
                </Text>
            ) : null}
        </Form>
    );
});

export default BasicConfigurationForm;
