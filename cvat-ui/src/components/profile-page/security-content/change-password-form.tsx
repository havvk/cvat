// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Form from 'antd/lib/form';
import { LockOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
<<<<<<< HEAD:cvat-ui/src/components/profile-page/security-content/change-password-form.tsx
import { Row } from 'antd/lib/grid';
=======
import { useTranslation } from 'react-i18next';
>>>>>>> github-pr-2:cvat-ui/src/components/change-password-modal/change-password-form.tsx

import { ChangePasswordData } from 'reducers';
import { validateConfirmation, validatePassword } from 'components/register-page/register-form';

interface Props {
    onSubmit(loginData: ChangePasswordData): void;
    onCancel(): void;
}

<<<<<<< HEAD:cvat-ui/src/components/profile-page/security-content/change-password-form.tsx
function ChangePasswordFormComponent({ onSubmit, onCancel }: Props): JSX.Element {
=======
function ChangePasswordFormComponent({ fetching, onSubmit }: Props): JSX.Element {
    const { t } = useTranslation();
>>>>>>> github-pr-2:cvat-ui/src/components/change-password-modal/change-password-form.tsx
    return (
        <Form onFinish={onSubmit} className='cvat-change-password-form'>
            <Form.Item
                hasFeedback
                name='oldPassword'
                rules={[
                    {
                        required: true,
                        message: t('pleaseInputYourCurrentPassword'),
                    },
                ]}
            >
                <Input.Password
                    autoComplete='current-password'
                    prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder={t('currentPassword')}
                />
            </Form.Item>

            <Form.Item
                hasFeedback
                name='newPassword1'
                rules={[
                    {
                        required: true,
                        message: t('pleaseInputNewPassword'),
                    },
                    validatePassword(t),
                ]}
            >
                <Input.Password
                    autoComplete='new-password'
                    prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder={t('newPassword')}
                />
            </Form.Item>

            <Form.Item
                hasFeedback
                name='newPassword2'
                dependencies={['newPassword1']}
                rules={[
                    {
                        required: true,
                        message: t('pleaseConfirmYourNewPassword'),
                    },
                    validateConfirmation('newPassword1', t),
                ]}
            >
                <Input.Password
                    autoComplete='new-password'
                    prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder={t('confirmNewPassword')}
                />
            </Form.Item>

            <Form.Item>
<<<<<<< HEAD:cvat-ui/src/components/profile-page/security-content/change-password-form.tsx
                <Row justify='end'>
                    <Button
                        className='cvat-change-password-cancel-button'
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        type='primary'
                        htmlType='submit'
                        className='cvat-change-password-form-button'
                    >
                        Submit
                    </Button>
                </Row>
=======
                <Button
                    type='primary'
                    htmlType='submit'
                    className='cvat-change-password-form-button'
                    loading={fetching}
                    disabled={fetching}
                >
                    {t('Submit')}
                </Button>
>>>>>>> github-pr-2:cvat-ui/src/components/change-password-modal/change-password-form.tsx
            </Form.Item>
        </Form>
    );
}

export default React.memo(ChangePasswordFormComponent);