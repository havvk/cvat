import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import {
    Row, Col, Form, Input, Button, notification,
} from 'antd';
import Text from 'antd/lib/typography/Text';
import Spin from 'antd/lib/spin';

async function getCSRFToken(): Promise<string> {
    const response = await fetch('/api/server/about');
    return response.headers.get('X-CSRFToken') || '';
}

export default function InvitationConfirmPage(): JSX.Element {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const history = useHistory();
    const [email, setEmail] = useState<string | null>(null);
    const [key, setKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(history.location.search);
        const invitationKey = params.get('invitation');
        if (!invitationKey) {
            setError(t('invitationKeyMissing'));
            setLoading(false);
            return;
        }

        setKey(invitationKey);

        fetch(`/api/auth/invitation/confirm/${invitationKey}`)
            .then(async (response) => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error(t('failedToVerifyInvitation'));
            })
            .then((data) => {
                setEmail(data.email);
                form.setFieldsValue({ email: data.email });
            })
            .catch(() => {
                setError(t('invitationInvalidOrExpired'));
            })
            .finally(() => {
                setLoading(false);
            });
    }, [history, form]);

    const onFinish = async (values: any): Promise<void> => {
        if (key) {
            try {
                setLoading(true);
                const csrfToken = await getCSRFToken();
                const response = await fetch(`/api/auth/invitation/confirm/${key}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': csrfToken,
                        },
                        body: JSON.stringify({
                            username: values.username,
                            new_password1: values.password,
                            new_password2: values.confirm,
                        }),
                    });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(JSON.stringify(data));
                }

                notification.success({
                    message: t('accountCreatedSuccessfully'),
                    description: t('loginWithNewCredentials'),
                });
                history.push('/auth/login');
            } catch (err: any) {
                let message = t('couldNotCreateAccount');
                try {
                    const parsed = JSON.parse(err.message);
                    message = Object.values(parsed).flat().join(' ');
                } catch {
                    // Keep the localized fallback when the server response is not JSON.
                }
                notification.error({
                    message: t('registrationFailed'),
                    description: message,
                });
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading) {
        return <Spin size='large' className='cvat-spinner' />;
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <Text type='danger' style={{ fontSize: '16px' }}>{error}</Text>
            </div>
        );
    }

    return (
        <div className='cvat-invitation-confirm-page' style={{ padding: '20px' }}>
            <Row justify='center' align='middle'>
                <Col md={8} lg={6} xl={4}>
                    <h2>{t('createYourAccount')}</h2>
                    <Form
                        form={form}
                        name='invitation_confirm'
                        onFinish={onFinish}
                        layout='vertical'
                    >
                        <Form.Item label={t('email')}>
                            <Input value={email || ''} disabled />
                        </Form.Item>

                        <Form.Item
                            name='username'
                            label={t('username')}
                            rules={[{ required: true, message: t('pleaseInputUsername') }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name='password'
                            label={t('Password')}
                            rules={[{ required: true, message: t('pleaseInputPassword') }]}
                            hasFeedback
                        >
                            <Input.Password />
                        </Form.Item>

                        <Form.Item
                            name='confirm'
                            label={t('confirmPassword')}
                            dependencies={['password']}
                            hasFeedback
                            rules={[
                                { required: true, message: t('pleaseConfirmPassword') },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error(t('passwordsDoNotMatch')));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password />
                        </Form.Item>

                        <Form.Item>
                            <Button type='primary' htmlType='submit' loading={loading} block>
                                {t('createAccount')}
                            </Button>
                        </Form.Item>
                    </Form>
                </Col>
            </Row>
        </div>
    );
}
